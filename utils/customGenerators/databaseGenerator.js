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

  // Earlier installs left a lockfile that doesn't know this new workspace yet, so npm
  // would skip it ("no workspace folder present"). A root install registers it first.
  if (context.installDeps && isMonorepo) {
    await run(`${context.packageManager} install`, { cwd: context.projectPath });
  }

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
  } else if (orm === "mongoose") {
    // MongoDB is schemaless: the model and its unique index are created at runtime,
    // so there is no generate/push/migrate step
    fs.writeFileSync(path.join(targetDir, "src", `index.${context.ext}`), getMongooseClient(context.isTs));

    if (context.installDeps) {
      const installCmd = getInstallCommand(context.packageManager);
      await run(`${context.packageManager} ${installCmd} mongoose`, { cwd: targetDir });
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
  return {};
}

function getUniqueViolationHelper(isTs) {
  return `
// Prisma reports unique-constraint violations as P2002
export function isUniqueViolation(error${isTs ? ": unknown" : ""}) {
  return (error${isTs ? " as { code?: string } | null" : ""})?.code === 'P2002';
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

function getMongooseClient(isTs) {
  const t = (type) => (isTs ? type : "");

  return `import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema(
  {
    email: { type: String, required: true, unique: true },
    name: { type: String, default: null },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    // Serialize as { id, email, name, createdAt }, the same shape the Prisma setup returns
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (_doc, ret${t(": Record<string, unknown>")}) => {
        delete ret._id;
        return ret;
      },
    },
  }
);

export const User = mongoose.model('User', userSchema);

let connection${t(": Promise<typeof mongoose> | undefined")};

// Connects on first use, so the API has loaded .env before DATABASE_URL is read.
// A failed attempt is forgotten so the next request retries.
export function connect() {
  connection ??= mongoose
    .connect(process.env.DATABASE_URL${t("!")}, { serverSelectionTimeoutMS: 5000 })
    .catch((error) => {
      connection = undefined;
      throw error;
    });
  return connection;
}

export async function checkConnection() {
  await connect();
  await mongoose.connection.db${t("!")}.admin().ping();
}

export const users = {
  list: async () => {
    await connect();
    return User.find().sort({ createdAt: -1 });
  },
  create: async (data${t(": { email: string; name?: string | null }")}) => {
    await connect();
    return User.create(data);
  },
};

// MongoDB reports duplicate keys on a unique index as error code 11000
export function isUniqueViolation(error${t(": unknown")}) {
  return (error${t(" as { code?: number } | null")})?.code === 11000;
}
`;
}
