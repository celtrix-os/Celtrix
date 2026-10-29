import inquirer from "inquirer";
import chalk from "chalk";
import readline from "node:readline";
import { stripVTControlCharacters } from "node:util";
import {
  createPrompt,
  isBackspaceKey,
  isDownKey,
  isEnterKey,
  isNumberKey,
  isUpKey,
  Separator,
  useKeypress,
  useState,
} from "@inquirer/core";

const BACK_HINT = chalk.dim("  ⌫ Press Backspace to go back to the previous question");

// Rows written to the terminal by the wizard, so going back can erase
// everything printed since the previous question was asked.
let rowsWritten = 0;

// An empty render still occupies two rows: inquirer pads a zero-length
// prompt line with a newline, then adds another when the prompt is done.
const CLEARED_PROMPT_ROWS = 2;

function terminalWidth() {
  return process.stdout.columns || 80;
}

function countRows(text) {
  const width = terminalWidth();
  return stripVTControlCharacters(text).split("\n")
    .reduce((rows, line) => rows + Math.floor(line.length / width) + 1, 0);
}

export function logLine(text = "") {
  console.log(text);
  rowsWritten += countRows(text);
}

export function outputMark() {
  return rowsWritten;
}

export function eraseOutputTo(mark) {
  const rows = rowsWritten - mark;
  if (rows > 0 && process.stdout.isTTY) {
    readline.moveCursor(process.stdout, 0, -rows);
    readline.cursorTo(process.stdout, 0);
    readline.clearScreenDown(process.stdout);
  }
  rowsWritten = Math.min(rowsWritten, mark);
}

function isSelectable(choice) {
  return !Separator.isSeparator(choice) && !choice.disabled;
}

function nextSelectable(choices, current, offset, loop) {
  let next = current;
  for (let count = 0; count < choices.length; count++) {
    next += offset;
    if (loop) next = (next + choices.length) % choices.length;
    if (next >= 0 && next < choices.length && isSelectable(choices[next])) return next;
    if (!loop && (next < 0 || next >= choices.length)) return current;
  }
  return current;
}

const listPrompt = createPrompt((config, done) => {
  const choices = config.choices;
  const available = choices.filter(isSelectable);
  if (available.length === 0) throw new Error("The list prompt has no selectable choices.");

  const defaultIndex = choices.findIndex((choice) => isSelectable(choice) && choice.value === config.default);
  const [active, setActive] = useState(defaultIndex === -1
    ? choices.findIndex(isSelectable)
    : defaultIndex);
  const [status, setStatus] = useState("idle");
  const selectedChoice = choices[active];
  const doneLine = () => `${chalk.green("✔")} ${config.message} ${chalk.cyan(selectedChoice.short ?? selectedChoice.name)}`;

  useKeypress((key, rl) => {
    if (isBackspaceKey(key)) {
      if (config.canGoBack) {
        // Clear the prompt so the previous question replaces it.
        setStatus("back");
        rowsWritten += CLEARED_PROMPT_ROWS;
        done({ back: true });
      }
    } else if (isEnterKey(key)) {
      setStatus("done");
      rowsWritten += countRows(doneLine());
      done(selectedChoice.value);
    } else if (isUpKey(key) || isDownKey(key)) {
      rl.clearLine(0);
      setActive(nextSelectable(choices, active, isUpKey(key) ? -1 : 1, config.loop !== false));
    } else if (isNumberKey(key)) {
      const numberedChoices = choices.filter(isSelectable);
      const next = Number(key.name) - 1;
      if (numberedChoices[next]) setActive(choices.indexOf(numberedChoices[next]));
      rl.clearLine(0);
    }
  });

  if (status === "back") return "";
  if (status === "done") return doneLine();

  const renderedChoices = choices.map((choice, index) => {
    if (Separator.isSeparator(choice)) return `  ${chalk.gray(choice.separator)}`;
    const cursor = index === active ? chalk.cyan("❯") : " ";
    const label = index === active ? chalk.cyan(choice.name) : choice.name;
    const disabled = choice.disabled ? chalk.dim(` (${choice.disabled === true ? "disabled" : choice.disabled})`) : "";
    return `${cursor} ${label}${disabled}`;
  });

  const hint = config.canGoBack ? `\n${config.backHint ?? BACK_HINT}` : "";
  return `${chalk.cyan("?")} ${config.message}\n${renderedChoices.join("\n")}${hint}`;
});

export function registerNavigationPrompts(promptModule = inquirer) {
  promptModule.registerPrompt("celtrixList", listPrompt);
  return promptModule;
}

export function isBackNavigation(answer) {
  return answer?.back === true;
}

registerNavigationPrompts();