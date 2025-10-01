import chalk from "chalk";
import path from "path"; // ADD THIS IMPORT
import fs from "fs-extra"; // ADD THIS IMPORT
import { runShellCommand } from "../../commands/runners/shellRunner.js"; // MAKE SURE THIS EXISTS

/**
 * Django + React Stack Configuration
 * PostgreSQL + Django REST Framework + React + JWT Auth
 */
export function getDjangoReactStack() {
  return {
    name: "Django + React + PostgreSQL",
    description: "Full-stack application with Django REST Framework backend and React frontend",

    // Prerequisites check
    requirements: {
      python: ">=3.8",
      node: ">=16", 
      pip: true,
      npm: true
    },

    // Setup commands to execute
    setupCommands: [
      // ========== BACKEND SETUP ==========
      {
        name: "Creating project directories",
        command: "mkdir server client",
        cwd: "{{projectPath}}"
      },
      {
        name: "Creating Python virtual environment",
        command: "python -m venv venv",
        cwd: "{{projectPath}}/server"
      },
      {
        name: "Upgrading pip",
        command: "python -m pip install --upgrade pip",
        cwd: "{{projectPath}}/server",
        venv: true
      },
      {
        name: "Installing Django and dependencies",
        command: "pip install django djangorestframework django-cors-headers psycopg2-binary djangorestframework-simplejwt python-decouple",
        cwd: "{{projectPath}}/server",
        venv: true
      },
      {
        name: "Creating Django project",
        command: "django-admin startproject backend .",
        cwd: "{{projectPath}}/server",
        venv: true
      },
      {
        name: "Creating API app",
        command: "python manage.py startapp api",
        cwd: "{{projectPath}}/server",
        venv: true
      },
      {
        name: "Creating authentication app",
        command: "python manage.py startapp authentication",
        cwd: "{{projectPath}}/server",
        venv: true
      }
      // Frontend setup will be handled separately based on language
    ],

    // File modifications after generation
    fileModifications: [
      {
        name: "Configure Django settings.py",
        modify: async (projectPath, config, fileModifier) => {
          await fileModifier.modifyDjangoSettings(projectPath, config);
        }
      },
      {
        name: "Configure Django urls.py",
        modify: async (projectPath, config, fileModifier) => {
          await fileModifier.modifyDjangoUrls(projectPath, config);
        }
      },
      {
        name: "Create requirements.txt",
        modify: async (projectPath, config, fileModifier) => {
          await fileModifier.createRequirementsTxt(projectPath);
        }
      },
      {
        name: "Create API serializers and views",
        modify: async (projectPath, config, fileModifier) => {
          await fileModifier.createApiBoilerplate(projectPath, config);
        }
      },
      {
        name: "Create authentication views",
        modify: async (projectPath, config, fileModifier) => {
          await fileModifier.createAuthBoilerplate(projectPath, config);
        }
      },
      {
        name: "Configure React API service",
        modify: async (projectPath, config, fileModifier) => {
          await fileModifier.createReactApiService(projectPath);
        }
      }
    ],

    // Environment file generation
    envGenerator: async (projectPath, config, envGenerator) => {
      await envGenerator.generateDjangoEnv(projectPath, config);
      await envGenerator.generateReactEnv(projectPath);
    },

    // Language-specific frontend setup
    setupFrontend: async (projectPath, language) => {
      const clientPath = path.join(projectPath, 'client');
      
      switch (language) {
        case 'typescript':
          await setupTypeScriptFrontend(clientPath);
          break;
        case 'python':
          // For Python, we still use JavaScript frontend but add Python dev tools
          await setupJavaScriptFrontend(clientPath);
          await setupPythonBackend(projectPath);
          break;
        default:
          await setupJavaScriptFrontend(clientPath);
      }
    },

    // Next steps to display after setup
    getNextSteps: (projectName, language) => {
      const steps = [
        chalk.yellow("\n📌 Backend Setup:"),
        chalk.white(`   cd ${projectName}/server`),
        chalk.gray("   # Activate virtual environment:"),
        chalk.cyan("   source venv/bin/activate") + chalk.gray("  (Linux/Mac)"),
        chalk.cyan("   venv\\Scripts\\activate") + chalk.gray("     (Windows)"),
      ];

      // Add Python-specific tips if Python was selected
      if (language === 'python') {
        steps.push(
          chalk.gray("   # Install development tools:"),
          chalk.cyan("   pip install -r requirements-dev.txt")
        );
      }

      steps.push(
        chalk.gray("   # Configure database in .env file, then:"),
        chalk.green("   python manage.py migrate"),
        chalk.green("   python manage.py createsuperuser"),
        chalk.green("   python manage.py runserver"),
        
        chalk.yellow("\n📌 Frontend Setup:"),
        chalk.white(`   cd ${projectName}/client`),
        chalk.green("   npm run dev")
      );

      // Add TypeScript info if TypeScript was selected
      if (language === 'typescript') {
        steps.push(
          chalk.gray("   # TypeScript project - type checking available")
        );
      }

      steps.push(
        chalk.yellow("\n🔗 URLs:"),
        chalk.cyan("   Backend API:    ") + chalk.white("http://localhost:8000/api/"),
        chalk.cyan("   Admin Panel:    ") + chalk.white("http://localhost:8000/admin/"),
        chalk.cyan("   Frontend:       ") + chalk.white("http://localhost:5173/"),
        
        chalk.yellow("\n📚 Database Setup:"),
        chalk.gray("   1. Install PostgreSQL from https://www.postgresql.org/"),
        chalk.gray(`   2. Create a database: `) + chalk.cyan(`createdb ${projectName}_db`),
        chalk.gray("   3. Update credentials in server/.env"),
        chalk.gray("   4. Run migrations: ") + chalk.cyan("python manage.py migrate")
      );

      return steps;
    }
  };
}



/**
 * Setup TypeScript frontend
 */
async function setupTypeScriptFrontend(clientPath) {
  // Use echo to automatically answer "No" to the prompt
  await runShellCommand('echo "n" | npm create vite@latest . -- --template react-ts', {
    cwd: clientPath,
    silent: false
  });
  
  await runShellCommand('npm install', {
    cwd: clientPath
  });
  
  await runShellCommand('npm install axios react-router-dom @types/react @types/react-dom', {
    cwd: clientPath
  });
}

/**
 * Setup JavaScript frontend (default)
 */
async function setupJavaScriptFrontend(clientPath) {
  // Use echo to automatically answer "No" to the prompt
  await runShellCommand('echo "n" | npm create vite@latest . -- --template react', {
    cwd: clientPath,
    silent: false
  });
  
  await runShellCommand('npm install', {
    cwd: clientPath
  });
  
  await runShellCommand('npm install axios react-router-dom', {
    cwd: clientPath
  });
}

/**
 * Setup Python-specific backend enhancements
 */
async function setupPythonBackend(projectPath) {
  const serverPath = path.join(projectPath, 'server');
  
  // Install additional Python packages for better development
  await runShellCommand('pip install black flake8 pylint django-debug-toolbar', {
    cwd: serverPath,
    venv: true
  });
  
  // Create Python-specific configuration files
  await createPythonConfigFiles(serverPath);
}

/**
 * Create Python configuration files
 */
async function createPythonConfigFiles(serverPath) {
  try {
    // Create .python-version
    await fs.writeFile(
      path.join(serverPath, '.python-version'),
      '3.8+\n'
    );
    
    // Create .flake8 config
    const flake8Config = `[flake8]
max-line-length = 88
extend-ignore = E203
`;
    await fs.writeFile(path.join(serverPath, '.flake8'), flake8Config);
    
    // Create requirements-dev.txt
    const devRequirements = `black>=23.0.0
flake8>=6.0.0
pylint>=2.17.0
django-debug-toolbar>=4.0.0
`;
    await fs.writeFile(path.join(serverPath, 'requirements-dev.txt'), devRequirements);
    
    console.log('✅ Python development tools configured');
  } catch (error) {
    console.warn('⚠️ Could not create Python config files:', error.message);
  }
}