import { parseArgs as parseNodeArgs } from "node:util";
import {
  BACKEND_OPTIONS,
  DATABASE_OPTIONS,
  DATABASE_PROVIDER_OPTIONS,
  FRONTEND_OPTIONS,
  LANGUAGE_OPTIONS,
  ORM_OPTIONS,
  PACKAGE_MANAGER_OPTIONS,
  RUNTIME_OPTIONS,
  STACK_DEFAULTS,
  getCompatibleORMs,
  getCompatibleProviders,
  isValidProjectName,
  optionValues,
} from "./stackOptions.js";

/**
 * Pure parsing and validation for the command-line flags. Nothing here
 * prompts, prints or exits, so every rule can be unit-tested.
 */

const ALL_PROVIDERS = [...new Set(Object.values(DATABASE_PROVIDER_OPTIONS).flat().map((opt) => opt.value))];

/**
 * Flags that choose a stack value. `key` is the name the wizard and scaffolder
 * use; `aliases` are only used to suggest the right flag for a wrong one.
 */
export const STACK_FLAGS = [
  { name: "lang",        key: "language",         values: optionValues(LANGUAGE_OPTIONS),  aliases: ["language"] },
  { name: "frontend",    key: "frontend",         values: optionValues(FRONTEND_OPTIONS),  aliases: ["framework", "ui"] },
  { name: "backend",     key: "backend",          values: optionValues(BACKEND_OPTIONS),   aliases: ["server", "api"], note: "none = frontend only" },
  { name: "runtime",     key: "runtime",          values: optionValues(RUNTIME_OPTIONS),   aliases: [] },
  { name: "db",          key: "databaseType",     values: optionValues(DATABASE_OPTIONS),  aliases: ["database"], note: "needs a backend" },
  { name: "db-provider", key: "databaseProvider", values: ALL_PROVIDERS,                   aliases: ["provider", "database-provider", "dbprovider"], note: "depends on --db" },
  { name: "orm",         key: "orm",              values: optionValues(ORM_OPTIONS),       aliases: [] },
  { name: "pm",          key: "packageManager",   values: optionValues(PACKAGE_MANAGER_OPTIONS), aliases: ["package-manager", "packagemanager"] },
];

/** On/off flags. */
export const BOOLEAN_FLAGS = [
  { name: "yes",        short: "y", description: "Use defaults for anything not given and skip all prompts" },
  { name: "no-install",             description: "Don't install dependencies" },
  { name: "no-git",                 description: "Don't initialize a git repository" },
  { name: "help",       short: "h", description: "Show every flag and its allowed values" },
  { name: "version",    short: "v", description: "Show the installed version" },
  { name: "verbose",                description: "Show detailed error output" },
];

/** Positional shortcuts that skip the stack questions. */
export const QUICK_TEMPLATES = {
  "mern-js": { stack: "mern", language: "javascript" },
  "mern-ts": { stack: "mern", language: "typescript" },
};

const COMMANDS = ["login", ...Object.keys(QUICK_TEMPLATES)];

// Quick templates fix their own stack, so only these flags apply to them
const QUICK_TEMPLATE_FLAGS = ["runtime", "pm"];

/** Used by --yes when no project name is given. */
export const DEFAULT_PROJECT_NAME = "my-app";

export class CliError extends Error {
  constructor(messages) {
    const list = [].concat(messages);
    super(list.join("\n"));
    this.name = "CliError";
    this.messages = list;
  }
}

function expected(values) {
  return `Expected one of: ${values.join(", ")}`;
}

function levenshtein(a, b) {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let previous = row[0];
    row[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const current = row[j];
      row[j] = Math.min(row[j] + 1, row[j - 1] + 1, previous + (a[i - 1] === b[j - 1] ? 0 : 1));
      previous = current;
    }
  }
  return row[b.length];
}

/**
 * Returns the known flag closest to an unknown one, e.g. "--fronted" → "--frontend".
 * A value written as a flag ("--nextjs") suggests the flag that takes it.
 */
export function suggestFlag(rawName) {
  const name = rawName.replace(/^-+/, "").toLowerCase();

  const takesValue = STACK_FLAGS.find((flag) => flag.name !== "db-provider" && flag.values.includes(name));
  if (takesValue) return `--${takesValue.name} ${name}`;

  const candidates = [
    ...STACK_FLAGS.flatMap((flag) => [flag.name, ...flag.aliases].map((match) => ({ match, flag: `--${flag.name}` }))),
    ...BOOLEAN_FLAGS.map((flag) => ({ match: flag.name, flag: `--${flag.name}` })),
    ...BOOLEAN_FLAGS.filter((flag) => flag.short).map((flag) => ({ match: flag.short, flag: `-${flag.short}` })),
  ];
  return candidates.reduce((best, candidate) => {
    const distance = levenshtein(name, candidate.match);
    return distance < best.distance ? { flag: candidate.flag, distance } : best;
  }, { flag: null, distance: Infinity }).flag;
}

/**
 * Parses the CLI arguments (everything after the script path) into a
 * normalized result. Throws a CliError listing every problem found.
 *
 * @param {string[]} argv
 * @returns {{
 *   command: string | null,
 *   projectName: string | undefined,
 *   values: Record<string, string>,
 *   yes: boolean, install: boolean, git: boolean,
 *   help: boolean, version: boolean, verbose: boolean
 * }}
 */
export function parseCliArgs(argv) {
  const options = {};
  for (const flag of STACK_FLAGS) options[flag.name] = { type: "string" };
  for (const flag of BOOLEAN_FLAGS) options[flag.name] = { type: "boolean", ...(flag.short && { short: flag.short }) };

  // Non-strict parsing would take "--orm" as the value in "--db --orm prisma"; an
  // empty inline value reports the missing value and leaves "--orm" to be parsed
  const args = argv.map((arg, i) => {
    const takesValue = STACK_FLAGS.some((flag) => arg === `--${flag.name}`);
    const next = argv[i + 1];
    return takesValue && (next === undefined || next.startsWith("-")) ? `${arg}=` : arg;
  });

  // strict: false so unknown flags reach the tokens and can get a suggestion
  const { tokens } = parseNodeArgs({ args, options, strict: false, allowPositionals: true, tokens: true });

  const errors = [];
  const values = {};
  const switches = {};
  const positionals = [];
  // Index of the argument right after an unknown "--flag", which is most likely its value
  let unknownValueIndex = -1;

  for (const token of tokens) {
    if (token.kind === "positional") {
      if (token.index !== unknownValueIndex) positionals.push(token.value);
      continue;
    }
    if (token.kind !== "option") continue;

    const stackFlag = STACK_FLAGS.find((flag) => flag.name === token.name);
    const booleanFlag = BOOLEAN_FLAGS.find((flag) => flag.name === token.name);

    if (stackFlag) {
      if (token.value === undefined || token.value === "") {
        errors.push(`Missing value for --${stackFlag.name}. ${expected(stackFlag.values)}`);
      } else if (!stackFlag.values.includes(token.value)) {
        errors.push(`Invalid --${stackFlag.name} "${token.value}". ${expected(stackFlag.values)}`);
      } else {
        values[stackFlag.key] = token.value;
      }
    } else if (booleanFlag) {
      if (token.inlineValue) {
        errors.push(`${token.rawName} does not take a value.`);
      } else {
        switches[booleanFlag.name] = true;
      }
    } else {
      if (!token.inlineValue) unknownValueIndex = token.index + 1;
      const suggestion = suggestFlag(token.rawName);
      errors.push(`Unknown flag ${token.rawName}.${suggestion ? ` Did you mean ${suggestion}?` : ""} Run celtrix --help to see every flag.`);
    }
  }

  const command = COMMANDS.includes(positionals[0]) ? positionals.shift() : null;
  const projectName = positionals.shift();
  for (const extra of positionals) {
    errors.push(`Unexpected argument "${extra}". Only one project name can be given.`);
  }
  if (projectName !== undefined && projectName !== "." && !isValidProjectName(projectName)) {
    errors.push(`Invalid project name "${projectName}". Use letters, numbers, hyphens and underscores, or "." for the current folder.`);
  }

  if (command && QUICK_TEMPLATES[command]) {
    for (const flag of STACK_FLAGS) {
      if (values[flag.key] !== undefined && !QUICK_TEMPLATE_FLAGS.includes(flag.name)) {
        errors.push(`--${flag.name} can't be used with the ${command} template, which sets its own stack.`);
      }
    }
  }

  if (errors.length === 0) errors.push(...validateStackValues(values));
  if (errors.length > 0) throw new CliError(errors);

  return {
    command,
    projectName,
    values,
    yes: Boolean(switches.yes),
    install: !switches["no-install"],
    git: !switches["no-git"],
    help: Boolean(switches.help),
    version: Boolean(switches.version),
    verbose: Boolean(switches.verbose),
  };
}

/**
 * Checks the rules between stack values. Only values that were given are
 * checked; missing ones are filled in later by the prompts or by --yes.
 *
 * @param {Record<string, string>} values - Keyed by STACK_FLAGS[].key.
 * @returns {string[]} Error messages, empty when valid.
 */
export function validateStackValues(values) {
  const errors = [];
  const { backend, databaseType, databaseProvider, orm } = values;

  if (backend === "none" && databaseType && databaseType !== "none") {
    errors.push(`--db ${databaseType} needs a backend, but --backend is none. Choose a backend (${optionValues(BACKEND_OPTIONS).filter((v) => v !== "none").join(", ")}) or use --db none.`);
  }

  if (!databaseType) {
    if (databaseProvider) errors.push(`--db-provider needs --db. Add --db ${databaseProviderHint(databaseProvider)}.`);
    if (orm) errors.push(`--orm needs --db. Add --db ${ormHint(orm)}.`);
    return errors;
  }

  if (databaseType === "none") {
    if (databaseProvider) errors.push(`--db-provider can't be used with --db none.`);
    if (orm) errors.push(`--orm can't be used with --db none.`);
    return errors;
  }

  const providers = getCompatibleProviders(databaseType);
  if (databaseProvider && !providers.includes(databaseProvider)) {
    errors.push(`Invalid --db-provider "${databaseProvider}" for --db ${databaseType}. ${expected(providers)}`);
  }

  const orms = getCompatibleORMs(databaseType);
  if (orm && !orms.includes(orm)) {
    errors.push(`Invalid --orm "${orm}" for --db ${databaseType}. ${expected(orms)}`);
  }

  return errors;
}

function databasesWhere(predicate) {
  return optionValues(DATABASE_OPTIONS).filter((db) => db !== "none" && predicate(db)).join("|");
}

function databaseProviderHint(provider) {
  return databasesWhere((db) => getCompatibleProviders(db).includes(provider));
}

function ormHint(orm) {
  return databasesWhere((db) => getCompatibleORMs(db).includes(orm));
}

/**
 * True when any stack flag was given, which means the custom stack is wanted.
 */
export function hasStackFlags(values) {
  return STACK_FLAGS.some((flag) => flag.name !== "pm" && values[flag.key] !== undefined);
}

/**
 * Lists the flags that would still need a prompt. Used when there is no TTY
 * to prompt on.
 *
 * @param {{ command?: string | null, projectName?: string, values: Record<string, string> }} parsed
 * @returns {string[]} e.g. ["[project-name]", "--frontend"]
 */
export function getMissingFlags({ command = null, projectName, values }) {
  const missing = [];
  if (!projectName) missing.push("[project-name]");

  if (QUICK_TEMPLATES[command]) {
    for (const name of QUICK_TEMPLATE_FLAGS) {
      if (values[STACK_FLAGS.find((flag) => flag.name === name).key] === undefined) missing.push(`--${name}`);
    }
    return missing;
  }

  for (const key of ["language", "frontend", "backend", "runtime"]) {
    if (values[key] === undefined) missing.push(`--${flagName(key)}`);
  }

  const { backend, databaseType } = values;
  if (backend !== "none" && databaseType === undefined) missing.push("--db");

  if (databaseType && databaseType !== "none") {
    if (values.databaseProvider === undefined && getCompatibleProviders(databaseType).length > 1) missing.push("--db-provider");
    if (values.orm === undefined && getCompatibleORMs(databaseType).length > 1) missing.push("--orm");
  }

  if (values.packageManager === undefined) missing.push("--pm");
  return missing;
}

function flagName(key) {
  return STACK_FLAGS.find((flag) => flag.key === key).name;
}

/**
 * Fills every missing value with its default (--yes) and returns the full
 * custom-stack config the scaffolder expects.
 *
 * @param {Record<string, string>} values - Validated flag values.
 * @param {{ packageManager: string }} fallbacks - Defaults that depend on the environment.
 */
export function applyDefaults(values, { packageManager }) {
  const backend = values.backend ?? STACK_DEFAULTS.backend;
  const databaseType = backend === "none" ? "none" : values.databaseType ?? STACK_DEFAULTS.database.type;
  const hasDatabase = databaseType !== "none";

  return {
    language: values.language ?? STACK_DEFAULTS.language,
    frontend: values.frontend ?? STACK_DEFAULTS.frontend,
    backend,
    runtime: values.runtime ?? STACK_DEFAULTS.runtime,
    database: {
      type: databaseType,
      provider: hasDatabase ? values.databaseProvider ?? getCompatibleProviders(databaseType)[0] : "",
    },
    orm: hasDatabase ? values.orm ?? getCompatibleORMs(databaseType)[0] : "none",
    packageManager: values.packageManager ?? packageManager,
  };
}
