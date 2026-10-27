import test from "node:test";
import assert from "node:assert/strict";
import { parseHostRubricYaml } from "./rubric-parse.js";

test("host rubric yaml supplies version and gold names", () => {
  const rubric = parseHostRubricYaml(`version: host-1.2.0\ngold_names:\n  - Example Client SA\n`);
  assert.equal(rubric?.version, "host-1.2.0");
  assert.deepEqual(rubric?.goldNames, ["Example Client SA"]);
});
