export const CHAT_MAX_USER_TURNS = Number(process.env.CHAT_MAX_USER_TURNS ?? 8);
export const CHAT_MAX_MESSAGE_CHARS = Number(
  process.env.CHAT_MAX_MESSAGE_CHARS ?? 2000,
);
export const CHAT_MAX_HISTORY = Number(process.env.CHAT_MAX_HISTORY ?? 12);
export const CHAT_HOURLY_IP_LIMIT = Number(
  process.env.CHAT_HOURLY_IP_LIMIT ?? 20,
);

type Bucket = { count: number; resetAt: number };

const ipBuckets = new Map<string, Bucket>();

function hourWindowMs(): number {
  return 60 * 60 * 1000;
}

export function getClientIpFromHeaders(headerList: Headers): string {
  const forwarded = headerList.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return headerList.get("x-real-ip")?.trim() || "unknown";
}

export function getClientIp(request: Request): string {
  return getClientIpFromHeaders(request.headers);
}

export function isSameSiteRequest(request: Request): boolean {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (!siteUrl) return true;

  let host: string;
  try {
    host = new URL(siteUrl).host;
  } catch {
    return true;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    try {
      return new URL(origin).host === host;
    } catch {
      return false;
    }
  }

  const referer = request.headers.get("referer");
  if (referer) {
    try {
      return new URL(referer).host === host;
    } catch {
      return false;
    }
  }

  return process.env.NODE_ENV !== "production";
}

export function countUserTurns(messages: { role: string }[]): number {
  return messages.filter((message) => message.role === "user").length;
}

export function checkHourlyIpLimit(ip: string): boolean {
  const limit = CHAT_HOURLY_IP_LIMIT;
  if (limit <= 0) return true;

  const now = Date.now();
  const current = ipBuckets.get(ip);

  if (!current || current.resetAt <= now) {
    ipBuckets.set(ip, { count: 1, resetAt: now + hourWindowMs() });
    return true;
  }

  if (current.count >= limit) {
    return false;
  }

  current.count += 1;
  ipBuckets.set(ip, current);
  return true;
}
