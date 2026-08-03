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

test('has no serious automated accessibility violations in German and English', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused accessibility check');
  const consoleProblems = recordConsoleProblems(page);
  await page.goto('./');
  await startFlight(page);
  expect(consoleProblems).toEqual([]);
  for (const locale of ['de', 'en'] as const) {
    if (locale === 'en') {
      await page.locator('milos-app-shell')
        .getByRole('button', { name: 'EN', exact: true })
        .click();
    }
    const results = await new AxeBuilder({ page }).analyze();
    const serious = results.violations.filter((violation) =>
      violation.impact === 'serious' || violation.impact === 'critical',
    );
    expect(serious, `${locale}: ${JSON.stringify(serious)}`).toEqual([]);
  }
  // Axe's own page instrumentation attempts temporary inline styles. Under
  // the strict preview CSP Chromium reports those blocked test-only attempts;
  // app runtime CSP violations are covered before Axe and in visual-contract.
});

test('keeps light and dark themes free of serious accessibility violations', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused theme check');
  await page.goto('./');
  await page.getByText('Darstellung, Bewegung und lokale Daten', { exact: true }).click();
  const theme = page.getByLabel('Darstellung');
  for (const value of ['light', 'dark']) {
    await theme.selectOption(value);
    const results = await new AxeBuilder({ page }).include('.app-content').analyze();
    const serious = results.violations.filter((violation) =>
      violation.impact === 'serious' || violation.impact === 'critical',
    );
    const shellContrast = await page.locator('milos-app-shell').evaluate((shell) => {
      const channels = (value: string) => {
        const numbers = value.match(/[\d.]+/g)?.map(Number) ?? [];
        if (value.startsWith('color(')) return numbers.slice(0, 3);
        return numbers.slice(0, 3).map((channel) => channel / 255);
      };
      const luminance = (value: string) => channels(value)
        .map((channel) => channel <= 0.04045 ? channel / 12.92 : ((channel + 0.055) / 1.055) ** 2.4)
        .reduce((sum, channel, index) => sum + channel * [0.2126, 0.7152, 0.0722][index], 0);
      const ratio = (foreground: string, background: string) => {
        const values = [luminance(foreground), luminance(background)].sort((a, b) => b - a);
        return (values[0] + 0.05) / (values[1] + 0.05);
      };
      return [...shell.shadowRoot!.querySelectorAll<HTMLElement>('.control, .skip')]
        .filter((control) => getComputedStyle(control).display !== 'none')
        .map((control) => {
          const style = getComputedStyle(control);
          return {
            label: control.textContent?.trim().replace(/\s+/g, ' '),
            ratio: ratio(style.color, style.backgroundColor),
          };
        });
    });
    expect(serious, `${value}: ${JSON.stringify(serious)}`).toEqual([]);
    expect(shellContrast.filter(({ ratio }) => ratio < 4.5), value).toEqual([]);
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
  const overflowingObjectOptions = await page.locator('.object-option').evaluateAll((options) =>
    options
      .filter((option) => option.scrollWidth > option.clientWidth + 1)
      .map((option) => option.textContent?.trim().replace(/\s+/g, ' ')),
  );
  expect(overflowingObjectOptions).toEqual([]);
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
  await expect(page.getByRole('heading', { name: 'Zeichne. Lass es fliegen.' })).toBeVisible();
  await expect(page.getByTestId('connection-status')).toContainText(/offline|bereit/);
  expect(consoleProblems).toEqual([]);
});
