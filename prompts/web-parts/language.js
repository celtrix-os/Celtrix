import inquirer from "inquirer";
import chalk from "chalk";
import { addBackChoice, BACK } from "../common/navigation.js";

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
export async function askLanguage(stepLabel = "", { defaultValue = "typescript", canGoBack = false } = {}) {
  const prefix = stepLabel ? `${stepLabel} ` : "";

  const { language } = await inquirer.prompt([
    {
      type: "list",
      name: "language",
      message: chalk.bold(`${prefix}Select a language:`),
      choices: addBackChoice(LANGUAGE_OPTIONS.map((opt) => ({
        name:
          opt.color.bold(`⚡ ${opt.label}`) +
          chalk.gray(` → ${opt.desc}`),
        value: opt.value,
      })), canGoBack),
      default: LANGUAGE_OPTIONS.some((opt) => opt.value === defaultValue) ? defaultValue : "typescript",
    },
  ]);

  if (language === BACK) return { back: true };
  return { language };
}
