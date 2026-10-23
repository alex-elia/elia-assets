import type { FusedRetrievalHit, HybridRetrieveResult } from "./types.js";
import { ARO_METHOD_VERSION } from "./types.js";

export function formatRetrievalContext(result: HybridRetrieveResult): string {
  const lines = [
    `Amira retrieval orchestration (${result.methodVersion}) for query: "${result.query}"`,
    "Use only evidence below. Cite version_id when present. Respect rights_status and availability.",
  ];

  if (result.limitations.length) {
    lines.push(`Limitations: ${result.limitations.join(" ")}`);
  }

  if (!result.hits.length) {
    lines.push("No corpus or KDI matches. Say so honestly; suggest /catalog.");
    return lines.join("\n");
  }

  for (const [i, hit] of result.hits.entries()) {
    lines.push("");
    lines.push(
      `Hit ${i + 1} (fused=${hit.fusedScore.toFixed(4)}, sources=${hit.sources.join("+")}):`,
    );
    if (hit.title) {
      lines.push(`title=${hit.title}`);
    }
    if (hit.versionId) {
      lines.push(`version_id=${hit.versionId}`);
    }
    if (hit.rightsStatus) {
      lines.push(`rights_status=${hit.rightsStatus}`);
    }
    if (hit.availability) {
      lines.push(`availability=${hit.availability}`);
    }
    if (hit.sourceLocator) {
      lines.push(`source_locator=${hit.sourceLocator}`);
    }
    if (hit.documentName) {
      lines.push(`kdi_document=${hit.documentName}`);
    }
    if (hit.chunkText) {
      lines.push("semantic_excerpt:", hit.chunkText.slice(0, 900));
    }
    if (hit.excerpt) {
      lines.push("lexical_excerpt:", hit.excerpt.slice(0, 900));
    }
  }

  return lines.join("\n");
}

export function buildHybridRetrieveResult(
  query: string,
  hits: FusedRetrievalHit[],
  limitations: string[] = [],
): HybridRetrieveResult {
  return {
    methodVersion: ARO_METHOD_VERSION,
    query,
    hits,
    limitations,
  };
}
