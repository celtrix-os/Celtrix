import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";
import { BADGE_CSS } from "./shared.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATE_DIR = path.join(__dirname, "..", "templates", "welcome");

/**
 * Where each framework's starter keeps its files, and which welcome template
 * replaces the starter page. `appCss: null` means the framework has no separate
 * component stylesheet, so all styles go into `globalCss`.
 */
const FRAMEWORKS = {
  react: {
    page: (ts) => [`react/App.${ts ? "tsx" : "jsx"}`, `src/App.${ts ? "tsx" : "jsx"}`],
    appCss: "src/App.css",
    globalCss: "src/index.css",
  },
  solid: {
    page: (ts) => [`solid/App.${ts ? "tsx" : "jsx"}`, `src/App.${ts ? "tsx" : "jsx"}`],
    appCss: "src/App.css",
    globalCss: "src/index.css",
  },
  vue: {
    page: (ts) => [`vue/App.${ts ? "ts" : "js"}.vue`, "src/App.vue"],
    appCss: "src/App.css",
    globalCss: "src/style.css",
    // the starter component the stock App.vue rendered; nothing uses it anymore
    remove: ["src/components/HelloWorld.vue"],
  },
  svelte: {
    page: (ts) => [`svelte/page.${ts ? "ts" : "js"}.svelte`, "src/routes/+page.svelte"],
    appCss: null,
    globalCss: "src/routes/welcome.css",
  },
};

export const WELCOME_FRAMEWORKS = Object.keys(FRAMEWORKS);

/**
 * Replaces the starter page of a freshly scaffolded frontend with the Celtrix
 * welcome page (terminal style navbar, todo list and register form).
 *
 * The "Powered by Celtrix" badge is part of the page, and its CSS is appended
 * to the global stylesheet next to the theme variables.
 *
 * @param {string} clientDir - Frontend project directory (the one containing src/).
 * @param {object} options
 * @param {"react"|"solid"|"vue"|"svelte"} options.framework - Which starter was scaffolded.
 * @param {string} options.projectName - Shown in the navbar and intro.
 * @param {string} options.stack - Stack label shown on the page, e.g. "mern".
 * @param {boolean} options.typescript - Use the TypeScript version of the page.
 * @returns {boolean} true when the page was written.
 */
export function writeWelcomePage(clientDir, { framework, projectName, stack, typescript }) {
  const spec = FRAMEWORKS[framework];
  if (!spec) {
    logger.warn(`⚠️ No Celtrix welcome page for "${framework}", keeping the starter page`);
    return false;
  }

  const srcDir = path.join(clientDir, "src");
  if (!fs.existsSync(srcDir)) {
    logger.warn(`⚠️ ${srcDir} not found, skipping the Celtrix welcome page`);
    return false;
  }

  const name =
    projectName && projectName !== "."
      ? projectName
      : path.basename(path.resolve(clientDir, ".."));
  const [templateFile, target] = spec.page(typescript);

  try {
    // Replacer functions so names containing "$&" or "$1" are inserted literally.
    const page = fs
      .readFileSync(path.join(TEMPLATE_DIR, templateFile), "utf-8")
      .replace("'__PROJECT_NAME__'", () => JSON.stringify(name))
      .replace("'__STACK__'", () => JSON.stringify(stack));
    const indexCss = fs.readFileSync(path.join(TEMPLATE_DIR, "shared", "index.css"), "utf-8");
    const appCss = fs.readFileSync(path.join(TEMPLATE_DIR, "shared", "App.css"), "utf-8");

    // Tailwind stacks import Tailwind from the global stylesheet; keep that import.
    const globalPath = path.join(clientDir, spec.globalCss);
    const existing = fs.existsSync(globalPath) ? fs.readFileSync(globalPath, "utf-8") : "";
    const tailwind = /@import\s+["']tailwindcss["']/.test(existing) ? "@import 'tailwindcss';\n\n" : "";

    fs.mkdirSync(path.dirname(path.join(clientDir, target)), { recursive: true });
    fs.writeFileSync(path.join(clientDir, target), page, "utf-8");
    if (spec.appCss) {
      fs.writeFileSync(path.join(clientDir, spec.appCss), appCss, "utf-8");
      fs.writeFileSync(globalPath, tailwind + indexCss + BADGE_CSS, "utf-8");
    } else {
      fs.writeFileSync(globalPath, tailwind + indexCss + appCss + BADGE_CSS, "utf-8");
    }
    for (const file of spec.remove || []) {
      fs.rmSync(path.join(clientDir, file), { force: true });
    }
  } catch (error) {
    logger.error(`❌ Failed to write the Celtrix welcome page: ${error.message}`);
    return false;
  }
  return true;
}
