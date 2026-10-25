import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import { buildViteCommand } from "../shared.js";
import { writeWelcomePage } from "../welcomePage.js";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export async function generateFrontend(context) {
  const targetDir = context.hasBackend 
    ? path.join(context.projectPath, "apps", "web")
    : context.projectPath;

  fs.ensureDirSync(targetDir);
  
  if (context.config.frontend === "nextjs") {
    // Run Next.js CLI non-interactively
    const useTs = context.isTs ? "--typescript" : "--javascript";
    execSync(`npx -y create-next-app@latest . ${useTs} --eslint --tailwind --src-dir --app --import-alias "@/*" --yes`, {
      cwd: targetDir,
      stdio: "inherit"
    });
    
    // Add .gitignore for frontend from template
    const templatesDir = context.templatesDir || path.join(__dirname, "../../templates/gitignore");
    const packageGitignorePath = path.join(templatesDir, "package.gitignore");
    if (fs.existsSync(packageGitignorePath) && !fs.existsSync(path.join(targetDir, ".gitignore"))) {
      fs.copyFileSync(packageGitignorePath, path.join(targetDir, ".gitignore"));
    }
    return;
  }

  if (context.config.frontend === "nuxt") {
    // Run Nuxt CLI non-interactively
    const gitFlag = "--gitInit false";
    const installFlag = context.installDeps ? "--install" : "--no-install";
    execSync(`npx -y nuxi@latest init . --packageManager ${context.packageManager} ${gitFlag} ${installFlag} --yes`, {
      cwd: targetDir,
      stdio: "inherit"
    });
    
    // Add .gitignore for frontend from template
    const templatesDir = context.templatesDir || path.join(__dirname, "../../templates/gitignore");
    const packageGitignorePath = path.join(templatesDir, "package.gitignore");
    if (fs.existsSync(packageGitignorePath) && !fs.existsSync(path.join(targetDir, ".gitignore"))) {
      fs.copyFileSync(packageGitignorePath, path.join(targetDir, ".gitignore"));
    }
    return;
  }

  if (context.config.frontend === "astro") {
    // Run Astro CLI non-interactively
    const installFlag = context.installDeps ? "--install" : "--no-install";
    execSync(`npm create astro@latest . -- --template minimal ${installFlag} --no-git --yes`, {
      cwd: targetDir,
      stdio: "inherit"
    });
    
    // Add .gitignore for frontend from template
    const templatesDir = context.templatesDir || path.join(__dirname, "../../templates/gitignore");
    const packageGitignorePath = path.join(templatesDir, "package.gitignore");
    if (fs.existsSync(packageGitignorePath) && !fs.existsSync(path.join(targetDir, ".gitignore"))) {
      fs.copyFileSync(packageGitignorePath, path.join(targetDir, ".gitignore"));
    }
    return;
  }

  if (context.config.frontend === "svelte") {
    // Run SvelteKit CLI non-interactively using modern sv CLI
    const types = context.isTs ? "ts" : "jsdoc";
    execSync(`npx sv create . --template minimal --types ${types} --no-add-ons --no-install --no-dir-check`, {
      cwd: targetDir,
      stdio: "inherit"
    });
    writeWelcomePage(targetDir, {
      framework: "svelte",
      projectName: context.projectName,
      stack: stackLabel(context),
      typescript: context.isTs,
    });
    
    // Add .gitignore for frontend from template
    const templatesDir = context.templatesDir || path.join(__dirname, "../../templates/gitignore");
    const packageGitignorePath = path.join(templatesDir, "package.gitignore");
    if (fs.existsSync(packageGitignorePath) && !fs.existsSync(path.join(targetDir, ".gitignore"))) {
      fs.copyFileSync(packageGitignorePath, path.join(targetDir, ".gitignore"));
    }
    return;
  }

  if (context.config.frontend === "tanstack") {
    // Run TanStack Start CLI non-interactively using the new @tanstack/cli
    const installFlag = context.installDeps ? "" : "--no-install";
    const pmFlag = `--package-manager ${context.packageManager}`;
    execSync(`npx -y @tanstack/cli create . -y ${pmFlag} ${installFlag}`, {
      cwd: targetDir,
      stdio: "inherit"
    });
    
    // Add .gitignore for frontend from template
    const templatesDir = context.templatesDir || path.join(__dirname, "../../templates/gitignore");
    const packageGitignorePath = path.join(templatesDir, "package.gitignore");
    if (fs.existsSync(packageGitignorePath) && !fs.existsSync(path.join(targetDir, ".gitignore"))) {
      fs.copyFileSync(packageGitignorePath, path.join(targetDir, ".gitignore"));
    }
    return;
  }

  // Vite Boilerplate for React, Vue, Svelte, Solid
  const baseTemplate = getBaseTemplate(context.config.frontend);
  const templateName = context.isTs ? `${baseTemplate}-ts` : baseTemplate;
  const viteCmd = buildViteCommand(context.config, templateName, ".");

  execSync(viteCmd, { cwd: targetDir, stdio: "inherit", shell: true });

  // Add .gitignore for frontend from template
  const templatesDir = context.templatesDir || path.join(__dirname, "../../templates/gitignore");
  const packageGitignorePath = path.join(templatesDir, "package.gitignore");
  if (fs.existsSync(packageGitignorePath) && !fs.existsSync(path.join(targetDir, ".gitignore"))) {
    fs.copyFileSync(packageGitignorePath, path.join(targetDir, ".gitignore"));
  }

  // Replace the stock Vite page with the Celtrix welcome page
  writeWelcomePage(targetDir, {
    framework: baseTemplate,
    projectName: context.projectName,
    stack: stackLabel(context),
    typescript: context.isTs,
  });
}

function stackLabel(context) {
  return context.hasBackend
    ? `${context.config.frontend} + ${context.config.backend}`
    : context.config.frontend;
}

function getBaseTemplate(frontend) {
  switch (frontend) {
    case "vue": return "vue";
    case "svelte": return "svelte";
    case "solid": return "solid";
    case "react-router":
    default:
      return "react";
  }
}
