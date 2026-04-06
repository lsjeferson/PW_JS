#!/usr/bin/env node
const { spawnSync } = require('child_process');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const BUILD_SCRIPT = path.join(ROOT_DIR, 'scripts', 'build-playwright-execution-report.js');

const testRun = spawnSync('npx', ['playwright', 'test'], {
  cwd: ROOT_DIR,
  stdio: 'inherit',
  shell: true,
});

const consolidateRun = spawnSync('node', [BUILD_SCRIPT], {
  cwd: ROOT_DIR,
  stdio: 'inherit',
  shell: true,
});

if (consolidateRun.status !== 0) {
  console.error('Report consolidation failed. Check previous logs.');
}

// Sempre retorna o exit code real dos testes.
process.exit(testRun.status === null ? 1 : testRun.status);
