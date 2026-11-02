import inquirer from "inquirer";
import chalk from "chalk";
import { isBackNavigation } from "../common/navigation.js";
import { DATABASE_PROVIDER_OPTIONS } from "../../utils/stackOptions.js";

/**
 * Prompts for database setup/provider based on the selected database type.
 * Only called when the user has selected a database (not "none").
 *
 * @param {string} databaseType - The chosen database type (sqlite, postgres, etc.).
 * @returns {Promise<{ provider: string }>}
 */
export async function askDatabaseSetup(databaseType, { defaultValue, canGoBack = false } = {}) {
  const options = DATABASE_PROVIDER_OPTIONS[databaseType];

  // If no setup options exist for this DB type, default to "local"
  if (!options || options.length === 0) {
    return { provider: "local" };
  }

  const { provider } = await inquirer.prompt([
    {
      type: "celtrixList",
      name: "provider",
      message: chalk.bold(`Select a ${chalk.cyanBright(databaseType)} provider:`),
      choices: options.map((opt) => ({
        name:
          opt.color.bold(`⚡ ${opt.label}`) +
          chalk.gray(` → ${opt.desc}`),
        value: opt.value,
      })),
      default: options.some((opt) => opt.value === defaultValue) ? defaultValue : options[0].value,
      canGoBack,
    },
  ]);

  if (isBackNavigation(provider)) return { back: true };
  return { provider };
}
