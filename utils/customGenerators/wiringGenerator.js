import fs from "fs-extra";
import path from "path";
import { logger } from "../logger.js";
import { getWorkspaceVersion } from "../shared.js";

/**
 * Connects the generated pieces of a monorepo to each other:
 *   - links apps/api to the @repo/database workspace package
 *   - exposes the database CLI tasks (db:push, db:migrate, …) through turbo
 *   - points the React/Vite app at the shared .env and proxies /api to the server
 *     (Next.js rewrites /api to it instead)
 *   - gives the web app a typed API client and a live stack-status panel
 */
export async function generateWiring(context) {
  const apiDir = path.join(context.projectPath, "apps", "api");
  const webDir = path.join(context.projectPath, "apps", "web");
  const databasePkgPath = path.join(context.projectPath, "packages", "database", "package.json");
  const hasDatabasePackage = fs.existsSync(databasePkgPath);
  const hasSupabase = context.config.database?.provider === "supabase";

  if (hasDatabasePackage) {
    const apiPkgPath = path.join(apiDir, "package.json");
    const apiPkg = fs.readJsonSync(apiPkgPath);
    apiPkg.dependencies = { ...apiPkg.dependencies, "@repo/database": getWorkspaceVersion(context.packageManager) };
    fs.writeJsonSync(apiPkgPath, apiPkg, { spaces: 2 });

    // Only ORMs with a CLI (Prisma) define db:* scripts; Mongoose has none
    const tasks = Object.keys(fs.readJsonSync(databasePkgPath).scripts ?? {}).filter((name) => name.startsWith("db:"));
    if (tasks.length > 0) addDatabaseTasks(context.projectPath, tasks);
  }

  const isNext = context.config.frontend === "nextjs";
  if ((context.config.frontend !== "react-router" && !isNext) || !fs.existsSync(path.join(webDir, "src"))) return;

  if (isNext) {
    // create-next-app writes next.config.ts, or next.config.mjs for JavaScript
    const nextConfigPath = ["ts", "mjs", "js"]
      .map((ext) => path.join(webDir, `next.config.${ext}`))
      .find((file) => fs.existsSync(file));
    if (nextConfigPath) {
      fs.writeFileSync(nextConfigPath, addApiRewrite(fs.readFileSync(nextConfigPath, "utf-8")));
    }
  } else {
    const viteConfigPath = path.join(webDir, `vite.config.${context.ext}`);
    if (fs.existsSync(viteConfigPath)) {
      fs.writeFileSync(viteConfigPath, getViteConfig());
    }
  }

  fs.ensureDirSync(path.join(webDir, "src", "lib"));
  // The browser Supabase client is only generated for React/Vite
  fs.writeFileSync(
    path.join(webDir, "src", "lib", `api.${context.ext}`),
    getApiClient(context.isTs, hasDatabasePackage, hasSupabase && !isNext)
  );

  fs.ensureDirSync(path.join(webDir, "src", "components"));
  fs.writeFileSync(
    path.join(webDir, "src", "components", `StackStatus.${context.jsxExt}`),
    getStackStatusComponent(context.isTs, hasDatabasePackage)
  );

  // create-next-app names the JavaScript page page.js
  const appPath = isNext
    ? path.join(webDir, "src", "app", `page.${context.isTs ? "tsx" : "js"}`)
    : path.join(webDir, "src", `App.${context.jsxExt}`);
  if (fs.existsSync(appPath)) {
    const content = fs.readFileSync(appPath, "utf-8");
    if (!content.includes("StackStatus")) {
      fs.writeFileSync(appPath, addStatusView(content, isNext ? "@/components/StackStatus" : "./components/StackStatus"));
    }
  }
}

/**
 * Makes the live stack status (API, database, users) the welcome page's first
 * screen. The todo demo stays reachable from the navbar and a button below it.
 */
export function addStatusView(content, importPath = "./components/StackStatus") {
  const views = "const VIEWS = ['todo']";
  // The Next.js page renders the todo list only once it has hydrated
  const todoPanel = content.match(/^ {8}\{view === 'todo' && (hydrated && )?<TodoPanel \/>\}$/m)?.[0];
  const reactImport = content.match(/^import .* from 'react'\n/m)?.[0];
  if (!content.includes(views) || !todoPanel || !reactImport) {
    logger.warn("⚠️ Unexpected App layout, skipping the stack status screen");
    return content;
  }

  // Replacer functions so the matched text is inserted literally
  return content
    .replace(reactImport, () => `${reactImport}import StackStatus from '${importPath}'\n`)
    .replace(views, "const VIEWS = ['status', 'todo']")
    .replace(todoPanel, () => `        {view === 'status' && (
          <>
            <StackStatus />
            <button type="button" className="text-button" onClick={() => setView('todo')}>
              try todo →
            </button>
          </>
        )}
${todoPanel}`);
}

/**
 * Adds a rewrite that forwards /api/* to the API server, reading its PORT from
 * the shared root .env, while keeping the options create-next-app set.
 */
export function addApiRewrite(content) {
  const marker = "  /* config options here */\n";
  if (!content.includes(marker)) {
    logger.warn("⚠️ Unexpected next.config layout, skipping the /api rewrite");
    return content;
  }

  const header = `import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { parseEnv } from "node:util";

// The workspace root holds the single .env shared by the web app, API and database tooling.
// Only PORT is read from it, so nothing else leaks into the Next.js environment.
const rootEnvPath = path.resolve(process.cwd(), "../../.env");
const rootEnv = existsSync(rootEnvPath) ? parseEnv(readFileSync(rootEnvPath, "utf-8")) : {};
const apiUrl = \`http://localhost:\${rootEnv.PORT || 3001}\`;

`;
  const rewrites = `  async rewrites() {
    return [
      // Forward API calls to the backend so the browser stays same-origin
      { source: "/api/:path*", destination: \`\${apiUrl}/api/:path*\` },
    ];
  },
`;
  return header + content.replace(marker, () => marker + rewrites);
}

function addDatabaseTasks(projectPath, tasks) {
  const turboPath = path.join(projectPath, "turbo.json");
  if (fs.existsSync(turboPath)) {
    const turbo = fs.readJsonSync(turboPath);
    for (const task of tasks) {
      turbo.tasks[task] = task === "db:studio" ? { cache: false, persistent: true } : { cache: false };
    }
    fs.writeJsonSync(turboPath, turbo, { spaces: 2 });
  }

  const rootPkgPath = path.join(projectPath, "package.json");
  const rootPkg = fs.readJsonSync(rootPkgPath);
  for (const task of tasks) {
    rootPkg.scripts[task] = `turbo run ${task}`;
  }
  fs.writeJsonSync(rootPkgPath, rootPkg, { spaces: 2 });
}

function getViteConfig() {
  return `import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'

// The workspace root holds the single .env shared by the web app, API and database tooling
const envDir = '../../'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, envDir, '')

  return {
    plugins: [react()],
    // Only VITE_* variables are exposed to browser code
    envDir,
    server: {
      proxy: {
        // Forward API calls to the backend so the browser stays same-origin in development
        '/api': \`http://localhost:\${env.PORT || 3001}\`,
      },
    },
  }
})
`;
}

function getApiClient(isTs, hasDatabase, hasSupabase) {
  const t = (type) => (isTs ? type : "");

  const types = isTs
    ? `export type Health = {
  status: string;
  engine: string;
  database?: string;
  supabase?: string;
};
${hasDatabase ? `
export type User = {
  id: string;
  email: string;
  name: string | null;
  createdAt: string;
};
` : ""}
`
    : "";

  const authHeader = hasSupabase
    ? `
  // Forward the Supabase session so protected routes (e.g. /api/me) know the user
  const session = supabase ? (await supabase.auth.getSession()).data.session : null;
  if (session) headers.set('Authorization', \`Bearer \${session.access_token}\`);
`
    : "";

  const endpoints = [
    `  // /api/health answers 503 when the database is down, so read the body either way
  health: () => fetch('/api/health').then((res) => res.json()${t(" as Promise<Health>")}),`,
  ];
  if (hasDatabase) {
    endpoints.push(
      `  listUsers: () => request${t("<User[]>")}('/api/users'),`,
      `  createUser: (data${t(": { email: string; name?: string }")}) =>
    request${t("<User>")}('/api/users', { method: 'POST', body: JSON.stringify(data) }),`
    );
  }
  if (hasSupabase) {
    endpoints.push(`  me: () => request${t("<{ id: string; email?: string }>")}('/api/me'),`);
  }

  return `${hasSupabase ? "import { supabase } from './supabase';\n\n" : ""}${types}// Requests use relative /api/* paths, which Vite proxies to the API server in development.
async function request${t("<T>")}(path${t(": string")}, init${t(": RequestInit")} = {})${t(": Promise<T>")} {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
${authHeader}
  const res = await fetch(path, { ...init, headers });
  const body = await res.json().catch(() => null);
  if (!res.ok) throw new Error(body?.error ?? \`Request failed with status \${res.status}\`);
  return body${t(" as T")};
}

export const api = {
${endpoints.join("\n")}
};
`;
}

function getStackStatusComponent(isTs, hasDatabase) {
  const t = (type) => (isTs ? type : "");
  const typeImport = isTs ? `, type Health${hasDatabase ? ", type User" : ""}` : "";

  const userState = hasDatabase
    ? `
  const [users, setUsers] = useState${t("<User[]>")}([]);
  const [email, setEmail] = useState('');
  const [error, setError] = useState${t("<string | null>")}(null);`
    : "";

  const userRefresh = hasDatabase
    ? `
    api.listUsers().then(setUsers).catch((err) => setError(err.message));`
    : "";

  const userSection = hasDatabase
    ? `

        <form
          className="prompt-row"
          style={{ marginTop: '1.1rem' }}
          onSubmit={async (event) => {
            event.preventDefault();
            setError(null);
            try {
              await api.createUser({ email });
              setEmail('');
              refresh();
            } catch (err) {
              setError((err${t(" as Error")}).message);
            }
          }}
        >
          <label htmlFor="user-email" className="prompt">&gt;</label>
          <input
            id="user-email"
            type="email"
            required
            placeholder="add a user's email and press enter"
            autoComplete="off"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
        </form>
        {error && <pre className="output failed">✗ {error}</pre>}
        {users.length === 0 ? (
          <p className="empty">no users yet. they are saved to the database.</p>
        ) : (
          <ol className="todo-list">
            {users.map((user, i) => (
              <li key={user.id} style={{ gridTemplateColumns: '2rem 1fr' }}>
                <span className="index" aria-hidden="true">{String(i + 1).padStart(2, '0')}</span>
                <span className="todo-text">{user.email}</span>
              </li>
            ))}
          </ol>
        )}`
    : "";

  return `import { useEffect, useState } from 'react';
import { api${typeImport} } from '../lib/api';

// Live round-trip through the whole stack: web → API → database.
// Styled with the welcome page's terminal classes from App.css.
export default function StackStatus() {
  const [health, setHealth] = useState${t("<Health | null>")}(null);${userState}

  const refresh = () => {
    api.health().then(setHealth).catch(() => setHealth({ status: 'unreachable', engine: 'API' }));${userRefresh}
  };

  useEffect(refresh, []);

  const rows = health
    ? [
        ['api', \`\${health.engine} · \${health.status}\`],
        ['database', health.database ?? 'not-configured'],
        ...(health.supabase ? [['supabase', health.supabase]] : []),
      ]
    : [];
  const healthy = (value${t(": string")}) => /(^|· )(ok|up|configured)$/.test(value);

  return (
    <section className="window" aria-labelledby="stack-title">
      <div className="window-bar">
        <h2 id="stack-title" className="window-title">~/stack/status</h2>
        <span className="window-meta">web → api → database</span>
      </div>
      <div className="window-body">
        {!health && <p className="empty" style={{ marginTop: 0 }}>checking…</p>}
        {rows.map(([label, value]) => (
          <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0' }}>
            <span className="dim">{label}</span>
            <span className={healthy(value) ? 'ok' : 'error'}>{value}</span>
          </div>
        ))}${userSection}
      </div>
      <div className="statusline" aria-hidden="true">
        <span className="mode">STATUS</span>
        <span className="statusline-info">{health ? health.status : 'pending'}</span>
        <span className="statusline-right">live · /api</span>
      </div>
    </section>
  );
}
`;
}
