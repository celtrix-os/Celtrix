import { execSync } from "child_process";
import { logger } from "./logger.js";
import path from "path";
import fs from "fs";

/**
 * Installs dependencies for T3 stack or client/server setup.
 * Handles missing folders, slow installs, and cleaner npm commands.
 */
// FIX: Removed `async` as it's not needed with `execSync`.
// FIX: Removed unused `projectName` parameter.
export function installDependencies(projectPath, config, server = true) {
  try {
    const runInstall = (dir) => {
      // The check is already here, so no need to check outside the function.
      if (!fs.existsSync(dir)) {
        logger.warn(`⚠️ Skipping install — directory not found: ${dir}`);
        return;
      }

      // FIX: The command should ALWAYS be `npm install` to install dependencies
      // from package.json, not to add new ones.
      const installCmd = "npm install";

      logger.info(`📦 Installing dependencies in ${path.basename(dir)}...`);
      execSync(installCmd, {
        cwd: dir,
        stdio: "inherit",
        shell: true,
        env: {
          ...process.env,
          npm_config_loglevel: "error",
          npm_config_progress: "false",
        },
      });
      logger.success(`✅ Dependencies installed in ${path.basename(dir)}`);
    };

    // --- T3 Stack Logic ---
    if (config.stack === "t3-stack") {
      // FIX: T3 apps are in the project root, not a 't3-app' subfolder.
      // We pass the projectPath directly to the installer.
      runInstall(projectPath);
      return;
    }

    // --- Client/Server Logic ---
    const clientDir = path.join(projectPath, "client");
    const serverDir = path.join(projectPath, "server");

    runInstall(clientDir);
    if (server) {
      // FIX: Do not pass the `dependencies` array.
      runInstall(serverDir);
    }

    logger.info("🎉 All dependencies installed successfully!");
  } catch (err) {
    logger.error("❌ Failed to install dependencies:");
    logger.error(err.message);
    throw err;
  }
}


export function angularSetup(projectPath, config, projectName) {
  logger.info("⚡ Setting up Angular...");

  try {
    // Create Angular project (no Tailwind)
    execSync(`npx -y @angular/cli new client --style=css --skip-git --skip-install`, {
      cwd: projectPath,
      stdio: "inherit",
      shell: true, 
    });

    logger.info("✅ Angular project created successfully!");
    // Server setup is now handled separately in project.js
    return true;
  } catch (error) {
    logger.error("❌ Failed to set up Angular");
    throw error;
  }
}

export function angularTailwindSetup(projectPath, config, projectName) {
  logger.info("⚡ Setting up Angular + Tailwind...");

  try {
    // 1. Create Angular project (inside projectPath)
    execSync(`npx -y @angular/cli new client --style css`, {
      cwd: projectPath,
      stdio: "inherit",
      shell: true,
    });

    const clientPath = path.join(projectPath, "client");

    // 2. Install Tailwind + PostCSS
    execSync(`npm install tailwindcss @tailwindcss/postcss postcss --force`, {
      cwd: clientPath,
      stdio: "inherit",
      shell: true,
    });

    // 3. Create tailwind.config.js
    const tailwindConfigPath = path.join(clientPath, ".postcssrc.json");

    fs.writeFileSync(
      tailwindConfigPath,
      `{
  "plugins": {
    "@tailwindcss/postcss": {}
  }
}`
    );

    // 4. Update styles.css with Tailwind directives
    const stylesPath = path.join(clientPath, "src/styles.css");
    fs.writeFileSync(
      stylesPath,
      `@import "tailwindcss";\n`

    );

    logger.info("✅ Angular + Tailwind setup completed!");
    return true;
  } catch (error) {
    logger.error("❌ Failed to set up Angular Tailwind");
    throw error;
  }
}


export function HonoReactSetup(projectPath, config, projectName) {
  logger.info("⚡ Setting up Hono+ React...");

  try {
    // 1. Create React project (inside projectPath)
    if(config.language==="typescript"){

      execSync(`npm create vite@latest client -- --t react-ts --no-rolldown --no-interactive `, {
        cwd: projectPath,
        stdio: "inherit",
        shell: true,
      });
    }else{
      execSync(`npm create vite@latest client -- --t react --no-rolldown --no-interactive `, {
        cwd: projectPath,
        stdio: "inherit",
        shell: true,
      });

    }
    
    execSync(`npm create hono@latest server -- --template cloudflare-workers --pm npm `, {
      cwd: projectPath,
      stdio: "inherit",
      shell: true,
    });

    logger.info("Created Hono + React Project !");
    serverAuthSetup(projectPath,config,projectName);

  } catch (error) {
    logger.error("❌ Failed to set up Hono + react Project using cli");
    throw error;
  }
}

export function mernSetup(projectPath, config, projectName) {
  logger.info("⚡ Setting up MERN...");

  try {
    // 1. Create MERN project
    if(config.language==="typescript"){

      execSync(`npm create vite@latest client -- --t react-ts --no-rolldown --no-interactive `, {
        cwd: projectPath,
        stdio: "inherit",
        shell: true,
      });
    }else{
      execSync(`npm create vite@latest client -- --t react --no-rolldown --no-interactive `, {
        cwd: projectPath,
        stdio: "inherit",
        shell: true,
      });

    }

    if(config.language == 'javascript'){

      
      const appJsxPath = path.join(projectPath, "client", "src", "App.jsx");
      const appCssPath = path.join(projectPath,"client", "src", "index.css");
      
      let appJsx = fs.readFileSync(appJsxPath, "utf-8");
      const lines = appJsx.split("\n");
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("</>")) {
          // inject badge right after opening fragment
          lines.splice(i, 0, `  <button className="powered-badge" onClick={() => window.open('https://github.com/celtrix-os/Celtrix', '_blank')}>Powered by <span className="celtrix">Celtrix</span></button>`);
          break;
        }
      }
      
      fs.writeFileSync(appJsxPath, lines.join("\n"), "utf-8");
      
    // append the fu*king CSS
    const badgeCSS = `
    .powered-badge {
      position: fixed;
      bottom: 50%;
      right: 1.5rem;
      font-size: 1rem;
      font-weight: 300;
      background-color: black;
      line-height: 1.5;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 0.75rem;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1),
      0 4px 6px -2px rgba(0,0,0,0.05);
      opacity: 0.8;
      transition: opacity 0.2s ease-in-out;
    }
      
    .powered-badge:hover {
      opacity: 1;
    }
      
    .celtrix {
      font-weight: 620;
      font-size: 1.05rem;
      color: #4ade80;
      text-decoration: underline;
    }
    `;
        
        fs.appendFileSync(appCssPath, badgeCSS, "utf-8");
        
    }

    if(config.language=="typescript"){
      const appTsxPath = path.join(projectPath, "client", "src", "App.tsx");
      const appCssPath = path.join(projectPath,"client", "src", "index.css");
      
      let appTsx = fs.readFileSync(appTsxPath, "utf-8");
      const lines = appTsx.split("\n");
      
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("</>")) {
          // inject badge right after opening fragment
          lines.splice(i, 0, `  <button className="powered-badge" onClick={() => window.open('https://github.com/celtrix-os/Celtrix', '_blank')}>Powered by <span className="celtrix">Celtrix</span></button>`);
          break;
        }
      }
      
      fs.writeFileSync(appTsxPath, lines.join("\n"), "utf-8");
      
    // append the fu*king CSS
    const badgeCSS = `
    .powered-badge {
      position: fixed;
      bottom: 50%;
      right: 1.5rem;
      font-size: 1rem;
      font-weight: 300;
      background-color: black;
      line-height: 1.5;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 0.75rem;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1),
      0 4px 6px -2px rgba(0,0,0,0.05);
      opacity: 0.8;
      transition: opacity 0.2s ease-in-out;
      }
      
    .powered-badge:hover {
      opacity: 1;
    }
    
    .celtrix {
      font-weight: 620;
      font-size: 1.05rem;
      color: #4ade80;
      text-decoration: underline;
    }
    `;
        
        fs.appendFileSync(appCssPath, badgeCSS, "utf-8");
        
    }

    if(config.stack === "mern+tailwind+auth"){
      serverAuthSetup(projectPath,config,projectName);
    }
    else if(config.stack === "mern"){
      serverSetup(projectPath,config,projectName);
    }
    logger.info("✅ MERN project created successfully!");
  } catch (error) {
    logger.error("❌ Failed to set up MERN");
    throw error;
  }
}

export function mernTailwindSetup(projectPath, config, projectName) {
  try {
    execSync(`npm install tailwindcss @tailwindcss/vite`, { cwd: path.join(projectPath, "client") });

    let isJs = config.language === 'javascript';
    const viteConfigPath = isJs 
      ? path.join(projectPath, "client", "vite.config.js") 
      : path.join(projectPath, "client", "vite.config.ts");
    
    let viteConfigContent = fs.readFileSync(viteConfigPath, "utf-8");

    const indexCssPath = path.join(projectPath,"client","src","index.css")
    let indexCssPathContent = fs.readFileSync(indexCssPath, "utf-8");

    indexCssPathContent = indexCssPathContent.replace(
      /:root/g,
      "@import 'tailwindcss';\n\n:root"
    );
    

    fs.writeFileSync(indexCssPath,indexCssPathContent)

    // Add tailwindcss import
    viteConfigContent = viteConfigContent.replace(
      /import \{ defineConfig \} from 'vite'/,
      "import { defineConfig } from 'vite'\nimport tailwindcss from '@tailwindcss/vite'"
    );

    // Add tailwindcss() to plugins
    viteConfigContent = viteConfigContent.replace(
      /plugins:\s*\[([^\]]*)\]/,
      (match, pluginsInside) => {
        if (!pluginsInside.includes("tailwindcss()")) {
          return `plugins: [${pluginsInside.trim()} , tailwindcss()]`;
        }
        return match; // avoid duplicate insert
      }
    );

    fs.writeFileSync(viteConfigPath, viteConfigContent);

    console.log("✅ TailwindCSS added to Vite config");
  } catch (err) {
    console.error("❌ Failed to setup Tailwind:", err.message);
  }
}


export function mevnSetup(projectPath,config,projectName){
  try {
    logger.info("⚡ Setting up MEVN...");
    if(config.language=='javascript'){
      execSync(`npm create vite@latest client -- --t vue --no-rolldown --no-interactive`, { cwd: projectPath, stdio: "inherit", shell: true });


    }
    else{
      execSync(`npm create vite@latest client -- --t vue-ts --no-rolldown --no-interactive`, { cwd: projectPath, stdio: "inherit", shell: true });
    }

    
    const vueJsPath = path.join(projectPath, "client", "src", "components", "HelloWorld.vue");
    const scriptPath = path.join(projectPath, "client", "src", "components", "HelloWorld.vue");

    let scriptPathContent = fs.readFileSync(scriptPath, "utf-8");

    // Replace or inject content inside <script setup lang="ts">
    scriptPathContent = scriptPathContent.replace(
      /<script setup lang="ts">([\s\S]*?)<\/script>/,
      (match, p1) => {
        // Keep existing content and add openCeltrix function if not present
        if (!p1.includes("openCeltrix")) {
          return `<script setup lang="ts">
    ${p1.trim()}

      const openCeltrix = () => {
        window.open('https://github.com/celtrix-os/Celtrix', '_blank');
      }
      </script>`;
        }
        return match;
      }
    );

    fs.writeFileSync(scriptPath, scriptPathContent, "utf-8");
  
    let vueJsPathContent = fs.readFileSync(vueJsPath, "utf-8");
  
    vueJsPathContent = vueJsPathContent.replace(
      /<p class="read-the-docs">Click on the Vite and Vue logos to learn more<\/p>/,
      `<p class="read-the-docs">Click on the Vite and Vue logos to learn more</p>
    <button className="powered-badge" @click="openCeltrix">Powered by <span className="celtrix">Celtrix</span></button>`
    );
  
    fs.writeFileSync(vueJsPath, vueJsPathContent, "utf-8");

    // Replace <style> block (or append if missing)~
    const newStyles = `<style scoped>
    .powered-badge {
      position: fixed;
      bottom: 50%;
      right: 1.5rem;
      font-size: 1rem;
      font-weight: 300;
      background-color: black;
      line-height: 1.5;
      color: white;
      padding: 0.5rem 1rem;
      border-radius: 0.75rem;
      box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1),
      0 4px 6px -2px rgba(0,0,0,0.05);
      opacity: 0.8;
      transition: opacity 0.2s ease-in-out;
      }
      
      .powered-badge:hover {
      opacity: 1;
      }
      
      .celtrix {
        font-weight: 620;
        font-size: 1.05rem;
        color: #4ade80;
        text-decoration: underline;
        }
    </style>`;

    if (/<style scoped>[\s\S]*?<\/style>/.test(vueJsPathContent)) {
      vueJsPathContent = vueJsPathContent.replace(
        /<style scoped>[\s\S]*?<\/style>/,
        newStyles
      );
    } else {
      vueJsPathContent += `\n\n${newStyles}`;
    }

    fs.writeFileSync(vueJsPath, vueJsPathContent, "utf-8");
    
    // serverSetup(projectPath,config,projectName);
    logger.info("✅ MEVN project created successfully!");

    return true
  } catch (error) {
    logger.error("❌ Failed to set up MEVN");
    throw error;
  }
}

export function mevnTailwindAuthSetup(projectPath, config, projectName) {
  logger.info("⚡ Setting up MEVN + Tailwind + Auth...");

  try {
    // 1. Create Vue client with Vite (js / ts)
    if(config.language==='javascript'){

      execSync(`npm create vite@latest client -- --t vue --no-rolldown --no-interactive`, {
        cwd: projectPath,
        stdio: "inherit",
        shell: true,
      });
    }

    else{
      execSync(`npm create vite@latest client -- --t vue-ts --no-rolldown --no-interactive`, {
        cwd: projectPath,
        stdio: "inherit",
        shell: true,
      });
    }

    const clientPath = path.join(projectPath, "client");

    // 2. Install Tailwind plugin for Vite in client
    execSync(`npm install tailwindcss @tailwindcss/vite`, {
      cwd: clientPath,
      stdio: "inherit",
      shell: true,
    });

    // 3. Patch Vite config (handle .js / .ts like mernTailwindSetup)
    const isJs = config.language === "javascript";
    const viteConfigPath = isJs
      ? path.join(clientPath, "vite.config.js")
      : path.join(clientPath, "vite.config.ts");

    if (fs.existsSync(viteConfigPath)) {
      let viteConfigContent = fs.readFileSync(viteConfigPath, "utf-8");

      viteConfigContent = viteConfigContent.replace(
        /import \{\s*defineConfig\s*\}\s*from\s*['"]vite['"]/,
        `import { defineConfig } from 'vite'\nimport tailwindcss from '@tailwindcss/vite'`
      );

      viteConfigContent = viteConfigContent.replace(
        /plugins:\s*\[([^\]]*)\]/,
        (match, pluginsInside) => {
          if (!pluginsInside.includes("tailwindcss()")) {
            return `plugins: [${pluginsInside.trim()} , tailwindcss()]`;
          }
          return match;
        }
      );

      fs.writeFileSync(viteConfigPath, viteConfigContent, "utf-8");
    }

    // 4. Ensure Tailwind import exists in client CSS (try common filenames)
    const possibleCssPaths = [
      path.join(clientPath, "src", "index.css"),
      path.join(clientPath, "src", "style.css"),
      path.join(clientPath, "src", "assets", "main.css"),
    ];
    const cssPath = possibleCssPaths.find((p) => fs.existsSync(p));
    if (cssPath) {
      let cssContent = fs.readFileSync(cssPath, "utf-8");
      if (!cssContent.includes("@import 'tailwindcss'") && !cssContent.includes('@import "tailwindcss"')) {
        // try to place import before :root or at top
        if (/:root/.test(cssContent)) {
          cssContent = cssContent.replace(/:root/, `@import 'tailwindcss';\n\n:root`);
        } else {
          cssContent = `@import 'tailwindcss';\n\n` + cssContent;
        }
        fs.writeFileSync(cssPath, cssContent, "utf-8");
      }
    }

    const vueJsPath = path.join(projectPath, "client", "src", "components", "HelloWorld.vue");
    const scriptPath = path.join(projectPath, "client", "src", "components", "HelloWorld.vue");


    let scriptPathContent = fs.readFileSync(scriptPath, "utf-8");

    // Replace or inject content inside <script setup lang="ts">
    scriptPathContent = scriptPathContent.replace(
      /<script setup lang="ts">([\s\S]*?)<\/script>/,
      (match, p1) => {
        // Keep existing content and add openCeltrix function if not present
        if (!p1.includes("openCeltrix")) {
          return `<script setup lang="ts">
    ${p1.trim()}

      const openCeltrix = () => {
        window.open('https://github.com/celtrix-os/Celtrix', '_blank');
      }
      </script>`;
        }
        return match;
      }
    );

    fs.writeFileSync(scriptPath, scriptPathContent, "utf-8");


    let vuejsPathContent = fs.readFileSync(vueJsPath, "utf-8");
    vuejsPathContent = vuejsPathContent.replace(
      /<p class="read-the-docs">Click on the Vite and Vue logos to learn more<\/p>/,
      `<p class="read-the-docs">Click on the Vite and Vue logos to learn more</p>
       <button
    @click="openCeltrix"
    class="fixed bottom-1/2 right-6 text-base font-light bg-black-500 text-white px-4 py-2 rounded-xl shadow-lg shadow-black/20 hover:opacity-100 transition-opacity duration-200 leading-relaxed"
  >
    Powered by
    <span class="font-semibold text-[#4ade80] underline text-[1.05rem] ml-1">
      Celtrix
    </span>
  </button>
`
    );
    fs.writeFileSync(vueJsPath, vuejsPathContent, "utf-8");

    logger.info("MEVN + Tailwind + Auth setup completed!");

    serverAuthSetup(projectPath,config,projectName);
  } catch (error) {
    logger.error("Failed to set up MEVN + Tailwind + Auth");
    throw error;
  }
}

export function serverSetup(projectPath,config,projectName){
  try{
    const serverDir = path.join(projectPath, "server");
    
    // Create server directory if it doesn't exist
    if (!fs.existsSync(serverDir)) {
      fs.mkdirSync(serverDir, { recursive: true });
    }

    // Initialize package.json
    execSync('npm init -y', { 
      cwd: serverDir,
      stdio: 'ignore',  // Suppress output
      shell: true
    });

  }catch(error){
    logger.error("❌ Failed to set up server");
    throw error;
  }
}

export function serverAuthSetup(projectPath,config,projectName){
  try {
    const serverDir = path.join(projectPath, "server");
    
    // Create server directory if it doesn't exist
    if (!fs.existsSync(serverDir)) {
      fs.mkdirSync(serverDir, { recursive: true });
    }

    // Initialize package.json
    try {
      execSync('npm init -y', {
        cwd: serverDir,
        stdio: 'ignore',  // Suppress output
        shell: true
      });
    } catch (error) {
      logger.info()
    }

    installDependencies(projectPath,config,projectName,true,["bcrypt","jsonwebtoken","cookie-parser","dotenv","express","helmet","mongoose","cors","nodemon","morgan"])

  } catch (error) {
    logger.error("❌ Failed to set up server auth");
    throw error;
  }
}