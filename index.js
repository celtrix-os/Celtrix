import inquirer from "inquirer";
import chalk from "chalk";
import gradient from "gradient-string";
import figlet from "figlet";
import { readFileSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import { createProject } from "./commands/scaffold.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const pkg = JSON.parse(readFileSync(join(__dirname, "./package.json"), "utf8"));

const orange = chalk.hex("#FF6200");

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

const args = process.argv.slice(2);

if (args.includes("--version") || args.includes("-v")) {
  console.log(chalk.greenBright(`celtrix version: ${pkg.version}`));
  process.exit(0);
}

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
${chalk.bold("Usage:")} celtrix [project-name] [options]

${chalk.bold("Options:")}
  -v, --version       Show version number
  -h, --help          Show help information

${chalk.bold("Examples:")}
  $ celtrix my-app
  $ celtrix --version
  $ celtrix -h
`);
  process.exit(0);
}

console.log("\n")

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
            chalk.whiteBright.bold("⚡ Next.js (T3 Stack)") +
            chalk.gray(" → tRPC + Prisma + Tailwind + Auth"),
          value: "t3-stack",
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

async function main() {
  showBanner();

  let projectName = process.argv[2];
  let config;

  try {
    if (!projectName) {
      projectName = await askProjectName();
    }
    const stackAnswers = await askStackQuestions();
    config = { ...stackAnswers, projectName };
    

    console.log(chalk.yellow("\n🚀 Creating your project...\n"));
    await createProject(projectName, config);

  } catch (err) {
    console.log(chalk.red("❌ Error:"), err.message);
    process.exit(1);
  }
}

main();
