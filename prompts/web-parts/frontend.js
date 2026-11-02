import inquirer from "inquirer";
import chalk from "chalk";
import { isBackNavigation } from "../common/navigation.js";
import { FRONTEND_OPTIONS } from "../../utils/stackOptions.js";

/**
 * Prompts the user to select a frontend framework.
 *
 * @param {string} [stepLabel] - Optional step label prefix, e.g. "[2/7]".
 * @returns {Promise<{ frontend: string }>}
 */
export async function askFrontend(stepLabel = "", { defaultValue = "react-router", canGoBack = false } = {}) {
  const prefix = stepLabel ? `${stepLabel} ` : "";

  const { frontend } = await inquirer.prompt([
    {
      type: "celtrixList",
      name: "frontend",
      message: chalk.bold(`${prefix}Select a frontend framework:`),
      choices: FRONTEND_OPTIONS.map((opt) => ({
        name:
          opt.color.bold(`⚡ ${opt.label}`) +
          chalk.gray(` → ${opt.desc}`),
        value: opt.value,
      })),
      pageSize: 10,
      default: FRONTEND_OPTIONS.some((opt) => opt.value === defaultValue) ? defaultValue : "react-router",
      canGoBack,
    },
  ]);

  if (isBackNavigation(frontend)) return { back: true };
  return { frontend };
}
