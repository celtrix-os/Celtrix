
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

/**
 * Returns true when an inquirer prompt was cancelled with Ctrl+C.
 *
 * @param {unknown} error - Prompt error.
 * @returns {boolean}
 */
function isPromptCancellation(error) {
  return (
    error instanceof Error &&
    (error.name === "ExitPromptError" ||
      error.message.toLowerCase().includes("force closed"))
  );
}

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
  return await inquirer.prompt([
    {
      type: "list",
      name: "stack",
      message: "Choose your stack:",
      choices: [
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
      pageSize: 10,
      default: "mern",
    },
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
}

async function askFrontendQuestions() {
  return await inquirer.prompt([
    {
      type: "list",
      name: "frontend",
      message: "Select a frontend framework:",
      choices: [
        { name: chalk.blueBright.bold("React Router"), value: "react-router" },
        { name: chalk.whiteBright.bold("Next.js"), value: "nextjs" },
        { name: chalk.greenBright.bold("Nuxt"), value: "nuxt" },
        { name: chalk.cyanBright.bold("TanStack"), value: "tanstack" },
        { name: chalk.white.bold("Astro"), value: "astro" },
        { name: chalk.redBright.bold("Svelte"), value: "svelte" },
        { name: chalk.blue.bold("Solid"), value: "solid" },
      ],
      pageSize: 10,
    },
  ]);
}

async function askBackendFramework() {
  return await inquirer.prompt([
    {
      type: "list",
      name: "backend",
      message: "Select a backend framework:",
      choices: [
        { name: chalk.magentaBright.bold("Hono"), value: "hono" },
        { name: chalk.green.bold("Fastify"), value: "fastify" },
        { name: chalk.blueBright.bold("Express"), value: "express" },
        { name: orange.bold("Convex"), value: "convex" },
        { name: chalk.gray("None (Frontend only)"), value: "none" },
      ],
      default: "express",
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
  console.log(`  ${chalk.cyan('--help, -h')}        Show help information\n`);

  console.log(chalk.bold('Examples:'));
  console.log(`  ${chalk.cyan('npx celtrix')}                 ${chalk.gray('# Interactive mode')}`);
  console.log(`  ${chalk.cyan('npx celtrix my-app')}          ${chalk.gray('# Create project with name')}`);
  console.log(`  ${chalk.cyan('npx celtrix --version')}       ${chalk.gray('# Show version')}`);
  console.log(`  ${chalk.cyan('npx celtrix --help')}          ${chalk.gray('# Show this help')}\n`);

  console.log(chalk.bold('Supported Stacks:'));
  console.log(`  ${chalk.blueBright('MERN')}        ${chalk.gray('MongoDB + Express + React + Node.js')}`);
  console.log(`  ${chalk.redBright('MEAN')}        ${chalk.gray('MongoDB + Express + Angular + Node.js')}`);
  console.log(`  ${chalk.cyanBright('MEVN')}        ${chalk.gray('MongoDB + Express + Vue + Node.js')}`);
  console.log(`  ${chalk.greenBright('MERN+Auth')}   ${chalk.gray('MERN with Tailwind & Authentication')}`);
  console.log(`  ${chalk.magentaBright('React+Firebase')} ${chalk.gray('React + Tailwind + Firebase')}`);
  console.log(`  ${chalk.whiteBright('T3 Stack')}    ${chalk.gray('Next.js + tRPC + Prisma + Tailwind')}`);
  console.log(`  ${chalk.magentaBright('Hono')}        ${chalk.gray('Hono + Prisma + React')}`);

  console.log(chalk.bold('\nSupported Frontends:'));
  console.log(`  ${chalk.blueBright('React Router')}  ${chalk.gray('SPA routing with React')}`);
  console.log(`  ${chalk.whiteBright('Next.js')}       ${chalk.gray('Full-stack React framework')}`);
  console.log(`  ${chalk.greenBright('Nuxt')}          ${chalk.gray('Full-stack Vue framework')}`);
  console.log(`  ${chalk.cyanBright('TanStack')}      ${chalk.gray('Type-safe routing & data fetching')}`);
  console.log(`  ${chalk.white('Astro')}         ${chalk.gray('Content-driven static sites')}`);
  console.log(`  ${chalk.redBright('Svelte')}        ${chalk.gray('Compile-time reactive UI')}`);
  console.log(`  ${chalk.blue('Solid')}         ${chalk.gray('Fine-grained reactive UI')}`);

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
  const lines = [
    `${chalk.bold("📦 Project:")}      ${chalk.greenBright(projectName)}`,
    `${chalk.bold("🌐 Stack:")}        ${chalk.cyanBright(config.stack)}`,
    `${chalk.bold("📖 Language:")}     ${chalk.yellow(config.language)}`,
    ...(config.frontend ? [`${chalk.bold("🎨 Frontend:")}     ${chalk.blueBright(config.frontend)}`] : []),
    ...(config.backend ? [`${chalk.bold("⚙️ Backend:")}      ${chalk.magentaBright(config.backend)}`] : []),
    `${chalk.bold("📦 Pkg Manager:")}  ${chalk.magenta(config.packageManager)}`,
    `${chalk.bold("📥 Deps:")}         ${installedDeps ? chalk.green("installed") : chalk.gray("skipped")}`,
    `${chalk.bold("🐙 GitHub Repo:")}  ${createdRepo ? chalk.green("created") : chalk.gray("skipped")}`,
    `${chalk.bold("⏱  Time:")}         ${chalk.white(formatElapsed(elapsed))}`,
  ];

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

      config = {
        stack: quickConfig.stack,       // always mern
        language: quickConfig.language, // js or ts
        projectName,
        packageManager
      };

    } else {
      // NORMAL MODE (unchanged)
      if (!projectName) {
        projectName = await askProjectName();
      }

      const stackAnswers = await askStackQuestions();
      const frontendAnswers = await askFrontendQuestions();
      const backendAnswers = await askBackendFramework();
      packageManager = (await askPackageManager()).packageManager;

      config = { ...stackAnswers, ...frontendAnswers, ...backendAnswers, projectName, packageManager };
    }

    if (config.backend === "none") {
      console.log(chalk.yellow("⚠️ Note: No backend framework selected. Creating a frontend-only project."));
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

    // --- GitHub repo ---
    let repoCreated = false;
    if (createGitHubRepo) {
      const repoSpinner = ora({
        text: chalk.yellow("Starting GitHub repository setup…"),
        spinner: "dots12",
      }).start();
      repoSpinner.stop(); // stop before interactive prompts inside createGithubRepo
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
    process.exit(1);
  }
}

main();