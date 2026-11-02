import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { generateBackend } from "../utils/customGenerators/backendGenerator.js";

async function generate(config) {
  const projectPath = fs.mkdtempSync(path.join(os.tmpdir(), "celtrix-backend-"));
  const isTs = (config.language ?? "typescript") === "typescript";
  await generateBackend({
    projectPath,
    config: { database: { type: "postgres", provider: "docker" }, orm: "prisma", runtime: "node", ...config },
    installDeps: false,
    hasFrontend: true,
    hasBackend: true,
    packageManager: "npm",
    isTs,
    ext: isTs ? "ts" : "js",
  });
  const apiDir = path.join(projectPath, "apps", "api");
  return {
    source: fs.readFileSync(path.join(apiDir, "src", `index.${isTs ? "ts" : "js"}`), "utf-8"),
    pkg: JSON.parse(fs.readFileSync(path.join(apiDir, "package.json"), "utf-8")),
  };
}

test("Fastify generates a Fastify server, not Express", async () => {
  for (const language of ["typescript", "javascript"]) {
    const { source } = await generate({ backend: "fastify", language });
    assert.ok(source.includes("from 'fastify'") && source.includes("from '@fastify/cors'"), language);
    assert.ok(!source.includes("express"), language);
    assert.ok(source.includes("engine: 'Fastify'"), language);
    for (const route of ["/api/health", "/api/users"]) assert.ok(source.includes(`'${route}'`), `${language} ${route}`);
    assert.ok(source.includes("reply.code(409)") && source.includes("reply.code(400)"), language);
  }
});

test("each backend reports its own engine", async () => {
  for (const [backend, engine] of [["express", "Express"], ["hono", "Hono"], ["fastify", "Fastify"]]) {
    const { source } = await generate({ backend });
    assert.ok(source.includes(`engine: '${engine}'`), backend);
  }
});

test("the runtime decides how the API runs", async () => {
  const node = await generate({ backend: "express", runtime: "node" });
  assert.equal(node.pkg.scripts.dev, "tsx watch src/index.ts");
  assert.equal(node.pkg.scripts.start, "tsx src/index.ts");

  const bun = await generate({ backend: "express", runtime: "bun" });
  assert.equal(bun.pkg.scripts.dev, "bun --watch src/index.ts");
  assert.equal(bun.pkg.scripts.start, "bun src/index.ts");
});
