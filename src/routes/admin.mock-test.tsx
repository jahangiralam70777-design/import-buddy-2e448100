import { createFileRoute } from "@tanstack/react-router";
import { MockTestManagerFlow } from "@/components/admin/MockTestManagerFlow";

export const Route = createFileRoute("/admin/mock-test")({
  component: AdminMockTestPage,
  head: () => ({
    meta: [
      { title: "Mock Test Manager · CA Aspire BD Admin" },
      {
        name: "description",
        content:
          "Create, schedule and manage full mock examinations from the premium CA Aspire BD admin control center.",
      },
      { property: "og:title", content: "Mock Test Manager · CA Aspire BD Admin" },
      {
        property: "og:description",
        content:
          "Mock builder, scheduling, leaderboards and analytics for administrators.",
      },
    ],
  }),
});

function AdminMockTestPage() {
  return <MockTestManagerFlow />;
}
