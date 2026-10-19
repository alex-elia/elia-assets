import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { normalizeHttpUrl } from "./url.js";

describe("normalizeHttpUrl", () => {
  it("adds https when missing", () => {
    const result = normalizeHttpUrl("example.com/path");
    assert.equal(result.ok, true);
    if (result.ok) {
      assert.equal(result.normalized, "https://example.com/path");
    }
  });

  it("blocks localhost", () => {
    const result = normalizeHttpUrl("http://localhost/admin");
    assert.equal(result.ok, false);
  });

  it("blocks private ipv4", () => {
    const result = normalizeHttpUrl("http://192.168.1.1/");
    assert.equal(result.ok, false);
  });
});
