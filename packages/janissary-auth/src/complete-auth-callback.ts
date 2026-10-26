import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { isSafeRelativePath, safeNextPath } from "./safe-next-path.js";

const EMAIL_OTP_TYPES = [
  "email",
  "signup",
  "recovery",
  "invite",
  "magiclink",
  "email_change",
] as const;

type EmailOtpType = (typeof EMAIL_OTP_TYPES)[number];

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return Boolean(value && EMAIL_OTP_TYPES.includes(value as EmailOtpType));
}

export type CompleteAuthCallbackOptions = {
  /** Used when `next` is missing or unsafe */
  defaultNext: string;
  /** Path for redirect on failure (same origin), e.g. `/auth/error` */
  errorPath: string;
  /**
   * Optional hook after a successful session exchange (e.g. bootstrap app profile).
   * Errors are logged but do not fail the redirect.
   */
  afterSessionEstablished?: (
    supabase: SupabaseClient,
    context: { type: string | null },
  ) => Promise<void>;
};

/**
 * Completes Supabase email / OAuth callback (`code` or `token_hash` + `type`).
 */
export async function completeAuthCallback(
  request: Request,
  supabase: SupabaseClient,
  options: CompleteAuthCallbackOptions,
): Promise<NextResponse> {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const next = safeNextPath(requestUrl.searchParams.get("next"), options.defaultNext);

  let errorMessage: string | null = null;

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (error) errorMessage = error.message;
  } else if (tokenHash && isEmailOtpType(type)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });
    if (error) errorMessage = error.message;
  } else {
    errorMessage = "Missing auth code";
  }

  if (errorMessage) {
    const errorUrl = new URL(options.errorPath, requestUrl.origin);
    errorUrl.searchParams.set("reason", errorMessage);
    if (type === "recovery" || type === "invite") {
      errorUrl.searchParams.set("flow", "recovery");
    }
    return NextResponse.redirect(errorUrl);
  }

  if (options.afterSessionEstablished) {
    try {
      await options.afterSessionEstablished(supabase, { type });
    } catch (err) {
      console.error("[janissary-auth] afterSessionEstablished failed:", err);
    }
  }

  const destination = isSafeRelativePath(next) ? next : options.defaultNext;
  return NextResponse.redirect(new URL(destination, requestUrl.origin));
}
