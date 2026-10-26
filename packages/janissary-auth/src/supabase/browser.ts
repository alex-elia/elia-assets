import { createBrowserClient } from "@supabase/ssr";
import { assertSupabasePublicConfig, type SupabasePublicConfig } from "./config.js";

export function createBrowserSupabaseClient(
  configOrEnv?: SupabasePublicConfig | NodeJS.ProcessEnv,
) {
  const config =
    configOrEnv && "url" in configOrEnv && "anonKey" in configOrEnv
      ? { url: String(configOrEnv.url), anonKey: String(configOrEnv.anonKey) }
      : assertSupabasePublicConfig((configOrEnv as NodeJS.ProcessEnv | undefined) ?? process.env);
  return createBrowserClient(config.url, config.anonKey);
}
