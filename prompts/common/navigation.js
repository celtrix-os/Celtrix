import chalk from "chalk";

export const BACK = "__celtrix_back__";

export function addBackChoice(choices, canGoBack) {
  return canGoBack
    ? [...choices, { name: chalk.cyan("← Back"), value: BACK }]
    : choices;
}