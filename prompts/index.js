import inquirer from "inquirer";
import chalk from "chalk";
import boxen from "boxen";
import { askLanguage } from "./language.js";
import { askFrontend } from "./frontend.js";
import { askBackend } from "./backend.js";
import { askRuntime } from "./runtime.js";
import { askDatabase } from "./database.js";
import { askORM } from "./orm.js";
import { askAPI } from "./api.js";
import { askAuth } from "./auth.js";
import { askAddons } from "./addons.js";

const TOTAL_STEPS = 10;

/**
 * Builds a dim step label like "[3/10]" for prompt prefixes.
 *
 * @param {number} n - Current step.
 * @returns {string}
 */
function step(n) {
  return chalk.dim(`[${n}/${TOTAL_STEPS}]`);
}

/**
 * Renders a styled confirmation box showing all selections at a glance.
 *
 * @param {object} config - Gathered config object.
 */
function showConfirmationSummary(config) {
  const line = (icon, label, value, color = chalk.white) =>
    value && value !== "none"
      ? `${icon} ${chalk.bold(label + ":")}  ${color(value)}`
      : null;

  const lines = [
    line("📖", "Language", config.language, chalk.yellowBright),
    line("🎨", "Frontend", config.frontend, chalk.cyanBright),
    line("⚙️ ", "Backend", config.backend, chalk.magentaBright),
    line("⚡", "Runtime", config.runtime === "bun" ? "Bun" : "Node.js", chalk.greenBright),
  ];

  if (config.database.type !== "none") {
    const dbVal = config.database.provider
      ? `${config.database.type} ${chalk.gray("via")} ${config.database.provider}`
      : config.database.type;
    lines.push(`🗄️  ${chalk.bold("Database:")}  ${chalk.cyanBright(dbVal)}`);
  }

  lines.push(
    line("🔗", "ORM", config.orm, chalk.greenBright),
    line("🔌", "API", config.api, chalk.blueBright),
    line("🔐", "Auth", config.auth, chalk.magentaBright),
  );

  if (config.addons.length > 0) {
    lines.push(`🧩 ${chalk.bold("Add-ons:")}  ${chalk.yellow(config.addons.join(", "))}`);
  }

  console.log(
    boxen(lines.filter(Boolean).join("\n"), {
      padding: 1,
      margin: { top: 1, bottom: 0, left: 0, right: 0 },
      borderColor: "cyan",
      borderStyle: "round",
      title: chalk.cyanBright.bold("📋 Your Custom Stack"),
      titleAlignment: "center",
    })
  );
}

/**
 * Orchestrates all custom-stack prompts in the correct order, applying
 * conditional logic (e.g. skip ORM when no DB, skip API type when no backend).
 *
 * Features step numbering, a language prompt, and a confirmation gate.
 *
 * @returns {Promise<{
 *   language: string,
 *   frontend: string,
 *   backend: string,
 *   runtime: string,
 *   database: { type: string, provider: string },
 *   orm: string,
 *   api: string,
 *   auth: string,
 *   addons: string[]
 * }>}
 */
export async function gatherCustomConfig() {
  // This outer loop allows the user to re-do selections if they reject
  // the confirmation prompt.
  while (true) {
    // 1. Language
    const { language } = await askLanguage(step(1));

    // 2. Frontend
    const { frontend } = await askFrontend(step(2));

    // 3. Backend
    const { backend } = await askBackend(step(3));
    if (backend === "none") {
      console.log(chalk.yellow("   ⚠️  No backend selected — this will be a frontend-only project."));
    }

    // 4. Runtime
    const { runtime } = await askRuntime(step(4));

    // 5. Database (includes conditional provider/setup prompt)
    const { database } = await askDatabase(step(5));

    // 6. ORM — skip when no database is selected
    let orm = "none";
    if (database.type !== "none") {
      const ormResult = await askORM(step(6));
      orm = ormResult.orm;
    } else {
      console.log(chalk.gray(`   ${step(6)} ORM selection skipped ${chalk.dim("(no database)")}`));
    }

    // 7. API type — skip when no backend is selected
    let api = "none";
    if (backend !== "none") {
      const apiResult = await askAPI(step(7));
      api = apiResult.api;
    } else {
      console.log(chalk.gray(`   ${step(7)} API type selection skipped ${chalk.dim("(no backend)")}`));
    }

    // 8. Auth provider
    const { auth } = await askAuth(step(8));

    // 9. Add-ons (multi-select)
    const { addons } = await askAddons(step(9));

    const config = { language, frontend, backend, runtime, database, orm, api, auth, addons };

    // 10. Confirmation
    showConfirmationSummary(config);

    const { confirmed } = await inquirer.prompt([
      {
        type: "confirm",
        name: "confirmed",
        message: chalk.bold(`${step(10)} Proceed with this configuration?`),
        default: true,
      },
    ]);

    if (confirmed) {
      return config;
    }

    // User rejected — loop back and re-do selections
    console.log(chalk.yellow("\n🔄 Let's try again!\n"));
  }
}
