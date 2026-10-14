import inquirer from "inquirer";
import chalk from "chalk";
import {
  createPrompt,
  isBackspaceKey,
  isDownKey,
  isEnterKey,
  isNumberKey,
  isSpaceKey,
  isUpKey,
  Separator,
  useKeypress,
  useState,
} from "@inquirer/core";

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

  useKeypress((key, readline) => {
    if (isBackspaceKey(key)) {
      if (config.canGoBack) done({ back: true });
    } else if (isEnterKey(key)) {
      setStatus("done");
      done(selectedChoice.value);
    } else if (isUpKey(key) || isDownKey(key)) {
      readline.clearLine(0);
      setActive(nextSelectable(choices, active, isUpKey(key) ? -1 : 1, config.loop !== false));
    } else if (isNumberKey(key)) {
      const numberedChoices = choices.filter(isSelectable);
      const next = Number(key.name) - 1;
      if (numberedChoices[next]) setActive(choices.indexOf(numberedChoices[next]));
      readline.clearLine(0);
    }
  });

  if (status === "done") {
    return `${chalk.green("✔")} ${config.message} ${chalk.cyan(selectedChoice.short ?? selectedChoice.name)}`;
  }

  const renderedChoices = choices.map((choice, index) => {
    if (Separator.isSeparator(choice)) return `  ${chalk.gray(choice.separator)}`;
    const cursor = index === active ? chalk.cyan("❯") : " ";
    const label = index === active ? chalk.cyan(choice.name) : choice.name;
    const disabled = choice.disabled ? chalk.dim(` (${choice.disabled === true ? "disabled" : choice.disabled})`) : "";
    return `${cursor} ${label}${disabled}`;
  });

  return `${chalk.cyan("?")} ${config.message}\n${renderedChoices.join("\n")}`;
});

const checkboxPrompt = createPrompt((config, done) => {
  const choices = config.choices;
  const available = choices.filter(isSelectable);
  if (available.length === 0) throw new Error("The checkbox prompt has no selectable choices.");

  const firstChoice = choices.findIndex(isSelectable);
  const [active, setActive] = useState(firstChoice);
  const [selected, setSelected] = useState(new Set(
    choices.filter((choice) => isSelectable(choice) && choice.checked).map((choice) => choice.value)
  ));
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const shortcuts = { all: "a", invert: "i", ...config.shortcuts };

  function selectedValues(selection = selected) {
    return choices.filter((choice) => isSelectable(choice) && selection.has(choice.value))
      .map((choice) => choice.value);
  }

  useKeypress(async (key) => {
    if (isBackspaceKey(key)) {
      if (config.canGoBack) done({ back: true, addons: selectedValues() });
    } else if (isEnterKey(key)) {
      const values = selectedValues();
      const validation = config.validate ? await config.validate(values) : true;
      if (config.required && values.length === 0) {
        setError("At least one choice must be selected");
      } else if (validation === true) {
        setStatus("done");
        done(values);
      } else {
        setError(validation || "You must select a valid value");
      }
    } else if (isUpKey(key) || isDownKey(key)) {
      setActive(nextSelectable(choices, active, isUpKey(key) ? -1 : 1, config.loop !== false));
    } else if (isSpaceKey(key)) {
      setError("");
      const next = new Set(selected);
      if (next.has(choices[active].value)) next.delete(choices[active].value);
      else next.add(choices[active].value);
      setSelected(next);
    } else if (key.name === shortcuts.all || key.name === shortcuts.invert) {
      const selectAll = key.name === shortcuts.all && choices.some(
        (choice) => isSelectable(choice) && !selected.has(choice.value)
      );
      setSelected(new Set(choices.filter(isSelectable)
        .filter((choice) => key.name === shortcuts.invert ? !selected.has(choice.value) : selectAll)
        .map((choice) => choice.value)));
    }
  });

  if (status === "done") {
    const labels = choices.filter((choice) => selected.has(choice.value)).map((choice) => choice.short ?? choice.name);
    return `${chalk.green("✔")} ${config.message} ${chalk.cyan(labels.join(", "))}`;
  }

  const renderedChoices = choices.map((choice, index) => {
    if (Separator.isSeparator(choice)) return `  ${chalk.gray(choice.separator)}`;
    const cursor = index === active ? chalk.cyan("❯") : " ";
    const checkbox = selected.has(choice.value) ? chalk.green("◉") : "◯";
    const label = index === active ? chalk.cyan(choice.name) : choice.name;
    const disabled = choice.disabled ? chalk.dim(` (${choice.disabled === true ? "disabled" : choice.disabled})`) : "";
    return `${cursor} ${checkbox} ${label}${disabled}`;
  });

  return [
    `${chalk.cyan("?")} ${config.message}\n${renderedChoices.join("\n")}`,
    error ? chalk.red(`! ${error}`) : undefined,
  ];
});

export function registerNavigationPrompts(promptModule = inquirer) {
  promptModule.registerPrompt("celtrixList", listPrompt);
  promptModule.registerPrompt("celtrixCheckbox", checkboxPrompt);
  return promptModule;
}

export function isBackNavigation(answer) {
  return answer?.back === true;
}

registerNavigationPrompts();