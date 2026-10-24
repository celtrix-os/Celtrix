import fs from "fs-extra";
import path from "path";
import { run } from "../progress.js";
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
      await run(`${context.packageManager} ${installCmd} -D @biomejs/biome`, { cwd: context.projectPath });
    }
  }

  if (addons.includes("husky")) {
    if (context.installDeps) {
      await run(`npx -y husky-init`, { cwd: context.projectPath });
    }
    
    // Add .husky to root .gitignore if it exists
    const gitignorePath = path.join(context.projectPath, ".gitignore");
    if (fs.existsSync(gitignorePath)) {
      let gitignoreContent = fs.readFileSync(gitignorePath, "utf-8");
      if (!gitignoreContent.includes(".husky/")) {
        gitignoreContent += "\n# Husky\n.husky/\n";
        fs.writeFileSync(gitignorePath, gitignoreContent, "utf-8");
      }
    }
  }

  if (addons.includes("vercel-ai-sdk")) {
    const apiDir = path.join(context.projectPath, "apps", "api");
    if (fs.existsSync(apiDir) && context.installDeps) {
      const installCmd = getInstallCommand(context.packageManager);
      await run(`${context.packageManager} ${installCmd} ai @ai-sdk/openai`, { cwd: apiDir });
    }
  }
}
