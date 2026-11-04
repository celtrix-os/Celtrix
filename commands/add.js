import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import boxen from "boxen";
import inquirer from "inquirer";
import { logger } from "../utils/logger.js";
import { run, runPhase } from "../utils/progress.js";
import { isPromptCancellation } from "../utils/shared.js";
import {
  detectProject,
  safeWriteFile,
  safeAppendEnv,
  updatePackageScripts,
  updateCeltrixLock,
  installProjectPackages,
} from "../utils/projectDetector.js";

export const AVAILABLE_INTEGRATIONS = [
  { name: "husky", label: "Husky", desc: "Git hooks and lint-staged automation" },
  { name: "biome", label: "Biome", desc: "Fast formatting and linting" },
  { name: "auth", label: "Auth", desc: "Authentication with Clerk or Better Auth" },
  { name: "prisma", label: "Prisma", desc: "Next-generation ORM with database setup" },
  { name: "vercel-ai", label: "Vercel AI SDK", desc: "AI streaming and chat boilerplate" },
];

export function showAddHelp() {
  console.log(`${chalk.cyanBright.bold("Celtrix Add")} ${chalk.gray("– Add integrations to an existing project")}\n`);
  console.log(chalk.bold("Usage:"));
  console.log(`  ${chalk.cyan("npx celtrix add")} ${chalk.gray("[integration]")}\n`);

  console.log(chalk.bold("Available Integrations:"));
  console.log(`  ${chalk.cyan("husky")}        ${chalk.gray("Add Husky + lint-staged git hooks config")}`);
  console.log(`  ${chalk.cyan("biome")}        ${chalk.gray("Add Biome linting & formatting config")}`);
  console.log(`  ${chalk.cyan("auth")}         ${chalk.gray("Add authentication (interactive: Clerk or Better Auth)")}`);
  console.log(`  ${chalk.cyan("prisma")}       ${chalk.gray("Add Prisma ORM with interactive database selection")}`);
  console.log(`  ${chalk.cyan("vercel-ai")}    ${chalk.gray("Add Vercel AI SDK boilerplate & chat endpoint")}\n`);

  console.log(chalk.bold("Examples:"));
  console.log(`  ${chalk.cyan("npx celtrix add")}              ${chalk.gray("# Interactive selection")}`);
  console.log(`  ${chalk.cyan("npx celtrix add husky")}`);
  console.log(`  ${chalk.cyan("npx celtrix add biome")}`);
  console.log(`  ${chalk.cyan("npx celtrix add auth")}         ${chalk.gray("# choose Clerk or Better Auth")}`);
  console.log(`  ${chalk.cyan("npx celtrix add clerk")}        ${chalk.gray("# direct Clerk setup")}`);
  console.log(`  ${chalk.cyan("npx celtrix add better-auth")}  ${chalk.gray("# direct Better Auth setup")}`);
  console.log(`  ${chalk.cyan("npx celtrix add prisma")}`);
  console.log(`  ${chalk.cyan("npx celtrix add vercel-ai")}\n`);
}

/**
 * Main command handler for `celtrix add`.
 *
 * @param {object} cli - Parsed CLI options
 */
export async function addCommand(cli = {}) {
  const project = detectProject(process.cwd());

  if (!project.isProject) {
    console.error(chalk.red(`\n✖ ${project.error}\n`));
    process.exit(1);
  }

  let integration = cli.integration;

  // If no integration specified, ask interactively
  if (!integration) {
    try {
      const answers = await inquirer.prompt([
        {
          type: "list",
          name: "integration",
          message: "Select an integration to add:",
          choices: [
            { name: `${chalk.bold("Husky")}       ${chalk.gray("Git hooks & lint-staged config")}`, value: "husky" },
            { name: `${chalk.bold("Biome")}       ${chalk.gray("Biome fast linting and formatting")}`, value: "biome" },
            { name: `${chalk.bold("Auth")}        ${chalk.gray("Authentication (Clerk or Better Auth)")}`, value: "auth" },
            { name: `${chalk.bold("Prisma")}      ${chalk.gray("Prisma ORM with interactive DB selection")}`, value: "prisma" },
            { name: `${chalk.bold("Vercel AI")}   ${chalk.gray("Vercel AI SDK boilerplate & streaming")}`, value: "vercel-ai" },
          ],
        },
      ]);
      integration = answers.integration;
    } catch (err) {
      if (isPromptCancellation(err)) {
        console.log(chalk.yellow("\n👋 Cancelled — see you next time!\n"));
        process.exit(0);
      }
      throw err;
    }
  }

  const normalized = normalizeIntegrationName(integration);
  if (!normalized) {
    console.error(chalk.red(`\n✖ Unknown integration "${integration}".`));
    console.log(chalk.gray("Available integrations: husky, biome, auth (clerk, better-auth), prisma, vercel-ai\n"));
    process.exit(1);
  }

  console.log(`\n${chalk.cyan("📦 Target Project:")} ${chalk.bold.white(project.name)} ${chalk.gray(`(${project.structure}, ${project.packageManager})`)}`);

  try {
    switch (normalized.type) {
      case "husky":
        await handleHusky(project, cli);
        break;
      case "biome":
        await handleBiome(project, cli);
        break;
      case "auth":
        await handleAuth(project, cli, normalized.provider);
        break;
      case "prisma":
        await handlePrisma(project, cli, normalized.db);
        break;
      case "vercel-ai":
        await handleVercelAi(project, cli);
        break;
    }
  } catch (err) {
    if (isPromptCancellation(err)) {
      console.log(chalk.yellow("\n👋 Cancelled — see you next time!\n"));
      process.exit(0);
    }
    console.error(chalk.red(`\n✖ Failed to add integration: ${err.message}`));
    if (cli.verbose && err.stack) console.error(chalk.gray(err.stack));
    process.exit(1);
  }
}

function normalizeIntegrationName(name) {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  if (lower === "husky" || lower === "lint-staged") return { type: "husky" };
  if (lower === "biome") return { type: "biome" };
  if (lower === "auth") return { type: "auth" };
  if (lower === "clerk") return { type: "auth", provider: "clerk" };
  if (lower === "better-auth" || lower === "betterauth") return { type: "auth", provider: "better-auth" };
  if (lower === "prisma") return { type: "prisma" };
  if (lower === "vercel-ai" || lower === "vercel_ai" || lower === "ai") return { type: "vercel-ai" };
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION: HUSKY
// ─────────────────────────────────────────────────────────────────────────────
async function handleHusky(project, cli) {
  console.log(chalk.cyan("\n🔧 Adding Husky & lint-staged..."));

  // 1. Initialize git if not present
  if (!fs.existsSync(path.join(project.root, ".git"))) {
    try {
      await run("git init", { cwd: project.root });
      console.log(chalk.green("✔ Initialized git repository"));
    } catch {
      logger.warn("⚠️ Could not run 'git init'. Make sure git is installed and initialize it manually.");
    }
  }

  // 2. Install dependencies
  if (cli.install !== false) {
    await runPhase("Installing Husky and lint-staged", () =>
      installProjectPackages(project, {
        cwd: project.root,
        devDependencies: ["husky@^9.1.7", "lint-staged@^15.4.3"],
      })
    );
  }

  // 3. Setup .husky/pre-commit
  const huskyDir = path.join(project.root, ".husky");
  fs.ensureDirSync(huskyDir);
  const preCommitPath = path.join(huskyDir, "pre-commit");
  safeWriteFile(preCommitPath, "npx lint-staged\n");
  try {
    fs.chmodSync(preCommitPath, "755");
  } catch {}

  // 4. Setup lint-staged config
  const hasBiome = project.installedIntegrations.includes("biome") || fs.existsSync(path.join(project.root, "biome.json"));
  const lintStagedConfig = hasBiome
    ? {
        "*.{js,jsx,ts,tsx,json,css}": ["biome check --write"],
      }
    : {
        "*.{js,jsx,ts,tsx}": ["eslint --fix"],
        "*.{json,md,css,scss}": ["prettier --write"],
      };

  safeWriteFile(
    path.join(project.root, ".lintstagedrc.json"),
    JSON.stringify(lintStagedConfig, null, 2) + "\n"
  );

  // 5. Update package.json scripts
  const { added } = updatePackageScripts(path.join(project.root, "package.json"), {
    prepare: "husky",
  });
  if (added.length > 0) {
    console.log(chalk.green(`✔ Updated package.json scripts: ${added.join(", ")}`));
  }

  // 6. Update celtrix.json
  updateCeltrixLock(project.root, {
    integrations: ["husky"],
  });

  printSuccessBox("Husky & lint-staged added successfully!", [
    "Pre-commit hook created at .husky/pre-commit",
    "Configured lint-staged in .lintstagedrc.json",
    "Updated 'prepare' script in package.json",
    `Test it by making a git commit: ${chalk.cyan("git commit -m 'test'")}`,
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION: BIOME
// ─────────────────────────────────────────────────────────────────────────────
async function handleBiome(project, cli) {
  console.log(chalk.cyan("\n🔧 Adding Biome..."));

  // 1. Install dependencies
  if (cli.install !== false) {
    await runPhase("Installing @biomejs/biome", () =>
      installProjectPackages(project, {
        cwd: project.root,
        devDependencies: ["@biomejs/biome@^1.9.4"],
      })
    );
  }

  // 2. Write biome.json
  const biomeConfig = {
    $schema: "https://biomejs.dev/schemas/1.9.4/schema.json",
    vcs: {
      enabled: false,
      clientKind: "git",
      useIgnoreFile: true,
    },
    files: {
      ignoreUnknown: false,
      ignore: ["node_modules", "dist", "build", ".next", ".turbo", "coverage"],
    },
    formatter: {
      enabled: true,
      indentStyle: "space",
      indentWidth: 2,
      lineWidth: 100,
    },
    linter: {
      enabled: true,
      rules: {
        recommended: true,
      },
    },
    javascript: {
      formatter: {
        quoteStyle: "double",
        semicolons: "always",
      },
    },
  };

  safeWriteFile(
    path.join(project.root, "biome.json"),
    JSON.stringify(biomeConfig, null, 2) + "\n"
  );

  // 3. Update scripts in package.json
  const rootPkg = fs.readJsonSync(path.join(project.root, "package.json"));
  const scriptsToAdd = {
    format: "biome format --write .",
  };
  if (!rootPkg.scripts?.lint) {
    scriptsToAdd.lint = "biome check .";
    scriptsToAdd["lint:fix"] = "biome check --write .";
  } else {
    scriptsToAdd["biome:check"] = "biome check .";
    scriptsToAdd["biome:fix"] = "biome check --write .";
  }

  const { added } = updatePackageScripts(path.join(project.root, "package.json"), scriptsToAdd);
  if (added.length > 0) {
    console.log(chalk.green(`✔ Updated package.json scripts: ${added.join(", ")}`));
  }

  // 4. Update celtrix.json
  updateCeltrixLock(project.root, {
    integrations: ["biome"],
  });

  printSuccessBox("Biome added successfully!", [
    "Created configuration at biome.json",
    `Run linting: ${chalk.cyan(project.packageManager === "npm" ? "npm run lint" : `${project.packageManager} lint`)}`,
    `Run formatting: ${chalk.cyan(project.packageManager === "npm" ? "npm run format" : `${project.packageManager} format`)}`,
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION: AUTH (Clerk or Better Auth)
// ─────────────────────────────────────────────────────────────────────────────
async function handleAuth(project, cli, explicitProvider) {
  let provider = explicitProvider;
  if (!provider) {
    if (cli.subArguments && cli.subArguments.length > 0) {
      const arg = cli.subArguments[0].toLowerCase();
      if (arg.includes("clerk")) provider = "clerk";
      else if (arg.includes("better")) provider = "better-auth";
    }
  }

  if (!provider) {
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "provider",
        message: "Select an authentication provider:",
        choices: [
          { name: `${chalk.bold("Clerk")}        ${chalk.gray("Hosted authentication & user management")}`, value: "clerk" },
          { name: `${chalk.bold("Better Auth")}   ${chalk.gray("Framework-agnostic, TypeScript-first auth")}`, value: "better-auth" },
        ],
      },
    ]);
    provider = answer.provider;
  }

  if (provider === "clerk") {
    await setupClerk(project, cli);
  } else {
    await setupBetterAuth(project, cli);
  }
}

async function setupClerk(project, cli) {
  console.log(chalk.cyan("\n🔧 Adding Clerk Authentication..."));

  const isNext = project.frontend === "nextjs";
  const targetDir = project.paths.frontend;

  // 1. Install dependencies
  if (cli.install !== false) {
    const clerkPkg = isNext ? "@clerk/nextjs@^6.0.0" : "@clerk/clerk-react@^5.0.0";
    await runPhase(`Installing ${clerkPkg}`, () =>
      installProjectPackages(project, {
        cwd: targetDir,
        dependencies: [clerkPkg],
      })
    );
  }

  // 2. Write middleware or provider
  if (isNext) {
    const hasSrc = fs.existsSync(path.join(targetDir, "src"));
    const middlewareDir = hasSrc ? path.join(targetDir, "src") : targetDir;
    const middlewareFile = path.join(middlewareDir, `middleware.${project.ext}`);

    const middlewareContent = project.isTs
      ? `import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    '/((?!_next|[^?]*\\\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    // Always run for API routes
    '/(api|trpc)(.*)',
  ],
};
`
      : `import { clerkMiddleware } from "@clerk/nextjs/server";

export default clerkMiddleware();

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
`;

    safeWriteFile(middlewareFile, middlewareContent);

    safeAppendEnv(
      path.join(project.root, ".env.example"),
      `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxx
CLERK_SECRET_KEY=sk_test_xxxxxxxx
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up`,
      "Clerk Authentication"
    );
  } else {
    // React / Vite
    const providerFile = path.join(targetDir, "src", "components", `AuthProvider.${project.jsxExt}`);
    const providerContent = project.isTs
      ? `import React from "react";
import { ClerkProvider } from "@clerk/clerk-react";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function AuthProvider({ children }: { children: React.ReactNode }) {
  if (!PUBLISHABLE_KEY) {
    throw new Error("Missing Publishable Key: Add VITE_CLERK_PUBLISHABLE_KEY to your .env file");
  }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      {children}
    </ClerkProvider>
  );
}
`
      : `import React from "react";
import { ClerkProvider } from "@clerk/clerk-react";

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export function AuthProvider({ children }) {
  if (!PUBLISHABLE_KEY) {
    throw new Error("Missing Publishable Key: Add VITE_CLERK_PUBLISHABLE_KEY to your .env file");
  }

  return (
    <ClerkProvider publishableKey={PUBLISHABLE_KEY} afterSignOutUrl="/">
      {children}
    </ClerkProvider>
  );
}
`;
    safeWriteFile(providerFile, providerContent);

    safeAppendEnv(
      path.join(project.root, ".env.example"),
      `VITE_CLERK_PUBLISHABLE_KEY=pk_test_xxxxxxxx`,
      "Clerk Authentication"
    );
  }

  // 3. Update celtrix.json
  updateCeltrixLock(project.root, {
    integrations: ["clerk", "auth"],
  });

  printSuccessBox("Clerk Authentication added successfully!", [
    isNext ? "Added Next.js Clerk middleware" : "Created AuthProvider component",
    "Added Clerk environment variables to .env.example",
    "Sign in to https://dashboard.clerk.com to get your API keys",
    "Add your keys to .env and wrap your app or routes with Clerk",
  ]);
}

async function setupBetterAuth(project, cli) {
  console.log(chalk.cyan("\n🔧 Adding Better Auth..."));

  const targetDir = project.paths.backend !== project.root ? project.paths.backend : project.root;
  const isNext = project.frontend === "nextjs";

  // 1. Install dependencies
  if (cli.install !== false) {
    await runPhase("Installing better-auth", () =>
      installProjectPackages(project, {
        cwd: targetDir,
        dependencies: ["better-auth@^1.1.0"],
      })
    );
  }

  // 2. Write auth configuration file
  const authConfigPath = path.join(targetDir, "src", "lib", `auth.${project.ext}`);
  const authConfigContent = `import { betterAuth } from "better-auth";

export const auth = betterAuth({
  emailAndPassword: {
    enabled: true,
  },
});
`;
  safeWriteFile(authConfigPath, authConfigContent);

  // 3. Framework-specific route boilerplate
  if (isNext) {
    const routePath = path.join(targetDir, "src", "app", "api", "auth", "[...all]", `route.${project.ext}`);
    const routeContent = `import { auth } from "@/lib/auth";
import { toNextJsHandler } from "better-auth/next-js";

export const { GET, POST } = toNextJsHandler(auth);
`;
    safeWriteFile(routePath, routeContent);

    const clientHelperPath = path.join(targetDir, "src", "lib", `auth-client.${project.ext}`);
    const clientHelperContent = `import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient();
`;
    safeWriteFile(clientHelperPath, clientHelperContent);
  } else if (project.backend === "express") {
    const routePath = path.join(targetDir, "src", "routes", `auth.${project.ext}`);
    const routeContent = `import { Router } from "express";
import { auth } from "../lib/auth.js";
import { toNodeHandler } from "better-auth/node";

const router = Router();

router.all("/api/auth/*", toNodeHandler(auth));

export default router;
`;
    safeWriteFile(routePath, routeContent);
  }

  // 4. Update .env.example
  safeAppendEnv(
    path.join(project.root, ".env.example"),
    `BETTER_AUTH_SECRET=your_better_auth_secret_here_32_chars
BETTER_AUTH_URL=http://localhost:3000`,
    "Better Auth"
  );

  // 5. Update celtrix.json
  updateCeltrixLock(project.root, {
    integrations: ["better-auth", "auth"],
  });

  printSuccessBox("Better Auth added successfully!", [
    "Created auth configuration in src/lib/auth",
    isNext ? "Created route handler at src/app/api/auth/[...all]/route" : "Configured auth endpoint handler",
    "Added BETTER_AUTH_SECRET & BETTER_AUTH_URL to .env.example",
    "Generate a 32-char secret (e.g. openssl rand -base64 32) and put it in .env",
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION: PRISMA
// ─────────────────────────────────────────────────────────────────────────────
async function handlePrisma(project, cli, explicitDb) {
  let dbType = explicitDb;
  if (!dbType && cli.subArguments && cli.subArguments.length > 0) {
    dbType = cli.subArguments[0].toLowerCase();
  }

  const DB_CHOICES = [
    { name: "PostgreSQL", value: "postgresql", env: "postgresql://user:password@localhost:5432/mydb?schema=public" },
    { name: "MySQL", value: "mysql", env: "mysql://user:password@localhost:3306/mydb" },
    { name: "SQLite", value: "sqlite", env: "file:./dev.db" },
    { name: "MongoDB", value: "mongodb", env: "mongodb+srv://user:password@cluster.mongodb.net/mydb?retryWrites=true&w=majority" },
    { name: "CockroachDB", value: "cockroachdb", env: "postgresql://user:password@localhost:26257/mydb?sslmode=verify-full" },
    { name: "SQL Server", value: "sqlserver", env: "sqlserver://localhost:1433;database=mydb;user=sa;password=secret;trustServerCertificate=true" },
  ];

  if (!dbType) {
    const answer = await inquirer.prompt([
      {
        type: "list",
        name: "dbType",
        message: "Select a database provider for Prisma:",
        choices: DB_CHOICES.map((d) => ({ name: d.name, value: d.value })),
      },
    ]);
    dbType = answer.dbType;
  }

  // Normalize aliases like 'postgres' -> 'postgresql'
  if (dbType === "postgres") dbType = "postgresql";

  const dbConfig = DB_CHOICES.find((d) => d.value === dbType) || DB_CHOICES[0];
  const targetDir = project.paths.database !== project.root ? project.paths.database : project.root;

  console.log(chalk.cyan(`\n🔧 Adding Prisma with ${dbConfig.name}...`));

  // 1. Install dependencies
  if (cli.install !== false) {
    await runPhase("Installing Prisma dependencies", () =>
      installProjectPackages(project, {
        cwd: targetDir,
        dependencies: ["@prisma/client@^6.0.0"],
        devDependencies: ["prisma@^6.0.0"],
      })
    );
  }

  // 2. Write prisma/schema.prisma
  const idField =
    dbType === "mongodb"
      ? 'String   @id @default(auto()) @map("_id") @db.ObjectId'
      : dbType === "sqlite"
      ? "Int      @id @default(autoincrement())"
      : 'String   @id @default(cuid())';

  const schemaContent = `// This is your Prisma schema file,
// learn more about it in the docs: https://pris.ly/d/prisma-schema

generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "${dbType}"
  url      = env("DATABASE_URL")
}

model User {
  id        ${idField}
  email     String   @unique
  name      String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}
`;

  safeWriteFile(path.join(targetDir, "prisma", "schema.prisma"), schemaContent);

  // 3. Write client singleton
  const clientDir = path.join(targetDir, "src", "lib");
  const clientPath = path.join(clientDir, `db.${project.ext}`);
  const clientContent = project.isTs
    ? `import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export default db;
`
    : `import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const db = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

export default db;
`;

  safeWriteFile(clientPath, clientContent);

  // 4. Update scripts
  const scriptsToAdd = {
    "db:generate": "prisma generate",
    "db:push": "prisma db push",
    "db:migrate": "prisma migrate dev",
    "db:studio": "prisma studio",
    postinstall: "prisma generate",
  };
  updatePackageScripts(path.join(targetDir, "package.json"), scriptsToAdd);

  // 5. Update .env.example
  safeAppendEnv(
    path.join(project.root, ".env.example"),
    `DATABASE_URL="${dbConfig.env}"`,
    "Prisma Database URL"
  );

  // 6. Update celtrix.json
  updateCeltrixLock(project.root, {
    database: { type: dbType },
    orm: "prisma",
    integrations: ["prisma"],
  });

  printSuccessBox(`Prisma configured with ${dbConfig.name}!`, [
    "Generated schema at prisma/schema.prisma",
    "Created database client singleton in src/lib/db",
    "Added db:generate, db:push, db:migrate, db:studio scripts",
    "Added DATABASE_URL to .env.example",
    `Run ${chalk.cyan("npx prisma generate")} to generate your client`,
    `Run ${chalk.cyan("npm run db:push")} to push your schema to the database`,
  ]);
}

// ─────────────────────────────────────────────────────────────────────────────
// INTEGRATION: VERCEL AI SDK
// ─────────────────────────────────────────────────────────────────────────────
async function handleVercelAi(project, cli) {
  console.log(chalk.cyan("\n🔧 Adding Vercel AI SDK..."));

  const isNext = project.frontend === "nextjs";
  const targetDir = isNext ? project.paths.frontend : (project.paths.backend !== project.root ? project.paths.backend : project.root);

  // 1. Install dependencies
  if (cli.install !== false) {
    await runPhase("Installing ai and @ai-sdk/openai", () =>
      installProjectPackages(project, {
        cwd: targetDir,
        dependencies: ["ai@^4.0.0", "@ai-sdk/openai@^1.0.0"],
      })
    );
  }

  // 2. Write boilerplate files
  if (isNext) {
    // API route handler
    const routePath = path.join(targetDir, "src", "app", "api", "chat", `route.${project.ext}`);
    const routeContent = project.isTs
      ? `import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

// Allow streaming responses up to 30 seconds
export const maxDuration = 30;

export async function POST(req: Request) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages,
  });

  return result.toDataStreamResponse();
}
`
      : `import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

export const maxDuration = 30;

export async function POST(req) {
  const { messages } = await req.json();

  const result = streamText({
    model: openai("gpt-4o-mini"),
    messages,
  });

  return result.toDataStreamResponse();
}
`;
    safeWriteFile(routePath, routeContent);

    // Chat component
    const chatComponentPath = path.join(targetDir, "src", "components", `Chat.${project.jsxExt}`);
    const chatComponentContent = `"use client";

import { useChat } from "ai/react";

export default function Chat() {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat();

  return (
    <div style={{ maxWidth: "600px", margin: "2rem auto", padding: "1rem" }}>
      <h2>AI Chat</h2>
      <div style={{ minHeight: "200px", border: "1px solid #ccc", padding: "1rem", borderRadius: "8px", marginBottom: "1rem" }}>
        {messages.length === 0 && <p style={{ color: "#888" }}>No messages yet. Send a message to start!</p>}
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: "0.5rem" }}>
            <strong>{m.role === "user" ? "User: " : "AI: "}</strong>
            <span>{m.content}</span>
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} style={{ display: "flex", gap: "0.5rem" }}>
        <input
          style={{ flex: 1, padding: "0.5rem", borderRadius: "4px", border: "1px solid #ccc" }}
          value={input}
          placeholder="Say something..."
          onChange={handleInputChange}
          disabled={isLoading}
        />
        <button
          type="submit"
          disabled={isLoading}
          style={{ padding: "0.5rem 1rem", borderRadius: "4px", backgroundColor: "#0070f3", color: "#fff", border: "none", cursor: "pointer" }}
        >
          Send
        </button>
      </form>
    </div>
  );
}
`;
    safeWriteFile(chatComponentPath, chatComponentContent);
  } else {
    // Express backend route
    const routePath = path.join(targetDir, "src", "routes", `chat.${project.ext}`);
    const routeContent = `import { Router } from "express";
import { openai } from "@ai-sdk/openai";
import { streamText } from "ai";

const router = Router();

router.post("/chat", async (req, res) => {
  try {
    const { messages } = req.body;
    const result = streamText({
      model: openai("gpt-4o-mini"),
      messages,
    });

    result.pipeTextStreamToResponse(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
`;
    safeWriteFile(routePath, routeContent);
  }

  // 3. Update .env.example
  safeAppendEnv(
    path.join(project.root, ".env.example"),
    `OPENAI_API_KEY=your_openai_api_key_here`,
    "Vercel AI SDK"
  );

  // 4. Update celtrix.json
  updateCeltrixLock(project.root, {
    integrations: ["vercel-ai"],
  });

  printSuccessBox("Vercel AI SDK added successfully!", [
    isNext ? "Created route handler at src/app/api/chat/route" : "Created route handler at src/routes/chat",
    isNext ? "Created Chat UI component at src/components/Chat" : "Configured AI stream endpoint",
    "Added OPENAI_API_KEY to .env.example",
    "Set your OPENAI_API_KEY in .env and start streaming responses!",
  ]);
}

function printSuccessBox(title, steps = []) {
  const content = [
    chalk.bold.green(`✔ ${title}`),
    "",
    ...steps.map((s, i) => `${chalk.cyan(`${i + 1}.`)} ${s}`),
  ].join("\n");

  console.log(
    boxen(content, {
      padding: 1,
      margin: 1,
      borderColor: "green",
      borderStyle: "round",
    })
  );
}
