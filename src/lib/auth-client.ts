import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/app-data";
import { getDemoSession, clearDemoSession, demoSignIn } from "@/lib/demo-auth";
import { recordLoginEvent, recordLogoutEvent } from "@/lib/user-activity.functions";
import { trackEvent } from "@/lib/tracking";

const LOGIN_EVENT_KEY = "edumaster.login_event_id";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: AppRole;
};

export async function signInWithEmail(email: string, password: string) {
  // Try demo auth first
  try {
    const user = demoSignIn(email, password);
    return { user, session: null };
  } catch {
    // not a demo user — fall through to Supabase
  }
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  // Best-effort: track login event for analytics
  try {
    const ua = typeof navigator !== "undefined" ? navigator.userAgent : "";
    const res = await recordLoginEvent({ data: { user_agent: ua } });
    if (typeof window !== "undefined" && res?.event_id) {
      localStorage.setItem(LOGIN_EVENT_KEY, res.event_id);
    }
    try { trackEvent({ event_type: "login", metadata: { method: "password" } }); } catch { /* swallow */ }
  } catch (err) {
    console.warn("[auth] login event tracking failed", err);
  }
  return data;
}

export async function signUpWithEmail(input: {
  email: string;
  password: string;
  displayName?: string;
  phone?: string;
  level?: string;
  referralSource?: string;
}) {
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined;
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: redirectTo,
      data: {
        ...(input.displayName ? { display_name: input.displayName } : {}),
        ...(input.phone ? { phone: input.phone } : {}),
        ...(input.level ? { level: input.level } : {}),
        ...(input.referralSource ? { referral_source: input.referralSource } : {}),
      },
    },
  });
  if (error) throw error;
  return data;
}

export async function resetPasswordForEmail(email: string) {
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/reset-password` : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function signOut() {
  clearDemoSession();
  // Best-effort: close out the login session
  try {
    if (typeof window !== "undefined") {
      const eventId = localStorage.getItem(LOGIN_EVENT_KEY);
      if (eventId) {
        await recordLogoutEvent({ data: { event_id: eventId } });
        localStorage.removeItem(LOGIN_EVENT_KEY);
      }
      try { trackEvent({ event_type: "logout" }); } catch { /* swallow */ }
    }
  } catch (err) {
    console.warn("[auth] logout event tracking failed", err);
  }
  const { error } = await supabase.auth.signOut();
  if (error) throw error;
}

export async function fetchSessionUser(session?: Session | null): Promise<AuthUser | null> {
  // Check demo session first
  const demoUser = getDemoSession();
  if (demoUser) return demoUser;

  const resolvedSession = session ?? (await supabase.auth.getSession()).data.session;
  if (!resolvedSession?.user) return null;

  const userId = resolvedSession.user.id;
  const email = resolvedSession.user.email ?? "";

  // Race profile/role lookups against a 4s timeout so a stalled network
  // on production never blocks the auth state from settling. If a lookup
  // times out we still return a usable AuthUser from the verified session.
  const withTimeout = <T,>(p: PromiseLike<T>, ms: number, fallback: T): Promise<T> =>
    new Promise((resolve) => {
      const t = setTimeout(() => {
        console.warn("[auth] profile/role lookup timed out after", ms, "ms");
        resolve(fallback);
      }, ms);
      Promise.resolve(p).then(
        (v) => { clearTimeout(t); resolve(v); },
        (e) => { clearTimeout(t); console.warn("[auth] lookup error", e); resolve(fallback); },
      );
    });

  const [profileRes, rolesRes] = await Promise.all([
    withTimeout(
      supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle() as unknown as PromiseLike<{ data: { display_name?: string } | null }>,
      4000,
      { data: null } as { data: { display_name?: string } | null },
    ),
    withTimeout(
      supabase.from("user_roles").select("role").eq("user_id", userId) as unknown as PromiseLike<{ data: { role: string }[] | null }>,
      4000,
      { data: [] } as { data: { role: string }[] | null },
    ),
  ]);

  const profile = profileRes.data;
  const roles = rolesRes.data ?? [];
  const isAdmin = roles.some((r) => r.role === "admin");

  return {
    id: userId,
    name: profile?.display_name ?? email.split("@")[0] ?? "Learner",
    email,
    role: isAdmin ? "admin" : "student",
  };
}
