import { execSync } from "child_process";
import { logger } from "./logger.js";
import path from "path";
import fs from "fs";

export function installDependencies(projectPath, config, projectName,server=true,dependencies=[]) {
  logger.info("📦 Installing dependencies...");

  try {
    const clientDir = fs.existsSync(path.join(projectPath, "client"))
      ? path.join(projectPath, "client")
      : path.join(projectPath, "client");
    
    const serverDir = fs.existsSync(path.join(projectPath, "server"))
      ? path.join(projectPath, "server")
      : path.join(projectPath, "server");

    if (fs.existsSync(clientDir)) {
      execSync("npm install", { cwd: clientDir, stdio: "inherit", shell: true });
    }
    if (server && fs.existsSync(serverDir)) {
      execSync("npm install " + dependencies.join(" "), { cwd: serverDir, stdio: "inherit", shell: true });
    }

    logger.info("✅ Dependencies installed successfully");
  } catch (err) {
    logger.error("❌ Failed to install dependencies");
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
      shell: true, // fixes ENOENT
    });

    logger.info("✅ Angular project created successfully!");
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
          lines.splice(i, 0, `  <div className="powered-badge">Powered by <span className="celtrix">Celtrix</span></div>`);
          break;
        }
      }
      
      fs.writeFileSync(appJsxPath, lines.join("\n"), "utf-8");
      
    // append the fu*king CSS
    const badgeCSS = `
    .powered-badge {
      position: fixed;
      bottom: 1.5rem;
      left: 1.5rem;
      font-size: 0.875rem;
      background-color: black;
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
      
      .powered-badge .celtrix {
        font-weight: 600;
        color: #4ade80;
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
          lines.splice(i, 0, `  <div className="powered-badge">Powered by <span className="celtrix">Celtrix</span></div>`);
          break;
        }
      }
      
      fs.writeFileSync(appTsxPath, lines.join("\n"), "utf-8");
      
    // append the fu*king CSS
    const badgeCSS = `
    .powered-badge {
      position: fixed;
      bottom: 1.5rem;
      left: 1.5rem;
      font-size: 0.875rem;
      background-color: black;
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
      
      .powered-badge .celtrix {
        font-weight: 600;
        color: #4ade80;
        }
        `;
        
        fs.appendFileSync(appCssPath, badgeCSS, "utf-8");
        
    }

    serverSetup(projectPath,config,projectName);
    logger.info("✅ MERN project created successfully!");
  } catch (error) {
    logger.error("❌ Failed to set up MERN");
    throw error;
  }
}

export function serverSetup(projectPath,config,projectName){
  try{
    execSync(`npm init -y`, { cwd: path.join(projectPath, "server") });
    installDependencies(projectPath,config,projectName,true,["dotenv","express","helmet","mongoose","cors","nodemon","morgan"])
    logger.info("✅ Server project created successfully!");
  }catch(error){
    logger.error("❌ Failed to set up server");
    throw error;
  }
}

export function serverAuthSetup(projectPath,config,projectName){
  try {
    execSync(`npm init -y`, { cwd: path.join(projectPath, "server") });
    installDependencies(projectPath,config,projectName,true,["bcrypt","jsonwebtoken","cookie-parser","dotenv","express","helmet","mongoose","cors","nodemon","morgan"])
    logger.info("✅ Server Auth project created successfully!");
  } catch (error) {
    logger.error("❌ Failed to set up server auth");
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
  
    let vueJsPathContent = fs.readFileSync(vueJsPath, "utf-8");
  
    vueJsPathContent = vueJsPathContent.replace(
      /<p class="read-the-docs">Click on the Vite and Vue logos to learn more<\/p>/,
      `<p class="read-the-docs">Click on the Vite and Vue logos to learn more</p>
    <div class="powered-box">
      Powered by <span class="powered-highlight">Celtrix</span>
    </div>`
    );
  
    fs.writeFileSync(vueJsPath, vueJsPathContent, "utf-8");

    // Replace <p> with new block
    vueJsPathContent = vueJsPathContent.replace(
      /<p class="read-the-docs">Click on the Vite and Vue logos to learn more<\/p>/,
      `<p class="read-the-docs">Click on the Vite and Vue logos to learn more</p>
    <div class="powered-box">
      Powered by <span class="powered-highlight">Celtrix</span>
    </div>`
    );

    // Replace <style> block (or append if missing)
    const newStyles = `<style scoped>
    .powered-box {
      position: fixed;
      bottom: 24px;
      left: 24px;
      background-color: black;
      color: white;
      padding: 8px 16px;
      font-size: 0.875rem;
      border-radius: 16px;
      box-shadow: 0 4px 6px rgba(0,0,0,0.3);
      opacity: 0.85;
      transition: opacity 0.2s ease;
      cursor: default;
    }

    .powered-box:hover {
      opacity: 1;
    }

    .powered-highlight {
      font-weight: 600;
      color: #22c55e;
    }

    .read-the-docs {
      color: #888;
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

  } catch (error) {
    logger.error("❌ Failed to set up MEVN");
    throw error;
  }
}