import { createFileRoute } from "@tanstack/react-router";
import { McqAdminConsole } from "@/components/admin/McqAdminConsole";

export const Route = createFileRoute("/admin/mcq")({
  component: AdminMcqPage,
  head: () => ({
    meta: [
      { title: "MCQ Manager · CA Aspire BD Admin" },
      {
        name: "description",
        content:
          "Upload, organize, edit and manage all practice MCQs in the premium CA Aspire BD admin control center.",
      },
      { property: "og:title", content: "MCQ Manager · CA Aspire BD Admin" },
      {
        property: "og:description",
        content:
          "Bulk import, validation preview, single MCQ creation and live upload analytics for administrators.",
      },
    ],
  }),
});

function AdminMcqPage() {
  return <McqAdminConsole />;
}
