# Celtrix GitHub Workflows

This document explains the automated and manual workflows that power Celtrix's duplicate issue detection, database management, and API validation systems. Read this before running any workflow manually, especially operations that modify or delete data.

---

## Table of Contents

- [Overview](#overview)
- [Workflow 1 - Duplicate Issue Management](#workflow-1---duplicate-issue-management)
- [Workflow 2 - Database Operations](#workflow-2---database-operations)
- [Workflow 3 - API Validation](#workflow-3---api-validation)
- [Recommended Workflow Order](#recommended-workflow-order)
- [Local npm Commands](#local-npm-commands)
- [Required Secrets](#required-secrets)
- [Safety Rules](#safety-rules)
- [Troubleshooting](#troubleshooting)
- [Best Practices](#best-practices)

---

## Overview

Celtrix uses three GitHub Actions workflows to maintain a healthy issue tracker and vector database. These workflows are designed to:

- Automatically detect and flag duplicate issues as they are opened.
- Allow maintainers to manage the Pinecone vector database through manual triggers.
- Validate API connections before running database operations.

Each workflow is isolated by responsibility. API validation, database operations, and duplicate detection are separate concerns and run independently.

---

## Workflow 1 - Duplicate Issue Management

**File:** `.github/workflows/duplicate-issue.yml`

This workflow runs automatically whenever an issue is opened, edited, or reopened. It checks the new issue against the Pinecone vector database to identify semantic duplicates and labels or comments accordingly.

**Automatic triggers:**
- Issue opened
- Issue edited
- Issue reopened
- Issue closed (triggers cleanup of the corresponding vector)

**Manual trigger:**

You can also run this workflow manually to check a specific issue number for duplicates without waiting for an automatic event.

**How to run manually:**
1. Go to the **Actions** tab in the repository.
2. Select **Duplicate Issue Management**.
3. Click **Run workflow**.
4. Enter the issue number you want to check.
5. Click **Run workflow**.

---

## Workflow 2 - Database Operations

**File:** `.github/workflows/database-operations.yml`

This workflow handles all direct operations on the Pinecone vector database. It is manual-only and requires deliberate input before any destructive operations can run.

**Available operations:**

| Operation | Description |
|---|---|
| Populate Issues | Adds all existing GitHub issues to the Pinecone database. Skips issues that already exist. |
| Cleanup Duplicates | Removes duplicate vectors from the database. Requires the force flag. |
| Debug Database | Displays current database contents and health statistics. Safe to run at any time. |
| Clear All Vectors | Deletes all vectors from the database. Irreversible. Requires the force flag. |

**How to run:**
1. Go to the **Actions** tab.
2. Select **Database Operations**.
3. Click **Run workflow**.
4. Choose your operation from the dropdown.
5. Enable the force flag if your operation requires it.
6. Click **Run workflow**.

Always run **API Validation** before running database operations to confirm all connections are healthy.

---

## Workflow 3 - API Validation

**File:** `.github/workflows/api-validation.yml`

This workflow tests API connections without modifying any data. Run this first before any database operation to confirm that Pinecone, GitHub, and Gemini APIs are all reachable and correctly configured.

**Validation scopes:**

| Scope | What It Tests |
|---|---|
| All APIs | Tests Pinecone, GitHub, and Gemini connections together |
| Pinecone Only | Tests only the Pinecone database connection |
| GitHub Only | Tests only the GitHub API connection |
| Gemini Only | Tests only the Gemini AI API connection |

**How to run:**
1. Go to the **Actions** tab.
2. Select **API Validation**.
3. Click **Run workflow**.
4. Choose your validation scope.
5. Click **Run workflow**.

---

## Recommended Workflow Order

For any database-related task, follow this sequence:

1. Run **API Validation** with scope set to `all-apis`.
2. Confirm all connections pass.
3. Run **Database Operations** with your intended operation.
4. Use **Debug Database** after the operation to verify the result.

For routine maintenance:

1. Run **Debug Database** to check current health.
2. Run **Cleanup Duplicates** (with force flag) if duplicates are detected.
3. Run **Debug Database** again to confirm the cleanup result.

---

## Local npm Commands

All workflows can also be triggered locally using the following npm commands. These are useful for development, debugging, and running operations without going through GitHub Actions.

```bash
# API Validation
npm run validate               # Test all API connections
npm run validate:pinecone      # Test only Pinecone connection
npm run validate:github        # Test only GitHub connection
npm run validate:gemini        # Test only Gemini API connection

# Safe database operations
npm run populate-issues        # Add existing issues to the database
npm run debug-db               # View database contents and statistics
npm run check-duplicates       # Check for duplicate vectors

# Cleanup operations
npm run cleanup-duplicates --force    # Remove duplicate vectors
npm run cleanup-issue                 # Remove a specific closed issue from the database

# Destructive operations - use with caution
npm run clear-all:force              # Delete all vectors from the database
```

---

## Required Secrets

These secrets must be configured in your repository settings under **Settings > Secrets and variables > Actions** before any workflow can run successfully.

| Secret | Description |
|---|---|
| `GITHUB_TOKEN` | Automatically provided by GitHub Actions. No manual setup required. |
| `GEMINI_API_KEY` | Your Google Gemini API key. |
| `PINECONE_API_KEY` | Your Pinecone API key. |
| `PINECONE_INDEX` | The name of your Pinecone index. |

If a workflow fails immediately, check that all secrets are present and correctly named.

---

## Safety Rules

The following rules apply to all database operations and must be respected by all contributors and maintainers.

**Force flag required for destructive operations.** Cleanup Duplicates and Clear All Vectors will not execute unless the force flag is explicitly enabled. This is intentional and cannot be bypassed.

**Debug before you delete.** Always run Debug Database before running any cleanup or clear operation. Understand the current state of the database before modifying it.

**Clear All Vectors is irreversible.** Once executed, all vectors are permanently deleted. The database can be repopulated from GitHub issues, but any data not sourced from issues will be lost.

**Test in isolation.** If you are testing a workflow change, run it against a development environment or a test index before running it against production data.

**API rate limits.** If a workflow fails due to rate limiting, wait a few minutes and retry. Do not run multiple database operations in rapid succession.

---

## Troubleshooting

**Workflow fails immediately with an authentication error.**
Check that all required secrets are present in repository settings and that secret names match exactly.

**API connection test fails.**
Verify that your API keys are valid and have not expired. Check the Pinecone dashboard and Google Cloud console for key status.

**Populate Issues skips all issues.**
This is expected behavior if all issues are already present in the database. Run Debug Database to confirm.

**Duplicate detection is not triggering on new issues.**
Check that the `duplicate-issue.yml` workflow is enabled in the Actions tab and that the Pinecone index contains existing issues. Run Populate Issues if the database is empty.

**Clear All Vectors ran but issues are still appearing.**
The duplicate detection workflow will re-add issues to the database as they are opened or edited. Clearing vectors only removes the stored embeddings - it does not affect GitHub issues themselves.

If you encounter an issue not covered here, open a GitHub Discussion or ask in the Discord server.

---

## Best Practices

**Before any database operation,** run API Validation to confirm all connections are healthy.

**After any database operation,** run Debug Database to verify the result matches your expectation.

**Run Populate Issues** after a large batch of new issues are opened to keep the database current and improve duplicate detection accuracy.

**Run Cleanup Duplicates periodically** - monthly is sufficient for most repositories - to keep the database lean and accurate.

**Keep your API keys rotated** on a regular schedule. Update repository secrets immediately after rotating keys.

**Never share API keys** in issues, pull requests, or public channels. If a key is accidentally exposed, revoke it immediately and generate a new one.
