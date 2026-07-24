import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import { getInstallCommand } from "../shared.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateAPI(context) {
  if (context.config.api !== "trpc") return;

  const targetDir = path.join(context.projectPath, "packages", "api-bridge");
  fs.ensureDirSync(targetDir);

  const pkgJson = {
    name: "@repo/api-bridge",
    version: "1.0.0",
    private: true,
    main: "./src/root.ts"
  };
  fs.writeJsonSync(path.join(targetDir, "package.json"), pkgJson, { spaces: 2 });

  // Add .gitignore for API package from template
  const templatesDir = context.templatesDir || path.join(__dirname, "../../templates/gitignore");
  const apiGitignorePath = path.join(templatesDir, "api.gitignore");
  if (fs.existsSync(apiGitignorePath)) {
    fs.copyFileSync(apiGitignorePath, path.join(targetDir, ".gitignore"));
  }

  fs.ensureDirSync(path.join(targetDir, "src"));

  const rootRouter = `import { initTRPC } from '@trpc/server';

const t = initTRPC.create();
export const router = t.router;
export const publicProcedure = t.procedure;

export const appRouter = router({
  getGreetings: publicProcedure.query(async () => {
    return { greeting: "Hello from Celtrix tRPC!" };
  }),
});

export type AppRouter = typeof appRouter;
`;
  fs.writeFileSync(path.join(targetDir, "src", "root.ts"), rootRouter);

  if (context.installDeps) {
    const installCmd = getInstallCommand(context.packageManager);
    execSync(`${context.packageManager} ${installCmd} @trpc/server zod`, { cwd: targetDir, stdio: "inherit" });
  }

  // Inject frontend caller
  const webDir = path.join(context.projectPath, "apps", "web", "src");
  if (fs.existsSync(webDir)) {
    fs.ensureDirSync(path.join(webDir, "utils"));
    const clientCode = `import { createTRPCReact } from '@trpc/react-query';
import type { AppRouter } from '@repo/api-bridge';

export const trpc = createTRPCReact<AppRouter>();
`;
    fs.writeFileSync(path.join(webDir, "utils", `trpc.${context.ext}`), clientCode);
  }
}
