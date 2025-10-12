import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import boxen from "boxen";
import { logger } from "./logger.js";
import { copyTemplates } from "./templateManager.js";
import {
  HonoReactSetup,
  mernTailwindSetup,
  installDependencies,
  mernSetup,
  serverAuthSetup,
  mevnSetup,
  mevnTailwindAuthSetup,
} from "./installer.js";
import { angularSetup, angularTailwindSetup } from "./installer.js";

export async function setupProject(projectName, config, installDeps = true) {
  const projectPath = path.join(process.cwd(), projectName);

  if (fs.existsSync(projectPath)) {
    logger.error(`❌ Directory ${chalk.red(projectName)} already exists`);
    process.exit(1);
  }

  fs.mkdirSync(projectPath);

  // --- Pretty Project Config (Boxed) ---
  const configText = `
    ${chalk.bold("🌐 Stack:")}  ${chalk.green(config.stack)}
    ${chalk.bold("📦 Project Name:")}  ${chalk.blue(projectName)}
    ${chalk.bold("📖 Language:")}  ${chalk.red(config.language)}
  `;

  console.log(
    boxen(configText, {
      padding: 1,
      margin: 1,
      borderColor: "cyan",
      borderStyle: "round",
      title: chalk.cyanBright("📋 Project Configuration"),
      titleAlignment: "center",
    })
  );

  // --- Copy Templates & Install (conditionally) ---
  async function maybeInstall(fn) {
    if (installDeps) {
      await fn();
    } else {
      console.log(chalk.gray("⏭️ Skipping dependency installation (user choice)\n"));
    }
  }

  try {
    if (config.stack === "mern") {
      await mernSetup(projectPath, config, projectName, installDeps);
      await copyTemplates(projectPath, config);
      await maybeInstall(() => installDependencies(projectPath, config, projectName, false, [], installDeps));
    } else if (config.stack === "mevn") {
      await mevnSetup(projectPath, config, projectName, installDeps);
      await copyTemplates(projectPath, config);
      await maybeInstall(() => installDependencies(projectPath, config, projectName, false, [], installDeps));
    } else if (config.stack === "mean") {
      await angularSetup(projectPath, config, projectName, installDeps);
      await copyTemplates(projectPath, config);
      await maybeInstall(() => installDependencies(projectPath, config, projectName, true, [], installDeps));
    } else if (config.stack === "mern+tailwind+auth") {
      await mernSetup(projectPath, config, projectName, installDeps);
      await copyTemplates(projectPath, config);
      await mernTailwindSetup(projectPath, config, projectName, installDeps);
      await serverAuthSetup(projectPath, config, projectName, installDeps);
    } else if (config.stack === "mevn+tailwind+auth") {
      await mevnTailwindAuthSetup(projectPath, config, projectName, installDeps);
      await copyTemplates(projectPath, config);
      await serverAuthSetup(projectPath, config, projectName, installDeps);
    } else if (config.stack === "mean+tailwind+auth") {
      await angularTailwindSetup(projectPath, config, projectName, installDeps);
      await copyTemplates(projectPath, config);
      await maybeInstall(() => installDependencies(projectPath, config, projectName, true, [], installDeps));
      await serverAuthSetup(projectPath, config, projectName, installDeps);
    } else if (config.stack === "react+tailwind+firebase") {
      await copyTemplates(projectPath, config);
      await maybeInstall(() => installDependencies(projectPath, config, projectName, true, [], installDeps));
    } else if (config.stack === "hono") {
      try {
        await HonoReactSetup(projectPath, config, projectName, installDeps);
        await copyTemplates(projectPath, config);
        await maybeInstall(() => installDependencies(projectPath, config, projectName, false, [], installDeps));
      } catch {
        await copyTemplates(projectPath, config);
      }
    } else if (config.stack === "t3-stack") {
      await copyTemplates(projectPath, config, projectName, installDeps);
      await maybeInstall(() => installDependencies(projectPath, config, projectName, true, [], installDeps));
      logger.info("✅ T3 stack project created successfully!");
    }
  } catch (error) {
    logger.error("❌ Project setup failed:");
    logger.error(error.message);
    process.exit(1);
  }

  // --- Success + Next Steps ---
  console.log(chalk.gray("-------------------------------------------"));
  console.log(
    `${chalk.greenBright(
      `✅ Project ${chalk.bold.yellow(`${projectName}`)} created successfully! 🎉`
    )}`
  );
  console.log(chalk.gray("-------------------------------------------"));
  console.log(chalk.cyan("👉 Next Steps:\n"));

  // 🧩 Handle Next Steps depending on stack
  if (config.stack === "mean" || config.stack === "mean+tailwind+auth") {
    console.log(`   ${chalk.yellow("cd")} ${projectName}/client`);
    if (!installDeps) console.log(`   ${chalk.green("npm install")}`);
    console.log(`   ${chalk.green("npm start")}`);
    console.log(`\n   ${chalk.yellow("cd")} ${projectName}/server`);
    if (!installDeps) console.log(`   ${chalk.green("npm install")}`);
    console.log(`   ${chalk.green("npm start")}`);
  } else if (config.stack === "t3-stack") {
    console.log(`   ${chalk.yellow("cd")} ${projectName}/t3-app`);
    if (!installDeps) console.log(`   ${chalk.green("npm install")}`);
    console.log(`   ${chalk.green("npm run dev")}`);
  } else if (config.stack === "react+tailwind+firebase") {
    console.log(`   ${chalk.yellow("cd")} ${projectName}/client`);
    if (!installDeps) console.log(`   ${chalk.green("npm install")}`);
    console.log(`   ${chalk.green("npm run dev")}`);
    console.log(chalk.gray("📝 Don't forget to configure your Firebase project in .env file!"));
  } else if (config.stack === "hono") {
    console.log(`   ${chalk.yellow("cd")} ${projectName}/client`);
    if (!installDeps) console.log(`   ${chalk.green("npm install")}`);
    console.log(`   ${chalk.green("npm run dev")}`);
    console.log(`\n   ${chalk.yellow("cd")} ${projectName}/server`);
    if (!installDeps) console.log(`   ${chalk.green("npm install")}`);
    console.log(`   ${chalk.green("npm run dev")}`);
  } else {
    console.log(`   ${chalk.yellow("cd")} ${projectName}/client`);
    if (!installDeps) console.log(`   ${chalk.green("npm install")}`);
    console.log(`   ${chalk.green("npm run dev")}`);
    console.log(`\n   ${chalk.yellow("cd")} ${projectName}/server`);
    if (!installDeps) console.log(`   ${chalk.green("npm install")}`);
    console.log(`   ${chalk.green("npm start")}`);
  }

  console.log(chalk.gray("-------------------------------------------"));
  console.log(chalk.gray("\n✨ Made with ❤️  by Celtrix ✨\n"));
}