/**
 * Live smoke: search (if SEARXNG_BASE_URL) then read first hit, else read EDA_SMOKE_URL.
 */
import { createEdaClientFromEnv } from "../dist/from-env.js";
import { searchAndReadPages } from "../dist/workflows/search-and-read.js";

const testUrl = process.env.EDA_SMOKE_URL ?? "https://example.com";
const testQuery = process.env.EDA_SMOKE_QUERY ?? "example domain documentation";

const eda = createEdaClientFromEnv(process.env);

console.log("[eda-smoke] reader:", eda.readerId, "search:", eda.searchProviderId ?? "none");

let ok = true;

if (eda.searchProviderId) {
  const { search, pages } = await searchAndReadPages(eda, testQuery, { maxHits: 1 });
  console.log("[eda-smoke] search", {
    outcome: search.outcome,
    hits: search.hits.length,
    first: search.hits[0]?.url,
    warnings: search.warnings,
  });
  const page = pages[0];
  if (page) {
    console.log("[eda-smoke] read (from search)", {
      outcome: page.outcome,
      url: page.finalUrl,
      bytes: page.markdown.length,
      warnings: page.warnings,
    });
    if (page.outcome !== "success" && page.outcome !== "partial") {
      ok = false;
    }
  } else if (search.outcome !== "success" && search.outcome !== "partial") {
    ok = false;
  }
} else {
  const read = await eda.read(testUrl);
  console.log("[eda-smoke] read", {
    outcome: read.outcome,
    provider: read.provider,
    bytes: read.markdown.length,
    hash: read.contentHash.slice(0, 12),
    warnings: read.warnings,
  });
  if (read.outcome !== "success" && read.outcome !== "partial") {
    ok = false;
  }
}

if (!ok) {
  process.exitCode = 1;
}
