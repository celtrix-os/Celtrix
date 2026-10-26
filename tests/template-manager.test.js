import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { fileURLToPath } from "node:url";
import { copyTemplates } from "../utils/templateManager.js";

const templatesDir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "templates");

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    const entryPath = path.join(dir, entry.name);
    return entry.isDirectory() ? walk(entryPath) : [entryPath];
  });
}

function scaffold(config) {
  const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "celtrix-templates-"));
  const originalLog = console.log;
  console.log = () => {};
  try {
    copyTemplates(projectPath, config);
  } finally {
    console.log = originalLog;
  }
  return projectPath;
}

test("templates never ship a .gitignore, which npm would drop from the package", () => {
  const dotted = walk(templatesDir).filter((file) => path.basename(file) === ".gitignore");
  assert.deepEqual(dotted, []);
});

test("copied templates get their .gitignore back", () => {
  for (const [config, serverTemplate] of [
    [{ stack: "mern", language: "javascript" }, "mern/server"],
    [{ stack: "mevn+tailwind+auth", language: "typescript" }, "mevn+tailwind+auth/typescript/server"],
    [{ stack: "hono", language: "javascript" }, "hono/javascript/server"],
  ]) {
    const projectPath = scaffold(config);
    try {
      const files = walk(projectPath).map((file) => path.relative(projectPath, file));
      assert.ok(files.includes(path.join("server", ".gitignore")), config.stack);
      assert.ok(!files.some((file) => path.basename(file) === "_gitignore"), config.stack);
      assert.equal(
        fs.readFileSync(path.join(projectPath, "server", ".gitignore"), "utf-8"),
        fs.readFileSync(path.join(templatesDir, serverTemplate, "_gitignore"), "utf-8"),
        config.stack
      );
    } finally {
      fs.rmSync(projectPath, { recursive: true, force: true });
    }
  }
});
