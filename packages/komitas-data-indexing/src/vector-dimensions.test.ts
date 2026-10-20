import { test } from "node:test";
import assert from "node:assert/strict";
import { normalizeEmbeddingForPgvector } from "./vector-dimensions.js";

test("normalizeEmbeddingForPgvector pads BGE-M3 1024 to 1536", () => {
  const input = Array.from({ length: 1024 }, (_, i) => i * 0.001);
  const out = normalizeEmbeddingForPgvector(input);
  assert.equal(out.length, 1536);
  assert.equal(out[1023], input[1023]);
  assert.equal(out[1024], 0);
});
