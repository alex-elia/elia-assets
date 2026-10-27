import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.env.ELIA_ASSETS_ENSURE_SKIP === "1" || process.env.ELIA_SITE_TOOLS_ENSURE_SKIP === "1") {
  process.exit(0);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const dirNames = ["elia-assets", "elia-site-tools"];

function resolveLocalDir() {
  for (const name of dirNames) {
    const candidate = path.join(root, name);
    if (fs.existsSync(path.join(candidate, "package.json"))) {
      return { name, path: candidate };
    }
  }
  return { name: dirNames[0], path: path.join(root, dirNames[0]) };
}

function resolveSiblingDir() {
  for (const name of dirNames) {
    const candidate = path.join(root, "..", name);
    if (fs.existsSync(path.join(candidate, "package.json"))) {
      return { name, path: candidate };
    }
  }
  return null;
}

const repo =
  process.env.ELIA_ASSETS_REPO ??
  process.env.ELIA_SITE_TOOLS_REPO ??
  "https://github.com/alex-elia/elia-assets.git";
const ref =
  process.env.ELIA_ASSETS_REF?.trim() ||
  process.env.ELIA_SITE_TOOLS_REF?.trim() ||
  "";

function hasBuiltPackages(dir) {
  return (
    fs.existsSync(path.join(dir, "packages", "agent-next", "dist", "index.js")) &&
    fs.existsSync(
      path.join(dir, "packages", "ermis-data-acquisition", "dist", "index.js"),
    ) &&
    fs.existsSync(path.join(dir, "packages", "aqms-core", "dist", "index.js"))
  );
}

function isValidRoot(dir) {
  return fs.existsSync(path.join(dir, "package.json"));
}

function removeIfPresent(dir) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

function run(cmd, cwd = root, extraEnv = {}) {
  execSync(cmd, {
    cwd,
    stdio: "inherit",
    env: {
      ...process.env,
      ELIA_ASSETS_ENSURE_SKIP: "1",
      ELIA_SITE_TOOLS_ENSURE_SKIP: "1",
      ...extraEnv,
    },
  });
}

function runAssetsNpm(args, cwd) {
  run(`npm ${args.join(" ")}`, cwd);
}

function linkSiblingAssets(siblingPath, targetName) {
  const target = path.join(root, targetName);
  removeIfPresent(target);
  if (process.platform === "win32") {
    run(`cmd /c mklink /J "${target}" "${siblingPath}"`);
  } else {
    fs.symlinkSync(siblingPath, target, "dir");
  }
}

function cloneAssetsRepo(targetName) {
  const target = path.join(root, targetName);
  removeIfPresent(target);
  console.log(
    `[ensure-elia-assets] Cloning ${repo}${ref ? ` @ ${ref}` : ""} → ./${targetName}`,
  );
  const cloneArgs = ["clone", "--depth", "1"];
  if (ref) cloneArgs.push("--branch", ref);
  cloneArgs.push(repo, targetName);
  run(`git ${cloneArgs.join(" ")}`, root, { ELIA_ASSETS_ENSURE_SKIP: "0" });
}

function dropInvalidLegacyCheckout() {
  for (const legacyName of ["elia-site-tools"]) {
    const legacyPath = path.join(root, legacyName);
    if (!fs.existsSync(legacyPath)) continue;
    if (legacyName === "elia-assets") continue;
    if (!isValidRoot(legacyPath)) {
      console.log(`[ensure-elia-assets] Removing invalid ./${legacyName}`);
      removeIfPresent(legacyPath);
    }
  }
}

function ensureAssetsRoot() {
  dropInvalidLegacyCheckout();

  const siblingAssets = path.join(root, "..", "elia-assets");
  if (fs.existsSync(siblingAssets) && isValidRoot(siblingAssets)) {
    const preferredLocal = path.join(root, "elia-assets");
    if (!isValidRoot(preferredLocal)) {
      console.log(
        `[ensure-elia-assets] Linking local sibling ${siblingAssets} → ./elia-assets`,
      );
      linkSiblingAssets(siblingAssets, "elia-assets");
    }
  }

  const active = resolveLocalDir();
  const activePath = active.path;
  if (hasBuiltPackages(activePath)) {
    return activePath;
  }
  if (fs.existsSync(activePath) && !isValidRoot(activePath)) {
    removeIfPresent(activePath);
  }
  if (isValidRoot(activePath)) {
    return activePath;
  }

  const sibling = resolveSiblingDir();
  if (sibling) {
    console.log(
      `[ensure-elia-assets] Linking local sibling ${sibling.path} → ./${sibling.name}`,
    );
    linkSiblingAssets(sibling.path, sibling.name);
    const linked = path.join(root, sibling.name);
    if (isValidRoot(linked)) {
      return linked;
    }
    removeIfPresent(linked);
  }

  cloneAssetsRepo("elia-assets");
  const cloned = path.join(root, "elia-assets");
  if (!isValidRoot(cloned)) {
    console.error(
      "[ensure-elia-assets] git clone completed but elia-assets/package.json is missing",
    );
    process.exit(1);
  }
  return cloned;
}

const assetsRoot = ensureAssetsRoot();

if (!hasBuiltPackages(assetsRoot)) {
  console.log("[ensure-elia-assets] Building @elia/* packages...");
  runAssetsNpm(["install", "--ignore-scripts"], assetsRoot);
  runAssetsNpm(["run", "build"], assetsRoot);
}

if (!hasBuiltPackages(assetsRoot)) {
  console.error(
    "[ensure-elia-assets] Required package dist folders missing after build.",
  );
  process.exit(1);
}

console.log("[ensure-elia-assets] Ready:", assetsRoot);
