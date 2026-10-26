import assert from "node:assert/strict";
import { test } from "node:test";
import { isSafeRelativePath, safeNextPath } from "../dist/safe-next-path.js";

test("isSafeRelativePath rejects open redirects", () => {
  assert.equal(isSafeRelativePath("/account"), true);
  assert.equal(isSafeRelativePath("//evil.com"), false);
  assert.equal(isSafeRelativePath("https://evil.com"), false);
  assert.equal(isSafeRelativePath("/path\\evil"), false);
});

test("safeNextPath falls back", () => {
  assert.equal(safeNextPath(null, "/tr/account"), "/tr/account");
  assert.equal(safeNextPath("//x", "/en/signup"), "/en/signup");
});
