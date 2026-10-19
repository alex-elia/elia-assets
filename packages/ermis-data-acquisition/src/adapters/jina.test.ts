import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createJinaPageReader } from "./jina.js";

describe("createJinaPageReader", () => {
  it("returns blocked for private urls without calling fetch", async () => {
    let called = false;
    const reader = createJinaPageReader({
      fetchFn: async () => {
        called = true;
        return new Response("ok");
      },
    });
    const result = await reader.read("http://127.0.0.1/secret");
    assert.equal(result.outcome, "blocked");
    assert.equal(called, false);
  });

  it("maps successful markdown", async () => {
    const reader = createJinaPageReader({
      fetchFn: async () => new Response("# Title\n\nBody", { status: 200 }),
    });
    const result = await reader.read("https://example.com");
    assert.equal(result.outcome, "success");
    assert.match(result.markdown, /Title/);
    assert.ok(result.contentHash.length > 10);
  });
});
