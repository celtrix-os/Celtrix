import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { generateDatabase } from "../utils/customGenerators/databaseGenerator.js";

function createContext(options = {}) {
  const projectPath = fs.mkdtempSync(
    path.join(os.tmpdir(), "celtrix-database-")
  );

  return {
    projectPath,
    context: {
      projectPath,
      projectName: "test-app",
      config: {
        database: {
          type: "postgres",
          provider: "local",
        },
        orm: "prisma",
        language: "typescript",
      },
      installDeps: false,
      hasFrontend: true,
      hasBackend: true,
      packageManager: "npm",
      isTs: true,
      ext: "ts",
      ...options,
    },
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

test("Prisma generates schema, client and database scripts", async (t) => {
  const { projectPath, context } = createContext();

  t.after(() => {
    fs.rmSync(projectPath, { recursive: true, force: true });
  });

  await generateDatabase(context);

  const databaseDir = path.join(projectPath, "packages", "database");
  const pkg = readJson(path.join(databaseDir, "package.json"));
  const schema = fs.readFileSync(
    path.join(databaseDir, "prisma", "schema.prisma"),
    "utf-8"
  );
  const client = fs.readFileSync(
    path.join(databaseDir, "src", "index.ts"),
    "utf-8"
  );

  assert.equal(pkg.name, "@repo/database");
  assert.equal(pkg.main, "./src/index.ts");
  assert.equal(pkg.types, "./src/index.ts");

  assert.equal(pkg.scripts["db:generate"], "prisma generate");
  assert.equal(
    pkg.scripts["db:push"],
    "dotenv -e ../../.env -- prisma db push"
  );
  assert.equal(
    pkg.scripts["db:migrate"],
    "dotenv -e ../../.env -- prisma migrate dev"
  );
  assert.equal(
    pkg.scripts["db:studio"],
    "dotenv -e ../../.env -- prisma studio"
  );
  assert.equal(pkg.scripts.postinstall, "prisma generate");

  assert.match(schema, /provider\s*=\s*"postgresql"/);
  assert.match(schema, /url\s+= env\("DATABASE_URL"\)/);
  assert.match(client, /import \{ PrismaClient \}/);
  assert.match(client, /export const users/);
  assert.match(client, /export type \{ User \}/);

  // No dependencies should be installed by this test.
  assert.equal(fs.existsSync(path.join(projectPath, "node_modules")), false);
});

test("Supabase Prisma schema uses DIRECT_URL for migrations", async (t) => {
  const { projectPath, context } = createContext({
    config: {
      database: {
        type: "postgres",
        provider: "supabase",
      },
      orm: "prisma",
      language: "typescript",
    },
  });

  t.after(() => {
    fs.rmSync(projectPath, { recursive: true, force: true });
  });

  await generateDatabase(context);

  const schema = fs.readFileSync(
    path.join(projectPath, "packages", "database", "prisma", "schema.prisma"),
    "utf-8"
  );

  assert.match(schema, /url\s+= env\("DATABASE_URL"\)/);
  assert.match(schema, /directUrl\s+= env\("DIRECT_URL"\)/);
});

test("Mongoose generates a client without Prisma database scripts", async (t) => {
  const { projectPath, context } = createContext({
    config: {
      database: {
        type: "mongodb",
        provider: "atlas",
      },
      orm: "mongoose",
      language: "javascript",
    },
    isTs: false,
    ext: "js",
  });

  t.after(() => {
    fs.rmSync(projectPath, { recursive: true, force: true });
  });

  await generateDatabase(context);

  const databaseDir = path.join(projectPath, "packages", "database");
  const pkg = readJson(path.join(databaseDir, "package.json"));
  const client = fs.readFileSync(
    path.join(databaseDir, "src", "index.js"),
    "utf-8"
  );

  assert.equal(pkg.main, "./src/index.js");
  assert.deepEqual(pkg.scripts, {});

  assert.ok(client.includes("import mongoose, { Schema }"));
  assert.ok(client.includes("mongoose.model('User'"));
  assert.ok(client.includes("export async function checkConnection"));

  assert.equal(
    fs.existsSync(path.join(databaseDir, "prisma", "schema.prisma")),
    false
  );
});

test("standalone Prisma uses the project-level .env path", async (t) => {
  const { projectPath, context } = createContext({
    hasFrontend: false,
    hasBackend: true,
    config: {
      database: {
        type: "sqlite",
        provider: "local",
      },
      orm: "prisma",
      language: "javascript",
    },
    isTs: false,
    ext: "js",
  });

  t.after(() => {
    fs.rmSync(projectPath, { recursive: true, force: true });
  });

  await generateDatabase(context);

  const pkg = readJson(path.join(projectPath, "package.json"));
  const schema = fs.readFileSync(
    path.join(projectPath, "prisma", "schema.prisma"),
    "utf-8"
  );

  assert.equal(pkg.main, "./src/index.js");
  assert.equal(
    pkg.scripts["db:push"],
    "dotenv -e .env -- prisma db push"
  );
  assert.match(schema, /provider\s*=\s*"sqlite"/);
});