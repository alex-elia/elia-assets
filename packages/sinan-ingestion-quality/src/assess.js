/**
 * @param {import('./types.js').IngestionArtifact} artifact
 * @returns {import('./types.js').AssessResult}
 */
export function assess(artifact) {
  /** @type {import('./types.js').QualityCheck[]} */
  const checks = [];

  const body = (artifact.text_body || "").trim();
  if (!body || body.length < 20) {
    checks.push({
      id: "text_body_min_length",
      severity: "block",
      message: "text_body too short or empty",
    });
  } else {
    checks.push({ id: "text_body_min_length", severity: "ok", message: "text_body length ok" });
  }

  if (body.includes("\uFFFD")) {
    checks.push({
      id: "encoding_replacement_char",
      severity: "block",
      message: "text contains Unicode replacement character",
    });
  }

  const navGarbage =
    body.includes("ana sayfa") &&
    (body.includes("türkü sözleri") || /t.rk.\s+s.zleri/i.test(body));
  if (navGarbage) {
    checks.push({
      id: "site_nav_garbage",
      severity: "block",
      message: "text looks like site navigation, not lyrics",
    });
  }

  if (!artifact.source_locator?.trim()) {
    checks.push({
      id: "source_locator",
      severity: "block",
      message: "missing source locator",
    });
  } else {
    checks.push({ id: "source_locator", severity: "ok", message: "source locator present" });
  }

  if (!artifact.rights_status?.trim()) {
    checks.push({
      id: "rights_status",
      severity: "warn",
      message: "rights_status empty",
    });
  } else {
    checks.push({ id: "rights_status", severity: "ok", message: "rights_status set" });
  }

  const thirdParty =
    artifact.source_locator && /^https?:/i.test(artifact.source_locator);
  if (thirdParty && !artifact.rights_evidence?.trim()) {
    checks.push({
      id: "rights_evidence",
      severity: "block",
      message: "third-party source requires rights_evidence",
    });
  }

  const contributors = artifact.contributors || [];
  if (!contributors.length) {
    checks.push({
      id: "contributors",
      severity: "warn",
      message: "no contributors on version",
    });
  } else {
    checks.push({ id: "contributors", severity: "ok", message: "contributors present" });
  }

  if (artifact.bio_summary?.trim()) {
    const bio = artifact.bio_summary.trim();
    if (bio.length > 1200) {
      checks.push({
        id: "bio_summary_length",
        severity: "warn",
        message: "bio_summary very long",
      });
    }
  }

  const okCount = checks.filter((c) => c.severity === "ok").length;
  const warnCount = checks.filter((c) => c.severity === "warn").length;
  const blockCount = checks.filter((c) => c.severity === "block").length;
  const deterministic_score = Math.max(
    0,
    Math.min(100, Math.round((okCount * 100) / Math.max(1, checks.length) - warnCount * 8 - blockCount * 40)),
  );

  return {
    checks,
    deterministic_score,
    has_block: blockCount > 0,
  };
}
