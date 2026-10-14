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
import { askAPI } from "./web-parts/api.js";
import { askAuth } from "./web-parts/auth.js";
import { askAddons } from "./web-parts/addons.js";
import { isBackNavigation } from "./common/navigation.js";
import {
  getCompatibleORMs,
  getCompatibleAPIs,
  getCompatibleAuths
} from "./web-parts/compatibility.js";

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
  const createInitialConfig = () => ({
    language: "typescript",
    frontend: "react-router",
    backend: "hono",
    runtime: "node",
    database: { type: "postgres", provider: "neon" },
    orm: "drizzle",
    api: "trpc",
    auth: "better-auth",
    addons: [],
  });

  function nextAfterAPI(config) {
    if (config.backend === "convex") {
      config.api = "none";
      console.log(
        chalk.gray(
          `   ${step(7)} API type selection skipped ${chalk.dim(
            "(Convex handles its own client-server communication)"
          )}`
        )
      );
      return "auth";
    }

    if (config.backend === "none") {
      config.api = "none";
      console.log(chalk.gray(`   ${step(7)} API type selection skipped ${chalk.dim("(no backend)")}`));
      return "auth";
    }

    const allowedAPIs = getCompatibleAPIs(config.backend, config.language);
    if (allowedAPIs.length === 1) {
      config.api = allowedAPIs[0];
      console.log(
        chalk.green(
          `   ⚡ Automatically selected None ${chalk.dim(
            "(tRPC/oRPC require TypeScript, defaulting to REST/None)"
          )}`
        )
      );
      return "auth";
    }

    return "api";
  }

  function nextAfterDatabase(config) {
    if (config.database.type === "none") {
      config.orm = "none";
      console.log(chalk.gray(`   ${step(6)} ORM selection skipped ${chalk.dim("(no database)")}`));
      return nextAfterAPI(config);
    }

    const allowedORMs = getCompatibleORMs(config.database.type, config.language);
    if (allowedORMs.length === 1) {
      config.orm = allowedORMs[0];
      console.log(
        chalk.green(
          `   ⚡ Automatically selected ${
            config.orm === "prisma" ? "Prisma" : "Drizzle"
          } ${chalk.dim(`(only compatible ORM for ${config.database.type} in ${config.language})`)}`
        )
      );
      return nextAfterAPI(config);
    }

    return "orm";
  }

  let config = createInitialConfig();
  const history = [];
  let currentStep = "language";

  while (true) {
    const canGoBack = history.length > 0;
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
          if (answer.backend === "convex" || answer.backend === "none") {
            config.database = { type: "none", provider: "" };
            config.orm = "none";
            config.api = "none";
            if (answer.backend === "none") {
              console.log(chalk.yellow("   ⚠️  No backend selected — this will be a frontend-only project."));
            }
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
        const allowedORMs = getCompatibleORMs(config.database.type, config.language);
        answer = await askORM(step(6), allowedORMs, {
          defaultValue: config.orm,
          canGoBack,
        });
        if (!answer.back) config.orm = answer.orm;
        break;
      }
      case "api": {
        const allowedAPIs = getCompatibleAPIs(config.backend, config.language);
        answer = await askAPI(step(7), allowedAPIs, {
          defaultValue: config.api,
          canGoBack,
        });
        if (!answer.back) config.api = answer.api;
        break;
      }
      case "auth": {
        const allowedAuths = getCompatibleAuths(config.backend, config.language, config.database.type);
        answer = await askAuth(step(8), allowedAuths, {
          defaultValue: config.auth,
          canGoBack,
        });
        if (!answer.back) config.auth = answer.auth;
        break;
      }
      case "addons":
        answer = await askAddons(step(9), { defaultValue: config.addons, canGoBack });
        if (!answer.back) config.addons = answer.addons;
        break;
      case "confirmation": {
        showConfirmationSummary(config);
        const { action } = await inquirer.prompt([
          {
            type: "celtrixList",
            name: "action",
            message: chalk.bold(`${step(10)} Proceed with this configuration?`),
            choices: [
              { name: "Continue", value: "continue" },
              { name: "Start over", value: "restart" },
            ],
            default: "continue",
            canGoBack,
          },
        ]);

        if (isBackNavigation(action)) {
          currentStep = history.pop();
          continue;
        }
        if (action === "restart") {
          console.log(chalk.yellow("\n🔄 Let's try again!\n"));
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
      if (currentStep === "addons" && Array.isArray(answer.addons)) {
        config.addons = answer.addons;
      }
      if (history.length === 0) continue;
      currentStep = history.pop();
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
        if (config.backend === "convex" || config.backend === "none") {
          config.database = { type: "none", provider: "" };
          config.orm = "none";
          config.api = "none";
          const reason = config.backend === "convex"
            ? "(Convex includes a built-in document store)"
            : "(Frontend-only projects do not require a backend database)";
          console.log(chalk.gray(`   ${step(5)} Database selection skipped ${chalk.dim(reason)}`));
          console.log(chalk.gray(`   ${step(6)} ORM selection skipped ${chalk.dim("(no database)")}`));
          nextAfterAPI(config);
          nextStep = "auth";
        } else {
          nextStep = "database";
        }
        break;
      case "database":
        if (config.database.type === "none") {
          nextStep = nextAfterDatabase(config);
        } else {
          nextStep = "databaseSetup";
        }
        break;
      case "databaseSetup":
        nextStep = nextAfterDatabase(config);
        break;
      case "orm":
        nextStep = nextAfterAPI(config);
        break;
      case "api":
        nextStep = "auth";
        break;
      case "auth":
        nextStep = "addons";
        break;
      case "addons":
        nextStep = "confirmation";
        break;
    }

    history.push(currentStep);
    currentStep = nextStep;
  }
}
