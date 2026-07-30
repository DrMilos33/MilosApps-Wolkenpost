import { defineConfig, devices } from '@playwright/test';

const LOCAL_BASE_URL = 'http://127.0.0.1:4315/';
const environment = (globalThis as typeof globalThis & {
  process?: { env: Record<string, string | undefined> };
}).process?.env;
const externalBaseUrl = environment?.CLOUD_POST_E2E_BASE_URL;
const baseURL = externalBaseUrl
  ? `${externalBaseUrl.replace(/\/+$/, '')}/`
  : LOCAL_BASE_URL;

export default defineConfig({
  testDir: './tests/e2e',
  globalSetup: './tests/e2e/global-setup.ts',
  outputDir: './test-results',
  fullyParallel: false,
  forbidOnly: true,
  retries: 0,
  workers: 1,
  reporter: [['list'], ['html', { outputFolder: 'playwright-report', open: 'never' }]],
  use: {
    baseURL,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  },
  webServer: externalBaseUrl ? undefined : {
    command: 'node ./node_modules/vite/bin/vite.js preview --host 127.0.0.1 --port 4315 --strictPort',
    url: `${LOCAL_BASE_URL}health.json`,
    reuseExistingServer: false,
    timeout: 30_000,
  },
  projects: [
    {
      name: 'phone-portrait',
      use: { ...devices['Pixel 7'] },
    },
    {
      name: 'phone-landscape',
      use: {
        ...devices['Pixel 7'],
        viewport: { width: 844, height: 390 },
      },
    },
    {
      name: 'tablet',
      use: { ...devices['iPad Mini'] },
    },
    {
      name: 'desktop',
      use: {
        ...devices['Desktop Chrome'],
        viewport: { width: 1440, height: 1000 },
      },
    },
  ],
});
