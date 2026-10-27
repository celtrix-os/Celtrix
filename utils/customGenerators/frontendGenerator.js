import fs from "fs-extra";
import path from "path";
import { run } from "../progress.js";
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
    // The workspace root owns git; a nested repo also stops Next.js finding the hoisted node_modules
    const installFlag = context.installDeps ? "" : " --skip-install";
    await run(`npx -y create-next-app@latest . ${useTs} --eslint --tailwind --src-dir --app --import-alias "@/*" --disable-git${installFlag} --yes`, { cwd: targetDir });
    
    // Add .gitignore for frontend from template
    const templatesDir = context.templatesDir || path.join(__dirname, "../../templates/gitignore");
    const packageGitignorePath = path.join(templatesDir, "package.gitignore");
    if (fs.existsSync(packageGitignorePath) && !fs.existsSync(path.join(targetDir, ".gitignore"))) {
      fs.copyFileSync(packageGitignorePath, path.join(targetDir, ".gitignore"));
    }

    // Replace the stock Next.js page with the Celtrix welcome page
    writeWelcomePage(targetDir, {
      framework: "nextjs",
      projectName: context.projectName,
      stack: stackLabel(context),
      typescript: context.isTs,
    });
    return;
  }

  if (context.config.frontend === "nuxt") {
    // Run Nuxt CLI non-interactively
    const gitFlag = "--gitInit false";
    const installFlag = context.installDeps ? "--install" : "--no-install";
    await run(`npx -y nuxi@latest init . --packageManager ${context.packageManager} ${gitFlag} ${installFlag} --yes`, { cwd: targetDir });
    
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
    await run(`npm create astro@latest . -- --template minimal ${installFlag} --no-git --yes`, { cwd: targetDir });
    
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
    await run(`npx -y @tanstack/cli create . -y ${pmFlag} ${installFlag}`, { cwd: targetDir });
    
    // Add .gitignore for frontend from template
    const templatesDir = context.templatesDir || path.join(__dirname, "../../templates/gitignore");
    const packageGitignorePath = path.join(templatesDir, "package.gitignore");
    if (fs.existsSync(packageGitignorePath) && !fs.existsSync(path.join(targetDir, ".gitignore"))) {
      fs.copyFileSync(packageGitignorePath, path.join(targetDir, ".gitignore"));
    }
    return;
  }

  // Vite Boilerplate for React, Vue, Solid
  const baseTemplate = getBaseTemplate(context.config.frontend);
  const templateName = context.isTs ? `${baseTemplate}-ts` : baseTemplate;
  const viteCmd = buildViteCommand(context.config, templateName, ".");

  await run(viteCmd, { cwd: targetDir });

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
    case "solid": return "solid";
    case "react-router":
    default:
      return "react";
  }
}
