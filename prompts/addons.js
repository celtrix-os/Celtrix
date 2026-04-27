import inquirer from "inquirer";
import chalk from "chalk";

/**
 * Add-on options grouped by category for the multi-select prompt.
 */
const ADDON_OPTIONS = [
  // — Tooling —
  new inquirer.Separator(chalk.gray.bold("  ── Tooling ──")),
  { label: "Biome",     color: chalk.cyanBright,     desc: "Fast formatter & linter",            value: "biome" },
  { label: "Husky",     color: chalk.yellowBright,   desc: "Git hooks made easy",                value: "husky" },

  // — Infrastructure —
  new inquirer.Separator(chalk.gray.bold("  ── Infrastructure ──")),
  { label: "Nx",        color: chalk.blueBright,     desc: "Monorepo build orchestration",       value: "nx"    },

  // — AI —
  new inquirer.Separator(chalk.gray.bold("  ── AI ──")),
  { label: "Vercel AI SDK", color: chalk.white,      desc: "Build AI-powered applications",     value: "vercel-ai-sdk" },
];

/**
 * Prompts the user to select optional add-ons via a multi-select (checkbox) prompt.
 * Options are grouped logically by category using separators.
 *
 * @param {string} [stepLabel] - Optional step label prefix, e.g. "[10/10]".
 * @returns {Promise<{ addons: string[] }>}
 */
export async function askAddons(stepLabel = "") {
  const prefix = stepLabel ? `${stepLabel} ` : "";

  const { addons } = await inquirer.prompt([
    {
      type: "checkbox",
      name: "addons",
      message: chalk.bold(`${prefix}Select add-ons ${chalk.dim("(space to toggle, enter to confirm)")}:`),
      choices: ADDON_OPTIONS.map((opt) => {
        // Pass through separator instances as-is
        if (opt instanceof inquirer.Separator) return opt;
        return {
          name:
            opt.color(`  ${opt.label}`) +
            chalk.gray(` → ${opt.desc}`),
          value: opt.value,
        };
      }),
      pageSize: 12,
    },
  ]);

  return { addons };
}
