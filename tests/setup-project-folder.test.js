import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { test } from "node:test";
import { askProjectName, handleFolderConflict } from "../prompts/user/projectName.js";
import { setupProject } from "../utils/project.js";

// Helper to create a temporary test directory
function createTempDir(prefix = "celtrix-test-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

// ─── Case 1: Empty project name (Enter) ──────────────────────────────────────

test("Case 1: pressing Enter with an empty project name resolves to '.'", async () => {
  const tempDir = createTempDir();
  try {
    const mockPrompt = async ([q]) => {
      assert.equal(q.name, "projectName");
      // Test validate allows empty input
      assert.equal(q.validate(""), true);
      assert.equal(q.validate("   "), true);
      assert.equal(q.validate("."), true);
      return { projectName: "" };
    };

    const result = await askProjectName({ prompt: mockPrompt, cwd: tempDir });
    assert.equal(result, ".");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("Case 1: whitespace input resolves to '.'", async () => {
  const tempDir = createTempDir();
  try {
    const mockPrompt = async ([q]) => {
      return { projectName: "   " };
    };

    const result = await askProjectName({ prompt: mockPrompt, cwd: tempDir });
    assert.equal(result, ".");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("Case 1: setupProject into '.' does not error when current directory is not empty and preserves files", async () => {
  const tempDir = createTempDir();
  const originalCwd = process.cwd();
  try {
    // Populate tempDir with an existing user file
    const existingFile = path.join(tempDir, "existing-user-code.txt");
    fs.writeFileSync(existingFile, "IMPORTANT USER WORK");

    process.chdir(tempDir);

    // Run setupProject with minimal config without throwing non-empty error
    // Using a custom config with no deps to test scaffolding without network
    const config = {
      stack: "custom",
      language: "typescript",
      frontend: "none",
      backend: "none",
      database: { type: "none" },
      orm: "none",
      runtime: "node",
      packageManager: "npm",
      projectName: ".",
    };

    await setupProject(".", config, false);

    // Verify existing file is preserved and not overwritten or deleted
    assert.ok(fs.existsSync(existingFile));
    assert.equal(fs.readFileSync(existingFile, "utf8"), "IMPORTANT USER WORK");
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

// ─── Case 2: New project name that does not exist ────────────────────────────

test("Case 2: a project name that does not exist is returned directly without prompts", async () => {
  const tempDir = createTempDir();
  try {
    let promptCount = 0;
    const mockPrompt = async ([q]) => {
      promptCount++;
      return { projectName: "brand-new-project" };
    };

    const result = await askProjectName({ prompt: mockPrompt, cwd: tempDir });
    assert.equal(result, "brand-new-project");
    assert.equal(promptCount, 1); // Only the initial project name question
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("Case 2: validation rejects invalid folder characters but accepts valid ones", async () => {
  let capturedValidator;
  const mockPrompt = async ([q]) => {
    capturedValidator = q.validate;
    return { projectName: "valid-name_123" };
  };

  await askProjectName({ prompt: mockPrompt, cwd: os.tmpdir() });
  assert.ok(capturedValidator);
  assert.equal(capturedValidator("valid-name_123"), true);
  assert.equal(capturedValidator("another_app-2"), true);
  // Invalid characters
  assert.notEqual(capturedValidator("invalid name"), true);
  assert.notEqual(capturedValidator("invalid/name"), true);
  assert.notEqual(capturedValidator("invalid*name"), true);
});

// ─── Case 3: Project name that already exists ────────────────────────────────

test("Case 3 Option A: choosing 'Use the existing folder' confirms and returns folder name", async () => {
  const tempDir = createTempDir();
  try {
    // Create existing directory
    const existingDirName = "my-existing-app";
    fs.mkdirSync(path.join(tempDir, existingDirName));

    const promptCalls = [];
    const mockPrompt = async ([q]) => {
      promptCalls.push(q.name);
      if (q.name === "projectName") {
        return { projectName: existingDirName };
      }
      if (q.name === "action") {
        assert.equal(q.type, "list");
        assert.equal(q.message, "How would you like to proceed?");
        assert.ok(q.choices.some(c => c.value === "use-existing" && c.name === "Use the existing folder"));
        assert.ok(q.choices.some(c => c.value === "different-name" && c.name === "Create another folder with the same name"));
        assert.ok(q.choices.some(c => c.value === "cancel" && c.name === "Cancel setup"));
        return { action: "use-existing" };
      }
      if (q.name === "confirmUse") {
        assert.equal(q.type, "confirm");
        assert.ok(q.message.includes(existingDirName));
        return { confirmUse: true };
      }
      throw new Error(`Unexpected prompt: ${q.name}`);
    };

    const result = await askProjectName({ prompt: mockPrompt, cwd: tempDir });
    assert.equal(result, existingDirName);
    assert.deepEqual(promptCalls, ["projectName", "action", "confirmUse"]);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("Case 3 Option A: declining confirmation re-prompts the action menu", async () => {
  const tempDir = createTempDir();
  try {
    const existingDirName = "my-existing-app";
    fs.mkdirSync(path.join(tempDir, existingDirName));

    let actionCallCount = 0;
    const promptCalls = [];
    const mockPrompt = async ([q]) => {
      promptCalls.push(q.name);
      if (q.name === "projectName") {
        return { projectName: existingDirName };
      }
      if (q.name === "action") {
        actionCallCount++;
        if (actionCallCount === 1) {
          return { action: "use-existing" };
        }
        return { action: "use-existing" };
      }
      if (q.name === "confirmUse") {
        if (actionCallCount === 1) {
          // First time, decline confirmation
          return { confirmUse: false };
        }
        // Second time, accept confirmation
        return { confirmUse: true };
      }
      throw new Error(`Unexpected prompt: ${q.name}`);
    };

    const result = await askProjectName({ prompt: mockPrompt, cwd: tempDir });
    assert.equal(result, existingDirName);
    assert.deepEqual(promptCalls, ["projectName", "action", "confirmUse", "action", "confirmUse"]);
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("Case 3 Option A: setupProject inside existing directory does not create nested directories and preserves files", async () => {
  const tempDir = createTempDir();
  const originalCwd = process.cwd();
  try {
    const appDir = path.join(tempDir, "existing-app");
    fs.mkdirSync(appDir);
    const existingFile = path.join(appDir, "preserved.txt");
    fs.writeFileSync(existingFile, "KEEP THIS");

    process.chdir(tempDir);

    const config = {
      stack: "custom",
      language: "typescript",
      frontend: "none",
      backend: "none",
      database: { type: "none" },
      orm: "none",
      runtime: "node",
      packageManager: "npm",
      projectName: "existing-app",
    };

    await setupProject("existing-app", config, false);

    // Verify existing file is preserved
    assert.ok(fs.existsSync(existingFile));
    assert.equal(fs.readFileSync(existingFile, "utf8"), "KEEP THIS");

    // Verify no nested folder "existing-app/existing-app" was created
    assert.equal(fs.existsSync(path.join(appDir, "existing-app")), false);
  } finally {
    process.chdir(originalCwd);
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("Case 3 Option B: 'Create another folder with the same name' prompts for new name and handles repeated conflicts", async () => {
  const tempDir = createTempDir();
  try {
    // Directories that exist
    fs.mkdirSync(path.join(tempDir, "initial-app"));
    fs.mkdirSync(path.join(tempDir, "second-app"));

    const promptCalls = [];
    const mockPrompt = async ([q]) => {
      promptCalls.push(q.name);
      if (q.name === "projectName") {
        return { projectName: "initial-app" };
      }
      if (q.name === "action") {
        return { action: "different-name" };
      }
      if (q.name === "newName") {
        // First attempt: enter "second-app" which also exists!
        if (!promptCalls.includes("first-try-done")) {
          promptCalls.push("first-try-done");
          return { newName: "second-app" };
        }
        // Second attempt: enter "third-app" which does not exist
        return { newName: "third-app" };
      }
      throw new Error(`Unexpected prompt: ${q.name}`);
    };

    const result = await askProjectName({ prompt: mockPrompt, cwd: tempDir });
    assert.equal(result, "third-app");
    // Sequence: projectName -> conflict on initial-app -> action -> newName (second-app)
    // -> conflict on second-app -> action -> newName (third-app) -> success!
    assert.ok(promptCalls.includes("initial-app") || promptCalls.includes("projectName"));
    assert.ok(promptCalls.includes("action"));
    assert.ok(promptCalls.includes("newName"));
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

test("Case 3 Option C: 'Cancel setup' stops cleanly without modifying files", async () => {
  const tempDir = createTempDir();
  try {
    fs.mkdirSync(path.join(tempDir, "my-app"));
    const canary = path.join(tempDir, "my-app", "canary.txt");
    fs.writeFileSync(canary, "DO NOT TOUCH");

    let cancelCalled = false;
    const mockPrompt = async ([q]) => {
      if (q.name === "projectName") {
        return { projectName: "my-app" };
      }
      if (q.name === "action") {
        return { action: "cancel" };
      }
      throw new Error(`Unexpected prompt: ${q.name}`);
    };

    const result = await askProjectName({
      prompt: mockPrompt,
      cwd: tempDir,
      onCancel: () => {
        cancelCalled = true;
        return "CANCELLED";
      },
    });

    assert.equal(cancelCalled, true);
    assert.equal(result, "CANCELLED");
    // Verify files were not modified
    assert.ok(fs.existsSync(canary));
    assert.equal(fs.readFileSync(canary, "utf8"), "DO NOT TOUCH");
  } finally {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
});

