import inquirer from "inquirer";
import chalk from "chalk";

/**
 * Authentication provider options.
 */
const AUTH_OPTIONS = [
  { label: "Clerk",       color: chalk.magentaBright,  desc: "Drop-in auth with prebuilt UI",       value: "clerk"       },
  { label: "Better Auth", color: chalk.cyanBright,     desc: "Framework-agnostic TS auth library",  value: "better-auth" },
  { label: "None",        color: chalk.gray,            desc: "No auth provider",                    value: "none"        },
];

/**
 * Prompts the user to select an authentication provider.
 *
 * @param {string} [stepLabel] - Optional step label prefix, e.g. "[8/10]".
 * @param {string[]} [allowedAuths] - List of compatible auth options.
 * @returns {Promise<{ auth: string }>}
 */
export async function askAuth(stepLabel = "", allowedAuths = ["clerk", "better-auth", "none"]) {
  const prefix = stepLabel ? `${stepLabel} ` : "";

  const filteredOptions = AUTH_OPTIONS.filter((opt) => allowedAuths.includes(opt.value));

  const { auth } = await inquirer.prompt([
    {
      type: "list",
      name: "auth",
      message: chalk.bold(`${prefix}Select an auth provider:`),
      choices: filteredOptions.map((opt) => ({
        name:
          opt.color.bold(`${opt.value === "none" ? "◻" : "⚡"} ${opt.label}`) +
          chalk.gray(` → ${opt.desc}`),
        value: opt.value,
      })),
      default: allowedAuths.includes("better-auth") ? "better-auth" : filteredOptions[0]?.value,
    },
  ]);

  return { auth };
}
