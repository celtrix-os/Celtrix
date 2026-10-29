import inquirer from "inquirer";
import chalk from "chalk";
import { RUNTIME_OPTIONS } from "../../utils/stackOptions.js";

export async function askRuntimeEnvironment() {
  return await inquirer.prompt([
    {
      type: "celtrixList",
      name: "runtime",
      message: "Select a runtime environment:",
      choices: RUNTIME_OPTIONS.map((opt) => ({ name: opt.color.bold(opt.label), value: opt.value })),
      default: "node",
      canGoBack: true,
      backHint: chalk.dim("  ⌫ Press Backspace to change the stack selection"),
    },
  ]);
}