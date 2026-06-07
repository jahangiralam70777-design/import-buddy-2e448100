import { supabase } from "@/integrations/supabase/client";
import type { AppRole } from "@/lib/app-data";

export async function signInWithEmail(email: string, password: string) {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw error;
  return data;
}

export async function signUpWithEmail(input: { email: string; password: string; displayName?: string }) {
  const redirectTo = typeof window !== "undefined" ? `${window.location.origin}/dashboard` : undefined;
  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
    options: {
      emailRedirectTo: redirectTo,
      data: input.displayName ? { display_name: input.displayName } : undefined,
    },
  });
  if (error) throw error;
  return data;
}

export async function signOut() {
  await supabase.auth.signOut();
}

export async function fetchSessionUser(): Promise<{ name: string; email: string; role: AppRole } | null> {
  const { data: sessionData } = await supabase.auth.getSession();
  const session = sessionData.session;
  if (!session?.user) return null;
  const userId = session.user.id;
  const email = session.user.email ?? "";

  const [{ data: profile }, { data: roles }] = await Promise.all([
    supabase.from("profiles").select("display_name").eq("id", userId).maybeSingle(),
    supabase.from("user_roles").select("role").eq("user_id", userId),
  ]);

  const isAdmin = (roles ?? []).some((r) => r.role === "admin");
  return {
    name: profile?.display_name ?? email.split("@")[0] ?? "Learner",
    email,
    role: isAdmin ? "admin" : "student",
  };
}

// Legacy helper kept for any remaining demo forms; resolves with a payload echo.
export async function fakeSubmit<T>(payload: T) {
  return new Promise<{ ok: true; payload: T; id: string }>((resolve) =>
    setTimeout(() => resolve({ ok: true, payload, id: crypto.randomUUID() }), 400),
  );
}
