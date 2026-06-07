import { createFileRoute } from "@tanstack/react-router";
import { McqFlow } from "@/components/dashboard/McqFlow";
import { McqPremiumShell } from "@/components/dashboard/mcq/McqPremiumShell";

export const Route = createFileRoute("/_student/mcq-practice")({
  component: McqPage,
  head: () => ({
    meta: [
      { title: "MCQ Practice · CA Aspire BD" },
      { name: "description", content: "Level → Subject → Chapter MCQ practice with instant explanations and live analytics." },
    ],
  }),
});

function McqPage() {
  return (
    <McqPremiumShell>
      <McqFlow />
    </McqPremiumShell>
  );
}
