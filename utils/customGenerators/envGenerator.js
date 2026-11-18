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

  if (context.hasFrontend) {
    sections.push({
      title: "Frontend",
      lines: [
        `FRONTEND_API_URL="http://localhost:3001/"`,
      ],
    });
  }

  if (context.hasBackend) {
    sections.push({
      title: "Backend",
      lines: [
        "BACKEND_PORT=3001",
        "PORT=3001",
        ...(frontend === "nextjs"
          ? [
              `# Origin allowed to call the API directly (Next.js rewrites /api to it, so this is only needed outside that)`,
              `CORS_ORIGIN="http://localhost:3000"`,
            ]
          : [
              `# Origin allowed to call the API directly (the Vite dev server proxies /api, so this is only needed outside it)`,
              `CORS_ORIGIN="http://localhost:5173"`,
            ]),
      ],
    });
  }

  if (hasDatabase) {
    sections.push({ title: "Database", lines: getDatabaseLines(context, database) });
  }

  if (database?.provider === "supabase") {
    const lines = [
      "# Project Settings → API Keys",
      `SUPABASE_URL="https://[supabase-project-url].supabase.co"`,
      `SUPABASE_ANON_KEY="[supabase-anon-key]"`,
      "# Server only: bypasses Row Level Security. Never expose it to the browser.",
      `SUPABASE_SECRET_KEY="[supabase-secret-key]"`,
    ];
    if (isViteReact) {
      lines.push(
        "",
        "# Browser (Vite only exposes VITE_* variables to client code)",
        `VITE_SUPABASE_URL="https://[supabase-project-url].supabase.co"`,
        `VITE_SUPABASE_ANON_KEY="[supabase-anon-key]"`,
        `VITE_SUPABASE_PUBLISHABLE_KEY="[supabase-anon-key]"`
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
        "# Project → Connect → ORMs. Replace placeholders with your database credentials.",
        "# Transaction pooler (port 6543): used by the app at runtime",
        `DATABASE_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"`,
        "# Session pooler (port 5432): used by Prisma for migrations",
        `DIRECT_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"`,
      ];
    case "postgres:neon":
      return [
        `DATABASE_URL="postgresql://[username]:[password]@[host]/[database]?sslmode=require"`,
      ];
    case "mysql:planetscale":
      return [
        `DATABASE_URL="mysql://[username]:[password]@[host]/[database]"`,
      ];
    case "sqlite:turso":
      return [
        `TURSO_DATABASE_URL="[turso-database-url]"`,
        `TURSO_AUTH_TOKEN="[turso-auth-token]"`,
        `DATABASE_URL="libsql://[turso-database-url]?authToken=[turso-auth-token]"`,
      ];
    case "mongodb:atlas":
      return [
        `MONGODB_URI="mongodb+srv://[username]:[password]@[cluster].mongodb.net/[database]"`,
        `DATABASE_URL="mongodb+srv://[username]:[password]@[cluster].mongodb.net/[database]"`,
      ];
    default:
      break;
  }

  switch (database.type) {
    case "postgres":
      return [`DATABASE_URL="postgresql://[username]:[password]@localhost:5432/[database]"`];
    case "mysql":
      return [`DATABASE_URL="mysql://[username]:[password]@localhost:3306/[database]"`];
    case "mongodb":
      return [
        `MONGODB_URI="mongodb://[username]:[password]@localhost:27017/[database]"`,
        `DATABASE_URL="mongodb://[username]:[password]@localhost:27017/[database]"`,
      ];
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
        : `${step++}. Copy the environment template and replace all placeholders with valid values before starting the application. A single \`.env\` at the repo root is shared by every app and package:`,
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
      "   - **Project Settings → API Keys**: the project URL (`SUPABASE_URL`), the anon key (`SUPABASE_ANON_KEY`), and secret key (`SUPABASE_SECRET_KEY`)",
      ""
    );
  }

  if (config.database?.provider === "neon") {
    lines.push(
      `${step++}. Create a project at [neon.tech](https://neon.tech), then copy your PostgreSQL connection string into \`.env\` as \`DATABASE_URL\`.`,
      ""
    );
  }

  if (config.database?.provider === "turso") {
    lines.push(
      `${step++}. Create a database at [turso.tech](https://turso.tech), then copy your database URL and auth token into \`.env\` as \`TURSO_DATABASE_URL\` and \`TURSO_AUTH_TOKEN\`.`,
      ""
    );
  }

  if (config.database?.provider === "planetscale") {
    lines.push(
      `${step++}. Create a database at [planetscale.com](https://planetscale.com), then copy your MySQL connection string into \`.env\` as \`DATABASE_URL\`.`,
      ""
    );
  }

  if (config.database?.provider === "atlas") {
    lines.push(
      `${step++}. Create a database cluster at [mongodb.com/atlas](https://www.mongodb.com/atlas), then copy your connection string into \`.env\` as \`MONGODB_URI\` and \`DATABASE_URL\`.`,
      ""
    );
  }

  if (config.database?.type === "postgres" && config.database?.provider === "local") {
    lines.push(
      `${step++}. Ensure your local PostgreSQL server is running on port 5432, then update \`DATABASE_URL\` in \`.env\` with your valid credentials and database name.`,
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
      config.frontend === "nextjs"
        ? "The web app runs on http://localhost:3000 and rewrites `/api/*` to the API on http://localhost:3001."
        : "The web app runs on http://localhost:5173 and proxies `/api/*` to the API on http://localhost:3001.",
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
