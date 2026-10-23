import test from "node:test";
import assert from "node:assert/strict";
import { hybridRetrieve } from "./rrf-fusion.js";
import { buildHybridRetrieveResult, formatRetrievalContext } from "./format-context.js";

test("hybridRetrieve merges lexical and semantic by version_id", () => {
  const hits = hybridRetrieve({
    query: "yağmur",
    lexical: [
      {
        source: "lexical",
        versionId: "aaaa",
        title: "Lexical A",
        rank: 1,
        excerpt: "yağmur yağar",
      },
    ],
    semantic: [
      {
        source: "semantic",
        versionId: "aaaa",
        rank: 1,
        score: 0.88,
        chunkText: "semantic rain verse",
        documentName: "doc-a",
      },
    ],
    limit: 5,
  });

  assert.equal(hits.length, 1);
  assert.equal(hits[0].versionId, "aaaa");
  assert.deepEqual(hits[0].sources.sort(), ["lexical", "semantic"]);
});

test("formatRetrievalContext includes version_id", () => {
  const result = buildHybridRetrieveResult("test", [
    {
      key: "version:x",
      versionId: "x",
      title: "T",
      fusedScore: 0.03,
      sources: ["lexical"],
      excerpt: "line",
    },
  ]);
  const text = formatRetrievalContext(result);
  assert.match(text, /version_id=x/);
  assert.match(text, /amira-aro/);
});
