import { useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { motion } from "motion/react";
import {
  Bot, Brain, Download, FileQuestion, RotateCcw, Sparkles, X, Zap,
} from "lucide-react";
import { McqTopBar } from "./TopBar";
import { McqDashboardWidgets } from "./DashboardWidgets";
import { ActionButton, PreviewBadge, downloadFile, useMcqOverview } from "./primitives";
import { useScopedTheme } from "./useScopedTheme";

export function McqPremiumShell({ children }: { children: React.ReactNode }) {
  const { theme, toggle, themeClass } = useScopedTheme();
  const overviewQ = useMcqOverview();
  const data = overviewQ.data;
  const [query, setQuery] = useState("");
  const [aiOpen, setAiOpen] = useState(false);

  // Real, derived gamification from actual activity.
  const streak = useMemo(() => {
    const trend = data?.trend ?? [];
    let s = 0;
    for (let i = trend.length - 1; i >= 0; i--) {
      if ((trend[i]?.attempts ?? 0) > 0) s++;
      else break;
    }
    return s;
  }, [data]);
  const xp = useMemo(
    () => (data?.totals?.correct ?? 0) * 10 + (data?.totals?.attempts ?? 0) * 5,
    [data],
  );
  const weak = data?.weakChapters ?? [];

  function exportProgress() {
    const t = data?.totals;
    const rows = [
      ["Metric", "Value"],
      ["Accuracy %", String(Math.round(t?.accuracy ?? 0))],
      ["MCQs solved", String(t?.answered ?? 0)],
      ["Sessions", String(t?.attempts ?? 0)],
      ["Study streak (days)", String(streak)],
      ["XP", String(xp)],
      [],
      ["Weak chapter", "Accuracy %"],
      ...weak.map((w) => [w.name, String(w.accuracy)]),
    ];
    downloadFile("mcq-progress.csv", rows.map((r) => r.join(",")).join("\n"));
  }

  return (
    <div className={themeClass}>
      <div className="space-y-4 p-1 sm:p-2">
        <McqTopBar
          theme={theme}
          onToggleTheme={toggle}
          query={query}
          onQuery={setQuery}
          streak={streak}
          xp={xp}
          onAiAssistant={() => setAiOpen((v) => !v)}
        />

        <McqDashboardWidgets data={data} loading={overviewQ.isLoading} />

        {/* AI Study Assistant panel */}
        {aiOpen && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass shadow-glow relative overflow-hidden rounded-3xl p-5"
          >
            <div className="pointer-events-none absolute -right-12 -top-12 h-40 w-40 rounded-full bg-[var(--neon-purple)]/25 blur-3xl" />
            <div className="relative flex items-start justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-2xl bg-cta-gradient text-white shadow-glow">
                  <Bot className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-display flex items-center gap-2 text-base font-bold">
                    AI Study Assistant <PreviewBadge />
                  </p>
                  <p className="text-xs text-muted-foreground">Personalised revision plan from your real performance.</p>
                </div>
              </div>
              <button onClick={() => setAiOpen(false)} className="glass flex h-8 w-8 items-center justify-center rounded-xl hover:scale-105">
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="relative mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {weak.length === 0 ? (
                <p className="text-sm text-muted-foreground">Practice a few chapters and your weak-topic analysis will appear here.</p>
              ) : (
                weak.slice(0, 3).map((w) => (
                  <div key={w.id} className="rounded-2xl border border-border bg-background/40 p-3">
                    <p className="flex items-center gap-1.5 text-xs font-bold text-[var(--neon-pink)]">
                      <Brain className="h-3.5 w-3.5" /> {w.name}
                    </p>
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {w.accuracy}% accuracy · {w.subjectName ?? "—"}. Revise this chapter before your next mock.
                    </p>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        )}

        {/* Quick actions — fully functional */}
        <div className="glass shadow-card-soft flex flex-wrap items-center gap-2 rounded-3xl p-3">
          <span className="mr-1 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground">
            <Zap className="h-3.5 w-3.5 text-amber-400" /> Quick actions
          </span>
          <Link to="/mock-test">
            <ActionButton variant="soft" icon={<FileQuestion className="h-4 w-4" />}>Generate Mock</ActionButton>
          </Link>
          <Link to="/wrong-questions">
            <ActionButton variant="soft" icon={<RotateCcw className="h-4 w-4" />}>Review Mistakes</ActionButton>
          </Link>
          <Link to="/daily-progress">
            <ActionButton variant="soft" icon={<Sparkles className="h-4 w-4" />}>View Analytics</ActionButton>
          </Link>
          <ActionButton variant="soft" icon={<Download className="h-4 w-4" />} onAction={exportProgress} successLabel="Exported">
            Export Progress
          </ActionButton>
        </div>

        {/* Existing level → subject → chapter → practice flow */}
        {children}
      </div>
    </div>
  );
}