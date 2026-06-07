import { createFileRoute } from "@tanstack/react-router";
import { UserManagementFlow } from "@/components/admin/UserManagementFlow";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsersPage,
  head: () => ({
    meta: [
      { title: "User Management · CA Aspire BD Admin" },
      {
        name: "description",
        content:
          "Manage students, admins, permissions, subscriptions and platform activity from the CA Aspire BD identity control center.",
      },
      { property: "og:title", content: "User Management · CA Aspire BD Admin" },
      {
        property: "og:description",
        content:
          "User table, profile drawer, role permissions, bulk import and engagement analytics for administrators.",
      },
    ],
  }),
});

function AdminUsersPage() {
  return <UserManagementFlow />;
}
