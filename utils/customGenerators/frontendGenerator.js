import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import { buildViteCommand } from "../shared.js";

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
    return;
  }

  if (context.config.frontend === "astro") {
    // Run Astro CLI non-interactively
    const installFlag = context.installDeps ? "--install" : "--no-install";
    execSync(`npm create astro@latest . -- --template minimal ${installFlag} --no-git --yes`, {
      cwd: targetDir,
      stdio: "inherit"
    });
    return;
  }

  if (context.config.frontend === "svelte") {
    // Run SvelteKit CLI non-interactively using modern sv CLI
    const types = context.isTs ? "ts" : "jsdoc";
    execSync(`npx sv create . --template minimal --types ${types} --no-add-ons --no-install --no-dir-check`, {
      cwd: targetDir,
      stdio: "inherit"
    });
    return;
  }

  // Vite Boilerplate for React, Vue, Svelte, Solid
  const baseTemplate = getBaseTemplate(context.config.frontend);
  const templateName = context.isTs ? `${baseTemplate}-ts` : baseTemplate;
  const viteCmd = buildViteCommand(context.config, templateName, ".");

  execSync(viteCmd, { cwd: targetDir, stdio: "inherit", shell: true });

  // Injects base stylesheets and components
  fs.writeFileSync(
    path.join(targetDir, "src", `App.${context.jsxExt}`),
    getFrontendAppTemplate(context.config.frontend, context.isTs)
  );
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
  return `import React from 'react';

export default function App() {
  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      justifyContent: 'center',
      alignItems: 'center',
      height: '100vh',
      backgroundColor: '#0a0a0a',
      color: '#ffffff',
      fontFamily: 'system-ui, sans-serif'
    }}>
      <h1 style={{ fontSize: '3rem', margin: 0, color: '#4ade80' }}>⚡ Welcome to Celtrix</h1>
      <p style={{ fontSize: '1.25rem', color: '#a3a3a3' }}>
        Bootstrapped with production-grade ${frontend}!
      </p>
    </div>
  );
}`;
}
