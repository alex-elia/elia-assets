import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";

if (process.env.ELIA_SITE_TOOLS_ENSURE_SKIP === "1") {
  process.exit(0);
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const localTools = path.join(root, "elia-site-tools");
const siblingTools = path.join(root, "..", "elia-site-tools");
const toolsPrefix = "./elia-site-tools";
const repo =
  process.env.ELIA_SITE_TOOLS_REPO ??
  "https://github.com/alex-elia/elia-site-tools.git";
const ref = process.env.ELIA_SITE_TOOLS_REF?.trim() || "";

function hasBuiltPackages(dir) {
  return fs.existsSync(
    path.join(dir, "packages", "agent-next", "dist", "index.js"),
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
    env: { ...process.env, ELIA_SITE_TOOLS_ENSURE_SKIP: "1", ...extraEnv },
  });
}

function runToolsNpm(args) {
  run(`npm ${args.join(" ")} --prefix ${toolsPrefix}`, root);
}

function linkSiblingTools() {
  removeIfPresent(localTools);
  if (process.platform === "win32") {
    run(`cmd /c mklink /J "${localTools}" "${siblingTools}"`);
  } else {
    fs.symlinkSync(siblingTools, localTools, "dir");
  }
}

function cloneToolsRepo() {
  removeIfPresent(localTools);
  console.log(
    `[ensure-elia-tools] Cloning ${repo}${ref ? ` @ ${ref}` : ""} → ./elia-site-tools`,
  );
  const cloneArgs = ["clone", "--depth", "1"];
  if (ref) cloneArgs.push("--branch", ref);
  cloneArgs.push(repo, "elia-site-tools");
  run(`git ${cloneArgs.join(" ")}`, root, { ELIA_SITE_TOOLS_ENSURE_SKIP: "0" });
}

function ensureToolsRoot() {
  if (hasBuiltPackages(localTools)) {
    return localTools;
  }
  if (fs.existsSync(localTools) && !isValidRoot(localTools)) {
    removeIfPresent(localTools);
  }
  if (isValidRoot(localTools)) {
    return localTools;
  }
  if (isValidRoot(siblingTools)) {
    console.log(
      "[ensure-elia-tools] Linking local sibling ../elia-site-tools → ./elia-site-tools",
    );
    linkSiblingTools();
    if (isValidRoot(localTools)) {
      return localTools;
    }
    removeIfPresent(localTools);
  }
  cloneToolsRepo();
  if (!isValidRoot(localTools)) {
    console.error(
      "[ensure-elia-tools] git clone completed but elia-site-tools/package.json is missing",
    );
    process.exit(1);
  }
  return localTools;
}

const toolsRoot = ensureToolsRoot();

if (!hasBuiltPackages(toolsRoot)) {
  console.log("[ensure-elia-tools] Building @elia/* packages...");
  runToolsNpm(["install", "--ignore-scripts"]);
  runToolsNpm(["run", "build"]);
}

if (!hasBuiltPackages(toolsRoot)) {
  console.error("[ensure-elia-tools] @elia/agent-next dist still missing after build.");
  process.exit(1);
}

console.log("[ensure-elia-tools] Ready:", toolsRoot);
