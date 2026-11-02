import chalk from "chalk";
import { isVerbose, getActiveSpinner, setPhaseDetail, printAboveSpinner, appendLog } from "./progress.js";

/**
 * While a progress phase is running, informational messages become the
 * phase's sub-status instead of new lines, and warnings/errors are printed
 * above the spinner so the progress display stays intact.
 *
 * @param {Function} color - chalk color function.
 * @returns {(msg: string) => void}
 */
const status = (color) => (msg) => {
  appendLog(msg);
  if (getActiveSpinner() && !isVerbose) {
    setPhaseDetail(msg);
  } else {
    console.log(color(msg));
  }
};

const notice = (color) => (msg) => {
  appendLog(msg);
  printAboveSpinner(() => console.log(color(msg)));
};

export const logger = {
  info: status(chalk.blue),
  success: status(chalk.green),
  warn: notice(chalk.yellow),
  error: notice(chalk.red),

  /**
   * Prints a debug message — only visible with --verbose flag or DEBUG=celtrix.
   *
   * @param {string} msg
   */
  debug: (msg) => {
    if (isVerbose) {
      printAboveSpinner(() => console.log(chalk.gray(`[debug] ${msg}`)));
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
