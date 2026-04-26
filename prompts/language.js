import inquirer from "inquirer";
import chalk from "chalk";

/**
 * Language options for the project.
 */
const LANGUAGE_OPTIONS = [
  { label: "TypeScript", color: chalk.blueBright, desc: "Type-safe JavaScript superset", value: "typescript" },
  { label: "JavaScript", color: chalk.yellowBright, desc: "Classic dynamic scripting",     value: "javascript" },
];

/**
 * Prompts the user to select a programming language.
 *
 * @param {string} [stepLabel] - Optional step label prefix, e.g. "[1/9]".
 * @returns {Promise<{ language: string }>}
 */
export async function askLanguage(stepLabel = "") {
  const prefix = stepLabel ? `${stepLabel} ` : "";

  const { language } = await inquirer.prompt([
    {
      type: "list",
      name: "language",
      message: chalk.bold(`${prefix}Select a language:`),
      choices: LANGUAGE_OPTIONS.map((opt) => ({
        name:
          opt.color.bold(`⚡ ${opt.label}`) +
          chalk.gray(` → ${opt.desc}`),
        value: opt.value,
      })),
      default: "typescript",
    },
  ]);

  return { language };
}
