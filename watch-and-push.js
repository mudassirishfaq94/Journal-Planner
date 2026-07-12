#!/usr/bin/env node
// ============================================================
//  Journal Planner — Auto Git Push Watcher
//  Watches for file changes and auto-commits + pushes to GitHub
// ============================================================

const fs        = require('fs');
const path      = require('path');
const { execSync, spawnSync } = require('child_process');

const ROOT        = __dirname;
const DEBOUNCE_MS = 3000;          // wait 3s after last change before committing
const IGNORE_DIRS = new Set(['.git', 'node_modules', '.vscode', '.idea']);
const IGNORE_EXT  = new Set(['.log', '.tmp', '.bak']);

let debounceTimer = null;
let pendingChanges = new Set();

// ── Colours for terminal output ──────────────────────────────
const c = {
  reset:  '\x1b[0m',
  green:  '\x1b[32m',
  yellow: '\x1b[33m',
  blue:   '\x1b[34m',
  cyan:   '\x1b[36m',
  grey:   '\x1b[90m',
  red:    '\x1b[31m',
  bold:   '\x1b[1m',
};

function log(icon, color, msg) {
  const time = new Date().toLocaleTimeString();
  console.log(`${c.grey}[${time}]${c.reset} ${color}${icon} ${msg}${c.reset}`);
}

// ── Run a git command and return stdout ──────────────────────
function git(...args) {
  const result = spawnSync('git', args, { cwd: ROOT, encoding: 'utf8' });
  if (result.status !== 0) throw new Error(result.stderr || result.stdout);
  return (result.stdout || '').trim();
}

// ── Check if there are any uncommitted changes ───────────────
function hasChanges() {
  try {
    const status = git('status', '--porcelain');
    return status.length > 0;
  } catch { return false; }
}

// ── Commit and push ──────────────────────────────────────────
function commitAndPush() {
  if (!hasChanges()) {
    log('✓', c.grey, 'No changes to commit.');
    pendingChanges.clear();
    return;
  }

  const changedFiles = [...pendingChanges].slice(0, 4).map(f => path.relative(ROOT, f)).join(', ');
  const extra = pendingChanges.size > 4 ? ` +${pendingChanges.size - 4} more` : '';
  const timestamp = new Date().toISOString().replace('T', ' ').substring(0, 19);
  const message = `Auto-commit [${timestamp}]: ${changedFiles}${extra}`;

  try {
    log('📦', c.yellow, 'Staging changes…');
    git('add', '-A');

    log('✍️ ', c.yellow, `Committing: ${c.bold}${changedFiles}${extra}${c.reset}${c.yellow}`);
    git('commit', '-m', message);

    log('🚀', c.cyan, 'Pushing to GitHub…');
    git('push', 'origin', 'main');

    log('✅', c.green, `Pushed successfully! (${pendingChanges.size} file(s) changed)`);
    pendingChanges.clear();

  } catch (err) {
    log('❌', c.red, `Git error: ${err.message}`);
    // Try to push anyway in case only the push failed
    try {
      git('push', 'origin', 'main');
      log('✅', c.green, 'Push recovered successfully!');
    } catch { /* give up */ }
    pendingChanges.clear();
  }
}

// ── Recursively watch a directory ────────────────────────────
function watchDir(dir) {
  let watcher;
  try {
    watcher = fs.watch(dir, { recursive: false }, (event, filename) => {
      if (!filename) return;

      const fullPath = path.join(dir, filename);
      const ext      = path.extname(filename).toLowerCase();
      const base     = path.basename(filename);

      // Skip ignored dirs, files, and extensions
      if (IGNORE_DIRS.has(base) || IGNORE_EXT.has(ext) || base.startsWith('.')) return;

      pendingChanges.add(fullPath);
      log('👁️ ', c.blue, `Changed: ${path.relative(ROOT, fullPath)}`);

      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(commitAndPush, DEBOUNCE_MS);
    });
  } catch { /* dir may not exist */ }

  // Also watch subdirectories (non-recursive fs.watch workaround on Windows)
  try {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      if (entry.isDirectory() && !IGNORE_DIRS.has(entry.name) && !entry.name.startsWith('.')) {
        watchDir(path.join(dir, entry.name));
      }
    }
  } catch { /* skip unreadable dirs */ }

  return watcher;
}

// ── Startup ──────────────────────────────────────────────────
console.log();
console.log(`${c.bold}${c.blue}╔════════════════════════════════════════╗${c.reset}`);
console.log(`${c.bold}${c.blue}║  📡 Journal Planner — Auto Git Push    ║${c.reset}`);
console.log(`${c.bold}${c.blue}╚════════════════════════════════════════╝${c.reset}`);
console.log();
log('🔗', c.green, `Repo: ${git('remote', 'get-url', 'origin')}`);
log('🌿', c.green, `Branch: ${git('branch', '--show-current')}`);
log('👁️ ', c.cyan, `Watching: ${ROOT}`);
log('⏱️ ', c.grey, `Debounce: ${DEBOUNCE_MS / 1000}s after last change`);
console.log();
log('✅', c.green, 'Watcher active — save any file to auto-push to GitHub!');
console.log(`${c.grey}  Press Ctrl+C to stop.${c.reset}`);
console.log();

watchDir(ROOT);
