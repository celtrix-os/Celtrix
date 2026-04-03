# Contributing to Celtrix

Thank you for taking the time to contribute to Celtrix. This guide covers everything you need to know - from reporting your first bug to adding a new stack template. Read through it once before you start, and refer back to specific sections as needed.

---

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How Celtrix Works Internally](#how-celtrix-works-internally)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Submitting Pull Requests](#submitting-pull-requests)
- [Development Setup](#development-setup)
- [Running the CLI Locally](#running-the-cli-locally)
- [Project Structure](#project-structure)
- [How Templates Are Structured](#how-templates-are-structured)
- [How to Add a New Stack](#how-to-add-a-new-stack)
- [Your First Pull Request](#your-first-pull-request)
- [Coding Guidelines](#coding-guidelines)
- [Community and Support](#community-and-support)

---

## Code of Conduct

This project follows a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold it. Report unacceptable behavior to the maintainers directly.

---

## How Celtrix Works Internally

Before making changes, it helps to understand how the tool is structured at a high level.

When a developer runs `npx celtrix my-app`, the CLI does the following:

1. **Entry point** - `index.js` starts the process and routes the command.
2. **Command handler** - The relevant command file inside `commands/` handles the user's input, collects choices through prompts, and orchestrates the generation.
3. **Template resolution** - Based on the selected stack, the corresponding template folder inside `templates/` is identified.
4. **File generation** - Template files are copied into the new project directory. Utility functions in `utils/` handle tasks like dependency installation, logging, and environment file creation.
5. **Post-setup** - Dependencies are installed, a project-specific `README.md` is generated, and the success summary is printed to the terminal.

Understanding this flow will help you identify where to make changes depending on what you want to contribute.

---

## How to Contribute

### Reporting Bugs

Before opening a bug report, search the [existing issues](https://github.com/celtrix-os/Celtrix/issues) to check if it has already been reported.

When opening a new bug report, include the following:

- **Title** - A short, specific description of the problem.
- **Steps to reproduce** - The exact commands or actions that trigger the issue.
- **Expected behavior** - What you expected to happen.
- **Actual behavior** - What actually happened.
- **Environment** - Your operating system, Node.js version, and npm/pnpm version.
- **Logs or screenshots** - Paste relevant terminal output if applicable.

The more detail you include, the faster the issue can be diagnosed and resolved.

---

### Suggesting Enhancements

Feature suggestions are welcome. Before opening a request, check whether the idea has already been discussed.

When submitting a feature suggestion, include:

- The problem you are trying to solve or the use case you have in mind.
- Your proposed solution or approach.
- Any alternative approaches you considered.
- References or examples from other tools if relevant.

---

### Submitting Pull Requests

1. **Fork** the repository and clone your fork locally.
2. **Create a new branch** for your change:

```bash
git checkout -b feat/your-feature-name
# or
git checkout -b fix/issue-description
```

3. **Make your changes** and write clear, focused commits.
4. **Test your changes** locally using the steps in the [Running the CLI Locally](#running-the-cli-locally) section.
5. **Push** your branch to your fork.
6. **Open a Pull Request** against the `main` branch.

Your PR description should include:

- A clear summary of what the change does and why it is needed.
- Reference to the related issue, if applicable (e.g., `Closes #123`).
- Steps to test the change manually.
- Notes on any breaking changes or side effects.

All pull requests are reviewed within 48 hours. You may be asked to make adjustments before the PR is merged.

---

## Development Setup

Clone the repository and install dependencies:

```bash
git clone https://github.com/celtrix-os/Celtrix.git
cd Celtrix
npm install
```

---

## Running the CLI Locally

To test the CLI against your local changes without publishing a release:

```bash
node index.js my-test-app
```

This runs the CLI entry point directly. You can scaffold a test project and verify that your changes behave correctly end to end.

For a faster feedback loop when working on specific commands or utilities, you can also run:

```bash
npm run dev:cli
```

This mode lets you test the CLI locally with live changes.

Always verify that generated projects install dependencies and start the development server without errors before submitting your PR.

---

## Project Structure

```
index.js          Main entry point - starts the CLI and routes commands
bin/              CLI executable scripts
commands/         Command handlers - scaffold logic, prompt orchestration
templates/        Project templates organized by stack
utils/            Shared utilities - installer, logger, env file generation, project setup
tests/            Test cases and validation scripts
scripts/          Automation and maintenance scripts
```

---

## How Templates Are Structured

Each stack has its own folder inside `templates/`. The structure follows a consistent convention:

```
templates/
  mern/
    client/         Frontend source files
    server/         Backend source files
    config/         Configuration files
    .env.example    Environment variable template
    README.md       Project-specific README template
  next/
    ...
```

Template files use placeholder variables that are replaced during generation. These variables are resolved by the utility functions in `utils/` at scaffold time.

When adding or modifying templates:

- Follow the existing directory and naming conventions.
- Ensure the `.env.example` file includes all required environment variables with descriptions.
- Ensure the `README.md` template includes run instructions, env variable explanations, and deployment steps.
- Test the template end to end using the local CLI before submitting.

---

## How to Add a New Stack

To add support for a new stack, follow these steps:

1. Create a new folder inside `templates/` named after your stack (e.g., `templates/remix/`).
2. Add the required project files following the structure described above.
3. Register the new stack in the prompt configuration inside the relevant file in `commands/`.
4. Add a test case in `tests/` that scaffolds a project using the new stack and verifies it runs without errors.
5. Update the stack table in `README.md` and the relevant documentation.
6. Open a PR with a description of the stack, when it should be used, and how it was tested.

If you are unsure whether a particular stack is a good fit for Celtrix, open an issue or a discussion thread before investing time in the implementation.

---

## Your First Pull Request

If this is your first contribution to Celtrix, here is a straightforward path to get started:

1. Look for issues tagged `good first issue` - these are specifically chosen for new contributors.
2. Comment on the issue to let the team know you are working on it.
3. Fork the repo, clone it, and follow the development setup above.
4. Make your change, test it locally, and open a PR.
5. Respond to any review feedback and iterate if needed.

The team will guide you through the process if you get stuck at any point.

---

## Coding Guidelines

- Write clear, descriptive commit messages. Use the imperative form: `Add dry-run flag`, `Fix template resolution for MEVN`, `Update contributing guide`.
- Follow the existing code style. ESLint is configured - run `npm run lint` before submitting.
- Keep pull requests focused. One change per PR is easier to review and faster to merge.
- Add or update tests for any new features or bug fixes.
- Document any new CLI flags, commands, or configuration options.

---

## Common Git Commands

```bash
# Fork and clone
git clone https://github.com/your-username/Celtrix.git

# Create a new branch
git checkout -b feat/your-feature-name

# Check status
git status

# Stage and commit
git add .
git commit -m "Add a clear, descriptive commit message"

# Pull latest changes from main
git pull origin main

# Push your branch
git push origin feat/your-feature-name

# Rebase to keep your branch up to date
git fetch origin
git rebase origin/main
```

---

## Community and Support

- Join the [Discord server](https://discord.gg/GkDcAErQbD) to ask questions and connect with other contributors.
- Open a [GitHub Discussion](https://github.com/celtrix-os/Celtrix/discussions) for broader conversations about the project direction.
- Browse the public roadmap to understand where the project is headed and find areas where your contribution would have the most impact.

Thank you for contributing to Celtrix.
