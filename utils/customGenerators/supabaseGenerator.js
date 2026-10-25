import fs from "fs-extra";
import path from "path";
import { run } from "../progress.js";
import { getInstallCommand } from "../shared.js";

/**
 * Wires Supabase clients into the generated apps:
 *   apps/api/src/lib/supabase.*  – server client (secret key) + access-token verification
 *   apps/web/src/lib/supabase.*  – browser client (publishable key), React/Vite only
 *
 * The Postgres connection itself is handled by the ORM in @repo/database.
 */
export async function generateSupabase(context) {
  const installCmd = getInstallCommand(context.packageManager);
  const apiDir = context.hasFrontend ? path.join(context.projectPath, "apps", "api") : context.projectPath;
  const webDir = path.join(context.projectPath, "apps", "web");

  if (context.hasBackend) {
    fs.ensureDirSync(path.join(apiDir, "src", "lib"));
    fs.writeFileSync(path.join(apiDir, "src", "lib", `supabase.${context.ext}`), getServerClient(context.isTs));

    if (context.installDeps) {
      await run(`${context.packageManager} ${installCmd} @supabase/supabase-js`, { cwd: apiDir });
    }
  }

  if (context.config.frontend === "react-router" && fs.existsSync(path.join(webDir, "src"))) {
    fs.ensureDirSync(path.join(webDir, "src", "lib"));
    fs.writeFileSync(path.join(webDir, "src", "lib", `supabase.${context.ext}`), getBrowserClient());

    if (context.installDeps) {
      await run(`${context.packageManager} ${installCmd} @supabase/supabase-js`, { cwd: webDir });
    }
  }
}

function getServerClient(isTs) {
  const t = (type) => (isTs ? type : "");

  return `import { createClient${isTs ? ", type User" : ""} } from '@supabase/supabase-js';
import { env } from '../env.js';

// Server-side client using the secret key: it bypasses Row Level Security.
// Never expose SUPABASE_SECRET_KEY to the browser.
export const supabaseAdmin =
  env.SUPABASE_URL && env.SUPABASE_SECRET_KEY
    ? createClient(env.SUPABASE_URL, env.SUPABASE_SECRET_KEY, {
        auth: { autoRefreshToken: false, persistSession: false },
      })
    : null;

// Resolves "Authorization: Bearer <supabase access token>" to the signed-in user.
export async function getUserFromToken(authorization${t(": string | undefined")})${t(": Promise<User | null>")} {
  const token = authorization?.startsWith('Bearer ') ? authorization.slice(7) : undefined;
  if (!supabaseAdmin || !token) return null;

  const { data, error } = await supabaseAdmin.auth.getUser(token);
  return error ? null : data.user;
}
`;
}

function getBrowserClient() {
  return `import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.VITE_SUPABASE_URL;
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

// Browser client: uses the publishable key, so Row Level Security applies.
// null until VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set in the root .env.
export const supabase = url && publishableKey ? createClient(url, publishableKey) : null;
`;
}
