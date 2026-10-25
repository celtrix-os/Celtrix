import fs from "fs-extra";
import path from "path";
import { getWorkspaceVersion } from "../shared.js";

/**
 * Connects the generated pieces of a monorepo to each other:
 *   - links apps/api to the @repo/database workspace package
 *   - exposes the database CLI tasks (db:push, db:migrate, …) through turbo
 *   - points the React/Vite app at the shared .env and proxies /api to the server
 *   - gives the web app a typed API client and a live stack-status panel
 */
export async function generateWiring(context) {
  const apiDir = path.join(context.projectPath, "apps", "api");
  const webDir = path.join(context.projectPath, "apps", "web");
  const hasDatabasePackage = fs.existsSync(path.join(context.projectPath, "packages", "database", "package.json"));
  const hasSupabase = context.config.database?.provider === "supabase";

  if (hasDatabasePackage) {
    const apiPkgPath = path.join(apiDir, "package.json");
    const apiPkg = fs.readJsonSync(apiPkgPath);
    apiPkg.dependencies = { ...apiPkg.dependencies, "@repo/database": getWorkspaceVersion(context.packageManager) };
    fs.writeJsonSync(apiPkgPath, apiPkg, { spaces: 2 });

    addDatabaseTasks(context.projectPath);
  }

  if (context.config.frontend !== "react-router" || !fs.existsSync(path.join(webDir, "src"))) return;

  const viteConfigPath = path.join(webDir, `vite.config.${context.ext}`);
  if (fs.existsSync(viteConfigPath)) {
    fs.writeFileSync(viteConfigPath, getViteConfig());
  }

  fs.ensureDirSync(path.join(webDir, "src", "lib"));
  fs.writeFileSync(path.join(webDir, "src", "lib", `api.${context.ext}`), getApiClient(context.isTs, hasDatabasePackage, hasSupabase));

  fs.ensureDirSync(path.join(webDir, "src", "components"));
  fs.writeFileSync(
    path.join(webDir, "src", "components", `StackStatus.${context.jsxExt}`),
    getStackStatusComponent(context.isTs, hasDatabasePackage)
  );

  const appPath = path.join(webDir, "src", `App.${context.jsxExt}`);
  if (fs.existsSync(appPath)) {
    let content = fs.readFileSync(appPath, "utf-8");
    if (content.includes("</main>") && !content.includes("StackStatus")) {
      content = `import StackStatus from './components/StackStatus';\n\n` + content;
      content = content.replace("</main>", "  <StackStatus />\n      </main>");
      fs.writeFileSync(appPath, content);
    }
  }
}

function addDatabaseTasks(projectPath) {
  const tasks = ["db:generate", "db:push", "db:migrate", "db:studio"];

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
        style={{ display: 'flex', gap: '0.5rem', marginTop: '1rem' }}
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
        <input
          type="email"
          required
          placeholder="new-user@example.com"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          style={{ flex: 1, padding: '0.5rem', border: '1px solid #ccc', borderRadius: '0.375rem' }}
        />
        <button type="submit" style={{ padding: '0.5rem 1rem', borderRadius: '0.375rem', cursor: 'pointer' }}>
          Add user
        </button>
      </form>
      {error && <p style={{ color: '#dc2626' }}>{error}</p>}
      <ul style={{ paddingLeft: '1.25rem', color: '#333' }}>
        {users.map((user) => (
          <li key={user.id}>{user.email}</li>
        ))}
      </ul>`
    : "";

  return `import { useEffect, useState } from 'react';
import { api${typeImport} } from '../lib/api';

// Live round-trip through the whole stack: web → API → database
export default function StackStatus() {
  const [health, setHealth] = useState${t("<Health | null>")}(null);${userState}

  const refresh = () => {
    api.health().then(setHealth).catch(() => setHealth({ status: 'unreachable', engine: 'API' }));${userRefresh}
  };

  useEffect(refresh, []);

  const rows = health
    ? [
        ['API', \`\${health.engine} · \${health.status}\`],
        ['Database', health.database ?? 'not-configured'],
        ...(health.supabase ? [['Supabase', health.supabase]] : []),
      ]
    : [];

  return (
    <section style={{ marginTop: '2rem', width: '100%', maxWidth: '28rem', padding: '1rem 1.5rem', border: '1px solid #e9ecef', borderRadius: '0.75rem' }}>
      <h2 style={{ fontSize: '1.125rem', color: '#333', margin: '0 0 0.75rem' }}>Stack status</h2>
      {!health && <p style={{ color: '#666' }}>Checking…</p>}
      {rows.map(([label, value]) => (
        <div key={label} style={{ display: 'flex', justifyContent: 'space-between', padding: '0.25rem 0', color: '#333' }}>
          <span>{label}</span>
          <code>{value}</code>
        </div>
      ))}${userSection}
    </section>
  );
}
`;
}
