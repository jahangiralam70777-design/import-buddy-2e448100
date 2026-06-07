import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const statusEnum = z.enum(["draft", "published", "archived"]);
const levelCode = z.string().trim().min(1).max(40).regex(/^[a-z0-9_-]+$/);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw error;
  if (!data) throw new Error("Forbidden: admin role required");
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60) || `item-${Date.now()}`;
}

async function fetchAllRows<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  table: string,
  selectClause: string,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await supabase
      .from(table)
      .select(selectClause)
      .range(from, from + pageSize - 1);

    if (error) throw error;

    const batch = (data ?? []) as T[];
    rows.push(...batch);

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

async function fetchAllWithQuery<T>(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  buildQuery: (from: number, to: number) => any,
  pageSize = 1000,
): Promise<T[]> {
  const rows: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await buildQuery(from, from + pageSize - 1);
    if (error) throw error;

    const batch = (data ?? []) as T[];
    rows.push(...batch);

    if (batch.length < pageSize) break;
    from += pageSize;
  }

  return rows;
}

// ============================================================
// TREE — single fetch to drive the whole Academic Manager UI
// ============================================================
export const adminGetAcademicTree = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;
    const [levelsRes, subjectsRes, chaptersRes, mcqs, quizzes] = await Promise.all([
      sb.from("levels").select("*").order("sort_order", { ascending: true }),
      sb.from("subjects").select("id,name,slug,level,color,icon,description,status,sort_order,updated_at").order("sort_order", { ascending: true }),
      sb.from("chapters").select("id,name,slug,subject_id,description,status,sort_order,updated_at").order("sort_order", { ascending: true }),
      fetchAllRows<Mcq>(sb, "mcqs", "id,chapter_id,status"),
      fetchAllRows<Qz>(sb, "quizzes", "id,subject_id,chapter_id,kind,status"),
    ]);
    if (levelsRes.error) throw levelsRes.error;
    if (subjectsRes.error) throw subjectsRes.error;
    if (chaptersRes.error) throw chaptersRes.error;

    type Mcq = { id: string; chapter_id: string; status: string };
    type Qz = { id: string; subject_id: string | null; chapter_id: string | null; kind: string; status: string };

    const mcqByChapter = new Map<string, number>();
    for (const m of mcqs) {
      mcqByChapter.set(m.chapter_id, (mcqByChapter.get(m.chapter_id) ?? 0) + 1);
    }
    const quizByChapter = new Map<string, number>();
    const mockByChapter = new Map<string, number>();
    const quizBySubject = new Map<string, number>();
    const mockBySubject = new Map<string, number>();
    for (const q of quizzes) {
      if (q.chapter_id) {
        if (q.kind === "mock") mockByChapter.set(q.chapter_id, (mockByChapter.get(q.chapter_id) ?? 0) + 1);
        else quizByChapter.set(q.chapter_id, (quizByChapter.get(q.chapter_id) ?? 0) + 1);
      } else if (q.subject_id) {
        if (q.kind === "mock") mockBySubject.set(q.subject_id, (mockBySubject.get(q.subject_id) ?? 0) + 1);
        else quizBySubject.set(q.subject_id, (quizBySubject.get(q.subject_id) ?? 0) + 1);
      }
    }

    return {
      levels: levelsRes.data ?? [],
      subjects: subjectsRes.data ?? [],
      chapters: chaptersRes.data ?? [],
      counts: {
        mcqByChapter: Object.fromEntries(mcqByChapter),
        quizByChapter: Object.fromEntries(quizByChapter),
        mockByChapter: Object.fromEntries(mockByChapter),
        quizBySubject: Object.fromEntries(quizBySubject),
        mockBySubject: Object.fromEntries(mockBySubject),
      },
    };
  });

// ============================================================
// LEVELS
// ============================================================
const levelInput = z.object({
  code: levelCode,
  name: z.string().trim().min(1).max(80),
  description: z.string().trim().max(500).nullable().optional(),
  color: z.string().trim().max(20).nullable().optional(),
  icon: z.string().trim().max(60).nullable().optional(),
  sort_order: z.number().int().min(0).max(9999).default(0),
  status: statusEnum.default("published"),
});

export const adminCreateLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof levelInput>) => levelInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("levels").insert(data);
    if (error) throw error;
    return { ok: true };
  });

export const adminUpdateLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { code: string } & Partial<z.infer<typeof levelInput>>) =>
    levelInput.partial().extend({ code: levelCode }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { code, ...patch } = data;
    const { error } = await context.supabase.from("levels").update(patch).eq("code", code);
    if (error) throw error;
    return { ok: true };
  });

export const adminDeleteLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { code: string }) => z.object({ code: levelCode }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { count, error: ce } = await context.supabase
      .from("subjects")
      .select("id", { count: "exact", head: true })
      .eq("level", data.code);
    if (ce) throw ce;
    if ((count ?? 0) > 0) throw new Error(`Cannot delete level: ${count} subject(s) still assigned`);
    const { error } = await context.supabase.from("levels").delete().eq("code", data.code);
    if (error) throw error;
    return { ok: true };
  });

// ============================================================
// SUBJECTS
// ============================================================
const subjectInput = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z.string().trim().max(80).optional(),
  level: levelCode.default("professional"),
  description: z.string().trim().max(1000).nullable().optional(),
  color: z.string().trim().max(20).nullable().optional(),
  icon: z.string().trim().max(60).nullable().optional(),
  sort_order: z.number().int().min(0).max(9999).default(0),
  status: statusEnum.default("published"),
});

export const adminCreateSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof subjectInput>) => subjectInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const slug = data.slug?.trim() || slugify(data.name);
    const { data: row, error } = await context.supabase
      .from("subjects")
      .insert({ ...data, slug })
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id };
  });

export const adminUpdateSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string } & Partial<z.infer<typeof subjectInput>>) =>
    subjectInput.partial().extend({ id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { id, ...patch } = data;
    const { error } = await context.supabase
      .from("subjects")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

export const adminDeleteSubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { count, error: ce } = await context.supabase
      .from("chapters")
      .select("id", { count: "exact", head: true })
      .eq("subject_id", data.id);
    if (ce) throw ce;
    if ((count ?? 0) > 0) throw new Error(`Cannot delete subject: ${count} chapter(s) inside`);
    const { error } = await context.supabase.from("subjects").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminReorderSubjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { ids: string[] }) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await Promise.all(
      data.ids.map((id, idx) =>
        context.supabase.from("subjects").update({ sort_order: idx }).eq("id", id),
      ),
    );
    return { ok: true };
  });

// ============================================================
// CHAPTERS
// ============================================================
const chapterInput = z.object({
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().max(120).optional(),
  subject_id: z.string().uuid(),
  description: z.string().trim().max(2000).nullable().optional(),
  sort_order: z.number().int().min(0).max(9999).default(0),
  status: statusEnum.default("published"),
});

export const adminCreateChapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof chapterInput>) => chapterInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const slug = data.slug?.trim() || slugify(data.name);
    const { data: row, error } = await context.supabase
      .from("chapters")
      .insert({ ...data, slug })
      .select("id")
      .single();
    if (error) throw error;
    return { id: row.id };
  });

export const adminUpdateChapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string } & Partial<z.infer<typeof chapterInput>>) =>
    chapterInput.partial().extend({ id: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { id, ...patch } = data;
    const { error } = await context.supabase
      .from("chapters")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

export const adminDeleteChapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { count, error: ce } = await context.supabase
      .from("mcqs")
      .select("id", { count: "exact", head: true })
      .eq("chapter_id", data.id);
    if (ce) throw ce;
    if ((count ?? 0) > 0) throw new Error(`Cannot delete chapter: ${count} MCQ(s) inside`);
    const { error } = await context.supabase.from("chapters").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminReorderChapters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { ids: string[] }) =>
    z.object({ ids: z.array(z.string().uuid()).min(1).max(500) }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await Promise.all(
      data.ids.map((id, idx) =>
        context.supabase.from("chapters").update({ sort_order: idx }).eq("id", id),
      ),
    );
    return { ok: true };
  });

// ============================================================
// ANALYTICS — drives the premium dashboard widgets
// ============================================================
export const adminAcademicAnalytics = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;
    const now = Date.now();
    const thirty = new Date(now - 30 * 24 * 3600 * 1000).toISOString();

    const [events, recentRes, notesRes, flashRes, lastRes] = await Promise.all([
      fetchAllWithQuery<Ev>((from, to) =>
        sb.from("activity_events")
          .select("module, target_kind, target_id, user_id, created_at")
          .gte("created_at", thirty)
          .range(from, to),
      ),
      sb.from("activity_events")
        .select("id, event_type, element_label, module, target_kind, target_id, user_id, created_at")
        .in("module", ["academic", "mcq", "quiz", "mock", "flash_cards", "short_notes"])
        .order("created_at", { ascending: false })
        .limit(8),
      sb.from("short_notes").select("id", { count: "exact", head: true }),
      sb.from("flash_cards").select("id", { count: "exact", head: true }),
      sb.from("activity_events").select("created_at").order("created_at", { ascending: false }).limit(1),
    ]);
    type Ev = { module: string | null; target_kind: string | null; target_id: string | null; user_id: string | null; created_at: string };

    const subjViews = new Map<string, number>();
    const subjUsers = new Map<string, Set<string>>();
    const subjAttempts = new Map<string, number>();
    const chapViews = new Map<string, number>();
    const chapUsers = new Map<string, Set<string>>();
    const chapAttempts = new Map<string, number>();
    const dayBuckets = new Map<string, { views: number; users: Set<string>; attempts: number }>();
    let totalViews = 0;
    let totalAttempts = 0;
    const allUsers = new Set<string>();

    for (const e of events) {
      const day = e.created_at.slice(0, 10);
      if (!dayBuckets.has(day)) dayBuckets.set(day, { views: 0, users: new Set(), attempts: 0 });
      const bucket = dayBuckets.get(day)!;
      if (e.user_id) { allUsers.add(e.user_id); bucket.users.add(e.user_id); }

      const isAttempt = e.module === "mcq" || e.module === "quiz" || e.module === "mock";
      if (isAttempt) {
        totalAttempts += 1;
        bucket.attempts += 1;
      } else {
        totalViews += 1;
        bucket.views += 1;
      }

      if (e.target_kind === "subject" && e.target_id) {
        subjViews.set(e.target_id, (subjViews.get(e.target_id) ?? 0) + 1);
        if (e.user_id) {
          if (!subjUsers.has(e.target_id)) subjUsers.set(e.target_id, new Set());
          subjUsers.get(e.target_id)!.add(e.user_id);
        }
        if (isAttempt) subjAttempts.set(e.target_id, (subjAttempts.get(e.target_id) ?? 0) + 1);
      }
      if (e.target_kind === "chapter" && e.target_id) {
        chapViews.set(e.target_id, (chapViews.get(e.target_id) ?? 0) + 1);
        if (e.user_id) {
          if (!chapUsers.has(e.target_id)) chapUsers.set(e.target_id, new Set());
          chapUsers.get(e.target_id)!.add(e.user_id);
        }
        if (isAttempt) chapAttempts.set(e.target_id, (chapAttempts.get(e.target_id) ?? 0) + 1);
      }
    }

    // Build dense 30-day series
    const series: { day: string; views: number; attempts: number; users: number }[] = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now - i * 24 * 3600 * 1000).toISOString().slice(0, 10);
      const b = dayBuckets.get(d);
      series.push({ day: d, views: b?.views ?? 0, attempts: b?.attempts ?? 0, users: b?.users.size ?? 0 });
    }

    const subjects: Record<string, { views: number; uniqueUsers: number; attempts: number }> = {};
    for (const [k, v] of subjViews) subjects[k] = { views: v, uniqueUsers: subjUsers.get(k)?.size ?? 0, attempts: subjAttempts.get(k) ?? 0 };
    const chapters: Record<string, { views: number; uniqueUsers: number; attempts: number }> = {};
    for (const [k, v] of chapViews) chapters[k] = { views: v, uniqueUsers: chapUsers.get(k)?.size ?? 0, attempts: chapAttempts.get(k) ?? 0 };

    return {
      totals: {
        views: totalViews,
        attempts: totalAttempts,
        uniqueUsers: allUsers.size,
        notes: notesRes.count ?? 0,
        flashCards: flashRes.count ?? 0,
      },
      perSubject: subjects,
      perChapter: chapters,
      series,
      recent: recentRes.data ?? [],
      health: {
        lastEventAt: (lastRes.data?.[0]?.created_at as string | undefined) ?? null,
      },
    };
  });
