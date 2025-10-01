import { execSync } from "child_process";
import { logger } from "./logger.js";
import chalk from "chalk";

/**
 * Validate environment based on stack requirements
 */
export async function validateEnvironment(config) {
  const { stack } = config;

  // Django-based stacks ke liye Python check karo
  if (stack.includes('django')) {
    await validatePython();
    await validatePip();
  }

  // Sabhi stacks ke liye Node check karo (frontend ke liye)
  await validateNode();
  await validateNpm();

  logger.success("✅ All prerequisites met!");
}

/**
 * Check Python installation and version
 */
async function validatePython() {
  try {
    // Try python3 first
    let pythonCmd = 'python3';
    let version = null;

    try {
      version = execSync(`${pythonCmd} --version`, { 
        encoding: 'utf-8',
        stdio: 'pipe'
      });
    } catch {
      // If python3 fails, try python
      pythonCmd = 'python';
      version = execSync(`${pythonCmd} --version`, { 
        encoding: 'utf-8',
        stdio: 'pipe'
      });
    }

    // Extract version number
    const versionMatch = version.match(/Python (\d+)\.(\d+)\.(\d+)/);
    if (!versionMatch) {
      throw new Error('Could not determine Python version');
    }

    const major = parseInt(versionMatch[1]);
    const minor = parseInt(versionMatch[2]);

    // Check if version >= 3.8
    if (major < 3 || (major === 3 && minor < 8)) {
      throw new Error(`Python 3.8+ is required. Found: Python ${major}.${minor}`);
    }

    logger.info(`✅ Python ${major}.${minor}.${versionMatch[3]} detected (using '${pythonCmd}')`);

  } catch (error) {
    logger.error("❌ Python not found or version too old");
    logger.error("   Please install Python 3.8 or higher from https://www.python.org/");
    throw new Error('Python 3.8+ is required for Django projects');
  }
}

/**
 * Check pip installation
 */
async function validatePip() {
  try {
    const pythonCmd = getPythonCommand();
    const version = execSync(`${pythonCmd} -m pip --version`, {
      encoding: 'utf-8',
      stdio: 'pipe'
    });

    const versionMatch = version.match(/pip ([\d.]+)/);
    if (versionMatch) {
      logger.info(`✅ pip ${versionMatch[1]} detected`);
    }

  } catch (error) {
    logger.error("❌ pip not found");
    logger.error("   Install pip: python -m ensurepip --upgrade");
    throw new Error('pip is required for Django projects');
  }
}

/**
 * Check Node.js installation and version
 */
async function validateNode() {
  try {
    const version = execSync('node --version', {
      encoding: 'utf-8',
      stdio: 'pipe'
    });

    const versionMatch = version.match(/v(\d+)\.(\d+)\.(\d+)/);
    if (!versionMatch) {
      throw new Error('Could not determine Node.js version');
    }

    const major = parseInt(versionMatch[1]);
    const minor = parseInt(versionMatch[2]);

    // Check if version >= 16
    if (major < 16) {
      throw new Error(`Node.js 16+ is required. Found: v${major}.${minor}`);
    }

    logger.info(`✅ Node.js v${major}.${minor}.${versionMatch[3]} detected`);

  } catch (error) {
    logger.error("❌ Node.js not found or version too old");
    logger.error("   Please install Node.js 16+ from https://nodejs.org/");
    throw new Error('Node.js 16+ is required');
  }
}

/**
 * Check npm installation
 */
async function validateNpm() {
  try {
    const version = execSync('npm --version', {
      encoding: 'utf-8',
      stdio: 'pipe'
    });

    logger.info(`✅ npm ${version.trim()} detected`);

  } catch (error) {
    logger.error("❌ npm not found");
    throw new Error('npm is required (comes with Node.js)');
  }
}

/**
 * Helper: Get Python command (python3 or python)
 */
function getPythonCommand() {
  try {
    execSync('python3 --version', { stdio: 'pipe' });
    return 'python3';
  } catch {
    try {
      execSync('python --version', { stdio: 'pipe' });
      return 'python';
    } catch {
      throw new Error('Python not found');
    }
  }
}

/**
 * Check PostgreSQL installation (optional)
 */
export async function checkPostgreSQL() {
  try {
    const version = execSync('psql --version', {
      encoding: 'utf-8',
      stdio: 'pipe'
    });

    const versionMatch = version.match(/([\d.]+)/);
    if (versionMatch) {
      logger.info(`✅ PostgreSQL ${versionMatch[1]} detected`);
      return true;
    }
  } catch {
    logger.warn("⚠️  PostgreSQL not detected (optional - you can install later)");
    logger.warn("   Download from: https://www.postgresql.org/download/");
    return false;
  }
}