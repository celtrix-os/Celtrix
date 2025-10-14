import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";
import { angularSetup } from "./installer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function copyTemplates(projectPath, config) {
  const { stack } = config;
  
  switch (stack) {
    case 'mern':
    case 'mern+tailwind+auth':
    case 'mevn':
    case 'mevn+tailwind+auth':
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
      const frontendTemplate = path.join(
        __dirname, '..', 'templates', stack, config.language, 'client'
      );
      const backendTemplate = path.join(
        __dirname, '..', 'templates', stack, config.language, 'server'
      );

      logger.info('📂 Copying template files...');
      // Always ensure server template exists (Cloudflare Workers structure)
      fs.copySync(backendTemplate, serverPath);
      // Fallback: only copy client template if CLI didn't create it
      if (!fs.existsSync(clientPath) || fs.readdirSync(clientPath).length === 0) {
        logger.warn('⚠️ Hono client not found after CLI step — copying fallback client template');
        fs.copySync(frontendTemplate, clientPath);
      }
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
}
