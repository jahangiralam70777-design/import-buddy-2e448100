import type { AuthUser } from "@/lib/auth-client";

const DEMO_SESSION_KEY = "edumaster.demo_session";

// TEMP: Demo admin re-enabled for UI walkthrough. Remove before production.
// Note: server-side admin fns still require a real Supabase session +
// admin role, so demo admin can browse admin UI but write actions that hit
// protected server fns will fail without a real Supabase admin account.
export const DEMO_USERS: Record<string, AuthUser & { password: string }> = {
  "demo@student.com": {
    id: "demo-student-001",
    name: "Alex Morgan",
    email: "demo@student.com",
    role: "student",
    password: "Demo@1234",
  },
  "demo@admin.com": {
    id: "demo-admin-001",
    name: "Demo Admin",
    email: "demo@admin.com",
    role: "admin",
    password: "Admin@1234",
  },
};

export function getDemoSession(): AuthUser | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DEMO_SESSION_KEY);
    return raw ? (JSON.parse(raw) as AuthUser) : null;
  } catch {
    return null;
  }
}

export function setDemoSession(user: AuthUser): void {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(DEMO_SESSION_KEY, JSON.stringify(user));
}

export function clearDemoSession(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(DEMO_SESSION_KEY);
}

export function demoSignIn(email: string, password: string): AuthUser {
  const user = DEMO_USERS[email.trim().toLowerCase()];
  if (!user) throw new Error("No demo account found for this email.");
  if (user.password !== password) throw new Error("Incorrect password.");
  const { password: _pw, ...authUser } = user;
  setDemoSession(authUser);
  return authUser;
}
