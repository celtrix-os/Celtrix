import inquirer from "inquirer";
import chalk from "chalk";

/**
 * Frontend framework options available for selection.
 * Each entry defines its display label, chalk color, description, and config value.
 */
const FRONTEND_OPTIONS = [
  { label: "React Router",  color: chalk.cyanBright,      desc: "React with file-based routing",        value: "react-router" },
  { label: "Next.js",       color: chalk.white,            desc: "Full-stack React framework",            value: "nextjs"       },
  { label: "Nuxt",          color: chalk.greenBright,      desc: "Full-stack Vue framework",              value: "nuxt"         },
  { label: "TanStack",      color: chalk.hex("#FF6200"),   desc: "Type-safe routing & data fetching",     value: "tanstack"     },
  { label: "Astro",         color: chalk.magentaBright,    desc: "Content-focused, island architecture",  value: "astro"        },
  { label: "SvelteKit",     color: chalk.redBright,        desc: "Cybernetically enhanced web apps",      value: "svelte"       },
  { label: "SolidStart",    color: chalk.blueBright,       desc: "Fine-grained reactive UI framework",    value: "solid"        },
];

/**
 * Prompts the user to select a frontend framework.
 *
 * @param {string} [stepLabel] - Optional step label prefix, e.g. "[2/10]".
 * @returns {Promise<{ frontend: string }>}
 */
export async function askFrontend(stepLabel = "") {
  const prefix = stepLabel ? `${stepLabel} ` : "";

  const { frontend } = await inquirer.prompt([
    {
      type: "list",
      name: "frontend",
      message: chalk.bold(`${prefix}Select a frontend framework:`),
      choices: FRONTEND_OPTIONS.map((opt) => ({
        name:
          opt.color.bold(`⚡ ${opt.label}`) +
          chalk.gray(` → ${opt.desc}`),
        value: opt.value,
      })),
      pageSize: 10,
      default: "react-router",
    },
  ]);

  return { frontend };
}
