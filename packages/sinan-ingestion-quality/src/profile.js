import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

/** @typedef {import('./types.js').SinanProfile} SinanProfile */

/**
 * @param {string} [profileId]
 * @returns {SinanProfile}
 */
export function loadDefaultProfile(profileId = "asikz-ingestion") {
  const file = path.join(__dirname, "..", "profiles", `${profileId}.json`);
  const raw = JSON.parse(fs.readFileSync(file, "utf8"));
  return raw;
}
