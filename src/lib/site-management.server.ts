// Server-only helpers for site management (NOT importable from client code).
import type { SupabaseClient } from "@supabase/supabase-js";

export async function assertAdmin(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: SupabaseClient<any>,
  userId: string,
) {
  const { data, error } = await supabase.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  if (error) throw error;
  if (!data) throw new Error("Forbidden: admin role required");
}

export const TARGET_KIND = {
  section: "section" as const,
  setting: "setting" as const,
};

export type TargetKind = (typeof TARGET_KIND)[keyof typeof TARGET_KIND];
