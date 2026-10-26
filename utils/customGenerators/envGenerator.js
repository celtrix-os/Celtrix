import fs from "fs-extra";
import path from "path";
import { getDatabaseName, getDockerDatabasePort, getDockerDatabaseUrl } from "./dockerGenerator.js";

export const SETUP_GUIDE = "CELTRIX_SETUP.md";

/**
 * Writes the workspace-level .env.example (every variable the generated code
 * reads, grouped by service) and CELTRIX_SETUP.md, a guide to setting up and
 * running the app. An existing README (e.g. from a framework CLI) is left alone;
 * without one, a short README pointing to the guide is added.
 */
export async function generateEnv(context) {
  const sections = getEnvSections(context);
  if (sections.length > 0) {
    const content = sections
      .map(({ title, lines }) => [`# ── ${title} ${"─".repeat(Math.max(4, 60 - title.length))}`, ...lines].join("\n"))
      .join("\n\n");
    fs.writeFileSync(path.join(context.projectPath, ".env.example"), content + "\n");
  }

  fs.writeFileSync(path.join(context.projectPath, SETUP_GUIDE), getSetupGuide(context, sections.length > 0));

  const readmePath = path.join(context.projectPath, "README.md");
  if (!fs.existsSync(readmePath)) {
    fs.writeFileSync(readmePath, getReadme(context));
  }
}

function getReadme(context) {
  return [
    `# ${context.projectName}`,
    "",
    "> Bootstrapped with [Celtrix](https://github.com/celtrix-os/Celtrix) — Custom Stack",
    "",
    `See [${SETUP_GUIDE}](${SETUP_GUIDE}) to set up and run the app.`,
    "",
  ].join("\n");
}

function getEnvSections(context) {
  const { database, frontend } = context.config;
  const hasDatabase = database && database.type !== "none";
  const isViteReact = frontend === "react-router";
  const sections = [];

  if (context.hasBackend) {
    sections.push({
      title: "API server",
      lines: [
        "PORT=3001",
        `# Origin allowed to call the API directly (the Vite dev server proxies /api, so this is only needed outside it)`,
        `CORS_ORIGIN="http://localhost:5173"`,
      ],
    });
  }

  if (hasDatabase) {
    sections.push({ title: "Database", lines: getDatabaseLines(context, database) });
  }

  if (database?.provider === "supabase") {
    const lines = [
      "# Project Settings → API Keys",
      `SUPABASE_URL="https://<project-ref>.supabase.co"`,
      "# Server only: bypasses Row Level Security. Never expose it to the browser.",
      `SUPABASE_SECRET_KEY="sb_secret_..."`,
    ];
    if (isViteReact) {
      lines.push(
        "",
        "# Browser (Vite only exposes VITE_* variables to client code)",
        `VITE_SUPABASE_URL="https://<project-ref>.supabase.co"`,
        `VITE_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."`
      );
    }
    sections.push({ title: "Supabase", lines });
  }

  return sections;
}

function getDatabaseLines(context, database) {
  const dbName = getDatabaseName(context.projectName);

  if (database.provider === "docker") {
    return [
      "# Matches docker-compose.yml; start the container with `db:up`",
      `DATABASE_URL="${getDockerDatabaseUrl(database.type, dbName)}"`,
      "# Host port for the container. If you change it, change the port in DATABASE_URL too.",
      `# DB_PORT=${getDockerDatabasePort(database.type)}`,
    ];
  }

  switch (`${database.type}:${database.provider}`) {
    case "postgres:supabase":
      return [
        "# Project → Connect → ORMs. Replace [PASSWORD] with your database password.",
        "# Transaction pooler (port 6543): used by the app at runtime",
        `DATABASE_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"`,
        "# Session pooler (port 5432): used by Prisma for migrations",
        `DIRECT_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"`,
      ];
    case "mongodb:atlas":
      return [`DATABASE_URL="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/${dbName}"`];
    default:
      break;
  }

  switch (database.type) {
    case "postgres":
      return [`DATABASE_URL="postgresql://postgres:postgres@localhost:5432/${dbName}"`];
    case "mysql":
      return [`DATABASE_URL="mysql://root:root@localhost:3306/${dbName}"`];
    case "mongodb":
      return [`DATABASE_URL="mongodb://localhost:27017/${dbName}"`];
    case "sqlite":
    default:
      return [`DATABASE_URL="file:./dev.db"`];
  }
}

function getSetupGuide(context, hasEnv) {
  const { config, projectName } = context;
  const pm = context.packageManager;
  const runCmd = (script) => (pm === "npm" ? `npm run ${script}` : `${pm} ${script}`);
  const hasDatabase = config.database && config.database.type !== "none" && config.orm && config.orm !== "none";
  // Mongoose creates its collections and indexes at runtime, so only Prisma has db:* scripts
  const hasDbScripts = hasDatabase && config.orm === "prisma";
  const isSupabase = config.database?.provider === "supabase";
  const isDocker = config.database?.provider === "docker";

  const rows = [
    ["Language", config.language],
    ["Frontend", config.frontend],
    ["Backend", config.backend],
    ["Database", config.database?.type !== "none" ? `${config.database.type}${config.database.provider ? ` (${config.database.provider})` : ""}` : null],
    ["ORM", config.orm],
  ].filter(([, value]) => value && value !== "none");

  const lines = [
    `# ${projectName} — Setup guide`,
    "",
    "> Bootstrapped with [Celtrix](https://github.com/celtrix-os/Celtrix) — Custom Stack",
    "",
    "## Tech Stack",
    "",
    "| Layer | Choice |",
    "|-------|--------|",
    ...rows.map(([label, value]) => `| ${label} | ${value} |`),
    "",
    "## Getting Started",
    "",
  ];

  if (context.hasBackend && config.runtime === "bun") {
    lines.push("> The API runs on [Bun](https://bun.sh). Install Bun before starting the app.", "");
  }

  let step = 1;
  if (hasEnv) {
    lines.push(
      isDocker
        ? `${step++}. Copy the environment template. Its \`DATABASE_URL\` already points at the Docker database. A single \`.env\` at the repo root is shared by every app and package:`
        : `${step++}. Copy the environment template and fill it in. A single \`.env\` at the repo root is shared by every app and package:`,
      "",
      "   ```bash",
      "   cp .env.example .env",
      "   ```",
      ""
    );
  }

  if (isSupabase) {
    lines.push(
      `${step++}. Create a project at [supabase.com/dashboard](https://supabase.com/dashboard), then copy into \`.env\`:`,
      "   - **Connect → ORMs**: the transaction pooler string (port 6543) as `DATABASE_URL` and the session pooler string (port 5432) as `DIRECT_URL`",
      "   - **Project Settings → API Keys**: the project URL, the secret key (`SUPABASE_SECRET_KEY`, server only) and the publishable key (`VITE_SUPABASE_PUBLISHABLE_KEY`, browser)",
      ""
    );
  }

  if (isDocker) {
    lines.push(
      `${step++}. Start the database in Docker (requires [Docker](https://docs.docker.com/get-docker/)). This waits until it is ready:`,
      "",
      "   ```bash",
      `   ${runCmd("db:up")}`,
      "   ```",
      ""
    );
  }

  if (hasDbScripts) {
    lines.push(
      `${step++}. Push the schema to your database:`,
      "",
      "   ```bash",
      `   ${runCmd("db:push")}`,
      "   ```",
      ""
    );
  }

  lines.push(
    `${step++}. Start everything:`,
    "",
    "   ```bash",
    `   ${runCmd("dev")}`,
    "   ```",
    ""
  );

  if (context.hasFrontend && context.hasBackend) {
    lines.push(
      "The web app runs on http://localhost:5173 and proxies `/api/*` to the API on http://localhost:3001.",
      ""
    );
  }

  if (hasDbScripts || isDocker) {
    lines.push(
      "## Database scripts",
      "",
      "| Script | What it does |",
      "|--------|--------------|",
      ...(isDocker
        ? [
          `| \`${runCmd("db:up")}\` | Start the database container and wait until it is healthy |`,
          `| \`${runCmd("db:down")}\` | Stop the database container (data is kept in the \`db-data\` volume) |`,
        ]
        : []),
      ...(hasDbScripts
        ? [
          `| \`${runCmd("db:push")}\` | Sync the schema to the database without a migration |`,
          `| \`${runCmd("db:migrate")}\` | Create and apply a migration |`,
          `| \`${runCmd("db:generate")}\` | Regenerate the Prisma client |`,
          `| \`${runCmd("db:studio")}\` | Browse your data |`,
        ]
        : []),
      ""
    );
  }

  if (context.hasBackend) {
    lines.push(
      "## API",
      "",
      "| Method | Path | Description |",
      "|--------|------|-------------|",
      "| GET | `/api/health` | API, database and Supabase status |",
      ...(hasDatabase && context.hasFrontend
        ? ["| GET | `/api/users` | List users |", "| POST | `/api/users` | Create a user (`{ email, name? }`) |"]
        : []),
      ...(isSupabase ? ["| GET | `/api/me` | Current Supabase user (`Authorization: Bearer <access token>`) |"] : []),
      ""
    );
  }

  lines.push(
    "Your full stack configuration is saved in `celtrix.config.json`.",
    "",
    "---",
    "",
    "*Made with ❤️ by [Celtrix](https://github.com/celtrix-os/Celtrix)*",
    ""
  );

  return lines.join("\n");
}
