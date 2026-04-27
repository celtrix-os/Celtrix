import inquirer from "inquirer";
import chalk from "chalk";

/**
 * Backend framework options available for selection.
 */
const BACKEND_OPTIONS = [
  { label: "Hono",     color: chalk.hex("#FF6200"),   desc: "Ultrafast edge-ready web framework",     value: "hono"    },
  { label: "Fastify",  color: chalk.white,            desc: "Fast & low-overhead Node.js framework",  value: "fastify" },
  { label: "Express",  color: chalk.yellowBright,     desc: "Minimalist Node.js web framework",       value: "express" },
  { label: "Convex",   color: chalk.magentaBright,    desc: "Reactive backend-as-a-service",          value: "convex"  },
  { label: "None",     color: chalk.gray,             desc: "Frontend only, no backend",              value: "none"    },
];

/**
 * Prompts the user to select a backend framework.
 * The "none" option is handled gracefully — it returns { backend: "none" }.
 *
 * @param {string} [stepLabel] - Optional step label prefix, e.g. "[3/10]".
 * @returns {Promise<{ backend: string }>}
 */
export async function askBackend(stepLabel = "") {
  const prefix = stepLabel ? `${stepLabel} ` : "";

  const { backend } = await inquirer.prompt([
    {
      type: "list",
      name: "backend",
      message: chalk.bold(`${prefix}Select a backend framework:`),
      choices: BACKEND_OPTIONS.map((opt) => ({
        name:
          opt.color.bold(`${opt.value === "none" ? "◻" : "⚡"} ${opt.label}`) +
          chalk.gray(` → ${opt.desc}`),
        value: opt.value,
      })),
      pageSize: 10,
      default: "hono",
    },
  ]);

  return { backend };
}
