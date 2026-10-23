export const ARO_METHOD_VERSION = "amira-aro-v0.1";

export type RetrievalSource = "lexical" | "semantic";

export type LexicalRetrievalHit = {
  source: "lexical";
  versionId: string;
  title?: string | null;
  rank: number;
  rightsStatus?: string | null;
  availability?: string | null;
  excerpt?: string | null;
  sourceLocator?: string | null;
};

export type SemanticRetrievalHit = {
  source: "semantic";
  rank: number;
  score: number;
  chunkText: string;
  documentId?: string | null;
  documentName?: string | null;
  versionId?: string | null;
  chunkIndex?: number | null;
};

export type FusedRetrievalHit = {
  key: string;
  versionId?: string | null;
  title?: string | null;
  fusedScore: number;
  lexicalRank?: number;
  semanticRank?: number;
  semanticScore?: number;
  excerpt?: string | null;
  chunkText?: string | null;
  documentId?: string | null;
  documentName?: string | null;
  rightsStatus?: string | null;
  availability?: string | null;
  sourceLocator?: string | null;
  sources: RetrievalSource[];
};

export type HybridRetrieveInput = {
  query: string;
  lexical: LexicalRetrievalHit[];
  semantic: SemanticRetrievalHit[];
  limit?: number;
  rrfK?: number;
};

export type HybridRetrieveResult = {
  methodVersion: string;
  query: string;
  hits: FusedRetrievalHit[];
  limitations: string[];
};
