import test from "node:test";
import assert from "node:assert/strict";
import {
  assessAqmsAgreement,
  checkAtRating,
  summarizeAqmsPerformance,
  summarizeQualityChecks,
} from "./calibration.js";

test("a low score on a clean check means the rubric missed it", () => {
  const check = {
    pass: true,
    engines: { deterministic: "pass" as const, judge: "skipped" as const },
    flags: [],
    scores: {},
    actions: ["none" as const],
    rubric_version: "1.0.0",
    prompt_version: "1.0.0",
    run_id: "",
  };
  assert.equal(assessAqmsAgreement({ step: "generate", rating: 2, check }), "rubric_weak");
  assert.equal(assessAqmsAgreement({ step: "brief", rating: 2, check }), "no_check");

  const blocked = {
    engines: { deterministic: "high_risk" as const },
    flags: [{ id: "unsourced_rei", severity: "high_risk" as const, engine: "deterministic" as const }],
    rubric_version: "1.0.0",
  };
  const performance = summarizeAqmsPerformance(
    [
      {
        id: "low",
        step: "generate",
        rating: 2,
        feedbackText: "thin",
        targetTitle: "Gare",
        accountName: "Alex",
        promptVersion: null,
        check,
      },
      {
        id: "high",
        step: "generate",
        rating: 5,
        accountName: "Alex",
        promptVersion: "1.0.0",
        check: blocked,
      },
      { id: "brief", step: "brief", rating: 2, check },
    ],
    summarizeQualityChecks([
      { rubricVersion: "1.0.0", acknowledged: false, result: check },
      { rubricVersion: "1.0.0", acknowledged: true, result: blocked },
    ])
  );
  assert.equal(performance.generate.rubricWeak, 1);
  assert.equal(performance.generate.rubricStrict, 1);
  assert.equal(performance.generate.noCheck, 0);
  assert.equal(performance.briefRatings, 1);
  assert.equal(performance.mismatches.length, 2);
  assert.equal(performance.traces.promptSaved, 1);
  assert.equal(performance.traces.promptMissing, 2);
  assert.equal(performance.checks.acknowledged, 1);
  assert.equal(performance.checks.topFlags[0]?.id, "unsourced_rei");
});

test("an older score is not paired with a later check", () => {
  const older = { id: "old", created_at: "2026-09-24T12:00:00.000Z" };
  const newer = { id: "new", created_at: "2026-09-25T12:00:00.000Z" };
  assert.equal(checkAtRating([newer, older], "2026-09-24T12:30:00.000Z")?.id, "old");
  assert.equal(checkAtRating([newer], "2026-09-24T12:30:00.000Z"), null);
});
