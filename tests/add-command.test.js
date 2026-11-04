import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { parseCliArgs } from "../utils/cliFlags.js";
import { addCommand } from "../commands/add.js";
import { readCeltrixLock } from "../utils/projectDetector.js";

function createTempProject(files = {}, name = "test-app") {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "celtrix-add-test-"));
  const defaultPkg = {
    name,
    version: "1.0.0",
    scripts: {
      dev: "next dev",
    },
    dependencies: {
      next: "^15.0.0",
      react: "^19.0.0",
    },
    devDependencies: {
      typescript: "^5.0.0",
    },
  };
  fs.writeFileSync(path.join(dir, "package.json"), JSON.stringify(defaultPkg, null, 2));
  fs.writeFileSync(path.join(dir, "tsconfig.json"), "{}");

  for (const [relPath, content] of Object.entries(files)) {
    const fullPath = path.join(dir, relPath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, content);
  }
  return dir;
}

test("parseCliArgs correctly recognizes add command and its integrations", () => {
  const cli1 = parseCliArgs(["add", "husky"]);
  assert.equal(cli1.command, "add");
  assert.equal(cli1.integration, "husky");
  assert.deepEqual(cli1.subArguments, []);

  const cli2 = parseCliArgs(["add", "biome"]);
  assert.equal(cli2.command, "add");
  assert.equal(cli2.integration, "biome");

  const cli3 = parseCliArgs(["add", "auth", "clerk"]);
  assert.equal(cli3.command, "add");
  assert.equal(cli3.integration, "auth");
  assert.deepEqual(cli3.subArguments, ["clerk"]);

  const cli4 = parseCliArgs(["add", "prisma", "postgres"]);
  assert.equal(cli4.command, "add");
  assert.equal(cli4.integration, "prisma");
  assert.deepEqual(cli4.subArguments, ["postgres"]);

  const cli5 = parseCliArgs(["add", "vercel-ai"]);
  assert.equal(cli5.command, "add");
  assert.equal(cli5.integration, "vercel-ai");
});

test("addCommand husky sets up pre-commit hook, lintstagedrc, scripts, and updates celtrix.json", async () => {
  const projectDir = createTempProject();
  const origCwd = process.cwd();
  process.chdir(projectDir);

  try {
    await addCommand({ command: "add", integration: "husky", install: false });

    assert.ok(fs.existsSync(path.join(projectDir, ".husky", "pre-commit")));
    assert.ok(fs.existsSync(path.join(projectDir, ".lintstagedrc.json")));

    const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, "package.json"), "utf-8"));
    assert.equal(pkg.scripts.prepare, "husky");

    const lock = readCeltrixLock(projectDir);
    assert.ok(lock.integrations.includes("husky"));
  } finally {
    process.chdir(origCwd);
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test("addCommand biome writes biome.json, updates package scripts and celtrix.json", async () => {
  const projectDir = createTempProject();
  const origCwd = process.cwd();
  process.chdir(projectDir);

  try {
    await addCommand({ command: "add", integration: "biome", install: false });

    assert.ok(fs.existsSync(path.join(projectDir, "biome.json")));

    const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, "package.json"), "utf-8"));
    assert.ok(pkg.scripts.lint.includes("biome"));
    assert.ok(pkg.scripts.format.includes("biome"));

    const lock = readCeltrixLock(projectDir);
    assert.ok(lock.integrations.includes("biome"));
  } finally {
    process.chdir(origCwd);
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test("addCommand auth (clerk) sets up Clerk middleware, env variables, and celtrix.json", async () => {
  const projectDir = createTempProject();
  const origCwd = process.cwd();
  process.chdir(projectDir);

  try {
    await addCommand({ command: "add", integration: "clerk", install: false });

    assert.ok(fs.existsSync(path.join(projectDir, "middleware.ts")));
    const middlewareContent = fs.readFileSync(path.join(projectDir, "middleware.ts"), "utf-8");
    assert.ok(middlewareContent.includes("clerkMiddleware"));

    const envContent = fs.readFileSync(path.join(projectDir, ".env.example"), "utf-8");
    assert.ok(envContent.includes("CLERK_PUBLISHABLE_KEY") || envContent.includes("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY"));

    const lock = readCeltrixLock(projectDir);
    assert.ok(lock.integrations.includes("clerk"));
  } finally {
    process.chdir(origCwd);
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test("addCommand auth (better-auth) sets up Better Auth config, route handler, and env variables", async () => {
  const projectDir = createTempProject();
  const origCwd = process.cwd();
  process.chdir(projectDir);

  try {
    await addCommand({ command: "add", integration: "better-auth", install: false });

    assert.ok(fs.existsSync(path.join(projectDir, "src", "lib", "auth.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "src", "app", "api", "auth", "[...all]", "route.ts")));

    const envContent = fs.readFileSync(path.join(projectDir, ".env.example"), "utf-8");
    assert.ok(envContent.includes("BETTER_AUTH_SECRET"));

    const lock = readCeltrixLock(projectDir);
    assert.ok(lock.integrations.includes("better-auth"));
  } finally {
    process.chdir(origCwd);
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test("addCommand prisma writes schema.prisma with chosen DB, client helper, scripts, and updates celtrix.json", async () => {
  const projectDir = createTempProject();
  const origCwd = process.cwd();
  process.chdir(projectDir);

  try {
    await addCommand({ command: "add", integration: "prisma", subArguments: ["postgresql"], install: false });

    const schemaPath = path.join(projectDir, "prisma", "schema.prisma");
    assert.ok(fs.existsSync(schemaPath));
    const schemaContent = fs.readFileSync(schemaPath, "utf-8");
    assert.ok(schemaContent.includes('provider = "postgresql"'));
    assert.ok(schemaContent.includes("model User"));

    const clientPath = path.join(projectDir, "src", "lib", "db.ts");
    assert.ok(fs.existsSync(clientPath));

    const pkg = JSON.parse(fs.readFileSync(path.join(projectDir, "package.json"), "utf-8"));
    assert.equal(pkg.scripts["db:push"], "prisma db push");
    assert.equal(pkg.scripts["db:generate"], "prisma generate");

    const envContent = fs.readFileSync(path.join(projectDir, ".env.example"), "utf-8");
    assert.ok(envContent.includes("DATABASE_URL"));

    const lock = readCeltrixLock(projectDir);
    assert.ok(lock.integrations.includes("prisma"));
    assert.equal(lock.orm, "prisma");
    assert.equal(lock.database.type, "postgresql");
  } finally {
    process.chdir(origCwd);
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test("addCommand vercel-ai sets up chat route, Chat component, env vars, and updates celtrix.json", async () => {
  const projectDir = createTempProject();
  const origCwd = process.cwd();
  process.chdir(projectDir);

  try {
    await addCommand({ command: "add", integration: "vercel-ai", install: false });

    assert.ok(fs.existsSync(path.join(projectDir, "src", "app", "api", "chat", "route.ts")));
    assert.ok(fs.existsSync(path.join(projectDir, "src", "components", "Chat.tsx")));

    const envContent = fs.readFileSync(path.join(projectDir, ".env.example"), "utf-8");
    assert.ok(envContent.includes("OPENAI_API_KEY"));

    const lock = readCeltrixLock(projectDir);
    assert.ok(lock.integrations.includes("vercel-ai"));
  } finally {
    process.chdir(origCwd);
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

test("addCommand NEVER overwrites existing user files", async () => {
  const existingSchema = "// Custom user schema\nmodel CustomUser { id String @id }";
  const projectDir = createTempProject({
    "prisma/schema.prisma": existingSchema,
    "biome.json": '{"customBiome": true}',
  });
  const origCwd = process.cwd();
  process.chdir(projectDir);

  try {
    await addCommand({ command: "add", integration: "prisma", subArguments: ["mysql"], install: false });
    await addCommand({ command: "add", integration: "biome", install: false });

    // Ensure files were NOT overwritten
    assert.equal(fs.readFileSync(path.join(projectDir, "prisma", "schema.prisma"), "utf-8"), existingSchema);
    assert.equal(fs.readFileSync(path.join(projectDir, "biome.json"), "utf-8"), '{"customBiome": true}');
  } finally {
    process.chdir(origCwd);
    fs.rmSync(projectDir, { recursive: true, force: true });
  }
});

