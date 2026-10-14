import inquirer from "inquirer";
import chalk from "chalk";
import { addBackChoice, BACK } from "../common/navigation.js";

/**
 * Runtime environment options.
 */
const RUNTIME_OPTIONS = [
  { label: "Node.js", color: chalk.greenBright, desc: "The standard JavaScript runtime",        value: "node" },
  { label: "Bun",     color: chalk.white,       desc: "Fast all-in-one JS runtime & toolkit",   value: "bun"  },
];

/**
 * Prompts the user to select a runtime environment.
 *
 * @param {string} [stepLabel] - Optional step label prefix, e.g. "[4/10]".
 * @returns {Promise<{ runtime: string }>}
 */
export async function askRuntime(stepLabel = "", { defaultValue = "node", canGoBack = false } = {}) {
  const prefix = stepLabel ? `${stepLabel} ` : "";

  const { runtime } = await inquirer.prompt([
    {
      type: "list",
      name: "runtime",
      message: chalk.bold(`${prefix}Select a runtime environment:`),
      choices: addBackChoice(RUNTIME_OPTIONS.map((opt) => ({
        name:
          opt.color.bold(`⚡ ${opt.label}`) +
          chalk.gray(` → ${opt.desc}`),
        value: opt.value,
      })), canGoBack),
      default: RUNTIME_OPTIONS.some((opt) => opt.value === defaultValue) ? defaultValue : "node",
    },
  ]);

  if (runtime === BACK) return { back: true };
  return { runtime };
}
