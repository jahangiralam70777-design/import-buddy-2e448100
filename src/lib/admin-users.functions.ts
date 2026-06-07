import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const roleEnum = z.enum(["admin", "moderator", "student"]);
const statusEnum = z.enum(["active", "suspended", "pending"]);
const statusFilterEnum = z.enum(["active", "suspended", "pending", "deleted"]);
const dateRangeEnum = z.enum(["24h", "7d", "30d", "lifetime"]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw error;
  if (!data) throw new Error("Forbidden: admin role required");
}

const listInput = z.object({
  search: z.string().trim().max(200).optional(),
  role: roleEnum.optional(),
  status: statusFilterEnum.optional(),
  level: z.string().trim().max(40).optional(),
  referralSource: z.string().trim().max(80).optional(),
  dateRange: dateRangeEnum.optional(),
  includeDeleted: z.boolean().optional(),
  page: z.number().int().min(1).max(2000).default(1),
  pageSize: z.number().int().min(1).max(100).default(25),
});

export const adminListUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof listInput>) => listInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    // Cast to any: generated DB types lag the migration that adds
    // `referral_source` until they are regenerated; the column exists.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const sb = context.supabase as any;
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = sb
      .from("profiles")
      .select(
        "id,display_name,avatar_url,level,bio,status,referral_source,created_at,updated_at,last_login_at,total_login_count,total_usage_seconds,deleted_at",
        { count: "exact" },
      )
      .order("created_at", { ascending: false })
      .range(from, to);
    if (data.status === "deleted") {
      q = q.not("deleted_at", "is", null);
    } else if (data.status) {
      q = q.eq("status", data.status).is("deleted_at", null);
    } else if (!data.includeDeleted) {
      q = q.is("deleted_at", null);
    }
    if (data.level) q = q.eq("level", data.level);
    if (data.referralSource) q = q.eq("referral_source", data.referralSource);
    if (data.search) q = q.ilike("display_name", `%${data.search}%`);
    if (data.dateRange && data.dateRange !== "lifetime") {
      const map: Record<string, number> = { "24h": 1, "7d": 7, "30d": 30 };
      const days = map[data.dateRange];
      if (days) {
        const since = new Date(Date.now() - days * 86400000).toISOString();
        q = q.gte("last_login_at", since);
      }
    }
    const { data: profiles, error, count } = await q;
    if (error) throw error;

    const ids = (profiles ?? []).map((p: { id: string }) => p.id);
    let rolesMap = new Map<string, string[]>();
    if (ids.length) {
      const { data: rs } = await sb.from("user_roles").select("user_id,role").in("user_id", ids);
      for (const r of rs ?? []) {
        const arr = rolesMap.get(r.user_id) ?? [];
        arr.push(r.role);
        rolesMap.set(r.user_id, arr);
      }
    }

    let rows = (profiles ?? []).map((p: { id: string }) => ({
      ...p,
      roles: rolesMap.get(p.id) ?? [],
    }));

    if (data.role) rows = rows.filter((r: { roles: string[] }) => r.roles.includes(data.role!));

    return { rows, count: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

export const adminReferralStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data, error } = await (context.supabase as unknown as {
      from: (t: string) => {
        select: (s: string) => {
          limit: (n: number) => Promise<{
            data: Array<{ referral_source: string | null }> | null;
            error: unknown;
          }>;
        };
      };
    })
      .from("profiles")
      .select("referral_source")
      .limit(5000);
    if (error) throw error;
    const counts = new Map<string, number>();
    let unknown = 0;
    for (const row of data ?? []) {
      const k = (row.referral_source ?? "").trim();
      if (!k) {
        unknown += 1;
        continue;
      }
      counts.set(k, (counts.get(k) ?? 0) + 1);
    }
    const sources = [...counts.entries()]
      .map(([source, count]) => ({ source, count }))
      .sort((a, b) => b.count - a.count);
    return { sources, unknown, total: (data ?? []).length };
  });

export const adminUserStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;
    const [total, active, suspended, pending, admins] = await Promise.all([
      sb.from("profiles").select("id", { count: "exact", head: true }),
      sb.from("profiles").select("id", { count: "exact", head: true }).eq("status", "active"),
      sb.from("profiles").select("id", { count: "exact", head: true }).eq("status", "suspended"),
      sb.from("profiles").select("id", { count: "exact", head: true }).eq("status", "pending"),
      sb.from("user_roles").select("user_id", { count: "exact", head: true }).eq("role", "admin"),
    ]);
    return {
      total: total.count ?? 0,
      active: active.count ?? 0,
      suspended: suspended.count ?? 0,
      pending: pending.count ?? 0,
      admins: admins.count ?? 0,
    };
  });

export const adminSetUserStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; status: z.infer<typeof statusEnum> }) =>
    z.object({ id: z.string().uuid(), status: statusEnum }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("profiles").update({ status: data.status }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminSetUserRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; role: z.infer<typeof roleEnum>; grant: boolean }) =>
    z.object({ id: z.string().uuid(), role: roleEnum, grant: z.boolean() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;
    if (data.grant) {
      const { error } = await sb
        .from("user_roles")
        .upsert({ user_id: data.id, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw error;
    } else {
      const { error } = await sb
        .from("user_roles")
        .delete()
        .eq("user_id", data.id)
        .eq("role", data.role);
      if (error) throw error;
    }
    return { ok: true };
  });

export const adminUpdateUserProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; display_name?: string; level?: string; bio?: string | null }) =>
    z.object({
      id: z.string().uuid(),
      display_name: z.string().trim().min(1).max(120).optional(),
      level: z.string().trim().max(40).optional(),
      bio: z.string().trim().max(1000).nullable().optional(),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("profiles").update(patch).eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

// ============================================================
// Analytics + lifecycle (control center)
// ============================================================
export const adminUserAnalytics = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (context.supabase as any).rpc("admin_user_analytics");
    if (error) throw error;
    return data as {
      total_users: number; deleted_users: number;
      active_24h: number; active_7d: number; active_30d: number;
      lifetime_active: number; total_logins: number;
      avg_session_seconds: number;
      usage_24h: number; usage_7d: number; usage_30d: number;
    };
  });

export const adminTopUsers = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { order?: "most" | "least"; limit?: number }) =>
    z.object({
      order: z.enum(["most", "least"]).default("most"),
      limit: z.number().int().min(1).max(50).default(10),
    }).parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data: rows, error } = await (context.supabase as any)
      .rpc("admin_top_users", { _order: data.order, _limit: data.limit });
    if (error) throw error;
    return (rows ?? []) as Array<{
      user_id: string; display_name: string;
      total_login_count: number; total_usage_seconds: number;
      last_login_at: string | null;
    }>;
  });

export const adminUserSessions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { userId: string; limit?: number }) =>
    z.object({ userId: z.string().uuid(), limit: z.number().int().min(1).max(100).default(20) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("user_login_events")
      .select("id,login_at,logout_at,duration_seconds,user_agent,device,browser,ip")
      .eq("user_id", data.userId)
      .order("login_at", { ascending: false })
      .limit(data.limit);
    if (error) throw error;
    return rows ?? [];
  });

export const adminSoftDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any).rpc("admin_soft_delete_user", { _id: data.id });
    if (error) throw error;
    return { ok: true };
  });

export const adminRestoreUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any).rpc("admin_restore_user", { _id: data.id });
    if (error) throw error;
    return { ok: true };
  });

export const adminHardDeleteUser = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; confirmName: string }) =>
    z.object({ id: z.string().uuid(), confirmName: z.string().min(1) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: prof } = await context.supabase
      .from("profiles")
      .select("display_name")
      .eq("id", data.id)
      .maybeSingle();
    if (!prof) throw new Error("User not found");
    if ((prof.display_name ?? "").trim() !== data.confirmName.trim()) {
      throw new Error("Confirmation name does not match");
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any).rpc("admin_hard_delete_user", { _id: data.id });
    if (error) throw error;
    return { ok: true };
  });
