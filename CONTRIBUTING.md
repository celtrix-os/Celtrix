# Contributing to Celtrix

Thank you for your interest in contributing to Celtrix! Your help is greatly appreciated. This guide will help you get started with contributing, reporting issues, and submitting pull requests.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [How to Contribute](#how-to-contribute)
  - [Reporting Bugs](#reporting-bugs)
  - [Suggesting Enhancements](#suggesting-enhancements)
  - [Submitting Pull Requests](#submitting-pull-requests)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Coding Guidelines](#coding-guidelines)
- [Template Contributions](#template-contributions)
- [Community & Support](#community--support)

---

## Code of Conduct

This project adheres to a [Code of Conduct](CODE_OF_CONDUCT.md). By participating, you are expected to uphold this code. Please report unacceptable behavior to the maintainers.

## How to Contribute

### Reporting Bugs or Issues

- Search [issues](https://github.com/celtrix-os/Celtrix/issues) to see if your bug or suggestion is already reported.
- If not, open a new issue and **follow this structure for better understanding:**
  - **Title:** Clear and descriptive
  - **Description:**
    - What is the problem or suggestion?
    - Steps to reproduce (for bugs)
    - Expected behavior
    - Actual behavior
    - Environment (OS, Node version, etc.)
  - **Screenshots or logs:** Attach if possible (for UI/CLI issues)
  - **Additional context:** Any other information that helps

Following this structure helps maintainers and contributors understand and resolve your issue faster.

### Suggesting Enhancements

- Check if your idea is already discussed in [issues](https://github.com/celtrix-os/Celtrix/issues).
- Open a new issue for new suggestions. Please include:
  - Motivation and use case
  - Example scenarios
  - Any relevant code or references

### Submitting Pull Requests

#### Rules for Raising Pull Requests (PRs)

1. **Fork** the repository and clone your fork.
2. **Create a new branch** for your feature or fix:

```sh
git checkout -b feature/your-feature-name
```

3. **Make your changes** and commit them with clear messages.
4. **Test** your changes locally.
5. **Push** to your fork and open a Pull Request (PR) against the `main` branch.
6. **Fill out the PR template and follow these rules:**

- **Add screenshots or videos** (optional but encouraged) to demonstrate UI/CLI changes or bug fixes.
- **Provide a clear description** of what your PR does and how it solves the issue or adds value.
- **Reference related issues** by number (e.g., `Closes #123`).
- **Explain any breaking changes** or important details.
- **Keep PRs focused** on a single feature or fix.

7. Participate in the code review process and make requested changes.

Following these rules helps reviewers understand your contribution and speeds up the merging process.

## Development Setup

1. **Clone the repository:**
   ```sh
   git clone https://github.com/celtrix-os/Celtrix.git
   cd Celtrix
   ```
2. **Install dependencies:**
   ```sh
   npm install
   ```
3. **Run the CLI locally:**
   ```sh
   node index.js
   ```
4. **Test template scaffolding:**
   - Use the CLI to scaffold a new project and verify the output.

## Project Structure

- `index.js` – Main entry point for the CLI.
- `bin/` – CLI executable scripts.
- `commands/` – CLI command handlers (e.g., scaffold logic).
- `prompts/` – Function Modules.
- `templates/` – Preset Project templates.
- `utils/` – Utility modules (installer, logger, project management, etc.).
- `tests/` – Test cases and scripts (Under development).

## Coding Guidelines

- Use clear, descriptive commit messages.
- Follow the existing code style (use Prettier/ESLint if available).
- Write modular, well-documented code.
- Add or update tests for new features or bug fixes.
- Keep PRs focused and minimal.

## Example Git Commands

Here are some common git commands you may find useful when contributing:

- **Clone the repository:**
  ```sh
  git clone https://github.com/celtrix-os/Celtrix.git
  ```
- **Create a new branch:**
  ```sh
  git checkout -b feature/your-feature-name
  ```
- **Check status of your changes:**
  ```sh
  git status
  ```
- **Stage files for commit:**
  ```sh
  git add .
  # or add specific files
  git add path/to/file.js
  ```
- **Commit your changes:**
  ```sh
  git commit -m "Add a clear, descriptive commit message"
  ```
- **Pull latest changes from main branch:**
  ```sh
  git pull origin main
  ```
- **Push your branch to your fork:**
  ```sh
  git push origin feature/your-feature-name
  ```
- **Fetch and rebase (to update your branch):**
  ```sh
  git fetch origin
  git rebase origin/main
  ```

---

## Community & Support

- For questions, open a [discussion](https://github.com/celtrix-os/Celtrix/discussions) or join the community chat (if available).
- Be respectful and constructive in all communications.

---

Thank you for helping make Celtrix better!
