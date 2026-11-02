#!/usr/bin/env node
/**
 * Smoke test for the npm package as a user receives it.
 *
 * Packs Celtrix with `npm pack`, installs the tarball into an empty project,
 * then checks the installed copy, never the repo checkout:
 *
 *   1. CLI          `celtrix --version` prints the package version, `--help` works
 *   2. modules      every module in the package imports (catches files missing from `files`)
 *   3. scaffold     a preset MERN project is generated from the installed templates
 *   4. install      (--install) the generated client and server install their dependencies
 *                   and the client production build succeeds
 *
 * Usage:
 *   node scripts/smoke-package.js [--install] [--keep]
 *
 * Needs network access to install the package's dependencies and run create-vite.
 * The temporary directory is removed afterwards unless --keep is passed.
 */
import { execFileSync } from "child_process";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const keep = args.includes("--keep");
const installDeps = args.includes("--install");
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "celtrix-smoke-"));
const { version } = fs.readJsonSync(path.join(repoRoot, "package.json"));

const results = [];

function check(name, condition, detail = "") {
  results.push({ name, ok: Boolean(condition) });
  console.log(`  ${condition ? "✔" : "✖"} ${name}${!condition && detail ? `\n      ${detail}` : ""}`);
  if (!condition) throw new Error(`Check failed: ${name}`);
}

function section(title) {
  console.log(`\n▶ ${title}`);
}

function sh(command, commandArgs, cwd) {
  return execFileSync(command, commandArgs, { cwd, stdio: ["ignore", "pipe", "pipe"], encoding: "utf-8" });
}

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

async function main() {
  console.log(`Celtrix package smoke test — v${version}${installDeps ? " (with dependency install)" : ""}`);
  console.log(`Work dir: ${workDir}`);

  // ── 1. Pack and install ────────────────────────────────────────────────────
  section("Pack and install the tarball");
  const [packed] = JSON.parse(sh("npm", ["pack", "--json", "--ignore-scripts", "--pack-destination", workDir], repoRoot));
  const tarball = path.join(workDir, packed.filename);
  check(`npm pack wrote ${packed.filename}`, fs.existsSync(tarball));

  const consumer = path.join(workDir, "consumer");
  fs.mkdirSync(consumer);
  sh("npm", ["init", "-y"], consumer);
  sh("npm", ["install", tarball, "--no-audit", "--no-fund"], consumer);
  const installed = path.join(consumer, "node_modules", "celtrix");
  check("celtrix is installed from the tarball", fs.readJsonSync(path.join(installed, "package.json")).version === version);

  // ── 2. CLI ─────────────────────────────────────────────────────────────────
  section("Installed CLI responds");
  const bin = path.join(consumer, "node_modules", ".bin", "celtrix");
  check("bin link exists", fs.existsSync(bin));
  const versionOutput = sh(bin, ["--version"], consumer);
  check(`--version prints ${version}`, versionOutput.includes(version), versionOutput);
  const helpOutput = sh(bin, ["--help"], consumer);
  check("--help prints usage", helpOutput.includes("Usage:") && helpOutput.includes("npx celtrix"), helpOutput);

  // ── 3. Modules ─────────────────────────────────────────────────────────────
  section("Every packaged module imports");
  const modules = ["commands", "prompts", "utils"]
    .flatMap((dir) => walk(path.join(installed, dir)))
    .filter((file) => file.endsWith(".js"));
  const failures = [];
  for (const file of modules) {
    try {
      await import(pathToFileURL(file).href);
    } catch (error) {
      failures.push(`${path.relative(installed, file)}: ${error.message}`);
    }
  }
  check(`${modules.length} modules import without errors`, failures.length === 0, failures.join("\n      "));

  // ── 4. Scaffold ────────────────────────────────────────────────────────────
  section("Scaffold a MERN project from the installed package");
  const projectName = "smoke-mern";
  const projectPath = path.join(workDir, projectName);
  const { setupProject } = await import(pathToFileURL(path.join(installed, "utils", "project.js")).href);
  process.chdir(workDir);
  await setupProject(projectName, { stack: "mern", language: "javascript", runtime: "node", packageManager: "npm", projectName }, installDeps);
  process.chdir(repoRoot);

  const exists = (file) => fs.existsSync(path.join(projectPath, file));
  for (const file of ["client/package.json", "client/index.html", "client/src/App.jsx", "client/Dockerfile", "server/package.json", "server/server.js", "server/.env.example", "server/.gitignore", "docker-compose.yml"]) {
    check(`${file} exists`, exists(file));
  }
  check("no template _gitignore is left behind", !walk(projectPath).some((file) => path.basename(file) === "_gitignore"));
  for (const manifest of ["client/package.json", "server/package.json"]) {
    let parsed;
    try { parsed = fs.readJsonSync(path.join(projectPath, manifest)); } catch { /* reported below */ }
    check(`${manifest} is valid JSON with a name`, typeof parsed?.name === "string");
  }
  check("client has a build script", fs.readJsonSync(path.join(projectPath, "client/package.json")).scripts?.build);
  check("the Celtrix welcome page replaced the Vite starter", fs.readFileSync(path.join(projectPath, "client/src/App.jsx"), "utf-8").includes(`const PROJECT = "${projectName}"`));

  if (installDeps) {
    section("Generated project installs and builds");
    check("client dependencies installed", exists("client/node_modules/vite/package.json"));
    for (const dependency of ["express", "mongoose", "dotenv"]) {
      check(`server dependency ${dependency} installed`, exists(`server/node_modules/${dependency}/package.json`));
    }
    try {
      sh("npm", ["run", "build"], path.join(projectPath, "client"));
      check("client production build succeeds", exists("client/dist/index.html"));
    } catch (error) {
      check("client production build succeeds", false, `${error.stdout ?? ""}${error.stderr ?? ""}`.slice(-3000));
    }
  }
}

function cleanup() {
  process.chdir(repoRoot);
  if (!keep) fs.removeSync(workDir);
}

main()
  .then(() => {
    cleanup();
    console.log(`\n✅ ${results.length} checks passed${keep ? ` — files kept at ${workDir}` : ""}`);
  })
  .catch((error) => {
    cleanup();
    console.error(`\n❌ Package smoke test failed after ${results.filter((r) => r.ok).length} passing checks: ${error.message}`);
    if (keep) console.error(`   Files kept at ${workDir}`);
    process.exit(1);
  });
