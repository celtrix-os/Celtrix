import path from "path";
import fs from "fs-extra";
import inquirer from "inquirer"; // ADD THIS IMPORT
import { logger } from "../utils/logger.js";
import { runShellCommand } from "./runners/shellRunner.js";
import { validateEnvironment } from "../utils/validation.js";
import fileModifier from '../utils/fileModifier.js';
import { getDjangoReactStack } from "../templates/django-react/django-react.js";
import envGenerator from '../utils/envGenerator.js';

/**
 * Main command executor
 * Ye function stack ke according setup karega
 */
export async function executeStackSetup(projectName, config) {
  const projectPath = path.join(process.cwd(), projectName);

  try {
    // 1. Validate environment (Python, Node, etc.)
    logger.info("🔍 Checking prerequisites...");
    await validateEnvironment(config);

    // 2. Get language selection
    const { language } = await inquirer.prompt([
      {
        type: 'list',
        name: 'language',
        message: 'Choose your frontend language:',
        choices: [
          { name: 'JavaScript', value: 'javascript' },
          { name: 'TypeScript', value: 'typescript' },
          { name: 'Python (with JS frontend + Python dev tools)', value: 'python' }
        ],
        default: 'javascript'
      }
    ]);

    // Add language to config
    config.language = language;

    // 3. Get stack configuration
    const stackConfig = getStackConfiguration(config.stack);
    if (!stackConfig) {
      throw new Error(`Stack ${config.stack} is not configured for command-based setup yet.`);
    }

    // 4. Create project directory
    logger.info(`📁 Creating project directory: ${projectName}`);
    if (fs.existsSync(projectPath)) {
      throw new Error(`Directory ${projectName} already exists!`);
    }
    fs.mkdirSync(projectPath);

    // 5. Execute setup commands (backend)
    logger.info("🚀 Setting up project structure...");
    await executeStackCommands(projectPath, stackConfig, config);

    // 6. Setup frontend based on language
    logger.info(`🔄 Setting up ${language} frontend...`);
    if (stackConfig.setupFrontend) {
      await stackConfig.setupFrontend(projectPath, language);
    }

    // 7. Modify configuration files
    logger.info("⚙️  Configuring project files...");
    await modifyProjectFiles(projectPath, stackConfig, config);

    // 8. Generate environment files
    logger.info("📝 Generating environment files...");
    await generateEnvironmentFiles(projectPath, stackConfig, config);

    logger.success(`\n✅ Project ${projectName} created successfully! 🎉\n`);
    displayNextSteps(projectName, stackConfig, language);

  } catch (error) {
    logger.error(`❌ Setup failed: ${error.message}`);
    
    // Cleanup on failure
    if (fs.existsSync(projectPath)) {
      logger.warn("🧹 Cleaning up...");
      fs.removeSync(projectPath);
    }
    
    throw error;
  }
}

/**
 * Get stack configuration based on stack type
 */
function getStackConfiguration(stackType) {
  switch (stackType) {
    case "django-react":
      return getDjangoReactStack();
    
    // Future stacks
    // case "django-vue":
    //   return getDjangoVueStack();
    // case "django-angular":
    //   return getDjangoAngularStack();
    
    default:
      return null; // Purane template-based stacks ke liye
  }
}

/**
 * Execute all setup commands for the stack
 */
async function executeStackCommands(projectPath, stackConfig, config) {
  const commands = stackConfig.setupCommands;

  for (let i = 0; i < commands.length; i++) {
    const cmd = commands[i];
    const step = `[${i + 1}/${commands.length}]`;
    
    logger.info(`${step} ${cmd.name}...`);

    // Replace placeholders in command
    let command = cmd.command
      .replace(/\{\{projectPath\}\}/g, projectPath)
      .replace(/\{\{projectName\}\}/g, config.projectName);

    // Determine working directory
    const cwd = cmd.cwd 
      ? cmd.cwd.replace(/\{\{projectPath\}\}/g, projectPath)
      : projectPath;

    // Execute command
    await runShellCommand(command, {
      cwd: cwd,
      venv: cmd.venv || false,
      shell: true,
      stdio: cmd.silent ? 'pipe' : 'inherit'
    });

    logger.success(`✅ ${cmd.name} completed`);
  }
}

/**
 * Modify project files after generation
 */
async function modifyProjectFiles(projectPath, stackConfig, config) {
  if (!stackConfig.fileModifications) return;

  for (const modification of stackConfig.fileModifications) {
    await modification.modify(projectPath, config, fileModifier);
  }
}

/**
 * Generate .env and other environment files
 */
async function generateEnvironmentFiles(projectPath, stackConfig, config) {
  if (!stackConfig.envGenerator) return;

  await stackConfig.envGenerator(projectPath, config, envGenerator);
}

/**
 * Display next steps for user
 */
function displayNextSteps(projectName, stackConfig, language) {
  console.log("👉 Next Steps:\n");
  
  if (stackConfig.getNextSteps) {
    const steps = stackConfig.getNextSteps(projectName, language);
    steps.forEach(step => {
      console.log(`   ${step}`);
    });
  } else if (stackConfig.nextSteps) {
    stackConfig.nextSteps.forEach(step => {
      console.log(`   ${step}`);
    });
  }
  
  console.log("\n✨ Made with ❤️  by Celtrix ✨\n");
}