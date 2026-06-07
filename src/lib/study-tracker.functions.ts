import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const PingSchema = z.object({
  module: z.string().min(1).max(64).regex(/^[a-zA-Z0-9_\-\/]+$/).default("dashboard"),
  delta_seconds: z.number().int().min(0).max(120).default(60),
});

/** Heartbeat: extends the current open session for this module, or opens a new one. */
export const pingStudySession = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data: unknown) => PingSchema.parse(data ?? {}))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;
    const cutoff = new Date(Date.now() - 5 * 60 * 1000).toISOString();

    const { data: open } = await supabase
      .from("study_sessions")
      .select("id,duration_seconds,last_heartbeat_at")
      .eq("user_id", userId)
      .eq("module", data.module)
      .is("ended_at", null)
      .gte("last_heartbeat_at", cutoff)
      .order("last_heartbeat_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (open) {
      await supabase
        .from("study_sessions")
        .update({
          last_heartbeat_at: new Date().toISOString(),
          duration_seconds: (open.duration_seconds ?? 0) + data.delta_seconds,
        })
        .eq("id", open.id);
      return { id: open.id, ok: true };
    }

    const { data: row } = await supabase
      .from("study_sessions")
      .insert({
        user_id: userId,
        module: data.module,
        duration_seconds: data.delta_seconds,
      })
      .select("id")
      .single();
    return { id: row?.id, ok: true };
  });
