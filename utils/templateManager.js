import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";
import { angularSetup } from "./installer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function addClientDockerfile(projectPath, _config) {
  const clientPath = path.join(projectPath, "client");

  if (!fs.existsSync(clientPath)) {
    return;
  }

  const dockerfilePath = path.join(clientPath, "Dockerfile");
  const dockerignorePath = path.join(clientPath, ".dockerignore");

  // Don't overwrite if Dockerfile already exists
  if (fs.existsSync(dockerfilePath)) {
    return;
  }

  // Create client Dockerfile for Vite-based projects
  const dockerfileContent = `# Build stage
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy source code
COPY . .

# Build the app
RUN npm run build

# Production stage
FROM nginx:alpine

# Copy built files from builder
COPY --from=builder /app/dist /usr/share/nginx/html

# Expose port
EXPOSE 80

# Start nginx
CMD ["nginx", "-g", "daemon off;"]
`;

  // Create .dockerignore
  const dockerignoreContent = `node_modules
npm-debug.log
.env
.env.local
.git
.gitignore
README.md
*.md
.DS_Store
dist
build
.vscode
.idea
coverage
.nyc_output
*.log
`;

  fs.writeFileSync(dockerfilePath, dockerfileContent);
  fs.writeFileSync(dockerignorePath, dockerignoreContent);
  logger.info("🐳 Added Dockerfile to client...");
}

function copyDockerCompose(projectPath, config) {
  const { stack } = config;

  // Stacks that should include docker-compose.yml
  const fullStackStacks = ['mevn+tailwind+auth', 'hono'];

  if (fullStackStacks.includes(stack)) {
    const dockerComposeTemplate = path.join(
      __dirname, '..', 'templates', stack, 'docker-compose.yml'
    );
    const dockerComposeDest = path.join(projectPath, 'docker-compose.yml');

    if (fs.existsSync(dockerComposeTemplate)) {
      logger.info('🐳 Copying docker-compose.yml...');
      fs.copySync(dockerComposeTemplate, dockerComposeDest);
    }
  }

  // Copy docker-compose.yml for stacks 
  const stacksWithGeneratedClients = [
    'mern',
    'mern+tailwind+auth',
    'mevn',
    'mean',
    'mean+tailwind+auth',
  ];

  if (stacksWithGeneratedClients.includes(stack)) {
    const dockerComposeExample = path.join(
      __dirname, '..', 'templates', 'docker-compose.yml'
    );
    const dockerComposeExampleDest = path.join(projectPath, 'docker-compose.yml');

    if (fs.existsSync(dockerComposeExample)) {
      logger.info('🐳 Copying docker-compose.yml...');
      fs.copySync(dockerComposeExample, dockerComposeExampleDest);
    }

    // Add Dockerfiles to generated clients (created by vite)
    addClientDockerfile(projectPath, config);
  }
}

export function copyTemplates(projectPath, config) {
  const { stack } = config;
  
  switch (stack) {
    case 'mern':
    case 'mern+tailwind+auth':
    case 'mevn':
    case 'mean':
    case 'mean+tailwind+auth':
     {
      const serverPath = path.join(projectPath, 'server');
      const backendTemplate = path.join(
        __dirname, '..', 'templates', stack,'server'
      );
      
      logger.info('📂 Copying template files...');
      fs.copySync(backendTemplate, serverPath);
      break;
    }

    case 'mevn+tailwind+auth':
      {
        const clientPath = path.join(projectPath, 'client');
        const serverPath = path.join(projectPath, 'server');
        const frontendTemplate = path.join(
          __dirname,'..', 'templates', stack, config.language, 'client'
        );
        const backendTemplate = path.join(
          __dirname, '..', 'templates', stack, config.language, 'server'
        );

        logger.info("📂 Copying template files...");
        fs.copySync(frontendTemplate, clientPath);
        fs.copySync(backendTemplate, serverPath);
        break;
      }

    
    case 'react+tailwind+firebase': {
      const clientPath = path.join(projectPath, 'client');
      const frontendTemplate = path.join(
        __dirname, '..', 'templates', stack, config.language, 'client'
      );
      
      logger.info('📂 Copying template files...');
      fs.copySync(frontendTemplate, clientPath);
      break;
    }

    case 'hono': {
      const clientPath = path.join(projectPath, 'client');
      const serverPath = path.join(projectPath, 'server');
      // const frontendTemplate = path.join(
      //   __dirname, '..', 'templates', stack, config.language, 'client'
      // );
      const backendTemplate = path.join(
        __dirname, '..', 'templates', stack, config.language, 'server'
      );
      
      logger.info('📂 Copying template files...');
      fs.copySync(backendTemplate, serverPath);
      break;
    }
    
    default: {
      // Handle other stacks with client-server structure
      const clientPath = path.join(projectPath, 'client');
      const serverPath = path.join(projectPath, 'server');
      const frontendTemplate = path.join(__dirname, '..', 'templates', stack, config.language, 'client');
      const backendTemplate = path.join(__dirname, '..', 'templates', stack, config.language, 'server');
      
      logger.info('📂 Copying template files...');
      fs.copySync(frontendTemplate, clientPath);
      fs.copySync(backendTemplate, serverPath);
    }
  }

  // Copy Docker-related files 
  copyDockerCompose(projectPath, config);
}
