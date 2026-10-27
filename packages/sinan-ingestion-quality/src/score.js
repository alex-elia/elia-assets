/**
 * @param {import('./types.js').AssessResult} assessResult
 * @param {import('./types.js').RedresseResult} redresseResult
 * @param {{ profile: import('./types.js').SinanProfile }} options
 */
export function score(assessResult, redresseResult, options) {
  const w = options.profile.weights || {
    deterministic: 0.75,
    redresse: 0.15,
    schema: 0.1,
  };
  const redresseBonus = redresseResult.applied
    ? Math.round((redresseResult.confidence || 0) * 100)
    : 0;
  const schemaOk = redresseResult.error ? 0 : 100;
  const composite = Math.round(
    assessResult.deterministic_score * w.deterministic +
      redresseBonus * w.redresse +
      schemaOk * w.schema,
  );
  return {
    score: Math.max(0, Math.min(100, composite)),
    breakdown: {
      deterministic: assessResult.deterministic_score,
      redresse: redresseBonus,
      schema: schemaOk,
    },
  };
}
