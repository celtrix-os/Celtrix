import inquirer from "inquirer";
import chalk from "chalk";
import gradient from "gradient-string";
import figlet from "figlet";
import ora from "ora";
import boxen from "boxen";
import fs from "fs";
import path from "path";
import { detectPackageManager } from "../stable/detectPackageManager.js";
import { PACKAGE_MANAGER_OPTIONS } from "../../utils/stackOptions.js";

export async function askPackageManager() {
  return await inquirer.prompt([
    {
      type: "list",
      name: "packageManager",
      message: "Choose a package manager:",
      choices: PACKAGE_MANAGER_OPTIONS.map((opt) => ({ name: opt.color.bold(opt.label), value: opt.value })),
      pageSize: 10,
      default: detectPackageManager(),
    },
  ]);
}