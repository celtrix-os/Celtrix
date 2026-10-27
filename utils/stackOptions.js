import chalk from "chalk";

/**
 * Single source of truth for the custom-stack options and the rules between
 * them. The prompts, the command-line flags and --help all read from here.
 */

export const LANGUAGE_OPTIONS = [
  { label: "TypeScript", color: chalk.blueBright,   desc: "Type-safe JavaScript superset", value: "typescript" },
  { label: "JavaScript", color: chalk.yellowBright, desc: "Classic dynamic scripting",     value: "javascript" },
];

export const FRONTEND_OPTIONS = [
  { label: "React Router",  color: chalk.cyanBright,      desc: "React with file-based routing",        value: "react-router" },
  { label: "Next.js",       color: chalk.white,            desc: "Full-stack React framework",            value: "nextjs"       },
  { label: "Nuxt",          color: chalk.greenBright,      desc: "Full-stack Vue framework",              value: "nuxt"         },
  { label: "TanStack",      color: chalk.hex("#FF6200"),   desc: "Type-safe routing & data fetching",     value: "tanstack"     },
  { label: "Astro",         color: chalk.magentaBright,    desc: "Content-focused, island architecture",  value: "astro"        },
  { label: "SolidStart",    color: chalk.blueBright,       desc: "Fine-grained reactive UI framework",    value: "solid"        },
];

export const BACKEND_OPTIONS = [
  { label: "Hono",     color: chalk.hex("#FF6200"),   desc: "Ultrafast edge-ready web framework",     value: "hono"    },
  { label: "Fastify",  color: chalk.white,            desc: "Fast & low-overhead Node.js framework",  value: "fastify" },
  { label: "Express",  color: chalk.yellowBright,     desc: "Minimalist Node.js web framework",       value: "express" },
  { label: "None",     color: chalk.gray,             desc: "Frontend only, no backend",              value: "none"    },
];

export const RUNTIME_OPTIONS = [
  { label: "Node.js", color: chalk.greenBright, desc: "The standard JavaScript runtime",        value: "node" },
  { label: "Bun",     color: chalk.white,       desc: "Fast all-in-one JS runtime & toolkit",   value: "bun"  },
];

export const DATABASE_OPTIONS = [
  { label: "SQLite",     color: chalk.cyanBright,      desc: "Lightweight embedded database",    value: "sqlite"   },
  { label: "MySQL",      color: chalk.hex("#F29111"),  desc: "Popular relational database",      value: "mysql"    },
  { label: "PostgreSQL", color: chalk.blueBright,      desc: "Advanced open-source RDBMS",       value: "postgres" },
  { label: "MongoDB",    color: chalk.greenBright,     desc: "Document-oriented NoSQL database", value: "mongodb"  },
  { label: "None",      color: chalk.gray,            desc: "No database",                      value: "none"     },
];

/**
 * Providers for each database engine. The first entry is the default.
 */
export const DATABASE_PROVIDER_OPTIONS = {
  postgres: [
    { label: "Supabase",  color: chalk.hex("#3FCF8E"),  desc: "Open-source Firebase alternative",        value: "supabase" },
    { label: "Docker",    color: chalk.blueBright,      desc: "PostgreSQL in a local Docker container",  value: "docker"   },
    { label: "Local",     color: chalk.gray,            desc: "Self-hosted PostgreSQL",                  value: "local"    },
  ],
  mysql: [
    { label: "Docker",    color: chalk.blueBright,      desc: "MySQL in a local Docker container",       value: "docker"   },
    { label: "Local",     color: chalk.gray,            desc: "Self-hosted MySQL",                       value: "local"    },
  ],
  mongodb: [
    { label: "MongoDB Atlas", color: chalk.greenBright, desc: "Cloud-hosted MongoDB",                    value: "atlas"    },
    { label: "Docker",        color: chalk.blueBright,  desc: "MongoDB in a local Docker container",     value: "docker"   },
    { label: "Local",         color: chalk.gray,        desc: "Self-hosted MongoDB",                     value: "local"    },
  ],
  sqlite: [
    { label: "Local",     color: chalk.gray,            desc: "Local file-based SQLite",                 value: "local"    },
  ],
};

/**
 * ORMs and the databases each one supports. The first compatible entry is the default.
 */
export const ORM_OPTIONS = [
  { label: "Prisma",   color: chalk.magentaBright, desc: "Next-gen Node.js & TypeScript ORM", value: "prisma",   databases: ["postgres", "mysql", "mongodb", "sqlite"] },
  { label: "Mongoose", color: chalk.redBright,     desc: "Elegant MongoDB object modeling",   value: "mongoose", databases: ["mongodb"] },
];

export const PACKAGE_MANAGER_OPTIONS = [
  { label: "npm",  color: chalk.red,    value: "npm"  },
  { label: "yarn", color: chalk.cyan,   value: "yarn" },
  { label: "pnpm", color: chalk.yellow, value: "pnpm" },
  { label: "bun",  color: chalk.white,  value: "bun"  },
];

/**
 * Values used when a step is skipped with --yes, and the initial
 * selections in the interactive wizard.
 */
export const STACK_DEFAULTS = {
  language: "typescript",
  frontend: "react-router",
  backend: "hono",
  runtime: "node",
  database: { type: "postgres", provider: "supabase" },
  orm: "prisma",
};

export function optionValues(options) {
  return options.map((opt) => opt.value);
}

/**
 * Returns compatible ORM options based on the chosen database.
 *
 * @param {string} databaseType - Chosen database type ('sqlite', 'postgres', 'mysql', 'mongodb', 'none').
 * @returns {string[]} Allowed ORM values.
 */
export function getCompatibleORMs(databaseType) {
  if (!databaseType || databaseType === "none") {
    return ["none"];
  }

  return ORM_OPTIONS.filter((opt) => opt.databases.includes(databaseType)).map((opt) => opt.value);
}

/**
 * Returns compatible database providers for a selected database engine.
 *
 * @param {string} databaseType - Chosen database engine.
 * @returns {string[]} Allowed provider values.
 */
export function getCompatibleProviders(databaseType) {
  return optionValues(DATABASE_PROVIDER_OPTIONS[databaseType] ?? []);
}

/**
 * Project names are folder names: letters, numbers, hyphens and underscores.
 */
export function isValidProjectName(name) {
  return /^[a-zA-Z0-9-_]+$/.test(name);
}
