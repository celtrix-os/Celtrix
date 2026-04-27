import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import boxen from "boxen";
import { logger } from "./logger.js";
import { copyTemplates } from "./templateManager.js";
import { HonoReactSetup, mernTailwindSetup, installDependencies, mernSetup, serverAuthSetup, serverSetup, mevnSetup, mevnTailwindAuthSetup, nextSetup } from "./installer.js";
import { angularSetup, angularTailwindSetup } from "./installer.js";

/**
 * Generates starter files for a custom-stack project so the user doesn't
 * end up with just a JSON config file.
 *
 * @param {string} projectPath - Absolute path to the project directory.
 * @param {string} projectName - Project name.
 * @param {object} config - Full custom-stack config.
 */
function bootstrapCustomProject(projectPath, projectName, config) {
  // ── README.md ──
  const readmeLines = [
    `# ${projectName}`,
    "",
    `> Bootstrapped with [Celtrix](https://github.com/celtrix-os/Celtrix) — Custom Stack`,
    "",
    "## Tech Stack",
    "",
    `| Layer | Choice |`,
    `|-------|--------|`,
    `| Language | ${config.language} |`,
    `| Frontend | ${config.frontend} |`,
    `| Backend | ${config.backend} |`,
    `| Runtime | ${config.runtime === "bun" ? "Bun" : "Node.js"} |`,
  ];

  if (config.database && config.database.type !== "none") {
    readmeLines.push(`| Database | ${config.database.type}${config.database.provider ? ` (${config.database.provider})` : ""} |`);
  }
  if (config.orm && config.orm !== "none") readmeLines.push(`| ORM | ${config.orm} |`);
  if (config.api && config.api !== "none") readmeLines.push(`| API | ${config.api} |`);
  if (config.auth && config.auth !== "none") readmeLines.push(`| Auth | ${config.auth} |`);
  if (config.addons && config.addons.length > 0) readmeLines.push(`| Add-ons | ${config.addons.join(", ")} |`);

  readmeLines.push(
    "",
    "## Getting Started",
    "",
    "```bash",
    `cd ${projectName}`,
    `${config.packageManager} install`,
    `${config.packageManager === "npm" ? "npm run dev" : `${config.packageManager} run dev`}`,
    "```",
    "",
    "## Configuration",
    "",
    "Your full stack configuration is saved in `celtrix.config.json`.",
    "",
    "---",
    "",
    "*Made with ❤️ by [Celtrix](https://github.com/celtrix-os/Celtrix)*",
  );

  fs.writeFileSync(path.join(projectPath, "README.md"), readmeLines.join("\n"), "utf-8");

  // ── .gitignore ──
  const gitignoreContent = [
    "node_modules/",
    "dist/",
    "build/",
    ".env",
    ".env.local",
    ".env.*.local",
    "*.log",
    "npm-debug.log*",
    ".DS_Store",
    "Thumbs.db",
    ".vscode/",
    ".idea/",
    "coverage/",
    ".nyc_output/",
  ].join("\n");

  fs.writeFileSync(path.join(projectPath, ".gitignore"), gitignoreContent, "utf-8");

  // ── package.json ──
  const pkgJson = {
    name: projectName,
    version: "0.1.0",
    private: true,
    type: "module",
    scripts: {
      dev: "echo \"Configure your dev script\"",
      build: "echo \"Configure your build script\"",
    },
  };

  fs.writeJsonSync(path.join(projectPath, "package.json"), pkgJson, { spaces: 2 });

  // ── .env.example (conditional) ──
  const envLines = [];
  if (config.database && config.database.type !== "none") {
    envLines.push(`# ${config.database.type.toUpperCase()} connection`);
    envLines.push(`DATABASE_URL=""`);
  }
  if (config.auth && config.auth !== "none") {
    envLines.push("");
    envLines.push(`# ${config.auth} auth`);
    if (config.auth === "clerk") {
      envLines.push(`NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=""`);
      envLines.push(`CLERK_SECRET_KEY=""`);
    } else if (config.auth === "better-auth") {
      envLines.push(`AUTH_SECRET=""`);
    }
  }

  if (envLines.length > 0) {
    fs.writeFileSync(path.join(projectPath, ".env.example"), envLines.join("\n") + "\n", "utf-8");
  }

  // ── celtrix.config.json ──
  fs.writeJsonSync(path.join(projectPath, "celtrix.config.json"), config, { spaces: 2 });
}

export async function setupProject(projectName, config, installDeps) {
  const projectPath = path.join(process.cwd(), projectName);

  if (fs.existsSync(projectPath)) {
    logger.error(`❌ Directory ${chalk.red(projectName)} already exists`);
    process.exit(1);
  }

  fs.mkdirSync(projectPath);

  // --- Pretty Project Config (Boxed) ---
  const isCustom = config.stack === "custom";

  const configLines = [
    `${chalk.bold("🌐 Stack:")}  ${chalk.green(isCustom ? "Custom" : config.stack)}`,
    `${chalk.bold("📦 Project Name:")}  ${chalk.blue(projectName)}`,
  ];

  if (isCustom) {
    configLines.push(`${chalk.bold("📖 Language:")}  ${chalk.yellowBright(config.language)}`);
    if (config.frontend)                            configLines.push(`${chalk.bold("🎨 Frontend:")}  ${chalk.cyanBright(config.frontend)}`);
    if (config.backend && config.backend !== "none") configLines.push(`${chalk.bold("⚙️  Backend:")}  ${chalk.magentaBright(config.backend)}`);
    if (config.database && config.database.type !== "none") {
      configLines.push(`${chalk.bold("🗄️  Database:")}  ${chalk.cyanBright(config.database.type)}${config.database.provider ? chalk.gray(" via ") + chalk.white(config.database.provider) : ""}`);
    }
    if (config.orm && config.orm !== "none")         configLines.push(`${chalk.bold("🔗 ORM:")}  ${chalk.greenBright(config.orm)}`);
    if (config.api && config.api !== "none")         configLines.push(`${chalk.bold("🔌 API:")}  ${chalk.blueBright(config.api)}`);
    if (config.auth && config.auth !== "none")       configLines.push(`${chalk.bold("🔐 Auth:")}  ${chalk.magentaBright(config.auth)}`);
    if (config.addons && config.addons.length > 0)   configLines.push(`${chalk.bold("🧩 Add-ons:")}  ${chalk.yellow(config.addons.join(", "))}`);
  } else {
    configLines.push(`${chalk.bold("📖 Language:")}  ${chalk.red(config.language)}`);
  }

  configLines.push(
    `${chalk.bold("⚡ Runtime:")}  ${config.runtime === 'bun' ? chalk.white('Bun') : chalk.greenBright('Node.js')}`,
    `${chalk.bold("📦 Package Manager:")}  ${chalk.magenta(config.packageManager)}`,
  );

  console.log(
    boxen(configLines.join("\n"), {
      padding: 1,
      margin: 1,
      borderColor: "cyan",
      borderStyle: "round",
      title: chalk.cyanBright("📋 Project Configuration"),
      titleAlignment: "center",
    })
  );

  // --- Copy & Install ---

  try {
    if (isCustom) {
      logger.info("📋 Bootstrapping custom stack project...");
      bootstrapCustomProject(projectPath, projectName, config);
      logger.success(`✅ Project scaffolded with README, .gitignore, package.json, and config`);
    }

    else if (config.stack === "mern") {
      mernSetup(projectPath, config, projectName, installDeps);
      copyTemplates(projectPath, config);
      if (installDeps) installDependencies(projectPath, config, projectName, false, []);
    }

    else if (config.stack === 'mevn') {
      mevnSetup(projectPath, config, projectName, installDeps);
      copyTemplates(projectPath, config);
      if (installDeps) installDependencies(projectPath, config, projectName, false, []);
    }

    else if (config.stack === "mean") {
      angularSetup(projectPath, config, projectName, installDeps);
      copyTemplates(projectPath, config);
      if (installDeps) installDependencies(projectPath, config, projectName);
    }

    else if (config.stack === "mern+tailwind+auth") {
      mernSetup(projectPath, config, projectName, installDeps);
      copyTemplates(projectPath, config);
      mernTailwindSetup(projectPath, config, projectName);
      serverAuthSetup(projectPath, config, projectName, installDeps);
    }

    else if (config.stack === 'mevn+tailwind+auth') {
      mevnTailwindAuthSetup(projectPath, config, projectName, installDeps);
      copyTemplates(projectPath, config);
      serverAuthSetup(projectPath, config, projectName, installDeps);
    }

    else if (config.stack === "mean+tailwind+auth") {
      angularTailwindSetup(projectPath, config, projectName);
      copyTemplates(projectPath, config);
      if (installDeps) installDependencies(projectPath, config, projectName);
      serverAuthSetup(projectPath, config, projectName, installDeps);
    }

    else if (config.stack === "react+tailwind+firebase") {
      copyTemplates(projectPath, config);
      if (installDeps) installDependencies(projectPath, config, projectName);
    }

    else if (config.stack === "hono") {
      HonoReactSetup(projectPath, config, projectName, installDeps);
      copyTemplates(projectPath, config);
      if (installDeps) installDependencies(projectPath, config, projectName, false);
    }

    else if (config.stack === 'nextjs') {
      nextSetup(projectPath, config, projectName);
      copyTemplates(projectPath, config);
      logger.info("✅ Next.js project created successfully!");
    }
  } catch (error) {
    // Clean up the created directory on failure
    logger.error(`❌ Scaffolding failed: ${error.message}`);
    logger.debug(`Cleaning up ${projectPath}...`);
    try {
      fs.removeSync(projectPath);
      logger.debug("Cleanup complete.");
    } catch {
      logger.debug("Cleanup failed — directory may need manual removal.");
    }
    throw error;
  }

  // --- Success + Next Steps ---
  console.log(chalk.gray("-------------------------------------------"));
  console.log(`${chalk.greenBright(`✅ Project ${chalk.bold.yellow(`${projectName}`)} created successfully! 🎉`)}`);
  console.log(chalk.gray("-------------------------------------------"));
  console.log(chalk.cyan("👉 Next Steps:\n"));

  // Provide package-manager commands for dev/start
  const cmd = (script) => {
    const useBunRuntime = config.runtime === 'bun';
    switch (config.packageManager) {
      case "yarn":
        return `yarn ${script === "dev" ? "dev" : (useBunRuntime ? "bun server.js" : "node server.js")}`;
      case "pnpm":
        return script === "dev" ? "pnpm run dev" : (useBunRuntime ? "bun server.js" : "node server.js");
      case "bun":
        return `bun ${script === "dev" ? "run dev" : "server.js"}`;
      case "npm":
      default:
        return script === "dev" ? "npm run dev" : (useBunRuntime ? "bun server.js" : "npm start");
    }
  };

  if (isCustom) {
    console.log(`   ${chalk.yellow("cd")} ${projectName} && ${chalk.green(cmd("dev"))}`);
    if (config.database && config.database.type !== "none") {
      console.log(`   ${chalk.gray("📝 Configure your database connection in .env (see .env.example)")}`);
    }
    if (config.auth && config.auth !== "none") {
      console.log(`   ${chalk.gray(`📝 Configure your ${config.auth} credentials in .env`)}`);
    }
  } else if (config.stack === "mean" || config.stack === "mean+tailwind+auth") {
    console.log(`   ${chalk.yellow("cd")} ${projectName}/client && ${chalk.green(cmd("start"))}`);
    console.log(`   ${chalk.yellow("cd")} ${projectName}/server && ${chalk.green(cmd("start"))}`);
  } else if (config.stack === "nextjs") {
    console.log(`   ${chalk.yellow("cd")} ${projectName} && ${chalk.green(cmd("dev"))}`);
  } else if (config.stack === "react+tailwind+firebase") {
    console.log(`   ${chalk.yellow("cd")} ${projectName}/client && ${chalk.green(cmd("dev"))}`);
    console.log(`   ${chalk.gray("📝 Don't forget to configure your Firebase project in .env file!")}`);
  } else if (config.stack === "hono") {
    console.log(`   ${chalk.yellow("cd")} ${projectName}/client && ${chalk.green(cmd("dev"))}`);
    console.log(`   ${chalk.yellow("cd")} ${projectName}/server && ${chalk.green(cmd("dev"))}`);
  } else {
    console.log(`   ${chalk.yellow("cd")} ${projectName}/client && ${chalk.green(cmd("dev"))}`);
    console.log(`   ${chalk.yellow("cd")} ${projectName}/server && ${chalk.green(cmd("start"))}`);
  }

  console.log(chalk.gray("-------------------------------------------"));
  console.log(chalk.gray("\n✨ Made with ❤️  by Celtrix ✨\n"));
}
