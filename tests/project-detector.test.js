import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import {
  findProjectRoot,
  readCeltrixLock,
  readCeltrixConfig,
  updateCeltrixLock,
  safeWriteFile,
  safeAppendEnv,
  updatePackageScripts,
  detectProject,
} from "../utils/projectDetector.js";

function createTempDir(prefix = "celtrix-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

test("findProjectRoot finds package.json at root and from nested directories", () => {
  const root = createTempDir();
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "test-app" }));

  const nested = path.join(root, "src", "nested");
  fs.mkdirSync(nested, { recursive: true });

  assert.equal(findProjectRoot(root), root);
  assert.equal(findProjectRoot(nested), root);

  const outside = createTempDir();
  assert.equal(findProjectRoot(outside), null);

  fs.rmSync(root, { recursive: true, force: true });
  fs.rmSync(outside, { recursive: true, force: true });
});

test("updateCeltrixLock creates and updates celtrix.json without duplicate integrations", () => {
  const root = createTempDir();
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "test-app" }));

  const lock1 = updateCeltrixLock(root, {
    name: "test-app",
    stack: "custom",
    integrations: ["husky"],
  });

  assert.deepEqual(lock1.integrations, ["husky"]);
  assert.equal(readCeltrixLock(root).name, "test-app");

  const lock2 = updateCeltrixLock(root, {
    integrations: ["husky", "biome"],
  });

  assert.deepEqual(lock2.integrations, ["husky", "biome"]);
  assert.equal(lock2.stack, "custom");

  fs.rmSync(root, { recursive: true, force: true });
});

test("safeWriteFile creates new files but preserves existing files without overwriting", () => {
  const root = createTempDir();
  const testFile = path.join(root, "config.json");

  const res1 = safeWriteFile(testFile, '{"original": true}');
  assert.equal(res1.written, true);
  assert.equal(res1.skipped, false);
  assert.equal(fs.readFileSync(testFile, "utf-8"), '{"original": true}');

  // Attempt to overwrite
  const res2 = safeWriteFile(testFile, '{"overwritten": true}');
  assert.equal(res2.written, false);
  assert.equal(res2.skipped, true);
  assert.equal(fs.readFileSync(testFile, "utf-8"), '{"original": true}');

  fs.rmSync(root, { recursive: true, force: true });
});

test("safeAppendEnv appends new variables and ignores existing keys", () => {
  const root = createTempDir();
  const envFile = path.join(root, ".env.example");

  fs.writeFileSync(envFile, "EXISTING_KEY=123\n");

  const appended1 = safeAppendEnv(
    envFile,
    "EXISTING_KEY=456\nNEW_KEY=abc",
    "Section 1"
  );

  assert.equal(appended1, true);
  const content = fs.readFileSync(envFile, "utf-8");
  assert.ok(content.includes("EXISTING_KEY=123"));
  assert.ok(content.includes("NEW_KEY=abc"));
  assert.ok(!content.includes("EXISTING_KEY=456"));

  // Try appending when everything already exists
  const appended2 = safeAppendEnv(envFile, "NEW_KEY=different");
  assert.equal(appended2, false);

  fs.rmSync(root, { recursive: true, force: true });
});

test("updatePackageScripts adds new scripts and preserves existing ones", () => {
  const root = createTempDir();
  const pkgFile = path.join(root, "package.json");

  fs.writeFileSync(
    pkgFile,
    JSON.stringify({
      name: "test-app",
      scripts: {
        dev: "next dev",
        prepare: "npm run build",
      },
    })
  );

  const res = updatePackageScripts(pkgFile, {
    lint: "biome check .",
    prepare: "husky",
  });

  assert.equal(res.updated, true);
  const updatedPkg = JSON.parse(fs.readFileSync(pkgFile, "utf-8"));
  assert.equal(updatedPkg.scripts.dev, "next dev");
  assert.equal(updatedPkg.scripts.lint, "biome check .");
  assert.equal(updatedPkg.scripts.prepare, "npm run build && husky");

  fs.rmSync(root, { recursive: true, force: true });
});

test("detectProject detects Next.js project with TypeScript and pnpm", () => {
  const root = createTempDir();
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "my-next-app",
      dependencies: {
        next: "15.0.0",
        react: "19.0.0",
      },
      devDependencies: {
        typescript: "^5.0.0",
      },
    })
  );
  fs.writeFileSync(path.join(root, "tsconfig.json"), "{}");
  fs.writeFileSync(path.join(root, "pnpm-lock.yaml"), "");

  const project = detectProject(root);

  assert.equal(project.isProject, true);
  assert.equal(project.name, "my-next-app");
  assert.equal(project.frontend, "nextjs");
  assert.equal(project.packageManager, "pnpm");
  assert.equal(project.isTs, true);
  assert.equal(project.ext, "ts");
  assert.equal(project.jsxExt, "tsx");
  assert.equal(project.structure, "standalone");

  fs.rmSync(root, { recursive: true, force: true });
});

test("detectProject detects MERN client-server structure", () => {
  const root = createTempDir();
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "mern-app" }));
  fs.mkdirSync(path.join(root, "client"), { recursive: true });
  fs.mkdirSync(path.join(root, "server"), { recursive: true });

  fs.writeFileSync(
    path.join(root, "client", "package.json"),
    JSON.stringify({ dependencies: { react: "^18.0.0" } })
  );
  fs.writeFileSync(
    path.join(root, "server", "package.json"),
    JSON.stringify({ dependencies: { express: "^4.18.0", mongoose: "^7.0.0" } })
  );

  const project = detectProject(root);

  assert.equal(project.isProject, true);
  assert.equal(project.structure, "client-server");
  assert.equal(project.frontend, "react");
  assert.equal(project.backend, "express");
  assert.equal(project.orm, "mongoose");
  assert.equal(project.database?.type, "mongodb");

  fs.rmSync(root, { recursive: true, force: true });
});

test("detectProject detects monorepo structure with apps and packages", () => {
  const root = createTempDir();
  fs.writeFileSync(
    path.join(root, "package.json"),
    JSON.stringify({
      name: "monorepo-app",
      workspaces: ["apps/*", "packages/*"],
    })
  );
  fs.mkdirSync(path.join(root, "apps", "web"), { recursive: true });
  fs.mkdirSync(path.join(root, "apps", "api"), { recursive: true });
  fs.mkdirSync(path.join(root, "packages", "database"), { recursive: true });

  fs.writeFileSync(
    path.join(root, "apps", "web", "package.json"),
    JSON.stringify({ dependencies: { next: "^14.0.0" } })
  );
  fs.writeFileSync(
    path.join(root, "apps", "api", "package.json"),
    JSON.stringify({ dependencies: { hono: "^4.0.0" } })
  );
  fs.writeFileSync(
    path.join(root, "packages", "database", "package.json"),
    JSON.stringify({ dependencies: { "@prisma/client": "^6.0.0" } })
  );

  const project = detectProject(root);

  assert.equal(project.isProject, true);
  assert.equal(project.structure, "monorepo");
  assert.equal(project.paths.frontend, path.join(root, "apps", "web"));
  assert.equal(project.paths.backend, path.join(root, "apps", "api"));
  assert.equal(project.paths.database, path.join(root, "packages", "database"));
  assert.equal(project.frontend, "nextjs");
  assert.equal(project.backend, "hono");
  assert.equal(project.orm, "prisma");

  fs.rmSync(root, { recursive: true, force: true });
});

