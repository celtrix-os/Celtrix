import inquirer from "inquirer";
import chalk from "chalk";
import { askDatabaseSetup } from "./databaseSetup.js";

/**
 * Database engine options available for selection.
 */
const DATABASE_OPTIONS = [
  { label: "SQLite",    color: chalk.cyanBright,      desc: "Lightweight embedded database",    value: "sqlite"  },
  { label: "MySQL",     color: chalk.hex("#F29111"),   desc: "Popular relational database",      value: "mysql"   },
  { label: "PostgreSQL", color: chalk.blueBright,      desc: "Advanced open-source RDBMS",       value: "postgres" },
  { label: "MongoDB",   color: chalk.greenBright,      desc: "Document-oriented NoSQL database", value: "mongodb" },
  { label: "None",      color: chalk.gray,             desc: "No database",                      value: "none"    },
];

/**
 * Prompts the user to select a database, and if one is selected,
 * follows up with the provider/setup prompt.
 *
 * @param {string} [stepLabel] - Optional step label prefix, e.g. "[5/10]".
 * @returns {Promise<{ database: { type: string, provider: string } }>}
 */
export async function askDatabase(stepLabel = "") {
  const prefix = stepLabel ? `${stepLabel} ` : "";

  const { databaseType } = await inquirer.prompt([
    {
      type: "list",
      name: "databaseType",
      message: chalk.bold(`${prefix}Select a database:`),
      choices: DATABASE_OPTIONS.map((opt) => ({
        name:
          opt.color.bold(`${opt.value === "none" ? "◻" : "⚡"} ${opt.label}`) +
          chalk.gray(` → ${opt.desc}`),
        value: opt.value,
      })),
      pageSize: 10,
      default: "postgres",
    },
  ]);

  // If "none" is selected, skip the provider prompt
  if (databaseType === "none") {
    return { database: { type: "none", provider: "" } };
  }

  // Trigger the conditional setup prompt (Issue #214)
  const { provider } = await askDatabaseSetup(databaseType);

  return { database: { type: databaseType, provider } };
}
