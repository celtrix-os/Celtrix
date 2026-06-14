
import chalk from "chalk";
import { showVersion } from "./prompts/info/showVersion.js";
import { showHelp } from "./prompts/info/showHelp.js";
import { parseArgs } from "./prompts/stable/parseArgs.js";

const orange = chalk.hex("#FF6200");

const quickTemplates = {
  "mern-js": { stack: "mern", language: "javascript" },
  "mern-ts": { stack: "mern", language: "typescript" }
};

const isVerbose = process.argv.includes("--verbose");

async function main() {
  const args = parseArgs();

  // Handle version flag
  if (args.includes('--version') || args.includes('-v')) {
    showVersion();
    process.exit(0);
  }

  // Handle help flag
  if (args.includes('--help') || args.includes('-h')) {

    showHelp();
    process.exit(0);
  }

  if (args.includes('login')) {
    const { loginCommand } = await import("./commands/login.js");
    await loginCommand();
    process.exit(0);
  }

  // Dynamically load all packages needed for interactive flow in parallel
  const [
    { createProject },
    { gatherCustomConfig },
    { isPromptCancellation },
    { askStackQuestions },
    { askProjectName },
    { showBanner },
    { getStackMeta },
    { askRuntimeEnvironment },
    { askPackageManager },
    { formatElapsed },
    { showSummaryBox },
    { detectPackageManager },
    { default: inquirer },
    { default: ora },
    { default: path }
  ] = await Promise.all([
    import("./commands/scaffold.js"),
    import("./prompts/index.js"),
    import("./utils/shared.js"),
    import("./prompts/stack/stack.js"),
    import("./prompts/user/projectName.js"),
    import("./prompts/stable/showBanner.js"),
    import("./prompts/stable/getStackMeta.js"),
    import("./prompts/stack/runtime.js"),
    import("./prompts/common/askPackageManager.js"),
    import("./prompts/info/formatElapsed.js"),
    import("./prompts/info/summary.js"),
    import("./prompts/stable/detectPackageManager.js"),
    import("inquirer"),
    import("ora"),
    import("path")
  ]);

  showBanner();

  let projectName = args.find(arg => !arg.startsWith('--') && !arg.startsWith('-'));
  let packageManager = detectPackageManager();
  let config;
  const quickKey = args[0];
  let isQuick = false;
  let quickConfig = null;

  if (quickTemplates[quickKey]) {
    isQuick = true;
    quickConfig = quickTemplates[quickKey];
  }

  try {

    if (isQuick) {
      // QUICK MODE (mern-js / mern-ts)
      console.log(chalk.green(`⚡ Using quick template: ${quickKey}`));

      projectName = args[1] || (await askProjectName());

      packageManager = (await askPackageManager()).packageManager;
      const runtimeAnswers = await askRuntimeEnvironment();

      config = {
        stack: quickConfig.stack,       // always mern
        language: quickConfig.language, // js or ts
        projectName,
        packageManager,
        runtime: runtimeAnswers.runtime
      };

    } else {
      // NORMAL MODE
      const stackAnswers = await askStackQuestions();
      
      if (!projectName) {
        projectName = await askProjectName();
      }
     

      if (stackAnswers.stack === "custom") {
        // ── Custom Stack Flow ──
        console.log(chalk.gray("\n── Customise your tech stack ──\n"));
        const customConfig = await gatherCustomConfig();
        packageManager = (await askPackageManager()).packageManager;
        config = { stack: "custom", ...customConfig, projectName, packageManager };
      } else {
        // ── Preset Stack Flow ──
        const runtimeAnswers = await askRuntimeEnvironment();
        packageManager = (await askPackageManager()).packageManager;
        config = { ...stackAnswers, ...runtimeAnswers, projectName, packageManager };
      }
    }

    if (config.stack !== "custom") {
      const { backend: stackBackend } = getStackMeta(config.stack);
      if (!stackBackend) {
        console.log(chalk.yellow("⚠️ Note: This stack is frontend-only — no backend server will be created."));
      }
    }

    // Ask whether to install dependencies (handled in main script)
    const { installDeps } = await inquirer.prompt([
      {
        type: "confirm",
        name: "installDeps",
        message: "Do you want to install dependencies?",
        default: true,
      },
    ]);

    // Ask whether to initialize a git repo
    const { initGit } = await inquirer.prompt([
      {
        type: "confirm",
        name: "initGit",
        message: "Initialize a git repository?",
        default: true,
      },
    ]);

    // --- Scaffold with spinner + timing ---
    const startTime = Date.now();
    const scaffoldSpinner = ora({
      text: chalk.yellow("Scaffolding your project…"),
      spinner: "dots12",
    }).start();

    try {
      await createProject(projectName, config, installDeps);
      const elapsed = Date.now() - startTime;
      scaffoldSpinner.succeed(
        chalk.green(`Project scaffolded in ${formatElapsed(elapsed)}`)
      );
    } catch (err) {
      scaffoldSpinner.fail(chalk.red("Scaffolding failed"));
      throw err;
    }

    // --- Git init ---
    if (initGit) {
      const projectPath = path.join(process.cwd(), projectName);
      try {
        const { execSync } = await import("child_process");
        execSync("git init", { cwd: projectPath, stdio: "ignore" });
        execSync("git add .", { cwd: projectPath, stdio: "ignore" });
        execSync('git commit -m "Initial commit"', { cwd: projectPath, stdio: "ignore" });
        console.log(chalk.green("\n🎉 Git repository initialized with initial commit."));
      } catch {
        console.log(chalk.yellow("\n⚠️  Could not initialize git — you can run 'git init' manually."));
      }
    }

    // --- Summary box ---
    const totalElapsed = Date.now() - startTime;
    showSummaryBox({
      projectName,
      config,
      installedDeps: installDeps,
      elapsed: totalElapsed,
    });

  } catch (err) {
    // Graceful cancellation (Ctrl+C during any prompt)
    if (isPromptCancellation(err)) {
      console.log(chalk.yellow("\n👋 Cancelled — see you next time!\n"));
      process.exit(0);
    }

    console.log(chalk.red("❌ Error:"), err.message);
    if (isVerbose && err.stack) {
      console.log(chalk.gray(err.stack));
    }
    process.exit(1);
  }
}

main();