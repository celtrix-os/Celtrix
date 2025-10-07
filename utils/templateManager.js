import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";
import { angularSetup } from "./installer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function copyTemplates(projectPath, config) {
  const { stack } = config;


  if(stack !== "mean" && stack !== "mean+tailwind+auth" && stack !== "t3-stack" && stack !== "react+tailwind+firebase"){

  if(stack === "mern"){
    const backendTemplate = path.join(__dirname, "..","templates","mern","server")
    const serverPath = path.join(projectPath, "server");
    
    logger.info("📂 Copying backend template files...");
    fs.copySync(backendTemplate, serverPath);
  }

  else if(stack === 'mern+tailwind+auth'){
    const backendTemplate = path.join(__dirname,"..","templates","mern+tailwind+auth","server");
    const serverPath = path.join(projectPath, "server");
    
    logger.info("📂 Copying backend template files...");
    fs.copySync(backendTemplate, serverPath);
  }

  else if(stack=='mevn'){
    const backendTemplate = path.join(__dirname,"..","templates","mevn","server");
    const serverPath = path.join(projectPath, "server");
    
    logger.info("📂 Copying backend template files...");
    fs.copySync(backendTemplate, serverPath);
  }

  else if(stack !== "mean" && stack !== "mean+tailwind+auth" && stack !== "t3-stack"){

    const frontendTemplate = path.join(__dirname, "..", "templates", stack, config.language, "client");
    const backendTemplate = path.join(__dirname, "..", "templates", stack, config.language, "server");

    const clientPath = path.join(projectPath, "client");
    const serverPath = path.join(projectPath, "server");

    logger.info("📂 Copying template files...");
    fs.copySync(frontendTemplate, clientPath);
    fs.copySync(backendTemplate, serverPath);
  }

  else if(stack === "mean" || stack === "mean+tailwind+auth" ){
    const backendTemplate = path.join(__dirname, "..", "templates", stack, "server")
    const serverPath = path.join(projectPath, "server");
    
    logger.info("📂 Copying template files...");
    fs.copySync(backendTemplate, serverPath);
  }

  else if(stack === "t3-stack" ){
    const frontendTemplate = path.join(__dirname, "..", "templates", stack, "t3-app");

    const clientPath = path.join(projectPath, "t3-app");

    logger.info("📂 Copying template files...");
    fs.copySync(frontendTemplate, clientPath);
  }
  if(stack === "react+tailwind+firebase"){
    const frontendTemplate = path.join(__dirname, "..", "templates", stack, config.language, "client");

    const clientPath = path.join(projectPath, "client");

    logger.info("📂 Copying template files...");
    fs.copySync(frontendTemplate, clientPath);
  }
}
