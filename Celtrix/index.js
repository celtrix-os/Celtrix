import inquirer from "inquirer";
import chalk from "chalk";
import gradient from "gradient-string";
import figlet from "figlet";
import { createProject } from "./commands/scaffold.js";

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

console.log("\n")

async function askStackQuestions() {
  return await inquirer.prompt([
    {
      type: "list",
      name: "stack",
      message: "Choose your stack:",
      choices: [
        { name: chalk.bold.blue("MERN") + " → MongoDB + Express + React + Node.js", value: "mern" },
        { name: chalk.bold.green("MERN") + " + Tailwind + Auth", value: "mern+tailwind+auth" },
        { name: chalk.bold.red("MEAN") + " → MongoDB + Express + Angular + Node.js", value: "mean" },
        { name: chalk.bold.magenta("MEAN") + " + Tailwind + Auth", value: "mean+tailwind+auth" },
        { name: chalk.bold.cyan("MEVN") + " → MongoDB + Express + Vue.js + Node.js", value: "mevn" },
        { name: chalk.bold.yellow("MEVN") + " + Tailwind + Auth", value: "mevn+tailwind+auth" },
        { name: chalk.bold.yellow("Next.js") + " + tRPC + Prisma + Tailwind + Auth", value: "t3-stack" },

        // new inquirer.Separator(chalk.gray("─── Django Stacks ───")),
        { name: chalk.bold.magenta("Django + React") + " → PostgreSQL + DRF + React + JWT", value: "django-react" },
        // { name: chalk.bold.cyan("Django + Vue") + " → PostgreSQL + DRF + Vue + JWT", value: "django-vue" },
        // { name: chalk.bold.green("Django + Angular") + " → PostgreSQL + DRF + Angular + JWT", value: "django-angular" },
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
        { name: chalk.bold.red("Python"), value: "python" },
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
