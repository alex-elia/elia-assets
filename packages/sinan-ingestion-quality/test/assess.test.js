import { test } from "node:test";
import assert from "node:assert/strict";
import { assess, runPipeline } from "../src/index.js";

test("assess blocks empty body", () => {
  const r = assess({ version_id: "x", text_body: "", source_locator: "https://a.com/x" });
  assert.equal(r.has_block, true);
});

test("assess passes minimal valid artifact", () => {
  const body = "Uzun ince bir yoldayım\nGidiyorum gündüz gece\n".repeat(2);
  const r = assess({
    version_id: "x",
    text_body: body,
    source_locator: "https://example.com/song",
    rights_status: "permission_granted",
    rights_evidence: "editorial pilot",
    contributors: [{ id: "p1", name: "Test", role: "author" }],
  });
  assert.equal(r.has_block, false);
  assert.ok(r.deterministic_score >= 70);
});

test("runPipeline hold without llm when blocks", async () => {
  const out = await runPipeline(
    { version_id: "x", text_body: "short", source_locator: "" },
    { skipRedresse: true },
  );
  assert.equal(out.decision, "hold");
});
