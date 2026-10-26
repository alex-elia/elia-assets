import type { Principal } from "../types.js";
import { createServerSupabaseClient } from "./server.js";

export async function optionalUser(
  env: NodeJS.ProcessEnv = process.env,
): Promise<Principal> {
  const supabase = await createServerSupabaseClient(env);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { kind: "anonymous" };
  }
  return { kind: "user", id: user.id, email: user.email };
}

export async function requireUser(
  env: NodeJS.ProcessEnv = process.env,
): Promise<
  | { ok: true; principal: Extract<Principal, { kind: "user" }>; supabase: Awaited<ReturnType<typeof createServerSupabaseClient>> }
  | { ok: false; status: 401; message: string }
> {
  const supabase = await createServerSupabaseClient(env);
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) {
    return { ok: false, status: 401, message: "Unauthorized" };
  }
  return {
    ok: true,
    principal: { kind: "user", id: user.id, email: user.email },
    supabase,
  };
}
