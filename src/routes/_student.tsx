import { createFileRoute, Outlet, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { ShieldAlert } from "lucide-react";
import { DashSidebar } from "@/components/dashboard/DashSidebar";
import { DashTopbar } from "@/components/dashboard/DashTopbar";
import { StudyHeartbeat } from "@/components/tracking/StudyHeartbeat";
import { useAppStore } from "@/stores/app-store";

export const Route = createFileRoute("/_student")({
  component: StudentLayout,
});

function StudentGate({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user);
  const sessionReady = useAppStore((s) => s.sessionReady);
  const authLoading = useAppStore((s) => s.authLoading);
  const navigate = useNavigate();

  useEffect(() => {
    if (!sessionReady || authLoading) return;
    if (!user) {
      navigate({ to: "/login", replace: true });
      return;
    }
    if (user.role === "admin") {
      navigate({ to: "/admin", replace: true });
    }
  }, [sessionReady, authLoading, user, navigate]);

  if (!sessionReady || authLoading || !user) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        <div className="glass-card rounded-2xl px-6 py-4">Verifying your session…</div>
      </div>
    );
  }

  if (user && user.role !== "student") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass-card max-w-md rounded-3xl p-8 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-amber-400" />
          <h2 className="text-lg font-semibold">Access Denied</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            This area is for student accounts only. Redirecting you to your dashboard…
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function StudentLayout() {
  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-hero-glow opacity-60" />
      <div className="pointer-events-none fixed left-10 top-20 -z-10 h-72 w-72 rounded-full bg-[var(--neon-purple)]/20 blur-3xl animate-pulse-glow" />
      <div className="pointer-events-none fixed right-10 bottom-10 -z-10 h-80 w-80 rounded-full bg-[var(--neon-blue)]/20 blur-3xl animate-pulse-glow" />
      <div className="pointer-events-none fixed left-1/2 top-1/3 -z-10 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl animate-pulse-glow" />

      <div className="mx-auto flex max-w-[1500px] gap-4 px-4 py-4 sm:px-6">
        <DashSidebar />
        <div className="pointer-events-auto min-w-0 flex-1 space-y-4">
          <DashTopbar />
          <StudentGate>
            <StudyHeartbeat />
            <Outlet />
          </StudentGate>
        </div>
      </div>
    </div>
  );
}
