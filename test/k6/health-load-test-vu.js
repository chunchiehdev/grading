import http from 'k6/http';
import { check, sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'https://agenticgrader.com';
const HEALTH_URL = `${BASE_URL}/health`;
const TARGET_VUS = Number(__ENV.TARGET_VUS || 10);
const TEST_DURATION = __ENV.TEST_DURATION || '60s';

export const options = {
  scenarios: {
    fixed_health_load: {
      executor: 'constant-vus',
      vus: TARGET_VUS,
      duration: TEST_DURATION,
      gracefulStop: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<3000'],
    checks: ['rate>0.80'],
  },
};

export default function () {
  const response = http.get(HEALTH_URL, {
    tags: {
      endpoint: 'health',
      test_type: 'fixed-vu-load',
      vus: String(TARGET_VUS),
    },
  });

  check(response, {
    'health status is 200': (res) => res.status === 200,
    'health response time < 3000ms': (res) => res.timings.duration < 3000,
  });

  sleep(1);
}
