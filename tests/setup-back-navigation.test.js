import assert from "node:assert/strict";
import { test } from "node:test";
import inquirer from "inquirer";
import { gatherCustomConfig } from "../prompts/index.js";
import { BACK } from "../prompts/common/navigation.js";

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
      answer = question.choices.find((choice) => choice.value === BACK)?.value;
      assert.notEqual(answer, undefined, `${question.name} should offer Back`);
    } else if (answer === undefined) {
      answer = question.type === "checkbox"
        ? question.choices.filter((choice) => choice.checked).map((choice) => choice.value)
        : question.default;
    }

    if (question.type !== "checkbox") {
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

function choicesFor(prompts, name, occurrence = 0) {
  return prompts.filter((question) => question.name === name)[occurrence].choices;
}

test("Back returns to the previous question and retains its selection", async () => {
  const { config, prompts } = await runWizard({
    frontend: ["nextjs"],
    runtime: ["bun"],
    databaseType: ["back", "postgres"],
  });

  assert.equal(prompts[0].name, "language");
  assert.equal(prompts[0].choices.some((choice) => choice.value === BACK), false);
  assert.ok(choicesFor(prompts, "frontend").some((choice) => choice.value === BACK));
  assert.equal(prompts.filter((question) => question.name === "runtime")[1].default, "bun");
  assert.equal(config.frontend, "nextjs");
  assert.equal(config.runtime, "bun");
  assert.equal(config.database.type, "postgres");
  assert.equal(JSON.stringify(config).includes(BACK), false);
});

test("repeated Back navigation allows changing an earlier answer", async () => {
  const { config, prompts } = await runWizard({
    backend: ["express", "hono"],
    runtime: ["bun", "back"],
    databaseType: ["back"],
  });

  assert.equal(prompts.filter((question) => question.name === "backend")[1].default, "express");
  assert.equal(prompts.filter((question) => question.name === "runtime")[1].default, "bun");
  assert.equal(config.backend, "hono");
  assert.equal(config.runtime, "bun");
  assert.equal(JSON.stringify(config).includes(BACK), false);
});

test("changing language re-evaluates dependent prompts and preserves valid values", async () => {
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
  assert.equal(JSON.stringify(config).includes(BACK), false);
});

test("Back at confirmation returns to add-ons and continues with the saved selection", async () => {
  const { config, prompts } = await runWizard({
    addons: [["biome"]],
    action: ["back", "continue"],
  });

  assert.equal(prompts.filter((question) => question.name === "action").length, 2);
  assert.equal(prompts.filter((question) => question.name === "addons")[1].choices.find(
    (choice) => choice.value === "biome"
  ).checked, true);
  assert.deepEqual(config.addons, ["biome"]);
});

test("Back from add-ons preserves checked selections without storing the action", async () => {
  const { config, prompts } = await runWizard({
    auth: ["back", "none"],
    api: ["back"],
    addons: [["biome", BACK]],
  });

  const addonQuestions = prompts.filter((question) => question.name === "addons");
  assert.equal(addonQuestions.length, 2);
  assert.equal(addonQuestions[1].choices.find((choice) => choice.value === "biome").checked, true);
  assert.deepEqual(config.addons, ["biome"]);
  assert.equal(JSON.stringify(config).includes(BACK), false);
});