import fs from "fs-extra";
import path from "path";
import { run } from "../progress.js";
import { buildViteCommand } from "../shared.js";
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
    await run(`npx -y create-next-app@latest . ${useTs} --eslint --tailwind --src-dir --app --import-alias "@/*" --yes`, { cwd: targetDir });
    
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

  if (context.config.frontend === "svelte") {
    // Run SvelteKit CLI non-interactively using modern sv CLI
    const types = context.isTs ? "ts" : "jsdoc";
    await run(`npx sv create . --template minimal --types ${types} --no-add-ons --no-install --no-dir-check`, { cwd: targetDir });
    
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

  // Vite Boilerplate for React, Vue, Svelte, Solid
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

  // Injects base stylesheets and components
  if (context.config.frontend === "react-router") {
    fs.writeFileSync(
      path.join(targetDir, "src", `App.${context.jsxExt}`),
      getFrontendAppTemplate(context.config.frontend, context.isTs)
    );
  }

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

function getFrontendAppTemplate(frontend, isTs) {
  return `export default function App() {
  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#ffffff',
      fontFamily: 'system-ui, sans-serif'
    }}>
      {/* Navbar */}
      <nav style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '1rem 2rem',
        backgroundColor: '#f8f9fa',
        borderBottom: '1px solid #e9ecef'
      }}>
        <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#333' , textDecoration: 'underline', cursor: 'pointer'}} 
        onClick={() => window.open('https://github.com/celtrix-os/Celtrix', '_blank')}>
          Celtrix
        </div>
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <a href="#" style={{
            textDecoration: 'none',
            color: '#333',
            fontSize: '1rem'
          }}>Home</a>
          <a href="#" style={{
            textDecoration: 'none',
            color: '#333',
            fontSize: '1rem'
          }}>Dashboard</a>
        </div>
      </nav>

      {/* Main Content */}
      <main style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        padding: '2rem'
      }}>
        <h1 style={{ fontSize: '2rem', color: '#333', marginBottom: '0.5rem' }}>
          Welcome to your application
        </h1>
        <p style={{ fontSize: '1rem', color: '#666' }}>
          Built with ${frontend}
        </p>
      </main>

      {/* Powered by Celtrix Badge */}
      <div style={{
        position: 'fixed',
        bottom: '2rem',
        right: '2rem',
        backgroundColor: '#000',
        color: '#fff',
        padding: '0.5rem 1rem',
        borderRadius: '0.5rem',
        fontSize: '0.875rem',
        cursor: 'pointer'
      }} onClick={() => window.open('https://github.com/celtrix-os/Celtrix', '_blank')}>
        🔗 Powered by <span style={{ fontWeight: 'bold', color: '#4ade80' }}>Celtrix</span>
      </div>
    </div>
  );
}`;
}
