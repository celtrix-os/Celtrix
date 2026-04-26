import chalk from "chalk";

/**
 * Returns true when an inquirer prompt was cancelled with Ctrl+C.
 * Shared across the entire CLI to avoid duplicating this check.
 *
 * @param {unknown} error - Prompt error.
 * @returns {boolean}
 */
export function isPromptCancellation(error) {
  return (
    error instanceof Error &&
    (error.name === "ExitPromptError" ||
      error.message.toLowerCase().includes("force closed"))
  );
}

/**
 * Builds the correct `create vite` command string for the given package
 * manager, template, and output directory.
 *
 * This eliminates the repeated inline ternaries scattered across installer.js.
 *
 * @param {object} config - Project configuration.
 * @param {string} config.packageManager - npm | yarn | pnpm | bun.
 * @param {string} template - Vite template name (e.g. "react", "react-ts", "vue").
 * @param {string} outputDir - Directory name for the scaffolded project (e.g. "client").
 * @returns {string} Ready-to-exec shell command.
 */
export function buildViteCommand(config, template, outputDir) {
  const pm = config.packageManager;
  const vitePkg = pm === "npm" ? "vite@latest" : "vite";
  const separator = pm === "npm" ? "--" : "";

  return [
    pm,
    "create",
    vitePkg,
    outputDir,
    separator,
    `--t ${template}`,
    "--no-rolldown",
    "--no-interactive",
  ]
    .filter(Boolean)
    .join(" ");
}

/**
 * Returns the correct install/add sub-command for a given package manager.
 *
 * @param {string} packageManager - npm | yarn | pnpm | bun.
 * @returns {string} "install" for npm, "add" for everything else.
 */
export function getInstallCommand(packageManager) {
  return packageManager === "npm" ? "install" : "add";
}

/**
 * Celtrix "Powered by" badge CSS.
 * Defined once and shared across all badge injectors.
 */
export const BADGE_CSS = `
.powered-badge {
  position: fixed;
  bottom: 50%;
  right: 1.5rem;
  font-size: 1rem;
  font-weight: 300;
  background-color: black;
  line-height: 1.5;
  color: white;
  padding: 0.5rem 1rem;
  border-radius: 0.75rem;
  box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1),
    0 4px 6px -2px rgba(0,0,0,0.05);
  opacity: 0.8;
  transition: opacity 0.2s ease-in-out;
}

.powered-badge:hover {
  opacity: 1;
}

.celtrix {
  font-weight: 620;
  font-size: 1.05rem;
  color: #4ade80;
  text-decoration: underline;
}
`;

/**
 * Badge HTML for React (JSX/TSX) projects.
 */
export const BADGE_JSX = `  <button className="powered-badge" onClick={() => window.open('https://github.com/celtrix-os/Celtrix', '_blank')}>Powered by <span className="celtrix">Celtrix</span></button>`;

/**
 * Badge HTML for Vue projects (uses @click instead of onClick).
 */
export const BADGE_VUE = `  <button class="powered-badge" @click="openCeltrix">Powered by <span class="celtrix">Celtrix</span></button>`;
