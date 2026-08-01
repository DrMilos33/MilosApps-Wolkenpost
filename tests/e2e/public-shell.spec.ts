import { expect, test } from '@playwright/test';
import { expectNoHorizontalOverflow, fulfillWind, recordConsoleProblems } from './helpers';

test('shell and complete app switch to English and persist across reload', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused locale and shell contract check');
  const consoleProblems = recordConsoleProblems(page);
  await page.route('**/v1/forecast**', (route) => fulfillWind(route));
  await page.goto('./');

  const shell = page.locator('milos-app-shell');
  await expect(shell).toHaveCount(1);
  await expect(shell.getByRole('button', { name: 'DE', exact: true })).toHaveAttribute('aria-pressed', 'true');
  await expect(shell.getByRole('link', { name: /Alle Apps/ }))
    .toHaveAttribute('href', 'https://dev.milos-apps.de/apps');
  await expect(shell.getByText('DEV', { exact: true })).toBeVisible();
  await expect(page.locator('h1')).toHaveCount(1);

  await shell.getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page).toHaveTitle('Cloud Post – Your drawing travels with the wind');
  await expect(page.getByRole('heading', { level: 1, name: /Send your drawing travelling/ })).toBeVisible();
  await expect(page.getByRole('radio', { name: /Balloon floating gently/ })).toBeVisible();
  await expect(page.getByLabel('Search for a place')).toBeVisible();
  await page.getByText('Appearance, motion and local data', { exact: true }).click();
  await expect(page.getByLabel('Appearance')).toBeVisible();
  await expect(shell.getByRole('link', { name: /All apps/ }))
    .toHaveAttribute('href', 'https://dev.milos-apps.de/apps');
  await expect(shell.getByRole('link', { name: 'Legal notice' }))
    .toHaveAttribute('href', 'https://dev.milos-apps.de/impressum');
  await expect(shell.getByRole('link', { name: 'Privacy' }))
    .toHaveAttribute('href', 'https://dev.milos-apps.de/datenschutz');

  await page.getByLabel('Search for a place').fill('Tokyo');
  await page.getByRole('button', { name: /Tokyo Japan/ }).click();
  await page.getByRole('button', { name: 'Start flight with live wind' }).click();
  await expect(page.getByRole('heading', { name: /Arrived near/ })).toBeVisible();
  await expect(page.getByText('real model data')).toBeVisible();

  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.locator('milos-app-shell').getByRole('button', { name: 'EN', exact: true }))
    .toHaveAttribute('aria-pressed', 'true');
  await expect(page.getByRole('heading', { level: 1, name: /Send your drawing travelling/ })).toBeVisible();
  await expect.poll(() => page.evaluate(() => localStorage.getItem('milosapps.cloud-post.language')))
    .toBe('en');
  expect(consoleProblems).toEqual([]);
});

test('corrupt language storage safely falls back to German', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused locale fallback check');
  await page.addInitScript(() => localStorage.setItem('milosapps.cloud-post.language', 'fr'));
  await page.goto('./');
  await expect(page.locator('html')).toHaveAttribute('lang', 'de');
  await expect(page.getByRole('heading', { level: 1, name: /Schick deine Zeichnung/ })).toBeVisible();
  await expect(page.locator('milos-app-shell').getByRole('button', { name: 'DE', exact: true }))
    .toHaveAttribute('aria-pressed', 'true');
});

test('shell is keyboard-visible, touch-sized, no-login and overflow-free', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused shared-shell matrix');
  await page.goto('./');
  const shell = page.locator('milos-app-shell');

  await page.keyboard.press('Tab');
  const skip = shell.locator('.skip');
  await expect(skip).toBeFocused();
  expect(await skip.evaluate((element) => getComputedStyle(element).outlineStyle)).not.toBe('none');

  const undersized = await shell.locator('button, a').evaluateAll((controls) => controls
    .filter((control) => {
      const style = getComputedStyle(control);
      return style.visibility !== 'hidden' && style.display !== 'none';
    })
    .map((control) => {
      const bounds = control.getBoundingClientRect();
      return { label: control.textContent?.trim(), width: bounds.width, height: bounds.height };
    })
    .filter(({ width, height }) => width < 44 || height < 44));
  expect(undersized).toEqual([]);
  await expect(page.locator('input[type="password"]')).toHaveCount(0);
  await expect(page.locator('form')).toHaveCount(0);

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    // CSS-pixel equivalent of a 360 x 800 viewport at 200% browser zoom.
    { width: 180, height: 400 },
    { width: 195, height: 422 },
  ]) {
    await page.setViewportSize(viewport);
    await expectNoHorizontalOverflow(page);
    const bottomGap = await page.evaluate(() => {
      const footer = document.querySelector('milos-app-shell')?.shadowRoot?.querySelector('footer');
      if (!footer) return Number.POSITIVE_INFINITY;
      const footerBottom = footer.getBoundingClientRect().bottom + window.scrollY;
      return document.documentElement.scrollHeight - footerBottom;
    });
    expect(bottomGap, `${viewport.width}x${viewport.height}`).toBeLessThanOrEqual(1);
  }
});

test('English shell and app remain available after an offline reload', async ({ page, context }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused locale/offline boundary');
  await page.goto('./');
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => {
        navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true });
      });
    }
  });
  await page.locator('milos-app-shell').getByRole('button', { name: 'EN', exact: true }).click();
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('heading', { level: 1, name: /Send your drawing travelling/ })).toBeVisible();
  await expect(page.getByTestId('connection-status')).toContainText(/offline|ready/);
});
