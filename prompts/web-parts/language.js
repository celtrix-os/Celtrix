import inquirer from "inquirer";
import chalk from "chalk";
import { isBackNavigation } from "../common/navigation.js";

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
 * @param {string} [stepLabel] - Optional step label prefix, e.g. "[1/7]".
 * @returns {Promise<{ language: string }>}
 */
export async function askLanguage(stepLabel = "", { defaultValue = "typescript", canGoBack = false } = {}) {
  const prefix = stepLabel ? `${stepLabel} ` : "";

  const { language } = await inquirer.prompt([
    {
      type: "celtrixList",
      name: "language",
      message: chalk.bold(`${prefix}Select a language:`),
      choices: LANGUAGE_OPTIONS.map((opt) => ({
        name:
          opt.color.bold(`⚡ ${opt.label}`) +
          chalk.gray(` → ${opt.desc}`),
        value: opt.value,
      })),
      default: LANGUAGE_OPTIONS.some((opt) => opt.value === defaultValue) ? defaultValue : "typescript",
      canGoBack,
    },
  ]);

  if (isBackNavigation(language)) return { back: true };
  return { language };
}
