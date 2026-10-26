/**
 * Client-safe exports only. Server helpers: `@elia/janissary-auth/supabase/server`.
 * Edge middleware: `@elia/janissary-auth/supabase/middleware`.
 */
export {
  assertSupabasePublicConfig,
  readSupabasePublicConfigFromEnv,
  type SupabasePublicConfig,
} from "./config.js";
export { createBrowserSupabaseClient } from "./browser.js";
