import type { QualityRubric } from "./types.js";

/** Tiny reader for host `quality/rubric.yaml` (version + gold_names list). */
export function parseHostRubricYaml(raw: string): QualityRubric | null {
  const version = raw.match(/^version:\s*["']?([^"'\n]+)["']?\s*$/m)?.[1]?.trim();
  if (!version) return null;
  const goldNames: string[] = [];
  const lines = raw.split(/\r?\n/);
  let inGold = false;
  for (const line of lines) {
    if (/^gold_names:\s*$/.test(line)) {
      inGold = true;
      continue;
    }
    if (inGold) {
      const item = line.match(/^\s+-\s+(.+)$/);
      if (item) {
        goldNames.push(item[1].trim().replace(/^["']|["']$/g, ""));
        continue;
      }
      if (line.trim() && !line.startsWith(" ") && !line.startsWith("-")) inGold = false;
    }
  }
  return { version, goldNames };
}
