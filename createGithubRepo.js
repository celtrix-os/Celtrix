import fs from "fs/promises";
import { existsSync } from "fs";
import os from "os";
import path from "path";
import inquirer from "inquirer";
import chalk from "chalk";
import ora from "ora";
import fetch from "node-fetch";
import dotenv from "dotenv";

const GITHUB_REPOS_API_URL = "https://api.github.com/user/repos";
const GITHUB_TOKEN_HELP_URL =
  "https://github.com/settings/tokens/new?scopes=repo&description=Celtrix%20CLI";

/**
 * Returns the path where Celtrix stores its reusable environment variables.
 *
 * @returns {string} Absolute path to the Celtrix environment file.
 */
function getCeltrixEnvPath() {
  return path.join(os.homedir(), ".celtrix", ".env");
}

/**
 * Checks whether an error was caused by the user cancelling an inquirer prompt.
 *
 * @param {unknown} error - The thrown prompt error.
 * @returns {boolean} True when the prompt was cancelled with Ctrl+C.
 */
function isPromptCancellation(error) {
  return (
    error instanceof Error &&
    (error.name === "ExitPromptError" ||
      error.message.toLowerCase().includes("force closed"))
  );
}

/**
 * Loads a GitHub token from the current environment, local .env, or Celtrix's
 * reusable home directory .env file.
 *
 * @returns {string} The resolved GitHub token or an empty string.
 */
function loadGithubToken() {
  dotenv.config();

  if (process.env.GITHUB_TOKEN?.trim()) {
    return process.env.GITHUB_TOKEN.trim();
  }

  const celtrixEnvPath = getCeltrixEnvPath();

  if (existsSync(celtrixEnvPath)) {
    dotenv.config({ path: celtrixEnvPath });
  }

  return process.env.GITHUB_TOKEN?.trim() || "";
}

/**
 * Prompts the user for repository details.
 *
 * @param {string} projectName - The scaffolded project name.
 * @returns {Promise<{repoName: string, visibility: "public" | "private", description: string} | null>}
 * Repository details for the GitHub API request, or null when cancelled.
 */
async function promptForRepositoryDetails(projectName) {
  try {
    const answers = await inquirer.prompt([
      {
        type: "input",
        name: "repoName",
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

    return answers;
  } catch (error) {
    if (isPromptCancellation(error)) {
      return null;
    }

    throw error;
  }
}

/**
 * Prompts the user to enter a GitHub Personal Access Token.
 *
 * @returns {Promise<string|null>} The token entered by the user, or null if they cancel.
 */
async function promptForGithubToken() {
  try {
    const { githubToken } = await inquirer.prompt([
      {
        type: "password",
        name: "githubToken",
        message: "Enter your GitHub Personal Access Token:",
        mask: "*",
        filter: (value) => value.trim(),
        validate: (value) =>
          value.trim() ? true : chalk.red("GitHub token cannot be empty."),
      },
    ]);

    return githubToken;
  } catch (error) {
    if (isPromptCancellation(error)) {
      return null;
    }

    throw error;
  }
}

/**
 * Prompts the user to decide whether the token should be persisted for future runs.
 *
 * @param {string} envFilePath - The destination .env file path.
 * @returns {Promise<boolean>} True when the token should be saved.
 */
async function promptToSaveToken(envFilePath) {
  try {
    const { shouldSaveToken } = await inquirer.prompt([
      {
        type: "confirm",
        name: "shouldSaveToken",
        message: `Save your GitHub token to ${envFilePath} for future use?`,
        default: true,
      },
    ]);

    return shouldSaveToken;
  } catch (error) {
    if (isPromptCancellation(error)) {
      return false;
    }

    throw error;
  }
}

/**
 * Writes or updates GITHUB_TOKEN in Celtrix's .env file.
 *
 * @param {string} envFilePath - The destination .env file path.
 * @param {string} token - The GitHub token to persist.
 * @returns {Promise<void>}
 */
async function saveGithubToken(envFilePath, token) {
  try {
    await fs.mkdir(path.dirname(envFilePath), { recursive: true });

    let envContents = "";

    if (existsSync(envFilePath)) {
      envContents = await fs.readFile(envFilePath, "utf8");
    }

    const tokenLine = `GITHUB_TOKEN=${token}`;
    const hasTrailingNewline =
      envContents.length === 0 || envContents.endsWith("\n");

    if (/^GITHUB_TOKEN=.*$/m.test(envContents)) {
      envContents = envContents.replace(/^GITHUB_TOKEN=.*$/m, tokenLine);
    } else if (envContents.length === 0) {
      envContents = `${tokenLine}\n`;
    } else {
      envContents = `${envContents}${hasTrailingNewline ? "" : "\n"}${tokenLine}\n`;
    }

    await fs.writeFile(envFilePath, envContents, "utf8");
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown file system error.";
    throw new Error(`Failed to save GitHub token: ${message}`);
  }
}

/**
 * Extracts a friendly message from a GitHub API error response.
 *
 * @param {number} status - The HTTP status code.
 * @param {any} errorData - The parsed GitHub error response body.
 * @returns {string} A user-friendly error message.
 */
function getGithubErrorMessage(status, errorData) {
  const fallbackMessage = errorData?.message || "GitHub repository creation failed.";

  if (status === 401) {
    return `Your GitHub token is invalid or expired. Create a new token here: ${GITHUB_TOKEN_HELP_URL}`;
  }

  if (status === 403) {
    return `GitHub rejected the request. Make sure your token has permission to create repositories. Create one here: ${GITHUB_TOKEN_HELP_URL}`;
  }

  if (
    status === 422 &&
    (fallbackMessage.toLowerCase().includes("already exists") ||
      errorData?.errors?.some(
        (issue) => typeof issue?.message === "string" && issue.message.toLowerCase().includes("already exists")
      ))
  ) {
    return "A repository with that name already exists on your GitHub account. Try a different repository name.";
  }

  return fallbackMessage;
}

/**
 * Creates a GitHub repository using the REST API.
 *
 * @param {string} token - The GitHub Personal Access Token.
 * @param {{repoName: string, visibility: "public" | "private", description: string}} repository
 * Repository details.
 * @returns {Promise<{html_url: string, clone_url: string, full_name: string}>}
 * The created GitHub repository payload.
 */
async function createRepositoryOnGithub(token, repository) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);

  try {
    const response = await fetch(GITHUB_REPOS_API_URL, {
      method: "POST",
      headers: {
        Accept: "application/vnd.github+json",
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
        "User-Agent": "Celtrix-CLI",
        "X-GitHub-Api-Version": "2022-11-28",
      },
      body: JSON.stringify({
        name: repository.repoName,
        description: repository.description,
        private: repository.visibility === "private",
      }),
      signal: controller.signal,
    });

    const responseText = await response.text();
    let responseData = {};

    if (responseText) {
      try {
        responseData = JSON.parse(responseText);
      } catch {
        responseData = { message: responseText };
      }
    }

    if (!response.ok) {
      throw new Error(getGithubErrorMessage(response.status, responseData));
    }

    return responseData;
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error(
        "Unable to reach GitHub. Please check your internet connection and try again."
      );
    }

    if (
      error instanceof Error &&
      ("code" in error &&
        ["ENOTFOUND", "ECONNRESET", "ECONNREFUSED", "ETIMEDOUT", "EAI_AGAIN"].includes(
          error.code
        ))
    ) {
      throw new Error(
        "Unable to reach GitHub. Please check your internet connection and try again."
      );
    }

    if (error instanceof Error) {
      throw error;
    }

    throw new Error("GitHub repository creation failed.");
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Creates a GitHub repository for the scaffolded project.
 *
 * @param {string} projectName - The scaffolded project name.
 * @returns {Promise<{html_url: string, clone_url: string, full_name: string} | null>}
 * The created repository data, or null when skipped/cancelled.
 */
export async function createGithubRepo(projectName) {
  let spinner;

  try {
    const { shouldCreateRepo } = await inquirer.prompt([
      {
        type: "confirm",
        name: "shouldCreateRepo",
        message: "Do you want to create a GitHub repository?",
        default: false,
      },
    ]);

    if (!shouldCreateRepo) {
      return null;
    }

    const repository = await promptForRepositoryDetails(projectName);

    if (!repository) {
      console.log(chalk.yellow("\nGitHub repository creation cancelled.\n"));
      return null;
    }

    let token = loadGithubToken();
    let shouldOfferSave = false;

    if (!token) {
      token = await promptForGithubToken();

      if (!token) {
        console.log(chalk.yellow("\nGitHub repository creation cancelled.\n"));
        return null;
      }

      shouldOfferSave = true;
    }

    spinner = ora("Creating GitHub repository...").start();
    const createdRepository = await createRepositoryOnGithub(token, repository);
    spinner.succeed("GitHub repository created successfully.");

    console.log(chalk.green(`\nRepository URL: ${createdRepository.html_url}`));
    console.log(
      chalk.cyan(`git remote add origin ${createdRepository.clone_url}\n`)
    );

    if (shouldOfferSave) {
      const envFilePath = getCeltrixEnvPath();
      const shouldSaveToken = await promptToSaveToken(envFilePath);

      if (shouldSaveToken) {
        try {
          await saveGithubToken(envFilePath, token);
          console.log(chalk.gray(`Saved GITHUB_TOKEN to ${envFilePath}\n`));
        } catch (saveError) {
          const saveMessage =
            saveError instanceof Error
              ? saveError.message
              : "Failed to save GitHub token.";
          console.log(chalk.yellow(`${saveMessage}\n`));
        }
      }
    }

    return createdRepository;
  } catch (error) {
    if (spinner?.isSpinning) {
      spinner.fail("GitHub repository creation failed.");
    }

    if (isPromptCancellation(error)) {
      console.log(chalk.yellow("\nGitHub repository creation cancelled.\n"));
      return null;
    }

    const message =
      error instanceof Error
        ? error.message
        : "GitHub repository creation failed.";

    console.log(chalk.red(`\n❌ ${message}\n`));
    return null;
  }
}
