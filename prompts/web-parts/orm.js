import inquirer from "inquirer";
import chalk from "chalk";
import { isBackNavigation } from "../common/navigation.js";
import { ORM_OPTIONS } from "../../utils/stackOptions.js";

/**
 * Prompts the user to select an ORM.
 * Should be skipped when the database selection is "none".
 *
 * @param {string} [stepLabel] - Optional step label prefix, e.g. "[6/7]".
 * @param {string[]} [allowedORMs] - List of compatible ORMs for this selection.
 * @returns {Promise<{ orm: string }>}
 */
export async function askORM(stepLabel = "", allowedORMs = ORM_OPTIONS.map((opt) => opt.value), { defaultValue, canGoBack = false } = {}) {
  const prefix = stepLabel ? `${stepLabel} ` : "";

  const filteredOptions = ORM_OPTIONS.filter((opt) => allowedORMs.includes(opt.value));

  const { orm } = await inquirer.prompt([
    {
      type: "celtrixList",
      name: "orm",
      message: chalk.bold(`${prefix}Select an ORM:`),
      choices: filteredOptions.map((opt) => ({
        name:
          opt.color.bold(`${opt.value === "none" ? "◻" : "⚡"} ${opt.label}`) +
          chalk.gray(` → ${opt.desc}`),
        value: opt.value,
      })),
      default: filteredOptions.some((opt) => opt.value === defaultValue)
        ? defaultValue
        : filteredOptions[0]?.value || "prisma",
      canGoBack,
    },
  ]);

  if (isBackNavigation(orm)) return { back: true };
  return { orm };
}
