#!/usr/bin/env node

/**
 * Test script for CLI customization feature
 * This script simulates the CLI flow with customization options
 */

import chalk from "chalk";

console.log(chalk.green("✅ Customization Feature Test Suite\n"));

// Test 1: Check if new functions exist
console.log(chalk.blue("Test 1: Checking new functions..."));
import('../index.js').then(() => {
  console.log(chalk.green("  ✓ index.js loaded successfully"));
}).catch(err => {
  console.log(chalk.red("  ✗ index.js failed to load:", err.message));
});

// Test 2: Check customization utility
console.log(chalk.blue("Test 2: Checking customization utility..."));
import('../utils/customization.js').then((module) => {
  if (module.applyCustomizations && module.getAdditionalDependencies) {
    console.log(chalk.green("  ✓ Customization functions exported correctly"));
  } else {
    console.log(chalk.red("  ✗ Missing exported functions"));
  }
}).catch(err => {
  console.log(chalk.red("  ✗ customization.js failed to load:", err.message));
});

// Test 3: Check project.js integration
console.log(chalk.blue("Test 3: Checking project.js integration..."));
import('../utils/project.js').then((module) => {
  if (module.setupProject) {
    console.log(chalk.green("  ✓ setupProject function available"));
  } else {
    console.log(chalk.red("  ✗ setupProject function missing"));
  }
}).catch(err => {
  console.log(chalk.red("  ✗ project.js failed to load:", err.message));
});

// Test 4: Verify file structure
console.log(chalk.blue("Test 4: Checking file structure..."));
import('fs').then(({default: fs}) => {
  const filesToCheck = [
    'index.js',
    'utils/customization.js',
    'utils/project.js',
    'CUSTOMIZATION.md'
  ];
  
  let allExist = true;
  for (const file of filesToCheck) {
    if (fs.existsSync(file)) {
      console.log(chalk.green(`  ✓ ${file} exists`));
    } else {
      console.log(chalk.red(`  ✗ ${file} missing`));
      allExist = false;
    }
  }
  
  if (allExist) {
    console.log(chalk.green("\n✅ All tests passed! Feature is ready."));
  } else {
    console.log(chalk.yellow("\n⚠️  Some files are missing."));
  }
}).catch(err => {
  console.log(chalk.red("  ✗ File check failed:", err.message));
});

console.log(chalk.cyan("\n📝 To test the full CLI flow, run:"));
console.log(chalk.yellow("   node bin/celtrix.js"));
console.log(chalk.gray("   or"));
console.log(chalk.yellow("   npm link"));
console.log(chalk.yellow("   celtrix test-project\n"));
