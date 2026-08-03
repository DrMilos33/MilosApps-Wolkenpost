import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';

const BASE = '/MilosApps-Wolkenpost/';
const DEV_URL = `https://drmilos33.github.io${BASE}`;
const expectedRevision = process.env.GITHUB_SHA;

const shellDirectory = 'vendor/milosapps-shell/v2';
const shellRuntimeFiles = [
  'bootstrap.js',
  'milos-app-shell.js',
  'milos-app-shell.css',
  'milos-app-shell-theme.css',
];
const layoutDirectory = 'vendor/milosapps-layout/v1';
const layoutRuntimeFiles = [
  'milos-app-layout.css',
  'milos-app-layout-theme.css',
];
const essentialsDirectory = 'vendor/milosapps-essentials/v1';
const essentialsRuntimeFiles = [
  'bootstrap.js',
  'milos-app-essentials.js',
  'milos-app-essentials.css',
  'milos-app-essentials-theme.css',
];
const essentialsLockedFiles = [
  ...essentialsRuntimeFiles,
  'verify.mjs',
  'essentials-manifest.schema.json',
];
const [index, serviceWorker, manifestText, healthText, integrationText, shellLockText, layoutLockText, essentialsLockText, sourceIcon, builtIcon, thirdPartyNotices, sourceEiffelPhoto, builtEiffelPhoto, sourceColognePhoto, builtColognePhoto] = await Promise.all([
  readFile('dist/index.html', 'utf8'),
  readFile('dist/sw.js', 'utf8'),
  readFile('dist/manifest.webmanifest', 'utf8'),
  readFile('dist/health.json', 'utf8'),
  readFile('dist/integration.json', 'utf8'),
  readFile(`${shellDirectory}/shell-lock.json`, 'utf8'),
  readFile(`${layoutDirectory}/layout-lock.json`, 'utf8'),
  readFile(`${essentialsDirectory}/essentials-lock.json`, 'utf8'),
  readFile('public/icon.svg'),
  readFile('dist/icon.svg'),
  readFile('dist/THIRD_PARTY_NOTICES.txt', 'utf8'),
  readFile('public/landmarks/eiffel-tower.jpg'),
  readFile('dist/landmarks/eiffel-tower.jpg'),
  readFile('public/landmarks/cologne-cathedral.jpg'),
  readFile('dist/landmarks/cologne-cathedral.jpg'),
]);
const shellArtifacts = await Promise.all(
  shellRuntimeFiles.map((file) => readFile(`dist/${shellDirectory}/${file}`)),
);
const layoutArtifacts = await Promise.all(
  layoutRuntimeFiles.map((file) => readFile(`dist/${layoutDirectory}/${file}`)),
);
const essentialsArtifacts = await Promise.all(
  essentialsRuntimeFiles.map((file) => readFile(`dist/${essentialsDirectory}/${file}`)),
);
const essentialsLockedArtifacts = await Promise.all(
  essentialsLockedFiles.map((file) => readFile(`${essentialsDirectory}/${file}`)),
);

const manifest = JSON.parse(manifestText);
const health = JSON.parse(healthText);
const integration = JSON.parse(integrationText);
const shellLock = JSON.parse(shellLockText);
const layoutLock = JSON.parse(layoutLockText);
const essentialsLock = JSON.parse(essentialsLockText);

function sha256(content) {
  return `sha256:${createHash('sha256').update(content).digest('hex')}`;
}

const checks = [
  [index.includes(`${BASE}assets/`), 'index.html does not use the GitHub Pages base path.'],
  [index.includes(`./${shellDirectory}/bootstrap.js`), 'index.html does not load the local vendored shell bootstrap.'],
  [index.includes(`./${layoutDirectory}/milos-app-layout.css`), 'index.html does not load the local vendored layout CSS.'],
  [index.includes(`./${layoutDirectory}/milos-app-layout-theme.css`), 'index.html does not load the local vendored layout theme CSS.'],
  [index.includes(`./${essentialsDirectory}/milos-app-essentials.css`), 'index.html does not keep the local essentials CSS external.'],
  [index.includes(`./${essentialsDirectory}/milos-app-essentials-theme.css`), 'index.html does not keep the local essentials theme CSS external.'],
  [index.includes(`./${essentialsDirectory}/bootstrap.js`), 'index.html does not load the local essentials bootstrap.'],
  [index.includes('icon.svg'), 'index.html does not load the app-owned runtime icon.'],
  [/<(?:p|span)\b[^>]*data-milos-loading-title/u.test(index), 'Loader title must use a non-heading p or span element.'],
  [!/<h[1-6]\b[^>]*data-milos-loading-title/u.test(index), 'Loader title must not create a second document heading.'],
  [!index.includes('data:text/css') && !index.includes('data:text/javascript'), 'index.html inlines a shared runtime instead of keeping it external.'],
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
  [integration.titles?.de === 'Wolkenpost' && integration.titles?.en === 'Cloud Post', 'Integration titles must cover DE and EN.'],
  [integration.shortDescriptions?.de && integration.shortDescriptions?.en, 'Integration descriptions must cover DE and EN.'],
  [integration.languages?.length === 2 && integration.languages.includes('de') && integration.languages.includes('en'), 'Integration languages must be exactly DE and EN.'],
  [integration.healthcheck?.url === `${DEV_URL}health.json`, 'Integration metadata contains the wrong health URL.'],
  [integration.preview?.path === `${BASE}preview.png`, 'Integration metadata contains the wrong preview path.'],
  [integration.preview?.url === `${DEV_URL}preview.png`, 'Integration metadata contains the wrong preview URL.'],
  [sha256(builtIcon) === sha256(sourceIcon), 'Built loading icon is not byte-identical to public/icon.svg.'],
  [sha256(builtEiffelPhoto) === sha256(sourceEiffelPhoto), 'Built Eiffel Tower photo is not byte-identical to its licensed source asset.'],
  [sha256(builtColognePhoto) === sha256(sourceColognePhoto), 'Built Cologne Cathedral photo is not byte-identical to its licensed source asset.'],
  [thirdPartyNotices.includes('Natural Earth') && thirdPartyNotices.includes('world-atlas 2.0.2'), 'Built artifact is missing the Natural Earth/world-atlas notices.'],
  [thirdPartyNotices.includes('Eiffel tower-Paris.jpg') && thirdPartyNotices.includes('Exterior of Cologne Cathedral-.jpg'), 'Built artifact is missing the landmark photo notices.'],
  [serviceWorker.includes(`${BASE}THIRD_PARTY_NOTICES.txt`), 'The service worker does not cache the third-party notices.'],
  [serviceWorker.includes(`${BASE}landmarks/eiffel-tower.jpg`) && serviceWorker.includes(`${BASE}landmarks/cologne-cathedral.jpg`), 'The service worker does not cache both licensed landmark photos.'],
  [serviceWorker.includes("const CACHE = 'wolkenpost-essentials-v1.1.5-"), 'The service worker cache revision was not advanced for the stable Essentials vendor URLs.'],
  [essentialsLock.version === '1.1.5', 'Essentials lock is not pinned to v1.1.5.'],
  [essentialsLock.sharedCommit === '2942132ad3bf6cf39edc9f52ed918de6a230be23', 'Essentials lock contains the wrong Shared commit.'],
  [essentialsLock.loadingIconRuntimePath === 'icon.svg', 'Essentials lock contains the wrong icon runtime path.'],
  [JSON.stringify(Object.keys(essentialsLock.artifacts).sort()) === JSON.stringify([...essentialsLockedFiles].sort()), 'Essentials lock must contain exactly six consumer artifacts.'],
  ...shellRuntimeFiles.map((file, index) => [
    sha256(shellArtifacts[index]) === shellLock.artifacts[file],
    `Built shell runtime artifact ${file} does not match shell-lock.json.`,
  ]),
  ...shellRuntimeFiles.map((file) => [
    serviceWorker.includes(`${BASE}${shellDirectory}/${file}`),
    `The service worker does not cache shell runtime artifact ${file}.`,
  ]),
  ...layoutRuntimeFiles.map((file, index) => [
    sha256(layoutArtifacts[index]) === layoutLock.artifacts[file],
    `Built layout runtime artifact ${file} does not match layout-lock.json.`,
  ]),
  ...layoutRuntimeFiles.map((file) => [
    serviceWorker.includes(`${BASE}${layoutDirectory}/${file}`),
    `The service worker does not cache layout runtime artifact ${file}.`,
  ]),
  ...essentialsRuntimeFiles.map((file, index) => [
    sha256(essentialsArtifacts[index]) === essentialsLock.artifacts[file],
    `Built essentials runtime artifact ${file} does not match essentials-lock.json.`,
  ]),
  ...essentialsRuntimeFiles.map((file) => [
    serviceWorker.includes(`${BASE}${essentialsDirectory}/${file}`),
    `The service worker does not cache essentials runtime artifact ${file}.`,
  ]),
  ...essentialsLockedFiles.map((file, index) => [
    sha256(essentialsLockedArtifacts[index]) === essentialsLock.artifacts[file],
    `Vendored essentials artifact ${file} does not match essentials-lock.json.`,
  ]),
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
