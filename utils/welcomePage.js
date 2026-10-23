import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";
import { BADGE_CSS } from "./shared.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const REACT_TEMPLATE_DIR = path.join(__dirname, "..", "templates", "welcome", "react");

/**
 * Replaces the stock Vite starter page of a React project with the Celtrix
 * welcome page (terminal style navbar, todo list and register form).
 *
 * Writes src/App.jsx or src/App.tsx, src/App.css and src/index.css. The
 * "Powered by Celtrix" badge is part of the page and its CSS is appended to
 * index.css, so the badge injector is not needed for these projects.
 *
 * @param {string} clientDir - Vite React project directory (the one containing src/).
 * @param {object} options
 * @param {string} options.projectName - Shown in the navbar and intro.
 * @param {string} options.stack - Stack label shown on the page, e.g. "mern".
 * @param {boolean} options.typescript - Write App.tsx instead of App.jsx.
 * @returns {boolean} true when the page was written.
 */
export function writeReactWelcomePage(clientDir, { projectName, stack, typescript }) {
  const srcDir = path.join(clientDir, "src");
  if (!fs.existsSync(srcDir)) {
    logger.warn(`⚠️ ${srcDir} not found, skipping the Celtrix welcome page`);
    return false;
  }

  const name =
    projectName && projectName !== "."
      ? projectName
      : path.basename(path.resolve(clientDir, ".."));
  const appFile = typescript ? "App.tsx" : "App.jsx";

  try {
    // Replacer functions so names containing "$&" or "$1" are inserted literally.
    const app = fs
      .readFileSync(path.join(REACT_TEMPLATE_DIR, appFile), "utf-8")
      .replace("'__PROJECT_NAME__'", () => JSON.stringify(name))
      .replace("'__STACK__'", () => JSON.stringify(stack));
    const indexCss = fs.readFileSync(path.join(REACT_TEMPLATE_DIR, "index.css"), "utf-8");

    fs.writeFileSync(path.join(srcDir, appFile), app, "utf-8");
    fs.copyFileSync(path.join(REACT_TEMPLATE_DIR, "App.css"), path.join(srcDir, "App.css"));
    fs.writeFileSync(path.join(srcDir, "index.css"), indexCss + BADGE_CSS, "utf-8");
  } catch (error) {
    logger.error(`❌ Failed to write the Celtrix welcome page: ${error.message}`);
    return false;
  }
  return true;
}
