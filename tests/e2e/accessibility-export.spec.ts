import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import {
  expectNoHorizontalOverflow,
  fulfillWind,
  recordConsoleProblems,
  startFlight,
} from './helpers';

test.beforeEach(async ({ page }) => {
  await page.route('**/v1/forecast**', (route) => fulfillWind(route));
});

test('has no serious automated accessibility violations', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused accessibility check');
  const consoleProblems = recordConsoleProblems(page);
  await page.goto('./');
  await startFlight(page);
  const results = await new AxeBuilder({ page }).analyze();
  const serious = results.violations.filter((violation) =>
    violation.impact === 'serious' || violation.impact === 'critical',
  );
  expect(serious).toEqual([]);
  expect(consoleProblems).toEqual([]);
});

test('keeps light and dark themes free of serious accessibility violations', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused theme check');
  await page.goto('./');
  const theme = page.getByLabel('Darstellung');
  for (const value of ['light', 'dark']) {
    await theme.selectOption(value);
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((violation) =>
      violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(serious, `${value}: ${JSON.stringify(serious)}`).toEqual([]);
  }
  await theme.selectOption('system');
});

test('respects reduced motion and keeps the route static', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused reduced-motion check');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('./');
  await startFlight(page);
  await expect(page.getByTestId('world-map')).toHaveAttribute('data-motion', 'reduced');
});

test('reflows at a 320 CSS-pixel viewport without horizontal scrolling', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused 200% equivalent reflow check');
  await page.setViewportSize({ width: 320, height: 820 });
  await page.goto('./');
  await startFlight(page);
  await expectNoHorizontalOverflow(page);
});

test('exports a privacy-preserving PNG', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused export check');
  await page.goto('./');
  await startFlight(page);
  const downloadPromise = page.waitForEvent('download');
  await page.getByRole('button', { name: 'Ergebnisbild speichern' }).click();
  const download = await downloadPromise;
  expect(download.suggestedFilename()).toMatch(/^wolkenpost-\d{4}-\d{2}-\d{2}\.png$/);
  const currentUrl = new URL(page.url());
  expect(currentUrl.search).toBe('');
  expect(currentUrl.hash).toBe('');
});

test('loads the app shell again while offline after service worker installation', async ({ page, context }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused PWA offline check');
  const consoleProblems = recordConsoleProblems(page);
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
      });
    }
  });
  await expect.poll(() => page.evaluate(() => navigator.serviceWorker.controller !== null)).toBe(true);
  await context.setOffline(true);
  await expect(page.getByText('offline', { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: /Schick deine Zeichnung/ })).toBeVisible();
  await expect(page.getByTestId('connection-status')).toContainText(/offline|bereit/);
  expect(consoleProblems).toEqual([]);
});
