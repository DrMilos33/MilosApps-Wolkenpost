import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, fulfillWind, recordConsoleProblems, startFlight } from './helpers';

test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await page.route('**/v1/forecast**', (route) => fulfillWind(route));
});

test('round 1 keeps the flight space visible and makes the model route readable', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused product round 1');
  const consoleProblems = recordConsoleProblems(page);
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('./');
  await startFlight(page);

  const map = page.getByTestId('world-map');
  const heading = page.getByRole('heading', { name: /Angekommen nahe/ });
  await expect(heading).toBeFocused();
  await expect(map).toHaveAttribute('data-route-count', '1');
  await expect(map).toHaveAttribute('data-route-lens', 'visible');
  await expect(map).toHaveAttribute('data-progress', '1.00');
  await expect(page.locator('.map-canvas-shell')).toHaveCSS('position', 'sticky');
  await expect(map).toBeInViewport();

  const readout = page.getByTestId('flight-readout');
  for (const label of ['Start', 'Aktuell', 'Ziel', 'Wind', 'Höhe', 'Zeit']) {
    await expect(readout.getByText(label, { exact: true })).toBeVisible();
  }
  await expect(readout).toContainText('höherer Luftstrom · 850 hPa');
  await expect(readout.getByText(/km\/h .* nach/)).toBeVisible();
  await expect(readout).not.toContainText('0 km/h');
  await expect(page.getByText(/keine exakte Ballistik, Navigation oder Wetterwarnung/)).toBeVisible();
  await expectNoHorizontalOverflow(page);
  expect(consoleProblems).toEqual([]);
});

test('round 2 compares another profile on exactly the same wind snapshot and replays both', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused product round 2');
  let windRequests = 0;
  page.on('request', (request) => {
    if (request.url().includes('/v1/forecast')) windRequests += 1;
  });
  await page.goto('./');
  await startFlight(page);
  await expect.poll(() => windRequests).toBe(1);

  await page.getByLabel('Vergleichsprofil').selectOption('seed');
  const prediction = page.locator('.comparison-prediction');
  await expect(prediction).toContainText('Samen');
  await expect(prediction).toContainText('bodennah · 10 m');
  await expect(prediction).toContainText('3 h');
  await page.getByRole('button', { name: 'Profil vergleichen' }).click();

  const activeMap = page.getByTestId('world-map');
  await expect(activeMap).toHaveAttribute('data-route-count', '2');
  await expect(page.locator('.map-canvas-shell')).toHaveCSS('position', 'sticky');
  await expect(page.locator('[data-flight-profile]')).toHaveCount(2);
  await expect(page.locator('[data-flight-profile="cloud"]')).toContainText('Wolke');
  await expect(page.locator('[data-flight-profile="seed"]')).toContainText('Samen');
  await expect(page.getByText(/Gleicher Datenstand:/)).toBeVisible();
  await expect(page.locator('.comparison-outcome')).toContainText(/Windhöhe, Flugdauer und Driftprofil/);
  expect(windRequests).toBe(1);

  const map = page.getByTestId('world-map');
  await expect.poll(async () => Number(await map.getAttribute('data-progress')), {
    timeout: 9000,
  }).toBe(1);
  await page.getByRole('button', { name: 'Beide Flüge wiederholen' }).click();
  await expect.poll(async () => Number(await map.getAttribute('data-progress')))
    .toBeLessThan(0.5);
  await expect(page.locator('[data-flight-profile]')).toHaveCount(2);
  expect(windRequests).toBe(1);
});

test('completed and compared flights reflow on mobile and at 200 percent', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused product reflow');
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto('./');
  await startFlight(page);
  await page.getByLabel('Vergleichsprofil').selectOption('seed');
  await page.getByRole('button', { name: 'Profil vergleichen' }).click();
  await expectNoHorizontalOverflow(page);
  await expect(page.getByTestId('world-map')).toBeVisible();
  await expect(page.getByTestId('flight-readout')).toBeVisible();

  await page.setViewportSize({ width: 180, height: 400 });
  await expectNoHorizontalOverflow(page);
  const windScoutWidth = await page.getByTestId('wind-scout').evaluate((element) => ({
    clientWidth: element.clientWidth,
    scrollWidth: element.scrollWidth,
    overflowingChildren: [...element.querySelectorAll<HTMLElement>('*')]
      .filter((child) => child.scrollWidth > child.clientWidth + 1)
      .map((child) => ({
        className: child.className,
        clientWidth: child.clientWidth,
        scrollWidth: child.scrollWidth,
        tagName: child.tagName,
      })),
  }));
  expect(windScoutWidth.scrollWidth, JSON.stringify(windScoutWidth))
    .toBeLessThanOrEqual(windScoutWidth.clientWidth + 1);
  const clipped = await page.evaluate(() => [...document.querySelectorAll<HTMLElement>(
    '.flight-space *, .comparison-lab *, .result-actions *',
  )].filter((element) => {
    const style = getComputedStyle(element);
    if (style.display === 'none' || style.visibility === 'hidden') return false;
    return element.scrollWidth > element.clientWidth + 1;
  }).map((element) => element.className || element.tagName));
  expect(clipped).toEqual([]);
});
