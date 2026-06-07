import { createFileRoute, Outlet, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { ShieldAlert } from "lucide-react";
import { AdminSidebar } from "@/components/admin/AdminSidebar";
import { useAppStore } from "@/stores/app-store";
import { supabase } from "@/integrations/supabase/client";
import { signOut } from "@/lib/auth-client";

export const Route = createFileRoute("/admin")({
  component: AdminLayout,
  head: () => ({
    meta: [
      { title: "Admin Control Center · CA Aspire BD" },
      {
        name: "description",
        content:
          "Manage students, exams, resources and platform analytics from the premium glassmorphism CA Aspire BD admin dashboard.",
      },
      { property: "og:title", content: "Admin Control Center · CA Aspire BD" },
      {
        property: "og:description",
        content:
          "Real-time analytics, content managers, system status and platform-wide controls in a futuristic admin UI.",
      },
    ],
  }),
});

function AdminGate({ children }: { children: React.ReactNode }) {
  const user = useAppStore((s) => s.user);
  const sessionReady = useAppStore((s) => s.sessionReady);
  const authLoading = useAppStore((s) => s.authLoading);
  const navigate = useNavigate();
  const [hasSupabaseSession, setHasSupabaseSession] = useState<boolean | null>(null);

  // Verify a real Supabase session exists.
  useEffect(() => {
    let cancelled = false;
    if (!sessionReady) return;
    (async () => {
      const { data } = await supabase.auth.getSession();
      if (!cancelled) setHasSupabaseSession(!!data.session?.access_token);
    })();
    return () => {
      cancelled = true;
    };
  }, [sessionReady, user?.id]);

  const status = useMemo(() => {
    if (!sessionReady || authLoading || hasSupabaseSession === null) return "loading" as const;
    if (!user) return "no-user" as const;
    if (user.role !== "admin") return "forbidden" as const;
    if (!hasSupabaseSession && !user.id?.startsWith("demo-")) return "demo" as const;
    return "ok" as const;
  }, [sessionReady, authLoading, hasSupabaseSession, user]);

  useEffect(() => {
    if (status === "loading") return;
    if (status === "no-user") {
      navigate({ to: "/admin/login", replace: true });
    } else if (status === "forbidden") {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [status, navigate]);

  if (status === "loading" || status === "no-user") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center text-sm text-muted-foreground">
        <div className="glass-card rounded-2xl px-6 py-4">Verifying admin session…</div>
      </div>
    );
  }

  if (status === "forbidden") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass-card max-w-md rounded-3xl p-8 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-amber-400" />
          <h2 className="text-lg font-semibold">Admin access required</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account doesn’t have admin privileges.
          </p>
        </div>
      </div>
    );
  }

  if (status === "demo") {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="glass-card max-w-md rounded-3xl p-8 text-center">
          <ShieldAlert className="mx-auto mb-3 h-8 w-8 text-amber-400" />
          <h2 className="text-lg font-semibold">Real admin login required</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            You’re signed in with a demo session, which can’t authorize backend writes. Please
            sign out and log in with a real admin account (any{" "}
            <span className="font-mono">@caaspirebd.com</span> email).
          </p>
          <button
            className="mt-4 rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
            onClick={async () => {
              await signOut().catch(() => undefined);
              navigate({ to: "/admin/login", replace: true });
            }}
          >
            Sign out & log in
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}

function AdminLayout() {
  const path = useLocation({ select: (l) => l.pathname });

  // The admin login page lives at /admin/login but must be publicly reachable
  // (no sidebar, no gate) so unauthenticated admins can sign in.
  if (path === "/admin/login") {
    return (
      <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
        <div className="pointer-events-none fixed inset-0 -z-10 bg-hero-glow opacity-60" />
        <Outlet />
      </div>
    );
  }

  return (
    <div className="relative min-h-screen overflow-x-hidden bg-background text-foreground">
      <div className="pointer-events-none fixed inset-0 -z-10 bg-hero-glow opacity-60" />
      <div className="pointer-events-none fixed left-10 top-20 -z-10 h-72 w-72 rounded-full bg-[var(--neon-purple)]/20 blur-3xl animate-pulse-glow" />
      <div className="pointer-events-none fixed right-10 bottom-10 -z-10 h-80 w-80 rounded-full bg-[var(--neon-blue)]/20 blur-3xl animate-pulse-glow" />
      <div className="pointer-events-none fixed left-1/2 top-1/3 -z-10 h-64 w-64 rounded-full bg-fuchsia-500/10 blur-3xl animate-pulse-glow" />

      <div className="mx-auto flex max-w-[1600px] gap-4 px-4 py-4 sm:px-6">
        <AdminSidebar />
        <div className="pointer-events-auto min-w-0 flex-1 space-y-4">
          <AdminGate>
            <Outlet />
          </AdminGate>
        </div>
      </div>
    </div>
  );
}
