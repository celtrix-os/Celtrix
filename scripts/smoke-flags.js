#!/usr/bin/env node
/**
 * Smoke test for scaffolding from command-line flags.
 *
 * Packs Celtrix with `npm pack`, then runs the packed CLI through npx with a
 * full flag set, no TTY and no dependency install, the way CI or the website's
 * Stack Builder command would:
 *
 *   1. no prompts    the CLI finishes with stdin closed (a prompt would cancel the run)
 *   2. files         the workspace, web app, API, database package and Docker setup exist
 *   3. config        celtrix.config.json records exactly the values from the flags
 *
 * Usage:
 *   node scripts/smoke-flags.js [--keep]
 *
 * Needs network access for npx and create-vite. The temporary directory is
 * removed afterwards unless --keep is passed.
 */
import { execFileSync, spawnSync } from "child_process";
import fs from "fs-extra";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const keep = process.argv.includes("--keep");
const workDir = fs.mkdtempSync(path.join(os.tmpdir(), "celtrix-flags-"));
const projectName = "flags-app";
const projectPath = path.join(workDir, projectName);

const flags = [
  "--lang", "typescript",
  "--frontend", "react-router",
  "--backend", "express",
  "--runtime", "node",
  "--db", "postgres",
  "--db-provider", "docker",
  "--orm", "prisma",
  "--pm", "npm",
  "--no-install",
  "--no-git",
];

const expectedFiles = [
  "package.json",
  "turbo.json",
  ".env.example",
  "CELTRIX_SETUP.md",
  "docker-compose.yml",
  "celtrix.config.json",
  "apps/web/package.json",
  "apps/web/vite.config.ts",
  "apps/api/package.json",
  "packages/database/package.json",
  "packages/database/prisma/schema.prisma",
];

const results = [];

function check(name, condition, detail = "") {
  results.push({ name, ok: Boolean(condition) });
  console.log(`  ${condition ? "✔" : "✖"} ${name}${!condition && detail ? `\n      ${detail}` : ""}`);
  if (!condition) throw new Error(`Check failed: ${name}`);
}

function section(title) {
  console.log(`\n▶ ${title}`);
}

async function main() {
  console.log("Celtrix flags smoke test");
  console.log(`Work dir: ${workDir}`);

  section("Pack");
  const tarballName = execFileSync("npm", ["pack", "--silent", "--pack-destination", workDir], {
    cwd: repoRoot,
    encoding: "utf-8",
  }).trim().split("\n").at(-1);
  const tarball = path.join(workDir, tarballName);
  check(`packed ${tarballName}`, fs.existsSync(tarball));

  section(`Scaffold: npx celtrix ${projectName} ${flags.join(" ")}`);
  // stdin is ignored, so any prompt would fail instead of waiting for input
  const run = spawnSync("npx", ["--yes", "--package", tarball, "celtrix", projectName, ...flags], {
    cwd: workDir,
    stdio: ["ignore", "pipe", "pipe"],
    encoding: "utf-8",
    timeout: 10 * 60_000,
  });
  const output = `${run.stdout}\n${run.stderr}`;
  check("CLI exits 0 without a TTY", run.status === 0, `exit ${run.status ?? run.signal}\n${output.slice(-3000)}`);
  // A prompt on closed stdin is treated as Ctrl+C, which also exits 0, so check the outcome too
  check("no prompt was opened", !output.includes("Cancelled"), output.slice(-2000));
  check("project reported as created", output.includes("created successfully"), output.slice(-2000));

  section("Generated files");
  for (const file of expectedFiles) {
    check(file, fs.existsSync(path.join(projectPath, file)));
  }
  check("dependencies were not installed (--no-install)", !fs.existsSync(path.join(projectPath, "node_modules")));
  check("no git repository was created (--no-git)", !fs.existsSync(path.join(projectPath, ".git")));

  section("Config");
  const config = fs.readJsonSync(path.join(projectPath, "celtrix.config.json"));
  check("config records the flag values", JSON.stringify({
    language: config.language,
    frontend: config.frontend,
    backend: config.backend,
    runtime: config.runtime,
    database: config.database,
    orm: config.orm,
    packageManager: config.packageManager,
  }) === JSON.stringify({
    language: "typescript",
    frontend: "react-router",
    backend: "express",
    runtime: "node",
    database: { type: "postgres", provider: "docker" },
    orm: "prisma",
    packageManager: "npm",
  }), JSON.stringify(config));
  check("schema uses postgresql", fs.readFileSync(path.join(projectPath, "packages/database/prisma/schema.prisma"), "utf-8").includes('provider  = "postgresql"'));
}

main()
  .then(() => {
    console.log(`\n✔ All ${results.length} checks passed`);
  })
  .catch((err) => {
    console.error(`\n✖ ${err.message}`);
    process.exitCode = 1;
  })
  .finally(() => {
    if (keep) console.log(`Kept ${workDir}`);
    else fs.removeSync(workDir);
  });
