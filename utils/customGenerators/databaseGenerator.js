import fs from "fs-extra";
import path from "path";
import { run } from "../progress.js";
import { getInstallCommand } from "../shared.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateDatabase(context) {
  const isMonorepo = context.hasFrontend && context.hasBackend;
  const targetDir = isMonorepo
    ? path.join(context.projectPath, "packages", "database")
    : context.projectPath;
  const { type: dbType, provider } = context.config.database;
  const orm = context.config.orm;

  fs.ensureDirSync(targetDir);

  // Every CLI command reads the single root .env, the same file the API loads at runtime
  const envFile = isMonorepo ? "../../.env" : ".env";

  const pkgJson = {
    name: "@repo/database",
    version: "1.0.0",
    private: true,
    type: "module",
    main: `./src/index.${context.ext}`,
    types: `./src/index.${context.ext}`,
    scripts: getDatabaseScripts(orm, envFile)
  };
  fs.writeJsonSync(path.join(targetDir, "package.json"), pkgJson, { spaces: 2 });

  // Add .gitignore for database package from template
  const templatesDir = context.templatesDir || path.join(__dirname, "../../templates/gitignore");
  const databaseGitignorePath = path.join(templatesDir, "database.gitignore");
  if (fs.existsSync(databaseGitignorePath)) {
    fs.copyFileSync(databaseGitignorePath, path.join(targetDir, ".gitignore"));
  }

  fs.ensureDirSync(path.join(targetDir, "src"));

  if (orm === "prisma") {
    fs.ensureDirSync(path.join(targetDir, "prisma"));
    fs.writeFileSync(path.join(targetDir, "prisma", "schema.prisma"), getPrismaSchema(dbType, provider));
    fs.writeFileSync(path.join(targetDir, "src", `index.${context.ext}`), getPrismaClient(dbType, context.isTs));

    if (context.installDeps) {
      const installCmd = getInstallCommand(context.packageManager);
      await run(`${context.packageManager} ${installCmd} @prisma/client@6`, { cwd: targetDir });
      await run(`${context.packageManager} ${installCmd} -D prisma@6 dotenv-cli`, { cwd: targetDir });
      // Generate standard client SDK
      await run(`npx prisma generate`, { cwd: targetDir });
    }

    // Regenerate the client on every install. Added only now: during the installs
    // above the prisma CLI is not available yet, so the hook would fail.
    pkgJson.scripts = { postinstall: "prisma generate", ...pkgJson.scripts };
    fs.writeJsonSync(path.join(targetDir, "package.json"), { ...fs.readJsonSync(path.join(targetDir, "package.json")), scripts: pkgJson.scripts }, { spaces: 2 });
  } else if (orm === "drizzle") {
    fs.writeFileSync(path.join(targetDir, `drizzle.config.${context.ext}`), getDrizzleConfig(dbType, provider));
    fs.writeFileSync(path.join(targetDir, "src", `schema.${context.ext}`), getDrizzleSchema(dbType));
    fs.writeFileSync(path.join(targetDir, "src", `index.${context.ext}`), getDrizzleClient(dbType, provider));

    if (context.installDeps) {
      const driver = dbType === "postgres" ? "postgres" : "better-sqlite3";
      const installCmd = getInstallCommand(context.packageManager);
      await run(`${context.packageManager} ${installCmd} drizzle-orm ${driver}`, { cwd: targetDir });
      await run(`${context.packageManager} ${installCmd} -D drizzle-kit dotenv-cli`, { cwd: targetDir });
    }
  }
}

function getDatabaseScripts(orm, envFile) {
  const withEnv = (cmd) => `dotenv -e ${envFile} -- ${cmd}`;

  if (orm === "prisma") {
    return {
      "db:generate": "prisma generate",
      "db:push": withEnv("prisma db push"),
      "db:migrate": withEnv("prisma migrate dev"),
      "db:studio": withEnv("prisma studio")
    };
  }
  if (orm === "drizzle") {
    return {
      "db:generate": withEnv("drizzle-kit generate"),
      "db:push": withEnv("drizzle-kit push"),
      "db:migrate": withEnv("drizzle-kit migrate"),
      "db:studio": withEnv("drizzle-kit studio")
    };
  }
  return {};
}

function getUniqueViolationHelper(isTs) {
  return `
// Unique-constraint violations across Prisma (P2002), Postgres (23505) and SQLite drivers
const UNIQUE_VIOLATION_CODES = ['P2002', '23505', 'SQLITE_CONSTRAINT_UNIQUE'];

export function isUniqueViolation(error${isTs ? ": unknown" : ""}) {
  const { code, cause } = (error ?? {})${isTs ? " as { code?: string; cause?: { code?: string } }" : ""};
  return UNIQUE_VIOLATION_CODES.includes(code ?? cause?.code ?? '');
}
`;
}

function getPrismaSchema(dbType, provider) {
  const prismaProvider = dbType === "postgres" ? "postgresql" : dbType;
  // Supabase: the app talks to the transaction pooler (DATABASE_URL), while
  // migrations need a direct/session connection (DIRECT_URL).
  const directUrl = provider === "supabase" ? `\n  directUrl = env("DIRECT_URL")` : "";
  const idField = dbType === "mongodb"
    ? `id        String   @id @default(auto()) @map("_id") @db.ObjectId`
    : `id        String   @id @default(uuid())`;

  return `datasource db {
  provider  = "${prismaProvider}"
  url       = env("DATABASE_URL")${directUrl}
}

generator client {
  provider = "prisma-client-js"
}

model User {
  ${idField}
  email     String   @unique
  name      String?
  createdAt DateTime @default(now()) @map("created_at")

  @@map("users")
}
`;
}

function getPrismaClient(dbType, isTs) {
  const ping = dbType === "mongodb"
    ? "await db.$runCommandRaw({ ping: 1 });"
    : "await db.$queryRaw`SELECT 1`;";

  if (!isTs) {
    return `import { PrismaClient } from '@prisma/client';

// Reuse one client across hot reloads so dev servers don't exhaust connections.
const globalForPrisma = globalThis;

export const db = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

export async function checkConnection() {
  ${ping}
}

export const users = {
  list: () => db.user.findMany({ orderBy: { createdAt: 'desc' } }),
  create: (data) => db.user.create({ data }),
};
${getUniqueViolationHelper(false)}`;
  }

  return `import { PrismaClient } from '@prisma/client';

// Reuse one client across hot reloads so dev servers don't exhaust connections.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = db;

export async function checkConnection() {
  ${ping}
}

export const users = {
  list: () => db.user.findMany({ orderBy: { createdAt: 'desc' } }),
  create: (data: { email: string; name?: string | null }) => db.user.create({ data }),
};
${getUniqueViolationHelper(true)}
export type { User } from '@prisma/client';
`;
}

function getDrizzleConfig(dbType, provider) {
  const dialect = dbType === "postgres" ? "postgresql" : dbType;
  // Supabase migrations must bypass the transaction pooler
  const url = provider === "supabase"
    ? "process.env.DIRECT_URL ?? process.env.DATABASE_URL!"
    : "process.env.DATABASE_URL!";

  return `import { defineConfig } from 'drizzle-kit';

export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: '${dialect}',
  dbCredentials: {
    url: ${url},
  },
});
`;
}

function getDrizzleSchema(dbType) {
  if (dbType === "postgres") {
    return `import { pgTable, text, timestamp, uuid } from 'drizzle-orm/pg-core';

export const users = pgTable('users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
`;
  }
  return `import { integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const users = sqliteTable('users', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  email: text('email').notNull().unique(),
  name: text('name'),
  createdAt: integer('created_at', { mode: 'timestamp' }).notNull().$defaultFn(() => new Date()),
});

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
`;
}

function getDrizzleClient(dbType, provider) {
  const repository = `
export const users = {
  list: () => db.select().from(schema.users).orderBy(desc(schema.users.createdAt)),
  create: async (data: schema.NewUser) => {
    const [user] = await db.insert(schema.users).values(data).returning();
    return user;
  },
};
${getUniqueViolationHelper(true)}
export * from './schema.js';
`;

  if (dbType === "postgres") {
    const clientOptions = provider === "supabase"
      ? `\n// Supabase's transaction pooler (port 6543) does not support prepared statements.\nconst client = postgres(process.env.DATABASE_URL!, { prepare: false });`
      : `\nconst client = postgres(process.env.DATABASE_URL!);`;

    return `import { drizzle } from 'drizzle-orm/postgres-js';
import { desc, sql } from 'drizzle-orm';
import postgres from 'postgres';
import * as schema from './schema.js';
${clientOptions}
export const db = drizzle(client, { schema });

export async function checkConnection() {
  await db.execute(sql\`select 1\`);
}
${repository}`;
  }
  return `import { drizzle } from 'drizzle-orm/better-sqlite3';
import { desc, sql } from 'drizzle-orm';
import Database from 'better-sqlite3';
import * as schema from './schema.js';

const sqlite = new Database(process.env.DATABASE_URL?.replace(/^file:/, '') || 'sqlite.db');
export const db = drizzle(sqlite, { schema });

export async function checkConnection() {
  db.get(sql\`select 1\`);
}
${repository}`;
}
