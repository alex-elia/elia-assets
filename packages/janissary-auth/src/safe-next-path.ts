/** Same-origin relative path only. Rejects protocol-relative and backslash URLs. */
export function isSafeRelativePath(path: string): boolean {
  if (!path.startsWith("/")) return false;
  if (path.startsWith("//")) return false;
  if (path.includes("\\")) return false;
  return true;
}

export function safeNextPath(next: string | null | undefined, fallback: string): string {
  const value = next?.trim() ?? "";
  return isSafeRelativePath(value) ? value : fallback;
}
