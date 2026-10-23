import { execSync } from "child_process";
import { logger } from "./logger.js";
import { buildViteCommand, getInstallCommand } from "./shared.js";
import { writeWelcomePage } from "./welcomePage.js";
import path from "path";
import fs from "fs";

// ─── Shared Helpers ──────────────────────────────────────────────────────────

/**
 * Creates a Vite project using the correct package-manager command.
 *
 * @param {string} projectPath - Parent directory for the new project.
 * @param {object} config - Project config (packageManager, language, etc.).
 * @param {string} baseTemplate - Base Vite template name (e.g. "react", "vue").
 * @param {string} [outputDir="client"] - Directory name for the scaffolded project.
 */
function createViteProject(projectPath, config, baseTemplate, outputDir = "client") {
  const template =
    config.language === "typescript" ? `${baseTemplate}-ts` : baseTemplate;
  const cmd = buildViteCommand(config, template, outputDir);

  execSync(cmd, { cwd: projectPath, stdio: "inherit", shell: true });
}

/**
 * Patches a Vite config file to add the Tailwind CSS plugin.
 *
 * @param {string} viteConfigPath - Absolute path to vite.config.js/ts.
 */
function patchViteConfigWithTailwind(viteConfigPath) {
  if (!fs.existsSync(viteConfigPath)) return;

  let content = fs.readFileSync(viteConfigPath, "utf-8");

  content = content.replace(
    /import \{\s*defineConfig\s*\}\s*from\s*['"]vite['"]/,
    `import { defineConfig } from 'vite'\nimport tailwindcss from '@tailwindcss/vite'`
  );

  content = content.replace(
    /plugins:\s*\[([^\]]*)\]/,
    (match, pluginsInside) => {
      if (!pluginsInside.includes("tailwindcss()")) {
        return `plugins: [${pluginsInside.trim()} , tailwindcss()]`;
      }
      return match;
    }
  );

  fs.writeFileSync(viteConfigPath, content, "utf-8");
}

/**
 * Ensures Tailwind's `@import 'tailwindcss'` directive is present in the
 * project's main CSS file.
 *
 * @param {string} clientPath - Absolute path to the client directory.
 */
function ensureTailwindImport(clientPath) {
  const candidates = [
    path.join(clientPath, "src", "index.css"),
    path.join(clientPath, "src", "style.css"),
    path.join(clientPath, "src", "assets", "main.css"),
  ];

  const cssPath = candidates.find((p) => fs.existsSync(p));
  if (!cssPath) return;

  let cssContent = fs.readFileSync(cssPath, "utf-8");
  if (cssContent.includes("@import 'tailwindcss'") || cssContent.includes('@import "tailwindcss"')) return;

  cssContent = /:root/.test(cssContent)
    ? cssContent.replace(/:root/, `@import 'tailwindcss';\n\n:root`)
    : `@import 'tailwindcss';\n\n` + cssContent;

  fs.writeFileSync(cssPath, cssContent, "utf-8");
}

// ─── Dependency Installation ─────────────────────────────────────────────────

export function installDependencies(projectPath, config, projectName, server = true, dependencies = []) {
  try {
    // Handle T3 stack which uses t3-app directory
    if (config.stack === 't3-stack') {
      const t3AppDir = path.join(projectPath, 't3-app');
      if (fs.existsSync(t3AppDir)) {
        logger.info("📦 Installing T3 stack dependencies...");
        execSync(`${config.packageManager} install`, { cwd: t3AppDir, stdio: "inherit", shell: true });
        logger.info("✅ T3 stack dependencies installed successfully");
        return;
      }
    }

    // Handle other stacks with client/server structure
    const clientDir = path.join(projectPath, "client");
    const serverDir = path.join(projectPath, "server");

    if (fs.existsSync(clientDir)) {
      logger.info("📦 Installing Frontend dependencies...");
      execSync(`${config.packageManager} install`, { cwd: clientDir, stdio: "inherit", shell: true });
    }

    if (server && fs.existsSync(serverDir)) {
      logger.info("📦 Installing Backend dependencies...");
      const installCmd = getInstallCommand(config.packageManager);
      execSync(`${config.packageManager} ${installCmd} ` + dependencies.join(" "), { cwd: serverDir, stdio: "inherit", shell: true });
    }

    logger.info("✅ Dependencies installed successfully");
  } catch (err) {
    logger.error("❌ Failed to install dependencies");
    logger.error(err.message);
    throw err;
  }
}

// ─── Stack Setup Functions ───────────────────────────────────────────────────

export function angularSetup(projectPath, config, projectName, installDeps) {
  logger.info("⚡ Setting up Angular...");

  try {
    execSync(`npx -y @angular/cli new client --style=css --skip-git --skip-install`, {
      cwd: projectPath,
      stdio: "inherit",
      shell: true,
    });

    serverSetup(projectPath, config, projectName, installDeps);
    logger.info("✅ Angular project created successfully!");

    return true;
  } catch (error) {
    logger.error("❌ Failed to set up Angular");
    throw error;
  }
}

export function angularTailwindSetup(projectPath, config, projectName) {
  logger.info("⚡ Setting up Angular + Tailwind...");

  try {
    execSync(`npx -y @angular/cli new client --style css`, {
      cwd: projectPath,
      stdio: "inherit",
      shell: true,
    });

    const clientPath = path.join(projectPath, "client");

    const installCmd = getInstallCommand(config.packageManager);
    execSync(`${config.packageManager} ${installCmd} tailwindcss @tailwindcss/postcss postcss --force`, {
      cwd: clientPath,
      stdio: "inherit",
      shell: true,
    });

    fs.writeFileSync(
      path.join(clientPath, ".postcssrc.json"),
      `{\n  "plugins": {\n    "@tailwindcss/postcss": {}\n  }\n}`
    );

    fs.writeFileSync(
      path.join(clientPath, "src/styles.css"),
      `@import "tailwindcss";\n`
    );

    logger.info("✅ Angular + Tailwind setup completed!");
    return true;
  } catch (error) {
    logger.error("❌ Failed to set up Angular Tailwind");
    throw error;
  }
}

export function HonoReactSetup(projectPath, config, projectName, installDeps) {
  logger.info("⚡ Setting up Hono + React...");

  try {
    createViteProject(projectPath, config, "react");
    writeWelcomePage(path.join(projectPath, "client"), {
      framework: "react",
      projectName,
      stack: "hono",
      typescript: config.language === "typescript",
    });

    execSync(`npm create hono@latest server -- --template cloudflare-workers --pm npm`, {
      cwd: projectPath,
      stdio: "inherit",
      shell: true,
    });

    logger.info("✅ Created Hono + React project!");
    serverAuthSetup(projectPath, config, projectName, installDeps);
  } catch (error) {
    logger.error("❌ Failed to set up Hono + React project");
    throw error;
  }
}

export function mernSetup(projectPath, config, projectName, installDeps) {
  logger.info("⚡ Setting up MERN...");

  try {
    createViteProject(projectPath, config, "react");
    writeWelcomePage(path.join(projectPath, "client"), {
      framework: "react",
      projectName,
      stack: config.stack,
      typescript: config.language === "typescript",
    });

    if (config.stack === "mern+tailwind+auth") {
      serverAuthSetup(projectPath, config, projectName, installDeps);
    } else if (config.stack === "mern") {
      serverSetup(projectPath, config, projectName, installDeps);
    }

    logger.info("✅ MERN project created successfully!");
  } catch (error) {
    logger.error("❌ Failed to set up MERN");
    throw error;
  }
}

export function mernTailwindSetup(projectPath, config, projectName) {
  try {
    const clientPath = path.join(projectPath, "client");
    const installCmd = getInstallCommand(config.packageManager);
    execSync(`${config.packageManager} ${installCmd} tailwindcss @tailwindcss/vite`, { cwd: clientPath });

    const isJs = config.language === "javascript";
    const viteConfigPath = path.join(
      clientPath,
      isJs ? "vite.config.js" : "vite.config.ts"
    );

    patchViteConfigWithTailwind(viteConfigPath);
    ensureTailwindImport(clientPath);

    logger.info("✅ TailwindCSS added to Vite config");
  } catch (err) {
    logger.error(`❌ Failed to setup Tailwind: ${err.message}`);
  }
}

export function mevnSetup(projectPath, config, projectName, installDeps) {
  try {
    logger.info("⚡ Setting up MEVN...");
    createViteProject(projectPath, config, "vue");
    writeWelcomePage(path.join(projectPath, "client"), {
      framework: "vue",
      projectName,
      stack: config.stack,
      typescript: config.language === "typescript",
    });

    logger.info("✅ MEVN project created successfully!");
    serverSetup(projectPath, config, projectName, installDeps);
  } catch (error) {
    logger.error("❌ Failed to set up MEVN");
    throw error;
  }
}

export function mevnTailwindAuthSetup(projectPath, config, projectName, installDeps) {
  logger.info("⚡ Setting up MEVN + Tailwind + Auth...");

  try {
    createViteProject(projectPath, config, "vue");

    const clientPath = path.join(projectPath, "client");

    // Install Tailwind plugin for Vite
    const installCmd = getInstallCommand(config.packageManager);
    execSync(`${config.packageManager} ${installCmd} tailwindcss @tailwindcss/vite`, {
      cwd: clientPath,
      stdio: "inherit",
      shell: true,
    });

    // Patch Vite config
    const isJs = config.language === "javascript";
    patchViteConfigWithTailwind(
      path.join(clientPath, isJs ? "vite.config.js" : "vite.config.ts")
    );

    // Ensure Tailwind import in CSS
    ensureTailwindImport(clientPath);

    logger.info("✅ MEVN + Tailwind + Auth setup completed!");
    serverAuthSetup(projectPath, config, projectName, installDeps);
  } catch (error) {
    logger.error("❌ Failed to set up MEVN + Tailwind + Auth");
    throw error;
  }
}

export function nextSetup(projectPath, config, projectName, installDeps) {
  try {
    function nextCommand() {
      switch (config.packageManager) {
        case "npm":   return "npx create-next-app@latest";
        case "pnpm":  return "pnpm dlx create-next-app@latest";
        case "yarn":  return "yarn dlx create-next-app@latest";
        case "bun":   return "bunx create-next-app@latest";
        default:      return "npx create-next-app@latest";
      }
    }

    const installFlag = installDeps ? "" : " --skip-install";

    if (config.language === "typescript") {
      logger.info("⚡ Setting up Next.js with TypeScript...");
      execSync(`${nextCommand()} . --typescript --eslint --tailwind --src-dir --app --no-turbo --import-alias="@/*"${installFlag} --yes`, {
        cwd: projectPath,
        stdio: "inherit",
        shell: true,
      });
    } else if (config.language === "javascript") {
      logger.info("⚡ Setting up Next.js with JavaScript...");
      execSync(`${nextCommand()} . --eslint --tailwind --src-dir --app --turbo --import-alias @/*${installFlag} --yes`, {
        cwd: projectPath,
        stdio: "inherit",
        shell: true,
      });
    } else {
      throw new Error("Invalid language option. Choose 'javascript' or 'typescript'.");
    }

    logger.info("✅ Next.js project setup completed!");
  } catch (err) {
    logger.error(`❌ Error setting up Next.js: ${err.message}`);
    throw err;
  }
}

export function serverSetup(projectPath, config, projectName, installDeps) {
  try {
    const serverDir = path.join(projectPath, "server");

    if (!fs.existsSync(serverDir)) {
      fs.mkdirSync(serverDir, { recursive: true });
    }

    execSync("npm init -y", {
      cwd: serverDir,
      stdio: "ignore",
      shell: true,
    });

    if (installDeps) {
      installDependencies(projectPath, config, projectName, true, [
        "express", "dotenv", "mongoose", "nodemon", "cors", "helmet", "express-rate-limit",
      ]);
    }
  } catch (error) {
    logger.error("❌ Failed to set up server");
    throw error;
  }
}

export function serverAuthSetup(projectPath, config, projectName, installDeps) {
  try {
    const serverDir = path.join(projectPath, "server");

    if (!fs.existsSync(serverDir)) {
      fs.mkdirSync(serverDir, { recursive: true });
    }

    try {
      execSync("npm init -y", {
        cwd: serverDir,
        stdio: "ignore",
        shell: true,
      });
    } catch {
      logger.debug("npm init -y failed (likely already initialized)");
    }

    if (installDeps) {
      installDependencies(projectPath, config, projectName, true, [
        "bcrypt", "jsonwebtoken", "cookie-parser", "dotenv", "express",
        "helmet", "mongoose", "cors", "nodemon", "morgan",
      ]);
    }
  } catch (error) {
    logger.error("❌ Failed to set up server auth");
    throw error;
  }
}