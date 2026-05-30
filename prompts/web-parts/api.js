import inquirer from "inquirer";
import chalk from "chalk";

/**
 * API type options available for selection.
 */
const API_OPTIONS = [
  { label: "tRPC", color: chalk.blueBright,     desc: "End-to-end type-safe APIs",        value: "trpc" },
  { label: "oRPC", color: chalk.cyanBright,     desc: "Type-safe APIs with OpenAPI",       value: "orpc" },
  { label: "None", color: chalk.gray,            desc: "REST / manual API setup",           value: "none" },
];

/**
 * Prompts the user to select an API type.
 * Should be skipped when the backend selection is "none".
 *
 * @param {string} [stepLabel] - Optional step label prefix, e.g. "[7/10]".
 * @param {string[]} [allowedAPIs] - List of compatible API options.
 * @returns {Promise<{ api: string }>}
 */
export async function askAPI(stepLabel = "", allowedAPIs = ["trpc", "orpc", "none"]) {
  const prefix = stepLabel ? `${stepLabel} ` : "";

  const filteredOptions = API_OPTIONS.filter((opt) => allowedAPIs.includes(opt.value));

  const { api } = await inquirer.prompt([
    {
      type: "list",
      name: "api",
      message: chalk.bold(`${prefix}Select an API type:`),
      choices: filteredOptions.map((opt) => ({
        name:
          opt.color.bold(`${opt.value === "none" ? "◻" : "⚡"} ${opt.label}`) +
          chalk.gray(` → ${opt.desc}`),
        value: opt.value,
      })),
      default: filteredOptions[0]?.value || "trpc",
    },
  ]);

  return { api };
}
