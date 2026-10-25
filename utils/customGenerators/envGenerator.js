import fs from "fs-extra";
import path from "path";

/**
 * Writes the workspace-level .env.example (every variable the generated code
 * reads, grouped by service) and a README explaining how to fill it in.
 */
export async function generateEnv(context) {
  const sections = getEnvSections(context);
  if (sections.length > 0) {
    const content = sections
      .map(({ title, lines }) => [`# ── ${title} ${"─".repeat(Math.max(4, 60 - title.length))}`, ...lines].join("\n"))
      .join("\n\n");
    fs.writeFileSync(path.join(context.projectPath, ".env.example"), content + "\n");
  }

  fs.writeFileSync(path.join(context.projectPath, "README.md"), getReadme(context, sections.length > 0));
}

function getEnvSections(context) {
  const { database, orm, auth, frontend } = context.config;
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
    sections.push({ title: "Database", lines: getDatabaseLines(context, database, orm) });
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

  if (auth === "clerk") {
    const publicKey = frontend === "nextjs" ? "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY" : "VITE_CLERK_PUBLISHABLE_KEY";
    sections.push({ title: "Clerk", lines: [`${publicKey}="pk_test_..."`, `CLERK_SECRET_KEY="sk_test_..."`] });
  } else if (auth === "better-auth") {
    sections.push({
      title: "Better Auth",
      lines: [
        "# Generate with: openssl rand -base64 32",
        `BETTER_AUTH_SECRET=""`,
        `BETTER_AUTH_URL="http://localhost:3001"`,
      ],
    });
  }

  return sections;
}

function getDatabaseLines(context, database, orm) {
  const dbName = context.projectName.replace(/[^a-zA-Z0-9_]/g, "_");

  switch (`${database.type}:${database.provider}`) {
    case "postgres:supabase":
      return [
        "# Project → Connect → ORMs. Replace [PASSWORD] with your database password.",
        "# Transaction pooler (port 6543): used by the app at runtime",
        `DATABASE_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:6543/postgres?pgbouncer=true"`,
        `# Session pooler (port 5432): used by ${orm === "drizzle" ? "drizzle-kit" : "Prisma"} for migrations`,
        `DIRECT_URL="postgres://postgres.[PROJECT-REF]:[PASSWORD]@aws-0-[REGION].pooler.supabase.com:5432/postgres"`,
      ];
    case "postgres:neon":
      return [
        "# Neon console → Connection Details",
        `DATABASE_URL="postgresql://<user>:<password>@<endpoint>.neon.tech/neondb?sslmode=require"`,
      ];
    case "mysql:planetscale":
      return [`DATABASE_URL="mysql://<user>:<password>@<host>/<database>?sslaccept=strict"`];
    case "mongodb:atlas":
      return [`DATABASE_URL="mongodb+srv://<user>:<password>@<cluster>.mongodb.net/${dbName}"`];
    case "sqlite:turso":
      return [`DATABASE_URL="libsql://<database>-<org>.turso.io"`, `DATABASE_AUTH_TOKEN=""`];
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

function getReadme(context, hasEnv) {
  const { config, projectName } = context;
  const pm = context.packageManager;
  const runCmd = (script) => (pm === "npm" ? `npm run ${script}` : `${pm} ${script}`);
  const hasDatabase = config.database && config.database.type !== "none" && config.orm && config.orm !== "none";
  const isSupabase = config.database?.provider === "supabase";

  const rows = [
    ["Language", config.language],
    ["Frontend", config.frontend],
    ["Backend", config.backend],
    ["Database", config.database?.type !== "none" ? `${config.database.type}${config.database.provider ? ` (${config.database.provider})` : ""}` : null],
    ["ORM", config.orm],
    ["API", config.api],
    ["Auth", config.auth],
    ["Add-ons", config.addons?.length ? config.addons.join(", ") : null],
  ].filter(([, value]) => value && value !== "none");

  const lines = [
    `# ${projectName}`,
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

  let step = 1;
  if (hasEnv) {
    lines.push(
      `${step++}. Copy the environment template and fill it in. A single \`.env\` at the repo root is shared by every app and package:`,
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

  if (hasDatabase) {
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

  if (hasDatabase) {
    lines.push(
      "## Database scripts",
      "",
      "| Script | What it does |",
      "|--------|--------------|",
      `| \`${runCmd("db:push")}\` | Sync the schema to the database without a migration |`,
      `| \`${runCmd("db:migrate")}\` | Create and apply a migration |`,
      `| \`${runCmd("db:generate")}\` | ${config.orm === "prisma" ? "Regenerate the Prisma client" : "Generate SQL migrations from the schema"} |`,
      `| \`${runCmd("db:studio")}\` | Browse your data |`,
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
