import fs from "fs-extra";
import path from "path";
import { execSync } from "child_process";
import { getInstallCommand } from "../shared.js";

export async function generateAuth(context) {
  if (context.config.auth !== "clerk") return;

  const webDir = path.join(context.projectPath, "apps", "web");
  if (fs.existsSync(webDir)) {
    if (context.installDeps) {
      const installCmd = getInstallCommand(context.packageManager);
      execSync(`${context.packageManager} ${installCmd} @clerk/clerk-react`, { cwd: webDir, stdio: "inherit" });
    }

    // Injects Clerk context wrapper
    const appPath = path.join(webDir, "src", `App.${context.jsxExt}`);
    if (fs.existsSync(appPath)) {
      let content = fs.readFileSync(appPath, "utf-8");
      content = `import { ClerkProvider } from '@clerk/clerk-react';\n` + content;
      content = content.replace(
        /return \(([\s\S]*)\);/,
        (match, inner) => `return (
    <ClerkProvider publishableKey={import.meta.env.VITE_CLERK_PUBLISHABLE_KEY || ""}>
      ${inner.trim()}
    </ClerkProvider>
  );`
      );
      fs.writeFileSync(appPath, content);
    }
  }
}
