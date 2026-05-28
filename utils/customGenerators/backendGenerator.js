import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import { getInstallCommand } from "../shared.js";

export async function generateBackend(context) {
  const targetDir = context.hasFrontend 
    ? path.join(context.projectPath, "apps", "api")
    : context.projectPath;

  fs.ensureDirSync(targetDir);

  const pkgJson = {
    name: "api",
    version: "1.0.0",
    type: "module",
    scripts: {
      dev: context.config.backend === "hono" ? "tsx watch src/index.ts" : "nodemon src/index.ts",
      build: "tsc",
      start: "node dist/index.js"
    }
  };
  fs.writeJsonSync(path.join(targetDir, "package.json"), pkgJson, { spaces: 2 });

  // TS Setup
  if (context.isTs) {
    const tsconfig = {
      extends: "../../packages/tsconfig/base.json",
      compilerOptions: {
        outDir: "./dist",
        rootDir: "./src"
      },
      include: ["src/**/*"]
    };
    fs.writeJsonSync(path.join(targetDir, "tsconfig.json"), tsconfig, { spaces: 2 });
  }

  // Generate source codes
  fs.ensureDirSync(path.join(targetDir, "src"));
  fs.writeFileSync(
    path.join(targetDir, "src", `index.${context.ext}`),
    getBackendSourceTemplate(context.config.backend, context)
  );

  // Download production packages dynamically
  if (context.installDeps) {
    const deps = getBackendDeps(context.config.backend);
    const devDeps = ["typescript", "@types/node", "tsx", "nodemon"];
    const installCmd = getInstallCommand(context.packageManager);
    execSync(`${context.packageManager} ${installCmd} ${deps.join(" ")}`, { cwd: targetDir, stdio: "inherit" });
    execSync(`${context.packageManager} ${installCmd} -D ${devDeps.join(" ")}`, { cwd: targetDir, stdio: "inherit" });
  }
}

function getBackendDeps(backend) {
  switch (backend) {
    case "hono": return ["hono", "@hono/node-server"];
    case "fastify": return ["fastify", "@fastify/cors"];
    case "express":
    default:
      return ["express", "cors", "helmet", "dotenv"];
  }
}

function getBackendSourceTemplate(backend, context) {
  if (backend === "hono") {
    return `import { Hono } from 'hono';
import { serve } from '@hono/node-server';

const app = new Hono();

app.get('/api/health', (c) => c.json({ status: 'ok', engine: 'Hono' }));

console.log('🚀 API Server starting on port 3001');
serve({ fetch: app.fetch, port: 3001 });
`;
  }

  // Express fallback
  return `import express from 'express';
import cors from 'cors';
import helmet from 'helmet';

const app = express();
app.use(cors());
app.use(helmet());
app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', engine: 'Express' });
});

app.listen(3001, () => {
  console.log('🚀 API Server running on port 3001');
});
`;
}
