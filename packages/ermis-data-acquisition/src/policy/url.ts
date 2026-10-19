const BLOCKED_HOSTNAMES = new Set([
  "localhost",
  "127.0.0.1",
  "0.0.0.0",
  "::1",
  "metadata.google.internal",
]);

function isPrivateIpv4(host: string): boolean {
  const parts = host.split(".").map((p) => Number.parseInt(p, 10));
  if (parts.length !== 4 || parts.some((n) => Number.isNaN(n))) {
    return false;
  }
  if (parts[0] === 10) return true;
  if (parts[0] === 127) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  return false;
}

export type UrlValidationResult =
  | { ok: true; normalized: string }
  | { ok: false; reason: string };

export function normalizeHttpUrl(input: string): UrlValidationResult {
  let u = input.trim();
  if (!u) {
    return { ok: false, reason: "empty_url" };
  }
  if (!/^https?:\/\//i.test(u)) {
    u = `https://${u}`;
  }
  let parsed: URL;
  try {
    parsed = new URL(u);
  } catch {
    return { ok: false, reason: "invalid_url" };
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return { ok: false, reason: "unsupported_protocol" };
  }
  const host = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.has(host) || host.endsWith(".localhost")) {
    return { ok: false, reason: "blocked_host" };
  }
  if (isPrivateIpv4(host)) {
    return { ok: false, reason: "private_network" };
  }
  return { ok: true, normalized: parsed.toString() };
}
