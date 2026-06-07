import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Mail, ArrowRight } from "lucide-react";
import { toast } from "sonner";
import { AuthShell } from "@/components/auth/AuthShell";
import {
  NeoInput,
  PasswordInput,
  NeonButton,
  FieldLabel,
} from "@/components/auth/AuthPrimitives";
import { useAppStore } from "@/stores/app-store";
import { signInWithEmail } from "@/lib/auth-client";
import { setRememberMe } from "@/lib/session-timeout";


export const Route = createFileRoute("/login")({
  component: StudentLogin,
  head: () => ({
    meta: [
      { title: "Sign In · CA Aspire BD" },
      { name: "description", content: "Sign in to continue your smart learning journey on CA Aspire BD." },
      { property: "og:title", content: "Sign In · CA Aspire BD" },
      { property: "og:description", content: "Secure access to your AI-personalized study dashboard." },
    ],
  }),
});




function StudentLogin() {
  const [pw, setPw] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [remember, setRemember] = useState(false);
  const refreshAuth = useAppStore((s) => s.refreshAuth);
  const syncAuthSession = useAppStore((s) => s.syncAuthSession);
  const navigate = useNavigate();
  const [expired, setExpired] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const isExpired = new URLSearchParams(window.location.search).get("expired") === "1";
    setExpired(isExpired);
    if (isExpired) {
      toast.error("Your session expired due to inactivity. Please sign in again.");
    }
  }, []);

  const handleSignIn = async (emailVal: string, pwVal: string) => {
    setLoading(true);
    try {
      setRememberMe(remember);
      const result = await signInWithEmail(emailVal.trim(), pwVal);
      // Optimistically push a user into the store so every component that
      // reads `user` re-renders immediately — no waiting on profile/role.
      const isDemoAdmin = "user" in result && result.user && (result.user as { role?: string }).role === "admin";
      if ("user" in result && result.user) {
        syncAuthSession(null, result.user as Parameters<typeof syncAuthSession>[1]);
      } else if ("session" in result && result.session?.user) {
        syncAuthSession(result.session);
      }
      toast.success("Welcome back!");
      navigate({ to: isDemoAdmin ? "/admin" : "/dashboard", replace: true });
      // Background fill of accurate profile/role; redirects admins if needed.
      void refreshAuth({ force: true }).then((u) => {
        if (u?.role === "admin" && !isDemoAdmin) navigate({ to: "/admin", replace: true });
      });
    } catch (err) {
      toast.error((err as Error).message ?? "Sign-in failed");
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    handleSignIn(email, pw);
  };




  return (
    <AuthShell variant="student">
      <h2 className="font-display text-3xl font-bold tracking-tight">Welcome back</h2>
      <p className="mt-1.5 text-sm text-muted-foreground">
        Sign in to continue your CA preparation journey.
      </p>

      {expired && (
        <div className="mt-4 rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          Your session expired due to inactivity. Please sign in again to continue.
        </div>
      )}

      <form className="mt-6 space-y-4" onSubmit={onSubmit}>
        <div>
          <FieldLabel>Email</FieldLabel>
          <NeoInput
            type="email"
            placeholder="you@university.edu"
            icon={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <FieldLabel>Password</FieldLabel>
            <Link to="/forgot-password" className="text-[11px] font-medium text-[var(--neon-purple)] hover:underline">
              Forgot password?
            </Link>
          </div>
          <PasswordInput value={pw} onChange={setPw} />
        </div>

        <NeonButton type="submit" disabled={loading}>
          {loading ? "Signing in…" : <>Sign in <ArrowRight className="h-4 w-4" /></>}
        </NeonButton>

        <label className="flex cursor-pointer select-none items-center gap-2 text-xs text-muted-foreground">
          <input
            type="checkbox"
            checked={remember}
            onChange={(e) => setRemember(e.target.checked)}
            className="h-4 w-4 rounded border-border accent-[var(--neon-purple)]"
          />
          Remember me for 30 days on this device
        </label>
      </form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Don't have an account?{" "}
        <Link to="/signup" className="font-semibold text-[var(--neon-blue)] hover:underline">
          Sign up
        </Link>
      </p>
    </AuthShell>
  );
}
