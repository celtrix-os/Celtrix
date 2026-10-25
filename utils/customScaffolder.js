import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import { logger } from "./logger.js";
import { run, runPhase } from "./progress.js";
import { fileURLToPath } from "url";

// Generator Imports
import { generateFrontend } from "./customGenerators/frontendGenerator.js";
import { generateBackend } from "./customGenerators/backendGenerator.js";
import { generateDatabase } from "./customGenerators/databaseGenerator.js";
import { generateSupabase } from "./customGenerators/supabaseGenerator.js";
import { generateDocker } from "./customGenerators/dockerGenerator.js";
import { generateWiring } from "./customGenerators/wiringGenerator.js";
import { generateEnv } from "./customGenerators/envGenerator.js";

// Get the directory where this file is located
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function scaffoldCustomProject(projectPath, projectName, config, installDeps) {
  const context = {
    projectPath,
    projectName,
    config,
    installDeps,
    hasFrontend: config.frontend && config.frontend !== "none",
    hasBackend: config.backend && config.backend !== "none",
    language: config.language || "typescript",
    packageManager: config.packageManager || "npm",
    isTs: config.language === "typescript",
    ext: config.language === "typescript" ? "ts" : "js",
    jsxExt: config.language === "typescript" ? "tsx" : "jsx",
    templatesDir: path.join(__dirname, "../templates/gitignore")
  };

  const isMonorepo = context.hasFrontend && context.hasBackend;

  await runPhase("Initializing Celtrix scaffolding pipeline", () => {
    if (context.packageManager === "bun") {
      try {
        logger.info("⚡ Proactively clearing Bun's local package manager cache to prevent integrity errors...");
        execSync("bun pm cache rm", { stdio: "ignore" });
      } catch (e) {
        // ignore
      }
    }
  });

  await runPhase(
    isMonorepo ? "Bootstrapping project workspace & Turborepo" : "Bootstrapping project workspace",
    () => bootstrapWorkspace(context)
  );

  if (context.hasFrontend) {
    await runPhase("Generating frontend application", () => generateFrontend(context));
  }

  if (context.hasBackend) {
    await runPhase("Generating backend server", () => generateBackend(context));
  }

  if (config.database && config.database.type !== "none") {
    await runPhase("Setting up database and ORM connection package", () => generateDatabase(context));
  }

  if (config.database && config.database.provider === "docker") {
    await runPhase("Writing Docker Compose setup for the database", () => generateDocker(context));
  }

  if (config.database && config.database.provider === "supabase") {
    await runPhase("Wiring Supabase clients", () => generateSupabase(context));
  }

  if (isMonorepo) {
    await runPhase("Wiring frontend ↔ API ↔ database", () => generateWiring(context));
  }

  await runPhase("Writing .env.example and README", () => generateEnv(context));

  if (context.installDeps) {
    await runPhase("Installing dependencies", () => finalizeWorkspace(context));
  }
}

function bootstrapWorkspace(context) {
  // If fullstack (frontend + backend selected), we create a Turborepo Monorepo
  if (context.hasFrontend && context.hasBackend) {
    // Detect package manager version dynamically for Turborepo compatibility
    let pmVersion = "1.0.0";
    try {
      pmVersion = execSync(`${context.packageManager} --version`, { stdio: ["ignore", "pipe", "ignore"] }).toString().trim();
    } catch (e) {
      if (context.packageManager === "npm") pmVersion = "10.0.0";
      else if (context.packageManager === "pnpm") pmVersion = "9.0.0";
      else if (context.packageManager === "yarn") pmVersion = "1.22.0";
      else if (context.packageManager === "bun") pmVersion = "1.0.0";
    }

    // 1. Root package.json
    const rootPkg = {
      name: context.projectName,
      version: "1.0.0",
      private: true,
      workspaces: ["apps/*", "packages/*"],
      packageManager: `${context.packageManager}@${pmVersion}`,
      scripts: {
        dev: "turbo dev",
        build: "turbo build",
        lint: "turbo lint"
      }
    };
    fs.writeJsonSync(path.join(context.projectPath, "package.json"), rootPkg, { spaces: 2 });

    // 2. Root .gitignore for monorepo
    const rootGitignorePath = path.join(context.templatesDir, "root.gitignore");
    if (fs.existsSync(rootGitignorePath)) {
      fs.copyFileSync(rootGitignorePath, path.join(context.projectPath, ".gitignore"));
    }

    // 3. turbo.json
    const turboConfig = {
      $schema: "https://turbo.build/schema.json",
      tasks: {
        build: {
          dependsOn: ["^build"],
          outputs: [".next/**", "dist/**"]
        },
        dev: {
          cache: false,
          persistent: true
        },
        lint: {
          dependsOn: ["^lint"]
        }
      }
    };
    fs.writeJsonSync(path.join(context.projectPath, "turbo.json"), turboConfig, { spaces: 2 });

    // 4. packages/tsconfig workspace configs
    const tsconfigDir = path.join(context.projectPath, "packages", "tsconfig");
    fs.ensureDirSync(tsconfigDir);
    fs.writeJsonSync(path.join(tsconfigDir, "package.json"), {
      name: "@repo/tsconfig",
      version: "1.0.0",
      private: true
    }, { spaces: 2 });

    // Add .gitignore for tsconfig package
    const tsconfigGitignorePath = path.join(context.templatesDir, "tsconfig.gitignore");
    if (fs.existsSync(tsconfigGitignorePath)) {
      fs.copyFileSync(tsconfigGitignorePath, path.join(tsconfigDir, ".gitignore"));
    }

    const baseTsconfig = {
      compilerOptions: {
        target: "ES2022",
        module: "NodeNext",
        moduleResolution: "NodeNext",
        esModuleInterop: true,
        strict: true,
        skipLibCheck: true,
        resolveJsonModule: true
      }
    };
    fs.writeJsonSync(path.join(tsconfigDir, "base.json"), baseTsconfig, { spaces: 2 });

    // Create folders structure
    fs.ensureDirSync(path.join(context.projectPath, "apps"));
    fs.ensureDirSync(path.join(context.projectPath, "packages"));
  } else {
    // Single project setup
    const rootPkg = {
      name: context.projectName,
      version: "1.0.0",
      private: true,
      scripts: {
        dev: "echo \"No dev script configured\"",
        build: "echo \"No build script configured\""
      }
    };
    fs.writeJsonSync(path.join(context.projectPath, "package.json"), rootPkg, { spaces: 2 });
  }

  // Write base Celtrix configuration
  fs.writeJsonSync(path.join(context.projectPath, "celtrix.config.json"), context.config, { spaces: 2 });
}

async function finalizeWorkspace(context) {
  if (context.installDeps) {
    // Dynamically install turbo at root for monorepos to guarantee latest version
    if (context.hasFrontend && context.hasBackend) {
      logger.info("📦 Dynamically installing latest stable Turborepo package at root...");
      const installCmd = context.packageManager === "npm" ? "install" : "add";
      await run(`${context.packageManager} ${installCmd} -D turbo`, { cwd: context.projectPath });
    }
    logger.info("📦 Running package manager installation across workspaces...");
    await run(`${context.packageManager} install`, { cwd: context.projectPath });
  }
}
