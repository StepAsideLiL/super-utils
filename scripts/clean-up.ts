/// <reference types="node" />

import * as fs from "fs";
import * as path from "path";
import * as readline from "readline";

// Folders/files to target across the entire monorepo
const TARGET_NAMES = new Set([
  // Dependencies & Caches
  "node_modules",
  ".cache",
  ".turbo",
  ".nx",
  ".bun",
  ".bun-cache",
  "coverage",

  // Common Build Outputs
  "dist",
  "build",
  "out",
  ".next",
  ".nuxt",
  ".svelte-kit",

  // Lockfiles (usually in root, but can appear in workspaces)
  "package-lock.json",
  "yarn.lock",
  "pnpm-lock.yaml",
  "bun.lockb",
  "bun.lock",
]);

// Log patterns to search for
const LOG_PREFIXES = ["npm-debug.log", "yarn-error.log", "bun.log"];

// Directories to skip scanning entirely to speed up execution and prevent accidental deletions
const IGNORE_DIRS = new Set([".git", ".svn", ".hg"]);

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout,
});

function isLogFile(fileName: string): boolean {
  return LOG_PREFIXES.some((prefix) => fileName.startsWith(prefix));
}

/**
 * Recursively scans the monorepo directory tree to find targets.
 * Stops traversing deeper into directories once a matching target (e.g. node_modules) is found.
 */
function findMonorepoTargets(dir: string, matches: string[] = []): string[] {
  let entries: fs.Dirent[];

  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch (err) {
    return matches; // Return gracefully if directory can't be read
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);

    if (IGNORE_DIRS.has(entry.name)) {
      continue;
    }

    // Check if current file/folder matches cleanup targets or log patterns
    const isTarget = TARGET_NAMES.has(entry.name) || isLogFile(entry.name);

    if (isTarget) {
      matches.push(fullPath);
      // DO NOT recurse deeper into a matched folder (e.g., inside a node_modules folder)
      continue;
    }

    // Recurse into subdirectories
    if (entry.isDirectory()) {
      findMonorepoTargets(fullPath, matches);
    }
  }

  return matches;
}

function removePath(targetPath: string): void {
  try {
    const stats = fs.statSync(targetPath);
    if (stats.isDirectory()) {
      fs.rmSync(targetPath, { recursive: true, force: true });
      console.log(`✓ Removed directory: ${targetPath}`);
    } else {
      fs.unlinkSync(targetPath);
      console.log(`✓ Removed file:      ${targetPath}`);
    }
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`✗ Failed to remove ${targetPath}:`, errorMessage);
  }
}

function runCleanup(): void {
  const rootDir = process.cwd();
  console.log(`🔍 Scanning monorepo at: ${rootDir}...\n`);

  const itemsToRemove = findMonorepoTargets(rootDir);

  if (itemsToRemove.length === 0) {
    console.log("✨ Monorepo is completely clean! Nothing to delete.");
    rl.close();
    return;
  }

  console.log(
    `Found ${itemsToRemove.length} item(s) to remove across the workspace:\n`
  );
  itemsToRemove.forEach((item) => {
    console.log(` - ${path.relative(rootDir, item)}`);
  });

  rl.question(
    "\nAre you sure you want to delete all these items? (y/N): ",
    (answer: string) => {
      if (answer.toLowerCase() === "y" || answer.toLowerCase() === "yes") {
        console.log("\nCleaning up monorepo...");
        itemsToRemove.forEach(removePath);
        console.log("\nDone! 🎉 Monorepo cleanup complete.");
      } else {
        console.log("\nCleanup cancelled.");
      }
      rl.close();
    }
  );
}

runCleanup();
