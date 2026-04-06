#!/usr/bin/env node
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

const ROOT_DIR = path.resolve(__dirname, '..');
const RAW_DIR = path.join(ROOT_DIR, 'artifacts', 'raw');
const FINAL_DIR = path.join(ROOT_DIR, 'artifacts', 'test-execution');
const RAW_REPORT_PATH = path.join(RAW_DIR, 'playwright-report.json');

function safeValue(value) {
  return value === undefined ? null : value;
}

function envValue(keys) {
  for (const key of keys) {
    if (process.env[key]) return process.env[key];
  }
  return null;
}

function ciProvider() {
  if (process.env.GITLAB_CI) return 'gitlab';
  if (process.env.JENKINS_URL || process.env.JENKINS_HOME) return 'jenkins';
  if (process.env.GITHUB_ACTIONS) return 'github';
  if (process.env.CIRCLECI) return 'circleci';
  return 'local';
}

function flattenSpecs(suites, acc = []) {
  if (!Array.isArray(suites)) return acc;
  for (const suite of suites) {
    if (Array.isArray(suite.specs)) acc.push(...suite.specs);
    if (Array.isArray(suite.suites)) flattenSpecs(suite.suites, acc);
  }
  return acc;
}

function normalizeStream(streamItems) {
  if (!Array.isArray(streamItems)) return [];
  return streamItems.map((item) => {
    if (typeof item === 'string') return item;
    if (item && typeof item.text === 'string') return item.text;
    return JSON.stringify(item);
  });
}

function detectBrowser(projectName) {
  if (!projectName) return null;
  const p = String(projectName).toLowerCase();
  if (p.includes('chromium')) return 'chromium';
  if (p.includes('firefox')) return 'firefox';
  if (p.includes('webkit')) return 'webkit';
  return null;
}

function sanitizeToken(value) {
  if (!value) return null;
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase() || null;
}

function timestampForFile(date) {
  const pad = (n) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}-${pad(date.getHours())}-${pad(date.getMinutes())}-${pad(date.getSeconds())}`;
}

function readPackageData() {
  const pkgPath = path.join(ROOT_DIR, 'package.json');
  try {
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    return {
      projectName: safeValue(process.env.CI_PROJECT_NAME || pkg.name || null),
      projectPath: safeValue(process.env.CI_PROJECT_PATH || null),
    };
  } catch {
    return {
      projectName: safeValue(process.env.CI_PROJECT_NAME || null),
      projectPath: safeValue(process.env.CI_PROJECT_PATH || null),
    };
  }
}

function buildFinalFileName(meta, now) {
  const parts = [
    'playwright-run',
    timestampForFile(now),
    meta.pipelineId ? `pipeline-${sanitizeToken(meta.pipelineId)}` : null,
    meta.jobId ? `job-${sanitizeToken(meta.jobId)}` : null,
    meta.jobName ? sanitizeToken(meta.jobName) : null,
    meta.branch ? sanitizeToken(meta.branch) : null,
    meta.tag ? sanitizeToken(meta.tag) : null,
    meta.suite ? sanitizeToken(meta.suite) : null,
    meta.grep ? sanitizeToken(meta.grep) : null,
    meta.browser ? sanitizeToken(meta.browser) : null,
  ].filter(Boolean);

  return `${parts.join('-')}.json`;
}

function summarizeStatus(tests) {
  const counters = {
    totalTests: tests.length,
    passed: 0,
    failed: 0,
    skipped: 0,
    timedOut: 0,
    interrupted: 0,
    flaky: 0,
    retries: 0,
  };

  for (const test of tests) {
    if (test.status === 'passed') counters.passed += 1;
    else if (test.status === 'failed') counters.failed += 1;
    else if (test.status === 'skipped') counters.skipped += 1;
    else if (test.status === 'timedOut') counters.timedOut += 1;
    else if (test.status === 'interrupted') counters.interrupted += 1;

    if (test.retry > 0 || test.status !== test.expectedStatus) counters.flaky += 1;
    counters.retries += test.retry;
  }

  return counters;
}

function safeIncrement(map, key, status) {
  const bucket = map[key] || {
    total: 0,
    passed: 0,
    failed: 0,
    skipped: 0,
    timedOut: 0,
    interrupted: 0,
    flaky: 0,
  };

  bucket.total += 1;
  bucket[status] = (bucket[status] || 0) + 1;
  map[key] = bucket;
}

function parseRawReport(raw) {
  const specs = flattenSpecs(raw.suites || []);
  const tests = [];

  for (const spec of specs) {
    const specTests = Array.isArray(spec.tests) ? spec.tests : [];

    for (const test of specTests) {
      const results = Array.isArray(test.results) ? test.results : [];
      const last = results[results.length - 1] || {};
      const attempts = results.length;
      const retry = Math.max(0, attempts - 1);
      const durationMs = results.reduce((acc, r) => acc + (r.duration || 0), 0);
      const project = safeValue(test.projectName || last.projectName || null);
      const browser = safeValue(detectBrowser(project));
      const errors = Array.isArray(last.errors) ? last.errors : [];
      const firstError = errors[0] || {};

      tests.push({
        title: safeValue(test.title || null),
        fullTitle: Array.isArray(test.titlePath)
          ? safeValue(test.titlePath.filter(Boolean).join(' > ') || null)
          : safeValue(test.title || null),
        file: safeValue(spec.file || test.location?.file || null),
        line: safeValue(test.location?.line ?? null),
        column: safeValue(test.location?.column ?? null),
        project,
        browser,
        tags: Array.isArray(test.tags) ? test.tags : [],
        status: safeValue(last.status || test.status || 'unknown'),
        expectedStatus: safeValue(test.expectedStatus || 'passed'),
        retry,
        durationMs,
        errorMessage: safeValue(firstError.message || null),
        errorStack: safeValue(firstError.stack || null),
        annotations: Array.isArray(test.annotations) ? test.annotations : [],
        attachments: Array.isArray(last.attachments) ? last.attachments : [],
        stdout: normalizeStream(last.stdout),
        stderr: normalizeStream(last.stderr),
      });
    }
  }

  return tests;
}

function buildReport(raw) {
  const now = new Date();
  const packageData = readPackageData();

  const meta = {
    ciProvider: ciProvider(),
    pipelineId: safeValue(envValue(['CI_PIPELINE_ID'])),
    pipelineIid: safeValue(envValue(['CI_PIPELINE_IID'])),
    jobId: safeValue(envValue(['CI_JOB_ID'])),
    jobName: safeValue(envValue(['CI_JOB_NAME'])),
    branch: safeValue(envValue(['CI_COMMIT_REF_NAME', 'CI_COMMIT_BRANCH'])),
    tag: safeValue(envValue(['CI_COMMIT_TAG', 'TEST_TAG'])),
    commitSha: safeValue(envValue(['CI_COMMIT_SHA'])),
    environment: safeValue(envValue(['CI_ENVIRONMENT_NAME', 'NODE_ENV'])),
    executor: safeValue(envValue(['CI_RUNNER_DESCRIPTION'])),
    runnerId: safeValue(envValue(['CI_RUNNER_ID'])),
    suite: safeValue(envValue(['TEST_SUITE'])),
    grep: safeValue(envValue(['PLAYWRIGHT_GREP', 'npm_config_grep'])),
    browser: safeValue(envValue(['BROWSER'])),
  };

  const tests = parseRawReport(raw);
  const statusCounters = summarizeStatus(tests);

  const byFile = {};
  const byBrowser = {};
  const byProject = {};

  for (const test of tests) {
    const fileKey = test.file || 'unknown';
    const browserKey = test.browser || 'unknown';
    const projectKey = test.project || 'unknown';

    safeIncrement(byFile, fileKey, test.status);
    safeIncrement(byBrowser, browserKey, test.status);
    safeIncrement(byProject, projectKey, test.status);

    if (test.retry > 0 || test.status !== test.expectedStatus) {
      byFile[fileKey].flaky += 1;
      byBrowser[browserKey].flaky += 1;
      byProject[projectKey].flaky += 1;
    }
  }

  const reportDurationMs = safeValue(raw.stats?.duration ?? tests.reduce((acc, t) => acc + (t.durationMs || 0), 0));
  const startTime = safeValue(raw.stats?.startTime || null);
  const endTime = startTime && reportDurationMs !== null
    ? new Date(new Date(startTime).getTime() + reportDurationMs).toISOString()
    : null;

  let statusFinal = 'passed';
  if (statusCounters.interrupted > 0) statusFinal = 'interrupted';
  else if (statusCounters.failed > 0 || statusCounters.timedOut > 0) statusFinal = 'failed';
  else if (statusCounters.skipped > 0) statusFinal = 'partial';

  const runId = `pw-${timestampForFile(now)}-${crypto.randomUUID()}`;
  const fileName = buildFinalFileName(meta, now);
  const finalReportPath = path.join(FINAL_DIR, fileName);

  return {
    runId,
    generatedAt: now.toISOString(),
    framework: 'playwright',
    projectName: packageData.projectName,
    projectPath: packageData.projectPath,
    ciProvider: meta.ciProvider,
    pipelineId: meta.pipelineId,
    pipelineIid: meta.pipelineIid,
    jobId: meta.jobId,
    jobName: meta.jobName,
    branch: meta.branch,
    tag: meta.tag,
    commitSha: meta.commitSha,
    environment: meta.environment,
    executor: meta.executor,
    runnerId: meta.runnerId,
    os: `${os.platform()} ${os.release()}`,
    nodeVersion: process.version,
    suite: meta.suite,
    grep: meta.grep,
    browser: meta.browser,
    rawReportPath: path.relative(ROOT_DIR, RAW_REPORT_PATH),
    finalReportPath: path.relative(ROOT_DIR, finalReportPath),
    summary: {
      totalTests: statusCounters.totalTests,
      passed: statusCounters.passed,
      failed: statusCounters.failed,
      skipped: statusCounters.skipped,
      timedOut: statusCounters.timedOut,
      interrupted: statusCounters.interrupted,
      flaky: statusCounters.flaky,
      retries: statusCounters.retries,
      durationMs: reportDurationMs,
      durationSeconds: reportDurationMs === null ? null : Number((reportDurationMs / 1000).toFixed(3)),
      startTime,
      endTime,
      statusFinal,
    },
    tests,
    aggregations: {
      byFile,
      byBrowser,
      byProject,
      failedTests: tests.filter((t) => t.status === 'failed' || t.status === 'timedOut'),
      flakyTests: tests.filter((t) => t.retry > 0 || t.status !== t.expectedStatus),
      slowestTests: [...tests].sort((a, b) => b.durationMs - a.durationMs).slice(0, 10),
      statusCounters: {
        passed: statusCounters.passed,
        failed: statusCounters.failed,
        skipped: statusCounters.skipped,
        timedOut: statusCounters.timedOut,
        interrupted: statusCounters.interrupted,
      },
      testsPerFile: Object.fromEntries(Object.entries(byFile).map(([key, val]) => [key, val.total])),
      testsPerProject: Object.fromEntries(Object.entries(byProject).map(([key, val]) => [key, val.total])),
    },
  };
}

function main() {
  if (!fs.existsSync(RAW_REPORT_PATH)) {
    console.error(`Raw Playwright JSON not found: ${RAW_REPORT_PATH}`);
    process.exit(1);
  }

  fs.mkdirSync(FINAL_DIR, { recursive: true });

  const raw = JSON.parse(fs.readFileSync(RAW_REPORT_PATH, 'utf8'));
  const finalReport = buildReport(raw);

  const finalReportAbsolutePath = path.join(ROOT_DIR, finalReport.finalReportPath);
  fs.writeFileSync(finalReportAbsolutePath, JSON.stringify(finalReport, null, 2), 'utf8');

  console.log(`Consolidated report generated at: ${finalReportAbsolutePath}`);
}

main();
