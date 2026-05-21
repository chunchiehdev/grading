import http from 'k6/http';
import { check, sleep } from 'k6';

export const options = {
  scenarios: {
    health_check_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '30s', target: 10 },
        { duration: '30s', target: 50 },
        { duration: '30s', target: 100 },
        { duration: '30s', target: 150 },
        { duration: '30s', target: 0 },
      ],
      gracefulRampDown: '10s',
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.05'],
    http_req_duration: ['p(95)<3000'],
    checks: ['rate>0.80'],
  },
};

const BASE_URL = __ENV.BASE_URL || 'https://agenticgrader.com';
const HEALTH_URL = `${BASE_URL}/health`;

export default function () {
  const response = http.get(HEALTH_URL, {
    tags: {
      endpoint: 'health',
      test_type: 'baseline-load',
    },
  });

  check(response, {
    'health status is 200': (res) => res.status === 200,
    'health response time < 1000ms': (res) => res.timings.duration < 1000,
  });

  sleep(1);
}
