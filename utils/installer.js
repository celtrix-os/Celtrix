import { execSync } from "child_process";
import { logger } from "./logger.js";
import path from "path";
import fs from "fs";

export function installDependencies(projectPath, config, projectName, server = true, dependencies = []) {
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
    if (config.language === "typescript") {

      execSync(`npm create vite@latest client -- --t react-ts --no-rolldown --no-interactive `, {
        cwd: projectPath,
        stdio: "inherit",
        shell: true,
      });
    } else {
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
    if (config.language === "typescript") {

      execSync(`npm create vite@latest client -- --t react-ts --no-rolldown --no-interactive `, {
        cwd: projectPath,
        stdio: "inherit",
        shell: true,
      });
    } else {
      execSync(`npm create vite@latest client -- --t react --no-rolldown --no-interactive `, {
        cwd: projectPath,
        stdio: "inherit",
        shell: true,
      });

    }

    if (config.language == 'javascript') {


      const appJsxPath = path.join(projectPath, "client", "src", "App.jsx");
      const appCssPath = path.join(projectPath, "client", "src", "index.css");

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

    if (config.language == "typescript") {
      const appTsxPath = path.join(projectPath, "client", "src", "App.tsx");
      const appCssPath = path.join(projectPath, "client", "src", "index.css");

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

    serverSetup(projectPath, config, projectName);
    logger.info("✅ MERN project created successfully!");
  } catch (error) {
    logger.error("❌ Failed to set up MERN");
    throw error;
  }
}

export function serverSetup(projectPath, config, projectName) {
  try {
    execSync(`npm init -y`, { cwd: path.join(projectPath, "server") });
    installDependencies(projectPath, config, projectName, true, ["dotenv", "express", "helmet", "mongoose", "cors", "nodemon", "morgan"])
    logger.info("✅ Server project created successfully!");
  } catch (error) {
    logger.error("❌ Failed to set up server");
    throw error;
  }
}

export function serverAuthSetup(projectPath, config, projectName) {
  try {
    execSync(`npm init -y`, { cwd: path.join(projectPath, "server") });
    installDependencies(projectPath, config, projectName, true, ["bcrypt", "jsonwebtoken", "cookie-parser", "dotenv", "express", "helmet", "mongoose", "cors", "nodemon", "morgan"])
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

    const indexCssPath = path.join(projectPath, "client", "src", "index.css")
    let indexCssPathContent = fs.readFileSync(indexCssPath, "utf-8");

    indexCssPathContent = indexCssPathContent.replace(
      /:root/g,
      "@import 'tailwindcss';\n\n:root"
    );


    fs.writeFileSync(indexCssPath, indexCssPathContent)

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


export function mevnSetup(projectPath, config, projectName) {
  try {
    logger.info("⚡ Setting up MEVN...");
    if (config.language == 'javascript') {
      execSync(`npm create vite@latest client -- --t vue --no-rolldown --no-interactive`, { cwd: projectPath, stdio: "inherit", shell: true });


    }
    else {
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

export function mevnTailwindAuthSetup(projectPath, config, projectName) {
  try {
    logger.info("⚡ Setting up MEVN + Tailwind + Auth...");

    // 1. Create Vue.js client with Vite
    if (config.language === 'javascript') {
      execSync(`npm create vite@latest client -- --template vue --no-rolldown --no-interactive`, {
        cwd: projectPath,
        stdio: "inherit",
        shell: true
      });
    } else {
      execSync(`npm create vite@latest client -- --template vue-ts --no-rolldown --no-interactive`, {
        cwd: projectPath,
        stdio: "inherit",
        shell: true
      });
    }

    const clientPath = path.join(projectPath, "client");

    // 2. Install Tailwind CSS dependencies
    logger.info("📦 Installing Tailwind CSS...");
    execSync(`npm install @tailwindcss/vite tailwindcss --save-dev`, {
      cwd: clientPath,
      stdio: "inherit",
      shell: true
    });

    // 3. Update vite.config.js for Tailwind
    const viteConfigPath = path.join(clientPath, "vite.config.js");
    const viteConfig = `import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
})
`;
    fs.writeFileSync(viteConfigPath, viteConfig, "utf-8");

    // 4. Update style.css with Tailwind imports
    const stylePath = path.join(clientPath, "src", "style.css");
    const styleContent = `@import "tailwindcss";

:root {
  font-family: system-ui, Avenir, Helvetica, Arial, sans-serif;
  line-height: 1.5;
  font-weight: 400;

  color-scheme: light dark;
  color: rgba(255, 255, 255, 0.87);
  background-color: #242424;

  font-synthesis: none;
  text-rendering: optimizeLegibility;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

a {
  font-weight: 500;
  color: #646cff;
  text-decoration: inherit;
}
a:hover {
  color: #535bf2;
}

body {
  margin: 0;
  display: flex;
  place-items: center;
  min-width: 320px;
  min-height: 100vh;
}

h1 {
  font-size: 3.2em;
  line-height: 1.1;
}

button {
  border-radius: 8px;
  border: 1px solid transparent;
  padding: 0.6em 1.2em;
  font-size: 1em;
  font-weight: 500;
  font-family: inherit;
  background-color: #1a1a1a;
  cursor: pointer;
  transition: border-color 0.25s;
}
button:hover {
  border-color: #646cff;
}
button:focus,
button:focus-visible {
  outline: 4px auto -webkit-focus-ring-color;
}

.card {
  padding: 2em;
}

#app {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem;
  text-align: center;
}

@media (prefers-color-scheme: light) {
  :root {
    color: #213547;
    background-color: #ffffff;
  }
  a:hover {
    color: #747bff;
  }
  button {
    background-color: #f9f9f9;
  }
}
`;
    fs.writeFileSync(stylePath, styleContent, "utf-8");

    // 5. Update App.vue with Tailwind classes
    const appVuePath = path.join(clientPath, "src", "App.vue");
    const appVueContent = `<script setup>
import HelloWorld from './components/HelloWorld.vue'
</script>

<template>
  <div class="flex flex-row justify-center items-center">
    <a href="https://vite.dev" target="_blank">
      <img src="/vite.svg" class="logo" alt="Vite logo" />
    </a>
    <a href="https://vuejs.org/" target="_blank">
      <img src="./assets/vue.svg" class="logo vue" alt="Vue logo" />
    </a>
  </div>
  <HelloWorld msg="Vite + Vue" />
</template>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
  transition: filter 300ms;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
</style>
`;
    fs.writeFileSync(appVuePath, appVueContent, "utf-8");

    // 6. Update HelloWorld.vue with Tailwind and Celtrix branding
    const helloWorldPath = path.join(clientPath, "src", "components", "HelloWorld.vue");
    const helloWorldContent = `<script setup>
import { ref } from 'vue'

defineProps({
  msg: String,
})

const count = ref(0)
</script>

<template>
  <h1>{{ msg }}</h1>

  <div class="card">
    <button type="button" @click="count++">count is {{ count }}</button>
    <p>
      Edit
      <code>components/HelloWorld.vue</code> to test HMR
    </p>
  </div>

  <p>
    Check out
    <a href="https://vuejs.org/guide/quick-start.html#local" target="_blank"
      >create-vue</a
    >, the official Vue + Vite starter
  </p>
  <p>
    Learn more about IDE Support for Vue in the
    <a
      href="https://vuejs.org/guide/scaling-up/tooling.html#ide-support"
      target="_blank"
      >Vue Docs Scaling up Guide</a
    >.
  </p>
  <p class="read-the-docs">Click on the Vite and Vue logos to learn more</p>
  <div class="fixed bottom-6 left-6 text-sm bg-black text-white px-4 py-2 rounded-xl shadow-lg opacity-85 hover:opacity-100">
    Powered by <span class="font-semibold text-green-400">Celtrix</span>
  </div>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
`;
    fs.writeFileSync(helloWorldPath, helloWorldContent, "utf-8");

    // 7. Update package.json for client
    const clientPackageJsonPath = path.join(clientPath, "package.json");
    const clientPackageJson = {
      "name": "client",
      "private": true,
      "version": "0.0.0",
      "type": "module",
      "scripts": {
        "dev": "vite",
        "build": "vite build",
        "preview": "vite preview"
      },
      "dependencies": {
        "@tailwindcss/vite": "^4.1.12",
        "tailwindcss": "^4.1.12",
        "vue": "^3.5.18"
      },
      "devDependencies": {
        "@vitejs/plugin-vue": "^6.0.1",
        "vite": "^7.1.2"
      }
    };
    fs.writeFileSync(clientPackageJsonPath, JSON.stringify(clientPackageJson, null, 2), "utf-8");

    // 8. Create server directory structure
    logger.info("🔧 Setting up Express.js server with authentication...");
    const serverPath = path.join(projectPath, "server");
    fs.mkdirSync(serverPath, { recursive: true });
    fs.mkdirSync(path.join(serverPath, "controllers"), { recursive: true });
    fs.mkdirSync(path.join(serverPath, "models"), { recursive: true });
    fs.mkdirSync(path.join(serverPath, "routes"), { recursive: true });

    // 9. Create server.js
    const serverJsContent = `const express = require("express");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const authRoutes = require("./routes/authRoutes.js");


dotenv.config();

const app = express();
const mongoURI = process.env.MONGO_URI;
const port = process.env.PORT || 5000;

// Middleware
app.use(express.json());
app.use(cors());
app.use(helmet());
app.use(morgan("dev"));

// Routes
app.use("/api/auth", authRoutes);
app.get('/',(req,res)=>res.status(200).json({message:"Server running"}))

// Safe MongoDB connection for scaffold
if (!mongoURI || mongoURI === "your_mongodb_uri_here") {
  console.warn("⚠️  No Mongo URI provided. Skipping DB connection. You can set it in .env later.");
  app.listen(port, () => console.log(\`Server running without DB on port \${port}\`));
} else {
  mongoose
    .connect(mongoURI)
    .then(() => {
      app.listen(port, () => console.log(\`Server running on port \${port}\`));
    })
    .catch((err) => console.error("❌ DB connection failed:", err.message));
}
`;
    fs.writeFileSync(path.join(serverPath, "server.js"), serverJsContent, "utf-8");

    // 10. Create User model
    const userModelContent = `const mongoose = require("mongoose");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model("User", userSchema); // ✅ CommonJS export
`;
    fs.writeFileSync(path.join(serverPath, "models", "User.js"), userModelContent, "utf-8");

    // 11. Create auth controller
    const authControllerContent = `const User = require("../models/User.js");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");

// Register
const register = async (req, res) => {
  try {
    const { name, email, password } = req.body;

    // Check if user exists
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: "User already exists" });

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await User.create({ name, email, password: hashedPassword });

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.status(201).json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Login
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    // Check password
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

    // Generate JWT
    const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "1d" });

    res.json({
      token,
      user: { id: user._id, name: user.name, email: user.email }
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { register, login };
`;
    fs.writeFileSync(path.join(serverPath, "controllers", "authController.js"), authControllerContent, "utf-8");

    // 12. Create auth routes
    const authRoutesContent = `const express = require("express");
const { register, login } = require("../controllers/authController.js");

const router = express.Router();

// POST /api/auth/register
router.post("/register", register);

// POST /api/auth/login
router.post("/login", login);

module.exports = router; // ✅ use module.exports instead of export default
`;
    fs.writeFileSync(path.join(serverPath, "routes", "authRoutes.js"), authRoutesContent, "utf-8");

    // 13. Create .env.example
    const envExampleContent = `# Database
MONGO_URI=your_mongodb_uri_here

# JWT Secret
JWT_SECRET=your_super_secret_jwt_key_here

# Server Port
PORT=5000
`;
    fs.writeFileSync(path.join(serverPath, ".env.example"), envExampleContent, "utf-8");

    // 14. Create server package.json
    const serverPackageJson = {
      "name": "server",
      "version": "1.0.0",
      "description": "MEVN Auth Backend",
      "main": "server.js",
      "scripts": {
        "start": "node server.js",
        "dev": "nodemon server.js"
      },
      "dependencies": {
        "express": "^4.18.2",
        "mongoose": "^7.6.3",
        "cors": "^2.8.5",
        "helmet": "^7.1.0",
        "morgan": "^1.10.0",
        "bcrypt": "^5.1.1",
        "jsonwebtoken": "^9.0.2",
        "dotenv": "^16.3.1"
      },
      "devDependencies": {
        "nodemon": "^3.0.1"
      },
      "keywords": ["express", "mongodb", "auth", "mevn"],
      "author": "Celtrix",
      "license": "MIT"
    };
    fs.writeFileSync(path.join(serverPath, "package.json"), JSON.stringify(serverPackageJson, null, 2), "utf-8");

    logger.info("✅ MEVN + Tailwind + Auth project created successfully!");

  } catch (error) {
    logger.error("❌ Failed to set up MEVN + Tailwind + Auth");
    throw error;
  }
}