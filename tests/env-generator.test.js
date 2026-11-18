import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { generateEnv, SETUP_GUIDE } from "../utils/customGenerators/envGenerator.js";
import { generateBackend } from "../utils/customGenerators/backendGenerator.js";

async function scaffoldEnv(database, { frontend = "react-router", backend = "hono" } = {}) {
  const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "celtrix-env-"));
  const context = {
    projectPath,
    projectName: "my-test-app",
    config: {
      language: "typescript",
      frontend,
      backend,
      runtime: "node",
      database,
      orm: database?.type === "mongodb" ? "mongoose" : "prisma",
      packageManager: "npm",
    },
    hasFrontend: frontend !== "none",
    hasBackend: backend !== "none",
    isTs: true,
    ext: "ts",
  };

  await generateEnv(context);
  const envExamplePath = path.join(projectPath, ".env.example");
  const setupGuidePath = path.join(projectPath, SETUP_GUIDE);

  return {
    projectPath,
    envExample: fs.existsSync(envExamplePath) ? fs.readFileSync(envExamplePath, "utf-8") : null,
    setupGuide: fs.existsSync(setupGuidePath) ? fs.readFileSync(setupGuidePath, "utf-8") : null,
  };
}

test(".env.example includes FRONTEND_API_URL and BACKEND_PORT", async () => {
  const { envExample } = await scaffoldEnv({ type: "postgres", provider: "local" });

  assert.ok(envExample, ".env.example should be created");
  assert.match(envExample, /^FRONTEND_API_URL="http:\/\/localhost:3001\/"/m);
  assert.match(envExample, /^BACKEND_PORT=3001/m);
  assert.match(envExample, /^PORT=3001/m);
});

test("Local PostgreSQL scaffolds correct .env.example template", async () => {
  const { envExample, setupGuide } = await scaffoldEnv({ type: "postgres", provider: "local" });

  assert.match(envExample, /^FRONTEND_API_URL="http:\/\/localhost:3001\/"/m);
  assert.match(envExample, /^BACKEND_PORT=3001/m);
  assert.match(envExample, /^DATABASE_URL="postgresql:\/\/\[username]:\[password]@localhost:5432\/\[database]"/m);
  assert.ok(setupGuide.includes("cp .env.example .env"));
});

test("Supabase scaffolds correct .env.example template with SUPABASE_URL and SUPABASE_ANON_KEY", async () => {
  const { envExample, setupGuide } = await scaffoldEnv({ type: "postgres", provider: "supabase" });

  assert.match(envExample, /^FRONTEND_API_URL="http:\/\/localhost:3001\/"/m);
  assert.match(envExample, /^BACKEND_PORT=3001/m);
  assert.match(envExample, /^DATABASE_URL="postgres:\/\/postgres\.\[PROJECT-REF]:\[PASSWORD]@aws-0-\[REGION]\.pooler\.supabase\.com:6543\/postgres\?pgbouncer=true"/m);
  assert.match(envExample, /^DIRECT_URL=/m);
  assert.match(envExample, /^SUPABASE_URL="https:\/\/\[supabase-project-url]\.supabase\.co"/m);
  assert.match(envExample, /^SUPABASE_ANON_KEY="\[supabase-anon-key]"/m);
  assert.match(envExample, /^SUPABASE_SECRET_KEY="\[supabase-secret-key]"/m);
  assert.match(envExample, /^VITE_SUPABASE_ANON_KEY="\[supabase-anon-key]"/m);
  assert.ok(setupGuide.includes("cp .env.example .env"));
});

test("Turso scaffolds correct .env.example template with TURSO_DATABASE_URL and TURSO_AUTH_TOKEN", async () => {
  const { envExample, setupGuide } = await scaffoldEnv({ type: "sqlite", provider: "turso" });

  assert.match(envExample, /^FRONTEND_API_URL="http:\/\/localhost:3001\/"/m);
  assert.match(envExample, /^BACKEND_PORT=3001/m);
  assert.match(envExample, /^TURSO_DATABASE_URL="\[turso-database-url]"/m);
  assert.match(envExample, /^TURSO_AUTH_TOKEN="\[turso-auth-token]"/m);
  assert.match(envExample, /^DATABASE_URL="libsql:\/\/\[turso-database-url]\?authToken=\[turso-auth-token]"/m);
  assert.ok(setupGuide.includes("cp .env.example .env"));
  assert.ok(setupGuide.includes("TURSO_DATABASE_URL"));
});

test("MongoDB Atlas scaffolds correct .env.example template with MONGODB_URI", async () => {
  const { envExample, setupGuide } = await scaffoldEnv({ type: "mongodb", provider: "atlas" });

  assert.match(envExample, /^FRONTEND_API_URL="http:\/\/localhost:3001\/"/m);
  assert.match(envExample, /^BACKEND_PORT=3001/m);
  assert.match(envExample, /^MONGODB_URI="mongodb\+srv:\/\/\[username]:\[password]@\[cluster]\.mongodb\.net\/\[database]"/m);
  assert.match(envExample, /^DATABASE_URL="mongodb\+srv:\/\/\[username]:\[password]@\[cluster]\.mongodb\.net\/\[database]"/m);
  assert.ok(setupGuide.includes("cp .env.example .env"));
  assert.ok(setupGuide.includes("MONGODB_URI"));
});

test("Neon PostgreSQL scaffolds correct .env.example template", async () => {
  const { envExample, setupGuide } = await scaffoldEnv({ type: "postgres", provider: "neon" });

  assert.match(envExample, /^FRONTEND_API_URL="http:\/\/localhost:3001\/"/m);
  assert.match(envExample, /^BACKEND_PORT=3001/m);
  assert.match(envExample, /^DATABASE_URL="postgresql:\/\/\[username]:\[password]@\[host]\/\[database]\?sslmode=require"/m);
  assert.ok(setupGuide.includes("cp .env.example .env"));
  assert.ok(setupGuide.includes("neon.tech"));
});

test("PlanetScale MySQL scaffolds correct .env.example template", async () => {
  const { envExample, setupGuide } = await scaffoldEnv({ type: "mysql", provider: "planetscale" });

  assert.match(envExample, /^FRONTEND_API_URL="http:\/\/localhost:3001\/"/m);
  assert.match(envExample, /^BACKEND_PORT=3001/m);
  assert.match(envExample, /^DATABASE_URL="mysql:\/\/\[username]:\[password]@\[host]\/\[database]"/m);
  assert.ok(setupGuide.includes("cp .env.example .env"));
  assert.ok(setupGuide.includes("planetscale.com"));
});

test("No real credentials or secrets are scaffolded in any provider template", async () => {
  const providers = [
    { type: "postgres", provider: "local" },
    { type: "postgres", provider: "supabase" },
    { type: "postgres", provider: "neon" },
    { type: "sqlite", provider: "turso" },
    { type: "mongodb", provider: "atlas" },
    { type: "mysql", provider: "planetscale" },
  ];

  for (const db of providers) {
    const { envExample } = await scaffoldEnv(db);
    // Real secrets like live passwords, actual tokens, or API keys should not exist
    assert.doesNotMatch(envExample, /sb_secret_[a-zA-Z0-9]/, `${db.type}:${db.provider} has real secret`);
    assert.doesNotMatch(envExample, /root:root/, `${db.type}:${db.provider} has real credentials`);
    assert.doesNotMatch(envExample, /postgres:postgres/, `${db.type}:${db.provider} has real credentials`);
  }
});

test("Backend validates required environment variables before startup", async () => {
  const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "celtrix-val-"));
  await generateBackend({
    projectPath,
    config: {
      database: { type: "sqlite", provider: "turso" },
      orm: "prisma",
      runtime: "node",
      backend: "hono",
      frontend: "react-router",
      language: "typescript",
    },
    installDeps: false,
    hasFrontend: true,
    hasBackend: true,
    packageManager: "npm",
    isTs: true,
    ext: "ts",
  });

  const envFile = fs.readFileSync(path.join(projectPath, "apps", "api", "src", "env.ts"), "utf-8");
  assert.ok(envFile.includes("required('TURSO_DATABASE_URL')"));
  assert.ok(envFile.includes("required('TURSO_AUTH_TOKEN')"));
  assert.ok(envFile.includes("Missing required environment variable"));
});

