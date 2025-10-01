import fs from "fs-extra";
import path from "path";
import { fileURLToPath } from "url";
import { logger } from "./logger.js";
import { angularSetup } from "./installer.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export function copyTemplates(projectPath, config) {
  const { stack } = config;

  if (stack !== "mean" && stack !== "mean+tailwind+auth" && stack !== "t3-stack" && stack !== "mern-turbo") {
    const frontendTemplate = path.join(__dirname, "..", "templates", stack, config.language, "client");
    const backendTemplate = path.join(__dirname, "..", "templates", stack, config.language, "server");

    const clientPath = path.join(projectPath, "client");
    const serverPath = path.join(projectPath, "server");

    logger.info("📂 Copying template files...");
    fs.copySync(frontendTemplate, clientPath);
    fs.copySync(backendTemplate, serverPath);
  }
  if (stack === "mean" || stack === "mean+tailwind+auth") {
    const backendTemplate = path.join(__dirname, "..", "templates", stack, "server")
    const serverPath = path.join(projectPath, "server");

    logger.info("📂 Copying template files...");
    fs.copySync(backendTemplate, serverPath);
  }
  if (stack === "t3-stack") {
    const frontendTemplate = path.join(__dirname, "..", "templates", stack, "t3-app");

    const clientPath = path.join(projectPath, "t3-app");

    logger.info("📂 Copying template files...");
    fs.copySync(frontendTemplate, clientPath);
  }
  if (stack === "mern-turbo") {
    const lang = config.language || 'typescript';
    const rootTemplate = path.join(__dirname, "..", "templates", stack, lang);
    logger.info(`📂 Copying Turborepo (MERN) template files (${lang})...`);
    fs.copySync(rootTemplate, projectPath);
  }
}
