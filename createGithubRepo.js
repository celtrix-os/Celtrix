import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import fetch from "node-fetch";
import { existsSync } from "fs";
import path from "path";
import { spawn } from "child_process";
import { isPromptCancellation } from "./utils/shared.js";

const GITHUB_OAUTH_CLIENT_ID =
  process.env.GITHUB_OAUTH_CLIENT_ID ||
  process.env.GITHUB_CLIENT_ID ||
  "Ov23liMDYiGI0v8UsV0v";

const GITHUB_DEVICE_CODE_URL = "https://github.com/login/device/code";
const GITHUB_DEVICE_TOKEN_URL = "https://github.com/login/oauth/access_token";
const GITHUB_CREATE_REPO_URL = "https://api.github.com/user/repos";
const INITIAL_COMMIT_MESSAGE = "Initial commit";

/**
 * Sleeps for a given number of milliseconds.
 *
 * @param {number} ms - Delay duration in milliseconds.
 * @returns {Promise<void>}
 */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Runs a git command inside the given working directory.
 *
 * @param {string[]} args - Git command arguments.
 * @param {string} cwd - Directory where the command should run.
 * @param {"pipe" | "inherit"} [stdioMode="pipe"] - Stdio mode for the spawned process.
 * @returns {Promise<string>}
 */
function runGitCommand(args, cwd, stdioMode = "pipe") {
  return new Promise((resolve, reject) => {
    const stdio =
      stdioMode === "inherit"
        ? ["inherit", "inherit", "inherit"]
        : ["ignore", "pipe", "pipe"];

    const child = spawn("git", args, { cwd, stdio });
    let stdout = "";
    let stderr = "";

    if (child.stdout) {
      child.stdout.on("data", (chunk) => {
        stdout += chunk.toString();
      });
    }

    if (child.stderr) {
      child.stderr.on("data", (chunk) => {
        stderr += chunk.toString();
      });
    }

    child.on("error", (error) => {
      reject(error);
    });

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout.trim());
        return;
      }

      reject(new Error((stderr || stdout || `git ${args.join(" ")}`).trim()));
    });
  });
}


/**
 * Sends a form-encoded POST request and returns the JSON response.
 *
 * @param {string} url - Endpoint URL.
 * @param {Record<string, string>} body - Form fields.
 * @returns {Promise<any>}
 */
async function postForm(url, body) {
  const response = await fetch(url, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/x-www-form-urlencoded",
      "User-Agent": "Celtrix-CLI",
    },
    body: new URLSearchParams(body),
  });

  const text = await response.text();

  try {
    return text ? JSON.parse(text) : {};
  } catch {
    throw new Error("GitHub returned an unexpected response.");
  }
}

/**
 * Requests a GitHub device code for CLI authentication.
 *
 * The device flow is designed for headless apps like CLIs:
 * 1. Request a device code and user code from GitHub.
 * 2. Show the user the verification URL and code.
 * 3. Poll GitHub until the user finishes authorizing the app.
 *
 * @returns {Promise<{device_code: string, user_code: string, verification_uri: string, expires_in: number, interval: number}>}
 */
async function requestDeviceCode() {
  const response = await postForm(GITHUB_DEVICE_CODE_URL, {
    client_id: GITHUB_OAUTH_CLIENT_ID,
    scope: "repo",
  });

  if (response.error) {
    if (response.error === "device_flow_disabled") {
      throw new Error(
        "GitHub Device Flow is not enabled for this OAuth app. Enable Device Flow for the Celtrix OAuth app first."
      );
    }

    if (response.error === "incorrect_client_credentials") {
      throw new Error(
        "GitHub OAuth client configuration is invalid. Set a valid GITHUB_OAUTH_CLIENT_ID for Celtrix."
      );
    }

    throw new Error(response.error_description || "Unable to start GitHub authentication.");
  }

  return response;
}

/**
 * Polls GitHub until the user completes device-flow authentication.
 *
 * @param {{device_code: string, expires_in: number, interval: number}} deviceCode - Device flow payload.
 * @returns {Promise<string>}
 */
async function pollForAccessToken(deviceCode) {
  const startedAt = Date.now();
  let intervalSeconds = deviceCode.interval || 5;

  while (Date.now() - startedAt < deviceCode.expires_in * 1000) {
    await sleep(intervalSeconds * 1000);

    const response = await postForm(GITHUB_DEVICE_TOKEN_URL, {
      client_id: GITHUB_OAUTH_CLIENT_ID,
      device_code: deviceCode.device_code,
      grant_type: "urn:ietf:params:oauth:grant-type:device_code",
    });

    if (response.access_token) {
      return response.access_token;
    }

    if (response.error === "authorization_pending") {
      continue;
    }

    if (response.error === "slow_down") {
      intervalSeconds += 5;
      continue;
    }

    if (response.error === "expired_token") {
      throw new Error("GitHub authentication timed out. Please try again.");
    }

    if (response.error === "access_denied") {
      throw new Error("GitHub authentication was cancelled or denied.");
    }

    if (response.error === "incorrect_client_credentials") {
      throw new Error(
        "GitHub OAuth client configuration is invalid. Set a valid GITHUB_OAUTH_CLIENT_ID for Celtrix."
      );
    }

    throw new Error(response.error_description || "GitHub authentication failed.");
  }

  throw new Error("GitHub authentication timed out. Please try again.");
}

/**
 * Starts the GitHub OAuth device flow and returns an access token.
 *
 * @returns {Promise<string>}
 */
async function authenticateWithGitHub() {
  const deviceCode = await requestDeviceCode();

  console.log(chalk.cyan("\nAuthorize Celtrix with GitHub"));
  console.log(chalk.gray("Open this URL in your browser:"));
  console.log(chalk.blue(deviceCode.verification_uri));
  console.log(chalk.gray("\nEnter this code:"));
  console.log(chalk.bold.yellow(`${deviceCode.user_code}\n`));

  const spinner = ora("Waiting for GitHub authorization...").start();

  try {
    const accessToken = await pollForAccessToken(deviceCode);
    spinner.succeed("GitHub authentication completed.");
    return accessToken;
  } catch (error) {
    spinner.fail("GitHub authentication failed.");
    throw error;
  }
}

/**
 * Prompts for repository details after authentication succeeds.
 *
 * @param {string} projectName - Default repository name.
 * @returns {Promise<{name: string, description: string, private: boolean} | null>}
 */
async function promptForRepositoryDetails(projectName) {
  try {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "name",
        message: "Repository name:",
        default: projectName,
        filter: (value) => value.trim(),
        validate: (value) =>
          value.trim() ? true : chalk.red("Repository name cannot be empty."),
      },
      {
        type: "list",
        name: "visibility",
        message: "Repository visibility:",
        choices: [
          { name: "Public", value: "public" },
          { name: "Private", value: "private" },
        ],
        default: "public",
      },
      {
        type: "input",
        name: "description",
        message: "Repository description (optional):",
        filter: (value) => value.trim(),
      },
    ]);

    return {
      name: answers.name,
      description: answers.description,
      private: answers.visibility === "private",
    };
  } catch (error) {
    if (isPromptCancellation(error)) {
      return null;
    }

    throw error;
  }
}

/**
 * Converts GitHub API responses into user-friendly error messages.
 *
 * @param {number} status - HTTP status code.
 * @param {any} payload - Parsed GitHub response.
 * @returns {string}
 */
function getRepositoryErrorMessage(status, payload) {
  const message = payload?.message || "GitHub repository creation failed.";

  if (status === 401) {
    return "Your GitHub session is invalid or expired. Please authenticate again.";
  }

  if (status === 403) {
    return "GitHub denied the request. Make sure the OAuth app has the required repository permissions.";
  }

  if (
    status === 422 &&
    (message.toLowerCase().includes("already exists") ||
      payload?.errors?.some(
        (error) =>
          typeof error?.message === "string" &&
          error.message.toLowerCase().includes("already exists")
      ))
  ) {
    return "A repository with that name already exists on your GitHub account. Try a different name.";
  }

  return message;
}

/**
 * Creates a repository for the authenticated user.
 *
 * @param {string} accessToken - OAuth access token.
 * @param {{name: string, description: string, private: boolean}} repository - Repository details.
 * @returns {Promise<{html_url: string, clone_url: string}>}
 */
async function createRepository(accessToken, repository) {
  const response = await fetch(GITHUB_CREATE_REPO_URL, {
    method: "POST",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
      "User-Agent": "Celtrix-CLI",
      "X-GitHub-Api-Version": "2022-11-28",
    },
    body: JSON.stringify(repository),
  });

  const text = await response.text();
  let payload = {};

  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { message: text };
  }

  if (!response.ok) {
    throw new Error(getRepositoryErrorMessage(response.status, payload));
  }

  return payload;
}

/**
 * Normalizes fetch/network failures into clean CLI messages.
 *
 * @param {unknown} error - Thrown error.
 * @returns {Error}
 */
function normalizeNetworkError(error) {
  if (
    error instanceof Error &&
    ("code" in error &&
      ["ENOTFOUND", "ECONNREFUSED", "ECONNRESET", "ETIMEDOUT", "EAI_AGAIN"].includes(
        error.code
      ))
  ) {
    return new Error("Unable to reach GitHub right now. Please check your internet connection and try again.");
  }

  if (error instanceof Error) {
    return error;
  }

  return new Error("GitHub repository creation failed.");
}

/**
 * Returns true when the project already has a git repository.
 *
 * @param {string} projectPath - Absolute project path.
 * @returns {boolean}
 */
function hasGitRepository(projectPath) {
  return existsSync(path.join(projectPath, ".git"));
}

/**
 * Prints manual git steps when automatic git setup cannot be completed.
 *
 * @param {string} projectName - Project directory name.
 * @param {string} cloneUrl - Repository clone URL.
 * @returns {void}
 */
function printManualGitSteps(projectName, cloneUrl) {
  console.log(chalk.gray("You can finish the git setup manually with:"));
  console.log(chalk.cyan(`cd ${projectName}`));
  console.log(chalk.cyan("git init"));
  console.log(chalk.cyan("git add ."));
  console.log(chalk.cyan(`git commit -m "${INITIAL_COMMIT_MESSAGE}"`));
  console.log(chalk.cyan("git branch -M main"));
  console.log(chalk.cyan(`git remote add origin ${cloneUrl}`));
  console.log(chalk.cyan("git push -u origin main\n"));
}

/**
 * Connects the scaffolded local project to the newly created GitHub repository
 * and sets upstream tracking on the first push.
 *
 * @param {string} projectName - Project directory name.
 * @param {string} cloneUrl - Remote repository clone URL.
 * @returns {Promise<boolean>}
 */
async function setupLocalGitTracking(projectName, cloneUrl) {
  const projectPath = path.join(process.cwd(), projectName);

  if (!existsSync(projectPath)) {
    throw new Error("Project directory was not found after scaffolding.");
  }

  const spinner = ora("Linking local project to the new GitHub repository...").start();

  try {
    await runGitCommand(["--version"], projectPath);

    if (!hasGitRepository(projectPath)) {
      await runGitCommand(["init"], projectPath);
    }

    await runGitCommand(["add", "."], projectPath);

    try {
      await runGitCommand(["commit", "-m", INITIAL_COMMIT_MESSAGE], projectPath);
    } catch (error) {
      const message =
        error instanceof Error ? error.message.toLowerCase() : "";

      if (
        !message.includes("nothing to commit") &&
        !message.includes("nothing added to commit")
      ) {
        throw error;
      }
    }

    await runGitCommand(["branch", "-M", "main"], projectPath);

    try {
      await runGitCommand(["remote", "add", "origin", cloneUrl], projectPath);
    } catch (error) {
      const message =
        error instanceof Error ? error.message.toLowerCase() : "";

      if (message.includes("remote origin already exists")) {
        await runGitCommand(["remote", "set-url", "origin", cloneUrl], projectPath);
      } else {
        throw error;
      }
    }

    spinner.stop();
    console.log(chalk.gray("Pushing initial commit to GitHub..."));
    await runGitCommand(["push", "-u", "origin", "main"], projectPath, "inherit");

    console.log(chalk.green("Local git repo linked and tracking origin/main.\n"));
    return true;
  } catch (error) {
    if (spinner.isSpinning) {
      spinner.fail("Automatic git setup could not be completed.");
    } else {
      console.log(chalk.yellow("Automatic git setup could not be completed.\n"));
    }

    const message =
      error instanceof Error
        ? error.message
        : "Unable to finish the local git setup automatically.";

    console.log(chalk.yellow(`${message}\n`));
    printManualGitSteps(projectName, cloneUrl);
    return false;
  }
}

/**
 * Authenticates the user with GitHub OAuth Device Flow and creates a repository.
 *
 * @param {string} projectName - Project name used as the default repository name.
 * @returns {Promise<{html_url: string, clone_url: string} | null>}
 */
export async function createGithubRepo(projectName) {
  try {
    const accessToken = await authenticateWithGitHub();
    const repository = await promptForRepositoryDetails(projectName);

    if (!repository) {
      console.log(chalk.yellow("\nGitHub repository creation cancelled.\n"));
      return null;
    }

    const spinner = ora("Creating GitHub repository...").start();

    try {
      const createdRepository = await createRepository(accessToken, repository);
      spinner.succeed("GitHub repository created successfully.");

      console.log(chalk.green(`\nRepository URL: ${createdRepository.html_url}`));
      await setupLocalGitTracking(projectName, createdRepository.clone_url);

      return createdRepository;
    } catch (error) {
      spinner.fail("GitHub repository creation failed.");
      throw error;
    }
  } catch (error) {
    if (isPromptCancellation(error)) {
      console.log(chalk.yellow("\nGitHub repository creation cancelled.\n"));
      return null;
    }

    const message = normalizeNetworkError(error).message;
    console.log(chalk.red(`\n❌ ${message}\n`));
    return null;
  }
}
