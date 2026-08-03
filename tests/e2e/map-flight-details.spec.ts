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
    await page.route('https://api.open-meteo.com/**', fulfillWind);
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

    const mapButtons = page.getByTestId('world-map-stage').getByRole('button');
    const buttonCount = await mapButtons.count();
    expect(buttonCount).toBe(4);
    const buttonSizes = await mapButtons.evaluateAll((buttons) => buttons.map((button) => {
      const bounds = button.getBoundingClientRect();
      return { width: bounds.width, height: bounds.height };
    }));
    expect(buttonSizes.every((size) => size.width >= 44 && size.height >= 44)).toBe(true);

    const beforeLatitude = await map.getAttribute('data-selected-latitude');
    await map.dispatchEvent('pointerdown', {
      pointerId: 52,
      pointerType: 'touch',
      isPrimary: true,
      clientX: bounds!.x + bounds!.width * 0.537,
      clientY: bounds!.y + bounds!.height * 0.208,
    });
    await map.dispatchEvent('pointermove', {
      pointerId: 52,
      pointerType: 'touch',
      isPrimary: true,
      clientX: bounds!.x + bounds!.width * 0.62,
      clientY: bounds!.y + bounds!.height * 0.34,
    });
    await map.dispatchEvent('pointerup', {
      pointerId: 52,
      pointerType: 'touch',
      isPrimary: true,
      clientX: bounds!.x + bounds!.width * 0.62,
      clientY: bounds!.y + bounds!.height * 0.34,
    });
    await expect.poll(() => map.getAttribute('data-selected-latitude')).not.toBe(beforeLatitude);
    await expect(map).toHaveAttribute('data-wind-overlay', 'visible');
    await page.getByRole('button', { name: 'Land fokussieren' }).click();
    await expectNoHorizontalOverflow(page);
  });

  test('supports wind-on-map, country zoom, drag placement and playful boost', async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop', 'desktop map interaction gate');
    await page.route('https://api.open-meteo.com/**', fulfillWind);
    await page.goto('./');

    const map = page.getByTestId('world-map');
    const beforeLatitude = Number(await map.getAttribute('data-selected-latitude'));
    await map.scrollIntoViewIfNeeded();
    const bounds = await map.boundingBox();
    expect(bounds).not.toBeNull();

    await page.mouse.move(
      bounds!.x + bounds!.width * 0.537,
      bounds!.y + bounds!.height * 0.208,
    );
    await page.mouse.down();
    await page.mouse.move(
      bounds!.x + bounds!.width * 0.58,
      bounds!.y + bounds!.height * 0.28,
      { steps: 6 },
    );
    await page.mouse.up();

    await expect.poll(async () => Number(await map.getAttribute('data-selected-latitude')))
      .not.toBe(beforeLatitude);
    await expect(map).toHaveAttribute('data-drag-state', 'idle');
    await expect(map).toHaveAttribute('data-wind-overlay', 'visible');

    await page.getByRole('button', { name: 'Land fokussieren' }).click();
    await expect(map).toHaveAttribute('data-view-mode', 'country');
    const countryZoom = Number(await map.getAttribute('data-map-zoom'));
    expect(countryZoom).toBeGreaterThan(1);
    await page.getByRole('button', { name: 'Vergr\u00f6\u00dfern' }).click();
    await expect.poll(async () => Number(await map.getAttribute('data-map-zoom')))
      .toBeGreaterThan(countryZoom);

    await page.getByRole('radio', { name: 'Doppelter Spielwind' }).click();
    await page.getByRole('button', { name: 'Flug mit Live-Wind starten' }).click();
    await expect(page.getByTestId('play-wind-result')).toContainText('\u00d72');
    await expect(map).toHaveAttribute('data-auto-fit', 'enabled');
  });

  test('does not commit a cancelled map drag', async ({ page }) => {
    test.skip(test.info().project.name !== 'desktop', 'desktop pointer-cancel gate');
    await page.goto('./');
    const map = page.getByTestId('world-map');
    const original = await map.getAttribute('data-selected-key');
    await map.dispatchEvent('pointerdown', {
      pointerId: 41,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 720,
      clientY: 330,
    });
    await map.dispatchEvent('pointermove', {
      pointerId: 41,
      pointerType: 'touch',
      isPrimary: true,
      clientX: 780,
      clientY: 380,
    });
    await map.dispatchEvent('pointercancel', {
      pointerId: 41,
      pointerType: 'touch',
      isPrimary: true,
    });
    await expect(map).toHaveAttribute('data-selected-key', original ?? '');
    await expect(map).toHaveAttribute('data-drag-state', 'idle');
  });
});
