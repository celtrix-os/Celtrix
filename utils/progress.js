import { spawn } from "child_process";
import fs from "fs";
import os from "os";
import path from "path";
import chalk from "chalk";
import ora from "ora";

/**
 * --verbose (or DEBUG=celtrix) streams raw subprocess output straight to the
 * terminal instead of capturing it, and disables spinner animation so the two
 * never overlap.
 */
export const isVerbose =
  process.argv.includes("--verbose") || process.env.DEBUG === "celtrix";

/** Number of trailing output lines shown when a command fails. */
const ERROR_TAIL_LINES = 15;

let activeSpinner = null;
let sessionLog = [];

/**
 * Returns the spinner of the phase currently running, or null.
 * The logger uses this to print around the spinner instead of through it.
 */
export function getActiveSpinner() {
  return activeSpinner;
}

/**
 * Appends a line to the in-memory session log (written to disk on failure).
 *
 * @param {string} line
 */
export function appendLog(line) {
  sessionLog.push(line);
}

/**
 * Shows a short sub-status next to the active phase, e.g.
 *   ⠋ Generating frontend application  📦 Installing Frontend dependencies...
 *
 * @param {string} msg
 */
export function setPhaseDetail(msg) {
  if (!activeSpinner) return;
  const maxWidth = (process.stderr.columns || 80) - activeSpinner.text.length - 6;
  const detail = msg.replace(/\s+/g, " ").trim();
  activeSpinner.suffixText =
    maxWidth > 10
      ? chalk.dim(detail.length > maxWidth ? `${detail.slice(0, maxWidth - 1)}…` : detail)
      : "";
}

/**
 * Prints a line above the active spinner without corrupting it.
 *
 * @param {Function} print - Callback that writes the line.
 */
export function printAboveSpinner(print) {
  if (activeSpinner?.isSpinning) {
    activeSpinner.clear();
    print();
    activeSpinner.render();
  } else {
    print();
  }
}

/**
 * Runs a shell command asynchronously (so spinners keep animating), capturing
 * stdout/stderr into the session log. In verbose mode the output is streamed
 * to the terminal instead.
 *
 * Rejects with an Error carrying `command`, `exitCode` and `output` when the
 * command exits non-zero or cannot be started.
 *
 * @param {string} command - Shell command to run.
 * @param {object} [options]
 * @param {string} [options.cwd] - Working directory.
 * @returns {Promise<string>} Captured output.
 */
export function run(command, { cwd } = {}) {
  appendLog(`\n$ ${command}${cwd ? `   (in ${cwd})` : ""}`);

  return new Promise((resolve, reject) => {
    const child = spawn(command, {
      cwd,
      shell: true,
      stdio: isVerbose ? "inherit" : ["ignore", "pipe", "pipe"],
    });

    let output = "";
    const collect = (chunk) => {
      const text = chunk.toString();
      output += text;
      appendLog(text.replace(/\n$/, ""));
    };
    child.stdout?.on("data", collect);
    child.stderr?.on("data", collect);

    child.on("error", (err) => {
      const error = new Error(`Failed to start "${command}": ${err.message}`);
      Object.assign(error, { command, exitCode: null, output });
      reject(error);
    });

    child.on("close", (code, signal) => {
      if (code === 0) {
        resolve(output);
        return;
      }
      const reason = signal ? `was terminated by ${signal}` : `exited with code ${code}`;
      const error = new Error(`Command "${command}" ${reason}`);
      Object.assign(error, { command, exitCode: code, output });
      reject(error);
    });
  });
}

/**
 * Writes the captured session log to a temp file and returns its path.
 *
 * @returns {string|null}
 */
function writeSessionLog() {
  try {
    const logPath = path.join(os.tmpdir(), `celtrix-${Date.now()}.log`);
    fs.writeFileSync(logPath, sessionLog.join("\n") + "\n", "utf-8");
    return logPath;
  } catch {
    return null;
  }
}

/**
 * Runs one scaffolding phase behind a live spinner.
 *
 *   ⠋ title   while running
 *   ✔ title   on success
 *   ✖ title   on failure (followed by the tail of the command output)
 *
 * The error is re-thrown so existing reporting, cleanup and exit codes still apply.
 *
 * @param {string} title - Phase label.
 * @param {Function} task - Sync or async function performing the work.
 */
export async function runPhase(title, task) {
  // Phases are sequential; finish a dangling spinner rather than overlap it.
  if (activeSpinner) {
    activeSpinner.stop();
  }

  appendLog(`\n=== ${title} ===`);
  // Some pseudo-TTYs report 0 columns, which makes ora's redraw loop forever.
  const canAnimate = !isVerbose && Boolean(process.stderr.columns);
  const spinner = ora({
    text: title,
    spinner: "dots",
    isEnabled: canAnimate ? undefined : false,
  }).start();
  activeSpinner = spinner;

  try {
    const result = await task();
    spinner.suffixText = "";
    spinner.succeed(title);
    return result;
  } catch (error) {
    spinner.suffixText = "";
    spinner.fail(chalk.red(title));

    if (!isVerbose && error.output) {
      const tail = error.output.trimEnd().split(/\r?\n/).slice(-ERROR_TAIL_LINES);
      console.log(chalk.gray(tail.map((line) => `  │ ${line}`).join("\n")));
    }
    if (!isVerbose) {
      const logPath = writeSessionLog();
      if (logPath) console.log(chalk.gray(`  Full log: ${logPath}  (re-run with --verbose to stream output)`));
    }
    throw error;
  } finally {
    activeSpinner = null;
  }
}
