/**
 * @param {number} compositeScore
 * @param {import('./types.js').AssessResult} finalAssess
 * @param {import('./types.js').IngestionArtifact} artifact
 * @param {{ profile: import('./types.js').SinanProfile }} options
 */
export function decide(compositeScore, finalAssess, artifact, options) {
  const profile = options.profile;
  /** @type {string[]} */
  const reasons = [];

  if (finalAssess.has_block) {
    reasons.push("blocking checks remain after redressement");
    return { decision: "hold", reasons };
  }

  const rights = (artifact.rights_status || "").toLowerCase();
  if (profile.deny_auto_publish_rights?.includes(rights)) {
    reasons.push(`rights_status ${rights} denies auto-publish`);
    return { decision: "hold", reasons };
  }

  if (compositeScore < profile.publish_threshold) {
    reasons.push(`score ${compositeScore} below publish_threshold ${profile.publish_threshold}`);
    return { decision: "hold", reasons };
  }

  return { decision: "publish", reasons: ["score and policy pass"] };
}
