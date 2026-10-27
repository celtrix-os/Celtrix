import inquirer from "inquirer";
import chalk from "chalk";
import { isBackNavigation } from "../common/navigation.js";
import { DATABASE_OPTIONS } from "../../utils/stackOptions.js";

/**
 * Prompts the user to select a database, and if one is selected,
 * follows up with the provider/setup prompt.
 *
 * @param {string} [stepLabel] - Optional step label prefix, e.g. "[5/7]".
 * @returns {Promise<{ database: { type: string, provider: string } }>}
 */
export async function askDatabaseType(stepLabel = "", { defaultValue = "postgres", canGoBack = false } = {}) {
  const prefix = stepLabel ? `${stepLabel} ` : "";

  const { databaseType } = await inquirer.prompt([
    {
      type: "celtrixList",
      name: "databaseType",
      message: chalk.bold(`${prefix}Select a database:`),
      choices: DATABASE_OPTIONS.map((opt) => ({
        name:
          opt.color.bold(`${opt.value === "none" ? "◻" : "⚡"} ${opt.label}`) +
          chalk.gray(` → ${opt.desc}`),
        value: opt.value,
      })),
      pageSize: 10,
      default: DATABASE_OPTIONS.some((opt) => opt.value === defaultValue) ? defaultValue : "postgres",
      canGoBack,
    },
  ]);

  if (isBackNavigation(databaseType)) return { back: true };
  return { databaseType };
}
