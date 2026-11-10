import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { generateWiring } from "../utils/customGenerators/wiringGenerator.js";

function createProject() {
  const projectPath = fs.mkdtempSync(
    path.join(os.tmpdir(), "celtrix-wiring-")
  );

  return projectPath;
}

function writeJson(filePath, data) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf-8"));
}

function createContext(projectPath, options = {}) {
  return {
    projectPath,
    packageManager: "npm",
    ext: "ts",
    jsxExt: "tsx",
    isTs: true,
    config: {
      frontend: "nuxt",
      database: { type: "postgres", provider: "local" },
    },
    ...options,
  };
}

test("Prisma workspace is linked and database tasks are wired to Turbo", async (t) => {
  const projectPath = createProject();

  t.after(() => {
    fs.rmSync(projectPath, { recursive: true, force: true });
  });

  writeJson(path.join(projectPath, "package.json"), {
    name: "test-app",
    scripts: { dev: "turbo run dev", test: "node --test" },
  });

  writeJson(path.join(projectPath, "turbo.json"), {
    tasks: {
      build: { dependsOn: ["^build"] },
    },
  });

  writeJson(path.join(projectPath, "apps", "api", "package.json"), {
    name: "@repo/api",
    dependencies: { express: "^5.0.0" },
  });

  writeJson(path.join(projectPath, "packages", "database", "package.json"), {
    name: "@repo/database",
    scripts: {
      "db:generate": "prisma generate",
      "db:push": "dotenv -e ../../.env -- prisma db push",
      "db:migrate": "dotenv -e ../../.env -- prisma migrate dev",
      "db:studio": "dotenv -e ../../.env -- prisma studio",
    },
  });

  await generateWiring(createContext(projectPath));

  const apiPkg = readJson(
    path.join(projectPath, "apps", "api", "package.json")
  );
  const rootPkg = readJson(path.join(projectPath, "package.json"));
  const turbo = readJson(path.join(projectPath, "turbo.json"));

  assert.equal(apiPkg.dependencies["@repo/database"], "*");
  assert.equal(apiPkg.dependencies.express, "^5.0.0");

  assert.equal(rootPkg.scripts["db:generate"], "turbo run db:generate");
  assert.equal(rootPkg.scripts["db:push"], "turbo run db:push");
  assert.equal(rootPkg.scripts["db:migrate"], "turbo run db:migrate");
  assert.equal(rootPkg.scripts["db:studio"], "turbo run db:studio");

  assert.deepEqual(turbo.tasks["db:push"], { cache: false });
  assert.deepEqual(turbo.tasks["db:studio"], {
    cache: false,
    persistent: true,
  });

  assert.equal(rootPkg.scripts.test, "node --test");
  assert.deepEqual(turbo.tasks.build, { dependsOn: ["^build"] });
});

test("Mongoose workspace is linked without adding Prisma database tasks", async (t) => {
  const projectPath = createProject();

  t.after(() => {
    fs.rmSync(projectPath, { recursive: true, force: true });
  });

  writeJson(path.join(projectPath, "package.json"), {
    name: "test-app",
    scripts: { dev: "turbo run dev", test: "node --test" },
  });

  writeJson(path.join(projectPath, "turbo.json"), {
    tasks: { build: { dependsOn: ["^build"] } },
  });

  writeJson(path.join(projectPath, "apps", "api", "package.json"), {
    name: "@repo/api",
    dependencies: {},
  });

  writeJson(path.join(projectPath, "packages", "database", "package.json"), {
    name: "@repo/database",
    scripts: {},
  });

  await generateWiring(createContext(projectPath));

  const apiPkg = readJson(
    path.join(projectPath, "apps", "api", "package.json")
  );
  const rootPkg = readJson(path.join(projectPath, "package.json"));
  const turbo = readJson(path.join(projectPath, "turbo.json"));

  assert.equal(apiPkg.dependencies["@repo/database"], "*");
  assert.equal(rootPkg.scripts["db:push"], undefined);
  assert.equal(rootPkg.scripts["db:migrate"], undefined);
  assert.deepEqual(turbo.tasks, {
    build: { dependsOn: ["^build"] },
  });
});

test("React Router wiring generates the Vite config, API client and status component", async (t) => {
  const projectPath = createProject();
  const webDir = path.join(projectPath, "apps", "web");

  t.after(() => {
    fs.rmSync(projectPath, { recursive: true, force: true });
  });

  fs.mkdirSync(path.join(webDir, "src"), { recursive: true });

  fs.writeFileSync(
    path.join(webDir, "vite.config.ts"),
    "export default {};\n"
  );

  fs.writeFileSync(
    path.join(webDir, "src", "App.tsx"),
    [
      "import { useState } from 'react'",
      "const VIEWS = ['todo'] as const",
      "export default function App() {",
      "        {view === 'todo' && <TodoPanel />}",
      "}",
      "",
    ].join("\n")
  );

  await generateWiring(
    createContext(projectPath, {
      config: {
        frontend: "react-router",
        database: { type: "postgres", provider: "local" },
      },
    })
  );

  const viteConfig = fs.readFileSync(
    path.join(webDir, "vite.config.ts"),
    "utf-8"
  );
  const apiClient = fs.readFileSync(
    path.join(webDir, "src", "lib", "api.ts"),
    "utf-8"
  );
  const statusComponent = fs.readFileSync(
    path.join(webDir, "src", "components", "StackStatus.tsx"),
    "utf-8"
  );
  const app = fs.readFileSync(
    path.join(webDir, "src", "App.tsx"),
    "utf-8"
  );

  assert.match(viteConfig, /envDir/);
  assert.match(viteConfig, /proxy/);
  assert.match(viteConfig, /\/api/);

  assert.match(apiClient, /fetch\('\/api\/health'\)/);
  assert.match(statusComponent, /api\.health\(\)/);

  assert.match(app, /import StackStatus from '\.\/components\/StackStatus'/);
  assert.match(app, /const VIEWS = \['status', 'todo'\]/);
  assert.match(app, /view === 'status'/);
});

test("Next.js wiring adds an API rewrite to next.config", async (t) => {
  const projectPath = createProject();
  const webDir = path.join(projectPath, "apps", "web");

  t.after(() => {
    fs.rmSync(projectPath, { recursive: true, force: true });
  });

  fs.mkdirSync(path.join(webDir, "src"), { recursive: true });

  fs.writeFileSync(
    path.join(webDir, "next.config.ts"),
    [
      "import type { NextConfig } from 'next'",
      "const nextConfig: NextConfig = {",
      "  /* config options here */",
      "}",
      "export default nextConfig",
      "",
    ].join("\n")
  );

  await generateWiring(
    createContext(projectPath, {
      config: {
        frontend: "nextjs",
        database: { type: "postgres", provider: "local" },
      },
    })
  );

  const nextConfig = fs.readFileSync(
    path.join(webDir, "next.config.ts"),
    "utf-8"
  );

  assert.match(nextConfig, /async rewrites\(\)/);
  assert.match(nextConfig, /source: "\/api\/:path\*"/);
  assert.match(nextConfig, /destination:.*apiUrl/);
  assert.ok(
    fs.existsSync(path.join(webDir, "src", "lib", "api.ts"))
  );
  assert.ok(
    fs.existsSync(path.join(webDir, "src", "components", "StackStatus.tsx"))
  );
});