import inquirer from "inquirer";
import chalk from "chalk";
import gradient from "gradient-string";
import figlet from "figlet";
import ora from "ora";
import boxen from "boxen";
import fs from "fs";
import path from "path";
import { formatElapsed } from "./formatElapsed.js";
import { getStackMeta } from "../stable/getStackMeta.js";

export function showSummaryBox({ projectName, config, installedDeps, elapsed }) {
  const isCustom = config.stack === "custom";
  const { frontend, backend } = isCustom
    ? { frontend: config.frontend, backend: config.backend }
    : getStackMeta(config.stack);

  const lines = [
    `${chalk.bold("📦 Project:")}      ${chalk.greenBright(projectName)}`,
    `${chalk.bold("🌐 Stack:")}        ${chalk.cyanBright(isCustom ? "Custom" : config.stack)}`,
    `${chalk.bold("📖 Language:")}     ${chalk.yellow(config.language)}`,
    ...(frontend && frontend !== "none" ? [`${chalk.bold("🎨 Frontend:")}     ${chalk.blueBright(frontend)}`] : []),
    ...(backend && backend !== "none"   ? [`${chalk.bold("⚙️  Backend:")}      ${chalk.magentaBright(backend)}`] : []),
    `${chalk.bold("⚡ Runtime:")}      ${config.runtime === 'bun' ? chalk.white("Bun") : chalk.greenBright("Node.js")}`,
    `${chalk.bold("📦 Pkg Manager:")}  ${chalk.magenta(config.packageManager)}`,
  ];

  // Custom-stack expanded fields
  if (isCustom) {
    if (config.database && config.database.type !== "none") {
      lines.push(`${chalk.bold("🗄️  Database:")}     ${chalk.cyanBright(config.database.type)}${config.database.provider ? chalk.gray(" via ") + chalk.white(config.database.provider) : ""}`);
    }
    if (config.orm && config.orm !== "none") {
      lines.push(`${chalk.bold("🔗 ORM:")}           ${chalk.greenBright(config.orm)}`);
    }
  }

  lines.push(
    `${chalk.bold("📥 Deps:")}         ${installedDeps ? chalk.green("installed") : chalk.gray("skipped")}`,
    `${chalk.bold("⏱  Time:")}         ${chalk.white(formatElapsed(elapsed))}`,
  );

  console.log(
    boxen(lines.join("\n"), {
      padding: 1,
      margin: { top: 1, bottom: 1, left: 0, right: 0 },
      borderColor: "green",
      borderStyle: "round",
      title: chalk.greenBright.bold("✅ Project Created"),
      titleAlignment: "center",
    })
  );

  console.log(chalk.gray("✨ Made with ❤️  by Celtrix ✨\n"));
}