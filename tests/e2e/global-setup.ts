const EXPECTED_APP_KEY = 'cloud-post';
const baseUrl = process.env.CLOUD_POST_E2E_BASE_URL ?? 'http://127.0.0.1:4315/';
const HEALTH_URL = new URL('health.json', `${baseUrl.replace(/\/+$/, '')}/`);

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
    productionApproved?: boolean;
  };
  if (
    health.status !== 'ok'
    || health.appKey !== EXPECTED_APP_KEY
    || health.environment !== 'dev-build'
    || health.productionApproved !== false
  ) {
    throw new Error(
      `Readiness is not Wolkenpost DEV: expected ${EXPECTED_APP_KEY}/dev-build/productionApproved=false, received ${JSON.stringify(health)}.`,
    );
  }
}
