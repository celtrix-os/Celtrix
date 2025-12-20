import path from "path";
import fs from "fs-extra";
import chalk from "chalk";
import boxen from "boxen";
import { logger } from "./logger.js";
import { copyTemplates } from "./templateManager.js";
import { HonoReactSetup,mernTailwindSetup, installDependencies, mernSetup, serverAuthSetup, serverSetup, mevnSetup, mevnTailwindAuthSetup, nextSetup } from "./installer.js";
import { angularSetup, angularTailwindSetup } from "./installer.js";
import { applyCustomizations } from "./customization.js";

export async function setupProject(projectName, config, installDeps) {
  const projectPath = path.join(process.cwd(), projectName);

  if (fs.existsSync(projectPath)) {
    logger.error(`❌ Directory ${chalk.red(projectName)} already exists`);
    process.exit(1);
  }

  fs.mkdirSync(projectPath);

  // --- Pretty Project Config (Boxed) ---
  let configText = `
    ${chalk.bold("🌐 Stack:")}  ${chalk.green(config.stack)}
    ${chalk.bold("📦 Project Name:")}  ${chalk.blue(projectName)}
    ${chalk.bold("📖 Language:")}  ${chalk.red(config.language)}
    ${chalk.bold("📦 Package Manager")}  ${chalk.magenta(config.packageManager)}`;

  // Add customization info if enabled
  if (config.customization) {
    const custom = config.customization;
    configText += `
    ${chalk.bold("🎨 Customizations:")}  ${chalk.cyan("Enabled")}`;
    
    if (custom.serverPort) {
      configText += `
    ${chalk.bold("🔌 Server Port:")}  ${chalk.yellow(custom.serverPort)}`;
    }
    
    if (custom.clientPort) {
      configText += `
    ${chalk.bold("🔌 Client Port:")}  ${chalk.yellow(custom.clientPort)}`;
    }
    
    if (custom.initGit) {
      configText += `
    ${chalk.bold("📦 Git:")}  ${chalk.green("Yes")}`;
    }
    
    if (custom.setupDocker) {
      configText += `
    ${chalk.bold("🐳 Docker:")}  ${chalk.green("Yes")}`;
    }

    if (custom.additionalFeatures && custom.additionalFeatures.length > 0) {
      configText += `
    ${chalk.bold("🚀 Features:")}  ${chalk.cyan(custom.additionalFeatures.join(", "))}`;
    }
  }

  configText += `
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
    mernSetup(projectPath, config, projectName, installDeps);
    copyTemplates(projectPath, config);
    if (installDeps) installDependencies(projectPath, config, projectName, false, [])
  }

  else if (config.stack === 'mevn') {
    mevnSetup(projectPath, config, projectName, installDeps)
    copyTemplates(projectPath, config)
    if (installDeps) installDependencies(projectPath, config, projectName, false, [])
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
    serverAuthSetup(projectPath, config, projectName, installDeps)
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
    try {
      HonoReactSetup(projectPath, config, projectName, installDeps);
      copyTemplates(projectPath, config);
      if (installDeps) installDependencies(projectPath, config, projectName, false);
    }
    catch {
      copyTemplates(projectPath, config);
    }
  }

  else if (config.stack === 'nextjs') {
    try {
      nextSetup(projectPath,config,projectName);
      copyTemplates(projectPath,config)
      logger.info("✅ Next.js project created successfully!");
    } catch (error) {
      logger.error("❌ Failed to set up Next.js");
      logger.error(error.message);
      throw error;
    }
  }

  // Apply customizations if enabled
  if (config.customization) {
    await applyCustomizations(projectPath, config);
  }

  // --- Success + Next Steps ---
  console.log(chalk.gray("-------------------------------------------"))
  console.log(`${chalk.greenBright(`✅ Project ${chalk.bold.yellow(`${projectName}`)} created successfully! 🎉`)}`);
  console.log(chalk.gray("-------------------------------------------"))
  console.log(chalk.cyan("👉 Next Steps:\n"));

  // Provide package-manager commands for dev/start
  const cmd = (script) => {
    switch (config.packageManager) {
      case "yarn":
        return `yarn ${script == "dev" ? "dev" : "node server.js"}`;
      case "pnpm":
        // pnpm supports both `pnpm run <script>` and `pnpm <script>`. Use run for clarity
        return script === "dev" ? "pnpm run dev" : "node server.js";
      case "bun":
        // use `bun run <script>` for consistency
        return `bun ${script == "dev" ? "run dev" : "server.js"}`;
      case "npm":
      default:
        return script === "dev" ? "npm run dev" : "npm start";
    }
  };

  if (config.stack === "mean" || config.stack === "mean+tailwind+auth") {
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

  console.log(chalk.gray("-------------------------------------------"))
  console.log(chalk.gray("\n✨ Made with ❤️  by Celtrix ✨\n"));
}
