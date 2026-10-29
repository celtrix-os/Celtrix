import inquirer from "inquirer";
import chalk from "chalk";
import gradient from "gradient-string";
import { LANGUAGE_OPTIONS } from "../../utils/stackOptions.js";
import { eraseOutputTo, isBackNavigation, outputMark } from "../common/navigation.js";

const orange = chalk.hex("#FF6200");

export async function askStackQuestions() {
  let step = "category";
  let stack = "custom";
  let language = "typescript";
  const history = [];

  while (true) {
    const stepMark = outputMark();

    if (step === "category") {
      const { category } = await inquirer.prompt([
        {
          type: "celtrixList",
          name: "category",
          message: chalk.bold("Step 1 – How do you want to start?"),
          choices: [
            new inquirer.Separator(chalk.gray("  ── Build your own stack ──")),
            {
              name:
                gradient.pastel.multiline("⚡ Custom Stack") +
                chalk.gray(" → pick every piece yourself"),
              value: "custom",
            },
            new inquirer.Separator(chalk.gray("  ── Ready-made ──")),
            {
              name:
                chalk.cyanBright.bold("⚡ Preset Stacks") +
                chalk.gray(" → use a pre-configured stack"),
              value: "presets",
            },
          ],
          default: stack === "custom" ? "custom" : "presets",
          canGoBack: false,
        },
      ]);

      if (category === "custom") {
        return { stack: "custom" };
      }

      history.push({ step: "category", mark: stepMark });
      step = "presets";
    } else if (step === "presets") {
      const { preset } = await inquirer.prompt([
        {
          type: "celtrixList",
          name: "preset",
          message: chalk.bold("Step 2 – Choose a preset stack"),
          choices: [
            new inquirer.Separator(chalk.gray("  ── Classic MERN family ──")),
            {
              name:
                chalk.blueBright.bold("⚡ MERN") +
                chalk.gray(" → MongoDB • Express • React • Node"),
              value: "mern",
            },
            {
              name:
                chalk.redBright.bold("⚡ MEAN") +
                chalk.gray(" → MongoDB • Express • Angular • Node"),
              value: "mean",
            },
            {
              name:
                chalk.cyanBright.bold("⚡ MEVN") +
                chalk.gray(" → MongoDB • Express • Vue • Node"),
              value: "mevn",
            },
            new inquirer.Separator(chalk.gray("  ── Classic + Tailwind + Auth ──")),
            {
              name:
                chalk.greenBright.bold("⚡ MERN + Tailwind + Auth") +
                chalk.gray(" → React stack with styling & auth"),
              value: "mern+tailwind+auth",
            },
            {
              name:
                chalk.magentaBright.bold("⚡ MEAN + Tailwind + Auth") +
                chalk.gray(" → Angular stack with styling & auth"),
              value: "mean+tailwind+auth",
            },
            {
              name:
                chalk.yellowBright.bold("⚡ MEVN + Tailwind + Auth") +
                chalk.gray(" → Vue stack with styling & auth"),
              value: "mevn+tailwind+auth",
            },
            new inquirer.Separator(chalk.gray("  ── Frontend / Edge ──")),
            {
              name:
                orange.bold("⚡ React + Tailwind + Firebase") +
                chalk.gray(" → Serverless app, no backend"),
              value: "react+tailwind+firebase",
            },
            {
              name:
                chalk.whiteBright.bold("⚡ Next.js") +
                chalk.gray(" → Modern full-stack React, no backend"),
              value: "nextjs",
            },
            {
              name:
                chalk.magentaBright.bold("⚡ Hono") +
                chalk.gray(" → Hono + Prisma + React"),
              value: "hono",
            },
          ],
          default: stack !== "custom" ? stack : "mern",
          canGoBack: true,
          backHint: chalk.dim("  ⌫ Press Backspace to change the stack selection"),
        },
      ]);

      if (isBackNavigation(preset)) {
        const prev = history.pop();
        eraseOutputTo(prev.mark);
        step = prev.step;
        continue;
      }

      stack = preset;
      history.push({ step: "presets", mark: stepMark });
      step = "language";
    } else if (step === "language") {
      const { lang } = await inquirer.prompt([
        {
          type: "celtrixList",
          name: "lang",
          message: chalk.bold("Select a language:"),
          choices: LANGUAGE_OPTIONS.map((opt) => ({
            name:
              opt.color.bold(`⚡ ${opt.label}`) +
              chalk.gray(` → ${opt.desc}`),
            value: opt.value,
          })),
          default: language,
          canGoBack: true,
          backHint: chalk.dim("  ⌫ Press Backspace to change the stack selection"),
        },
      ]);

      if (isBackNavigation(lang)) {
        const prev = history.pop();
        eraseOutputTo(prev.mark);
        step = prev.step;
        continue;
      }

      return { stack, language: lang };
    }
  }
}