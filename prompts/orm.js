import inquirer from "inquirer";
import chalk from "chalk";

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
 * @returns {Promise<{ orm: string }>}
 */
export async function askORM(stepLabel = "") {
  const prefix = stepLabel ? `${stepLabel} ` : "";

  const { orm } = await inquirer.prompt([
    {
      type: "list",
      name: "orm",
      message: chalk.bold(`${prefix}Select an ORM:`),
      choices: ORM_OPTIONS.map((opt) => ({
        name:
          opt.color.bold(`${opt.value === "none" ? "◻" : "⚡"} ${opt.label}`) +
          chalk.gray(` → ${opt.desc}`),
        value: opt.value,
      })),
      default: "drizzle",
    },
  ]);

  return { orm };
}
