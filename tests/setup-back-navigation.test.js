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
    if (answer === "back") {
      answer = { back: true };
    } else if (answer === undefined) {
      answer = question.default;
    }

    if (!isBackNavigation(answer)) {
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
  assert.deepEqual(
    prompts.filter((question) => question.name === "provider").map((question) => question.default),
    ["supabase", "supabase"]
  );
  assert.deepEqual(
    prompts.find((question) => question.name === "orm").choices.map((choice) => choice.value),
    ["prisma"]
  );
});

test("changing from no backend recalculates the database and ORM steps", async () => {
  const { config, prompts } = await runWizard({
    backend: ["none", "express"],
    runtime: [undefined, "back"],
    action: ["back"],
    databaseType: ["postgres"],
  });

  assert.equal(config.backend, "express");
  assert.equal(config.database.type, "postgres");
  assert.equal(config.orm, "prisma");
  assert.equal(prompts.filter((question) => question.name === "databaseType").length, 1);
  assert.ok(prompts.at(-1).name === "action");
});

test("normal forward navigation reaches confirmation with a clean config", async () => {
  const { config, prompts } = await runWizard({
    language: ["javascript"],
    frontend: ["nextjs"],
    backend: ["express"],
    runtime: ["bun"],
    databaseType: ["sqlite"],
    action: ["continue"],
  });

  assert.equal(prompts.at(-1).name, "action");
  assert.equal(config.language, "javascript");
  assert.equal(config.frontend, "nextjs");
  assert.equal(config.backend, "express");
  assert.equal(config.runtime, "bun");
  // SQLite has a single provider, so the provider question is skipped
  assert.equal(prompts.filter((question) => question.name === "provider").length, 0);
  assert.deepEqual(config.database, { type: "sqlite", provider: "local" });
  assert.equal(prompts.filter((question) => question.name === "orm").length, 1);
  assert.equal(config.orm, "prisma");
  assert.equal(JSON.stringify(config).includes("__celtrix_back__"), false);
});

test("MongoDB asks to choose between Prisma and Mongoose", async () => {
  const { config, prompts } = await runWizard({
    databaseType: ["mongodb"],
    provider: ["atlas"],
    orm: ["mongoose"],
    action: ["continue"],
  });

  assert.deepEqual(
    prompts.find((question) => question.name === "orm").choices.map((choice) => choice.value),
    ["prisma", "mongoose"]
  );
  assert.deepEqual(config.database, { type: "mongodb", provider: "atlas" });
  assert.equal(config.orm, "mongoose");
});

test("Docker is offered as a provider for server databases", async () => {
  const { config, prompts } = await runWizard({
    databaseType: ["mysql"],
    provider: ["docker"],
    action: ["continue"],
  });

  assert.deepEqual(
    prompts.find((question) => question.name === "provider").choices.map((choice) => choice.value),
    ["docker", "local"]
  );
  assert.deepEqual(config.database, { type: "mysql", provider: "docker" });
});
