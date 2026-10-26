import fs from "fs-extra";
import path from "path";
import { run } from "../progress.js";
import { getInstallCommand } from "../shared.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateBackend(context) {
  const targetDir = context.hasFrontend
    ? path.join(context.projectPath, "apps", "api")
    : context.projectPath;

  fs.ensureDirSync(targetDir);

  const features = getBackendFeatures(context);
  const entry = `src/index.${context.ext}`;
  // Bun runs TypeScript natively; on Node.js, tsx does
  const isBun = context.config.runtime === "bun";

  const pkgJson = {
    name: "api",
    version: "1.0.0",
    type: "module",
    scripts: {
      dev: isBun ? `bun --watch ${entry}` : `tsx watch ${entry}`,
      // The API imports workspace packages as TypeScript source, so it runs them directly
      build: context.isTs ? "tsc --noEmit" : `node --check ${entry}`,
      start: isBun ? `bun ${entry}` : `tsx ${entry}`
    }
  };
  fs.writeJsonSync(path.join(targetDir, "package.json"), pkgJson, { spaces: 2 });

  // Add .gitignore for backend from template
  const templatesDir = context.templatesDir || path.join(__dirname, "../../templates/gitignore");
  const backendGitignorePath = path.join(templatesDir, "backend.gitignore");
  if (fs.existsSync(backendGitignorePath)) {
    fs.copyFileSync(backendGitignorePath, path.join(targetDir, ".gitignore"));
  }

  // TS Setup
  if (context.isTs) {
    // Standalone APIs have no shared packages/tsconfig to extend
    const tsconfig = {
      extends: context.hasFrontend ? "../../packages/tsconfig/base.json" : undefined,
      compilerOptions: {
        ...(context.hasFrontend ? {} : {
          target: "ES2022",
          module: "NodeNext",
          moduleResolution: "NodeNext",
          esModuleInterop: true,
          strict: true,
          skipLibCheck: true
        }),
        noEmit: true,
        types: ["node"]
      },
      include: ["src/**/*"]
    };
    fs.writeJsonSync(path.join(targetDir, "tsconfig.json"), tsconfig, { spaces: 2 });
  }

  // Generate source codes
  fs.ensureDirSync(path.join(targetDir, "src"));
  fs.writeFileSync(path.join(targetDir, "src", `env.${context.ext}`), getEnvTemplate(context, features));
  fs.writeFileSync(
    path.join(targetDir, "src", `index.${context.ext}`),
    getBackendSourceTemplate(context.config.backend, context, features)
  );

  // Download production packages dynamically
  if (context.installDeps) {
    const deps = getBackendDeps(context.config.backend);
    const devDeps = isBun ? [] : ["tsx"];
    if (context.isTs) {
      devDeps.push("typescript", "@types/node");
      // Hono and Fastify ship their own types
      if (context.config.backend === "express") devDeps.push("@types/express", "@types/cors");
    }
    const installCmd = getInstallCommand(context.packageManager);
    await run(`${context.packageManager} ${installCmd} ${deps.join(" ")}`, { cwd: targetDir });
    if (devDeps.length > 0) {
      await run(`${context.packageManager} ${installCmd} -D ${devDeps.join(" ")}`, { cwd: targetDir });
    }
  }
}

/**
 * Decides which integrations the generated API code wires in.
 * The shared @repo/database package only exists in the monorepo layout.
 */
function getBackendFeatures(context) {
  const { database, orm } = context.config;
  const hasDatabase = Boolean(
    context.hasFrontend && database && database.type !== "none" && orm && orm !== "none"
  );
  return {
    database: hasDatabase,
    supabase: Boolean(database && database.provider === "supabase"),
  };
}

function getBackendDeps(backend) {
  switch (backend) {
    case "hono": return ["hono", "@hono/node-server", "dotenv"];
    case "fastify": return ["fastify", "@fastify/cors", "dotenv"];
    case "express":
    default:
      return ["express", "cors", "helmet", "dotenv"];
  }
}

function getEnvTemplate(context, features) {
  // apps/api/src -> repo root in a monorepo, otherwise the project root
  const envPath = context.hasFrontend ? "../../../.env" : "../.env";
  const t = (type) => (context.isTs ? type : "");

  const vars = [
    `  PORT: Number(process.env.PORT) || 3001,`,
    `  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',`,
  ];
  if (features.database) vars.push(`  DATABASE_URL: required('DATABASE_URL'),`);
  if (features.supabase) {
    vars.push(
      `  SUPABASE_URL: process.env.SUPABASE_URL || '',`,
      `  SUPABASE_SECRET_KEY: process.env.SUPABASE_SECRET_KEY || '',`
    );
  }

  return `import { config } from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Load the single workspace-level .env (shared with the ORM CLI and the web app).
// Variables already present in the environment (e.g. in production) take precedence.
config({
  path: path.resolve(path.dirname(fileURLToPath(import.meta.url)), '${envPath}'),
  quiet: true,
});

function required(name${t(": string")})${t(": string")} {
  const value = process.env[name];
  if (!value) {
    throw new Error(\`Missing required environment variable \${name} — copy .env.example to .env and fill it in.\`);
  }
  return value;
}

export const env = {
${vars.join("\n")}
};
`;
}

function getBackendSourceTemplate(backend, context, features) {
  const t = (type) => (context.isTs ? type : "");
  const imports = [`import { env } from './env.js';`];
  const dbImport = features.database
    ? `import { checkConnection, isUniqueViolation, users } from '@repo/database';`
    : null;
  const supabaseImport = features.supabase
    ? `import { getUserFromToken, supabaseAdmin } from './lib/supabase.js';`
    : null;

  const engineName = { hono: "Hono", fastify: "Fastify" }[backend] ?? "Express";
  const engine = `engine: '${engineName}'`;
  const healthFields = features.database
    ? [`status: database === 'up' ? 'ok' : 'degraded'`, engine, `database`]
    : [`status: 'ok'`, engine];
  if (features.supabase) healthFields.push(`supabase: supabaseAdmin ? 'configured' : 'not-configured'`);
  const healthCheck = features.database
    ? `const database = await checkConnection().then(() => 'up', () => 'down');\n  `
    : "";
  const healthStatus = features.database ? `database === 'up' ? 200 : 503` : "200";

  if (backend === "hono") {
    imports.push(
      `import { Hono } from 'hono';`,
      `import { cors } from 'hono/cors';`,
      `import { serve } from '@hono/node-server';`
    );
    if (dbImport) imports.push(dbImport);
    if (supabaseImport) imports.push(supabaseImport);

    const routes = [];
    if (features.database) {
      routes.push(`
app.get('/api/users', async (c) => c.json(await users.list()));

app.post('/api/users', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  if (typeof body.email !== 'string' || !body.email.includes('@')) {
    return c.json({ error: 'A valid email is required' }, 400);
  }
  try {
    const user = await users.create({ email: body.email, name: typeof body.name === 'string' ? body.name : null });
    return c.json(user, 201);
  } catch (error) {
    if (isUniqueViolation(error)) return c.json({ error: 'Email already exists' }, 409);
    throw error;
  }
});`);
    }
    if (features.supabase) {
      routes.push(`
// Requires "Authorization: Bearer <supabase access token>"
app.get('/api/me', async (c) => {
  const user = await getUserFromToken(c.req.header('Authorization'));
  if (!user) return c.json({ error: 'Unauthorized' }, 401);
  return c.json({ id: user.id, email: user.email });
});`);
    }

    return `${imports.join("\n")}

const app = new Hono();

app.use('/api/*', cors({ origin: env.CORS_ORIGIN }));

app.get('/api/health', async (c) => {
  ${healthCheck}return c.json({ ${healthFields.join(", ")} }, ${healthStatus});
});
${routes.join("\n")}

app.onError((error, c) => {
  console.error(error);
  return c.json({ error: 'Internal server error' }, 500);
});

serve({ fetch: app.fetch, port: env.PORT }, () => {
  console.log(\`🚀 API Server running on http://localhost:\${env.PORT}\`);
});
`;
  }

  if (backend === "fastify") {
    imports.push(
      `import Fastify${context.isTs ? ", { type FastifyError }" : ""} from 'fastify';`,
      `import cors from '@fastify/cors';`
    );
    if (dbImport) imports.push(dbImport);
    if (supabaseImport) imports.push(supabaseImport);

    const routes = [];
    if (features.database) {
      routes.push(`
app.get('/api/users', async () => users.list());

app.post('/api/users', async (request, reply) => {
  const { email, name } = (request.body ?? {})${t(" as { email?: unknown; name?: unknown }")};
  if (typeof email !== 'string' || !email.includes('@')) {
    return reply.code(400).send({ error: 'A valid email is required' });
  }
  try {
    return reply.code(201).send(await users.create({ email, name: typeof name === 'string' ? name : null }));
  } catch (error) {
    if (isUniqueViolation(error)) return reply.code(409).send({ error: 'Email already exists' });
    throw error;
  }
});`);
    }
    if (features.supabase) {
      routes.push(`
// Requires "Authorization: Bearer <supabase access token>"
app.get('/api/me', async (request, reply) => {
  const user = await getUserFromToken(request.headers.authorization);
  if (!user) return reply.code(401).send({ error: 'Unauthorized' });
  return { id: user.id, email: user.email };
});`);
    }

    return `${imports.join("\n")}

const app = Fastify();

app.register(cors, { origin: env.CORS_ORIGIN });

app.get('/api/health', async (_request, reply) => {
  ${healthCheck}return reply.code(${healthStatus}).send({ ${healthFields.join(", ")} });
});
${routes.join("\n")}

app.setErrorHandler${t("<FastifyError>")}((error, _request, reply) => {
  // Client errors such as malformed JSON keep their 4xx status
  if (error.statusCode && error.statusCode < 500) {
    return reply.code(error.statusCode).send({ error: error.message });
  }
  console.error(error);
  return reply.code(500).send({ error: 'Internal server error' });
});

try {
  await app.listen({ port: env.PORT });
  console.log(\`🚀 API Server running on http://localhost:\${env.PORT}\`);
} catch (error) {
  console.error(error);
  process.exit(1);
}
`;
  }

  // Express fallback
  imports.push(
    `import express${context.isTs ? ", { type NextFunction, type Request, type Response }" : ""} from 'express';`,
    `import cors from 'cors';`,
    `import helmet from 'helmet';`
  );
  if (dbImport) imports.push(dbImport);
  if (supabaseImport) imports.push(supabaseImport);

  const routes = [];
  if (features.database) {
    routes.push(`
app.get('/api/users', async (_req, res) => {
  res.json(await users.list());
});

app.post('/api/users', async (req, res) => {
  const { email, name } = req.body ?? {};
  if (typeof email !== 'string' || !email.includes('@')) {
    res.status(400).json({ error: 'A valid email is required' });
    return;
  }
  try {
    res.status(201).json(await users.create({ email, name: typeof name === 'string' ? name : null }));
  } catch (error) {
    if (isUniqueViolation(error)) {
      res.status(409).json({ error: 'Email already exists' });
      return;
    }
    throw error;
  }
});`);
  }
  if (features.supabase) {
    routes.push(`
// Requires "Authorization: Bearer <supabase access token>"
app.get('/api/me', async (req, res) => {
  const user = await getUserFromToken(req.headers.authorization);
  if (!user) {
    res.status(401).json({ error: 'Unauthorized' });
    return;
  }
  res.json({ id: user.id, email: user.email });
});`);
  }

  return `${imports.join("\n")}

const app = express();
app.use(cors({ origin: env.CORS_ORIGIN }));
app.use(helmet());
app.use(express.json());

app.get('/api/health', async (_req, res) => {
  ${healthCheck}res.status(${healthStatus}).json({ ${healthFields.join(", ")} });
});
${routes.join("\n")}

// Express 5 forwards rejected async handlers here
app.use((error${t(": unknown")}, _req${t(": Request")}, res${t(": Response")}, _next${t(": NextFunction")}) => {
  console.error(error);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(env.PORT, () => {
  console.log(\`🚀 API Server running on http://localhost:\${env.PORT}\`);
});
`;
}
