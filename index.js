
import inquirer from "inquirer";
import chalk from "chalk";
import gradient from "gradient-string";
import figlet from "figlet";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { createProject } from "./commands/scaffold.js";
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
            chalk.gray(" → vannila modern stack"),
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

async function askCustomizationOptions() {
  return await inquirer.prompt([
    {
      type: "confirm",
      name: "enableCustomization",
      message: chalk.cyan("🎨 Would you like to customize your project configuration?"),
      default: false,
    },
  ]);
}

async function askAdvancedOptions(stackSupportsDocker = true) {
  const questions = [
    {
      type: "input",
      name: "serverPort",
      message: chalk.cyan("🔌 Server port:"),
      default: "5000",
      validate: (input) => {
        const port = parseInt(input);
        if (isNaN(port) || port < 1 || port > 65535) {
          return chalk.red("Please enter a valid port number (1-65535)");
        }
        return true;
      },
    },
    {
      type: "input",
      name: "clientPort",
      message: chalk.cyan("🔌 Client port:"),
      default: "3000",
      validate: (input) => {
        const port = parseInt(input);
        if (isNaN(port) || port < 1 || port > 65535) {
          return chalk.red("Please enter a valid port number (1-65535)");
        }
        return true;
      },
    },
    {
      type: "confirm",
      name: "initGit",
      message: chalk.cyan("📦 Initialize Git repository?"),
      default: true,
    },
    {
      type: "confirm",
      name: "setupDocker",
      message: chalk.cyan("🐳 Include Docker configuration?"),
      default: false,
      when: () => stackSupportsDocker,
    },
    {
      type: "list",
      name: "codingStyle",
      message: chalk.cyan("✨ Code formatting setup:"),
      choices: [
        { name: chalk.bold("ESLint + Prettier"), value: "eslint-prettier" },
        { name: chalk.bold("ESLint only"), value: "eslint" },
        { name: chalk.bold("None"), value: "none" },
      ],
      default: "eslint-prettier",
    },
    {
      type: "checkbox",
      name: "additionalFeatures",
      message: chalk.cyan("🚀 Select additional features:"),
      choices: [
        { name: "API Documentation (Swagger)", value: "swagger" },
        { name: "Environment variables (.env template)", value: "env-template" },
        { name: "VS Code settings", value: "vscode-settings" },
        { name: "Pre-commit hooks (Husky)", value: "husky" },
        { name: "GitHub Actions CI/CD", value: "github-actions" },
      ],
      default: ["env-template"],
    },
  ];

  return await inquirer.prompt(questions);
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

  console.log(chalk.gray('\nFor more information, visit: https://github.com/celtrix-os/Celtrix'));
}

async function main() {
  let packageManager = detectPackageManager();
  let args;
  if(packageManager == "npm" || packageManager == "bun") {
    args = process.argv.slice(2);
  } else {
    args = process.argv.slice(3);
  }  
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
  packageManager = (await askPackageManager()).packageManager;

  // Ask for customization options
  const { enableCustomization } = await askCustomizationOptions();
  
  let customOptions = {};
  if (enableCustomization) {
    const stackSupportsDocker = ['mern', 'mean', 'mevn', 'mern+tailwind+auth', 'mean+tailwind+auth', 'mevn+tailwind+auth', 'hono'].includes(stackAnswers.stack);
    customOptions = await askAdvancedOptions(stackSupportsDocker);
  }

  config = { 
    ...stackAnswers, 
    projectName, 
    packageManager,
    customization: enableCustomization ? customOptions : null
  };
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

    console.log(chalk.yellow("\n🚀 Creating your project...\n"));
    await createProject(projectName, config, installDeps);

  } catch (err) {
    console.log(chalk.red("❌ Error:"), err.message);
    process.exit(1);
  }
}

main();
