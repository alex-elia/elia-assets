import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createSearxngSearchProvider } from "./searxng.js";

describe("createSearxngSearchProvider", () => {
  it("maps json results to hits", async () => {
    const provider = createSearxngSearchProvider({
      baseUrl: "http://127.0.0.1:8080",
      fetchFn: async () =>
        new Response(
          JSON.stringify({
            results: [{ title: "A", url: "https://a.test", content: "snippet" }],
          }),
          { status: 200 },
        ),
    });
    const result = await provider.search("hello");
    assert.equal(result.outcome, "success");
    assert.equal(result.hits.length, 1);
    assert.equal(result.hits[0].url, "https://a.test");
  });
});
