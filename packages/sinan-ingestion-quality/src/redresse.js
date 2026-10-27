/**
 * @typedef {import('./types.js').IngestionArtifact} IngestionArtifact
 * @typedef {import('./types.js').AssessResult} AssessResult
 * @typedef {import('./types.js').RedresseResult} RedresseResult
 * @typedef {import('./types.js').SinanProfile} SinanProfile
 */

/**
 * @param {IngestionArtifact} artifact
 * @param {AssessResult} assessResult
 * @param {{ complete?: (prompt: string) => Promise<string> } | null} llmPort
 * @param {{ profile: SinanProfile }} options
 * @returns {Promise<RedresseResult>}
 */
export async function redresse(artifact, assessResult, llmPort, options) {
  if (!llmPort?.complete) {
    return { applied: false, patches: [], confidence: 0 };
  }
  if (assessResult.has_block) {
    const fixableOnly = assessResult.checks.every(
      (c) => c.severity !== "block" || c.id === "encoding_replacement_char",
    );
    if (!fixableOnly) {
      return { applied: false, patches: [], confidence: 0 };
    }
  }

  const prompt = `You correct ingested folk poem metadata for a catalog. Return JSON only:
{
  "patches": [{"field":"text_body|titles|contributors","value":...,"reason":"..."}],
  "confidence": 0-1
}
Rules: fix whitespace and stanza breaks only; do not invent poet names or dates; do not add verses.
Current text (excerpt): ${(artifact.text_body || "").slice(0, 800)}
Issues: ${assessResult.checks.filter((c) => c.severity !== "ok").map((c) => c.id).join(", ")}`;

  try {
    const raw = await llmPort.complete(prompt);
    const parsed = JSON.parse(raw.replace(/^```json\s*/i, "").replace(/```\s*$/i, ""));
    const allowed = new Set(options.profile.allowed_redresse_fields || []);
    const patches = (parsed.patches || []).filter((p) => allowed.has(p.field));
    return {
      applied: patches.length > 0,
      patches,
      raw_model_json: raw.slice(0, 4000),
      confidence: Number(parsed.confidence) || 0.5,
    };
  } catch (err) {
    return {
      applied: false,
      patches: [],
      error: err instanceof Error ? err.message : String(err),
      confidence: 0,
    };
  }
}
