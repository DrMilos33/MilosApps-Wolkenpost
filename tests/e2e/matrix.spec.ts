import { expect, test } from '@playwright/test';
import {
  expectNoHorizontalOverflow,
  fulfillWind,
  recordConsoleProblems,
  startFlight,
} from './helpers';

// Page-level request mocks are not reliable for requests that a browser routes
// through an active service worker. PWA behavior has its own dedicated test.
test.use({ serviceWorkers: 'block' });

test.beforeEach(async ({ page }) => {
  await page.route('**/v1/forecast**', (route) => fulfillWind(route));
});

test('complete wind journey is usable without login', async ({ page }) => {
  const consoleProblems = recordConsoleProblems(page);
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Deine Zeichnung hebt ab.' })).toBeVisible();
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(page.locator('form')).toHaveCount(0);
  await expect(page.locator('milos-app-shell').getByText('ohne Anmeldung', { exact: false })).toBeVisible();

  await page.getByRole('radio', { name: /Ballon/ }).click();
  await page.getByTestId('map-control-widget').locator(':scope > summary').click();
  await page.getByLabel('Ort oder Region').fill('Tokio');
  await page.getByRole('button', { name: 'Suchen' }).click();
  await page.getByRole('option', { name: /Tokio Tokio · Japan/ }).click();
  await startFlight(page);

  await expect(page.getByText('echte Modelldaten')).toBeVisible();
  await expect(page.getByText(/Open‑Meteo · NOAA GFS global/)).toBeVisible();
  const currentUrl = new URL(page.url());
  expect(currentUrl.search).toBe('');
  expect(currentUrl.hash).toBe('');
  await expectNoHorizontalOverflow(page);
  expect(consoleProblems).toEqual([]);
});

test('drawing accepts a pointer stroke and safely discards pointer cancellation', async ({ page }) => {
  await page.goto('./');
  const canvas = page.getByTestId('drawing-canvas');
  const before = Number(await canvas.getAttribute('data-stroke-count'));
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();

  await canvas.dispatchEvent('pointerdown', {
    pointerId: 21,
    pointerType: 'touch',
    isPrimary: true,
    clientX: bounds!.x + 40,
    clientY: bounds!.y + 40,
    pressure: 0.4,
  });
  await canvas.dispatchEvent('pointermove', {
    pointerId: 21,
    pointerType: 'touch',
    isPrimary: true,
    clientX: bounds!.x + 130,
    clientY: bounds!.y + 110,
    pressure: 0.7,
  });
  await canvas.dispatchEvent('pointercancel', {
    pointerId: 21,
    pointerType: 'touch',
    isPrimary: true,
  });
  await expect(canvas).toHaveAttribute('data-stroke-count', String(before));

  await canvas.dispatchEvent('pointerdown', {
    pointerId: 22,
    pointerType: 'pen',
    isPrimary: true,
    clientX: bounds!.x + 50,
    clientY: bounds!.y + 60,
    pressure: 0.3,
  });
  await canvas.dispatchEvent('pointermove', {
    pointerId: 22,
    pointerType: 'pen',
    isPrimary: true,
    clientX: bounds!.x + 170,
    clientY: bounds!.y + 130,
    pressure: 0.8,
  });
  await canvas.dispatchEvent('pointerup', {
    pointerId: 22,
    pointerType: 'pen',
    isPrimary: true,
    clientX: bounds!.x + 170,
    clientY: bounds!.y + 130,
    pressure: 0.2,
  });
  await expect(canvas).toHaveAttribute('data-stroke-count', String(before + 1));
});

test('keyboard can create a drawing and choose a map position', async ({ page }) => {
  await page.goto('./');
  await page.getByRole('button', { name: 'Leeren' }).click();
  const canvas = page.getByTestId('drawing-canvas');
  await canvas.focus();
  await page.keyboard.press('Space');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowRight');
  await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Space');
  await expect(canvas).toHaveAttribute('data-stroke-count', '1');

  const map = page.getByTestId('world-map');
  const longitudeControl = page.locator('.coordinate-controls input[type="range"]').nth(1);
  const beforeLongitude = Number(await longitudeControl.inputValue());
  await map.focus();
  await page.keyboard.press('ArrowRight');
  await expect.poll(async () => Number(await longitudeControl.inputValue())).toBeGreaterThan(beforeLongitude);
  await startFlight(page);
});
