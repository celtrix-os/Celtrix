#!/usr/bin/env node
/**
 * End-to-end test for the custom-stack scaffolder.
 *
 * Scaffolds React + Express + PostgreSQL (Supabase) + Prisma through the real
 * Celtrix pipeline (no prompts), then proves every layer is wired:
 *
 *   1. generated files    .env.example, workspace links, Supabase clients, Vite proxy
 *   2. database           throwaway Postgres in Docker stands in for Supabase's Postgres
 *   3. schema             `db:push` through turbo → ORM CLI, reading the root .env
 *   4. build              API typecheck + web `tsc -b && vite build`
 *   5. runtime            API: health, create/list users, duplicate → 409, /api/me → 401
 *   6. frontend ↔ API     the same requests through the Vite dev-server proxy
 *
 * Usage:
 *   node scripts/e2e-custom-stack.js [--backend express|hono|fastify] [--runtime node|bun]
 *                                    [--pm npm|pnpm|bun]
 *                                    [--dir <workdir>] [--keep]
 *
 * Requires Docker. Everything it creates (project dir, container) is removed
 * afterwards unless --keep is passed.
 */
import { spawn, execSync } from "child_process";
import fs from "fs-extra";
import net from "net";
import os from "os";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");

const args = process.argv.slice(2);
const option = (name, fallback) => {
  const index = args.indexOf(`--${name}`);
  return index !== -1 && args[index + 1] ? args[index + 1] : fallback;
};
const keep = args.includes("--keep");
const orm = "prisma";
const backend = option("backend", "express");
const runtime = option("runtime", "node");
const packageManager = option("pm", "npm");
const workDir = path.resolve(option("dir", fs.mkdtempSync(path.join(os.tmpdir(), "celtrix-e2e-"))));
const projectName = `e2e-${backend}-${orm}`;
const projectPath = path.join(workDir, projectName);

const config = {
  stack: "custom",
  language: "typescript",
  frontend: "react-router",
  backend,
  runtime,
  database: { type: "postgres", provider: "supabase" },
  orm,
  projectName,
  packageManager,
};

const results = [];
const cleanups = [];

function check(name, condition, detail = "") {
  results.push({ name, ok: Boolean(condition) });
  console.log(`  ${condition ? "✔" : "✖"} ${name}${!condition && detail ? `\n      ${detail}` : ""}`);
  if (!condition) throw new Error(`Check failed: ${name}`);
}

function section(title) {
  console.log(`\n▶ ${title}`);
}

function sh(command, cwd = projectPath) {
  return execSync(command, { cwd, stdio: ["ignore", "pipe", "pipe"], encoding: "utf-8" });
}

function freePort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen(0, () => {
      const { port } = server.address();
      server.close(() => resolve(port));
    });
  });
}

/** Starts a long-running process and resolves once `ready` matches its output. */
function startProcess(command, { cwd, ready, timeout = 60_000 }) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, { cwd, shell: true, detached: true, stdio: ["ignore", "pipe", "pipe"] });
    const stop = () => {
      try { process.kill(-child.pid, "SIGTERM"); } catch { /* already gone */ }
    };
    cleanups.push(stop);

    let output = "";
    const timer = setTimeout(() => reject(new Error(`Timed out waiting for "${command}":\n${output.slice(-2000)}`)), timeout);
    const onData = (chunk) => {
      output += chunk.toString();
      if (ready.test(output)) {
        clearTimeout(timer);
        resolve({ stop, output: () => output });
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("exit", (code) => {
      clearTimeout(timer);
      reject(new Error(`"${command}" exited early with code ${code}:\n${output.slice(-2000)}`));
    });
  });
}

async function request(url, init = {}) {
  const res = await fetch(url, { ...init, headers: { "Content-Type": "application/json", ...init.headers } });
  const text = await res.text();
  let body = text;
  try { body = JSON.parse(text); } catch { /* keep text */ }
  return { status: res.status, body };
}

async function waitFor(fn, { timeout = 30_000, interval = 500 } = {}) {
  const deadline = Date.now() + timeout;
  let lastError;
  while (Date.now() < deadline) {
    try {
      const value = await fn();
      if (value) return value;
    } catch (error) {
      lastError = error;
    }
    await new Promise((resolve) => setTimeout(resolve, interval));
  }
  throw lastError ?? new Error("Timed out");
}

async function main() {
  console.log(`Celtrix custom-stack E2E — ${config.frontend} + ${backend} on ${runtime} + postgres/supabase + ${orm} (${packageManager})`);
  console.log(`Work dir: ${workDir}`);

  // ── 1. Scaffold ────────────────────────────────────────────────────────────
  section("Scaffold project through the Celtrix pipeline");
  process.chdir(workDir);
  const { setupProject } = await import(path.join(repoRoot, "utils", "project.js"));
  await setupProject(projectName, config, true);
  process.chdir(repoRoot);

  section("Generated files are wired");
  const read = (file) => fs.readFileSync(path.join(projectPath, file), "utf-8");
  const exists = (file) => fs.existsSync(path.join(projectPath, file));

  const envExample = read(".env.example");
  for (const key of ["PORT", "DATABASE_URL", "DIRECT_URL", "SUPABASE_URL", "SUPABASE_SECRET_KEY", "VITE_SUPABASE_URL", "VITE_SUPABASE_PUBLISHABLE_KEY"]) {
    check(`.env.example declares ${key}`, new RegExp(`^${key}=`, "m").test(envExample));
  }
  check(".env is git-ignored", /^\.env$/m.test(read(".gitignore")));
  check("CELTRIX_SETUP.md explains setup", read("CELTRIX_SETUP.md").includes("cp .env.example .env"));
  check("README points to the setup guide", read("README.md").includes("CELTRIX_SETUP.md"));

  const apiPkg = fs.readJsonSync(path.join(projectPath, "apps/api/package.json"));
  check("api depends on @repo/database", apiPkg.dependencies?.["@repo/database"]);
  check("api depends on @supabase/supabase-js", apiPkg.dependencies?.["@supabase/supabase-js"]);
  check("api imports @repo/database", read("apps/api/src/index.ts").includes("from '@repo/database'"));
  check("api loads the root .env", read("apps/api/src/env.ts").includes("'../../../.env'"));
  check("api has a Supabase server client", exists("apps/api/src/lib/supabase.ts"));

  const webPkg = fs.readJsonSync(path.join(projectPath, "apps/web/package.json"));
  check("web depends on @supabase/supabase-js", webPkg.dependencies?.["@supabase/supabase-js"]);
  check("web has a Supabase browser client", exists("apps/web/src/lib/supabase.ts"));
  const viteConfig = read("apps/web/vite.config.ts");
  check("vite reads the root .env", viteConfig.includes("envDir"));
  check("vite proxies /api", viteConfig.includes("'/api'"));
  check("App renders <StackStatus />", read("apps/web/src/App.tsx").includes("<StackStatus />"));

  const rootPkg = fs.readJsonSync(path.join(projectPath, "package.json"));
  check("root exposes db:push", rootPkg.scripts["db:push"] === "turbo run db:push");
  const schema = read("packages/database/prisma/schema.prisma");
  check("prisma schema uses DIRECT_URL for migrations", schema.includes('directUrl = env("DIRECT_URL")'));

  // ── 2. Database ────────────────────────────────────────────────────────────
  section("Start throwaway Postgres (stand-in for Supabase Postgres)");
  const dbPort = await freePort();
  const container = `celtrix-e2e-${process.pid}`;
  sh(`docker run -d --rm --name ${container} -e POSTGRES_PASSWORD=postgres -p 127.0.0.1:${dbPort}:5432 postgres:17-alpine`, repoRoot);
  cleanups.push(() => {
    try { execSync(`docker rm -f ${container}`, { stdio: "ignore" }); } catch { /* already gone */ }
  });
  await waitFor(() => {
    sh(`docker exec ${container} pg_isready -U postgres -h 127.0.0.1`, repoRoot);
    return true;
  });
  check(`postgres is accepting connections on :${dbPort}`, true);

  // Fill .env from the template the way a user would: same keys, local values.
  // The pooler-style ?pgbouncer=true flag is kept on DATABASE_URL to exercise that path.
  const apiPort = await freePort();
  const dbUrl = `postgresql://postgres:postgres@127.0.0.1:${dbPort}/postgres`;
  const values = {
    PORT: String(apiPort),
    DATABASE_URL: `"${dbUrl}?pgbouncer=true"`,
    DIRECT_URL: `"${dbUrl}"`,
    // No network calls are made to Supabase in this test; the clients only need values
    SUPABASE_URL: `"http://127.0.0.1:1"`,
    SUPABASE_SECRET_KEY: `"sb_secret_e2e"`,
    VITE_SUPABASE_URL: `"http://127.0.0.1:1"`,
    VITE_SUPABASE_PUBLISHABLE_KEY: `"sb_publishable_e2e"`,
  };
  const env = envExample.replace(/^([A-Z_]+)=.*$/gm, (line, key) => (key in values ? `${key}=${values[key]}` : line));
  fs.writeFileSync(path.join(projectPath, ".env"), env);

  // ── 3. Schema ──────────────────────────────────────────────────────────────
  section("Push schema via the root db:push script");
  const pmRun = (script) => (packageManager === "npm" ? `npm run ${script}` : `${packageManager} run ${script}`);
  sh(pmRun("db:push"));
  const tables = sh(`docker exec ${container} psql -U postgres -tAc "select table_name from information_schema.tables where table_schema='public'"`, repoRoot);
  check("users table exists in the database", tables.split("\n").includes("users"), tables);

  // ── 4. Build ───────────────────────────────────────────────────────────────
  section("Build (API typecheck + web production build)");
  try {
    sh(pmRun("build"));
    check("turbo build succeeds", true);
  } catch (error) {
    check("turbo build succeeds", false, `${error.stdout ?? ""}${error.stderr ?? ""}`.slice(-3000));
  }

  // ── 5. API runtime ─────────────────────────────────────────────────────────
  section("API runtime");
  const apiDir = path.join(projectPath, "apps", "api");
  await startProcess(pmRun("start"), { cwd: apiDir, ready: /API Server running/ });
  const api = `http://127.0.0.1:${apiPort}`;

  const health = await request(`${api}/api/health`);
  check("GET /api/health → 200", health.status === 200, JSON.stringify(health));
  check("health reports database up", health.body.database === "up", JSON.stringify(health.body));
  check("health reports Supabase configured", health.body.supabase === "configured", JSON.stringify(health.body));

  const email = `ada+${Date.now()}@example.com`;
  const created = await request(`${api}/api/users`, { method: "POST", body: JSON.stringify({ email, name: "Ada" }) });
  check("POST /api/users → 201", created.status === 201, JSON.stringify(created));
  check("created user has an id", typeof created.body.id === "string");

  const duplicate = await request(`${api}/api/users`, { method: "POST", body: JSON.stringify({ email }) });
  check("duplicate email → 409", duplicate.status === 409, JSON.stringify(duplicate));

  const invalid = await request(`${api}/api/users`, { method: "POST", body: JSON.stringify({ email: "nope" }) });
  check("invalid email → 400", invalid.status === 400, JSON.stringify(invalid));

  const list = await request(`${api}/api/users`);
  check("GET /api/users lists the new user", Array.isArray(list.body) && list.body.some((u) => u.email === email), JSON.stringify(list));

  const rows = sh(`docker exec ${container} psql -U postgres -tAc "select email from users"`, repoRoot);
  check("row is persisted in Postgres", rows.includes(email), rows);

  const me = await request(`${api}/api/me`);
  check("GET /api/me without a token → 401", me.status === 401, JSON.stringify(me));

  // ── 6. Frontend ↔ API ──────────────────────────────────────────────────────
  section("Frontend ↔ API through the Vite proxy");
  const webPort = await freePort();
  const webDir = path.join(projectPath, "apps", "web");
  await startProcess(`${pmRun("dev")} -- --port ${webPort} --strictPort --host 127.0.0.1`, { cwd: webDir, ready: /Local:/ });
  const web = `http://127.0.0.1:${webPort}`;

  const page = await request(web);
  check("web dev server serves index.html", page.status === 200 && String(page.body).includes('id="root"'));

  const proxiedHealth = await request(`${web}/api/health`);
  check("GET /api/health via proxy → 200", proxiedHealth.status === 200 && proxiedHealth.body.database === "up", JSON.stringify(proxiedHealth));

  const proxiedUsers = await request(`${web}/api/users`);
  check("GET /api/users via proxy returns the user", Array.isArray(proxiedUsers.body) && proxiedUsers.body.some((u) => u.email === email));

  const supabaseModule = await request(`${web}/src/lib/supabase.ts`);
  check("browser bundle receives VITE_SUPABASE_URL from the root .env", String(supabaseModule.body).includes("http://127.0.0.1:1"));
}

function cleanup() {
  while (cleanups.length) cleanups.pop()();
  // Never delete a caller-provided --dir, only the project created inside it
  if (!keep) fs.removeSync(option("dir") ? projectPath : workDir);
}

main()
  .then(() => {
    cleanup();
    console.log(`\n✅ ${results.length} checks passed${keep ? ` — project kept at ${projectPath}` : ""}`);
  })
  .catch((error) => {
    cleanup();
    console.error(`\n❌ E2E failed after ${results.filter((r) => r.ok).length} passing checks: ${error.message}`);
    if (keep) console.error(`   Project kept at ${projectPath}`);
    process.exit(1);
  });
