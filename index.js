#!/usr/bin/env node
import inquirer from "inquirer";
import chalk from "chalk";
import path from "path";
import { setupTurbo } from "./utils/setupTurbo.js";
import { setupFrontend } from "./utils/setupFrontend.js";
import { setupBackend } from "./utils/setupBackend.js";

async function run() {
  const answers = await inquirer.prompt([
    {
      type: "input",
      name: "projectName",
      message: "Enter your monorepo name:",
      default: "my-turbo-app",
    },
    {
      type: "list",
      name: "frontend",
      message: "Select Frontend Framework:",
      choices: ["React", "Vue", "Angular", "None"],
    },
    {
      type: "list",
      name: "backend",
      message: "Select Backend Framework:",
      choices: ["Express.js", "NestJS", "Koa.js", "Fastify", "None"],
    },
    {
      type: "list",
      name: "backendLang",
      message: "Select Backend Language (for Express):",
      choices: ["js", "ts"],
      when: (ans) => ans.backend === "Express.js",
    },
    {
      type: "list",
      name: "database",
      message: "Select Database:",
      choices: [
        "Postgres + Prisma",
        "MySQL + Prisma",
        "MongoDB + Mongoose",
        "None",
      ],
    },
  ]);

  const { projectName, frontend, backend, backendLang, database } = answers;
  const projectPath = path.join(process.cwd(), projectName);

  console.log(chalk.cyan(`\n🚀 Creating Turborepo: ${projectName}\n`));

  // Step 1: Setup Turborepo
  await setupTurbo(projectName, projectPath);

  // Step 2: Setup Frontend
  await setupFrontend(projectPath, frontend);

  // Step 3: Setup Backend (+ DB)
  await setupBackend(projectPath, backend, backendLang, database);

  console.log(
    chalk.green(`\n✅ Turborepo ${projectName} created successfully!`)
  );
  console.log(chalk.yellow(`\n👉 cd ${projectName}`));
  console.log(chalk.yellow(`👉 npm install`));
  console.log(chalk.yellow(`👉 npm run dev`));
}

run();
