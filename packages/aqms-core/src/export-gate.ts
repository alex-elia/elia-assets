import type { QualityCheckResult } from "./types.js";
import { checkBlocksExport } from "./run-checks.js";

export function exportBlockedByCheck(row: {
  result: QualityCheckResult | null;
  acknowledgedAt: string | null;
} | null): boolean {
  if (!row?.result) return false;
  if (row.acknowledgedAt) return false;
  return checkBlocksExport(row.result);
}
