import { createServerClient } from "@supabase/ssr";
import { type NextRequest, type NextResponse } from "next/server";
import { readSupabasePublicConfigFromEnv } from "./config.js";

/**
 * Refreshes the Supabase session and writes auth cookies onto `response`
 * (preserve next-intl redirects/rewrites on the same response object).
 */
export async function refreshSupabaseSession(
  request: NextRequest,
  response: NextResponse,
  env: NodeJS.ProcessEnv = process.env,
): Promise<NextResponse> {
  const config = readSupabasePublicConfigFromEnv(env);
  if (!config) {
    return response;
  }

  const supabase = createServerClient(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        cookiesToSet.forEach(({ name, value, options }) =>
          response.cookies.set(name, value, options),
        );
      },
    },
  });

  try {
    await supabase.auth.getUser();
  } catch (err) {
    if (process.env.NODE_ENV === "development") {
      console.warn(
        "[janissary-auth] session refresh failed:",
        err instanceof Error ? err.message : err,
      );
    }
  }

  return response;
}

/** @deprecated Use refreshSupabaseSession */
export const withSupabaseSessionRefresh = refreshSupabaseSession;
