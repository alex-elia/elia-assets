import type { QualityCheckResult } from "./types.js";

/** How a human score relates to the automatic check on the same dossier step. */
export type AqmsAgreement = "aligned" | "rubric_weak" | "rubric_strict" | "mixed" | "no_check";

export type AqmsCalibration = {
  aligned: number;
  rubricWeak: number;
  rubricStrict: number;
  mixed: number;
  noCheck: number;
};

export function emptyAqmsCalibration(): AqmsCalibration {
  return { aligned: 0, rubricWeak: 0, rubricStrict: 0, mixed: 0, noCheck: 0 };
}

/**
 * Generate-step scores only. A low score with a clean check means the rubric missed it.
 * A high score with a block means the rubric is too strict. Trust the person.
 */
export function assessAqmsAgreement(args: {
  step?: string | null;
  rating: number;
  check: Pick<QualityCheckResult, "engines" | "flags"> | null;
}): AqmsAgreement {
  if (args.step && args.step !== "generate") return "no_check";
  if (!args.check) return "no_check";
  const deterministic = args.check.engines.deterministic;
  const blocked = deterministic === "high_risk";
  const flagged =
    blocked ||
    deterministic === "warning" ||
    (args.check.flags ?? []).some((flag) => flag.engine === "judge" && flag.severity !== "info");
  if (args.rating <= 2 && !flagged) return "rubric_weak";
  if (args.rating <= 2 && flagged) return "aligned";
  if (args.rating >= 4 && blocked) return "rubric_strict";
  if (args.rating >= 4 && !flagged) return "aligned";
  return "mixed";
}

export function tallyAqmsAgreement(agreements: AqmsAgreement[]): AqmsCalibration {
  const totals = emptyAqmsCalibration();
  for (const agreement of agreements) {
    if (agreement === "aligned") totals.aligned += 1;
    else if (agreement === "rubric_weak") totals.rubricWeak += 1;
    else if (agreement === "rubric_strict") totals.rubricStrict += 1;
    else if (agreement === "mixed") totals.mixed += 1;
    else totals.noCheck += 1;
  }
  return totals;
}

export type AqmsRatedRow = {
  id: string;
  targetType?: string | null;
  step?: string | null;
  rating: number;
  feedbackText?: string | null;
  targetTitle?: string | null;
  accountName?: string | null;
  promptVersion?: string | null;
  rubricVersion?: string | null;
  check: Pick<QualityCheckResult, "engines" | "flags" | "rubric_version"> | null;
};

export type AqmsStepSummary = {
  targetType: string;
  step: string;
  count: number;
  average: number;
  calibration: AqmsCalibration;
};

export type AqmsMismatchCase = {
  id: string;
  agreement: "rubric_weak" | "rubric_strict";
  rating: number;
  targetTitle: string | null;
  accountName: string | null;
  feedbackText: string | null;
  checkFlags: string[];
};

export type AqmsCheckRollup = {
  sampled: number;
  highRisk: number;
  warnings: number;
  clean: number;
  acknowledged: number;
  topFlags: { id: string; count: number }[];
  rubricVersions: string[];
};

export type AqmsPerformance = {
  /** Generated-offer scores only. Briefs are counted apart because they have no dossier gate. */
  generate: AqmsCalibration;
  briefRatings: number;
  steps: AqmsStepSummary[];
  mismatches: AqmsMismatchCase[];
  traces: { promptSaved: number; promptMissing: number };
  checks: AqmsCheckRollup;
};

/** Check that existed when the person scored. A later regeneration must not be paired with an older score. */
export function checkAtRating<T extends { created_at?: string | null }>(
  checks: T[],
  ratedAt: string
): T | null {
  const rated = new Date(ratedAt).getTime();
  if (Number.isNaN(rated)) return null;
  const eligible = checks.filter((row) => {
    const at = new Date(row.created_at ?? "").getTime();
    return !Number.isNaN(at) && at <= rated + 120_000;
  });
  if (!eligible.length) return null;
  eligible.sort((a, b) => new Date(b.created_at ?? "").getTime() - new Date(a.created_at ?? "").getTime());
  return eligible[0] ?? null;
}

const MISMATCH_LIMIT = 30;
const FLAG_LIMIT = 8;

export function summarizeQualityChecks(
  rows: {
    rubricVersion?: string | null;
    acknowledged?: boolean;
    result?: Pick<QualityCheckResult, "engines" | "flags" | "rubric_version"> | null;
  }[]
): AqmsCheckRollup {
  const flagCounts = new Map<string, number>();
  const rubrics = new Set<string>();
  let highRisk = 0;
  let warnings = 0;
  let clean = 0;
  let acknowledged = 0;
  for (const row of rows) {
    const severity = row.result?.engines?.deterministic;
    if (severity === "high_risk") highRisk += 1;
    else if (severity === "warning") warnings += 1;
    else if (severity === "pass") clean += 1;
    if (row.acknowledged) acknowledged += 1;
    const version = row.rubricVersion?.trim() || row.result?.rubric_version?.trim();
    if (version) rubrics.add(version);
    for (const flag of row.result?.flags ?? []) {
      if (!flag.id || flag.severity === "info") continue;
      flagCounts.set(flag.id, (flagCounts.get(flag.id) ?? 0) + 1);
    }
  }
  const topFlags = [...flagCounts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
    .slice(0, FLAG_LIMIT)
    .map(([id, count]) => ({ id, count }));
  return {
    sampled: rows.length,
    highRisk,
    warnings,
    clean,
    acknowledged,
    topFlags,
    rubricVersions: [...rubrics].sort(),
  };
}

/** Dashboard view of AQMS. Counts every supplied score. Lists dossiers where the check and the person disagree. */
export function summarizeAqmsPerformance(ratings: AqmsRatedRow[], checks: AqmsCheckRollup): AqmsPerformance {
  const generate: AqmsAgreement[] = [];
  const mismatches: AqmsMismatchCase[] = [];
  let briefRatings = 0;
  let promptSaved = 0;
  let promptMissing = 0;

  for (const row of ratings) {
    if (row.promptVersion?.trim()) promptSaved += 1;
    else promptMissing += 1;

    const step = row.step ?? "end";
    if (step === "brief") {
      briefRatings += 1;
      continue;
    }
    if (step !== "generate") continue;

    const agreement = assessAqmsAgreement({ step, rating: row.rating, check: row.check });
    generate.push(agreement);
    if (agreement !== "rubric_weak" && agreement !== "rubric_strict") continue;
    if (mismatches.length >= MISMATCH_LIMIT) continue;
    mismatches.push({
      id: row.id,
      agreement,
      rating: row.rating,
      targetTitle: row.targetTitle?.trim() || null,
      accountName: row.accountName?.trim() || null,
      feedbackText: row.feedbackText?.trim() || null,
      checkFlags: (row.check?.flags ?? []).filter((flag) => flag.severity !== "info").map((flag) => flag.id),
    });
  }

  return {
    generate: tallyAqmsAgreement(generate),
    briefRatings,
    steps: summarizeAqmsByStep(ratings),
    mismatches,
    traces: { promptSaved, promptMissing },
    checks,
  };
}

export function summarizeAqmsByStep(ratings: AqmsRatedRow[]): AqmsStepSummary[] {
  const buckets = new Map<string, { targetType: string; step: string; scores: number[]; agreements: AqmsAgreement[] }>();
  for (const row of ratings) {
    const step = row.step ?? "end";
    const targetType = row.targetType ?? "unknown";
    const key = `${targetType}:${step}`;
    const bucket = buckets.get(key) ?? { targetType, step, scores: [], agreements: [] };
    bucket.scores.push(row.rating);
    bucket.agreements.push(assessAqmsAgreement({ step, rating: row.rating, check: row.check }));
    buckets.set(key, bucket);
  }
  return [...buckets.values()]
    .map((bucket) => ({
      targetType: bucket.targetType,
      step: bucket.step,
      count: bucket.scores.length,
      average: bucket.scores.length
        ? Math.round((bucket.scores.reduce((sum, score) => sum + score, 0) / bucket.scores.length) * 10) / 10
        : 0,
      calibration: tallyAqmsAgreement(bucket.agreements),
    }))
    .sort((a, b) => a.targetType.localeCompare(b.targetType) || a.step.localeCompare(b.step));
}
