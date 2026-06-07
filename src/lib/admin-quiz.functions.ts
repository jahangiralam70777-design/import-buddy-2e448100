import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const statusEnum = z.enum(["draft", "published", "archived"]);
const difficultyEnum = z.enum(["easy", "medium", "hard"]);

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw error;
  if (!data) throw new Error("Forbidden: admin role required");
}

// ---------- List quizzes ----------
const listInput = z.object({
  search: z.string().trim().max(200).optional(),
  status: statusEnum.optional(),
  scheduled: z.boolean().optional(),
  level: z.string().trim().max(40).optional(),
  subjectId: z.string().uuid().optional(),
  chapterId: z.string().uuid().optional(),
  kind: z.enum(["quiz", "mock", "all"]).default("quiz"),
  page: z.number().int().min(1).max(2000).default(1),
  pageSize: z.number().int().min(1).max(100).default(20),
});

export const adminListQuizzes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof listInput>) => listInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const from = (data.page - 1) * data.pageSize;
    const to = from + data.pageSize - 1;
    let q = context.supabase
      .from("quizzes")
      .select(
        "id,title,description,level,subject_id,chapter_id,kind,status,difficulty,total_questions,duration_seconds,starts_at,ends_at,is_public,created_at,updated_at",
        { count: "exact" },
      )
      .order("updated_at", { ascending: false })
      .range(from, to);
    if (data.kind !== "all") q = q.eq("kind", data.kind);
    if (data.scheduled) {
      q = q.eq("status", "published").gt("starts_at", new Date().toISOString());
    } else if (data.status) {
      q = q.eq("status", data.status);
    }
    if (data.level) q = q.eq("level", data.level);
    if (data.subjectId) q = q.eq("subject_id", data.subjectId);
    if (data.chapterId) q = q.eq("chapter_id", data.chapterId);
    if (data.search) q = q.ilike("title", `%${data.search}%`);
    const { data: rows, error, count } = await q;
    if (error) throw error;
    return { rows: rows ?? [], count: count ?? 0, page: data.page, pageSize: data.pageSize };
  });

// ---------- Stats ----------
export const adminQuizStats = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;
    const now = new Date();
    const monthAgo = new Date(now.getTime() - 30 * 86400_000).toISOString();
    const twoMonthsAgo = new Date(now.getTime() - 60 * 86400_000).toISOString();
    const nowIso = now.toISOString();

    const [total, pub, draft, archived, scheduled, attempts, attemptsThis, attemptsPrev, totalThisMonth, totalPrev, pubThisMonth, pubPrev, draftThisMonth, draftPrev, recentAttemptsRows, avgRows, completedThis, startedThis, activeUsersRows, aiGen, aiGenPrev] = await Promise.all([
      sb.from("quizzes").select("id", { count: "exact", head: true }).eq("kind", "quiz"),
      sb.from("quizzes").select("id", { count: "exact", head: true }).eq("kind", "quiz").eq("status", "published"),
      sb.from("quizzes").select("id", { count: "exact", head: true }).eq("kind", "quiz").eq("status", "draft"),
      sb.from("quizzes").select("id", { count: "exact", head: true }).eq("kind", "quiz").eq("status", "archived"),
      sb.from("quizzes").select("id", { count: "exact", head: true }).eq("kind", "quiz").eq("status", "published").gt("starts_at", nowIso),
      sb.from("exam_attempts").select("id", { count: "exact", head: true }),
      sb.from("exam_attempts").select("id", { count: "exact", head: true }).gte("created_at", monthAgo),
      sb.from("exam_attempts").select("id", { count: "exact", head: true }).gte("created_at", twoMonthsAgo).lt("created_at", monthAgo),
      sb.from("quizzes").select("id", { count: "exact", head: true }).eq("kind", "quiz").gte("created_at", monthAgo),
      sb.from("quizzes").select("id", { count: "exact", head: true }).eq("kind", "quiz").gte("created_at", twoMonthsAgo).lt("created_at", monthAgo),
      sb.from("quizzes").select("id", { count: "exact", head: true }).eq("kind", "quiz").eq("status", "published").gte("updated_at", monthAgo),
      sb.from("quizzes").select("id", { count: "exact", head: true }).eq("kind", "quiz").eq("status", "published").gte("updated_at", twoMonthsAgo).lt("updated_at", monthAgo),
      sb.from("quizzes").select("id", { count: "exact", head: true }).eq("kind", "quiz").eq("status", "draft").gte("created_at", monthAgo),
      sb.from("quizzes").select("id", { count: "exact", head: true }).eq("kind", "quiz").eq("status", "draft").gte("created_at", twoMonthsAgo).lt("created_at", monthAgo),
      sb.from("exam_attempts").select("created_at").gte("created_at", new Date(now.getTime() - 7 * 86400_000).toISOString()).limit(5000),
      sb.from("exam_attempts").select("score,total_count,created_at").gte("created_at", monthAgo).limit(5000),
      sb.from("exam_attempts").select("id", { count: "exact", head: true }).gte("created_at", monthAgo).not("completed_at", "is", null),
      sb.from("exam_attempts").select("id", { count: "exact", head: true }).gte("created_at", monthAgo),
      sb.from("exam_attempts").select("user_id").gte("created_at", new Date(now.getTime() - 86400_000).toISOString()).limit(5000),
      sb.from("quizzes").select("id", { count: "exact", head: true }).eq("kind", "quiz").ilike("title", "[Auto]%"),
      sb.from("quizzes").select("id", { count: "exact", head: true }).eq("kind", "quiz").ilike("title", "[Auto]%").gte("created_at", twoMonthsAgo).lt("created_at", monthAgo),
    ]);

    const pct = (cur: number, prev: number) => {
      if (!prev) return cur > 0 ? 100 : 0;
      return Math.round(((cur - prev) / prev) * 1000) / 10;
    };

    const dayBuckets: Record<string, number> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400_000);
      dayBuckets[d.toISOString().slice(0, 10)] = 0;
    }
    for (const r of (recentAttemptsRows.data ?? []) as Array<{ created_at: string }>) {
      const k = (r.created_at || "").slice(0, 10);
      if (k in dayBuckets) dayBuckets[k]++;
    }
    const attemptsByDay = Object.entries(dayBuckets).map(([d, c]) => ({ d, c }));

    const dayBuckets30: Record<string, number> = {};
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now.getTime() - i * 86400_000);
      dayBuckets30[d.toISOString().slice(0, 10)] = 0;
    }
    let scoreSum = 0;
    let scoreDen = 0;
    for (const r of (avgRows.data ?? []) as Array<{ created_at: string; score: number; total_count: number }>) {
      const k = (r.created_at || "").slice(0, 10);
      if (k in dayBuckets30) dayBuckets30[k]++;
      if (r.total_count > 0) {
        scoreSum += (r.score / r.total_count) * 100;
        scoreDen++;
      }
    }
    const attemptsTrend30 = Object.entries(dayBuckets30).map(([d, c]) => ({ d, c }));
    const avgScore = scoreDen ? Math.round((scoreSum / scoreDen) * 10) / 10 : 0;

    const startedCount = startedThis.count ?? 0;
    const completedCount = completedThis.count ?? 0;
    const completionRate = startedCount ? Math.round((completedCount / startedCount) * 1000) / 10 : 0;
    const activeUsers = new Set(((activeUsersRows.data ?? []) as Array<{ user_id: string }>).map((r) => r.user_id)).size;
    const performanceScore = Math.round(((avgScore * 0.6) + (completionRate * 0.4)) * 10) / 10;

    return {
      total: total.count ?? 0,
      published: pub.count ?? 0,
      draft: draft.count ?? 0,
      archived: archived.count ?? 0,
      scheduled: scheduled.count ?? 0,
      attempts: attempts.count ?? 0,
      avgScore,
      completionRate,
      activeUsers,
      performanceScore,
      aiGenerated: aiGen.count ?? 0,
      deltas: {
        total: pct(totalThisMonth.count ?? 0, totalPrev.count ?? 0),
        published: pct(pubThisMonth.count ?? 0, pubPrev.count ?? 0),
        draft: pct(draftThisMonth.count ?? 0, draftPrev.count ?? 0),
        attempts: pct(attemptsThis.count ?? 0, attemptsPrev.count ?? 0),
        aiGenerated: pct(aiGen.count ?? 0, aiGenPrev.count ?? 0),
      },
      attemptsByDay,
      attemptsTrend30,
    };
  });


// ---------- Create / Update / Delete ----------
const quizInput = z.object({
  title: z.string().trim().min(1).max(180),
  description: z.string().trim().max(500).nullable().optional(),
  level: z.string().trim().min(1).max(40),
  subject_id: z.string().uuid().nullable().optional(),
  chapter_id: z.string().uuid().nullable().optional(),
  kind: z.enum(["quiz", "mock"]).default("quiz"),
  status: statusEnum.default("draft"),
  difficulty: difficultyEnum.default("medium"),
  total_questions: z.number().int().min(1).max(200).default(10),
  duration_seconds: z.number().int().min(30).max(60 * 60 * 6).default(900),
  starts_at: z.string().datetime().nullable().optional(),
  ends_at: z.string().datetime().nullable().optional(),
  is_public: z.boolean().default(true),
  randomize_options: z.boolean().default(false),
  randomize_questions: z.boolean().default(true),
  passing_marks: z.number().int().min(0).max(1000).default(0),
  negative_marking: z.number().min(0).max(10).default(0),
});

export const adminCreateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof quizInput>) => quizInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: row, error } = await context.supabase
      .from("quizzes")
      .insert({ ...data, created_by: context.userId })
      .select("id")
      .single();
    if (error) throw error;
    return row;
  });

const updateQuizInput = quizInput.partial().extend({ id: z.string().uuid() });
export const adminUpdateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof updateQuizInput>) => updateQuizInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { id, ...patch } = data;
    const { error } = await context.supabase.from("quizzes").update(patch).eq("id", id);
    if (error) throw error;
    return { ok: true };
  });

export const adminDeleteQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("quizzes").delete().eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminSetQuizStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string; status: z.infer<typeof statusEnum> }) =>
    z.object({ id: z.string().uuid(), status: statusEnum }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase.from("quizzes").update({ status: data.status }).eq("id", data.id);
    if (error) throw error;
    return { ok: true };
  });

export const adminDuplicateQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { id: string }) => z.object({ id: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;
    const { data: src, error } = await sb.from("quizzes").select("*").eq("id", data.id).single();
    if (error) throw error;
    const { id: _id, created_at: _c, updated_at: _u, ...rest } = src;
    void _id; void _c; void _u;
    const { data: row, error: ie } = await sb
      .from("quizzes")
      .insert({ ...rest, title: `${rest.title} (Copy)`, status: "draft", created_by: context.userId })
      .select("id")
      .single();
    if (ie) throw ie;
    // copy quiz_questions
    const { data: qqs } = await sb.from("quiz_questions").select("mcq_id,position").eq("quiz_id", data.id);
    if (qqs?.length) {
      await sb.from("quiz_questions").insert(qqs.map((q: { mcq_id: string; position: number }) => ({ ...q, quiz_id: row.id })));
    }
    return row;
  });

// ---------- Quiz questions ----------
export const adminGetQuizQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { quizId: string }) => z.object({ quizId: z.string().uuid() }).parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { data: rows, error } = await context.supabase
      .from("quiz_questions")
      .select("id,mcq_id,position")
      .eq("quiz_id", data.quizId)
      .order("position", { ascending: true });
    if (error) throw error;
    return rows ?? [];
  });

export const adminSetQuizQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: { quizId: string; mcqIds: string[] }) =>
    z.object({
      quizId: z.string().uuid(),
      mcqIds: z.array(z.string().uuid()).max(500),
    }).parse(i),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;
    await sb.from("quiz_questions").delete().eq("quiz_id", data.quizId);
    if (data.mcqIds.length) {
      const rows = data.mcqIds.map((mcq_id, i) => ({ quiz_id: data.quizId, mcq_id, position: i }));
      const { error } = await sb.from("quiz_questions").insert(rows);
      if (error) throw error;
    }
    await sb.from("quizzes").update({ total_questions: data.mcqIds.length }).eq("id", data.quizId);
    return { ok: true, count: data.mcqIds.length };
  });

// ---------- Auto-generate quizzes from existing MCQ pool ----------
function shuffleInPlace<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const autoGenInput = z
  .object({
    level: z.string().trim().max(40).nullable().optional(),
    subjectId: z.string().uuid().nullable().optional(),
    chapterId: z.string().uuid().nullable().optional(),
    questionCount: z.number().int().min(1).max(200).default(10),
    durationMinutes: z.number().int().min(1).max(360).default(15),
    overwrite: z.boolean().default(true),
    publish: z.boolean().default(true),
    randomizeOptions: z.boolean().default(true),
  })
  .refine((v) => !!(v.chapterId || v.subjectId || v.level), {
    message: "A level, subject, or chapter scope is required",
  });

export const adminAutoGenerateQuizzes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof autoGenInput>) => autoGenInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;

    let chapterIds: string[] = [];
    if (data.chapterId) {
      chapterIds = [data.chapterId];
    } else if (data.subjectId) {
      const { data: ch, error } = await sb.from("chapters").select("id").eq("subject_id", data.subjectId);
      if (error) throw error;
      chapterIds = (ch ?? []).map((c: { id: string }) => c.id);
    } else if (data.level) {
      const { data: subs, error: se } = await sb.from("subjects").select("id").eq("level", data.level);
      if (se) throw se;
      const sIds = (subs ?? []).map((s: { id: string }) => s.id);
      if (sIds.length === 0) return { created: 0, updated: 0, skipped: 0, results: [] };
      const { data: ch, error } = await sb.from("chapters").select("id").in("subject_id", sIds);
      if (error) throw error;
      chapterIds = (ch ?? []).map((c: { id: string }) => c.id);
    }
    if (chapterIds.length === 0) return { created: 0, updated: 0, skipped: 0, results: [] };

    const { data: chRows, error: cErr } = await sb
      .from("chapters")
      .select("id,name,subject_id")
      .in("id", chapterIds);
    if (cErr) throw cErr;
    const subjectIds = Array.from(new Set((chRows ?? []).map((c: { subject_id: string }) => c.subject_id)));
    const subjResp = subjectIds.length
      ? await sb.from("subjects").select("id,level,name").in("id", subjectIds)
      : { data: [] as Array<{ id: string; level: string; name: string }> };
    const subjMap = new Map(
      ((subjResp.data ?? []) as Array<{ id: string; level: string; name: string }>).map((s) => [s.id, s]),
    );

    let created = 0;
    let updated = 0;
    let skipped = 0;
    const results: Array<{ chapterId: string; chapter: string; status: "created" | "updated" | "skipped"; reason?: string; quizId?: string; picked?: number }> = [];

    for (const ch of (chRows ?? []) as Array<{ id: string; name: string; subject_id: string }>) {
      const subj = subjMap.get(ch.subject_id);
      const level = subj?.level ?? data.level ?? "professional";

      const { data: pool, error: pErr } = await sb
        .from("mcqs")
        .select("id")
        .eq("chapter_id", ch.id)
        .eq("status", "published");
      if (pErr) throw pErr;
      const ids = (pool ?? []).map((m: { id: string }) => m.id);
      if (ids.length < 1) {
        skipped++;
        results.push({ chapterId: ch.id, chapter: ch.name, status: "skipped", reason: "no MCQs" });
        continue;
      }
      const target = Math.min(data.questionCount, ids.length);
      const picked = shuffleInPlace([...ids]).slice(0, target);

      const title = `[Auto] ${ch.name}`;
      const { data: existing } = await sb
        .from("quizzes")
        .select("id")
        .eq("chapter_id", ch.id)
        .eq("kind", "quiz")
        .ilike("title", "[Auto] %")
        .limit(1);

      const quizPayload = {
        title,
        description: `Auto-generated quiz from ${ch.name}.`,
        level,
        subject_id: ch.subject_id,
        chapter_id: ch.id,
        kind: "quiz" as const,
        status: (data.publish ? "published" : "draft") as "published" | "draft",
        difficulty: "medium" as const,
        total_questions: target,
        duration_seconds: data.durationMinutes * 60,
        is_public: true,
        randomize_questions: true,
        randomize_options: data.randomizeOptions,
        passing_marks: 0,
        negative_marking: 0,
      };

      let quizId: string;
      if (existing && existing.length > 0 && data.overwrite) {
        quizId = (existing[0] as { id: string }).id;
        const { error: uErr } = await sb.from("quizzes").update(quizPayload).eq("id", quizId);
        if (uErr) throw uErr;
        updated++;
        results.push({ chapterId: ch.id, chapter: ch.name, status: "updated", quizId, picked: target });
      } else if (existing && existing.length > 0 && !data.overwrite) {
        skipped++;
        results.push({ chapterId: ch.id, chapter: ch.name, status: "skipped", reason: "auto quiz exists", quizId: (existing[0] as { id: string }).id });
        continue;
      } else {
        const { data: ins, error: iErr } = await sb
          .from("quizzes")
          .insert({ ...quizPayload, created_by: context.userId })
          .select("id")
          .single();
        if (iErr) throw iErr;
        quizId = (ins as { id: string }).id;
        created++;
        results.push({ chapterId: ch.id, chapter: ch.name, status: "created", quizId, picked: target });
      }

      await sb.from("quiz_questions").delete().eq("quiz_id", quizId);
      const rows = picked.map((mcq_id, i) => ({ quiz_id: quizId, mcq_id, position: i }));
      if (rows.length) {
        const { error: qErr } = await sb.from("quiz_questions").insert(rows);
        if (qErr) throw qErr;
      }
    }

    return { created, updated, skipped, results };
  });

// ---------- Regenerate a single quiz with fresh random MCQs from its chapter ----------
const regenInput = z.object({
  quizId: z.string().uuid(),
  questionCount: z.number().int().min(1).max(200).optional(),
});
export const adminRegenerateQuizQuestions = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof regenInput>) => regenInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;
    const { data: quiz, error: qErr } = await sb
      .from("quizzes")
      .select("id,chapter_id,total_questions")
      .eq("id", data.quizId)
      .single();
    if (qErr) throw qErr;
    if (!quiz?.chapter_id) throw new Error("Quiz has no chapter scope to regenerate from");
    const target = data.questionCount ?? quiz.total_questions ?? 10;

    const { data: pool, error: pErr } = await sb
      .from("mcqs")
      .select("id")
      .eq("chapter_id", quiz.chapter_id)
      .eq("status", "published");
    if (pErr) throw pErr;
    const ids = (pool ?? []).map((m: { id: string }) => m.id);
    if (ids.length === 0) throw new Error("No published MCQs available in this chapter");

    const picked = shuffleInPlace([...ids]).slice(0, Math.min(target, ids.length));
    await sb.from("quiz_questions").delete().eq("quiz_id", data.quizId);
    const rows = picked.map((mcq_id, i) => ({ quiz_id: data.quizId, mcq_id, position: i }));
    const { error: iErr } = await sb.from("quiz_questions").insert(rows);
    if (iErr) throw iErr;
    await sb.from("quizzes").update({ total_questions: picked.length }).eq("id", data.quizId);
    return { ok: true, picked: picked.length };
  });

// ---------- Bulk actions ----------
const bulkInput = z.object({
  ids: z.array(z.string().uuid()).min(1).max(500),
  action: z.enum(["publish", "unpublish", "archive", "delete", "duplicate"]),
});
export const adminBulkQuizAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof bulkInput>) => bulkInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const sb = context.supabase;
    if (data.action === "delete") {
      const { error } = await sb.from("quizzes").delete().in("id", data.ids);
      if (error) throw error;
      return { ok: true, count: data.ids.length };
    }
    if (data.action === "publish" || data.action === "unpublish" || data.action === "archive") {
      const status = data.action === "publish" ? "published" : data.action === "unpublish" ? "draft" : "archived";
      const { error } = await sb.from("quizzes").update({ status }).in("id", data.ids);
      if (error) throw error;
      return { ok: true, count: data.ids.length };
    }
    // duplicate
    let count = 0;
    for (const id of data.ids) {
      const { data: src, error } = await sb.from("quizzes").select("*").eq("id", id).single();
      if (error) continue;
      const { id: _id, created_at: _c, updated_at: _u, ...rest } = src;
      void _id; void _c; void _u;
      const { data: row } = await sb
        .from("quizzes")
        .insert({ ...rest, title: `${rest.title} (Copy)`, status: "draft", created_by: context.userId })
        .select("id")
        .single();
      if (!row) continue;
      const { data: qqs } = await sb.from("quiz_questions").select("mcq_id,position").eq("quiz_id", id);
      if (qqs?.length) {
        await sb.from("quiz_questions").insert(qqs.map((q: { mcq_id: string; position: number }) => ({ ...q, quiz_id: row.id })));
      }
      count++;
    }
    return { ok: true, count };
  });

// ---------- Export quizzes ----------
const exportInput = z.object({
  ids: z.array(z.string().uuid()).max(2000).optional(),
  format: z.enum(["csv", "json"]).default("csv"),
});
export const adminExportQuizzes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof exportInput>) => exportInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    let q = context.supabase
      .from("quizzes")
      .select("id,title,description,level,status,difficulty,total_questions,duration_seconds,starts_at,ends_at,created_at,updated_at")
      .eq("kind", "quiz")
      .order("updated_at", { ascending: false })
      .limit(2000);
    if (data.ids?.length) q = q.in("id", data.ids);
    const { data: rows, error } = await q;
    if (error) throw error;
    const list = (rows ?? []) as Array<Record<string, unknown>>;
    if (data.format === "json") return { content: JSON.stringify(list, null, 2), filename: `quizzes-${Date.now()}.json`, mime: "application/json" };
    const headers = ["id","title","description","level","status","difficulty","total_questions","duration_seconds","starts_at","ends_at","created_at","updated_at"];
    const esc = (v: unknown) => {
      if (v === null || v === undefined) return "";
      const s = String(v).replace(/"/g, '""');
      return /[",\n]/.test(s) ? `"${s}"` : s;
    };
    const csv = [headers.join(","), ...list.map((r) => headers.map((h) => esc(r[h])).join(","))].join("\n");
    return { content: csv, filename: `quizzes-${Date.now()}.csv`, mime: "text/csv" };
  });
