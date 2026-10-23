import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { writeReactWelcomePage } from "../utils/welcomePage.js";

function makeViteClient() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "celtrix-welcome-"));
  const client = path.join(root, "my-app", "client");
  fs.mkdirSync(path.join(client, "src"), { recursive: true });
  // what create-vite leaves behind
  fs.writeFileSync(path.join(client, "src", "App.jsx"), "export default function App() { return <h1>Vite + React</h1> }");
  fs.writeFileSync(path.join(client, "src", "App.css"), "#root { max-width: 1280px; }");
  fs.writeFileSync(path.join(client, "src", "index.css"), "body { display: flex; }");
  return client;
}

const read = (client, file) => fs.readFileSync(path.join(client, "src", file), "utf-8");

test("replaces the stock Vite page in a JavaScript project", () => {
  const client = makeViteClient();

  const written = writeReactWelcomePage(client, { projectName: "shop", stack: "mern", typescript: false });

  assert.equal(written, true);
  const app = read(client, "App.jsx");
  assert.ok(!app.includes("Vite + React"));
  assert.ok(app.includes('const PROJECT = "shop"'));
  assert.ok(app.includes('const STACK = "mern"'));
  assert.ok(app.includes("function TodoPanel"));
  assert.ok(app.includes("function RegisterPanel"));
  assert.ok(app.includes('className="powered-badge"'));
  assert.ok(!app.includes("__PROJECT_NAME__") && !app.includes("__STACK__"));
  assert.ok(!read(client, "App.css").includes("max-width: 1280px"));
  assert.ok(!read(client, "index.css").includes("display: flex"));
});

test("writes App.tsx for TypeScript projects", () => {
  const client = makeViteClient();

  writeReactWelcomePage(client, { projectName: "shop", stack: "hono", typescript: true });

  const app = read(client, "App.tsx");
  assert.ok(app.includes("type TodoItem"));
  assert.ok(app.includes('const STACK = "hono"'));
  assert.ok(app.includes("src/App.tsx"));
});

test("keeps the badge styles in index.css next to the theme variables", () => {
  const client = makeViteClient();

  writeReactWelcomePage(client, { projectName: "shop", stack: "mern", typescript: false });

  const css = read(client, "index.css");
  assert.ok(css.includes("--green: #4ade80"));
  assert.ok(css.includes(".powered-badge"));
  // ensureTailwindImport inserts its import before :root, so it must be there
  assert.match(css, /:root\s*{/);
});

test("inserts project names with quotes and $ patterns literally", () => {
  const client = makeViteClient();
  const name = `it's $& "weird" $1`;

  writeReactWelcomePage(client, { projectName: name, stack: "mern", typescript: false });

  assert.ok(read(client, "App.jsx").includes(`const PROJECT = ${JSON.stringify(name)}`));
});

test("uses the folder name when the project is scaffolded into '.'", () => {
  const client = makeViteClient();

  writeReactWelcomePage(client, { projectName: ".", stack: "mern", typescript: false });

  assert.ok(read(client, "App.jsx").includes('const PROJECT = "my-app"'));
});

test("returns false and writes nothing when there is no src folder", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "celtrix-welcome-"));

  const written = writeReactWelcomePage(root, { projectName: "shop", stack: "mern", typescript: false });

  assert.equal(written, false);
  assert.deepEqual(fs.readdirSync(root), []);
});
