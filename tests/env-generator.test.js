import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { generateEnv } from "../utils/customGenerators/envGenerator.js";

function createContext(database, options = {}) {
  const projectPath = fs.mkdtempSync(
    path.join(os.tmpdir(), "celtrix-env-")
  );

  const context = {
    projectPath,
    projectName: "test-app",
    config: {
      frontend: "react-router",
      backend: "express",
      database,
      orm: "prisma",
      runtime: "node",
      language: "typescript",
    },
    hasFrontend: true,
    hasBackend: true,
    packageManager: "npm",
    ...options,
  };

  return { context, projectPath };
}

function readEnv(projectPath) {
  return fs.readFileSync(
    path.join(projectPath, ".env.example"),
    "utf-8"
  );
}

test("Docker PostgreSQL includes DB_PORT and its database URL", async (t) => {
  const { context, projectPath } = createContext({
    type: "postgres",
    provider: "docker",
  });

  t.after(() => {
    fs.rmSync(projectPath, { recursive: true, force: true });
  });

  await generateEnv(context);

  const env = readEnv(projectPath);

  assert.match(env, /^# DB_PORT=5432$/m);
  assert.match(
    env,
    /^DATABASE_URL="postgresql:\/\/postgres:postgres@localhost:5432\/test_app"$/m
  );
  assert.doesNotMatch(env, /^DIRECT_URL=/m);
});

test("Supabase PostgreSQL includes DIRECT_URL but not DB_PORT", async (t) => {
  const { context, projectPath } = createContext({
    type: "postgres",
    provider: "supabase",
  });

  t.after(() => {
    fs.rmSync(projectPath, { recursive: true, force: true });
  });

  await generateEnv(context);

  const env = readEnv(projectPath);

  assert.match(env, /^DATABASE_URL="postgres:\/\//m);
  assert.match(env, /^DIRECT_URL="postgres:\/\//m);
  assert.doesNotMatch(env, /DB_PORT=/);
});

test("local PostgreSQL does not include Docker or Supabase variables", async (t) => {
  const { context, projectPath } = createContext({
    type: "postgres",
    provider: "local",
  });

  t.after(() => {
    fs.rmSync(projectPath, { recursive: true, force: true });
  });

  await generateEnv(context);

  const env = readEnv(projectPath);

  assert.match(
    env,
    /^DATABASE_URL="postgresql:\/\/postgres:postgres@localhost:5432\/test_app"$/m
  );
  assert.doesNotMatch(env, /DB_PORT=/);
  assert.doesNotMatch(env, /^DIRECT_URL=/m);
});

test("an existing README is preserved while the setup guide is generated", async (t) => {
  const { context, projectPath } = createContext({
    type: "postgres",
    provider: "local",
  });

  t.after(() => {
    fs.rmSync(projectPath, { recursive: true, force: true });
  });

  const readmePath = path.join(projectPath, "README.md");
  fs.writeFileSync(readmePath, "# My existing README\n");

  await generateEnv(context);

  assert.equal(
    fs.readFileSync(readmePath, "utf-8"),
    "# My existing README\n"
  );

  assert.ok(
    fs.existsSync(path.join(projectPath, "CELTRIX_SETUP.md"))
  );
});