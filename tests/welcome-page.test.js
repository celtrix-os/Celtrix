import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { writeWelcomePage } from "../utils/welcomePage.js";

// Files each starter leaves behind, matching what create-vite / sv create generate.
const STARTERS = {
  react: { "src/App.jsx": "<h1>Vite + React</h1>", "src/App.css": "#root { max-width: 1280px; }", "src/index.css": "body { display: flex; }" },
  solid: { "src/App.jsx": "<h1>Vite + Solid</h1>", "src/App.css": "#root { max-width: 1280px; }", "src/index.css": "body { display: flex; }" },
  vue: { "src/App.vue": "<HelloWorld msg=\"Vite + Vue\" />", "src/style.css": "body { display: flex; }", "src/components/HelloWorld.vue": "<template />" },
  svelte: { "src/routes/+page.svelte": "<h1>Welcome to SvelteKit</h1>", "src/routes/+layout.svelte": "{@render children()}" },
};

function makeStarter(framework) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "celtrix-welcome-"));
  const client = path.join(root, "my-app", "client");
  for (const [file, content] of Object.entries(STARTERS[framework])) {
    fs.mkdirSync(path.dirname(path.join(client, file)), { recursive: true });
    fs.writeFileSync(path.join(client, file), content);
  }
  return client;
}

const read = (client, file) => fs.readFileSync(path.join(client, file), "utf-8");
const write = (client, options) =>
  writeWelcomePage(client, { projectName: "shop", stack: "mern", typescript: false, ...options });

test("replaces the stock Vite page in a React project", () => {
  const client = makeStarter("react");

  assert.equal(write(client, { framework: "react" }), true);

  const app = read(client, "src/App.jsx");
  assert.ok(!app.includes("Vite + React"));
  assert.ok(app.includes('const PROJECT = "shop"'));
  assert.ok(app.includes('const STACK = "mern"'));
  assert.ok(app.includes("function TodoPanel") && app.includes("function RegisterPanel"));
  assert.ok(app.includes('className="powered-badge"'));
  assert.ok(!app.includes("__PROJECT_NAME__") && !app.includes("__STACK__"));
  assert.ok(read(client, "src/App.css").includes(".statusline"));
  assert.ok(!read(client, "src/index.css").includes("display: flex"));
});

test("writes the TypeScript page when asked", () => {
  for (const [framework, file] of [["react", "src/App.tsx"], ["solid", "src/App.tsx"]]) {
    const client = makeStarter(framework);
    write(client, { framework, typescript: true });
    const app = read(client, file);
    assert.ok(app.includes("type TodoItem"), framework);
    assert.ok(app.includes("src/App.tsx"), framework);
  }

  const vue = makeStarter("vue");
  write(vue, { framework: "vue", typescript: true });
  assert.ok(read(vue, "src/App.vue").includes('<script setup lang="ts">'));

  const svelte = makeStarter("svelte");
  write(svelte, { framework: "svelte", typescript: true });
  assert.ok(read(svelte, "src/routes/+page.svelte").includes('<script lang="ts">'));
});

test("Solid page uses Solid primitives", () => {
  const client = makeStarter("solid");
  write(client, { framework: "solid" });
  const app = read(client, "src/App.jsx");
  assert.ok(app.includes("from 'solid-js'"));
  assert.ok(app.includes("<For each") && !app.includes("className="));
  assert.ok(read(client, "src/index.css").includes(".powered-badge"));
});

test("Vue page replaces App.vue, uses style.css and drops the unused HelloWorld", () => {
  const client = makeStarter("vue");
  write(client, { framework: "vue" });

  const app = read(client, "src/App.vue");
  assert.ok(!app.includes("HelloWorld"));
  assert.ok(app.includes("import './App.css'"));
  assert.ok(read(client, "src/style.css").includes("--green: #4ade80"));
  assert.ok(read(client, "src/App.css").includes(".window"));
  assert.ok(!fs.existsSync(path.join(client, "src/components/HelloWorld.vue")));
});

test("SvelteKit page goes in routes with one combined stylesheet", () => {
  const client = makeStarter("svelte");
  write(client, { framework: "svelte" });

  const page = read(client, "src/routes/+page.svelte");
  assert.ok(page.includes("import './welcome.css'"));
  assert.ok(page.includes("onMount"));
  const css = read(client, "src/routes/welcome.css");
  assert.ok(css.includes("--green: #4ade80") && css.includes(".statusline") && css.includes(".powered-badge"));
  // the layout is left alone
  assert.equal(read(client, "src/routes/+layout.svelte"), "{@render children()}");
});

test("keeps the badge styles next to the theme variables", () => {
  const client = makeStarter("react");
  write(client, { framework: "react" });
  const css = read(client, "src/index.css");
  assert.ok(css.includes("--green: #4ade80"));
  assert.ok(css.includes(".powered-badge"));
  // ensureTailwindImport inserts its import before :root, so it must be there
  assert.match(css, /:root\s*{/);
});

test("keeps an existing Tailwind import in the global stylesheet", () => {
  const client = makeStarter("vue");
  fs.writeFileSync(path.join(client, "src/style.css"), '@import "tailwindcss";\n\nbody { margin: 0; }');

  write(client, { framework: "vue" });

  assert.match(read(client, "src/style.css"), /^@import 'tailwindcss';/);
});

test("inserts project names with quotes and $ patterns literally", () => {
  const name = `it's $& "weird" $1`;
  for (const [framework, file] of [["react", "src/App.jsx"], ["vue", "src/App.vue"], ["svelte", "src/routes/+page.svelte"]]) {
    const client = makeStarter(framework);
    write(client, { framework, projectName: name });
    assert.ok(read(client, file).includes(`const PROJECT = ${JSON.stringify(name)}`), framework);
  }
});

test("uses the folder name when the project is scaffolded into '.'", () => {
  const client = makeStarter("react");
  write(client, { framework: "react", projectName: "." });
  assert.ok(read(client, "src/App.jsx").includes('const PROJECT = "my-app"'));
});

test("returns false and writes nothing when there is no src folder", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "celtrix-welcome-"));
  assert.equal(write(root, { framework: "react" }), false);
  assert.deepEqual(fs.readdirSync(root), []);
});

test("leaves unsupported frameworks untouched", () => {
  const client = makeStarter("react");
  assert.equal(write(client, { framework: "angular" }), false);
  assert.equal(read(client, "src/App.jsx"), "<h1>Vite + React</h1>");
});
