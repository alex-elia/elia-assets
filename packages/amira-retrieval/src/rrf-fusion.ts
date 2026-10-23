import type { FusedRetrievalHit, HybridRetrieveInput, LexicalRetrievalHit, SemanticRetrievalHit } from "./types.js";

function hitKey(hit: LexicalRetrievalHit | SemanticRetrievalHit): string {
  if ("versionId" in hit && hit.versionId) {
    return `version:${hit.versionId}`;
  }
  if (hit.source === "semantic" && hit.documentId) {
    return `document:${hit.documentId}:${hit.chunkIndex ?? 0}`;
  }
  return `semantic:${hit.rank}`;
}

/**
 * Reciprocal rank fusion (Cormack et al.). Stable merge of lexical + semantic lists.
 */
export function hybridRetrieve(input: HybridRetrieveInput): FusedRetrievalHit[] {
  const k = input.rrfK ?? 60;
  const limit = Math.max(1, Math.min(input.limit ?? 8, 20));
  const scores = new Map<string, number>();
  const fused = new Map<string, FusedRetrievalHit>();

  const addLexical = (hit: LexicalRetrievalHit) => {
    const key = hitKey(hit);
    const rrf = 1 / (k + hit.rank);
    scores.set(key, (scores.get(key) ?? 0) + rrf);
    const existing = fused.get(key);
    fused.set(key, {
      key,
      versionId: hit.versionId,
      title: hit.title ?? existing?.title,
      fusedScore: scores.get(key) ?? rrf,
      lexicalRank: hit.rank,
      semanticRank: existing?.semanticRank,
      semanticScore: existing?.semanticScore,
      excerpt: hit.excerpt ?? existing?.excerpt,
      chunkText: existing?.chunkText,
      documentId: existing?.documentId,
      documentName: existing?.documentName,
      rightsStatus: hit.rightsStatus ?? existing?.rightsStatus,
      availability: hit.availability ?? existing?.availability,
      sourceLocator: hit.sourceLocator ?? existing?.sourceLocator,
      sources: [...new Set([...(existing?.sources ?? []), "lexical" as const])],
    });
  };

  const addSemantic = (hit: SemanticRetrievalHit) => {
    const key = hit.versionId ? `version:${hit.versionId}` : hitKey(hit);
    const rrf = 1 / (k + hit.rank);
    scores.set(key, (scores.get(key) ?? 0) + rrf);
    const existing = fused.get(key);
    fused.set(key, {
      key,
      versionId: hit.versionId ?? existing?.versionId,
      title: existing?.title,
      fusedScore: scores.get(key) ?? rrf,
      lexicalRank: existing?.lexicalRank,
      semanticRank: hit.rank,
      semanticScore: hit.score,
      excerpt: existing?.excerpt,
      chunkText: hit.chunkText,
      documentId: hit.documentId ?? existing?.documentId,
      documentName: hit.documentName ?? existing?.documentName,
      rightsStatus: existing?.rightsStatus,
      availability: existing?.availability,
      sourceLocator: existing?.sourceLocator,
      sources: [...new Set([...(existing?.sources ?? []), "semantic" as const])],
    });
  };

  for (const hit of input.lexical) {
    addLexical(hit);
  }
  for (const hit of input.semantic) {
    addSemantic(hit);
  }

  for (const [key, row] of fused) {
    row.fusedScore = scores.get(key) ?? row.fusedScore;
  }

  return [...fused.values()]
    .sort((a, b) => b.fusedScore - a.fusedScore)
    .slice(0, limit);
}
