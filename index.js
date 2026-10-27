
import chalk from "chalk";
import { showVersion } from "./prompts/info/showVersion.js";
import { showHelp } from "./prompts/info/showHelp.js";
import { parseArgs } from "./prompts/stable/parseArgs.js";
import {
  CliError,
  DEFAULT_PROJECT_NAME,
  QUICK_TEMPLATES,
  applyDefaults,
  getMissingFlags,
  hasStackFlags,
  parseCliArgs,
} from "./utils/cliFlags.js";

const orange = chalk.hex("#FF6200");

const isVerbose = process.argv.includes("--verbose");

function exitWithUsageError(messages) {
  for (const message of messages) console.error(chalk.red(`✖ ${message}`));
  process.exit(1);
}

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

  let cli;
  try {
    cli = parseCliArgs(args);
  } catch (err) {
    if (err instanceof CliError) exitWithUsageError(err.messages);
    throw err;
  }

  if (cli.command === 'login') {
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
    { showNextSteps },
    { detectPackageManager },
    { default: inquirer },
    { default: logSymbols },
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
    import("./utils/project.js"),
    import("./prompts/stable/detectPackageManager.js"),
    import("inquirer"),
    import("log-symbols"),
    import("path")
  ]);

  // Without a TTY there is no one to answer a prompt, so fail fast instead of hanging
  const isInteractive = Boolean(process.stdin.isTTY);
  if (!isInteractive && !cli.yes) {
    const missing = getMissingFlags(cli);
    if (missing.length > 0) {
      exitWithUsageError([
        `No terminal to prompt on, and these values are missing: ${missing.join(", ")}`,
        "Pass them as flags, or add --yes to use the defaults. Run celtrix --help to see every flag.",
      ]);
    }
  }

  showBanner();

  const { values } = cli;
  let projectName = cli.projectName;
  let packageManager = detectPackageManager();
  let config;
  const quickKey = cli.command;
  const quickConfig = QUICK_TEMPLATES[quickKey];
  const isQuick = Boolean(quickConfig);
  // Any stack flag (or --yes) means the custom stack, so the preset menu is skipped
  const useCustomFlags = cli.yes || hasStackFlags(values);
  const askPM = async () => values.packageManager
    ?? (cli.yes ? packageManager : (await askPackageManager()).packageManager);

  try {

    if (!projectName) {
      projectName = cli.yes ? DEFAULT_PROJECT_NAME : await askProjectName();
    }

    if (isQuick) {
      // QUICK MODE (mern-js / mern-ts)
      console.log(chalk.green(`⚡ Using quick template: ${quickKey}`));

      packageManager = await askPM();
      const runtime = values.runtime
        ?? (cli.yes ? "node" : (await askRuntimeEnvironment()).runtime);

      config = {
        stack: quickConfig.stack,       // always mern
        language: quickConfig.language, // js or ts
        projectName,
        packageManager,
        runtime
      };

    } else if (useCustomFlags) {
      // ── Custom Stack from flags: prompt only for what is missing ──
      if (cli.yes) {
        config = { stack: "custom", ...applyDefaults(values, { packageManager }), projectName };
      } else {
        const stillMissing = getMissingFlags({ projectName, values }).filter((flag) => flag !== "--pm");
        if (stillMissing.length > 0) console.log(chalk.gray("\n── Customise your tech stack ──\n"));
        const customConfig = await gatherCustomConfig(values);
        packageManager = await askPM();
        config = { stack: "custom", ...customConfig, projectName, packageManager };
      }

    } else {
      // NORMAL MODE
      const stackAnswers = await askStackQuestions();

      if (stackAnswers.stack === "custom") {
        // ── Custom Stack Flow ──
        console.log(chalk.gray("\n── Customise your tech stack ──\n"));
        const customConfig = await gatherCustomConfig();
        packageManager = await askPM();
        config = { stack: "custom", ...customConfig, projectName, packageManager };
      } else {
        // ── Preset Stack Flow ──
        const runtimeAnswers = await askRuntimeEnvironment();
        packageManager = await askPM();
        config = { ...stackAnswers, ...runtimeAnswers, projectName, packageManager };
      }
    }

    if (config.stack !== "custom") {
      const { backend: stackBackend } = getStackMeta(config.stack);
      if (!stackBackend) {
        console.log(chalk.yellow("⚠️ Note: This stack is frontend-only — no backend server will be created."));
      }
    }

    // Yes/no questions take their default with --yes or without a TTY, and are skipped by --no-install / --no-git
    const confirm = async (enabled, name, message) => {
      if (!enabled) return false;
      if (cli.yes || !isInteractive) return true;
      const answers = await inquirer.prompt([{ type: "confirm", name, message, default: true }]);
      return answers[name];
    };

    // Ask whether to install dependencies (handled in main script)
    const installDeps = await confirm(cli.install, "installDeps", "Do you want to install dependencies?");

    // Ask whether to initialize a git repo
    const initGit = await confirm(cli.git, "initGit", "Initialize a git repository?");

    // --- Scaffold with per-phase progress + timing ---
    const startTime = Date.now();

    try {
      await createProject(projectName, config, installDeps);
      const elapsed = Date.now() - startTime;
      console.log(
        `\n${logSymbols.success} ${chalk.green(`Project scaffolded in ${formatElapsed(elapsed)}`)}`
      );
    } catch (err) {
      console.log(`\n${logSymbols.error} ${chalk.red("Scaffolding failed")}`);
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
    showNextSteps(projectName, config);

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