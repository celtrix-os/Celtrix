import assert from "node:assert/strict";
import { test } from "node:test";
import { buildHonoCommand } from "../utils/shared.js";
import { buildHonoCommand as installerBuildHonoCommand } from "../utils/installer.js";

test("buildHonoCommand is exported from both shared.js and installer.js", () => {
  assert.equal(typeof buildHonoCommand, "function");
  assert.equal(typeof installerBuildHonoCommand, "function");
  assert.equal(buildHonoCommand, installerBuildHonoCommand);
});

test("buildHonoCommand generates the correct command for npm", () => {
  const cmd = buildHonoCommand({ packageManager: "npm" });
  assert.equal(cmd, "npm create hono@latest server -- --template cloudflare-workers --pm npm");
});

test("buildHonoCommand generates the correct command for pnpm", () => {
  const cmd = buildHonoCommand({ packageManager: "pnpm" });
  assert.equal(cmd, "pnpm create hono@latest server --template cloudflare-workers --pm pnpm");
});

test("buildHonoCommand generates the correct command for yarn", () => {
  const cmd = buildHonoCommand({ packageManager: "yarn" });
  assert.equal(cmd, "yarn create hono server --template cloudflare-workers --pm yarn");
});

test("buildHonoCommand generates the correct command for bun", () => {
  const cmd = buildHonoCommand({ packageManager: "bun" });
  assert.equal(cmd, "bun create hono@latest server --template cloudflare-workers --pm bun");
});

test("buildHonoCommand falls back to npm when packageManager is missing or unsupported", () => {
  assert.equal(
    buildHonoCommand({}),
    "npm create hono@latest server -- --template cloudflare-workers --pm npm"
  );
  assert.equal(
    buildHonoCommand(undefined),
    "npm create hono@latest server -- --template cloudflare-workers --pm npm"
  );
  assert.equal(
    buildHonoCommand({ packageManager: "unknown" }),
    "npm create hono@latest server -- --template cloudflare-workers --pm npm"
  );
});

test("buildHonoCommand supports custom templates and target directories", () => {
  assert.equal(
    buildHonoCommand({ packageManager: "pnpm" }, "nodejs", "api"),
    "pnpm create hono@latest api --template nodejs --pm pnpm"
  );
  assert.equal(
    buildHonoCommand({ packageManager: "npm" }, "nodejs", "api"),
    "npm create hono@latest api -- --template nodejs --pm npm"
  );
  assert.equal(
    buildHonoCommand({ packageManager: "yarn" }, "nodejs", "api"),
    "yarn create hono api --template nodejs --pm yarn"
  );
  assert.equal(
    buildHonoCommand({ packageManager: "bun" }, "nodejs", "api"),
    "bun create hono@latest api --template nodejs --pm bun"
  );
});
