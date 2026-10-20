import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkText } from "./chunking.js";

test("chunkText returns non-empty chunks and respects maxChunks", () => {
  const text = "word ".repeat(500);
  const chunks = chunkText(text, { chunkSize: 100, overlap: 20, maxChunks: 3 });
  assert.equal(chunks.length, 3);
  assert.ok(chunks[0].content.length > 0);
  assert.equal(chunks[0].chunkIndex, 0);
});
