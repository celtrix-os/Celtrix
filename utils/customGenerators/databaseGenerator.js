import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import { getInstallCommand } from "../shared.js";

export async function generateDatabase(context) {
  const isMonorepo = context.hasFrontend && context.hasBackend;
  const targetDir = isMonorepo 
    ? path.join(context.projectPath, "packages", "database")
    : context.projectPath;

  fs.ensureDirSync(targetDir);

  const pkgJson = {
    name: "@repo/database",
    version: "1.0.0",
    private: true,
    main: "./src/index.ts",
    types: "./src/index.ts"
  };
  fs.writeJsonSync(path.join(targetDir, "package.json"), pkgJson, { spaces: 2 });

  fs.ensureDirSync(path.join(targetDir, "src"));

  if (context.config.orm === "prisma") {
    fs.ensureDirSync(path.join(targetDir, "prisma"));
    fs.writeFileSync(path.join(targetDir, "prisma", "schema.prisma"), getPrismaSchema(context.config.database.type));

    // Expose cached database client
    const clientCode = `import { PrismaClient } from '@prisma/client';
export const db = new PrismaClient();
export * from '@prisma/client';
`;
    fs.writeFileSync(path.join(targetDir, "src", `index.${context.ext}`), clientCode);

    if (context.installDeps) {
      const installCmd = getInstallCommand(context.packageManager);
      execSync(`${context.packageManager} ${installCmd} @prisma/client@6`, { cwd: targetDir, stdio: "inherit" });
      execSync(`${context.packageManager} ${installCmd} -D prisma@6`, { cwd: targetDir, stdio: "inherit" });
      // Generate standard client SDK
      execSync(`npx prisma generate`, { cwd: targetDir, stdio: "inherit" });
    }
  } else if (context.config.orm === "drizzle") {
    // Scaffold Drizzle configurations
    const drizzleConfig = `import { defineConfig } from 'drizzle-kit';
export default defineConfig({
  schema: './src/schema.ts',
  out: './drizzle',
  dialect: '${context.config.database.type === "postgres" ? "postgresql" : context.config.database.type}',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
`;
    fs.writeFileSync(path.join(targetDir, `drizzle.config.${context.ext}`), drizzleConfig);
    fs.writeFileSync(path.join(targetDir, "src", `schema.${context.ext}`), getDrizzleSchema(context.config.database.type));
    fs.writeFileSync(path.join(targetDir, "src", `index.${context.ext}`), getDrizzleClient(context.config.database.type));

    if (context.installDeps) {
      const driver = context.config.database.type === "postgres" ? "postgres" : "better-sqlite3";
      const installCmd = getInstallCommand(context.packageManager);
      execSync(`${context.packageManager} ${installCmd} drizzle-orm ${driver}`, { cwd: targetDir, stdio: "inherit" });
      execSync(`${context.packageManager} ${installCmd} -D drizzle-kit`, { cwd: targetDir, stdio: "inherit" });
    }
  }
}

function getPrismaSchema(dbType) {
  const provider = dbType === "postgres" ? "postgresql" : dbType;
  return `datasource db {
  provider = "${provider}"
  url      = env("DATABASE_URL")
}

generator client {
  provider = "prisma-client-js"
}

model User {
  id    String @id @default(uuid())
  email String @unique
  name  String?
}
`;
}

function getDrizzleSchema(dbType) {
  if (dbType === "postgres") {
    return `import { pgTable, text } from 'drizzle-orm/pg-core';
export const users = pgTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull(),
});
`;
  }
  return `import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
export const users = sqliteTable('users', {
  id: text('id').primaryKey(),
  name: text('name'),
  email: text('email').notNull(),
});
`;
}

function getDrizzleClient(dbType) {
  if (dbType === "postgres") {
    return `import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import * as schema from './schema';

const client = postgres(process.env.DATABASE_URL!);
export const db = drizzle(client, { schema });
export * from 'drizzle-orm';
`;
  }
  return `import { drizzle } from 'drizzle-orm/better-sqlite3';
import Database from 'better-sqlite3';
import * as schema from './schema';

const sqlite = new Database('sqlite.db');
export const db = drizzle(sqlite, { schema });
export * from 'drizzle-orm';
`;
}
