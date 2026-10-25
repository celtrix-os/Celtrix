import inquirer from "inquirer";
import chalk from "chalk";
import boxen from "boxen";
import { askLanguage } from "./web-parts/language.js";
import { askFrontend } from "./web-parts/frontend.js";
import { askBackend } from "./web-parts/backend.js";
import { askRuntime } from "./web-parts/runtime.js";
import { askDatabaseType } from "./web-parts/database.js";
import { askDatabaseSetup } from "./web-parts/databaseSetup.js";
import { askORM } from "./web-parts/orm.js";
import { eraseOutputTo, isBackNavigation, logLine, outputMark } from "./common/navigation.js";
import { getCompatibleORMs, getCompatibleProviders } from "./web-parts/compatibility.js";

const TOTAL_STEPS = 7;

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

  lines.push(line("🔗", "ORM", config.orm, chalk.greenBright));

  logLine(
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
 * conditional logic (e.g. skip the database steps when there is no backend).
 *
 * Features step numbering, a language prompt, and a confirmation gate.
 *
 * @returns {Promise<{
 *   language: string,
 *   frontend: string,
 *   backend: string,
 *   runtime: string,
 *   database: { type: string, provider: string },
 *   orm: string
 * }>}
 */
export async function gatherCustomConfig() {
  const createInitialConfig = () => ({
    language: "typescript",
    frontend: "react-router",
    backend: "hono",
    runtime: "node",
    database: { type: "postgres", provider: "supabase" },
    orm: "prisma",
  });

  function nextAfterDatabase(config) {
    if (config.database.type === "none") {
      config.orm = "none";
      logLine(chalk.gray(`   ${step(6)} ORM selection skipped ${chalk.dim("(no database)")}`));
      return "confirmation";
    }

    return "orm";
  }

  let config = createInitialConfig();
  // Each entry remembers the output mark taken before its question was shown,
  // so going back erases that answer and everything printed after it.
  const history = [];
  let currentStep = "language";

  function goBack(stepMark) {
    if (history.length === 0) {
      eraseOutputTo(stepMark);
      return;
    }
    const previous = history.pop();
    eraseOutputTo(previous.mark);
    currentStep = previous.step;
  }

  while (true) {
    const canGoBack = history.length > 0;
    const stepMark = outputMark();
    let answer;

    switch (currentStep) {
      case "language":
        answer = await askLanguage(step(1), { defaultValue: config.language, canGoBack });
        if (!answer.back) config.language = answer.language;
        break;
      case "frontend":
        answer = await askFrontend(step(2), { defaultValue: config.frontend, canGoBack });
        if (!answer.back) config.frontend = answer.frontend;
        break;
      case "backend":
        answer = await askBackend(step(3), { defaultValue: config.backend, canGoBack });
        if (!answer.back) {
          config.backend = answer.backend;
          if (answer.backend === "none") {
            config.database = { type: "none", provider: "" };
            config.orm = "none";
            logLine(chalk.yellow("   ⚠️  No backend selected — this will be a frontend-only project."));
          }
        }
        break;
      case "runtime":
        answer = await askRuntime(step(4), { defaultValue: config.runtime, canGoBack });
        if (!answer.back) config.runtime = answer.runtime;
        break;
      case "database":
        answer = await askDatabaseType(step(5), {
          defaultValue: config.database.type,
          canGoBack,
        });
        if (!answer.back) {
          config.database = {
            type: answer.databaseType,
            provider: answer.databaseType === config.database.type ? config.database.provider : "",
          };
        }
        break;
      case "databaseSetup":
        answer = await askDatabaseSetup(config.database.type, {
          defaultValue: config.database.provider,
          canGoBack,
        });
        if (!answer.back) config.database.provider = answer.provider;
        break;
      case "orm": {
        const allowedORMs = getCompatibleORMs(config.database.type);
        answer = await askORM(step(6), allowedORMs, {
          defaultValue: config.orm,
          canGoBack,
        });
        if (!answer.back) config.orm = answer.orm;
        break;
      }
      case "confirmation": {
        showConfirmationSummary(config);
        const { action } = await inquirer.prompt([
          {
            type: "celtrixList",
            name: "action",
            message: chalk.bold(`${step(7)} Proceed with this configuration?`),
            choices: [
              { name: "Continue", value: "continue" },
              { name: "Start over", value: "restart" },
            ],
            default: "continue",
            canGoBack,
          },
        ]);

        if (isBackNavigation(action)) {
          goBack(stepMark);
          continue;
        }
        if (action === "restart") {
          logLine(chalk.yellow("\n🔄 Let's try again!\n"));
          config = createInitialConfig();
          history.length = 0;
          currentStep = "language";
          continue;
        }
        return config;
      }
      default:
        throw new Error(`Unknown wizard step: ${currentStep}`);
    }

    if (answer.back) {
      goBack(stepMark);
      continue;
    }

    let nextStep;
    switch (currentStep) {
      case "language":
        nextStep = "frontend";
        break;
      case "frontend":
        nextStep = "backend";
        break;
      case "backend":
        nextStep = "runtime";
        break;
      case "runtime":
        if (config.backend === "none") {
          config.database = { type: "none", provider: "" };
          config.orm = "none";
          const reason = "(Frontend-only projects do not require a backend database)";
          logLine(chalk.gray(`   ${step(5)} Database selection skipped ${chalk.dim(reason)}`));
          logLine(chalk.gray(`   ${step(6)} ORM selection skipped ${chalk.dim("(no database)")}`));
          nextStep = "confirmation";
        } else {
          nextStep = "database";
        }
        break;
      case "database": {
        const providers = getCompatibleProviders(config.database.type);
        if (config.database.type === "none") {
          nextStep = nextAfterDatabase(config);
        } else if (providers.length === 1) {
          // Nothing to choose, so don't show a single-option provider question
          config.database.provider = providers[0];
          nextStep = nextAfterDatabase(config);
        } else {
          nextStep = "databaseSetup";
        }
        break;
      }
      case "databaseSetup":
        nextStep = nextAfterDatabase(config);
        break;
      case "orm":
        nextStep = "confirmation";
        break;
    }

    history.push({ step: currentStep, mark: stepMark });
    currentStep = nextStep;
  }
}
