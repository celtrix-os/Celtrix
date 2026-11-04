import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { logger } from "./logger.js";
import { run } from "./progress.js";

export const CELTRIX_LOCK_FILE = "celtrix.json";
export const CELTRIX_CONFIG_FILE = "celtrix.config.json";

/**
 * Finds the project root by searching from startDir upwards for package.json.
 * Searches up to 4 levels up.
 *
 * @param {string} startDir
 * @returns {string|null}
 */
export function findProjectRoot(startDir = process.cwd()) {
  let current = path.resolve(startDir);
  for (let i = 0; i < 4; i++) {
    if (fs.existsSync(path.join(current, "package.json"))) {
      return current;
    }
    const parent = path.dirname(current);
    if (parent === current) break;
    current = parent;
  }
  return null;
}

/**
 * Reads and parses celtrix.json if it exists.
 *
 * @param {string} rootDir
 * @returns {object|null}
 */
export function readCeltrixLock(rootDir) {
  const filePath = path.join(rootDir, CELTRIX_LOCK_FILE);
  if (fs.existsSync(filePath)) {
    try {
      return fs.readJsonSync(filePath);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Reads and parses celtrix.config.json if it exists.
 *
 * @param {string} rootDir
 * @returns {object|null}
 */
export function readCeltrixConfig(rootDir) {
  const filePath = path.join(rootDir, CELTRIX_CONFIG_FILE);
  if (fs.existsSync(filePath)) {
    try {
      return fs.readJsonSync(filePath);
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Updates or creates celtrix.json with new information.
 * Preserves existing fields and merges the integrations array.
 *
 * @param {string} rootDir
 * @param {object} updates
 * @returns {object}
 */
export function updateCeltrixLock(rootDir, updates = {}) {
  const filePath = path.join(rootDir, CELTRIX_LOCK_FILE);
  const existing = readCeltrixLock(rootDir) || {
    $schema: "https://celtrix.dev/schema.json",
    name: path.basename(rootDir),
    version: "1.0.0",
    integrations: [],
  };

  const integrations = Array.from(
    new Set([...(existing.integrations || []), ...(updates.integrations || [])])
  );

  const updated = {
    ...existing,
    ...updates,
    integrations,
  };

  fs.writeJsonSync(filePath, updated, { spaces: 2 });
  return updated;
}

/**
 * Writes a file only if it doesn't already exist.
 * Returns { written: true, skipped: false } or { written: false, skipped: true }.
 *
 * @param {string} filePath
 * @param {string} content
 * @returns {{ written: boolean, skipped: boolean, path: string }}
 */
export function safeWriteFile(filePath, content) {
  if (fs.existsSync(filePath)) {
    const rel = path.relative(process.cwd(), filePath);
    logger.warn(`⚠️  Skipped ${rel} (already exists). Existing file was preserved.`);
    return { written: false, skipped: true, path: filePath };
  }
  fs.ensureDirSync(path.dirname(filePath));
  fs.writeFileSync(filePath, content, "utf-8");
  return { written: true, skipped: false, path: filePath };
}

/**
 * Safely appends missing environment variables to .env.example (or specified env file).
 *
 * @param {string} envPath
 * @param {string} content
 * @param {string} [header]
 * @returns {boolean}
 */
export function safeAppendEnv(envPath, content, header = "") {
  fs.ensureDirSync(path.dirname(envPath));
  let existing = "";
  if (fs.existsSync(envPath)) {
    existing = fs.readFileSync(envPath, "utf-8");
  }

  const linesToAdd = [];
  const lines = content.split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const key = trimmed.split("=")[0].trim();
    if (key) {
      const escapedKey = key.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      const keyRegex = new RegExp(`^\\s*(?:export\\s+)?${escapedKey}\\s*=`, "m");
      if (!keyRegex.test(existing)) {
        linesToAdd.push(trimmed);
      }
    }
  }

  if (linesToAdd.length === 0) return false;

  const section = header ? `\n# ${header}\n` : "\n";
  const toAppend = `${section}${linesToAdd.join("\n")}\n`;
  fs.appendFileSync(envPath, toAppend, "utf-8");
  return true;
}

/**
 * Safely updates scripts in package.json.
 * If a script already exists and differs, combines or keeps safe.
 *
 * @param {string} pkgPath
 * @param {Record<string, string>} scriptsToAdd
 * @returns {{ updated: boolean, added: string[] }}
 */
export function updatePackageScripts(pkgPath, scriptsToAdd) {
  if (!fs.existsSync(pkgPath)) return { updated: false, added: [] };
  const pkg = fs.readJsonSync(pkgPath);
  pkg.scripts = pkg.scripts || {};

  const added = [];
  for (const [name, script] of Object.entries(scriptsToAdd)) {
    if (!pkg.scripts[name]) {
      pkg.scripts[name] = script;
      added.push(name);
    } else if (pkg.scripts[name] !== script) {
      if (name === "prepare" && !pkg.scripts[name].includes("husky")) {
        pkg.scripts[name] = `${pkg.scripts[name]} && ${script}`;
        added.push(name);
      } else if (name === "postinstall" && !pkg.scripts[name].includes(script)) {
        pkg.scripts[name] = `${pkg.scripts[name]} && ${script}`;
        added.push(name);
      }
    }
  }

  if (added.length > 0) {
    fs.writeJsonSync(pkgPath, pkg, { spaces: 2 });
    return { updated: true, added };
  }

  return { updated: false, added: [] };
}

/**
 * Detects project type, package manager, language, structure, and integrations.
 *
 * @param {string} [startDir=process.cwd()]
 * @returns {object}
 */
export function detectProject(startDir = process.cwd()) {
  const root = findProjectRoot(startDir);
  if (!root) {
    return {
      isProject: false,
      root: path.resolve(startDir),
      error: "No package.json found. Make sure you are in the root directory of your project.",
    };
  }

  const rootPkgPath = path.join(root, "package.json");
  const pkg = fs.readJsonSync(rootPkgPath);
  const lock = readCeltrixLock(root);
  const config = readCeltrixConfig(root);

  // 1. Structure Detection
  const hasApps = fs.existsSync(path.join(root, "apps"));
  const hasPackages = fs.existsSync(path.join(root, "packages"));
  const isMonorepo = Boolean(pkg.workspaces || (hasApps && hasPackages));
  const hasClient = fs.existsSync(path.join(root, "client"));
  const hasServer = fs.existsSync(path.join(root, "server"));
  const isClientServer = hasClient && hasServer;

  const paths = {
    root,
    frontend: root,
    backend: root,
    database: root,
  };

  if (isMonorepo) {
    if (fs.existsSync(path.join(root, "apps", "web"))) paths.frontend = path.join(root, "apps", "web");
    else if (fs.existsSync(path.join(root, "apps", "frontend"))) paths.frontend = path.join(root, "apps", "frontend");

    if (fs.existsSync(path.join(root, "apps", "api"))) paths.backend = path.join(root, "apps", "api");
    else if (fs.existsSync(path.join(root, "apps", "backend"))) paths.backend = path.join(root, "apps", "backend");

    if (fs.existsSync(path.join(root, "packages", "database"))) paths.database = path.join(root, "packages", "database");
    else if (fs.existsSync(path.join(root, "packages", "db"))) paths.database = path.join(root, "packages", "db");
  } else if (isClientServer) {
    paths.frontend = path.join(root, "client");
    paths.backend = path.join(root, "server");
    paths.database = path.join(root, "server");
  }

  // Read all dependencies from root and sub-packages
  const collectDeps = (dir) => {
    const p = path.join(dir, "package.json");
    if (!fs.existsSync(p)) return { deps: {}, devDeps: {} };
    try {
      const data = fs.readJsonSync(p);
      return { deps: data.dependencies || {}, devDeps: data.devDependencies || {} };
    } catch {
      return { deps: {}, devDeps: {} };
    }
  };

  const rootDeps = collectDeps(root);
  const frontendDeps = paths.frontend !== root ? collectDeps(paths.frontend) : rootDeps;
  const backendDeps = paths.backend !== root ? collectDeps(paths.backend) : rootDeps;
  const databaseDeps = paths.database !== root ? collectDeps(paths.database) : rootDeps;

  const allDeps = {
    ...rootDeps.deps,
    ...frontendDeps.deps,
    ...backendDeps.deps,
    ...databaseDeps.deps,
  };
  const allDevDeps = {
    ...rootDeps.devDeps,
    ...frontendDeps.devDeps,
    ...backendDeps.devDeps,
    ...databaseDeps.devDeps,
  };

  // 2. Package Manager Detection
  let packageManager = lock?.packageManager || config?.packageManager;
  if (!packageManager && pkg.packageManager) {
    packageManager = pkg.packageManager.split("@")[0];
  }
  if (!packageManager) {
    if (fs.existsSync(path.join(root, "pnpm-lock.yaml"))) packageManager = "pnpm";
    else if (fs.existsSync(path.join(root, "yarn.lock"))) packageManager = "yarn";
    else if (fs.existsSync(path.join(root, "bun.lockb")) || fs.existsSync(path.join(root, "bun.lock"))) packageManager = "bun";
    else if (fs.existsSync(path.join(root, "package-lock.json"))) packageManager = "npm";
    else packageManager = "npm";
  }

  // 3. Language Detection (TypeScript vs JavaScript)
  let language = lock?.language || config?.language;
  let isTs = false;
  if (language) {
    isTs = language === "typescript";
  } else {
    isTs = Boolean(
      fs.existsSync(path.join(root, "tsconfig.json")) ||
      fs.existsSync(path.join(paths.frontend, "tsconfig.json")) ||
      fs.existsSync(path.join(paths.backend, "tsconfig.json")) ||
      allDevDeps.typescript ||
      allDeps.typescript
    );
    language = isTs ? "typescript" : "javascript";
  }

  const ext = isTs ? "ts" : "js";
  const jsxExt = isTs ? "tsx" : "jsx";

  // 4. Framework / Frontend Detection
  let frontend = lock?.frontend || config?.frontend;
  if (!frontend) {
    if (allDeps.next) frontend = "nextjs";
    else if (allDeps["@sveltejs/kit"] || allDeps.svelte) frontend = "svelte";
    else if (allDeps.vue) frontend = "vue";
    else if (allDeps["@angular/core"]) frontend = "angular";
    else if (allDeps.astro) frontend = "astro";
    else if (allDeps["solid-js"]) frontend = "solid";
    else if (allDeps.react) frontend = "react";
    else frontend = "none";
  }

  // 5. Backend Detection
  let backend = lock?.backend || config?.backend;
  if (!backend) {
    if (allDeps.express) backend = "express";
    else if (allDeps.hono) backend = "hono";
    else if (allDeps.fastify) backend = "fastify";
    else if (frontend === "nextjs") backend = "nextjs";
    else backend = "none";
  }

  // 6. Database / ORM Detection
  let orm = lock?.orm || config?.orm;
  let database = lock?.database || config?.database;
  if (!orm) {
    if (
      allDeps["@prisma/client"] ||
      allDevDeps.prisma ||
      fs.existsSync(path.join(paths.database, "prisma", "schema.prisma")) ||
      fs.existsSync(path.join(root, "prisma", "schema.prisma"))
    ) {
      orm = "prisma";
    } else if (allDeps.mongoose) {
      orm = "mongoose";
      if (!database) database = { type: "mongodb" };
    }
  }

  // 7. Installed Integrations Detection
  const installedIntegrations = new Set(lock?.integrations || []);
  if (fs.existsSync(path.join(root, ".husky")) || allDevDeps.husky) {
    installedIntegrations.add("husky");
  }
  if (fs.existsSync(path.join(root, "biome.json")) || allDevDeps["@biomejs/biome"]) {
    installedIntegrations.add("biome");
  }
  if (allDeps["@clerk/nextjs"] || allDeps["@clerk/clerk-react"] || allDeps["@clerk/express"] || allDeps["@clerk/backend"]) {
    installedIntegrations.add("clerk");
    installedIntegrations.add("auth");
  }
  if (allDeps["better-auth"]) {
    installedIntegrations.add("better-auth");
    installedIntegrations.add("auth");
  }
  if (orm === "prisma" || fs.existsSync(path.join(paths.database, "prisma", "schema.prisma")) || fs.existsSync(path.join(root, "prisma", "schema.prisma"))) {
    installedIntegrations.add("prisma");
  }
  if (allDeps.ai || allDeps["@ai-sdk/openai"]) {
    installedIntegrations.add("vercel-ai");
  }

  return {
    isProject: true,
    root,
    name: pkg.name || path.basename(root),
    structure: isMonorepo ? "monorepo" : isClientServer ? "client-server" : "standalone",
    isMonorepo,
    isClientServer,
    paths,
    packageManager,
    language,
    isTs,
    ext,
    jsxExt,
    frontend,
    backend,
    database,
    orm,
    installedIntegrations: Array.from(installedIntegrations),
    celtrixJson: lock,
    celtrixConfig: config,
  };
}

/**
 * Installs dependencies and devDependencies using the project's package manager.
 *
 * @param {object} project - Result from detectProject()
 * @param {object} options
 * @param {string} [options.cwd] - Target directory to install in
 * @param {string[]} [options.dependencies=[]]
 * @param {string[]} [options.devDependencies=[]]
 * @returns {Promise<void>}
 */
export async function installProjectPackages(project, { cwd, dependencies = [], devDependencies = [] } = {}) {
  const targetDir = cwd || project.root;
  const pm = project.packageManager || "npm";
  const isRootMonorepo = project.isMonorepo && path.resolve(targetDir) === path.resolve(project.root);

  // Build command for dependencies
  if (dependencies.length > 0) {
    const depsStr = dependencies.join(" ");
    let cmd = "";
    if (pm === "npm") cmd = `npm install ${depsStr}`;
    else if (pm === "pnpm") cmd = isRootMonorepo ? `pnpm add -w ${depsStr}` : `pnpm add ${depsStr}`;
    else if (pm === "yarn") cmd = isRootMonorepo ? `yarn add -W ${depsStr}` : `yarn add ${depsStr}`;
    else if (pm === "bun") cmd = `bun add ${depsStr}`;
    await run(cmd, { cwd: targetDir });
  }

  // Build command for devDependencies
  if (devDependencies.length > 0) {
    const devDepsStr = devDependencies.join(" ");
    let cmd = "";
    if (pm === "npm") cmd = `npm install -D ${devDepsStr}`;
    else if (pm === "pnpm") cmd = isRootMonorepo ? `pnpm add -w -D ${devDepsStr}` : `pnpm add -D ${devDepsStr}`;
    else if (pm === "yarn") cmd = isRootMonorepo ? `yarn add -W -D ${devDepsStr}` : `yarn add -D ${devDepsStr}`;
    else if (pm === "bun") cmd = `bun add -d ${devDepsStr}`;
    await run(cmd, { cwd: targetDir });
  }
}

