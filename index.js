
import inquirer from "inquirer";
import chalk from "chalk";
import gradient from "gradient-string";
import figlet from "figlet";
import ora from "ora";
import boxen from "boxen";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createProject } from "./commands/scaffold.js";
import { createGithubRepo } from "./createGithubRepo.js";
import { loginCommand } from "./commands/login.js";
import { gatherCustomConfig } from "./prompts/index.js";
import { isPromptCancellation } from "./utils/shared.js";

const orange = chalk.hex("#FF6200");

const quickTemplates = {
  "mern-js": { stack: "mern", language: "javascript" },
  "mern-ts": { stack: "mern", language: "typescript" }
};

function detectPackageManager() {
  const userAgent = process.env.npm_config_user_agent;
  if (!userAgent) return "npm";
  if (userAgent.includes("pnpm")) return "pnpm";
  if (userAgent.includes("yarn")) return "yarn";
  if (userAgent.includes("bun")) return "bun";
  if (userAgent.includes("npm")) return "npm";
  return "npm";
}

const isVerbose = process.argv.includes("--verbose");

/**
 * Parses CLI arguments by stripping the Node binary and the script/package
 * runner prefix. Works reliably across npm, npx, pnpm, yarn, and bun
 * regardless of how many segments the runner injects.
 *
 * @returns {string[]}
 */
function parseArgs() {
  // Find the exact argument that represents the CLI entry point
  const idx = process.argv.findIndex((arg, i) => {
    if (i === 0) return false;
    const basename = path.basename(arg);
    return basename === "celtrix.js" || basename === "index.js" || basename === "celtrix";
  });

  return idx !== -1 ? process.argv.slice(idx + 1) : process.argv.slice(2);
}

function showBanner() {
  console.log(
    gradient.pastel(
      figlet.textSync("Celtrix", {
        font: "Big",
        horizontalLayout: "default",
        verticalLayout: "default",
      })
    )
  );
  console.log(chalk.gray("⚡ Setup Web-apps in seconds, not hours ⚡\n"));
}

async function askStackQuestions() {
  const stackAnswer = await inquirer.prompt([
    {
      type: "list",
      name: "stack",
      message: "Choose your stack:",
      choices: [
        {
          name:
            gradient.pastel.multiline("⚡ Custom Stack") +
            chalk.gray(" → Pick every piece of your stack"),
          value: "custom",
        },
        new inquirer.Separator(chalk.gray("  ── Preset Stacks ──")),
        {
          name:
            chalk.blueBright.bold("⚡ MERN") +
            chalk.gray(" → MongoDB + Express + React + Node.js"),
          value: "mern",
        },
        {
          name:
            chalk.redBright.bold("⚡ MEAN") +
            chalk.gray(" → MongoDB + Express + Angular + Node.js"),
          value: "mean",
        },
        {
          name:
            chalk.cyanBright.bold("⚡ MEVN") +
            chalk.gray(" → MongoDB + Express + Vue + Node.js"),
          value: "mevn",
        },
        {
          name:
            chalk.greenBright.bold("⚡ MERN + Tailwind + Auth") +
            chalk.gray(" → full-stack with styling & auth"),
          value: "mern+tailwind+auth",
        },
        {
          name:
            chalk.magentaBright.bold("⚡ MEAN + Tailwind + Auth") +
            chalk.gray(" → Angular setup with extras"),
          value: "mean+tailwind+auth",
        },
        {
          name:
            chalk.yellowBright.bold("⚡ MEVN + Tailwind + Auth") +
            chalk.gray(" → Vue stack with auth ready"),
          value: "mevn+tailwind+auth",
        },
        {
          name:
            orange.bold("⚡ React + Tailwind + Firebase") +
            chalk.gray(" → fast way to build apps"),
          value: "react+tailwind+firebase",
        },
        {
          name:
            chalk.whiteBright.bold("⚡ Next.js") +
            chalk.gray(" → vanilla modern stack"),
          value: "nextjs",
        },
        {
          name:
            chalk.magentaBright.bold("⚡ Hono") +
            chalk.gray(" → Hono + Prisma + React"),
          value: "hono",
        },
      ],
      pageSize: 12,
      default: "custom",
    },
  ]);

  // Skip language prompt for custom stack — it has its own language step.
  if (stackAnswer.stack === "custom") {
    return stackAnswer;
  }

  const langAnswer = await inquirer.prompt([
    {
      type: "list",
      name: "language",
      message: "Choose your language:",
      choices: [
        { name: chalk.bold.yellow("JavaScript"), value: "javascript" },
        { name: chalk.bold.blue("TypeScript"), value: "typescript" },
      ],
      pageSize: 10,
      default: "typescript",
    },
  ]);

  return { ...stackAnswer, ...langAnswer };
}

/**
 * Returns human-readable frontend/backend labels derived from the chosen stack.
 * The stack selection already determines which frameworks are used, so these
 * labels are for display purposes only (summary box, config box).
 *
 * @param {string} stack - The selected stack identifier.
 * @returns {{ frontend: string|null, backend: string|null }}
 */
function getStackMeta(stack) {
  const meta = {
    "mern":                    { frontend: "React",   backend: "Express" },
    "mean":                    { frontend: "Angular", backend: "Express" },
    "mevn":                    { frontend: "Vue",     backend: "Express" },
    "mern+tailwind+auth":      { frontend: "React",   backend: "Express" },
    "mean+tailwind+auth":      { frontend: "Angular", backend: "Express" },
    "mevn+tailwind+auth":      { frontend: "Vue",     backend: "Express" },
    "react+tailwind+firebase": { frontend: "React",   backend: null },
    "nextjs":                  { frontend: "Next.js", backend: null },
    "hono":                    { frontend: "React",   backend: "Hono" },
  };
  return meta[stack] || { frontend: null, backend: null };
}

async function askRuntimeEnvironment() {
  return await inquirer.prompt([
    {
      type: "list",
      name: "runtime",
      message: "Select a runtime environment:",
      choices: [
        { name: chalk.greenBright.bold("Node.js"), value: "node" },
        { name: chalk.white.bold("Bun"), value: "bun" },
      ],
      default: "node",
    },
  ]);
}

async function askProjectName() {
  const { projectName } = await inquirer.prompt([
    {
      type: "input",
      name: "projectName",
      message: chalk.cyan("📦 Enter your project name:"),
      validate: (input) => {
        if (!input.trim()) return chalk.red("Project name is required!");
        if (!/^[a-zA-Z0-9-_]+$/.test(input)) {
          return chalk.red(
            "Only letters, numbers, hyphens, and underscores are allowed."
          );
        }
        return true;
      },
    },
  ]);
  return projectName;
}

async function askPackageManager() {
  return await inquirer.prompt([
    {
      type: "list",
      name: "packageManager",
      message: "Choose a package manager:",
      choices: [
        { name: chalk.bold.red("npm"), value: "npm" },
        { name: chalk.bold.cyan("yarn"), value: "yarn" },
        { name: chalk.bold.yellow("pnpm"), value: "pnpm" },
        { name: chalk.bold.white("bun"), value: "bun" },
      ],
      pageSize: 10,
      default: detectPackageManager(),
    },
  ]);
}

function getVersion() {
  try {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const packageJsonPath = path.join(__dirname, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
    return packageJson.version;
  } catch (error) {
    return 'unknown';
  }
}

function showVersion() {
  const version = getVersion();
  console.log(`${chalk.cyanBright('Celtrix')} ${chalk.gray('v')}${chalk.greenBright(version)}`);
}

function showHelp() {
  const version = getVersion();
  console.log(`${chalk.cyanBright.bold('Celtrix')} ${chalk.gray('v')}${chalk.greenBright(version)}`);
  console.log(chalk.gray('⚡ Setup Web-apps in seconds, not hours ⚡\n'));

  console.log(chalk.bold('Usage:'));
  console.log(`  ${chalk.cyan('npx celtrix')} ${chalk.gray('[project-name]')} ${chalk.gray('[options]')}\n`);

  console.log(chalk.bold('Options:'));
  console.log(`  ${chalk.cyan('--version, -v')}     Show version number`);
  console.log(`  ${chalk.cyan('--help, -h')}        Show help information`);
  console.log(`  ${chalk.cyan('--verbose')}         Show detailed error output\n`);

  console.log(chalk.bold('Examples:'));
  console.log(`  ${chalk.cyan('npx celtrix')}                 ${chalk.gray('# Interactive mode')}`);
  console.log(`  ${chalk.cyan('npx celtrix my-app')}          ${chalk.gray('# Create project with name')}`);
  console.log(`  ${chalk.cyan('npx celtrix --version')}       ${chalk.gray('# Show version')}`);
  console.log(`  ${chalk.cyan('npx celtrix --help')}          ${chalk.gray('# Show this help')}\n`);

  console.log(chalk.bold('Modes:'));
  console.log(`  ${chalk.magentaBright('Custom Stack')}     ${chalk.gray('Pick every piece of your stack interactively')}`);
  console.log(`  ${chalk.gray('Preset Stacks')}    ${chalk.gray('Choose a pre-configured full-stack template')}`);

  console.log(chalk.bold('\nPreset Stacks:'));
  console.log(`  ${chalk.blueBright('MERN')}             ${chalk.gray('MongoDB + Express + React + Node.js')}`);
  console.log(`  ${chalk.redBright('MEAN')}             ${chalk.gray('MongoDB + Express + Angular + Node.js')}`);
  console.log(`  ${chalk.cyanBright('MEVN')}             ${chalk.gray('MongoDB + Express + Vue + Node.js')}`);
  console.log(`  ${chalk.greenBright('MERN+Auth')}        ${chalk.gray('MERN with Tailwind & Authentication')}`);
  console.log(`  ${chalk.magentaBright('React+Firebase')}   ${chalk.gray('React + Tailwind + Firebase')}`);
  console.log(`  ${chalk.whiteBright('Next.js')}          ${chalk.gray('Full-stack React framework')}`);
  console.log(`  ${chalk.magentaBright('Hono')}             ${chalk.gray('Hono + Prisma + React')}`);

  console.log(chalk.bold('\nCustom Stack — Frontends:'));
  console.log(`  ${chalk.cyanBright('React Router')}     ${chalk.gray('React with file-based routing')}`);
  console.log(`  ${chalk.white('Next.js')}          ${chalk.gray('Full-stack React framework')}`);
  console.log(`  ${chalk.greenBright('Nuxt')}             ${chalk.gray('Full-stack Vue framework')}`);
  console.log(`  ${chalk.hex('#FF6200')('TanStack')}         ${chalk.gray('Type-safe routing & data fetching')}`);
  console.log(`  ${chalk.magentaBright('Astro')}            ${chalk.gray('Content-focused, island architecture')}`);
  console.log(`  ${chalk.redBright('SvelteKit')}        ${chalk.gray('Cybernetically enhanced web apps')}`);
  console.log(`  ${chalk.blueBright('SolidStart')}       ${chalk.gray('Fine-grained reactive UI framework')}`);

  console.log(chalk.bold('\nCustom Stack — Backends:'));
  console.log(`  ${chalk.hex('#FF6200')('Hono')}             ${chalk.gray('Ultrafast edge-ready web framework')}`);
  console.log(`  ${chalk.white('Fastify')}          ${chalk.gray('Fast & low-overhead Node.js framework')}`);
  console.log(`  ${chalk.yellowBright('Express')}          ${chalk.gray('Minimalist Node.js web framework')}`);
  console.log(`  ${chalk.magentaBright('Convex')}           ${chalk.gray('Reactive backend-as-a-service')}`);

  console.log(chalk.bold('\nSupported Runtimes:'));
  console.log(`  ${chalk.greenBright('Node.js')}          ${chalk.gray('The standard JavaScript runtime')}`);
  console.log(`  ${chalk.white('Bun')}              ${chalk.gray('Fast all-in-one JS runtime & toolkit')}`);

  console.log(chalk.gray('\nFor more information, visit: https://github.com/celtrix-os/Celtrix'));
}

/**
 * Formats elapsed milliseconds into a human-readable string.
 *
 * @param {number} ms - Elapsed time in milliseconds.
 * @returns {string}
 */
function formatElapsed(ms) {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * Renders a styled post-scaffold summary box.
 *
 * @param {object} opts
 * @param {string} opts.projectName
 * @param {object} opts.config
 * @param {boolean} opts.installedDeps
 * @param {boolean} opts.createdRepo
 * @param {number} opts.elapsed  - Scaffold duration in ms.
 */
function showSummaryBox({ projectName, config, installedDeps, createdRepo, elapsed }) {
  const isCustom = config.stack === "custom";
  const { frontend, backend } = isCustom
    ? { frontend: config.frontend, backend: config.backend }
    : getStackMeta(config.stack);

  const lines = [
    `${chalk.bold("📦 Project:")}      ${chalk.greenBright(projectName)}`,
    `${chalk.bold("🌐 Stack:")}        ${chalk.cyanBright(isCustom ? "Custom" : config.stack)}`,
    `${chalk.bold("📖 Language:")}     ${chalk.yellow(config.language)}`,
    ...(frontend && frontend !== "none" ? [`${chalk.bold("🎨 Frontend:")}     ${chalk.blueBright(frontend)}`] : []),
    ...(backend && backend !== "none"   ? [`${chalk.bold("⚙️  Backend:")}      ${chalk.magentaBright(backend)}`] : []),
    `${chalk.bold("⚡ Runtime:")}      ${config.runtime === 'bun' ? chalk.white("Bun") : chalk.greenBright("Node.js")}`,
    `${chalk.bold("📦 Pkg Manager:")}  ${chalk.magenta(config.packageManager)}`,
  ];

  // Custom-stack expanded fields
  if (isCustom) {
    if (config.database && config.database.type !== "none") {
      lines.push(`${chalk.bold("🗄️  Database:")}     ${chalk.cyanBright(config.database.type)}${config.database.provider ? chalk.gray(" via ") + chalk.white(config.database.provider) : ""}`);
    }
    if (config.orm && config.orm !== "none") {
      lines.push(`${chalk.bold("🔗 ORM:")}           ${chalk.greenBright(config.orm)}`);
    }
    if (config.api && config.api !== "none") {
      lines.push(`${chalk.bold("🔌 API:")}           ${chalk.blueBright(config.api)}`);
    }
    if (config.auth && config.auth !== "none") {
      lines.push(`${chalk.bold("🔐 Auth:")}          ${chalk.magentaBright(config.auth)}`);
    }
    if (config.addons && config.addons.length > 0) {
      lines.push(`${chalk.bold("🧩 Add-ons:")}       ${chalk.yellow(config.addons.join(", "))}`);
    }
  }

  lines.push(
    `${chalk.bold("📥 Deps:")}         ${installedDeps ? chalk.green("installed") : chalk.gray("skipped")}`,
    `${chalk.bold("🐙 GitHub Repo:")}  ${createdRepo ? chalk.green("created") : chalk.gray("skipped")}`,
    `${chalk.bold("⏱  Time:")}         ${chalk.white(formatElapsed(elapsed))}`,
  );

  console.log(
    boxen(lines.join("\n"), {
      padding: 1,
      margin: { top: 1, bottom: 1, left: 0, right: 0 },
      borderColor: "green",
      borderStyle: "round",
      title: chalk.greenBright.bold("✅ Project Created"),
      titleAlignment: "center",
    })
  );

  console.log(chalk.gray("✨ Made with ❤️  by Celtrix ✨\n"));
}

async function main() {
  const args = parseArgs();

  // Handle version flag
  if (args.includes('--version') || args.includes('-v')) {
    showVersion();
    process.exit(0);
  }

  // Handle help flag
  if (args.includes('--help') || args.includes('-h')) {
    showHelp();
    process.exit(0);
  }

  if (args.includes('login')) {
    await loginCommand();
    process.exit(0);
  }

  showBanner();

  let projectName = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-'));
  let packageManager = detectPackageManager();
  let config;
  const quickKey = args[0];
  let isQuick = false;
  let quickConfig = null;

  if (quickTemplates[quickKey]) {
    isQuick = true;
    quickConfig = quickTemplates[quickKey];
  }

  try {

    if (isQuick) {
      // QUICK MODE (mern-js / mern-ts)
      console.log(chalk.green(`⚡ Using quick template: ${quickKey}`));

      projectName = args[1] || (await askProjectName());

      packageManager = (await askPackageManager()).packageManager;
      const runtimeAnswers = await askRuntimeEnvironment();

      config = {
        stack: quickConfig.stack,       // always mern
        language: quickConfig.language, // js or ts
        projectName,
        packageManager,
        runtime: runtimeAnswers.runtime
      };

    } else {
      // NORMAL MODE
      if (!projectName) {
        projectName = await askProjectName();
      }

      const stackAnswers = await askStackQuestions();

      if (stackAnswers.stack === "custom") {
        // ── Custom Stack Flow ──
        console.log(chalk.gray("\n── Customise your tech stack ──\n"));
        const customConfig = await gatherCustomConfig();
        packageManager = (await askPackageManager()).packageManager;
        config = { stack: "custom", ...customConfig, projectName, packageManager };
      } else {
        // ── Preset Stack Flow ──
        const runtimeAnswers = await askRuntimeEnvironment();
        packageManager = (await askPackageManager()).packageManager;
        config = { ...stackAnswers, ...runtimeAnswers, projectName, packageManager };
      }
    }

    if (config.stack !== "custom") {
      const { backend: stackBackend } = getStackMeta(config.stack);
      if (!stackBackend) {
        console.log(chalk.yellow("⚠️ Note: This stack is frontend-only — no backend server will be created."));
      }
    }

    // Ask whether to install dependencies (handled in main script)
    const { installDeps } = await inquirer.prompt([
      {
        type: "confirm",
        name: "installDeps",
        message: "Do you want to install dependencies?",
        default: true,
      },
    ]);

    // Ask whether to initialize a git repo
    const { initGit } = await inquirer.prompt([
      {
        type: "confirm",
        name: "initGit",
        message: "Initialize a git repository?",
        default: true,
      },
    ]);

    // Ask whether to create a github repo
    const { createGitHubRepo } = await inquirer.prompt([
      {
        type: "confirm",
        name: "createGitHubRepo",
        message: "Do you want to create a GitHub Repository?",
        default: true,
      },
    ]);

    // --- Scaffold with spinner + timing ---
    const startTime = Date.now();
    const scaffoldSpinner = ora({
      text: chalk.yellow("Scaffolding your project…"),
      spinner: "dots12",
    }).start();

    try {
      await createProject(projectName, config, installDeps);
      const elapsed = Date.now() - startTime;
      scaffoldSpinner.succeed(
        chalk.green(`Project scaffolded in ${formatElapsed(elapsed)}`)
      );
    } catch (err) {
      scaffoldSpinner.fail(chalk.red("Scaffolding failed"));
      throw err;
    }

    // --- Git init ---
    if (initGit && !createGitHubRepo) {
      // Only run standalone git init when NOT creating a GitHub repo
      // (createGithubRepo handles git init + remote + push itself)
      const projectPath = path.join(process.cwd(), projectName);
      try {
        const { execSync } = await import("child_process");
        execSync("git init", { cwd: projectPath, stdio: "ignore" });
        execSync("git add .", { cwd: projectPath, stdio: "ignore" });
        execSync('git commit -m "Initial commit"', { cwd: projectPath, stdio: "ignore" });
        console.log(chalk.green("\n🎉 Git repository initialized with initial commit."));
      } catch {
        console.log(chalk.yellow("\n⚠️  Could not initialize git — you can run 'git init' manually."));
      }
    }

    // --- GitHub repo ---
    let repoCreated = false;
    if (createGitHubRepo) {
      await createGithubRepo(projectName);
      repoCreated = true;
    }

    // --- Summary box ---
    const totalElapsed = Date.now() - startTime;
    showSummaryBox({
      projectName,
      config,
      installedDeps: installDeps,
      createdRepo: repoCreated,
      elapsed: totalElapsed,
    });

  } catch (err) {
    // Graceful cancellation (Ctrl+C during any prompt)
    if (isPromptCancellation(err)) {
      console.log(chalk.yellow("\n👋 Cancelled — see you next time!\n"));
      process.exit(0);
    }

    console.log(chalk.red("❌ Error:"), err.message);
    if (isVerbose && err.stack) {
      console.log(chalk.gray(err.stack));
    }
    process.exit(1);
  }
}

main();