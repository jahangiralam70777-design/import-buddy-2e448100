import { createFileRoute } from "@tanstack/react-router";
import { DailyProgressCenter } from "@/components/dashboard/DailyProgressCenter";

export const Route = createFileRoute("/_student/daily-progress")({
  component: DailyProgressPage,
  head: () => ({
    meta: [
      { title: "Daily Progress · CA Aspire BD" },
      { name: "description", content: "Track daily, weekly and monthly study progress across subjects and chapters with live analytics." },
    ],
  }),
});

function DailyProgressPage() {
  return (
    <div className="space-y-6">
      <header className="space-y-1">
        <p className="text-xs uppercase tracking-widest text-muted-foreground">Analytics Hub</p>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Daily Progress</h1>
        <p className="text-sm text-muted-foreground">
          Your central analytics & study tracking — daily, weekly, monthly, by subject and chapter.
        </p>
      </header>
      <DailyProgressCenter />
    </div>
  );
}
