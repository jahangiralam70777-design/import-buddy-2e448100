import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// Whitelist of tables an admin can inspect / modify from the Database Manager.
// Keep this list narrow and explicit — never let arbitrary table names through.
export const INSPECTABLE_TABLES = [
  "profiles",
  "user_roles",
  "mcqs",
  "quizzes",
  "exam_attempts",
  "flash_cards",
  "short_notes",
  "question_bank_resources",
  "video_classes",
  "subjects",
  "chapters",
  "site_settings",
  "homepage_sections",
  "media_assets",
  "module_visibility",
  "content_versions",
] as const;
export type InspectableTable = (typeof INSPECTABLE_TABLES)[number];

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw error;
  if (!data) throw new Error("Forbidden: admin role required");
}

const listInput = z.object({
  table: z.enum(INSPECTABLE_TABLES as unknown as [string, ...string[]]),
  page: z.number().int().min(0).max(10000).default(0),
  pageSize: z.number().int().min(1).max(100).default(25),
  search: z.string().max(200).optional(),
});

type JsonValue = string | number | boolean | null | JsonValue[] | { [k: string]: JsonValue };
export type TableRow = Record<string, JsonValue>;
export type TableRowsResult = {
  table: string;
  rows: TableRow[];
  total: number;
  page: number;
  pageSize: number;
  columns: string[];
};

export const adminListTableRows = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => listInput.parse(input))
  .handler(async ({ data, context }): Promise<TableRowsResult> => {
    await assertAdmin(context.supabase, context.userId);
    const { table, page, pageSize, search } = data;
    const from = page * pageSize;
    const to = from + pageSize - 1;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let query = (context.supabase as any).from(table).select("*", { count: "exact" });
    if (search && search.trim()) {
      // Best-effort search on common text columns. We catch errors and fall back.
      const term = `%${search.trim()}%`;
      const candidates = ["name", "title", "email", "label", "key", "slug"];
      const filters = candidates.map((c) => `${c}.ilike.${term}`).join(",");
      query = query.or(filters);
    }
    const ordered = query.order("created_at", { ascending: false, nullsFirst: false });
    let res = await ordered.range(from, to);
    if (res.error) {
      // Retry without the optional ordering / search if the table doesn't have those columns.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      res = await (context.supabase as any).from(table).select("*", { count: "exact" }).range(from, to);
    }
    if (res.error) throw new Error(res.error.message);
    const rows = (res.data ?? []) as unknown as TableRow[];
    const columns = rows[0] ? Object.keys(rows[0]) : [];
    return {
      table,
      rows,
      total: res.count ?? rows.length,
      page,
      pageSize,
      columns,
    };
  });

const deleteInput = z.object({
  table: z.enum(INSPECTABLE_TABLES as unknown as [string, ...string[]]),
  id: z.string().min(1).max(200),
  idColumn: z.string().min(1).max(64).default("id"),
});

export const adminDeleteTableRow = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => deleteInput.parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    // Block destructive deletes on critical tables.
    const protectedTables = new Set(["user_roles", "site_settings", "module_visibility"]);
    if (protectedTables.has(data.table)) {
      throw new Error(`Row deletion is disabled on protected table "${data.table}".`);
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await (context.supabase as any)
      .from(data.table)
      .delete()
      .eq(data.idColumn, data.id);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
