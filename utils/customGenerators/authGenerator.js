import fs from "fs-extra";
import path from "path";
import { run } from "../progress.js";
import { getInstallCommand } from "../shared.js";
import { fileURLToPath } from "url";
import { logger } from "../logger.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateAuth(context) {
  if (context.config.auth !== "clerk" &&	context.config.auth !== "better-auth") return;

  if (context.config.frontend === "solid") {
    logger.warn(
      "SolidStart authentication integration is not supported yet. Skipping authentication scaffolding."
    );
    return;
  }
  if (context.config.auth === "better-auth") {
    // Create auth package for better-auth
    const authDir = path.join(context.projectPath, "packages", "auth");
    fs.ensureDirSync(authDir);

    const pkgJson = {
      name: "@repo/auth",
      version: "1.0.0",
      private: true,
      main: "./src/index.ts",
      types: "./src/index.ts"
    };
    fs.writeJsonSync(path.join(authDir, "package.json"), pkgJson, { spaces: 2 });

    // Add .gitignore for auth package from template
    const templatesDir = context.templatesDir || path.join(__dirname, "../../templates/gitignore");
    const authGitignorePath = path.join(templatesDir, "auth.gitignore");
    if (fs.existsSync(authGitignorePath)) {
      fs.copyFileSync(authGitignorePath, path.join(authDir, ".gitignore"));
    }

    fs.ensureDirSync(path.join(authDir, "src"));

    const authCode = `import { betterAuth } from "better-auth";

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:3000",
  secret: process.env.BETTER_AUTH_SECRET || "secret-key",
});

export type Session = typeof auth.$Infer.Session;
`;
    fs.writeFileSync(path.join(authDir, "src", `index.${context.ext}`), authCode);

    if (context.installDeps) {
      const installCmd = getInstallCommand(context.packageManager);
      await run(`${context.packageManager} ${installCmd} better-auth`, { cwd: authDir });
    }
  }

  const webDir = path.join(context.projectPath, "apps", "web");
  if (fs.existsSync(webDir)) {
    if (context.installDeps) {
      const installCmd = getInstallCommand(context.packageManager);
      if (context.config.auth === "clerk") {
        await run(`${context.packageManager} ${installCmd} @clerk/clerk-react`, { cwd: webDir });
      } else if (context.config.auth === "better-auth") {
        await run(`${context.packageManager} ${installCmd} @repo/auth`, { cwd: webDir });
      }
    }

    // Injects auth context wrapper
    const appPath = path.join(webDir, "src", `App.${context.jsxExt}`);
    if (fs.existsSync(appPath)) {
      let content = fs.readFileSync(appPath, "utf-8");
      if (context.config.auth === "clerk") {
        content = `import { ClerkProvider } from '@clerk/clerk-react';\n` + content;
        content = content.replace(
          /return \(([\s\S]*)\);/,
          (match, inner) => `return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || ""}>
      ${inner.trim()}
    </ClerkProvider>
  );`
        );
      } else if (context.config.auth === "better-auth") {
        content = `import { auth } from '@repo/auth';\n` + content;
      }
      fs.writeFileSync(appPath, content);
    }
  }
}
