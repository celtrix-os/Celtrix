import chalk from "chalk";

const isVerbose =
  process.argv.includes("--verbose") || process.env.DEBUG === "celtrix";

export const logger = {
  info: (msg) => console.log(chalk.blue(msg)),
  success: (msg) => console.log(chalk.green(msg)),
  warn: (msg) => console.log(chalk.yellow(msg)),
  error: (msg) => console.log(chalk.red(msg)),

  /**
   * Prints a debug message — only visible with --verbose flag or DEBUG=celtrix.
   *
   * @param {string} msg
   */
  debug: (msg) => {
    if (isVerbose) {
      console.log(chalk.gray(`[debug] ${msg}`));
    }
  },

  /**
   * Prints a step progress label:  [n/total] message
   *
   * @param {number} current - Current step number.
   * @param {number} total - Total number of steps.
   * @param {string} msg - Description of the step.
   */
  step: (current, total, msg) => {
    const label = chalk.dim(`[${current}/${total}]`);
    console.log(`\n${label} ${chalk.bold(msg)}`);
  },
};
