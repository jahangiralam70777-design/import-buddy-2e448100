import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const levelCode = z.string().trim().min(1).max(40);
const statusEnum = z.enum(["draft", "published", "archived"]);
const difficultyEnum = z.enum(["easy", "medium", "hard"]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw error;
  if (!data) throw new Error("Forbidden: admin role required");
}

// ---------- Lookups ----------
export const adminListSubjectsByLevel = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { level?: string }) =>
    z.object({ level: levelCode.optional() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("subjects")
      .select("id,name,slug,level,color,icon,status,sort_order")
      .order("sort_order", { ascending: true });
    if (data.level) q = q.eq("level", data.level);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

export const adminListChaptersBySubject = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { subjectId: string }) =>
    z.object({ subjectId: z.string().uuid() }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("chapters")
      .select("id,name,slug,subject_id,status,sort_order")
      .eq("subject_id", data.subjectId)
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return rows ?? [];
  });

export const adminListMcqsForBuilder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: {
    chapterIds?: string[];
    subjectId?: string;
    level?: string;
    search?: string;
    difficulty?: string;
  }) =>
    z
      .object({
        chapterIds: z.array(z.string().uuid()).max(200).optional(),
        subjectId: z.string().uuid().optional(),
        level: levelCode.optional(),
        search: z.string().trim().max(200).optional(),
        difficulty: difficultyEnum.optional(),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    // Resolve target chapter ids based on the most specific scope provided.
    let chapterIds: string[] = data.chapterIds ?? [];
    if (chapterIds.length === 0 && data.subjectId) {
      const { data: chs, error: ce } = await context.supabase
        .from("chapters")
        .select("id")
        .eq("subject_id", data.subjectId);
      if (ce) throw ce;
      chapterIds = (chs ?? []).map((c: { id: string }) => c.id);
    }
    if (chapterIds.length === 0 && data.level) {
      const { data: subs, error: se } = await context.supabase
        .from("subjects")
        .select("id")
        .eq("level", data.level);
      if (se) throw se;
      const subjectIds = (subs ?? []).map((s: { id: string }) => s.id);
      if (subjectIds.length) {
        const { data: chs, error: ce } = await context.supabase
          .from("chapters")
          .select("id")
          .in("subject_id", subjectIds);
        if (ce) throw ce;
        chapterIds = (chs ?? []).map((c: { id: string }) => c.id);
      }
    }
    if (chapterIds.length === 0) return [];
    let q = context.supabase
      .from("mcqs")
      .select("id,question,difficulty,status,chapter_id,correct_option")
      .in("chapter_id", chapterIds)
      .order("updated_at", { ascending: false })
      .limit(500);
    if (data.difficulty) q = q.eq("difficulty", data.difficulty);
    if (data.search) q = q.ilike("question", `%${data.search}%`);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });


// ---------- Mocks (stored in quizzes with kind='mock') ----------
const mockSelect =
  "id,title,description,level,status,total_questions,duration_seconds,difficulty,starts_at,ends_at,is_public,randomize_questions,randomize_options,negative_marking,passing_marks,subject_id,chapter_id,updated_at,created_at";

export const adminListMocks = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: {
    search?: string;
    status?: string;
    level?: string;
    subjectId?: string;
    mockType?: "all" | "full" | "chapter" | "level";
    date?: "all" | "scheduled" | "unscheduled" | "upcoming" | "expired";
    sortBy?: "updated_at" | "title" | "starts_at" | "total_questions";
    sortDir?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  }) =>
    z
      .object({
        search: z.string().trim().max(200).optional(),
        status: statusEnum.optional(),
        level: levelCode.optional(),
        subjectId: z.string().uuid().optional(),
        mockType: z.enum(["all", "full", "chapter", "level"]).default("all"),
        date: z.enum(["all", "scheduled", "unscheduled", "upcoming", "expired"]).default("all"),
        sortBy: z.enum(["updated_at", "title", "starts_at", "total_questions"]).default("updated_at"),
        sortDir: z.enum(["asc", "desc"]).default("desc"),
        page: z.number().int().min(1).max(2000).default(1),
        pageSize: z.number().int().min(1).max(100).default(20),
      })
      .parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = context.supabase
      .from("quizzes")
      .select(mockSelect, { count: "exact" })
      .eq("kind", "mock")
      .order(data.sortBy, { ascending: data.sortDir === "asc", nullsFirst: false })
      .range(from, to);
    if (data.status) q = q.eq("status", data.status);
    if (data.level) q = q.eq("level", data.level);
    if (data.subjectId) q = q.eq("subject_id", data.subjectId);
    if (data.mockType === "full") q = q.not("subject_id", "is", null).is("chapter_id", null);
    if (data.mockType === "chapter") q = q.not("chapter_id", "is", null);
    if (data.mockType === "level") q = q.is("subject_id", null).is("chapter_id", null);

    if (data.date === "scheduled") q = q.not("starts_at", "is", null);
    if (data.date === "unscheduled") q = q.is("starts_at", null);
    if (data.date === "upcoming") q = q.gte("starts_at", new Date().toISOString());
    if (data.date === "expired") q = q.lt("ends_at", new Date().toISOString());
    if (data.search) q = q.ilike("title", `%${data.search}%`);
    const { data: rows, error, count } = await q;
    if (error) throw error;
    return { rows: rows ?? [], count: count ?? 0 };
  });

// Full-dataset KPI stats for the Mock Test Manager dashboard.
// Uses exact-count head queries so values reflect the entire database,
// not just the currently loaded page of rows.
export const adminMockStats = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;
    const nowIso = new Date().toISOString();

    const base = () => sb.from("quizzes").select("id", { count: "exact", head: true }).eq("kind", "mock");

    const [
      totalRes,
      publishedRes,
      draftsRes,
      archivedRes,
      scheduledRes,
      liveRes,
      questionsAgg,
    ] = await Promise.all([
      base(),
      base().eq("status", "published"),
      base().eq("status", "draft"),
      base().eq("status", "archived"),
      base().gt("starts_at", nowIso),
      base()
        .eq("status", "published")
        .or(`starts_at.is.null,starts_at.lte.${nowIso}`)
        .or(`ends_at.is.null,ends_at.gte.${nowIso}`),
      // Sum + count of total_questions across all mocks (paged to bypass 1000-row cap).
      (async () => {
        let from = 0;
        const pageSize = 1000;
        let sum = 0;
        let n = 0;
        // eslint-disable-next-line no-constant-condition
        while (true) {
          const { data, error } = await sb
            .from("quizzes")
            .select("total_questions")
            .eq("kind", "mock")
            .range(from, from + pageSize - 1);
          if (error) throw error;
          const batch = (data ?? []) as Array<{ total_questions: number | null }>;
          for (const r of batch) {
            sum += r.total_questions ?? 0;
            n += 1;
          }
          if (batch.length < pageSize) break;
          from += pageSize;
        }
        return { sum, n };
      })(),
    ]);

    for (const r of [totalRes, publishedRes, draftsRes, archivedRes, scheduledRes, liveRes]) {
      if (r.error) throw r.error;
    }

    const total = totalRes.count ?? 0;
    const totalQuestions = questionsAgg.sum;
    const avgQuestions = questionsAgg.n ? Math.round(totalQuestions / questionsAgg.n) : 0;

    return {
      total,
      published: publishedRes.count ?? 0,
      drafts: draftsRes.count ?? 0,
      archived: archivedRes.count ?? 0,
      scheduled: scheduledRes.count ?? 0,
      live: liveRes.count ?? 0,
      totalQuestions,
      avgQuestions,
    };
  });

const mockInputSchema = z.object({
  title: z.string().trim().min(2).max(200),
  description: z.string().trim().max(2000).nullable().optional(),
  level: levelCode.default("professional"),
  subject_id: z.string().uuid().nullable().optional(),
  chapter_id: z.string().uuid().nullable().optional(),
  duration_seconds: z.number().int().min(60).max(60 * 60 * 8).default(3600),
  total_questions: z.number().int().min(1).max(500).default(20),
  difficulty: difficultyEnum.default("medium"),
  status: statusEnum.default("draft"),
  starts_at: z.string().datetime().nullable().optional(),
  ends_at: z.string().datetime().nullable().optional(),
  is_public: z.boolean().default(true),
  randomize_questions: z.boolean().default(true),
  randomize_options: z.boolean().default(false),
  negative_marking: z.number().min(0).max(5).default(0),
  passing_marks: z.number().int().min(0).max(1000).default(0),
  mcq_ids: z.array(z.string().uuid()).max(500).optional(),
});

export const adminCreateMock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof mockInputSchema>) => mockInputSchema.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { mcq_ids, ...rest } = data;
    const { data: row, error } = await context.supabase
      .from("quizzes")
      .insert({ ...rest, kind: "mock", created_by: context.userId, total_questions: mcq_ids?.length || rest.total_questions })
      .select("id")
      .single();
    if (error) throw error;
    if (mcq_ids && mcq_ids.length) {
      const links = mcq_ids.map((mcq_id, i) => ({ quiz_id: row.id, mcq_id, position: i }));
      const { error: le } = await context.supabase.from("quiz_questions").insert(links);
      if (le) throw le;
    }
    return { id: row.id };
  });

const updateInput = mockInputSchema.partial().extend({ id: z.string().uuid() });
export const adminUpdateMock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof updateInput>) => updateInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { id, mcq_ids, ...patch } = data;
    const { error } = await context.supabase.from("quizzes").update({ ...patch, updated_at: new Date().toISOString() }).eq("id", id);
    if (error) throw error;
    if (mcq_ids) {
      await context.supabase.from("quiz_questions").delete().eq("quiz_id", id);
      if (mcq_ids.length) {
        const links = mcq_ids.map((mcq_id, i) => ({ quiz_id: id, mcq_id, position: i }));
        const { error: le } = await context.supabase.from("quiz_questions").insert(links);
        if (le) throw le;
      }
      await context.supabase.from("quizzes").update({ total_questions: mcq_ids.length, updated_at: new Date().toISOString() }).eq("id", id);
    }
    return { ok: true };
  });

export const adminDeleteMock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    await context.supabase.from("quiz_questions").delete().eq("quiz_id", data.id);
    const { error } = await context.supabase.from("quizzes").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminSetMockStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; status: z.infer<typeof statusEnum> }) =>
    z.object({ id: z.string().uuid(), status: statusEnum }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("quizzes").update({ status: data.status, updated_at: new Date().toISOString() }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminDuplicateMock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: src, error: se } = await context.supabase
      .from("quizzes")
      .select(mockSelect)
      .eq("id", data.id)
      .single();
    if (se) throw se;
    const { id: _omit, updated_at: _u, created_at: _c, ...rest } = src as Record<string, unknown>;
    const { data: copy, error: ce } = await context.supabase
      .from("quizzes")
      .insert({ ...rest, kind: "mock", status: "draft", title: `${(src as { title: string }).title} (copy)`, created_by: context.userId })
      .select("id")
      .single();
    if (ce) throw ce;
    const { data: links } = await context.supabase
      .from("quiz_questions")
      .select("mcq_id,position")
      .eq("quiz_id", data.id);
    if (links && links.length) {
      await context.supabase
        .from("quiz_questions")
        .insert(links.map((l: { mcq_id: string; position: number }) => ({ ...l, quiz_id: copy.id })));
    }
    return { id: copy.id };
  });

export const adminGetMockQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("quiz_questions")
      .select("mcq_id,position")
      .eq("quiz_id", data.id)
      .order("position", { ascending: true });
    if (error) throw error;
    return (rows ?? []).map((r: { mcq_id: string }) => r.mcq_id);
  });

// ---------- Auto-generate a mock test (fully automatic) ----------
// Picks a chapter with the most published MCQs, randomly samples a balanced
// set across difficulties, and creates a published mock immediately.
export const adminAutoGenerateMock = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { questionCount?: number; durationMinutes?: number }) =>
    z
      .object({
        questionCount: z.number().int().min(5).max(200).default(20),
        durationMinutes: z.number().int().min(1).max(480).optional(),
      })
      .parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;

    // 1) Fetch published MCQs (paged to bypass 1000 row cap).
    type McqRow = { id: string; chapter_id: string; difficulty: "easy" | "medium" | "hard" };
    const mcqs: McqRow[] = [];
    {
      let from = 0;
      const pageSize = 1000;
      // eslint-disable-next-line no-constant-condition
      while (true) {
        const { data: batch, error } = await sb
          .from("mcqs")
          .select("id,chapter_id,difficulty")
          .eq("status", "published")
          .range(from, from + pageSize - 1);
        if (error) throw error;
        const rows = (batch ?? []) as McqRow[];
        mcqs.push(...rows);
        if (rows.length < pageSize) break;
        from += pageSize;
      }
    }
    if (mcqs.length === 0) {
      throw new Error("No published MCQs available to generate a mock test from.");
    }

    // 2) Group by chapter; pick the chapter with the most MCQs.
    const byChapter = new Map<string, McqRow[]>();
    for (const m of mcqs) {
      if (!m.chapter_id) continue;
      const arr = byChapter.get(m.chapter_id) ?? [];
      arr.push(m);
      byChapter.set(m.chapter_id, arr);
    }
    if (byChapter.size === 0) {
      throw new Error("No MCQs are linked to a chapter — cannot auto-generate.");
    }
    const sorted = [...byChapter.entries()].sort((a, b) => b[1].length - a[1].length);
    const [chapterId, chapterMcqs] = sorted[0];

    // 3) Resolve chapter -> subject -> level.
    const { data: chapter, error: chErr } = await sb
      .from("chapters")
      .select("id,name,subject_id")
      .eq("id", chapterId)
      .single();
    if (chErr || !chapter) throw chErr ?? new Error("Chapter not found");
    const { data: subject, error: sErr } = await sb
      .from("subjects")
      .select("id,name,level")
      .eq("id", chapter.subject_id)
      .single();
    if (sErr || !subject) throw sErr ?? new Error("Subject not found");
    const level = (subject.level && subject.level.length > 0 ? subject.level : "professional") as string;

    // 4) Balanced selection across difficulties (~30/40/30 of available).
    const target = Math.min(data.questionCount, chapterMcqs.length);
    const easyTarget = Math.round(target * 0.3);
    const medTarget = Math.round(target * 0.4);
    const hardTarget = target - easyTarget - medTarget;
    const buckets: Record<"easy" | "medium" | "hard", McqRow[]> = { easy: [], medium: [], hard: [] };
    for (const m of chapterMcqs) (buckets[m.difficulty] ?? buckets.medium).push(m);
    const shuffle = <T,>(arr: T[]) => arr.slice().sort(() => Math.random() - 0.5);
    const picked = new Set<string>();
    const pickFrom = (pool: McqRow[], n: number) => {
      let need = n;
      for (const m of shuffle(pool)) {
        if (picked.size >= target || need <= 0) break;
        if (picked.has(m.id)) continue;
        picked.add(m.id);
        need -= 1;
      }
    };
    pickFrom(buckets.easy, easyTarget);
    pickFrom(buckets.medium, medTarget);
    pickFrom(buckets.hard, hardTarget);
    if (picked.size < target) pickFrom(chapterMcqs, target - picked.size);

    const mcqIds = shuffle([...picked]);
    if (mcqIds.length === 0) throw new Error("Failed to select MCQs for the mock test.");

    // 5) Duration: configured or auto (~60s per question, clamped 5-180 min).
    const durationSeconds = data.durationMinutes
      ? data.durationMinutes * 60
      : Math.max(5 * 60, Math.min(180 * 60, mcqIds.length * 60));

    const stamp = new Date();
    const title = `Auto Mock · ${subject.name} — ${chapter.name} (${stamp.toLocaleDateString()} ${stamp.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })})`;

    // 6) Create the mock row.
    const { data: quizRow, error: qErr } = await sb
      .from("quizzes")
      .insert({
        kind: "mock",
        title,
        description: `Auto-generated mock with ${mcqIds.length} questions from ${subject.name} — ${chapter.name}.`,
        level,
        subject_id: subject.id,
        chapter_id: chapter.id,
        duration_seconds: durationSeconds,
        total_questions: mcqIds.length,
        difficulty: "medium",
        status: "published",
        is_public: true,
        randomize_questions: true,
        randomize_options: false,
        negative_marking: 0,
        passing_marks: 0,
        created_by: context.userId,
      })
      .select("id")
      .single();
    if (qErr || !quizRow) throw qErr ?? new Error("Failed to create mock");

    // 7) Link questions.
    const links = mcqIds.map((mcq_id, i) => ({ quiz_id: quizRow.id, mcq_id, position: i }));
    const { error: linkErr } = await sb.from("quiz_questions").insert(links);
    if (linkErr) {
      await sb.from("quizzes").delete().eq("id", quizRow.id);
      throw linkErr;
    }

    return {
      id: quizRow.id,
      title,
      level,
      subjectId: subject.id,
      chapterId: chapter.id,
      questionCount: mcqIds.length,
      durationSeconds,
    };
  });
