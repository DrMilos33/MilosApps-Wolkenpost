import { readFile } from 'node:fs/promises';

const BASE = '/MilosApps-Wolkenpost/';
const DEV_URL = `https://drmilos33.github.io${BASE}`;
const expectedRevision = process.env.GITHUB_SHA;

const [index, serviceWorker, manifestText, healthText, integrationText] = await Promise.all([
  readFile('dist/index.html', 'utf8'),
  readFile('dist/sw.js', 'utf8'),
  readFile('dist/manifest.webmanifest', 'utf8'),
  readFile('dist/health.json', 'utf8'),
  readFile('dist/integration.json', 'utf8'),
]);

const manifest = JSON.parse(manifestText);
const health = JSON.parse(healthText);
const integration = JSON.parse(integrationText);

const checks = [
  [index.includes(`${BASE}assets/`), 'index.html does not use the GitHub Pages base path.'],
  [index.includes(`${BASE}manifest.webmanifest`), 'The manifest URL is not scoped to the DEV base path.'],
  [serviceWorker.includes(`const BASE = "${BASE}";`), 'The service worker does not enforce the DEV base path.'],
  [serviceWorker.includes(`${BASE}index.html`), 'The service worker offline fallback is outside the DEV base path.'],
  [manifest.start_url === './' && manifest.scope === './', 'The web app manifest is not relative to its deployment scope.'],
  [health.status === 'ok', 'Health status is not ok.'],
  [health.appKey === 'cloud-post', 'Health appKey is not cloud-post.'],
  [health.environment === 'dev-build', 'Health environment is not dev-build.'],
  [health.productionApproved === false, 'Health must explicitly reject Production approval.'],
  [integration.devUrl === DEV_URL, 'Integration metadata contains the wrong DEV URL.'],
  [integration.productionApproved === false, 'Integration metadata must explicitly reject Production approval.'],
  [integration.healthcheck?.url === `${DEV_URL}health.json`, 'Integration metadata contains the wrong health URL.'],
  [integration.preview?.path === `${BASE}preview.png`, 'Integration metadata contains the wrong preview path.'],
  [integration.preview?.url === `${DEV_URL}preview.png`, 'Integration metadata contains the wrong preview URL.'],
];

if (expectedRevision) {
  checks.push(
    [health.deploymentRevision === expectedRevision, 'Health revision does not match GITHUB_SHA.'],
    [integration.deploymentRevision === expectedRevision, 'Integration revision does not match GITHUB_SHA.'],
  );
}

const failures = checks.filter(([passed]) => !passed).map(([, message]) => message);
if (failures.length) {
  throw new Error(failures.join('\n'));
}

console.log(`Verified cloud-post DEV artifact for ${DEV_URL}`);
