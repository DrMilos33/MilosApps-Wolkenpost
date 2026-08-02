import { expect, test } from '@playwright/test';
import { fulfillWind, startFlight } from './helpers';

test('shows slow loading and allows cancellation without losing the drawing', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused state-transition check');
  await page.route('**/v1/forecast**', async (route) => {
    await new Promise((resolve) => setTimeout(resolve, 1200));
    if (!route.request().failure()) await route.abort();
  });
  await page.goto('./');
  const count = await page.getByTestId('drawing-canvas').getAttribute('data-stroke-count');
  await page.getByRole('button', { name: 'Flug mit Live-Wind starten' }).click();
  await expect(page.getByText('Live-Wind wird gelesen …')).toBeVisible();
  await page.getByRole('button', { name: 'Abbrechen' }).click();
  await expect(page.getByTestId('drawing-canvas')).toHaveAttribute('data-stroke-count', count!);
  await expect(page.getByRole('button', { name: 'Flug mit Live-Wind starten' })).toBeEnabled();
});

test('recovers from network failure using explicitly labelled demo wind', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused recovery check');
  await page.route('**/v1/forecast**', (route) => route.abort('failed'));
  await page.goto('./');
  await page.getByRole('button', { name: 'Flug mit Live-Wind starten' }).click();
  await expect(page.getByRole('heading', { name: /Live-Wind ist gerade nicht erreichbar/ })).toBeVisible();
  await page.getByRole('button', { name: 'Bewusst mit Demo-Wind starten' }).click();
  await expect(page.getByText('synthetischer Demo-Wind')).toBeVisible();
  await expect(page.getByText(/synthetisches Testfeld/)).toBeVisible();
});

test('distinguishes timeout and retry from network failure', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused timeout check');
  await page.addInitScript(() => {
    (window as typeof window & { __WOLKENPOST_QA_TIMEOUT__?: number }).__WOLKENPOST_QA_TIMEOUT__ = 120;
  });
  let attempts = 0;
  await page.route('**/v1/forecast**', async (route) => {
    attempts += 1;
    if (attempts === 1) {
      await new Promise((resolve) => setTimeout(resolve, 400));
      return;
    }
    await fulfillWind(route);
  });
  await page.goto('./');
  await page.getByRole('button', { name: 'Flug mit Live-Wind starten' }).click();
  await expect(page.getByRole('heading', { name: /zu lange gebraucht/ })).toBeVisible();
  await page.getByRole('button', { name: 'Live-Wind erneut versuchen' }).click();
  await expect(page.getByRole('heading', { name: /Angekommen nahe/ })).toBeVisible();
});

test('keeps map and search usable when geolocation is denied', async ({ page, context }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused permission check');
  await context.clearPermissions();
  await page.goto('./');
  await page.getByRole('button', { name: 'Meinen Ort verwenden' }).click();
  await expect(page.getByText(/Ortung wurde nicht erlaubt/)).toBeAttached();
  await page.getByLabel('Ort oder Region').fill('Paris');
  await page.getByRole('button', { name: 'Suchen' }).click();
  await page.getByRole('option', { name: /Paris Île-de-France · Frankreich/ }).click();
  await expect(page.getByText('Gewählter Start').locator('..')).toContainText('Paris');
});

test('works with explicit demo wind while offline', async ({ page, context }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused offline check');
  await page.goto('./');
  await context.setOffline(true);
  await page.getByRole('button', { name: 'Flug mit Live-Wind starten' }).click();
  await expect(page.getByRole('heading', { name: /Du bist gerade offline/ })).toBeVisible();
  await page.getByRole('button', { name: 'Bewusst mit Demo-Wind starten' }).click();
  await expect(page.getByText('synthetischer Demo-Wind')).toBeVisible();
});

test('retains the finished route after app background and resume', async ({ page, context }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused resume check');
  await page.route('**/v1/forecast**', (route) => fulfillWind(route));
  await page.goto('./');
  await startFlight(page);
  const distance = await page.locator('.result-metrics article').first().textContent();
  const secondPage = await context.newPage();
  await secondPage.goto('about:blank');
  await secondPage.bringToFront();
  await page.bringToFront();
  await expect(page.locator('.result-metrics article').first()).toContainText(distance!.replace(/\s+/g, ' ').trim());
});
