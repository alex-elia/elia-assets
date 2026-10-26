import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { assertSupabasePublicConfig } from "./config.js";

export type CookieStore = {
  getAll(): { name: string; value: string }[];
  set(name: string, value: string, options?: Record<string, unknown>): void;
};

export function createSupabaseServerClient(
  cookieStore: CookieStore,
  env: NodeJS.ProcessEnv = process.env,
) {
  const { url, anonKey } = assertSupabasePublicConfig(env);
  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // setAll from a Server Component without mutable cookies
        }
      },
    },
  });
}

/** Next.js App Router server client (uses `next/headers` cookies). */
export async function createServerSupabaseClient(
  env: NodeJS.ProcessEnv = process.env,
) {
  const cookieStore = await cookies();
  return createSupabaseServerClient(
    {
      getAll: () => cookieStore.getAll(),
      set: (name, value, options) => {
        try {
          cookieStore.set(name, value, options);
        } catch {
          // ignored when called from Server Component
        }
      },
    },
    env,
  );
}
