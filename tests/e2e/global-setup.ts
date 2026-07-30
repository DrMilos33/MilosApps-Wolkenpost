const EXPECTED_APP_KEY = 'cloud-post';
const HEALTH_URL = 'http://127.0.0.1:4315/health.json';

export default async function globalSetup() {
  const response = await fetch(HEALTH_URL, {
    headers: { Accept: 'application/json' },
  });
  if (!response.ok) {
    throw new Error(`Wolkenpost readiness failed with HTTP ${response.status}.`);
  }
  const health = await response.json() as {
    status?: string;
    appKey?: string;
    environment?: string;
  };
  if (
    health.status !== 'ok'
    || health.appKey !== EXPECTED_APP_KEY
    || health.environment !== 'dev-build'
  ) {
    throw new Error(
      `Port 4315 is not Wolkenpost DEV: expected ${EXPECTED_APP_KEY}/dev-build, received ${JSON.stringify(health)}.`,
    );
  }
}
