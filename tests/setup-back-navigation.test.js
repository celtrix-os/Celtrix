import assert from "node:assert/strict";
import { PassThrough, Writable } from "node:stream";
import { test } from "node:test";
import inquirer from "inquirer";
import { gatherCustomConfig } from "../prompts/index.js";
import { isBackNavigation, registerNavigationPrompts } from "../prompts/common/navigation.js";

async function runWizard(responses = {}) {
  const originalPrompt = inquirer.prompt;
  const originalLog = console.log;
  const queues = new Map(Object.entries(responses).map(([name, values]) => [name, [...values]]));
  const prompts = [];

  inquirer.prompt = async ([question]) => {
    prompts.push(question);
    const queue = queues.get(question.name) ?? [];
    const planned = queue.shift();
    queues.set(question.name, queue);

    let answer = planned;
    if (answer === "back" || (question.type === "celtrixCheckbox" && Array.isArray(answer) && answer.includes("back"))) {
      const selectedAddons = Array.isArray(answer)
        ? answer.filter((value) => value !== "back")
        : question.choices.filter((choice) => choice.checked).map((choice) => choice.value);
      answer = question.type === "celtrixCheckbox"
        ? {
          back: true,
          addons: selectedAddons,
        }
        : { back: true };
    } else if (answer === undefined) {
      answer = question.type === "celtrixCheckbox"
        ? question.choices.filter((choice) => choice.checked).map((choice) => choice.value)
        : question.default;
    }

    if (question.type === "celtrixCheckbox" && !isBackNavigation(answer)) {
      assert.ok(Array.isArray(answer), `${question.name} should return checked choices`);
    } else if (!isBackNavigation(answer)) {
      assert.ok(
        question.choices.some((choice) => choice.value === answer),
        `${question.name} should include its selected value`
      );
    }

    return { [question.name]: answer };
  };
  console.log = () => {};

  try {
    return { config: await gatherCustomConfig(), prompts };
  } finally {
    inquirer.prompt = originalPrompt;
    console.log = originalLog;
  }
}

async function runPromptWithKeys(question, keys) {
  const input = new PassThrough();
  let markRendered;
  const rendered = new Promise((resolve) => {
    markRendered = resolve;
  });
  const output = new Writable({
    write(_chunk, _encoding, callback) {
      markRendered();
      callback();
    },
  });
  const prompt = inquirer.createPromptModule({ input, output });
  registerNavigationPrompts(prompt);

  const answersPromise = prompt([question]);
  await rendered;
  for (const key of keys) {
    input.write(key);
    await new Promise((resolve) => setImmediate(resolve));
  }
  const answers = await answersPromise;
  input.end();
  return answers[question.name];
}

test("no setup menu adds a Back choice", async () => {
  const { prompts } = await runWizard();

  for (const question of prompts) {
    assert.equal(
      question.choices.some((choice) => String(choice.name).includes("Back") || String(choice.name).includes("←")),
      false,
      `${question.name} should not display a Back choice`
    );
  }
});

test("Backspace returns a navigation result and does not become a choice value", async () => {
  const result = await runPromptWithKeys({
    type: "celtrixList",
    name: "choice",
    message: "Select an option:",
    canGoBack: true,
    choices: [{ name: "First", value: "first" }],
  }, [String.fromCharCode(127)]);

  assert.deepEqual(result, { back: true });
});

test("the user can change an earlier answer and continue", async () => {
  const { config, prompts } = await runWizard({
    backend: ["express", "hono"],
    runtime: ["bun", "back"],
    databaseType: ["back"],
  });

  assert.equal(prompts.filter((question) => question.name === "backend")[1].default, "express");
  assert.equal(prompts.filter((question) => question.name === "runtime")[1].default, "bun");
  assert.equal(config.backend, "hono");
  assert.equal(config.runtime, "bun");
});

test("repeated Backspace navigation uses the displayed question history", async () => {
  const { config, prompts } = await runWizard({
    backend: ["express", "hono"],
    runtime: ["bun", "back"],
    databaseType: ["back"],
  });

  assert.equal(prompts.filter((question) => question.name === "backend").length, 2);
  assert.equal(prompts.filter((question) => question.name === "runtime").length, 3);
  assert.equal(config.backend, "hono");
  assert.equal(config.runtime, "bun");
});

test("Backspace on the first question stays on that question", async () => {
  const answer = await runPromptWithKeys({
    type: "celtrixList",
    name: "language",
    message: "Select a language:",
    canGoBack: false,
    default: "typescript",
    choices: [
      { name: "TypeScript", value: "typescript" },
      { name: "JavaScript", value: "javascript" },
    ],
  }, [String.fromCharCode(127), "\r"]);

  assert.equal(answer, "typescript");
});

test("conditional questions are recalculated when the language changes", async () => {
  const { config, prompts } = await runWizard({
    language: ["typescript", "javascript"],
    frontend: ["nextjs", "back"],
    backend: ["hono", "back"],
    runtime: ["bun", "back"],
    databaseType: ["postgres", "back"],
    provider: ["back"],
  });

  assert.equal(config.language, "javascript");
  assert.equal(config.frontend, "nextjs");
  assert.equal(config.runtime, "bun");
  assert.equal(config.orm, "prisma");
  assert.equal(config.api, "none");
  assert.deepEqual(
    prompts.filter((question) => question.name === "provider").map((question) => question.default),
    ["neon", "neon"]
  );
  assert.equal(prompts.filter((question) => question.name === "orm").length, 0);
  assert.equal(prompts.filter((question) => question.name === "api").length, 0);
  assert.ok(prompts.filter((question) => question.name === "auth").at(-1).choices.some(
    (choice) => choice.value === "clerk"
  ));
});

test("changing from no backend recalculates database, ORM, API, and auth steps", async () => {
  const { config, prompts } = await runWizard({
    backend: ["none", "express"],
    runtime: ["back"],
    auth: ["back"],
    databaseType: ["postgres"],
  });

  assert.equal(config.backend, "express");
  assert.equal(config.database.type, "postgres");
  assert.ok(prompts.some((question) => question.name === "orm"));
  assert.ok(prompts.some((question) => question.name === "api"));
  assert.equal(prompts.filter((question) => question.name === "auth").length, 2);
  assert.ok(prompts.at(-1).name === "action");
});

test("checkbox Backspace preserves in-progress and previously saved selections", async () => {
  const choices = [
    { name: "Biome", value: "biome", checked: true },
    { name: "Husky", value: "husky", checked: false },
  ];
  const result = await runPromptWithKeys({
    type: "celtrixCheckbox",
    name: "addons",
    message: "Select add-ons:",
    canGoBack: true,
    choices,
  }, ["\x1b[B", " ", String.fromCharCode(127)]);

  assert.deepEqual(result, { back: true, addons: ["biome", "husky"] });

  const revisited = await runPromptWithKeys({
    type: "celtrixCheckbox",
    name: "addons",
    message: "Select add-ons:",
    canGoBack: true,
    choices: choices.map((choice) => ({ ...choice, checked: result.addons.includes(choice.value) })),
  }, ["\r"]);
  assert.deepEqual(revisited, result.addons);
});

test("revisiting add-ons restores choices and Backspace is not stored in config", async () => {
  const { config, prompts } = await runWizard({
    auth: ["back", "none"],
    api: ["back"],
    addons: [["biome", "back"]],
  });

  const addonQuestions = prompts.filter((question) => question.name === "addons");
  assert.equal(addonQuestions.length, 2);
  assert.equal(addonQuestions[1].choices.find((choice) => choice.value === "biome").checked, true);
  assert.deepEqual(config.addons, ["biome"]);
  assert.equal(JSON.stringify(config).includes('"back"'), false);
  assert.equal(JSON.stringify(config).includes("Backspace"), false);
});

test("normal forward navigation reaches confirmation with a clean config", async () => {
  const { config, prompts } = await runWizard({
    language: ["javascript"],
    frontend: ["nextjs"],
    backend: ["express"],
    runtime: ["bun"],
    databaseType: ["sqlite"],
    provider: ["turso"],
    addons: [["biome", "husky"]],
    action: ["continue"],
  });

  assert.equal(prompts.at(-1).name, "action");
  assert.equal(config.language, "javascript");
  assert.equal(config.frontend, "nextjs");
  assert.equal(config.backend, "express");
  assert.equal(config.runtime, "bun");
  assert.deepEqual(config.database, { type: "sqlite", provider: "turso" });
  assert.deepEqual(config.addons, ["biome", "husky"]);
  assert.equal(JSON.stringify(config).includes("__celtrix_back__"), false);
});