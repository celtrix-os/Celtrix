import inquirer from "inquirer";
import chalk from "chalk";
import gradient from "gradient-string";
import figlet from "figlet";
import ora from "ora";
import boxen from "boxen";
import fs from "fs";
import path from "path";
import { LANGUAGE_OPTIONS } from "../../utils/stackOptions.js";

const orange = chalk.hex("#FF6200");

export async function askStackQuestions() {
  const stackAnswer = await inquirer.prompt([
    {
      type: "list",
      name: "stack",
      message: "Choose your stack:",
      choices: [
        {
          name:
            gradient.pastel.multiline("⚡ Custom Stack") +
            chalk.gray(" → Pick every piece of your stack"),
          value: "custom",
        },
        new inquirer.Separator(chalk.gray("  ── Preset Stacks ──")),
        {
          name:
            chalk.blueBright.bold("⚡ MERN") +
            chalk.gray(" → MongoDB + Express + React + Node.js"),
          value: "mern",
        },
        {
          name:
            chalk.redBright.bold("⚡ MEAN") +
            chalk.gray(" → MongoDB + Express + Angular + Node.js"),
          value: "mean",
        },
        {
          name:
            chalk.cyanBright.bold("⚡ MEVN") +
            chalk.gray(" → MongoDB + Express + Vue + Node.js"),
          value: "mevn",
        },
        {
          name:
            chalk.greenBright.bold("⚡ MERN + Tailwind + Auth") +
            chalk.gray(" → full-stack with styling & auth"),
          value: "mern+tailwind+auth",
        },
        {
          name:
            chalk.magentaBright.bold("⚡ MEAN + Tailwind + Auth") +
            chalk.gray(" → Angular setup with extras"),
          value: "mean+tailwind+auth",
        },
        {
          name:
            chalk.yellowBright.bold("⚡ MEVN + Tailwind + Auth") +
            chalk.gray(" → Vue stack with auth ready"),
          value: "mevn+tailwind+auth",
        },
        {
          name:
            orange.bold("⚡ React + Tailwind + Firebase") +
            chalk.gray(" → fast way to build apps"),
          value: "react+tailwind+firebase",
        },
        {
          name:
            chalk.whiteBright.bold("⚡ Next.js") +
            chalk.gray(" → vanilla modern stack"),
          value: "nextjs",
        },
        {
          name:
            chalk.magentaBright.bold("⚡ Hono") +
            chalk.gray(" → Hono + Prisma + React"),
          value: "hono",
        },
      ],
      pageSize: 12,
      default: "custom",
    },
  ]);

  // Skip language prompt for custom stack — it has its own language step.
  if (stackAnswer.stack === "custom") {
    return stackAnswer;
  }

  const langAnswer = await inquirer.prompt([
    {
      type: "list",
      name: "language",
      message: "Choose your language:",
      choices: LANGUAGE_OPTIONS.map((opt) => ({ name: opt.color.bold(opt.label), value: opt.value })),
      pageSize: 10,
      default: "typescript",
    },
  ]);

  return { ...stackAnswer, ...langAnswer };
}