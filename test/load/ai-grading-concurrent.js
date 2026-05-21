const DEFAULT_BASE_URL = 'https://agenticgrader.com';
const DEFAULT_ASSIGNMENT_ID = '7a7eb3d9-18d3-4eab-bdac-66b33d43c2e5';
const DEFAULT_RUBRIC_ID = '9cce9db0-b9e4-4679-bc18-628a2d80bab7';
const DEFAULT_FILE_ID = '8753a976-9947-4cce-86d1-ad4a512e19d7';
const DEFAULT_LANGUAGE = 'zh';
const DEFAULT_CONCURRENCY = 10;
const DEFAULT_POLL_INTERVAL_MS = 2000;
const DEFAULT_POLL_TIMEOUT_MS = 180000;
const DEFAULT_OUTPUT_PATH = 'ai-grading-concurrent-results.json';
const DEFAULT_COOKIE = 'sid=g.a0008QidNJrwIGymrB3Wiu_5k21tqSlLNCQaYCj_QU3fzCI0cxTe758i-Pki3BU3mVPg8z67TAACgYKAb4SARUSFQHGX2Mi17H5H4yAeDFaPBW2LKCudxoVAUF8yKqWQIQgtu-eQKoEvPwI7ECz0076; ssid=Asopx8TX2LvgJtssa; __auth=eyJ1c2VySWQiOiIwNjg2NjMwZS1mZTFhLTQ2MDUtYWRjNy0yMDhjZDczYmEyZGQifQ%3D%3D.qLHiAjm89UoJYDTwocV6t7TAyUsa349OKOMhytrsMk0';

function getRequiredEnv(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

function getOptionalEnv(name, fallback) {
  return process.env[name] || fallback;
}

function parseNumberEnv(name, fallback) {
  const value = process.env[name];
  if (!value) return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function percentile(values, p) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const index = Math.ceil((p / 100) * sorted.length) - 1;
  return sorted[Math.max(0, index)];
}

async function createSession(config, userIndex) {
  const formData = new FormData();
  formData.append('fileIds', JSON.stringify([config.fileIds[userIndex % config.fileIds.length]]));
  formData.append('rubricIds', JSON.stringify([config.rubricId]));
  formData.append('assignmentAreaId', config.assignmentId);
  formData.append('language', config.language);

  const response = await fetch(`${config.baseUrl}/api/grading/session`, {
    method: 'POST',
    headers: {
      cookie: config.cookie,
    },
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok || !payload.success || !payload.data?.sessionId) {
    throw new Error(`Failed to create session: ${JSON.stringify(payload)}`);
  }

  return payload.data.sessionId;
}

async function startSession(config, sessionId) {
  const formData = new FormData();
  formData.append('action', 'start');
  formData.append('useDirectGrading', 'false');

  const response = await fetch(`${config.baseUrl}/api/grading/session/${sessionId}`, {
    method: 'POST',
    headers: {
      cookie: config.cookie,
    },
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok || !payload.success) {
    throw new Error(`Failed to start grading: ${JSON.stringify(payload)}`);
  }
}

async function pollSession(config, sessionId) {
  const startedAt = Date.now();

  while (Date.now() - startedAt < config.pollTimeoutMs) {
    const response = await fetch(`${config.baseUrl}/api/grading/session/${sessionId}`, {
      headers: {
        cookie: config.cookie,
      },
    });

    const payload = await response.json();
    if (!response.ok || !payload.success || !payload.data) {
      throw new Error(`Failed to poll session: ${JSON.stringify(payload)}`);
    }

    const session = payload.data;
    if (session.status === 'COMPLETED' || session.status === 'FAILED') {
      return session;
    }

    await sleep(config.pollIntervalMs);
  }

  throw new Error(`Polling timed out for session ${sessionId}`);
}

async function runSingleUser(config, userIndex) {
  const overallStart = Date.now();
  const fileId = config.fileIds[userIndex % config.fileIds.length];

  try {
    const sessionId = await createSession(config, userIndex);
    await startSession(config, sessionId);
    const session = await pollSession(config, sessionId);
    const gradingResult = session.gradingResults?.[0];

    return {
      userIndex: userIndex + 1,
      fileId,
      sessionId,
      status: session.status,
      completionMs: Date.now() - overallStart,
      gradingTokens: gradingResult?.gradingTokens ?? null,
      gradingDuration: gradingResult?.gradingDuration ?? null,
      gradingModel: gradingResult?.gradingModel ?? null,
      normalizedScore: gradingResult?.normalizedScore ?? null,
      errorMessage: gradingResult?.errorMessage ?? null,
    };
  } catch (error) {
    return {
      userIndex: userIndex + 1,
      fileId,
      sessionId: null,
      status: 'FAILED',
      completionMs: Date.now() - overallStart,
      gradingTokens: null,
      gradingDuration: null,
      gradingModel: null,
      normalizedScore: null,
      errorMessage: error instanceof Error ? error.message : String(error),
    };
  }
}

function buildSummary(results) {
  const completedResults = results.filter((item) => item.status === 'COMPLETED');
  const completionValues = completedResults.map((item) => item.completionMs);
  const tokenValues = completedResults
    .map((item) => item.gradingTokens)
    .filter((value) => typeof value === 'number');

  const avgCompletionMs = completionValues.length > 0
    ? completionValues.reduce((sum, value) => sum + value, 0) / completionValues.length
    : 0;

  const avgGradingTokens = tokenValues.length > 0
    ? tokenValues.reduce((sum, value) => sum + value, 0) / tokenValues.length
    : 0;

  return {
    total: results.length,
    completed: completedResults.length,
    failed: results.length - completedResults.length,
    avgCompletionMs,
    p95CompletionMs: percentile(completionValues, 95),
    avgGradingTokens,
  };
}

async function main() {
  const config = {
    baseUrl: getOptionalEnv('AG_BASE_URL', DEFAULT_BASE_URL),
    assignmentId: getOptionalEnv('AG_ASSIGNMENT_ID', DEFAULT_ASSIGNMENT_ID),
    rubricId: getOptionalEnv('AG_RUBRIC_ID', DEFAULT_RUBRIC_ID),
    fileIds: getOptionalEnv('AG_FILE_IDS', DEFAULT_FILE_ID)
      .split(',')
      .map((value) => value.trim())
      .filter(Boolean),
    language: getOptionalEnv('AG_LANGUAGE', DEFAULT_LANGUAGE),
    concurrency: parseNumberEnv('AG_CONCURRENCY', DEFAULT_CONCURRENCY),
    pollIntervalMs: parseNumberEnv('AG_POLL_INTERVAL_MS', DEFAULT_POLL_INTERVAL_MS),
    pollTimeoutMs: parseNumberEnv('AG_POLL_TIMEOUT_MS', DEFAULT_POLL_TIMEOUT_MS),
    outputPath: getOptionalEnv('AG_OUTPUT_PATH', DEFAULT_OUTPUT_PATH),
    cookie: getOptionalEnv('AG_COOKIE', DEFAULT_COOKIE) || getRequiredEnv('AG_COOKIE'),
  };

  const startedAt = new Date().toISOString();
  const results = await Promise.all(
    Array.from({ length: config.concurrency }, (_, index) => runSingleUser(config, index))
  );
  const finishedAt = new Date().toISOString();

  const report = {
    scenario: 'ai-grading-concurrent',
    concurrency: config.concurrency,
    assignmentId: config.assignmentId,
    rubricId: config.rubricId,
    fileIds: config.fileIds,
    startedAt,
    finishedAt,
    summary: buildSummary(results),
    results,
  };

  await import('node:fs/promises').then((fs) =>
    fs.writeFile(config.outputPath, JSON.stringify(report, null, 2), 'utf-8')
  );

  console.log(JSON.stringify(report.summary, null, 2));
  console.log(`Saved report to ${config.outputPath}`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
