import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// ---- Levels (dynamic, admin-managed) ----
export const listLevels = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("levels")
      .select("code,name,description,color,icon,sort_order")
      .eq("status", "published")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return data ?? [];
  });


// ---- Subjects ----
const subjectsSchema = z
  .object({ level: z.string().trim().min(1).max(40).optional() })
  .partial();

export const listSubjects = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof subjectsSchema> | undefined) =>
    subjectsSchema.parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    let q = context.supabase
      .from("subjects")
      .select("id,name,slug,description,icon,color,sort_order,level")
      .eq("status", "published")
      .order("sort_order", { ascending: true });
    if (data?.level) q = q.ilike("level", data.level);
    const { data: rows, error } = await q;
    if (error) throw error;
    return rows ?? [];
  });

// ---- Progress: subjects in a level ----
const subjectProgressSchema = z
  .object({ level: z.string().trim().min(1).max(40).optional() })
  .partial();

export const listSubjectProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof subjectProgressSchema> | undefined) =>
    subjectProgressSchema.parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const userId = context.userId;
    // 1. Subjects in scope
    let sq = supabase.from("subjects").select("id").eq("status", "published");
    if (data?.level) sq = sq.ilike("level", data.level);
    const { data: subjects, error: se } = await sq;
    if (se) throw se;
    const subjectIds = (subjects ?? []).map((s) => s.id);
    if (!subjectIds.length) return [] as Array<{ subject_id: string; total: number; completed: number; percent: number }>;
    // 2. Chapters under those subjects
    const { data: chapters, error: ce } = await supabase
      .from("chapters")
      .select("id,subject_id")
      .in("subject_id", subjectIds)
      .eq("status", "published");
    if (ce) throw ce;
    const chapterToSubject = new Map<string, string>();
    (chapters ?? []).forEach((c) => chapterToSubject.set(c.id, c.subject_id));
    const chapterIds = Array.from(chapterToSubject.keys());
    if (!chapterIds.length) {
      return subjectIds.map((id) => ({ subject_id: id, total: 0, completed: 0, percent: 0 }));
    }
    // 3. Total published MCQs per subject (via chapter)
    const { data: mcqs, error: me } = await supabase
      .from("mcqs")
      .select("id,chapter_id")
      .in("chapter_id", chapterIds)
      .eq("status", "published");
    if (me) throw me;
    const totalsBySubject = new Map<string, number>();
    const mcqToSubject = new Map<string, string>();
    for (const m of mcqs ?? []) {
      const sId = chapterToSubject.get(m.chapter_id);
      if (!sId) continue;
      mcqToSubject.set(m.id, sId);
      totalsBySubject.set(sId, (totalsBySubject.get(sId) ?? 0) + 1);
    }
    // 4. Distinct MCQs the user has answered (chosen non-null)
    const { data: attempts, error: ae } = await supabase
      .from("exam_attempts")
      .select("id")
      .eq("user_id", userId)
      .in("subject_id", subjectIds);
    if (ae) throw ae;
    const attemptIds = (attempts ?? []).map((a) => a.id);
    const completedBySubject = new Map<string, Set<string>>();
    if (attemptIds.length) {
      const { data: ans, error: aae } = await supabase
        .from("attempt_answers")
        .select("mcq_id,chosen_option,attempt_id")
        .in("attempt_id", attemptIds)
        .not("chosen_option", "is", null);
      if (aae) throw aae;
      for (const r of ans ?? []) {
        const sId = mcqToSubject.get(r.mcq_id);
        if (!sId) continue;
        if (!completedBySubject.has(sId)) completedBySubject.set(sId, new Set());
        completedBySubject.get(sId)!.add(r.mcq_id);
      }
    }
    return subjectIds.map((id) => {
      const total = totalsBySubject.get(id) ?? 0;
      const completed = completedBySubject.get(id)?.size ?? 0;
      const percent = total ? Math.round((completed / total) * 100) : 0;
      return { subject_id: id, total, completed, percent };
    });
  });

// ---- Progress: chapters in a subject ----
const chapterProgressSchema = z.object({ subjectId: z.string().uuid() });

export const listChapterProgress = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof chapterProgressSchema>) =>
    chapterProgressSchema.parse(i),
  )
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const userId = context.userId;
    const { data: chapters, error: ce } = await supabase
      .from("chapters")
      .select("id")
      .eq("subject_id", data.subjectId)
      .eq("status", "published");
    if (ce) throw ce;
    const chapterIds = (chapters ?? []).map((c) => c.id);
    if (!chapterIds.length) return [] as Array<{ chapter_id: string; total: number; completed: number; percent: number; correct: number; accuracy: number }>;
    const { data: mcqs, error: me } = await supabase
      .from("mcqs")
      .select("id,chapter_id")
      .in("chapter_id", chapterIds)
      .eq("status", "published");
    if (me) throw me;
    const totalsByChapter = new Map<string, number>();
    const mcqToChapter = new Map<string, string>();
    for (const m of mcqs ?? []) {
      mcqToChapter.set(m.id, m.chapter_id);
      totalsByChapter.set(m.chapter_id, (totalsByChapter.get(m.chapter_id) ?? 0) + 1);
    }
    const { data: attempts, error: ae } = await supabase
      .from("exam_attempts")
      .select("id")
      .eq("user_id", userId)
      .in("chapter_id", chapterIds);
    if (ae) throw ae;
    const attemptIds = (attempts ?? []).map((a) => a.id);
    const completedByChapter = new Map<string, Set<string>>();
    const correctByChapter = new Map<string, Set<string>>();
    if (attemptIds.length) {
      const { data: ans, error: aae } = await supabase
        .from("attempt_answers")
        .select("mcq_id,chosen_option,is_correct,attempt_id")
        .in("attempt_id", attemptIds)
        .not("chosen_option", "is", null);
      if (aae) throw aae;
      for (const r of ans ?? []) {
        const cId = mcqToChapter.get(r.mcq_id);
        if (!cId) continue;
        if (!completedByChapter.has(cId)) completedByChapter.set(cId, new Set());
        completedByChapter.get(cId)!.add(r.mcq_id);
        if (r.is_correct) {
          if (!correctByChapter.has(cId)) correctByChapter.set(cId, new Set());
          correctByChapter.get(cId)!.add(r.mcq_id);
        }
      }
    }
    return chapterIds.map((id) => {
      const total = totalsByChapter.get(id) ?? 0;
      const completed = completedByChapter.get(id)?.size ?? 0;
      const correct = correctByChapter.get(id)?.size ?? 0;
      const percent = total ? Math.round((completed / total) * 100) : 0;
      const accuracy = completed ? Math.round((correct / completed) * 100) : 0;
      return { chapter_id: id, total, completed, percent, correct, accuracy };
    });
  });

// ---- Chapters ----
const chaptersSchema = z.object({ subjectId: z.string().uuid() });

export const listChapters = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof chaptersSchema>) => chaptersSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("chapters")
      .select("id,name,slug,description,sort_order,subject_id")
      .eq("subject_id", data.subjectId)
      .eq("status", "published")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return rows ?? [];
  });

// ---- MCQs by chapter ----
const mcqsSchema = z.object({
  chapterId: z.string().uuid(),
  limit: z.number().int().min(1).max(2000).optional(),
});

export const listMcqs = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof mcqsSchema>) => mcqsSchema.parse(i))
  .handler(async ({ data, context }) => {
    const { data: rows, error } = await context.supabase
      .from("mcqs")
      .select(
        "id,question,option_a,option_b,option_c,option_d,correct_option,explanation,difficulty,tags",
      )
      .eq("chapter_id", data.chapterId)
      .eq("status", "published")
      .order("created_at", { ascending: true })
      .limit(data.limit ?? 2000);
    if (error) throw error;
    return rows ?? [];
  });

// ---- Quizzes ----
const listQuizzesSchema = z
  .object({
    level: z.string().trim().max(40).optional(),
    subjectId: z.string().uuid().nullable().optional(),
    chapterId: z.string().uuid().nullable().optional(),
    kind: z.enum(["quiz", "mock"]).default("quiz"),
  })
  .partial();

export const listQuizzes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof listQuizzesSchema> | undefined) =>
    listQuizzesSchema.parse(i ?? {}),
  )
  .handler(async ({ data, context }) => {
    const kind = data.kind ?? "quiz";
    let q = context.supabase
      .from("quizzes")
      .select(
        "id,title,description,difficulty,total_questions,duration_seconds,passing_marks,negative_marking,subject_id,chapter_id,level,kind,starts_at,ends_at,created_at,subjects(name),chapters(name)",
      )
      .eq("status", "published")
      .eq("kind", kind)
      .order("created_at", { ascending: false });
    if (data.level) q = q.eq("level", data.level);
    if (data.subjectId) q = q.eq("subject_id", data.subjectId);
    if (data.chapterId) q = q.eq("chapter_id", data.chapterId);
    const { data: rows, error } = await q;
    if (error) throw error;
    const quizIds = (rows ?? []).map((r) => r.id);
    if (!quizIds.length) return [];
    // Only surface quizzes that have at least one assigned question
    const { data: qq, error: qqErr } = await context.supabase
      .from("quiz_questions")
      .select("quiz_id")
      .in("quiz_id", quizIds);
    if (qqErr) throw qqErr;
    const counts = new Map<string, number>();
    for (const r of qq ?? []) {
      counts.set(r.quiz_id, (counts.get(r.quiz_id) ?? 0) + 1);
    }
    return (rows ?? [])
      .filter((r) => (counts.get(r.id) ?? 0) > 0)
      .map((r) => ({ ...r, mcq_count: counts.get(r.id) ?? 0 }));
  });

const quizSchema = z.object({ quizId: z.string().uuid() });

export const getQuiz = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof quizSchema>) => quizSchema.parse(i))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const [quizRes, qqRes] = await Promise.all([
      supabase
        .from("quizzes")
        .select(
          "id,title,description,difficulty,total_questions,duration_seconds,subject_id,chapter_id",
        )
        .eq("id", data.quizId)
        .single(),
      supabase
        .from("quiz_questions")
        .select(
          "position,mcq:mcqs(id,question,option_a,option_b,option_c,option_d,correct_option,explanation,difficulty)",
        )
        .eq("quiz_id", data.quizId)
        .order("position", { ascending: true }),
    ]);
    if (quizRes.error) throw quizRes.error;
    if (qqRes.error) throw qqRes.error;

    const questions = (qqRes.data ?? [])
      .map((r) => {
        const mcq = (r as { mcq: Record<string, unknown> | null }).mcq;
        return mcq ? { position: r.position, ...mcq } : null;
      })
      .filter(Boolean);
    return { quiz: quizRes.data, questions };
  });

// ---- Attempts ----
const submitSchema = z.object({
  quizId: z.string().uuid(),
  durationSeconds: z.number().int().min(0).max(60 * 60 * 4),
  answers: z
    .array(
      z.object({
        mcqId: z.string().uuid(),
        chosen: z.enum(["A", "B", "C", "D"]).nullable(),
        timeMs: z.number().int().min(0).max(60 * 60 * 1000),
      }),
    )
    .max(200),
});

export const submitAttempt = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof submitSchema>) => submitSchema.parse(i))
  .handler(async ({ data, context }) => {
    const supabase = context.supabase;
    const userId = context.userId;

    // Resolve correct answers + quiz meta server-side; never trust client.
    const ids = data.answers.map((a) => a.mcqId);
    let correctMap = new Map<string, string>();
    if (ids.length) {
      const { data: mcqs, error: me } = await supabase
        .from("mcqs")
        .select("id,correct_option")
        .in("id", ids);
      if (me) throw me;
      correctMap = new Map((mcqs ?? []).map((m) => [m.id, m.correct_option]));
    }

    // Load quiz so the attempt row is fully categorized (analytics + per-kind
    // performance need kind/subject/chapter/level/title).
    const { data: quizMeta } = await supabase
      .from("quizzes")
      .select("id,title,subject_id,chapter_id,level,kind")
      .eq("id", data.quizId)
      .maybeSingle();

    let correct = 0;
    let wrong = 0;
    const rows = data.answers.map((a) => {
      const isCorrect = a.chosen !== null && correctMap.get(a.mcqId) === a.chosen;
      if (isCorrect) correct++;
      else if (a.chosen !== null) wrong++;
      return {
        mcq_id: a.mcqId,
        chosen_option: a.chosen,
        is_correct: isCorrect,
        time_spent_ms: a.timeMs,
      };
    });

    const total = data.answers.length;
    const score = total === 0 ? 0 : Math.round((correct / total) * 100);
    const attemptKind = (quizMeta?.kind === "mock" ? "mock" : "quiz") as
      | "quiz"
      | "mock";

    // attempt_number per quiz for this user
    let attemptNumber = 1;
    {
      const { count } = await supabase
        .from("exam_attempts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("quiz_id", data.quizId)
        .eq("status", "completed");
      attemptNumber = (count ?? 0) + 1;
    }

    const { data: attempt, error: ae } = await supabase
      .from("exam_attempts")
      .insert({
        user_id: userId,
        quiz_id: data.quizId,
        kind: attemptKind,
        subject_id: quizMeta?.subject_id ?? null,
        chapter_id: quizMeta?.chapter_id ?? null,
        level: quizMeta?.level ?? null,
        title: quizMeta?.title ?? null,
        attempt_number: attemptNumber,
        status: "completed",
        completed_at: new Date().toISOString(),
        duration_seconds: data.durationSeconds,
        correct_count: correct,
        total_count: total,
        score,
      })
      .select("id")
      .single();
    if (ae) throw ae;

    if (rows.length) {
      const { error: ie } = await supabase
        .from("attempt_answers")
        .insert(rows.map((r) => ({ ...r, attempt_id: attempt.id })));
      if (ie) throw ie;
    }

    // Mirror outcomes into mcq_wrong_questions so Wrong Questions / Mastery
    // track quiz attempts too (not only MCQ Practice).
    try {
      const correctById = new Map(
        data.answers.map((a) => [a.mcqId, correctMap.get(a.mcqId) ?? null]),
      );
      const affected = data.answers.filter((a) => a.chosen !== null);
      if (affected.length) {
        const wrongIds = affected
          .filter((a) => correctById.get(a.mcqId) !== a.chosen)
          .map((a) => a.mcqId);
        const correctIds = affected
          .filter((a) => correctById.get(a.mcqId) === a.chosen)
          .map((a) => a.mcqId);
        const allIds = [...wrongIds, ...correctIds];
        const { data: existing } = await supabase
          .from("mcq_wrong_questions")
          .select("mcq_id,retry_count,mastered")
          .eq("user_id", userId)
          .in("mcq_id", allIds);
        const existMap = new Map(
          (existing ?? []).map((r: { mcq_id: string; retry_count: number; mastered: boolean }) => [r.mcq_id, r]),
        );
        const nowIso = new Date().toISOString();
        for (const a of affected) {
          const isWrong = correctById.get(a.mcqId) !== a.chosen;
          if (!isWrong) continue;
          const prev = existMap.get(a.mcqId);
          const nextRetry = prev ? (prev.retry_count ?? 0) + 1 : 0;
          await supabase.from("mcq_wrong_questions").upsert(
            {
              user_id: userId,
              mcq_id: a.mcqId,
              chapter_id: quizMeta?.chapter_id ?? null,
              subject_id: quizMeta?.subject_id ?? null,
              level: quizMeta?.level ?? null,
              last_chosen_option: a.chosen,
              correct_option: (correctById.get(a.mcqId) as "A" | "B" | "C" | "D" | null) ?? null,
              retry_count: nextRetry,
              mastered: false,
              last_wrong_at: nowIso,
            },
            { onConflict: "user_id,mcq_id" },
          );
        }
        const masterIds = correctIds.filter((id) => existMap.has(id) && !existMap.get(id)!.mastered);
        if (masterIds.length) {
          await supabase
            .from("mcq_wrong_questions")
            .update({ mastered: true })
            .eq("user_id", userId)
            .in("mcq_id", masterIds);
        }
      }
    } catch {
      /* non-fatal — analytics shouldn't block the attempt */
    }

    return { attemptId: attempt.id, correct, wrong, total, score };
  });

export const listMyAttempts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { data, error } = await context.supabase
      .from("exam_attempts")
      .select(
        "id,quiz_id,status,score,correct_count,total_count,duration_seconds,started_at,completed_at",
      )
      .eq("user_id", context.userId)
      .order("started_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    return data ?? [];
  });
