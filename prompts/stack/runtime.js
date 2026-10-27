import inquirer from "inquirer";
import chalk from "chalk";
import gradient from "gradient-string";
import figlet from "figlet";
import ora from "ora";
import boxen from "boxen";
import fs from "fs";
import path from "path";
import { RUNTIME_OPTIONS } from "../../utils/stackOptions.js";

export async function askRuntimeEnvironment() {
  return await inquirer.prompt([
    {
      type: "list",
      name: "runtime",
      message: "Select a runtime environment:",
      choices: RUNTIME_OPTIONS.map((opt) => ({ name: opt.color.bold(opt.label), value: opt.value })),
      default: "node",
    },
  ]);
}