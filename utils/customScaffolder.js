import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import { logger } from "./logger.js";

// Generator Imports
import { generateFrontend } from "./customGenerators/frontendGenerator.js";
import { generateBackend } from "./customGenerators/backendGenerator.js";
import { generateDatabase } from "./customGenerators/databaseGenerator.js";
import { generateAPI } from "./customGenerators/apiGenerator.js";
import { generateAuth } from "./customGenerators/authGenerator.js";
import { generateAddons } from "./customGenerators/addonsGenerator.js";

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
    jsxExt: config.language === "typescript" ? "tsx" : "jsx"
  };

  logger.info("📦 Phase 1: Bootstrapping project workspace & Turborepo...");
  if (context.packageManager === "bun") {
    try {
      logger.info("⚡ Proactively clearing Bun's local package manager cache to prevent integrity errors...");
      execSync("bun pm cache rm", { stdio: "ignore" });
    } catch (e) {
      // ignore
    }
  }
  bootstrapWorkspace(context);

  if (context.hasFrontend) {
    logger.info("🎨 Phase 2: Generating frontend application...");
    await generateFrontend(context);
  }

  if (context.hasBackend) {
    logger.info("⚙️ Phase 3: Generating backend server...");
    await generateBackend(context);
  }

  if (config.database && config.database.type !== "none") {
    logger.info("🗄️ Phase 4: Setting up database and ORM connection package...");
    await generateDatabase(context);
  }

  if (config.api && config.api !== "none") {
    logger.info("🔌 Phase 5: Configuring type-safe API communication...");
    await generateAPI(context);
  }

  if (config.auth && config.auth !== "none") {
    logger.info("🔐 Phase 6: Injecting Authentication flow...");
    await generateAuth(context);
  }

  if (config.addons && config.addons.length > 0) {
    logger.info("🧩 Phase 7: Loading DevOps and AI add-ons...");
    await generateAddons(context);
  }

  logger.info("📦 Phase 8: Finalizing workspace configuration and lockfiles...");
  finalizeWorkspace(context);
}

function bootstrapWorkspace(context) {
  // If fullstack (frontend + backend selected), we create a Turborepo Monorepo
  if (context.hasFrontend && context.hasBackend) {
    // Detect package manager version dynamically for Turborepo compatibility
    let pmVersion = "1.0.0";
    try {
      pmVersion = execSync(`${context.packageManager} --version`).toString().trim();
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

    // 2. turbo.json
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

    // 3. packages/tsconfig workspace configs
    const tsconfigDir = path.join(context.projectPath, "packages", "tsconfig");
    fs.ensureDirSync(tsconfigDir);
    fs.writeJsonSync(path.join(tsconfigDir, "package.json"), {
      name: "@repo/tsconfig",
      version: "1.0.0",
      private: true
    }, { spaces: 2 });

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

function finalizeWorkspace(context) {
  if (context.installDeps) {
    // Dynamically install turbo at root for monorepos to guarantee latest version
    if (context.hasFrontend && context.hasBackend) {
      logger.info("📦 Dynamically installing latest stable Turborepo package at root...");
      const installCmd = context.packageManager === "npm" ? "install" : "add";
      execSync(`${context.packageManager} ${installCmd} -D turbo`, { cwd: context.projectPath, stdio: "inherit" });
    }
    logger.info("📦 Running package manager installation across workspaces...");
    execSync(`${context.packageManager} install`, { cwd: context.projectPath, stdio: "inherit" });
  }
}
