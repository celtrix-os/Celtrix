import inquirer from "inquirer";
import chalk from "chalk";
import { addBackChoice, BACK } from "../common/navigation.js";

/**
 * ORM options available for selection.
 */
const ORM_OPTIONS = [
  { label: "Drizzle", color: chalk.greenBright,    desc: "Type-safe SQL-first ORM",             value: "drizzle" },
  { label: "Prisma",  color: chalk.magentaBright,  desc: "Next-gen Node.js & TypeScript ORM",   value: "prisma"  },
  { label: "None",    color: chalk.gray,            desc: "No ORM",                              value: "none"    },
];

/**
 * Prompts the user to select an ORM.
 * Should be skipped when the database selection is "none".
 *
 * @param {string} [stepLabel] - Optional step label prefix, e.g. "[6/10]".
 * @param {string[]} [allowedORMs] - List of compatible ORMs for this selection.
 * @returns {Promise<{ orm: string }>}
 */
export async function askORM(stepLabel = "", allowedORMs = ["drizzle", "prisma", "none"], { defaultValue, canGoBack = false } = {}) {
  const prefix = stepLabel ? `${stepLabel} ` : "";

  const filteredOptions = ORM_OPTIONS.filter((opt) => allowedORMs.includes(opt.value));

  const { orm } = await inquirer.prompt([
    {
      type: "list",
      name: "orm",
      message: chalk.bold(`${prefix}Select an ORM:`),
      choices: addBackChoice(filteredOptions.map((opt) => ({
        name:
          opt.color.bold(`${opt.value === "none" ? "◻" : "⚡"} ${opt.label}`) +
          chalk.gray(` → ${opt.desc}`),
        value: opt.value,
      })), canGoBack),
      default: filteredOptions.some((opt) => opt.value === defaultValue)
        ? defaultValue
        : filteredOptions[0]?.value || "drizzle",
    },
  ]);

  if (orm === BACK) return { back: true };
  return { orm };
}
