import { createFileRoute } from "@tanstack/react-router";
import { QuestionBankFlow } from "@/components/dashboard/QuestionBankFlow";

export const Route = createFileRoute("/_student/qns-bank")({
  component: QnsBankPage,
  head: () => ({
    meta: [
      { title: "Smart Question Bank · CA Aspire BD" },
      {
        name: "description",
        content:
          "Chapter-wise important questions, PDFs, previous-year questions and model test papers — all in one premium viewer.",
      },
      { property: "og:title", content: "Smart Question Bank · CA Aspire BD" },
      {
        property: "og:description",
        content: "Premium glassmorphism resource viewer with PDF/text modes, highlights and AI recommendations.",
      },
    ],
  }),
});

function QnsBankPage() {
  return <QuestionBankFlow />;
}
