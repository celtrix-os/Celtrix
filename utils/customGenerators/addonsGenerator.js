import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import { getInstallCommand } from "../shared.js";

export async function generateAddons(context) {
  const { addons } = context.config;

  if (addons.includes("biome")) {
    const biomeConfig = {
      $schema: "https://biomejs.dev/schemas/1.8.3/schema.json",
      organizeImports: {
        enabled: true
      },
      linter: {
        enabled: true,
        rules: {
          recommended: true
        }
      }
    };
    fs.writeJsonSync(path.join(context.projectPath, "biome.json"), biomeConfig, { spaces: 2 });
    
    if (context.installDeps) {
      const installCmd = getInstallCommand(context.packageManager);
      execSync(`${context.packageManager} ${installCmd} -D @biomejs/biome`, { cwd: context.projectPath, stdio: "inherit" });
    }
  }

  if (addons.includes("husky")) {
    if (context.installDeps) {
      execSync(`npx -y husky-init`, { cwd: context.projectPath, stdio: "inherit" });
    }
  }

  if (addons.includes("vercel-ai-sdk")) {
    const apiDir = path.join(context.projectPath, "apps", "api");
    if (fs.existsSync(apiDir) && context.installDeps) {
      const installCmd = getInstallCommand(context.packageManager);
      execSync(`${context.packageManager} ${installCmd} ai @ai-sdk/openai`, { cwd: apiDir, stdio: "inherit" });
    }
  }
}
