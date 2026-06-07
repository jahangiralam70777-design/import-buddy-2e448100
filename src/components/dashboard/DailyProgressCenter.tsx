import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Bookmark,
  CalendarDays,
  Flame,
  Layers,
  ListChecks,
  Loader2,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  Trophy,
  Sparkles,
  Award,
  Clock,
  XCircle,
  Filter,
  BookOpen,
} from "lucide-react";
import { studentDailyProgress } from "@/lib/student-daily-progress.functions";
import { useRealtimeActivity } from "@/hooks/use-realtime-invalidator";
import { CountUp } from "@/components/realtime/CountUp";
import { ContributionHeatmap, HeatmapSummary } from "@/components/dashboard/progress/ContributionHeatmap";
import { TrendCharts } from "@/components/dashboard/progress/TrendCharts";
import {
  downloadProgressPdf,
  downloadProgressExcel,
  downloadProgressCsv,
  type ReportPeriod,
} from "@/lib/progress-report";
import { Check, CheckCircle2, Download, FileSpreadsheet, FileText, Lightbulb, Percent } from "lucide-react";
import {
  HeroBanner, ScoreRow, GoalTracker, SubjectRanking, Achievements,
  FocusAnalytics, PerformanceComparison, QuickActions, StudyPlanPanel,
} from "@/components/dashboard/progress/PremiumWidgets";
import { CapturePreviewButton, DAILY_PROGRESS_CAPTURE_ID } from "@/components/dashboard/progress/CapturePreviewButton";


const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function timeAgo(iso?: string | null) {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

function fmtMinutes(min: number) {
  if (!min) return "0m";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m ? `${h}h ${m}m` : `${h}h`;
}

const KIND_TONE: Record<string, string> = {
  mcq_practice: "var(--neon-purple)",
  quiz: "var(--neon-blue)",
  mock: "var(--neon-pink)",
  custom_exam: "oklch(0.78 0.15 200)",
};

type TabKey = "daily" | "performance" | "weekly" | "monthly" | "subject" | "chapter";
type RangeKey = "7d" | "30d" | "90d";

const TABS: { key: TabKey; label: string }[] = [
  { key: "daily", label: "Daily" },
  { key: "performance", label: "Performance" },
  { key: "weekly", label: "Weekly" },
  { key: "monthly", label: "Monthly" },
  { key: "subject", label: "Subject" },
  { key: "chapter", label: "Chapter" },
];

export function DailyProgressCenter() {
  const fetchFn = useServerFn(studentDailyProgress);
  const qc = useQueryClient();
  const activity = useRealtimeActivity();

  const { data, isLoading } = useQuery({
    queryKey: ["student-daily-progress"],
    queryFn: () => fetchFn(),
    staleTime: 15_000,
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    qc.invalidateQueries({ queryKey: ["student-daily-progress"] });
  }, [activity, qc]);

  const [tab, setTab] = useState<TabKey>("daily");
  const [levelFilter, setLevelFilter] = useState<string>("all");
  const [subjectFilter, setSubjectFilter] = useState<string>("all");
  const [chapterFilter, setChapterFilter] = useState<string>("all");
  const [range, setRange] = useState<RangeKey>("30d");

  const today = data?.today;
  const week = data?.week;
  const month = data?.month;
  const heatmap = data?.heatmap ?? [];
  const timeline = data?.timeline ?? [];
  const insights = data?.insights;
  const wrong = data?.wrongQuestions;
  const bookmarks = data?.bookmarks;
  const totals = data?.totals;
  const series = useMemo(() => data?.series ?? [], [data]);
  const yearHeatmap = useMemo(() => data?.yearHeatmap ?? [], [data]);

  const allSubjects = useMemo(() => data?.subjects ?? [], [data]);
  const allChapters = useMemo(() => data?.chapters ?? [], [data]);
  const levels = data?.levels ?? [];

  const filteredSubjects = useMemo(() => {
    return allSubjects.filter((s) => {
      if (levelFilter !== "all" && s.level !== levelFilter) return false;
      if (subjectFilter !== "all" && s.id !== subjectFilter) return false;
      return true;
    });
  }, [allSubjects, levelFilter, subjectFilter]);

  const filteredChapters = useMemo(() => {
    return allChapters.filter((c) => {
      if (subjectFilter !== "all" && c.subjectId !== subjectFilter) return false;
      if (chapterFilter !== "all" && c.id !== chapterFilter) return false;
      if (levelFilter !== "all") {
        const subj = allSubjects.find((s) => s.id === c.subjectId);
        if (subj?.level !== levelFilter) return false;
      }
      return true;
    });
  }, [allChapters, allSubjects, subjectFilter, chapterFilter, levelFilter]);

  const filteredTimeline = useMemo(() => {
    const rangeMs = range === "7d" ? 7 : range === "30d" ? 30 : 90;
    const cutoff = Date.now() - rangeMs * 86400000;
    return timeline.filter((a) => {
      if (new Date(a.at).getTime() < cutoff) return false;
      if (subjectFilter !== "all" && a.subjectId !== subjectFilter) return false;
      if (chapterFilter !== "all" && a.chapterId !== chapterFilter) return false;
      return true;
    });
  }, [timeline, range, subjectFilter, chapterFilter]);

  const filteredHeatmap = useMemo(() => {
    const days = range === "7d" ? 7 : range === "30d" ? 30 : 30; // keep <=30 visual
    return heatmap.slice(-days);
  }, [heatmap, range]);

  const heatMax = useMemo(
    () => Math.max(1, ...filteredHeatmap.map((d) => d.count)),
    [filteredHeatmap],
  );
  const activeDaysMonth = month?.activeDays ?? 0;
  const consistencyPct = Math.min(100, Math.round((activeDaysMonth / 30) * 100));

  if (isLoading && !data) {
    return (
      <section className="glass shadow-card-soft flex items-center justify-center gap-2 rounded-3xl p-10 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading Daily Progress Center…
      </section>
    );
  }

  const yMcqs = (today as any)?.yesterday?.mcqs;
  const yQuizzes = (today as any)?.yesterday?.quizzes;
  const yMocks = (today as any)?.yesterday?.mocks;
  const yExams = (today as any)?.yesterday?.customExams;
  const yMinutes = (today as any)?.yesterday?.studyMinutes;
  const yAccuracy = (today as any)?.yesterday?.accuracy;
  const pctDelta = (curr: number, prev?: number): number | undefined => {
    if (prev === undefined || prev === null) return undefined;
    if (prev === 0) return curr > 0 ? 100 : 0;
    return Math.round(((curr - prev) / prev) * 1000) / 10;
  };
  const dailyTiles: {
    icon: typeof ListChecks; label: string; value: number; suffix?: string; display?: string;
    gradient: string; ring: string; to?: string; delta?: number;
  }[] = [
    { icon: ListChecks, label: "MCQs Today", value: today?.mcqs ?? 0,
      gradient: "linear-gradient(135deg, oklch(0.72 0.19 295) 0%, oklch(0.66 0.22 285) 100%)",
      ring: "oklch(0.72 0.19 295)", to: "/mcq-practice", delta: pctDelta(today?.mcqs ?? 0, yMcqs) },
    { icon: Timer, label: "Quizzes Today", value: today?.quizzes ?? 0,
      gradient: "linear-gradient(135deg, oklch(0.74 0.17 235) 0%, oklch(0.66 0.2 255) 100%)",
      ring: "oklch(0.72 0.17 240)", to: "/quiz", delta: pctDelta(today?.quizzes ?? 0, yQuizzes) },
    { icon: Trophy, label: "Mocks Today", value: today?.mocks ?? 0,
      gradient: "linear-gradient(135deg, oklch(0.72 0.2 15) 0%, oklch(0.66 0.22 350) 100%)",
      ring: "oklch(0.7 0.2 10)", to: "/mock-test", delta: pctDelta(today?.mocks ?? 0, yMocks) },
    { icon: Sparkles, label: "Exams Today", value: today?.customExams ?? 0,
      gradient: "linear-gradient(135deg, oklch(0.78 0.16 75) 0%, oklch(0.7 0.2 45) 100%)",
      ring: "oklch(0.75 0.18 60)", to: "/custom-exam", delta: pctDelta(today?.customExams ?? 0, yExams) },
    { icon: Clock, label: "Study Minutes", value: today?.studyMinutes ?? 0,
      display: fmtMinutes(today?.studyMinutes ?? 0),
      gradient: "linear-gradient(135deg, oklch(0.76 0.17 165) 0%, oklch(0.68 0.18 195) 100%)",
      ring: "oklch(0.72 0.17 180)", delta: pctDelta(today?.studyMinutes ?? 0, yMinutes) },
    { icon: Target, label: "Accuracy Today", value: today?.accuracy ?? 0, suffix: "%",
      gradient: "linear-gradient(135deg, oklch(0.74 0.18 200) 0%, oklch(0.66 0.2 270) 100%)",
      ring: "oklch(0.72 0.18 230)", delta: pctDelta(today?.accuracy ?? 0, yAccuracy) },
  ];

  const weeklyBars = week?.bars ?? [0, 0, 0, 0, 0, 0, 0];

  return (
    <section id={DAILY_PROGRESS_CAPTURE_ID} className="relative space-y-6 rounded-[2rem] border border-border/40 bg-gradient-to-br from-background/40 via-background/20 to-background/40 p-5 sm:p-7">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--neon-purple)] to-[var(--neon-blue)] text-white shadow-glow">
              <Sparkles className="h-3.5 w-3.5" />
            </span>
            <h2 className="font-display text-2xl font-bold tracking-tight sm:text-3xl">
              Daily Progress <span className="text-gradient">Center</span>
            </h2>
          </div>
          <p className="mt-1 text-xs text-muted-foreground">
            A dedicated workspace for your learning analytics — updates in realtime as you study.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => qc.invalidateQueries({ queryKey: ["student-daily-progress"] })}
            className="glass inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
            title="Refresh now"
          >
            <Activity className="h-3.5 w-3.5" /> Refresh
          </button>
          <CapturePreviewButton />
          {data && (
            <ReportMenu
              onPdf={(p) => downloadProgressPdf(p, data)}
              onExcel={(p) => downloadProgressExcel(p, data)}
              onCsv={(p) => downloadProgressCsv(p, data)}
            />
          )}
          <div className="glass flex items-center gap-2 rounded-xl px-3 py-1.5 text-[11px]">
            <Flame className="h-3.5 w-3.5 text-amber-400" />
            <span className="font-display font-bold">
              <CountUp value={today?.streak ?? 0} /> day streak
            </span>
          </div>
        </div>
      </div>

      {/* Hero banner */}
      <HeroBanner today={today} week={week} />

      {/* Score row: Consistency / Productivity / Momentum */}
      <ScoreRow today={today} week={week} month={month} totals={totals} />

      {/* Goal tracker */}
      <GoalTracker today={today} week={week} month={month} />

      {/* Quick actions */}
      <QuickActions wrongCount={wrong?.unresolved ?? 0} />


      {/* Real-time overview metrics */}
      {totals && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
          <MetricTile icon={ListChecks} label="MCQs today" value={today?.mcqs ?? 0} tone="var(--neon-purple)" />
          <MetricTile icon={CalendarDays} label="MCQs this week" value={week?.mcqs ?? 0} tone="var(--neon-blue)" />
          <MetricTile icon={CalendarDays} label="MCQs this month" value={month?.mcqs ?? 0} tone="var(--neon-pink)" />
          <MetricTile icon={CheckCircle2} label="Correct answers" value={totals.correct} tone="oklch(0.75 0.18 150)" />
          <MetricTile icon={XCircle} label="Wrong answers" value={totals.wrong} tone="oklch(0.7 0.2 25)" />
          <MetricTile icon={Percent} label="Accuracy rate" value={totals.accuracy} suffix="%" tone="var(--neon-purple)" />
          <MetricTile icon={Clock} label="Study time" value={totals.studyMinutes} suffix="m" tone="oklch(0.78 0.15 200)" />
          <MetricTile icon={Award} label="Average score" value={totals.avgScore} suffix="%" tone="oklch(0.78 0.18 175)" />
          <MetricTile icon={Layers} label="Chapters completed" value={totals.chaptersCompleted} tone="oklch(0.7 0.2 260)" />
          <MetricTile icon={BookOpen} label="Subjects covered" value={totals.subjectsCovered} tone="var(--neon-blue)" />
          <MetricTile icon={Trophy} label="Mock tests" value={totals.mocks} tone="var(--neon-pink)" />
          <MetricTile icon={Timer} label="Quizzes" value={totals.quizzes} tone="var(--neon-purple)" />
        </div>
      )}

      {/* Tabs + Filters */}
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="glass inline-flex flex-wrap gap-1 rounded-2xl p-1">
          {TABS.map((t) => {
            const active = tab === t.key;
            return (
              <button
                key={t.key}
                type="button"
                onClick={() => setTab(t.key)}
                className={`rounded-xl px-3.5 py-1.5 text-xs font-semibold transition-all ${
                  active
                    ? "bg-gradient-to-r from-[var(--neon-purple)] to-[var(--neon-blue)] text-white shadow-glow"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {t.label}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Filter className="h-3.5 w-3.5 text-muted-foreground" />
          <FilterSelect
            value={levelFilter}
            onChange={setLevelFilter}
            options={[{ value: "all", label: "All Levels" }, ...levels.map((l) => ({ value: l, label: l }))]}
          />
          <FilterSelect
            value={subjectFilter}
            onChange={(v) => { setSubjectFilter(v); setChapterFilter("all"); }}
            options={[
              { value: "all", label: "All Subjects" },
              ...allSubjects
                .filter((s) => levelFilter === "all" || s.level === levelFilter)
                .map((s) => ({ value: s.id, label: s.name })),
            ]}
          />
          <FilterSelect
            value={chapterFilter}
            onChange={setChapterFilter}
            options={[
              { value: "all", label: "All Chapters" },
              ...allChapters
                .filter((c) => subjectFilter === "all" || c.subjectId === subjectFilter)
                .slice(0, 80)
                .map((c) => ({ value: c.id, label: c.name })),
            ]}
          />
          <FilterSelect
            value={range}
            onChange={(v) => setRange(v as RangeKey)}
            options={[
              { value: "7d", label: "Last 7 days" },
              { value: "30d", label: "Last 30 days" },
              { value: "90d", label: "Last 90 days" },
            ]}
          />
        </div>
      </div>

      {/* Tab content */}
      {tab === "daily" && (
        <>
          {/* Today tiles — premium gradient cards (reference style) */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {dailyTiles.map((t) => {
              const up = (t.delta ?? 0) >= 0;
              const inner = (
                <>
                  <div
                    className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-50 blur-2xl transition-opacity duration-500 group-hover:opacity-80"
                    style={{ background: t.ring }}
                  />
                  <div
                    className="pointer-events-none absolute inset-x-0 -top-px h-px"
                    style={{ background: `linear-gradient(90deg, transparent, ${t.ring}, transparent)` }}
                  />
                  <div className="relative flex items-start justify-between">
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-2xl text-white shadow-[0_8px_24px_-8px_currentColor] ring-1 ring-white/20"
                      style={{ background: t.gradient, color: t.ring }}
                    >
                      <t.icon className="h-4.5 w-4.5 text-white" />
                    </div>
                    {t.delta !== undefined && (
                      <span
                        className={`inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold backdrop-blur ${
                          up ? "bg-emerald-400/15 text-emerald-400" : "bg-rose-400/15 text-rose-400"
                        }`}
                      >
                        {up ? <TrendingUp className="h-2.5 w-2.5" /> : <TrendingDown className="h-2.5 w-2.5" />}
                        {up ? "+" : ""}{t.delta}%
                      </span>
                    )}
                  </div>
                  <p className="relative mt-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                    {t.label}
                  </p>
                  <p className="font-display relative mt-1 text-3xl font-bold tracking-tight">
                    {t.display ?? (
                      <>
                        <CountUp value={t.value} />
                        {t.suffix ?? ""}
                      </>
                    )}
                  </p>
                  {t.delta !== undefined && (
                    <p className="relative mt-0.5 text-[10px] text-muted-foreground">vs yesterday</p>
                  )}
                </>
              );
              const cls = "glass shadow-card-soft group relative block overflow-hidden rounded-2xl border border-white/10 p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_20px_40px_-20px_var(--neon-purple)]";
              return t.to ? (
                <Link key={t.label} to={t.to} className={cls}>
                  {inner}
                </Link>
              ) : (
                <div key={t.label} className={cls}>{inner}</div>
              );
            })}
          </div>


          {/* Heatmap + Insights */}
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
            <div className="glass shadow-card-soft rounded-3xl p-5 lg:col-span-2">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-display text-lg font-bold flex items-center gap-2">
                    <CalendarDays className="h-4 w-4 text-[var(--neon-blue)]" /> Activity Heatmap
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {activeDaysMonth} active days · {consistencyPct}% consistency
                  </p>
                </div>
                <div className="hidden items-center gap-2 text-[10px] uppercase tracking-widest text-muted-foreground sm:inline-flex">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400 shadow-[0_0_8px] shadow-emerald-400" />
                  Live
                </div>
              </div>
              <div className="mt-5">
                {yearHeatmap.length ? (
                  <ContributionHeatmap days={yearHeatmap} />
                ) : (
                  <div className="grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1.5 sm:grid-cols-[repeat(30,minmax(0,1fr))]">
                    {filteredHeatmap.map((d) => {
                      const intensity = d.count / heatMax;
                      const bg = d.count === 0
                        ? "color-mix(in oklab, var(--muted) 70%, transparent)"
                        : `color-mix(in oklab, var(--neon-purple) ${Math.round(20 + intensity * 70)}%, transparent)`;
                      return (
                        <div
                          key={d.date}
                          title={`${d.date} · ${d.count} sessions · ${fmtMinutes(d.minutes)}`}
                          className="aspect-square rounded-md transition-transform hover:scale-110"
                          style={{ background: bg }}
                        />
                      );
                    })}
                  </div>
                )}
                {yearHeatmap.length > 0 && (
                  <div className="mt-4">
                    <HeatmapSummary days={yearHeatmap} />
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-3">
              <InsightCard
                tone="emerald"
                icon={Award}
                label="Strongest"
                title={insights?.strongest?.name ?? "Not enough data"}
                detail={
                  insights?.strongest
                    ? `${insights.strongest.avgScore}% avg · ${insights.strongest.attempts} sessions`
                    : "Complete sessions to unlock insights"
                }
              />
              <InsightCard
                tone="rose"
                icon={AlertTriangle}
                label="Needs work"
                title={insights?.weakest?.name ?? "Not enough data"}
                detail={
                  insights?.weakest
                    ? `${insights.weakest.avgScore}% avg · ${insights.weakest.weakChapters} weak chapters`
                    : "Keep practicing to find weak areas"
                }
              />
              <InsightCard
                tone="amber"
                icon={Clock}
                label="Inactive"
                title={insights?.inactive?.[0]?.name ?? "All subjects active"}
                detail={
                  insights?.inactive?.length
                    ? `${insights.inactive.length} subject${insights.inactive.length > 1 ? "s" : ""} untouched 7d+`
                    : "You've touched every subject lately"
                }
              />
            </div>
          </div>

          {/* Timeline */}
          <div className="glass shadow-card-soft rounded-3xl p-5">
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-bold flex items-center gap-2">
                <Activity className="h-4 w-4 text-[var(--neon-purple)]" /> Activity Timeline
              </h3>
              <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Live feed</span>
            </div>
            <ul className="mt-4 grid grid-cols-1 gap-2 md:grid-cols-2">
              {filteredTimeline.length ? filteredTimeline.map((a) => {
                const tone = KIND_TONE[a.kind] ?? "var(--neon-purple)";
                const passed = a.score >= 60;
                return (
                  <li
                    key={a.id}
                    className="flex items-center gap-3 rounded-2xl bg-background/40 p-3 transition-colors hover:bg-background/60"
                  >
                    <div
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-white shadow-glow"
                      style={{ background: `linear-gradient(135deg, ${tone}, oklch(0.55 0.2 270))` }}
                    >
                      <Sparkles className="h-4 w-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <span className="text-[10px] uppercase tracking-widest text-muted-foreground">
                        {a.kindLabel}
                      </span>
                      <p className="font-display text-sm font-bold line-clamp-1">{a.title}</p>
                      <p className="text-[10px] text-muted-foreground">
                        {a.subjectName ? `${a.subjectName} · ` : ""}
                        {a.correct}/{a.total} correct · {timeAgo(a.at)}
                      </p>
                    </div>
                    <span
                      className={`font-display text-base font-bold ${passed ? "text-emerald-400" : "text-rose-400"}`}
                    >
                      {a.score}%
                    </span>
                  </li>
                );
              }) : (
                <li className="rounded-2xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground md:col-span-2">
                  No activity in this range — adjust filters or complete a session.
                </li>
              )}
            </ul>
          </div>
        </>
      )}

      {tab === "performance" && (
        <>
          {/* Goals & streaks */}
          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <GoalCard label="Daily goal" current={today?.mcqs ?? 0} target={20} unit="MCQs" tone="var(--neon-purple)" />
            <GoalCard label="Weekly goal" current={week?.mcqs ?? 0} target={100} unit="MCQs" tone="var(--neon-blue)" />
            <GoalCard label="Monthly goal" current={month?.mcqs ?? 0} target={400} unit="MCQs" tone="var(--neon-pink)" />
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StreakStat icon={Flame} label="Current streak" value={today?.streak ?? 0} suffix=" days" />
            <StreakStat icon={Trophy} label="Best streak" value={today?.bestStreak ?? 0} suffix=" days" />
            <StreakStat icon={CheckCircle2} label="Active days (30d)" value={month?.activeDays ?? 0} suffix=" / 30" />
            <StreakStat icon={Check} label="Sessions (30d)" value={month?.attempts ?? 0} />
          </div>

          {/* Smart insights engine */}
          <div className="glass shadow-card-soft rounded-3xl p-5">
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <Lightbulb className="h-4 w-4 text-amber-400" /> Smart Insights
            </h3>
            <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
              {buildInsights(insights, week, today).map((t, i) => (
                <div key={i} className="flex items-start gap-2 rounded-2xl bg-background/40 p-3 text-xs">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--neon-purple)]" />
                  <span>{t}</span>
                </div>
              ))}
            </div>
          </div>

          <TrendCharts series={series} subjects={allSubjects} days={range === "7d" ? 7 : range === "30d" ? 30 : 90} />
        </>
      )}

      {tab === "weekly" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="glass shadow-card-soft rounded-3xl p-5 lg:col-span-2">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold">Weekly Accuracy</h3>
                <p className="text-xs text-muted-foreground">Avg accuracy per day · last 7 days</p>
              </div>
              <div className="glass rounded-xl px-3 py-1.5 text-xs">Week view</div>
            </div>
            <div className="mt-6 flex h-56 items-end gap-3">
              {weeklyBars.map((h, i) => (
                <div key={i} className="flex flex-1 flex-col items-center gap-2">
                  <div className="relative flex h-full w-full items-end">
                    <div
                      className="w-full rounded-t-xl bg-gradient-to-t from-[var(--neon-purple)] to-[var(--neon-blue)] transition-all duration-700 hover:opacity-90"
                      style={{ height: `${Math.max(4, h)}%`, boxShadow: "0 -8px 30px -8px var(--neon-purple)" }}
                    />
                  </div>
                  <span className="text-[10px] text-muted-foreground">{DAY_LABELS[i]}</span>
                  <span className="text-[10px] font-bold">{h}%</span>
                </div>
              ))}
            </div>
          </div>
          <div className="glass shadow-card-soft space-y-3 rounded-3xl p-5">
            <h3 className="font-display text-lg font-bold">Week Summary</h3>
            <div className="rounded-2xl bg-background/40 p-3">
              <div className="flex items-end justify-between">
                <p className="font-display text-xl font-bold"><CountUp value={week?.attempts ?? 0} /> sessions</p>
                <span
                  className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                    (week?.deltaAttempts ?? 0) >= 0 ? "bg-emerald-400/15 text-emerald-400" : "bg-rose-400/15 text-rose-400"
                  }`}
                >
                  {(week?.deltaAttempts ?? 0) >= 0 ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                  {(week?.deltaAttempts ?? 0) >= 0 ? "+" : ""}{week?.deltaAttempts ?? 0}
                </span>
              </div>
              <div className="mt-3 grid grid-cols-3 gap-2 text-center text-[10px] text-muted-foreground">
                <div><p className="font-display text-sm font-bold text-foreground">{week?.mcqs ?? 0}</p>MCQs</div>
                <div><p className="font-display text-sm font-bold text-foreground">{fmtMinutes(week?.studyMinutes ?? 0)}</p>Studied</div>
                <div><p className="font-display text-sm font-bold text-foreground">{week?.accuracy ?? 0}%</p>Accuracy</div>
              </div>
              <div className="mt-3 flex items-center gap-1 text-[10px] text-muted-foreground">
                <span>vs last week:</span>
                <b className={`${(week?.deltaAccuracy ?? 0) >= 0 ? "text-emerald-400" : "text-rose-400"}`}>
                  {(week?.deltaAccuracy ?? 0) >= 0 ? "+" : ""}{week?.deltaAccuracy ?? 0}%
                </b>
              </div>
            </div>
            <WrongBookmarkMini wrong={wrong} bookmarks={bookmarks} />
          </div>
        </div>
      )}

      {tab === "monthly" && (
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
          <div className="glass shadow-card-soft rounded-3xl p-5">
            <h3 className="font-display text-lg font-bold">Monthly Goal</h3>
            <p className="text-xs text-muted-foreground">Consistency over last 30 days</p>
            <div className="mt-4 flex flex-col items-center justify-center">
              <div className="relative h-40 w-40">
                <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                  <defs>
                    <linearGradient id="mgrad" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="oklch(0.7 0.25 295)" />
                      <stop offset="100%" stopColor="oklch(0.72 0.2 235)" />
                    </linearGradient>
                  </defs>
                  <circle cx="60" cy="60" r="54" stroke="currentColor" strokeWidth="10" fill="none" className="text-muted/40" />
                  <circle
                    cx="60" cy="60" r="54"
                    stroke="url(#mgrad)"
                    strokeWidth="10"
                    fill="none"
                    strokeLinecap="round"
                    strokeDasharray="339"
                    strokeDashoffset={339 - (339 * consistencyPct) / 100}
                    style={{ transition: "stroke-dashoffset 800ms ease" }}
                  />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                  <p className="font-display text-3xl font-bold"><CountUp value={consistencyPct} />%</p>
                  <p className="text-[10px] text-muted-foreground">consistency</p>
                </div>
              </div>
              <div className="mt-4 grid w-full grid-cols-3 gap-2 text-center">
                <div><p className="font-display text-sm font-bold"><CountUp value={month?.attempts ?? 0} /></p><p className="text-[10px] text-muted-foreground">Attempts</p></div>
                <div><p className="font-display text-sm font-bold">{month?.accuracy ?? 0}%</p><p className="text-[10px] text-muted-foreground">Accuracy</p></div>
                <div><p className="font-display text-sm font-bold">{fmtMinutes(month?.studyMinutes ?? 0)}</p><p className="text-[10px] text-muted-foreground">Studied</p></div>
              </div>
            </div>
          </div>
          <div className="glass shadow-card-soft rounded-3xl p-5 lg:col-span-2">
            <h3 className="font-display text-lg font-bold">30-Day Heatmap</h3>
            <p className="text-xs text-muted-foreground">{activeDaysMonth} of 30 days active</p>
            <div className="mt-5 grid grid-cols-[repeat(15,minmax(0,1fr))] gap-1.5 sm:grid-cols-[repeat(30,minmax(0,1fr))]">
              {heatmap.map((d) => {
                const intensity = d.count / Math.max(1, ...heatmap.map((x) => x.count));
                const bg = d.count === 0
                  ? "color-mix(in oklab, var(--muted) 70%, transparent)"
                  : `color-mix(in oklab, var(--neon-blue) ${Math.round(20 + intensity * 70)}%, transparent)`;
                return (
                  <div
                    key={d.date}
                    title={`${d.date} · ${d.count} sessions · ${fmtMinutes(d.minutes)}`}
                    className="aspect-square rounded-md transition-transform hover:scale-110"
                    style={{ background: bg }}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}

      {tab === "subject" && (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filteredSubjects.length ? filteredSubjects.map((s) => {
            const tone = s.color ?? "var(--neon-purple)";
            return (
              <div key={s.id} className="glass shadow-card-soft relative overflow-hidden rounded-3xl p-5">
                <div className="pointer-events-none absolute -right-10 -top-10 h-28 w-28 rounded-full opacity-30 blur-2xl" style={{ background: tone }} />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-glow" style={{ background: `linear-gradient(135deg, ${tone}, oklch(0.55 0.2 270))` }}>
                      <BookOpen className="h-4 w-4" />
                    </span>
                    <div>
                      <p className="font-display text-sm font-bold line-clamp-1">{s.name}</p>
                      <p className="text-[10px] uppercase tracking-widest text-muted-foreground">{s.level}</p>
                    </div>
                  </div>
                  <span className="font-display text-lg font-bold text-gradient">{s.completionPct}%</span>
                </div>
                <div className="mt-3 h-2 overflow-hidden rounded-full bg-muted">
                  <div className="h-full rounded-full transition-all duration-700" style={{ width: `${s.completionPct}%`, background: `linear-gradient(90deg, ${tone}, oklch(0.7 0.2 260))`, boxShadow: `0 0 12px ${tone}` }} />
                </div>
                <div className="mt-4 grid grid-cols-2 gap-2 text-[11px]">
                  <SubjMini label="Chapters" value={`${s.completedChapters}/${s.totalChapters}`} />
                  <SubjMini label="Avg score" value={`${s.avgScore}%`} />
                  <SubjMini label="Weak chapters" value={s.weakChapters} tone="rose" />
                  <SubjMini label="Pending MCQs" value={s.pendingMcqs} />
                </div>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <p className="text-[10px] text-muted-foreground">Last activity: {timeAgo(s.lastAt)}</p>
                  <div className="flex items-center gap-1.5">
                    <Link to="/mcq-practice" className="glass rounded-lg px-2 py-1 text-[10px] font-semibold hover:text-foreground text-muted-foreground">Practice</Link>
                    <Link to="/quiz" className="glass rounded-lg px-2 py-1 text-[10px] font-semibold hover:text-foreground text-muted-foreground">Quiz</Link>
                  </div>
                </div>
              </div>
            );
          }) : (
            <div className="glass rounded-3xl p-10 text-center text-xs text-muted-foreground md:col-span-2 xl:col-span-3">
              No subjects match the current filters.
            </div>
          )}
        </div>
      )}

      {tab === "chapter" && (
        <div className="glass shadow-card-soft rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Chapter Tracking</h3>
            <p className="text-xs text-muted-foreground">{filteredChapters.length} chapters</p>
          </div>
          <div className="mt-4 max-h-[640px] space-y-2 overflow-y-auto pr-1">
            {filteredChapters.length ? filteredChapters.map((c) => {
              const tone = c.subjectColor ?? "var(--neon-purple)";
              return (
                <div key={c.id} className="rounded-2xl bg-background/40 p-3 transition-colors hover:bg-background/60">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-display text-sm font-bold line-clamp-1">{c.name}</p>
                      <p className="text-[10px] text-muted-foreground">{c.subjectName ?? "—"} · last {timeAgo(c.lastAt)}</p>
                    </div>
                    <span className="font-display text-sm font-bold text-gradient shrink-0">{c.completionPct}%</span>
                  </div>
                  <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full transition-all duration-700" style={{ width: `${c.completionPct}%`, background: `linear-gradient(90deg, ${tone}, oklch(0.7 0.2 260))` }} />
                  </div>
                  <div className="mt-3 grid grid-cols-3 gap-2 text-[10px] sm:grid-cols-6">
                    <ChapMini label="MCQs" value={`${c.mcqsSolved}/${c.totalMcqs}`} />
                    <ChapMini label="Accuracy" value={`${c.accuracy}%`} />
                    <ChapMini label="Quiz" value={c.quizCompleted} />
                    <ChapMini label="Mock" value={c.mockCompleted} />
                    <ChapMini label="Bookmarks" value={c.bookmarks} />
                    <ChapMini label="Wrong" value={c.wrong} tone="rose" />
                  </div>
                  <p className="mt-2 text-[10px] text-muted-foreground">Study time: {fmtMinutes(c.studyMinutes)}</p>
                </div>
              );
            }) : (
              <div className="rounded-2xl border border-dashed border-border p-8 text-center text-xs text-muted-foreground">
                No chapters match the current filters.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Always-on footer: wrong + bookmarks */}
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <div className="glass shadow-card-soft rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <XCircle className="h-4 w-4 text-rose-400" /> Wrong Question Analytics
            </h3>
            <Link to="/wrong-questions" className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground">
              Open <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-4 grid grid-cols-3 gap-2 text-center">
            <Stat label="Unresolved" value={wrong?.unresolved ?? 0} tone="rose" />
            <Stat label="Mastered" value={wrong?.resolved ?? 0} tone="emerald" />
            <Stat label="Retries" value={wrong?.retries ?? 0} tone="blue" />
          </div>
          <p className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground">Weak by subject</p>
          <div className="mt-2 space-y-2">
            {(wrong?.topSubjects ?? []).length ? wrong!.topSubjects.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl bg-background/40 px-3 py-2 text-xs">
                <span className="line-clamp-1">{s.name}</span>
                <span className="font-display font-bold text-rose-400">{s.count}</span>
              </div>
            )) : (<p className="text-xs text-muted-foreground">No unresolved wrong answers — great work!</p>)}
          </div>
        </div>

        <div className="glass shadow-card-soft rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold flex items-center gap-2">
              <Bookmark className="h-4 w-4 text-[var(--neon-blue)]" /> Bookmarks Analytics
            </h3>
            <Link to="/bookmarks" className="inline-flex items-center gap-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground">
              Open <ArrowRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="mt-4 flex items-end justify-between">
            <div>
              <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Saved</p>
              <p className="font-display text-3xl font-bold"><CountUp value={bookmarks?.total ?? 0} /></p>
            </div>
            <span className="inline-flex items-center gap-1 rounded-full bg-[var(--neon-blue)]/15 px-2 py-1 text-[10px] font-bold text-[var(--neon-blue)]">
              <Bookmark className="h-3 w-3" /> for review
            </span>
          </div>
          <p className="mt-4 text-[10px] uppercase tracking-widest text-muted-foreground">By subject</p>
          <div className="mt-2 space-y-2">
            {(bookmarks?.topSubjects ?? []).length ? bookmarks!.topSubjects.map((s) => (
              <div key={s.id} className="flex items-center justify-between rounded-xl bg-background/40 px-3 py-2 text-xs">
                <span className="line-clamp-1">{s.name}</span>
                <span className="font-display font-bold text-[var(--neon-blue)]">{s.count}</span>
              </div>
            )) : (<p className="text-xs text-muted-foreground">No bookmarks yet — tap the bookmark icon on any MCQ.</p>)}
          </div>
        </div>
      </div>

      {/* Premium analytics row */}
      <SubjectRanking subjects={allSubjects} />
      <div className="grid grid-cols-1 gap-5 lg:grid-cols-2">
        <FocusAnalytics timeline={timeline} month={month} productiveDay={insights?.productiveDay} />
        <Achievements today={today} totals={totals} month={month} />
      </div>
      <PerformanceComparison series={series} />

      {/* Study Plan */}
      <StudyPlanPanel />
    </section>

  );
}

function FilterSelect({
  value, onChange, options,
}: { value: string; onChange: (v: string) => void; options: { value: string; label: string }[] }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="glass rounded-xl border border-border/40 bg-background/40 px-3 py-1.5 text-xs font-medium text-foreground outline-none transition-colors hover:bg-background/60 focus:border-[var(--neon-purple)]"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  );
}

function InsightCard({
  tone, icon: Icon, label, title, detail,
}: { tone: "emerald" | "rose" | "amber"; icon: typeof Award; label: string; title: string; detail: string }) {
  const palette =
    tone === "emerald" ? { ring: "border-emerald-400/30", bg: "bg-emerald-400/5", fg: "text-emerald-400" }
      : tone === "rose" ? { ring: "border-rose-400/30", bg: "bg-rose-400/5", fg: "text-rose-400" }
        : { ring: "border-amber-400/30", bg: "bg-amber-400/5", fg: "text-amber-400" };
  return (
    <div className={`glass shadow-card-soft rounded-2xl border ${palette.ring} ${palette.bg} p-4`}>
      <div className={`flex items-center gap-2 text-[10px] uppercase tracking-widest ${palette.fg}`}>
        <Icon className="h-3.5 w-3.5" /> {label}
      </div>
      <p className="font-display mt-1.5 text-base font-bold line-clamp-1">{title}</p>
      <p className="mt-1 text-[11px] text-muted-foreground line-clamp-2">{detail}</p>
    </div>
  );
}

function Stat({ label, value, tone }: { label: string; value: number; tone: "rose" | "emerald" | "blue" }) {
  const color = tone === "rose" ? "text-rose-400" : tone === "emerald" ? "text-emerald-400" : "text-[var(--neon-blue)]";
  return (
    <div className="rounded-xl bg-background/40 p-2">
      <p className={`font-display text-lg font-bold ${color}`}><CountUp value={value} /></p>
      <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
    </div>
  );
}

function SubjMini({ label, value, tone }: { label: string; value: string | number; tone?: "rose" }) {
  return (
    <div className="rounded-xl bg-background/40 p-2">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-display text-sm font-bold ${tone === "rose" ? "text-rose-400" : ""}`}>{value}</p>
    </div>
  );
}

function ChapMini({ label, value, tone }: { label: string; value: string | number; tone?: "rose" }) {
  return (
    <div className="rounded-lg bg-background/60 px-2 py-1.5">
      <p className="text-[9px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className={`font-display text-xs font-bold ${tone === "rose" ? "text-rose-400" : ""}`}>{value}</p>
    </div>
  );
}

function WrongBookmarkMini({ wrong, bookmarks }: { wrong?: { unresolved: number; resolved: number }; bookmarks?: { total: number } }) {
  return (
    <div className="grid grid-cols-3 gap-2 rounded-2xl bg-background/40 p-3 text-center">
      <div><p className="font-display text-base font-bold text-rose-400">{wrong?.unresolved ?? 0}</p><p className="text-[10px] text-muted-foreground">Wrong</p></div>
      <div><p className="font-display text-base font-bold text-emerald-400">{wrong?.resolved ?? 0}</p><p className="text-[10px] text-muted-foreground">Mastered</p></div>
      <div><p className="font-display text-base font-bold text-[var(--neon-blue)]">{bookmarks?.total ?? 0}</p><p className="text-[10px] text-muted-foreground">Saved</p></div>
    </div>
  );
}

function MetricTile({
  icon: Icon, label, value, suffix, tone,
}: { icon: typeof ListChecks; label: string; value: number; suffix?: string; tone: string }) {
  return (
    <div className="glass shadow-card-soft group relative overflow-hidden rounded-2xl p-4 transition-transform hover:-translate-y-0.5">
      <div className="pointer-events-none absolute -right-8 -top-8 h-20 w-20 rounded-full opacity-25 blur-2xl transition-opacity group-hover:opacity-50" style={{ background: tone }} />
      <div className="flex h-9 w-9 items-center justify-center rounded-xl text-white shadow-glow" style={{ background: `linear-gradient(135deg, ${tone}, oklch(0.55 0.2 270))` }}>
        <Icon className="h-4 w-4" />
      </div>
      <p className="mt-3 text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
      <p className="font-display mt-1 text-2xl font-bold"><CountUp value={value} />{suffix ?? ""}</p>
    </div>
  );
}

function GoalCard({
  label, current, target, unit, tone,
}: { label: string; current: number; target: number; unit: string; tone: string }) {
  const pct = Math.min(100, Math.round((current / target) * 100));
  return (
    <div className="glass shadow-card-soft rounded-3xl p-5">
      <div className="flex items-center justify-between">
        <p className="font-display text-sm font-bold">{label}</p>
        <span className="text-[11px] font-bold" style={{ color: tone }}>{pct}%</span>
      </div>
      <p className="mt-1 text-[11px] text-muted-foreground"><CountUp value={current} /> / {target} {unit}</p>
      <div className="mt-3 h-2.5 overflow-hidden rounded-full bg-muted">
        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${tone}, oklch(0.7 0.2 260))`, boxShadow: `0 0 12px ${tone}` }} />
      </div>
    </div>
  );
}

function StreakStat({
  icon: Icon, label, value, suffix,
}: { icon: typeof Flame; label: string; value: number; suffix?: string }) {
  return (
    <div className="glass shadow-card-soft flex items-center gap-3 rounded-2xl p-4">
      <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-[var(--neon-purple)] to-[var(--neon-blue)] text-white shadow-glow">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{label}</p>
        <p className="font-display text-xl font-bold"><CountUp value={value} />{suffix ?? ""}</p>
      </div>
    </div>
  );
}

function buildInsights(
  insights: { productiveDay?: string | null; studyDelta?: number; mostImproved?: { name: string; delta: number } | null; strongest?: { name: string; avgScore: number } | null; weakest?: { name: string; avgScore: number } | null } | undefined,
  week: { deltaAccuracy?: number; accuracy?: number } | undefined,
  today: { streak?: number } | undefined,
): string[] {
  const out: string[] = [];
  if (insights?.mostImproved && insights.mostImproved.delta > 0) out.push(`${insights.mostImproved.name} accuracy improved by ${insights.mostImproved.delta}% recently.`);
  if (insights?.weakest) out.push(`${insights.weakest.name} needs improvement — currently at ${insights.weakest.avgScore}% average.`);
  if (insights?.strongest) out.push(`Strongest subject: ${insights.strongest.name} (${insights.strongest.avgScore}% avg).`);
  if (insights?.productiveDay) out.push(`Most productive day: ${insights.productiveDay}.`);
  if (typeof insights?.studyDelta === "number" && insights.studyDelta !== 0) out.push(`Average study time ${insights.studyDelta > 0 ? "increased" : "decreased"} by ${Math.abs(insights.studyDelta)} min vs the previous week.`);
  if (typeof week?.deltaAccuracy === "number" && week.deltaAccuracy !== 0) out.push(`Weekly accuracy ${week.deltaAccuracy > 0 ? "up" : "down"} ${Math.abs(week.deltaAccuracy)}% vs last week.`);
  if ((today?.streak ?? 0) >= 3) out.push(`You're on a ${today!.streak}-day streak — keep it going!`);
  if (!out.length) out.push("Complete more sessions to unlock personalized insights.");
  return out;
}

function ReportMenu({ onPdf, onExcel, onCsv }: { onPdf: (p: ReportPeriod) => void; onExcel: (p: ReportPeriod) => void; onCsv: (p: ReportPeriod) => void }) {
  const [open, setOpen] = useState(false);
  const periods: { key: ReportPeriod; label: string }[] = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" },
  ];
  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setTimeout(() => setOpen(false), 150)}
        className="glass inline-flex items-center gap-1.5 rounded-xl px-3 py-1.5 text-[11px] font-semibold text-muted-foreground transition-colors hover:text-foreground"
        title="Download learning report"
      >
        <Download className="h-3.5 w-3.5" /> Export
      </button>
      {open && (
        <div className="glass shadow-card-soft absolute right-0 z-50 mt-2 w-52 rounded-2xl p-2">
          {periods.map((p) => (
            <div key={p.key} className="rounded-xl px-2 py-1">
              <p className="px-1 py-1 text-[9px] uppercase tracking-widest text-muted-foreground">{p.label} report</p>
              <div className="flex gap-1.5">
                <button type="button" onMouseDown={() => onPdf(p.key)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-background/50 px-2 py-1.5 text-[10px] font-semibold hover:bg-background/80">
                  <FileText className="h-3 w-3" /> PDF
                </button>
                <button type="button" onMouseDown={() => onExcel(p.key)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-background/50 px-2 py-1.5 text-[10px] font-semibold hover:bg-background/80">
                  <FileSpreadsheet className="h-3 w-3" /> Excel
                </button>
                <button type="button" onMouseDown={() => onCsv(p.key)} className="flex flex-1 items-center justify-center gap-1 rounded-lg bg-background/50 px-2 py-1.5 text-[10px] font-semibold hover:bg-background/80">
                  <FileText className="h-3 w-3" /> CSV
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


