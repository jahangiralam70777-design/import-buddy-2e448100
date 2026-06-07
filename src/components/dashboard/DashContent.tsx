import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo } from "react";
import { useModuleVisibility } from "@/hooks/use-module-visibility";
import { studentDashboardSnapshot } from "@/lib/student-dashboard.functions";
import { PerformanceCenter } from "./PerformanceCenter";
import { CompletionTracker } from "./CompletionTracker";
import { AdvancedAnalyticsSection } from "./AdvancedAnalyticsSection";

import { CountUp } from "@/components/realtime/CountUp";
import {
  ListChecks,
  Timer,
  Trophy,
  Target,
  Flame,
  PlayCircle,
  SlidersHorizontal,
  Layers,
  ArrowRight,
  Bell,
  TrendingUp,
  Clock,
  Sparkles,
  Activity,
} from "lucide-react";

const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const actions: { t: string; i: typeof ListChecks; to: "/mcq-practice" | "/quiz" | "/custom-exam" | "/flash-cards" }[] = [
  { t: "Start MCQ Practice", i: ListChecks, to: "/mcq-practice" },
  { t: "Start Quiz", i: Timer, to: "/quiz" },
  { t: "Create Custom Exam", i: SlidersHorizontal, to: "/custom-exam" },
  { t: "Open Flash Cards", i: Layers, to: "/flash-cards" },
];

function timeAgo(iso?: string | null) {
  if (!iso) return "";
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.round(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.round(h / 24);
  return `${d}d ago`;
}

export function DashContent() {
  const { isPathHidden } = useModuleVisibility();
  const visibleActions = actions.filter((a) => !isPathHidden(a.to));
  const mockTestHidden = isPathHidden("/mock-test");
  const classesHidden = isPathHidden("/classes");

  const fetchSnapshot = useServerFn(studentDashboardSnapshot);
  const { data, isLoading } = useQuery({
    queryKey: ["student-dashboard-snapshot"],
    queryFn: () => fetchSnapshot(),
    staleTime: 30_000,
    refetchOnWindowFocus: false,
  });
  // Realtime invalidation is handled globally by useRealtimeInvalidator,
  // which already invalidates the "student-dashboard-snapshot" key.

  const counts = data?.counts;
  const bars = data?.bars ?? [0, 0, 0, 0, 0, 0, 0];
  const subjects = useMemo(() => {
    const list = data?.subjects ?? [];
    const palette = ["var(--neon-purple)", "var(--neon-blue)", "var(--neon-pink)", "oklch(0.75 0.15 200)"];
    return list.slice(0, 4).map((s, i) => ({ n: s.name, p: s.progress, c: s.color ?? palette[i % palette.length] }));
  }, [data]);

  const stats = [
    { i: ListChecks, l: "MCQs Available", v: counts?.mcqs ?? 0, d: `+${counts?.mcqsThisWeek ?? 0} this week`, tone: "var(--neon-purple)" },
    { i: Timer, l: "Quizzes", v: counts?.quizzes ?? 0, d: `+${counts?.quizzesThisWeek ?? 0} this week`, tone: "var(--neon-blue)" },
    { i: Trophy, l: "Mock Tests", v: counts?.mocks ?? 0, d: `+${counts?.mocksThisWeek ?? 0} this week`, tone: "var(--neon-pink)" },
    { i: Target, l: "Accuracy", v: data?.accuracy ?? 0, d: `${counts?.attempts ?? 0} attempts`, tone: "var(--neon-purple)", suffix: "%" },
    { i: Flame, l: "Streak", v: data?.streak ?? 0, d: (data?.streak ?? 0) > 0 ? "Keep it going!" : "Start today", tone: "var(--neon-blue)", suffix: " days" },
  ];

  const monthlyPct = Math.min(100, Math.round(((counts?.attempts ?? 0) / 30) * 100));

  const learning = data?.learning ?? [];
  const recommendations = data?.recommendations ?? [];
  const recentActivity = data?.recentActivity ?? [];
  const liveNotifications = data?.notifications ?? [];
  const upcoming = data?.upcomingMock;

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <section className="relative overflow-hidden rounded-3xl p-px">
        <div className="bg-cta-gradient pointer-events-none absolute inset-0 opacity-90" />
        <div className="relative flex flex-col gap-6 rounded-[calc(theme(borderRadius.3xl)-1px)] p-6 sm:flex-row sm:items-center sm:justify-between sm:p-8">
          <div className="pointer-events-none absolute -right-16 -top-16 h-60 w-60 rounded-full bg-white/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-20 -left-10 h-60 w-60 rounded-full bg-black/20 blur-3xl" />
          <div className="relative text-white">
            <p className="text-xs uppercase tracking-widest text-white/70">{new Date().toLocaleDateString(undefined, { weekday: "long", month: "long", day: "numeric" })}</p>
            <h1 className="font-display mt-2 text-3xl font-bold sm:text-4xl">
              Welcome back <span className="inline-block animate-float">👋</span>
            </h1>
            <p className="mt-2 max-w-lg text-sm text-white/80">
              {(data?.streak ?? 0) > 0
                ? `You're on a ${data?.streak}-day streak. One focused session keeps it alive.`
                : "One focused session changes everything — let's get started."}
            </p>
          </div>
          <div className="relative flex gap-3">
            <Link to="/mcq-practice" className="rounded-2xl bg-white px-5 py-3 text-sm font-semibold text-foreground shadow-card-soft transition-transform hover:scale-[1.03]">
              Resume Learning
            </Link>
            <Link to="/profile" className="rounded-2xl border border-white/30 bg-white/10 px-5 py-3 text-sm font-semibold text-white backdrop-blur transition-colors hover:bg-white/20">
              View Goals
            </Link>
          </div>
        </div>
      </section>

      {/* Stats */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {stats.map((s) => (
          <div
            key={s.l}
            className="glass shadow-card-soft group relative overflow-hidden rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
          >
            <div
              className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full opacity-30 blur-2xl transition-opacity group-hover:opacity-60"
              style={{ background: s.tone }}
            />
            <div
              className="flex h-9 w-9 items-center justify-center rounded-xl text-white"
              style={{ background: `linear-gradient(135deg, ${s.tone}, oklch(0.55 0.2 270))` }}
            >
              <s.i className="h-4 w-4" />
            </div>
            <p className="mt-3 text-xs text-muted-foreground">{s.l}</p>
            <p className="font-display mt-1 text-2xl font-bold">
              <CountUp value={Number(s.v) || 0} />
              {s.suffix ?? ""}
            </p>
            <p className="mt-1 flex items-center gap-1 text-[10px] text-emerald-400">
              <TrendingUp className="h-3 w-3" />
              {s.d}
            </p>
          </div>
        ))}
      </section>

      {/* Premium Analytics + Tracking + Insights */}
      <AdvancedAnalyticsSection />



      {/* Analytics row */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {/* Weekly chart */}
        <div className="glass shadow-card-soft rounded-3xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-display text-lg font-bold">Weekly Performance</h3>
              <p className="text-xs text-muted-foreground">Avg accuracy over last 7 days</p>
            </div>
            <div className="glass rounded-xl px-3 py-1.5 text-xs">Last 7 days</div>
          </div>
          <div className="mt-6 flex h-56 items-end gap-3">
            {bars.map((h, i) => (
              <div key={i} className="flex flex-1 flex-col items-center gap-2">
                <div className="relative flex h-full w-full items-end">
                  <div
                    className="w-full rounded-t-xl bg-gradient-to-t from-[var(--neon-purple)] to-[var(--neon-blue)] transition-all duration-700 hover:opacity-90"
                    style={{ height: `${Math.max(4, h)}%`, boxShadow: "0 -8px 30px -8px var(--neon-purple)" }}
                  />
                </div>
                <span className="text-[10px] text-muted-foreground">{days[i]}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Progress rings */}
        <div className="glass shadow-card-soft rounded-3xl p-5">
          <h3 className="font-display text-lg font-bold">Monthly Goal</h3>
          <p className="text-xs text-muted-foreground">Across all subjects</p>
          <div className="mt-4 flex flex-col items-center justify-center">
            <div className="relative h-44 w-44">
              <svg className="h-full w-full -rotate-90" viewBox="0 0 120 120">
                <defs>
                  <linearGradient id="dgrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="oklch(0.7 0.25 295)" />
                    <stop offset="100%" stopColor="oklch(0.72 0.2 235)" />
                  </linearGradient>
                </defs>
                <circle cx="60" cy="60" r="54" stroke="currentColor" strokeWidth="10" fill="none" className="text-muted/40" />
                <circle
                  cx="60" cy="60" r="54"
                  stroke="url(#dgrad)"
                  strokeWidth="10"
                  fill="none"
                  strokeLinecap="round"
                  strokeDasharray="339"
                  strokeDashoffset={339 - (339 * monthlyPct) / 100}
                  style={{ transition: "stroke-dashoffset 800ms ease" }}
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <p className="font-display text-3xl font-bold">
                  <CountUp value={monthlyPct} />%
                </p>
                <p className="text-[10px] text-muted-foreground">of monthly goal</p>
              </div>
            </div>
            <div className="mt-4 grid w-full grid-cols-3 gap-2 text-center">
              <div>
                <p className="font-display text-sm font-bold"><CountUp value={counts?.mocks ?? 0} /></p>
                <p className="text-[10px] text-muted-foreground">Mocks</p>
              </div>
              <div>
                <p className="font-display text-sm font-bold"><CountUp value={counts?.quizzes ?? 0} /></p>
                <p className="text-[10px] text-muted-foreground">Quizzes</p>
              </div>
              <div>
                <p className="font-display text-sm font-bold"><CountUp value={counts?.attempts ?? 0} /></p>
                <p className="text-[10px] text-muted-foreground">Attempts</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Subject performance + mock test + actions */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="glass shadow-card-soft rounded-3xl p-5 lg:col-span-2">
          <h3 className="font-display text-lg font-bold">Subject Performance</h3>
          <p className="text-xs text-muted-foreground">Accuracy by subject</p>
          <div className="mt-5 space-y-4">
            {(subjects.length ? subjects : [{ n: "No data yet", p: 0, c: "var(--neon-purple)" }]).map((s) => (
              <div key={s.n}>
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{s.n}</span>
                  <span className="text-muted-foreground">{s.p}%</span>
                </div>
                <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full transition-all duration-700"
                    style={{
                      width: `${s.p}%`,
                      background: `linear-gradient(90deg, ${s.c}, oklch(0.7 0.2 260))`,
                      boxShadow: `0 0 12px ${s.c}`,
                    }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Mock test widget */}
        {!mockTestHidden && (
        <div className="relative overflow-hidden rounded-3xl p-px">
          <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--neon-purple)] via-[var(--neon-blue)] to-[var(--neon-pink)] opacity-90" />
          <div className="relative flex h-full flex-col rounded-[calc(theme(borderRadius.3xl)-1px)] bg-background/85 p-5 backdrop-blur">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Upcoming Mock</p>
                <h3 className="font-display mt-1 text-lg font-bold">{upcoming?.title ?? "No mock scheduled"}</h3>
              </div>
              <Clock className="h-5 w-5 text-[var(--neon-purple)]" />
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2">
              <div className="glass rounded-xl py-2 text-center">
                <p className="font-display text-lg font-bold text-gradient">{upcoming?.total_questions ?? 0}</p>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Questions</p>
              </div>
              <div className="glass rounded-xl py-2 text-center">
                <p className="font-display text-lg font-bold text-gradient">{Math.round((upcoming?.duration_seconds ?? 0) / 60)}</p>
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">Minutes</p>
              </div>
            </div>

            <div className="mt-4 space-y-1.5 text-xs text-muted-foreground">
              <p>· <CountUp value={counts?.mocks ?? 0} /> mocks available</p>
              <p>· Updated {timeAgo(upcoming?.created_at)}</p>
            </div>

            <Link to="/mock-test" className="bg-cta-gradient mt-auto inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition-transform hover:scale-[1.02]">
              Join Mock Test <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
        )}
      </section>

      {/* Continue learning + notifications */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        {!classesHidden && (
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Continue Learning</h3>
            <Link to="/classes" className="text-xs text-muted-foreground hover:text-foreground">View all</Link>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-4 md:grid-cols-3">
            {(learning.length ? learning : recommendations.slice(0, 3).map((r) => ({ id: r.id, title: r.title, progress: 0 }))).map((l) => (
              <div
                key={l.id}
                className="glass shadow-card-soft group relative overflow-hidden rounded-2xl p-4 transition-transform hover:-translate-y-0.5"
              >
                <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[var(--neon-purple)]/20 blur-2xl" />
                <div className="flex items-center gap-3">
                  <div className="bg-cta-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white">
                    <PlayCircle className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">Quiz</p>
                    <p className="font-display text-sm font-bold line-clamp-1">{l.title}</p>
                  </div>
                </div>
                <div className="mt-4">
                  <div className="flex items-center justify-between text-[10px] text-muted-foreground">
                    <span>Best score</span>
                    <span><CountUp value={l.progress} />%</span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-[var(--neon-purple)] to-[var(--neon-blue)] transition-all duration-700"
                      style={{ width: `${l.progress}%` }}
                    />
                  </div>
                </div>
                <Link to="/quiz" className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-border bg-background/40 py-2 text-xs font-semibold transition-colors hover:bg-muted">
                  Resume <ArrowRight className="h-3 w-3" />
                </Link>
              </div>
            ))}
            {!learning.length && !recommendations.length && !isLoading && (
              <p className="text-xs text-muted-foreground md:col-span-3">No sessions yet — start a quiz to see it here.</p>
            )}
          </div>
        </div>
        )}

        {/* Notifications */}
        <div className="glass shadow-card-soft rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Recent Notifications</h3>
            <Bell className="h-4 w-4 text-muted-foreground" />
          </div>
          <ul className="mt-4 space-y-3">
            {liveNotifications.slice(0, 4).map((n) => {
              const tone = n.priority === "high" ? "var(--neon-pink)" : n.priority === "low" ? "var(--neon-blue)" : "var(--neon-purple)";
              return (
                <li key={n.id} className="flex items-start gap-3 rounded-xl bg-background/40 p-3">
                  <span
                    className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
                    style={{ background: tone, boxShadow: `0 0 10px ${tone}` }}
                  />
                  <div className="min-w-0">
                    <p className="text-xs font-medium line-clamp-2">{n.title}</p>
                    <p className="text-[10px] text-muted-foreground">{timeAgo(n.sent_at ?? n.created_at)}</p>
                  </div>
                </li>
              );
            })}
            {!liveNotifications.length && (
              <li className="text-xs text-muted-foreground">No notifications yet.</li>
            )}
          </ul>
          <Link to="/notifications" className="mt-3 inline-flex w-full items-center justify-center rounded-xl border border-border bg-background/40 py-2 text-xs font-semibold transition-colors hover:bg-muted">
            View all notifications
          </Link>
        </div>
      </section>

      {/* Recent activity + recommendations */}
      <section className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="glass shadow-card-soft rounded-3xl p-5">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Recent Activity</h3>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </div>
          <ul className="mt-3 space-y-2">
            {recentActivity.length ? recentActivity.map((a) => (
              <li key={a.id} className="flex items-center justify-between rounded-xl bg-background/40 p-3 text-xs">
                <div>
                  <p className="font-medium">Attempt · {a.correct}/{a.total}</p>
                  <p className="text-[10px] text-muted-foreground">{timeAgo(a.completed_at)}</p>
                </div>
                <span className="font-display text-sm font-bold text-gradient">{a.score}%</span>
              </li>
            )) : (
              <li className="text-xs text-muted-foreground">No activity yet.</li>
            )}
          </ul>
        </div>

        <div className="glass shadow-card-soft rounded-3xl p-5 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h3 className="font-display text-lg font-bold">Smart Recommendations</h3>
            <Sparkles className="h-4 w-4 text-[var(--neon-purple)]" />
          </div>
          <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
            {recommendations.length ? recommendations.slice(0, 4).map((r) => (
              <Link
                key={r.id}
                to="/quiz"
                className="glass group flex items-center justify-between rounded-xl p-3 transition-transform hover:-translate-y-0.5"
              >
                <div className="min-w-0">
                  <p className="font-display text-sm font-bold line-clamp-1">{r.title}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {r.total_questions} Qs · {Math.round((r.duration_seconds ?? 0) / 60)} min · {r.difficulty}
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </Link>
            )) : (
              <p className="text-xs text-muted-foreground md:col-span-2">No recommendations yet — check back as admins publish new content.</p>
            )}
          </div>
        </div>
      </section>

      {/* Performance Center */}
      <PerformanceCenter />

      {/* Subject & Chapter Completion Tracker */}
      <CompletionTracker />

      {/* Quick actions */}
      <section>
        <h3 className="font-display text-lg font-bold">Quick Actions</h3>
        <div className="mt-3 grid grid-cols-2 gap-4 md:grid-cols-4">
          {visibleActions.map((a) => (
            <Link
              key={a.t}
              to={a.to}
              className="glass shadow-card-soft group relative block overflow-hidden rounded-2xl p-4 text-left transition-transform hover:-translate-y-0.5"
            >
              <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-[var(--neon-blue)]/20 blur-2xl transition-opacity group-hover:opacity-100" />
              <div className="bg-cta-gradient flex h-10 w-10 items-center justify-center rounded-xl text-white shadow-glow">
                <a.i className="h-5 w-5" />
              </div>
              <p className="font-display mt-3 text-sm font-bold">{a.t}</p>
              <p className="mt-1 inline-flex items-center gap-1 text-[10px] text-muted-foreground group-hover:text-foreground">
                Launch <ArrowRight className="h-3 w-3" />
              </p>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

