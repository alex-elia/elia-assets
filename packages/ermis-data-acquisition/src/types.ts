export type AcquisitionOutcome =
  | "success"
  | "partial"
  | "blocked"
  | "unavailable"
  | "unsupported";

export type AcquiredSource = {
  requestId: string;
  requestedUrl: string;
  finalUrl: string;
  retrievedAt: string;
  contentType: string;
  markdown: string;
  contentHash: string;
  provider: string;
  extractorVersion: string;
  outcome: AcquisitionOutcome;
  warnings: string[];
};

export type SearchHit = {
  title: string;
  url: string;
  snippet: string;
};

export type SearchResult = {
  requestId: string;
  query: string;
  retrievedAt: string;
  provider: string;
  hits: SearchHit[];
  outcome: AcquisitionOutcome;
  warnings: string[];
};

export type ReadOptions = {
  correlationId?: string;
  timeoutMs?: number;
  maxBytes?: number;
};

export type SearchOptions = {
  correlationId?: string;
  timeoutMs?: number;
  maxResults?: number;
};
