import fs from "fs-extra";
import path from "path";
import chalk from "chalk";
import { logger } from "./logger.js";
import { execSync } from "child_process";

/**
 * Apply customization options to the project
 */
export async function applyCustomizations(projectPath, config) {
  if (!config.customization) {
    return;
  }

  const customOptions = config.customization;
  
  logger.info("🎨 Applying customizations...");

  // Initialize Git repository
  if (customOptions.initGit) {
    initializeGit(projectPath);
  }

  // Create environment template
  if (customOptions.additionalFeatures?.includes("env-template")) {
    createEnvTemplate(projectPath, customOptions.serverPort);
  }

  // Add VS Code settings
  if (customOptions.additionalFeatures?.includes("vscode-settings")) {
    createVSCodeSettings(projectPath);
  }

  // Add GitHub Actions workflow
  if (customOptions.additionalFeatures?.includes("github-actions")) {
    createGithubActions(projectPath, config);
  }

  // Setup Husky pre-commit hooks
  if (customOptions.additionalFeatures?.includes("husky")) {
    setupHusky(projectPath);
  }

  // Add Swagger documentation
  if (customOptions.additionalFeatures?.includes("swagger")) {
    addSwaggerSetup(projectPath, config);
  }

  // Update ports in configuration files
  if (customOptions.serverPort || customOptions.clientPort) {
    updatePorts(projectPath, customOptions, config);
  }

  logger.success("✅ Customizations applied successfully!");
}

/**
 * Initialize Git repository
 */
function initializeGit(projectPath) {
  try {
    execSync("git init", { cwd: projectPath, stdio: "ignore" });
    
    // Create .gitignore
    const gitignoreContent = `# Dependencies
node_modules/
.pnp
.pnp.js

# Testing
coverage/

# Production
build/
dist/

# Environment Variables
.env
.env.local
.env.development.local
.env.test.local
.env.production.local

# Logs
npm-debug.log*
yarn-debug.log*
yarn-error.log*
pnpm-debug.log*
lerna-debug.log*

# Editor directories and files
.vscode/*
!.vscode/extensions.json
!.vscode/settings.json
.idea
.DS_Store
*.suo
*.ntvs*
*.njsproj
*.sln
*.sw?

# OS
Thumbs.db
`;

    fs.writeFileSync(path.join(projectPath, ".gitignore"), gitignoreContent);
    logger.success("✅ Git repository initialized");
  } catch (error) {
    logger.warning("⚠️  Could not initialize Git repository");
  }
}

/**
 * Create environment template file
 */
function createEnvTemplate(projectPath, serverPort = "5000") {
  const envContent = `# Server Configuration
PORT=${serverPort}
NODE_ENV=development

# Database Configuration
MONGODB_URI=mongodb://localhost:27017/your-database-name
# or for MongoDB Atlas:
# MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/database-name

# JWT Secret (Change this in production!)
JWT_SECRET=your-super-secret-jwt-key-change-this-in-production

# Frontend URL (for CORS)
CLIENT_URL=http://localhost:3000

# Optional: Email Configuration
# EMAIL_HOST=smtp.gmail.com
# EMAIL_PORT=587
# EMAIL_USER=your-email@gmail.com
# EMAIL_PASS=your-app-password

# Optional: External APIs
# API_KEY=your-api-key-here
`;

  const serverPath = path.join(projectPath, "server");
  if (fs.existsSync(serverPath)) {
    fs.writeFileSync(path.join(serverPath, ".env.example"), envContent);
    logger.success("✅ Environment template created");
  }
}

/**
 * Create VS Code settings
 */
function createVSCodeSettings(projectPath) {
  const vscodeDir = path.join(projectPath, ".vscode");
  fs.ensureDirSync(vscodeDir);

  const settings = {
    "editor.formatOnSave": true,
    "editor.defaultFormatter": "esbenp.prettier-vscode",
    "editor.codeActionsOnSave": {
      "source.fixAll.eslint": true
    },
    "files.exclude": {
      "**/node_modules": true,
      "**/dist": true,
      "**/build": true
    },
    "search.exclude": {
      "**/node_modules": true,
      "**/dist": true,
      "**/build": true
    }
  };

  const extensions = {
    "recommendations": [
      "dbaeumer.vscode-eslint",
      "esbenp.prettier-vscode",
      "bradlc.vscode-tailwindcss",
      "mongodb.mongodb-vscode",
      "rangav.vscode-thunder-client",
      "dsznajder.es7-react-js-snippets"
    ]
  };

  fs.writeFileSync(
    path.join(vscodeDir, "settings.json"),
    JSON.stringify(settings, null, 2)
  );

  fs.writeFileSync(
    path.join(vscodeDir, "extensions.json"),
    JSON.stringify(extensions, null, 2)
  );

  logger.success("✅ VS Code settings created");
}

/**
 * Create GitHub Actions workflow
 */
function createGithubActions(projectPath, config) {
  const githubDir = path.join(projectPath, ".github", "workflows");
  fs.ensureDirSync(githubDir);

  const workflowContent = `name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    strategy:
      matrix:
        node-version: [18.x, 20.x]
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Use Node.js \${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: \${{ matrix.node-version }}
    
    - name: Install dependencies (Server)
      working-directory: ./server
      run: npm ci
    
    - name: Run tests (Server)
      working-directory: ./server
      run: npm test --if-present
    
    - name: Install dependencies (Client)
      working-directory: ./client
      run: npm ci
    
    - name: Build client
      working-directory: ./client
      run: npm run build --if-present
    
    - name: Run tests (Client)
      working-directory: ./client
      run: npm test --if-present
`;

  fs.writeFileSync(path.join(githubDir, "ci.yml"), workflowContent);
  logger.success("✅ GitHub Actions workflow created");
}

/**
 * Setup Husky for pre-commit hooks
 */
function setupHusky(projectPath) {
  const huskyConfig = {
    "husky": {
      "hooks": {
        "pre-commit": "lint-staged"
      }
    },
    "lint-staged": {
      "*.{js,jsx,ts,tsx}": [
        "eslint --fix",
        "prettier --write"
      ]
    }
  };

  const packageJsonPath = path.join(projectPath, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      husky: "^8.0.3",
      "lint-staged": "^15.0.0"
    };
    Object.assign(packageJson, huskyConfig);
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
    logger.success("✅ Husky configuration added");
  }
}

/**
 * Add Swagger documentation setup
 */
function addSwaggerSetup(projectPath, config) {
  const serverPath = path.join(projectPath, "server");
  if (!fs.existsSync(serverPath)) return;

  const swaggerFile = path.join(serverPath, "swagger.js");
  const swaggerContent = `import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: '${config.projectName} API',
      version: '1.0.0',
      description: 'API documentation for ${config.projectName}',
    },
    servers: [
      {
        url: 'http://localhost:5000',
        description: 'Development server',
      },
    ],
  },
  apis: ['./routes/*.js', './controllers/*.js'],
};

const specs = swaggerJsdoc(options);

export { specs, swaggerUi };
`;

  fs.writeFileSync(swaggerFile, swaggerContent);
  
  // Add swagger dependencies to package.json
  const packageJsonPath = path.join(serverPath, "package.json");
  if (fs.existsSync(packageJsonPath)) {
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, "utf8"));
    packageJson.dependencies = {
      ...packageJson.dependencies,
      "swagger-jsdoc": "^6.2.8",
      "swagger-ui-express": "^5.0.0"
    };
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));
  }

  logger.success("✅ Swagger documentation setup added");
}

/**
 * Update port configurations
 */
function updatePorts(projectPath, customOptions, config) {
  const serverPath = path.join(projectPath, "server");
  const clientPath = path.join(projectPath, "client");

  // Update server port
  if (customOptions.serverPort && fs.existsSync(serverPath)) {
    const serverFiles = ["server.js", "index.js", "app.js"];
    for (const file of serverFiles) {
      const filePath = path.join(serverPath, file);
      if (fs.existsSync(filePath)) {
        let content = fs.readFileSync(filePath, "utf8");
        content = content.replace(
          /const PORT = process\.env\.PORT \|\| \d+/g,
          `const PORT = process.env.PORT || ${customOptions.serverPort}`
        );
        fs.writeFileSync(filePath, content);
      }
    }
  }

  // Update client port (for Vite config)
  if (customOptions.clientPort && fs.existsSync(clientPath)) {
    const viteConfigPath = path.join(clientPath, "vite.config.js");
    const viteConfigTsPath = path.join(clientPath, "vite.config.ts");
    
    const updateViteConfig = (configPath) => {
      if (fs.existsSync(configPath)) {
        let content = fs.readFileSync(configPath, "utf8");
        
        // Add or update server config in Vite
        if (content.includes("server:")) {
          content = content.replace(
            /port:\s*\d+/g,
            `port: ${customOptions.clientPort}`
          );
        } else {
          content = content.replace(
            /export default defineConfig\(\{/,
            `export default defineConfig({\n  server: {\n    port: ${customOptions.clientPort},\n  },`
          );
        }
        
        fs.writeFileSync(configPath, content);
      }
    };

    updateViteConfig(viteConfigPath);
    updateViteConfig(viteConfigTsPath);
  }

  logger.success(`✅ Ports updated (Server: ${customOptions.serverPort}, Client: ${customOptions.clientPort})`);
}

/**
 * Get additional dependencies based on customization
 */
export function getAdditionalDependencies(customOptions) {
  const dependencies = [];
  
  if (!customOptions) return dependencies;

  if (customOptions.codingStyle === "eslint-prettier") {
    dependencies.push("eslint", "prettier", "eslint-config-prettier", "eslint-plugin-prettier");
  } else if (customOptions.codingStyle === "eslint") {
    dependencies.push("eslint");
  }

  if (customOptions.additionalFeatures?.includes("swagger")) {
    dependencies.push("swagger-jsdoc", "swagger-ui-express");
  }

  if (customOptions.additionalFeatures?.includes("husky")) {
    dependencies.push("husky", "lint-staged");
  }

  return dependencies;
}
