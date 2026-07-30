import { expect, test } from '@playwright/test';
import { fulfillWind, recordConsoleProblems } from './helpers';

test('handles a tap, a long self-intersecting stroke, and rapid object changes', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused stress check');
  const consoleProblems = recordConsoleProblems(page);
  await page.route('**/v1/forecast**', (route) => fulfillWind(route, 250));
  await page.goto('/');
  await page.getByRole('button', { name: 'Leeren' }).click();
  const canvas = page.getByTestId('drawing-canvas');
  const bounds = await canvas.boundingBox();
  expect(bounds).not.toBeNull();

  await canvas.dispatchEvent('pointerdown', {
    pointerId: 31,
    pointerType: 'mouse',
    isPrimary: true,
    button: 0,
    clientX: bounds!.x + 80,
    clientY: bounds!.y + 80,
  });
  await canvas.dispatchEvent('pointerup', {
    pointerId: 31,
    pointerType: 'mouse',
    isPrimary: true,
    button: 0,
    clientX: bounds!.x + 80,
    clientY: bounds!.y + 80,
  });
  await expect(canvas).toHaveAttribute('data-stroke-count', '1');

  await canvas.dispatchEvent('pointerdown', {
    pointerId: 32,
    pointerType: 'touch',
    isPrimary: true,
    clientX: bounds!.x + 40,
    clientY: bounds!.y + 70,
    pressure: 0.4,
  });
  for (let index = 0; index < 220; index += 1) {
    const angle = (index / 14) * Math.PI;
    await canvas.dispatchEvent('pointermove', {
      pointerId: 32,
      pointerType: 'touch',
      isPrimary: true,
      clientX: bounds!.x + bounds!.width / 2 + Math.sin(angle) * bounds!.width * 0.35,
      clientY: bounds!.y + bounds!.height / 2 + Math.sin(angle * 2) * bounds!.height * 0.32,
      pressure: 0.25 + (index % 10) / 20,
    });
  }
  await canvas.dispatchEvent('pointerup', {
    pointerId: 32,
    pointerType: 'touch',
    isPrimary: true,
    clientX: bounds!.x + bounds!.width / 2,
    clientY: bounds!.y + bounds!.height / 2,
    pressure: 0.4,
  });
  await expect(canvas).toHaveAttribute('data-stroke-count', '2');

  const names = [
    'Ballon ruhig schwebend, 12 Stunden',
    'Samen nah am Boden, 3 Stunden',
    'Papierflieger kurzer Flug, 90 Minuten',
    'Wolke hoch und weit, 18 Stunden',
  ];
  for (let repeat = 0; repeat < 4; repeat += 1) {
    for (const name of names) await page.getByRole('radio', { name }).click();
  }

  await page.getByRole('button', { name: 'Flug mit Live-Wind starten' }).click();
  await expect(page.getByText('Live-Wind wird gelesen …')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Flug mit Live-Wind starten' })).toHaveCount(0);
  await expect(page.getByRole('heading', { name: /Angekommen nahe/ })).toBeVisible();
  expect(consoleProblems).toEqual([]);
});

test('keeps all visible button targets at least 44 CSS pixels high', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused target-size check');
  await page.goto('/');
  const tooSmall = await page.locator('button:visible').evaluateAll((buttons) =>
    buttons
      .map((button) => {
        const bounds = button.getBoundingClientRect();
        return {
          label: button.getAttribute('aria-label') || button.textContent?.trim() || 'button',
          width: bounds.width,
          height: bounds.height,
        };
      })
      .filter(({ width, height }) => width < 44 || height < 44),
  );
  expect(tooSmall).toEqual([]);
});
