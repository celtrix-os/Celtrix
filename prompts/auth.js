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
 * @returns {Promise<{ auth: string }>}
 */
export async function askAuth(stepLabel = "") {
  const prefix = stepLabel ? `${stepLabel} ` : "";

  const { auth } = await inquirer.prompt([
    {
      type: "list",
      name: "auth",
      message: chalk.bold(`${prefix}Select an auth provider:`),
      choices: AUTH_OPTIONS.map((opt) => ({
        name:
          opt.color.bold(`${opt.value === "none" ? "◻" : "⚡"} ${opt.label}`) +
          chalk.gray(` → ${opt.desc}`),
        value: opt.value,
      })),
      default: "better-auth",
    },
  ]);

  return { auth };
}
