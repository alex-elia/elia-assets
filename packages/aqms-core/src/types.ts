export type CheckSeverity = "info" | "warning" | "high_risk";
export type CheckEngine = "deterministic" | "judge";
export type QualityAction = "none" | "warn" | "block_export" | "notify_admin";
export type ExportBlocker = "pdf" | "docx" | "xlsx" | "send";

export interface QualityFlag {
  id: string;
  severity: CheckSeverity;
  engine: CheckEngine;
  message?: string;
}

export interface QualityCheckResult {
  pass: boolean;
  engines: {
    deterministic: CheckSeverity | "pass";
    judge?: CheckSeverity | "pass" | "skipped";
  };
  flags: QualityFlag[];
  scores: Record<string, number>;
  actions: QualityAction[];
  rubric_version: string;
  prompt_version: string;
  run_id: string;
  /** Feature-specific audit envelope (invoice issue gate, etc.). */
  audit?: Record<string, unknown>;
}

export interface QualityRubric {
  version: string;
  goldNames: string[];
}

/** One agent can be rated once per step. Commercial offers: brief, then generate. */
export const ENGINEERING_OFFER_RATING_STEPS = ["brief", "generate"] as const;

export type EngineeringOfferRatingStep = (typeof ENGINEERING_OFFER_RATING_STEPS)[number];

export const ENGINEERING_OFFER_BRIEF_DIMENSIONS = [
  "real_need",
  "firm_scope",
  "questions",
  "risks",
] as const;

/** Offer document scores. `analyse` remains accepted so older rows still save. */
export const ENGINEERING_OFFER_GENERATE_DIMENSIONS = [
  "analyse",
  "cost_grid",
  "form",
  "factual_caution",
] as const;

export const ENGINEERING_OFFER_RATING_FIELDS: Record<
  EngineeringOfferRatingStep,
  readonly string[]
> = {
  brief: ["real_need", "firm_scope", "questions", "risks"],
  generate: ["cost_grid", "form", "factual_caution"],
};

export type EngineeringOfferRatingDimensions = Record<string, number>;

export interface QualityRatingInput {
  rating?: number;
  step?: string;
  dimensions?: Record<string, unknown> | null;
  feedbackText?: string;
}

export interface QualityRatingRecord {
  step: EngineeringOfferRatingStep;
  rating: number;
  dimensions: EngineeringOfferRatingDimensions;
  needsReview: boolean;
  feedbackText: string | null;
}
