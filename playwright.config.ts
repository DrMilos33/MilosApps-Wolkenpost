import { defineConfig, devices } from '@playwright/test';

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
    baseURL: 'http://127.0.0.1:4315',
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    locale: 'de-DE',
    timezoneId: 'Europe/Berlin',
  },
  webServer: {
    command: 'pnpm preview',
    url: 'http://127.0.0.1:4315/health.json',
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
