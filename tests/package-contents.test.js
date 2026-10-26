import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf-8"));

// What `npm publish` would upload, without writing a tarball
const [packed] = JSON.parse(
  execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], { cwd: repoRoot, encoding: "utf-8" })
);
const packedFiles = new Set(packed.files.map((file) => file.path));

const RUNTIME_PATHS = ["index.js", "bin", "commands", "prompts", "utils", "templates"];

test("every entry in package.json#files exists", () => {
  for (const entry of pkg.files) {
    assert.ok(fs.existsSync(path.join(repoRoot, entry)), `"${entry}" is listed in files but does not exist`);
  }
});

test("the package ships the CLI entry point, readme and license", () => {
  for (const file of ["package.json", "README.md", "LICENSE", "index.js", ...Object.values(pkg.bin).map((bin) => path.normalize(bin))]) {
    assert.ok(packedFiles.has(file), `${file} is missing from the package`);
  }
});

test("every tracked runtime file and template is packaged", (t) => {
  let tracked;
  try {
    tracked = execFileSync("git", ["ls-files", "--", ...RUNTIME_PATHS], { cwd: repoRoot, encoding: "utf-8" });
  } catch {
    t.skip("not a git checkout");
    return;
  }
  const missing = tracked.split("\n").filter(Boolean).filter((file) => !packedFiles.has(file));
  assert.deepEqual(missing, [], "npm would leave these files out of the package");
});

test("development files and secrets stay out of the package", () => {
  const forbidden = [
    /^(tests|scripts|\.github|node_modules|coverage|blob)\//,
    /(^|\/)\.env$/,
    /(^|\/)\.env\.(?!example$)[^/]+$/,
    /(^|\/)\.npmrc$/,
    /\.(tgz|log)$/,
    /^(package-lock\.json|pnpm-lock\.yaml)$/,
  ];
  const leaked = [...packedFiles].filter((file) => forbidden.some((pattern) => pattern.test(file)));
  assert.deepEqual(leaked, []);
});
