import inquirer from "inquirer";
import chalk from "chalk";
import { isBackNavigation } from "../common/navigation.js";
import { BACKEND_OPTIONS } from "../../utils/stackOptions.js";

/**
 * Prompts the user to select a backend framework.
 * The "none" option is handled gracefully — it returns { backend: "none" }.
 *
 * @param {string} [stepLabel] - Optional step label prefix, e.g. "[3/7]".
 * @param {object} [options]
 * @param {boolean} [options.allowNone] - False when a database was already chosen, which needs a backend.
 * @returns {Promise<{ backend: string }>}
 */
export async function askBackend(stepLabel = "", { defaultValue = "hono", canGoBack = false, allowNone = true } = {}) {
  const prefix = stepLabel ? `${stepLabel} ` : "";
  const options = BACKEND_OPTIONS.filter((opt) => allowNone || opt.value !== "none");

  const { backend } = await inquirer.prompt([
    {
      type: "celtrixList",
      name: "backend",
      message: chalk.bold(`${prefix}Select a backend framework:`),
      choices: options.map((opt) => ({
        name:
          opt.color.bold(`${opt.value === "none" ? "◻" : "⚡"} ${opt.label}`) +
          chalk.gray(` → ${opt.desc}`),
        value: opt.value,
      })),
      pageSize: 10,
      default: options.some((opt) => opt.value === defaultValue) ? defaultValue : "hono",
      canGoBack,
    },
  ]);

  if (isBackNavigation(backend)) return { back: true };
  return { backend };
}
