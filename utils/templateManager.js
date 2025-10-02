import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";
import { angularSetup } from "./installer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function copyTemplates(projectPath, config) {
  const { stack } = config;

  if(stack !== "mean" && stack !== "mean+tailwind+auth" && stack !== "t3-stack"){
    const frontendTemplate = path.join(__dirname, "..", "templates", stack, config.language, "client");
    const backendTemplate = path.join(__dirname, "..", "templates", stack, config.language, "server");

    const clientPath = path.join(projectPath, "client");
    const serverPath = path.join(projectPath, "server");

    logger.info("📂 Copying template files...");
    fs.copySync(frontendTemplate, clientPath);
    fs.copySync(backendTemplate, serverPath);
  }
  
  if(stack === "pern"){
    const clientPath = path.join(projectPath, "client");
    const serverPath = path.join(projectPath, "server");

    const pernClientTemplate = path.join(__dirname, "..", "templates", "pern", config.language, "client");
    const mernClientTemplate = path.join(__dirname, "..", "templates", "mern", config.language, "client");
    const pernServerTemplate = path.join(__dirname, "..", "templates", "pern", config.language, "server");

    logger.info("📂 Copying template files...");
    fs.copySync(fs.existsSync(pernClientTemplate) ? pernClientTemplate : mernClientTemplate, clientPath);
    fs.copySync(pernServerTemplate, serverPath);
  }
  if(stack === "mean" || stack === "mean+tailwind+auth"){
    const backendTemplate = path.join(__dirname, "..", "templates", stack, "server")
    const serverPath = path.join(projectPath, "server");
    
    logger.info("📂 Copying template files...");
    fs.copySync(backendTemplate, serverPath);
  }
  if(stack === "t3-stack"){
    const frontendTemplate = path.join(__dirname, "..", "templates", stack, "t3-app");

    const clientPath = path.join(projectPath, "t3-app");

    logger.info("📂 Copying template files...");
    fs.copySync(frontendTemplate, clientPath);
  }
}
