import { createFileRoute } from "@tanstack/react-router";
import { QuizManagerFlow } from "@/components/admin/QuizManagerFlow";

export const Route = createFileRoute("/admin/quiz")({
  component: AdminQuizPage,
  head: () => ({
    meta: [
      { title: "Quiz Manager · CA Aspire BD Admin" },
      {
        name: "description",
        content:
          "Create, manage and publish chapter-wise timed quizzes from the premium CA Aspire BD admin control center.",
      },
      { property: "og:title", content: "Quiz Manager · CA Aspire BD Admin" },
      {
        property: "og:description",
        content:
          "Quiz builder, MCQ selection, analytics and publish controls for administrators.",
      },
    ],
  }),
});

function AdminQuizPage() {
  return <QuizManagerFlow />;
}
