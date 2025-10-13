import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import boxen from "boxen";
import { logger } from "./logger.js";
import { copyTemplates } from "./templateManager.js";
import { HonoReactSetup, mernTailwindSetup, installDependencies, mernSetup, serverAuthSetup, serverSetup, mevnSetup, mevnTailwindAuthSetup } from "./installer.js";
import { angularSetup, angularTailwindSetup } from "./installer.js";

export async function setupProject(projectName, config, installDeps) {
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

  // --- Copy & Install ---


  if (config.stack === "mern") {
    mernSetup(projectPath, config, projectName,installDeps);
    copyTemplates(projectPath, config);
    if (installDeps) installDependencies(projectPath, config, projectName, false, [])
  }

  else if (config.stack === 'mevn') {
    mevnSetup(projectPath, config, projectName,installDeps)
    copyTemplates(projectPath, config)
    if (installDeps) installDependencies(projectPath, config, projectName, false, [])
  }

  else if (config.stack === "mean") {
    angularSetup(projectPath, config, projectName,installDeps);
    copyTemplates(projectPath, config);
    if (installDeps) installDependencies(projectPath, config, projectName);
  }

  else if (config.stack === "mern+tailwind+auth") {
    mernSetup(projectPath, config, projectName,installDeps);
    copyTemplates(projectPath, config);
    mernTailwindSetup(projectPath, config, projectName);
    serverAuthSetup(projectPath, config, projectName, installDeps);
  }

  else if (config.stack === 'mevn+tailwind+auth') {
    mevnTailwindAuthSetup(projectPath, config, projectName,installDeps);
    copyTemplates(projectPath, config);
    serverAuthSetup(projectPath, config, projectName, installDeps)
  }

  else if (config.stack === "mean+tailwind+auth") {
    angularTailwindSetup(projectPath, config, projectName,installDeps);
    copyTemplates(projectPath, config);
    if (installDeps) installDependencies(projectPath, config, projectName);
    serverAuthSetup(projectPath, config, projectName, installDeps);
  }


  else if (config.stack === "react+tailwind+firebase") {
    copyTemplates(projectPath, config);
    if (installDeps) installDependencies(projectPath, config, projectName);
  }


  else if (config.stack === "hono") {
    try {
      HonoReactSetup(projectPath, config, projectName,installDeps);
      copyTemplates(projectPath, config);
      if (installDeps) installDependencies(projectPath, config, projectName, false);
    }
    catch {
      copyTemplates(projectPath, config);
    }
  }

  else if (config.stack === 't3-stack') {
    try {
      // Copy template files
      copyTemplates(projectPath, config, projectName);

      // Install all dependencies (both client and server)
      if (installDeps) installDependencies(projectPath, config, projectName);

      logger.info("✅ T3 stack project created successfully!");
    } catch (error) {
      logger.error("❌ Failed to set up T3 stack");
      logger.error(error.message);
      throw error;
    }
  }

  // --- Success + Next Steps ---
  console.log(chalk.gray("-------------------------------------------"))
  console.log(`${chalk.greenBright(`✅ Project ${chalk.bold.yellow(`${projectName}`)} created successfully! 🎉`)}`);
  console.log(chalk.gray("-------------------------------------------"))
  console.log(chalk.cyan("👉 Next Steps:\n"));

  if (config.stack === "mean" || config.stack === "mean+tailwind+auth") {
    console.log(`   ${chalk.yellow("cd")} ${projectName}/client && ${chalk.green("npm start")}`);
    console.log(`   ${chalk.yellow("cd")} ${projectName}/server && ${chalk.green("npm start")}`);
  } else if (config.stack === "t3-stack") {
    console.log(`   ${chalk.yellow("cd")} ${projectName}/t3-app && ${chalk.green("npm run dev")}`);

  } else if (config.stack === "react+tailwind+firebase") {
    console.log(`   ${chalk.yellow("cd")} ${projectName}/client && ${chalk.green("npm run dev")}`);
    console.log(`   ${chalk.gray("📝 Don't forget to configure your Firebase project in .env file!")}`);

  } else if (config.stack === "hono") {
    console.log(`   ${chalk.yellow("cd")} ${projectName}/client && ${chalk.green("npm run dev")}`);
    console.log(`   ${chalk.yellow("cd")} ${projectName}/server && ${chalk.green("npm run dev")}`);
  } else {
    console.log(`   ${chalk.yellow("cd")} ${projectName}/client && ${chalk.green("npm run dev")}`);
    console.log(`   ${chalk.yellow("cd")} ${projectName}/server && ${chalk.green("npm start")}`);
  }

  console.log(chalk.gray("-------------------------------------------"))
  console.log(chalk.gray("\n✨ Made with ❤️  by Celtrix ✨\n"));
}
