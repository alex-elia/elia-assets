export type SupabasePublicConfig = {
  url: string;
  anonKey: string;
};

export function readSupabasePublicConfigFromEnv(
  env: NodeJS.ProcessEnv = process.env,
): SupabasePublicConfig | null {
  const url =
    env.NEXT_PUBLIC_SUPABASE_URL?.trim() ||
    env.SUPABASE_URL?.trim() ||
    "";
  const anonKey =
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() ||
    env.SUPABASE_ANON_KEY?.trim() ||
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() ||
    "";
  if (!url || !anonKey) return null;
  return { url, anonKey };
}

export function assertSupabasePublicConfig(
  env: NodeJS.ProcessEnv = process.env,
): SupabasePublicConfig {
  const config = readSupabasePublicConfigFromEnv(env);
  if (!config) {
    throw new Error(
      "Janissary: missing NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY (or SUPABASE_URL / SUPABASE_ANON_KEY)",
    );
  }
  return config;
}
