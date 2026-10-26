import { createBrowserClient } from "@supabase/ssr";
import { assertSupabasePublicConfig } from "./config.js";

export function createBrowserSupabaseClient(
  env: NodeJS.ProcessEnv = process.env,
) {
  const { url, anonKey } = assertSupabasePublicConfig(env);
  return createBrowserClient(url, anonKey);
}
