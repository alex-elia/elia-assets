import type { CheckSeverity, QualityCheckResult, QualityFlag } from "./types.js";

const SEVERITY_RANK: Record<CheckSeverity | "pass", number> = {
  pass: 0,
  info: 1,
  warning: 2,
  high_risk: 3,
};

export function worstSeverity(flags: QualityFlag[]): CheckSeverity | "pass" {
  let worst: CheckSeverity | "pass" = "pass";
  for (const flag of flags) {
    if (SEVERITY_RANK[flag.severity] > SEVERITY_RANK[worst]) worst = flag.severity;
  }
  return worst;
}

/** Deterministic checks first. The judge checklist is merged later and never blocks export. */
export function finalizeCheckResult(args: {
  flags: QualityFlag[];
  rubricVersion: string;
  promptVersion: string;
  runId?: string;
}): QualityCheckResult {
  const deterministic = worstSeverity(args.flags);
  const actions =
    deterministic === "high_risk"
      ? (["block_export"] as const)
      : deterministic === "warning" || deterministic === "info"
        ? (["warn"] as const)
        : (["none"] as const);

  return {
    pass: deterministic === "pass",
    engines: { deterministic, judge: "skipped" },
    flags: args.flags,
    scores: {},
    actions: [...actions],
    rubric_version: args.rubricVersion,
    prompt_version: args.promptVersion,
    run_id: args.runId ?? "",
  };
}

export function checkBlocksExport(result: Pick<QualityCheckResult, "actions"> | null | undefined): boolean {
  return Boolean(result?.actions?.includes("block_export"));
}
