import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export const MODULE_KEYS = [
  "mcq_practice",
  "quiz",
  "mock_test",
  "flash_cards",
  "short_notes",
  "qns_bank",
  "classes",
] as const;
export type ModuleKey = (typeof MODULE_KEYS)[number];

export type ModuleVisibilityRow = {
  key: ModuleKey;
  label: string;
  hidden: boolean;
  updated_at: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.rpc("has_role", { _user_id: userId, _role: "admin" });
  if (error) throw error;
  if (!data) throw new Error("Forbidden: admin role required");
}

export const listModuleVisibility = createServerFn({ method: "GET" })
  .handler(async () => {
    // Public read using the anon/publishable client so this works without a service role key.
    const { supabase } = await import("@/integrations/supabase/client");
    const { data, error } = await supabase
      .from("module_visibility")
      .select("key,label,hidden,updated_at")
      .order("label");
    if (error) throw error;
    return (data ?? []) as ModuleVisibilityRow[];
  });

const setInput = z.object({
  key: z.enum(MODULE_KEYS),
  hidden: z.boolean(),
});

export const adminSetModuleHidden = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((i: z.infer<typeof setInput>) => setInput.parse(i))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { error } = await context.supabase
      .from("module_visibility")
      .update({ hidden: data.hidden, updated_at: new Date().toISOString() })
      .eq("key", data.key);
    if (error) throw error;
    return { ok: true };
  });
