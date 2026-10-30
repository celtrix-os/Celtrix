import inquirer from "inquirer";
import chalk from "chalk";
import fs from "fs";
import path from "path";

const orange = chalk.hex("#FF6200");

export async function askProjectName(options = {}) {
  const prompt = options.prompt || inquirer.prompt;
  const cwd = options.cwd || process.cwd();

  const { projectName } = await prompt([
    {
      type: "input",
      name: "projectName",
      message: chalk.cyan("📦 Enter your project name:"),
      validate: (input) => {
        const trimmed = (input || "").trim();
        // Case 1: Empty input is treated as current working directory
        if (!trimmed || trimmed === ".") return true;
        if (!/^[a-zA-Z0-9-_]+$/.test(trimmed)) {
          return chalk.red(
            "Only letters, numbers, hyphens, and underscores are allowed."
          );
        }
        return true;
      },
    },
  ]);

  const trimmed = (projectName || "").trim();
  const resolvedName = (!trimmed || trimmed === ".") ? "." : trimmed;

  // Case 1: Empty input or "." uses current directory directly
  if (resolvedName === ".") {
    return ".";
  }

  // Case 2 & 3: Check if folder exists
  const targetPath = path.join(cwd, resolvedName);
  if (!fs.existsSync(targetPath)) {
    return resolvedName;
  }

  // Case 3: Folder already exists, handle interactively
  return await handleFolderConflict(resolvedName, options);
}

export async function handleFolderConflict(initialName, options = {}) {
  const prompt = options.prompt || inquirer.prompt;
  const cwd = options.cwd || process.cwd();
  let currentName = initialName;

  while (true) {
    const targetPath = path.join(cwd, currentName);
    if (currentName === "." || !fs.existsSync(targetPath)) {
      return currentName;
    }

    console.log(chalk.yellow(`\n⚠️ Directory "${currentName}" already exists.\n`));

    const { action } = await prompt([
      {
        type: "list",
        name: "action",
        message: "How would you like to proceed?",
        choices: [
          { name: "Use the existing folder", value: "use-existing" },
          { name: "Create another folder with the same name", value: "different-name" },
          { name: "Cancel setup", value: "cancel" },
        ],
      },
    ]);

    if (action === "use-existing") {
      const { confirmUse } = await prompt([
        {
          type: "confirm",
          name: "confirmUse",
          message: `Are you sure you want to use the existing directory "${currentName}"?`,
          default: true,
        },
      ]);

      if (confirmUse) {
        return currentName;
      }
      continue;
    }

    if (action === "different-name") {
      const { newName } = await prompt([
        {
          type: "input",
          name: "newName",
          message: chalk.cyan("📦 Enter a different folder name:"),
          validate: (input) => {
            const trimmed = (input || "").trim();
            if (!trimmed || trimmed === ".") return true;
            if (!/^[a-zA-Z0-9-_]+$/.test(trimmed)) {
              return chalk.red(
                "Only letters, numbers, hyphens, and underscores are allowed."
              );
            }
            return true;
          },
        },
      ]);

      const trimmedNew = (newName || "").trim();
      currentName = (!trimmedNew || trimmedNew === ".") ? "." : trimmedNew;
      continue;
    }

    if (action === "cancel") {
      console.log(chalk.yellow("\n👋 Setup cancelled.\n"));
      if (typeof options.onCancel === "function") {
        return options.onCancel();
      }
      process.exit(0);
    }
  }
}
