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
import { STACK_DEFAULTS, getCompatibleORMs, getCompatibleProviders } from "../utils/stackOptions.js";

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
 * Steps whose value is already in `fixed` (from command-line flags) are not
 * asked; the confirmation gate is shown only if at least one question was.
 *
 * @param {{
 *   language?: string, frontend?: string, backend?: string, runtime?: string,
 *   databaseType?: string, databaseProvider?: string, orm?: string
 * }} [fixed] - Values chosen up front, already validated.
 * @returns {Promise<{
 *   language: string,
 *   frontend: string,
 *   backend: string,
 *   runtime: string,
 *   database: { type: string, provider: string },
 *   orm: string
 * }>}
 */
export async function gatherCustomConfig(fixed = {}) {
  const createInitialConfig = () => ({
    language: fixed.language ?? STACK_DEFAULTS.language,
    frontend: fixed.frontend ?? STACK_DEFAULTS.frontend,
    backend: fixed.backend ?? STACK_DEFAULTS.backend,
    runtime: fixed.runtime ?? STACK_DEFAULTS.runtime,
    database: fixed.databaseType
      ? { type: fixed.databaseType, provider: fixed.databaseProvider ?? "" }
      : { ...STACK_DEFAULTS.database },
    orm: fixed.orm ?? STACK_DEFAULTS.orm,
  });

  // A step is skipped when its value was given up front
  const fixedAnswers = {
    language: fixed.language && { language: fixed.language },
    frontend: fixed.frontend && { frontend: fixed.frontend },
    backend: fixed.backend && { backend: fixed.backend },
    runtime: fixed.runtime && { runtime: fixed.runtime },
    database: fixed.databaseType && { databaseType: fixed.databaseType },
    databaseSetup: fixed.databaseProvider && { provider: fixed.databaseProvider },
    orm: fixed.orm && { orm: fixed.orm },
  };

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
    const canGoBack = true;
    const stepMark = outputMark();
    const preset = fixedAnswers[currentStep];
    let answer;

    switch (currentStep) {
      case "language":
        answer = preset || await askLanguage(step(1), {
          defaultValue: config.language,
          canGoBack,
          backHint: chalk.dim("  ⌫ Press Backspace to change the stack selection"),
        });
        if (isBackNavigation(answer)) return { back: true };
        if (!answer.back) config.language = answer.language;
        break;
      case "frontend":
        answer = preset || await askFrontend(step(2), { defaultValue: config.frontend, canGoBack });
        if (!answer.back) config.frontend = answer.frontend;
        break;
      case "backend":
        answer = preset || await askBackend(step(3), {
          defaultValue: config.backend,
          canGoBack,
          // A database chosen up front needs a backend to connect to
          allowNone: !fixed.databaseType || fixed.databaseType === "none",
        });
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
        answer = preset || await askRuntime(step(4), { defaultValue: config.runtime, canGoBack });
        if (!answer.back) config.runtime = answer.runtime;
        break;
      case "database":
        answer = preset || await askDatabaseType(step(5), {
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
        answer = preset || await askDatabaseSetup(config.database.type, {
          defaultValue: config.database.provider,
          canGoBack,
        });
        if (!answer.back) config.database.provider = answer.provider;
        break;
      case "orm": {
        const allowedORMs = getCompatibleORMs(config.database.type);
        answer = preset || await askORM(step(6), allowedORMs, {
          defaultValue: config.orm,
          canGoBack,
        });
        if (!answer.back) config.orm = answer.orm;
        break;
      }
      case "confirmation": {
        // Every value came from flags, so there is nothing to confirm
        if (history.length === 0) return config;
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

    // Skipped steps stay out of the history, so Backspace returns to the last question asked
    if (!preset) history.push({ step: currentStep, mark: stepMark });
    currentStep = nextStep;
  }
}
