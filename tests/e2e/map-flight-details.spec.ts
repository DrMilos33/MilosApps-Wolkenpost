import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, fulfillWind, recordConsoleProblems } from './helpers';

test.describe('map and flight-detail experience', () => {
  test('offers object-specific outlines, a prominent country map and a reusable wind preview', async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop', 'desktop product-detail gate');
    const consoleProblems = recordConsoleProblems(page);
    let windRequests = 0;
    await page.route('https://api.open-meteo.com/**', async (route) => {
      windRequests += 1;
      await fulfillWind(route);
    });

    await page.goto('./');
    const outlineGroup = page.getByRole('radiogroup', { name: 'Umrissvariante' });
    await expect(outlineGroup.getByRole('radio')).toHaveCount(3);
    await expect(outlineGroup.getByRole('radio', { name: 'Haufenwolke' })).toHaveAttribute('aria-checked', 'true');

    await page.getByRole('radiogroup', { name: 'Flugobjekt' })
      .getByRole('radio', { name: /Ballon/ })
      .click();
    await expect(outlineGroup.getByRole('radio')).toHaveText(['Rund', 'Tropfen', 'Gestreift']);
    await outlineGroup.getByRole('radio', { name: 'Gestreift' }).click();
    await expect(outlineGroup.getByRole('radio', { name: 'Gestreift' })).toHaveAttribute('aria-checked', 'true');

    const geometry = await page.evaluate(() => {
      const drawing = document.querySelector<HTMLElement>('.drawing-step')!.getBoundingClientRect();
      const mapStep = document.querySelector<HTMLElement>('.map-step')!.getBoundingClientRect();
      const map = document.querySelector<HTMLCanvasElement>('[data-testid="world-map"]')!.getBoundingClientRect();
      return {
        drawingBottom: drawing.bottom + window.scrollY,
        mapStepTop: mapStep.top + window.scrollY,
        mapWidth: map.width,
        mapHeight: map.height,
      };
    });
    expect(geometry.mapStepTop).toBeGreaterThanOrEqual(geometry.drawingBottom - 2);
    expect(geometry.mapWidth).toBeGreaterThan(900);
    expect(geometry.mapHeight).toBeGreaterThan(390);
    await expect(page.getByTestId('world-map')).toHaveAttribute('data-country-detail', 'natural-earth-110m');
    expect(Number(await page.getByTestId('world-map').getAttribute('data-country-count'))).toBeGreaterThan(170);

    await page.getByRole('button', { name: 'Wind an diesem Ort prüfen' }).click();
    await expect(page.locator('[data-wind-level]')).toHaveCount(3);
    await expect(page.locator('[data-wind-level="925hPa"]')).toHaveClass(/is-selected/);
    await expect(page.locator('[data-wind-level="10m"] strong')).toContainText('km/h');
    await expect(page.locator('[data-wind-level="925hPa"] strong')).toContainText('nach');
    expect(windRequests).toBe(1);

    await page.getByRole('button', { name: 'Flug mit Live-Wind starten' }).click();
    await expect(page.getByRole('heading', { name: /Angekommen nahe/ })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'An diesen Orten ging es vorbei' })).toBeVisible();
    expect(windRequests).toBe(1);
    expect(consoleProblems).toEqual([]);
  });

  test('keeps the detailed map useful and overflow-free on a narrow phone', async ({ page }) => {
    test.skip(test.info().project.name !== 'phone-portrait', 'phone product-detail gate');
    await page.goto('./');
    const map = page.getByTestId('world-map');
    await map.scrollIntoViewIfNeeded();
    const bounds = await map.boundingBox();
    expect(bounds).not.toBeNull();
    expect(bounds!.width).toBeGreaterThanOrEqual(290);
    expect(bounds!.height).toBeGreaterThanOrEqual(260);
    await expectNoHorizontalOverflow(page);
    await expect(page.getByTestId('wind-scout')).toBeVisible();
    await expect(page.getByRole('radiogroup', { name: 'Umrissvariante' }).getByRole('radio')).toHaveCount(3);
  });
});
