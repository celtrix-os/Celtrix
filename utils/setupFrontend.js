import { execSync } from "child_process";
import chalk from "chalk";
import path from "path";
import fs from "fs";

const removeLocks = (dir) => {
  ["package-lock.json", "yarn.lock", "pnpm-lock.yaml"].forEach((file) => {
    const lockFile = path.join(dir, file);
    if (fs.existsSync(lockFile)) fs.rmSync(lockFile);
  });
};

export async function setupFrontend(projectPath, frontend) {
  if (frontend === "None") return;

  console.log(chalk.green(`\n📦 Bootstrapping ${frontend} frontend...`));
  const appsPath = path.join(projectPath, "apps");

  if (frontend === "React") {
    execSync(
      `npm -y create vite@latest frontend -- --template react-ts --no-interactive --skip-git`,
      { stdio: "inherit", cwd: appsPath }
    );
  } else if (frontend === "Vue") {
    execSync(
      `npm -y create vite@latest frontend -- --template vue --no-interactive --skip-git`,
      { stdio: "inherit", cwd: appsPath }
    );
  } else if (frontend === "Angular") {
    execSync(`npx -y @angular/cli new frontend --skip-install --skip-git`, {
      stdio: "inherit",
      cwd: appsPath,
    });
  }

  removeLocks(path.join(appsPath, "frontend"));
}
