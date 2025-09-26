import { execSync } from "child_process";
import path from "path";
import fs from "fs";

export async function setupTurbo(projectName, projectPath) {
  try {
    execSync(
      `npx -y create-turbo@latest ${projectName} --example=basic --skip-install --package-manager=npm`,
      { stdio: "inherit" }
    );

    const appsPath = path.join(projectPath, "apps");
    if (fs.existsSync(appsPath)) {
      fs.rmSync(appsPath, { recursive: true, force: true });
    }
    fs.mkdirSync(appsPath);
  } catch (error) {
    console.error("Error setting up Turborepo:", error);
    throw new Error("Failed to setup Turborepo");
  }
}
