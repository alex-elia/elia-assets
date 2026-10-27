import { assess } from "./assess.js";
import { redresse } from "./redresse.js";
import { score } from "./score.js";
import { decide } from "./decide.js";
import { loadDefaultProfile } from "./profile.js";

/**
 * @param {import('./types.js').IngestionArtifact} artifact
 * @param {{ profile?: import('./types.js').SinanProfile, llmPort?: { complete?: (p: string) => Promise<string> }, skipRedresse?: boolean }} deps
 */
export async function runPipeline(artifact, deps = {}) {
  const profile = deps.profile || loadDefaultProfile();
  let working = { ...artifact };

  const assessBefore = assess(working);
  let redresseResult = { applied: false, patches: [], confidence: 0 };
  if (!deps.skipRedresse) {
    redresseResult = await redresse(working, assessBefore, deps.llmPort || null, { profile });
    if (redresseResult.applied) {
      for (const patch of redresseResult.patches) {
        if (patch.field === "text_body" && typeof patch.value === "string") {
          working.text_body = patch.value;
        }
        if (patch.field === "contributors" && Array.isArray(patch.value)) {
          working.contributors = patch.value;
        }
      }
    }
  }

  const assessAfter = redresseResult.applied ? assess(working) : assessBefore;
  if (
    redresseResult.applied &&
    assessAfter.deterministic_score < assessBefore.deterministic_score
  ) {
    working = { ...artifact };
    redresseResult = { applied: false, patches: [], confidence: 0 };
  }

  const finalAssess = assess(working);
  const scored = score(finalAssess, redresseResult, { profile });
  const decision = decide(scored.score, finalAssess, working, { profile });

  return {
    profile_id: profile.profile_id,
    profile_version: profile.profile_version,
    assess_before: assessBefore,
    assess_after: finalAssess,
    redresse: redresseResult,
    score: scored.score,
    score_breakdown: scored.breakdown,
    decision: decision.decision,
    decision_reasons: decision.reasons,
    artifact_after: working,
  };
}
