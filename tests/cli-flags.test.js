import assert from "node:assert/strict";
import { test } from "node:test";
import inquirer from "inquirer";
import {
  CliError,
  applyDefaults,
  getMissingFlags,
  hasStackFlags,
  parseCliArgs,
  suggestFlag,
} from "../utils/cliFlags.js";
import { gatherCustomConfig } from "../prompts/index.js";

const STACK_BUILDER_COMMAND = [
  "my-app", "--lang", "typescript", "--frontend", "nextjs", "--backend", "hono", "--runtime", "node",
  "--db", "postgres", "--db-provider", "supabase", "--orm", "prisma", "--pm", "pnpm",
];

function parseError(argv) {
  try {
    parseCliArgs(argv);
  } catch (err) {
    assert.ok(err instanceof CliError, `expected a CliError, got ${err}`);
    return err.messages;
  }
  assert.fail(`expected ${argv.join(" ")} to be rejected`);
}

/** Runs the wizard with `fixed` values, answering each prompt with its default. */
async function runWizard(fixed, responses = {}) {
  const originalPrompt = inquirer.prompt;
  const originalLog = console.log;
  const prompts = [];
  inquirer.prompt = async ([question]) => {
    prompts.push(question);
    const answer = responses[question.name] ?? question.default;
    return { [question.name]: answer };
  };
  console.log = () => {};
  try {
    return { config: await gatherCustomConfig(fixed), prompts };
  } finally {
    inquirer.prompt = originalPrompt;
    console.log = originalLog;
  }
}

// ── Valid full commands ──

test("the Stack Builder command parses to the internal config values", () => {
  const cli = parseCliArgs(STACK_BUILDER_COMMAND);

  assert.equal(cli.projectName, "my-app");
  assert.equal(cli.command, null);
  assert.deepEqual(cli.values, {
    language: "typescript",
    frontend: "nextjs",
    backend: "hono",
    runtime: "node",
    databaseType: "postgres",
    databaseProvider: "supabase",
    orm: "prisma",
    packageManager: "pnpm",
  });
  assert.equal(cli.yes, false);
  assert.equal(cli.install, true);
  assert.equal(cli.git, true);
});

test("full flags need no prompts and give the scaffolder's config shape", async () => {
  const { config, prompts } = await runWizard(parseCliArgs(STACK_BUILDER_COMMAND).values);

  assert.equal(prompts.length, 0);
  assert.deepEqual(config, {
    language: "typescript",
    frontend: "nextjs",
    backend: "hono",
    runtime: "node",
    database: { type: "postgres", provider: "supabase" },
    orm: "prisma",
  });
});

test("--flag=value, flags before the name, and '.' are accepted", () => {
  const cli = parseCliArgs(["--frontend=astro", "--backend=none", ".", "-y", "--no-install", "--no-git"]);

  assert.equal(cli.projectName, ".");
  assert.deepEqual(cli.values, { frontend: "astro", backend: "none" });
  assert.equal(cli.yes, true);
  assert.equal(cli.install, false);
  assert.equal(cli.git, false);
});

test("a frontend-only command with every value is valid", () => {
  const cli = parseCliArgs(["site", "--lang", "javascript", "--frontend", "astro", "--backend", "none", "--runtime", "bun", "--pm", "npm"]);
  assert.deepEqual(getMissingFlags(cli), []);
});

test("MongoDB with Mongoose via Docker is valid", () => {
  const cli = parseCliArgs(["app", "--backend", "express", "--db", "mongodb", "--db-provider", "docker", "--orm", "mongoose"]);
  assert.deepEqual(cli.values, { backend: "express", databaseType: "mongodb", databaseProvider: "docker", orm: "mongoose" });
});

test("quick templates take a name, --runtime and --pm", () => {
  const cli = parseCliArgs(["mern-ts", "shop", "--runtime", "bun", "--pm", "yarn"]);
  assert.equal(cli.command, "mern-ts");
  assert.equal(cli.projectName, "shop");
  assert.deepEqual(getMissingFlags(cli), []);
});

// ── Partial flags ──

test("partial flags prompt only for the missing values", async () => {
  const { config, prompts } = await runWizard({ frontend: "nextjs", backend: "express", databaseType: "sqlite" });

  // SQLite has a single provider, so its question is skipped too
  assert.deepEqual(prompts.map((q) => q.name), ["language", "runtime", "orm", "action"]);
  assert.equal(config.frontend, "nextjs");
  assert.equal(config.backend, "express");
  assert.deepEqual(config.database, { type: "sqlite", provider: "local" });
});

test("--backend none skips every database prompt", async () => {
  const { config, prompts } = await runWizard({ backend: "none" });

  assert.deepEqual(prompts.map((q) => q.name), ["language", "frontend", "runtime", "action"]);
  assert.deepEqual(config.database, { type: "none", provider: "" });
  assert.equal(config.orm, "none");
});

test("a database flag removes 'none' from the backend prompt", async () => {
  const { prompts } = await runWizard({ databaseType: "mongodb" });
  const backend = prompts.find((q) => q.name === "backend");

  assert.equal(backend.choices.some((choice) => choice.value === "none"), false);
});

test("--db alone prompts for its provider and ORM with the right choices", async () => {
  const { config, prompts } = await runWizard({ databaseType: "mysql" }, { provider: "docker" });

  assert.equal(prompts.some((q) => q.name === "databaseType"), false);
  assert.deepEqual(prompts.find((q) => q.name === "provider").choices.map((c) => c.value), ["docker", "local"]);
  assert.deepEqual(prompts.find((q) => q.name === "orm").choices.map((c) => c.value), ["prisma"]);
  assert.deepEqual(config.database, { type: "mysql", provider: "docker" });
});

test("Backspace from the first asked question doesn't land on a skipped step", async () => {
  const { prompts } = await runWizard({ language: "typescript", frontend: "nuxt" });
  assert.equal(prompts[0].name, "backend");
  assert.equal(prompts[0].canGoBack, false);
});

test("missing flags are listed for the no-TTY error", () => {
  assert.deepEqual(
    getMissingFlags(parseCliArgs(["--frontend", "nextjs"])),
    ["[project-name]", "--lang", "--backend", "--runtime", "--db", "--pm"]
  );
  // A frontend-only project doesn't need --db
  assert.deepEqual(getMissingFlags(parseCliArgs(["x", "--backend", "none"])), ["--lang", "--frontend", "--runtime", "--pm"]);
  // MongoDB has several providers and ORMs, SQLite has one of each
  assert.deepEqual(
    getMissingFlags(parseCliArgs(["x", "--lang", "typescript", "--frontend", "astro", "--backend", "hono", "--runtime", "node", "--db", "mongodb", "--pm", "npm"])),
    ["--db-provider", "--orm"]
  );
  assert.deepEqual(
    getMissingFlags(parseCliArgs(["x", "--lang", "typescript", "--frontend", "astro", "--backend", "hono", "--runtime", "node", "--db", "sqlite", "--pm", "npm"])),
    []
  );
  assert.deepEqual(getMissingFlags(parseCliArgs(["mern-js"])), ["[project-name]", "--runtime", "--pm"]);
});

test("--pm alone does not force the custom stack", () => {
  assert.equal(hasStackFlags(parseCliArgs(["--pm", "pnpm"]).values), false);
  assert.equal(hasStackFlags(parseCliArgs(["--runtime", "bun"]).values), true);
});

// ── Validation errors ──

const INVALID_VALUES = [
  ["--lang", "ts", "Invalid --lang \"ts\". Expected one of: typescript, javascript"],
  ["--frontend", "react", "Invalid --frontend \"react\". Expected one of: react-router, nextjs, nuxt, tanstack, astro, solid"],
  ["--backend", "koa", "Invalid --backend \"koa\". Expected one of: hono, fastify, express, none"],
  ["--runtime", "deno", "Invalid --runtime \"deno\". Expected one of: node, bun"],
  ["--db", "redis", "Invalid --db \"redis\". Expected one of: sqlite, mysql, postgres, mongodb, none"],
  ["--db-provider", "neon", "Invalid --db-provider \"neon\". Expected one of: supabase, docker, local, atlas"],
  ["--orm", "drizzle", "Invalid --orm \"drizzle\". Expected one of: prisma, mongoose"],
  ["--pm", "deno", "Invalid --pm \"deno\". Expected one of: npm, yarn, pnpm, bun"],
];

for (const [flag, value, message] of INVALID_VALUES) {
  test(`an invalid ${flag} lists the valid options`, () => {
    assert.deepEqual(parseError(["app", flag, value]), [message]);
  });
}

test("a flag without a value is rejected", () => {
  assert.deepEqual(parseError(["app", "--frontend"]), [
    "Missing value for --frontend. Expected one of: react-router, nextjs, nuxt, tanstack, astro, solid",
  ]);
  // The next flag is still parsed, so it isn't reported as a stray argument
  assert.deepEqual(parseError(["app", "--db", "--orm", "prisma"]), [
    "Missing value for --db. Expected one of: sqlite, mysql, postgres, mongodb, none",
  ]);
});

test("an unknown flag suggests the closest valid flag", () => {
  assert.deepEqual(parseError(["app", "--fronted", "nextjs"]), [
    "Unknown flag --fronted. Did you mean --frontend? Run celtrix --help to see every flag.",
  ]);
  assert.equal(suggestFlag("--database"), "--db");
  assert.equal(suggestFlag("--package-manager"), "--pm");
  assert.equal(suggestFlag("--framework"), "--frontend");
  assert.equal(suggestFlag("--lng"), "--lang");
  assert.equal(suggestFlag("--yse"), "--yes");
  assert.equal(suggestFlag("--db-providr"), "--db-provider");
  // A value used as a flag points at the flag that takes it
  assert.equal(suggestFlag("--nextjs"), "--frontend nextjs");
  assert.equal(suggestFlag("--typescript"), "--lang typescript");
});

test("a switch given a value is rejected", () => {
  assert.deepEqual(parseError(["app", "--yes=no"]), ["--yes does not take a value."]);
});

test("an invalid project name or a second positional is rejected", () => {
  assert.match(parseError(["my app!"])[0], /^Invalid project name "my app!"/);
  assert.deepEqual(parseError(["one", "two"]), ['Unexpected argument "two". Only one project name can be given.']);
});

test("quick templates reject flags for the stack they fix", () => {
  assert.deepEqual(parseError(["mern-js", "app", "--frontend", "nextjs"]), [
    "--frontend can't be used with the mern-js template, which sets its own stack.",
  ]);
});

test("every problem is reported at once", () => {
  assert.equal(parseError(["app", "--frontend", "react", "--pm", "deno", "--fronted"]).length, 3);
});

// ── Dependency errors ──

test("--db with --backend none is rejected", () => {
  assert.deepEqual(parseError(["app", "--backend", "none", "--db", "postgres"]), [
    "--db postgres needs a backend, but --backend is none. Choose a backend (hono, fastify, express) or use --db none.",
  ]);
  // --db none is fine without a backend
  assert.doesNotThrow(() => parseCliArgs(["app", "--backend", "none", "--db", "none"]));
});

test("--db-provider without --db is rejected", () => {
  assert.deepEqual(parseError(["app", "--db-provider", "supabase"]), ["--db-provider needs --db. Add --db postgres."]);
  assert.deepEqual(parseError(["app", "--db-provider", "docker"]), ["--db-provider needs --db. Add --db mysql|postgres|mongodb."]);
});

test("--orm without --db is rejected", () => {
  assert.deepEqual(parseError(["app", "--orm", "mongoose"]), ["--orm needs --db. Add --db mongodb."]);
  assert.deepEqual(parseError(["app", "--orm", "prisma"]), ["--orm needs --db. Add --db sqlite|mysql|postgres|mongodb."]);
});

test("a provider that the database doesn't offer is rejected", () => {
  assert.deepEqual(parseError(["app", "--db", "mysql", "--db-provider", "supabase"]), [
    'Invalid --db-provider "supabase" for --db mysql. Expected one of: docker, local',
  ]);
  assert.deepEqual(parseError(["app", "--db", "sqlite", "--db-provider", "docker"]), [
    'Invalid --db-provider "docker" for --db sqlite. Expected one of: local',
  ]);
  assert.deepEqual(parseError(["app", "--db", "postgres", "--db-provider", "atlas"]), [
    'Invalid --db-provider "atlas" for --db postgres. Expected one of: supabase, docker, local',
  ]);
});

test("an ORM that the database doesn't support is rejected", () => {
  assert.deepEqual(parseError(["app", "--orm", "mongoose", "--db", "postgres"]), [
    'Invalid --orm "mongoose" for --db postgres. Expected one of: prisma',
  ]);
});

test("a provider or ORM with --db none is rejected", () => {
  assert.deepEqual(parseError(["app", "--db", "none", "--db-provider", "local", "--orm", "prisma"]), [
    "--db-provider can't be used with --db none.",
    "--orm can't be used with --db none.",
  ]);
});

// ── --yes defaults ──

test("--yes with no stack flags uses the wizard defaults", () => {
  assert.deepEqual(applyDefaults({}, { packageManager: "npm" }), {
    language: "typescript",
    frontend: "react-router",
    backend: "hono",
    runtime: "node",
    database: { type: "postgres", provider: "supabase" },
    orm: "prisma",
    packageManager: "npm",
  });
});

test("--yes keeps given values and fills the rest", () => {
  const config = applyDefaults(parseCliArgs(["app", "--frontend", "solid", "--pm", "bun", "-y"]).values, { packageManager: "npm" });
  assert.equal(config.frontend, "solid");
  assert.equal(config.packageManager, "bun");
  assert.equal(config.backend, "hono");
});

test("--yes with --backend none sets no database", () => {
  const config = applyDefaults({ backend: "none" }, { packageManager: "pnpm" });
  assert.deepEqual(config.database, { type: "none", provider: "" });
  assert.equal(config.orm, "none");
  assert.equal(config.packageManager, "pnpm");
});

test("--yes picks the first provider and ORM for the chosen database", () => {
  assert.deepEqual(applyDefaults({ databaseType: "mongodb" }, { packageManager: "npm" }).database, { type: "mongodb", provider: "atlas" });
  assert.equal(applyDefaults({ databaseType: "mongodb" }, { packageManager: "npm" }).orm, "prisma");
  assert.deepEqual(applyDefaults({ databaseType: "mysql" }, { packageManager: "npm" }).database, { type: "mysql", provider: "docker" });
  assert.deepEqual(applyDefaults({ databaseType: "sqlite" }, { packageManager: "npm" }).database, { type: "sqlite", provider: "local" });
  assert.equal(applyDefaults({ databaseType: "none" }, { packageManager: "npm" }).orm, "none");
});
