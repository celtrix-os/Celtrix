import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import boxen from "boxen";
import { logger } from "./logger.js";
import { copyTemplates } from "./templateManager.js";
import { writeWelcomePage } from "./welcomePage.js";
import { HonoReactSetup, mernTailwindSetup, installDependencies, mernSetup, serverAuthSetup, serverSetup, mevnSetup, mevnTailwindAuthSetup, nextSetup } from "./installer.js";
import { angularSetup, angularTailwindSetup } from "./installer.js";
import { scaffoldCustomProject } from "./customScaffolder.js";
import { runPhase } from "./progress.js";

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
    const copyPhase = () => runPhase("Applying Celtrix templates", () => copyTemplates(projectPath, config));
    const installPhase = (...args) =>
      installDeps && runPhase("Installing dependencies", () => installDependencies(projectPath, config, projectName, ...args));

    if (isCustom) {
      await scaffoldCustomProject(projectPath, projectName, config, installDeps);
    }

    else if (config.stack === "mern") {
      await runPhase("Generating MERN application", () => mernSetup(projectPath, config, projectName, installDeps));
      await copyPhase();
      await installPhase(false, []);
    }

    else if (config.stack === 'mevn') {
      await runPhase("Generating MEVN application", () => mevnSetup(projectPath, config, projectName, installDeps));
      await copyPhase();
      await installPhase(false, []);
    }

    else if (config.stack === "mean") {
      await runPhase("Generating MEAN application", () => angularSetup(projectPath, config, projectName, installDeps));
      await copyPhase();
      await installPhase();
    }

    else if (config.stack === "mern+tailwind+auth") {
      await runPhase("Generating MERN application", () => mernSetup(projectPath, config, projectName, installDeps));
      await copyPhase();
      await runPhase("Adding Tailwind CSS", () => mernTailwindSetup(projectPath, config, projectName));
      await runPhase("Configuring authentication server", () => serverAuthSetup(projectPath, config, projectName, installDeps));
    }

    else if (config.stack === 'mevn+tailwind+auth') {
      await runPhase("Generating MEVN + Tailwind application", () => mevnTailwindAuthSetup(projectPath, config, projectName, installDeps));
      await copyPhase();
      // the copied client template replaces the starter page, so write it afterwards
      writeWelcomePage(path.join(projectPath, "client"), {
        framework: "vue",
        projectName,
        stack: config.stack,
        typescript: config.language === "typescript",
      });
      await runPhase("Configuring authentication server", () => serverAuthSetup(projectPath, config, projectName, installDeps));
    }

    else if (config.stack === "mean+tailwind+auth") {
      await runPhase("Generating Angular + Tailwind application", () => angularTailwindSetup(projectPath, config, projectName));
      await copyPhase();
      await installPhase();
      await runPhase("Configuring authentication server", () => serverAuthSetup(projectPath, config, projectName, installDeps));
    }

    else if (config.stack === "react+tailwind+firebase") {
      await copyPhase();
      await installPhase();
    }

    else if (config.stack === "hono") {
      await runPhase("Generating Hono + React application", () => HonoReactSetup(projectPath, config, projectName, installDeps));
      await copyPhase();
      await installPhase(false);
    }

    else if (config.stack === 'nextjs') {
      await runPhase("Generating Next.js application", () => nextSetup(projectPath, config, projectName, installDeps));
      await copyPhase();
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
    if (config.database?.provider === "docker") {
      console.log(`   ${chalk.gray(`🐳 Start the database first: cp .env.example .env && ${config.packageManager} run db:up`)}`);
    } else if (config.database && config.database.type !== "none") {
      console.log(`   ${chalk.gray("📝 Configure your database connection in .env (see .env.example)")}`);
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
