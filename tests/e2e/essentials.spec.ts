import { expect, test } from '@playwright/test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import {
  expectNoHorizontalOverflow,
  fulfillWind,
  recordConsoleProblems,
  startFlight,
} from './helpers';

const externalBaseUrl = process.env.CLOUD_POST_E2E_BASE_URL;

declare global {
  interface Window {
    __wolkenpostSharePayload?: {
      title?: string;
      text?: string;
      url?: string;
      files?: Array<{ name: string; type: string; size: number }>;
    };
    __wolkenpostClipboard?: string;
  }
}

async function dismissPrivacy(page: import('@playwright/test').Page) {
  const dismiss = page.getByRole('button', { name: /Verstanden|Got it/ });
  if (await dismiss.isVisible()) await dismiss.click();
}

test.beforeEach(async ({ page }) => {
  await page.route('**/v1/forecast**', (route) => fulfillWind(route));
});

test('fresh and delayed startup stays compact until the app is truly ready', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused startup contract check');
  await page.setViewportSize({ width: 390, height: 844 });
  let releaseApp!: () => void;
  const appReleased = new Promise<void>((resolve) => { releaseApp = resolve; });
  await page.route('**/assets/index-*.js', async (route) => {
    await appReleased;
    await route.continue();
  });

  const navigation = page.goto('./', { waitUntil: 'domcontentloaded' });
  const loader = page.locator('[data-milos-app-loading]');
  await expect(loader).toBeVisible();
  const initial = await loader.evaluate((element) => {
    const icon = element.querySelector<HTMLElement>('[data-milos-loading-icon]')!;
    const bounds = icon.getBoundingClientRect();
    return {
      width: bounds.width,
      height: bounds.height,
      titleTag: element.querySelector('[data-milos-loading-title]')?.tagName,
      title: element.querySelector('[data-milos-loading-title]')?.textContent,
      message: element.querySelector('[data-milos-loading-message]')?.textContent,
    };
  });
  expect(Math.max(initial.width, initial.height)).toBeLessThanOrEqual(48);
  expect(initial.titleTag).toBe('P');
  expect(initial.title).toBe('Wolkenpost');
  expect(initial.message).toBe('Wolkenpost wird geöffnet …');
  await expectNoHorizontalOverflow(page);

  await page.setViewportSize({ width: 1440, height: 900 });
  const desktopIconSize = await loader.locator('[data-milos-loading-icon]').evaluate((icon) => {
    const bounds = icon.getBoundingClientRect();
    return Math.max(bounds.width, bounds.height);
  });
  expect(desktopIconSize).toBeLessThanOrEqual(56);
  await expectNoHorizontalOverflow(page);

  releaseApp();
  await navigation;
  await expect(loader).toBeHidden();
  await expect(page.getByRole('heading', { name: 'Zeichne. Lass es fliegen.' })).toBeVisible();
});

test('startup stays honest while bootstrap is delayed and hands off once ready', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused startup race regression');
  let releaseBootstrap!: () => void;
  const bootstrapReleased = new Promise<void>((resolve) => { releaseBootstrap = resolve; });
  await page.route('**/vendor/milosapps-essentials/v1/bootstrap.js', async (route) => {
    await bootstrapReleased;
    await route.continue();
  });

  const navigation = page.goto('./', { waitUntil: 'domcontentloaded' });
  const loader = page.locator('[data-milos-app-loading]');
  await expect(loader).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Zeichne. Lass es fliegen.' })).toBeHidden();

  releaseBootstrap();
  await navigation;
  await expect(page.getByRole('heading', { name: 'Zeichne. Lass es fliegen.' })).toBeVisible();
  await expect(loader).toBeHidden();
});

test('no-cookies mode has no banner or consent state and keeps privacy information reachable', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused privacy contract check');
  await page.addInitScript(() => {
    localStorage.setItem('milosapps.cloud-post.privacyNotice.v1', 'dismissed');
  });
  await page.goto('./');
  const notice = page.locator('[data-milos-privacy-notice]');
  await expect(notice).toHaveCount(0);
  const privacyInfo = page.locator('[data-milos-privacy-info]');
  await expect(privacyInfo).toBeVisible();
  await expect(privacyInfo).toHaveAttribute('href', 'https://dev.milos-apps.de/datenschutz');
  await expect(page.getByRole('button', { name: /Akzeptieren|Ablehnen|Verstanden/ })).toHaveCount(0);
  await expect.poll(() => page.evaluate(() => (
    localStorage.getItem('milosapps.cloud-post.privacyNotice.v1')
  ))).toBeNull();

  await page.locator('milos-app-shell').getByRole('button', { name: 'EN', exact: true }).click();
  await expect(page.locator('[data-milos-privacy-info]')).toHaveText('Privacy');
  await page.reload();
  await expect(notice).toHaveCount(0);
  await expect(page.locator('[data-milos-privacy-info]')).toHaveText('Privacy');
});

test('place search is explicit, normalized and works for cities and regions', async ({ page }) => {
  await page.goto('./');
  await dismissPrivacy(page);
  const placeSearch = page.locator('milos-place-search');
  const input = placeSearch.getByRole('combobox', { name: 'Ort oder Region' });

  await input.fill('Bayern');
  await expect(placeSearch.getByRole('option')).toHaveCount(0);
  await input.press('Enter');
  const munich = placeSearch.getByRole('option', { name: /München Bayern · Deutschland/ });
  await expect(munich).toBeVisible();
  await munich.click();
  await expect(page.locator('.selected-place')).toContainText('München');
  await expect(page.locator('.selected-place')).toContainText('Bayern · Deutschland');

  await input.fill('Atlantis');
  await input.press('Enter');
  await expect(placeSearch).toContainText('Kein passender Ort gefunden.');

  await page.locator('milos-app-shell').getByRole('button', { name: 'EN', exact: true }).click();
  const englishInput = placeSearch.getByRole('combobox', { name: 'Place or region' });
  await expect(englishInput).toHaveValue('');
  await expect(page.locator('.selected-place')).toContainText('Munich');
  await expect(page.locator('.selected-place')).toContainText('Bavaria · Germany');
  await englishInput.fill('California');
  await placeSearch.getByRole('button', { name: 'Search' }).click();
  await expect(placeSearch.getByRole('option', {
    name: /San Francisco California · USA/,
  })).toBeVisible();
  await page.reload();
  await expect(page.locator('html')).toHaveAttribute('lang', 'en');
  await expect(page.getByRole('combobox', { name: 'Place or region' })).toBeVisible();
});

test('place search suppresses stale results after replacement, Escape and reconnect', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused place lifecycle check');
  await page.goto('./');
  await page.evaluate(() => {
    const element = document.querySelector('milos-place-search') as HTMLElement & {
      setSearchProvider(provider: (request: { query: string }) => Promise<unknown[]>): void;
    };
    const target = window as typeof window & {
      __placeResolvers?: Record<string, (value: unknown[]) => void>;
    };
    target.__placeResolvers = {};
    element.setSearchProvider(({ query }) => new Promise((resolve) => {
      target.__placeResolvers![query] = resolve;
    }));
  });
  const place = page.locator('milos-place-search');
  const input = place.getByRole('combobox', { name: 'Ort oder Region' });
  await input.fill('Berlin');
  await input.press('Enter');
  await input.fill('London');
  await input.press('Enter');
  await page.evaluate(() => {
    const target = window as typeof window & { __placeResolvers?: Record<string, (value: unknown[]) => void> };
    target.__placeResolvers?.London?.([{
      id: 'london', name: 'London', region: 'England', country: 'United Kingdom',
      countryCode: 'GB', latitude: 51.5, longitude: -0.1, type: 'city',
    }]);
    target.__placeResolvers?.Berlin?.([{
      id: 'berlin', name: 'Berlin', region: 'Berlin', country: 'Deutschland',
      countryCode: 'DE', latitude: 52.5, longitude: 13.4, type: 'city',
    }]);
  });
  await expect(place.getByRole('option', { name: /London England · United Kingdom/ })).toBeVisible();
  await expect(place.getByRole('option', { name: /Berlin Berlin · Deutschland/ })).toHaveCount(0);

  await input.press('Escape');
  await expect(place.getByRole('option')).toHaveCount(0);
  await input.fill('Paris');
  await input.press('Enter');
  await page.evaluate(() => {
    const element = document.querySelector('milos-place-search')!;
    const parent = element.parentElement!;
    element.remove();
    parent.append(element);
    const target = window as typeof window & { __placeResolvers?: Record<string, (value: unknown[]) => void> };
    target.__placeResolvers?.Paris?.([{
      id: 'paris', name: 'Paris', region: 'Île-de-France', country: 'France',
      countryCode: 'FR', latitude: 48.8, longitude: 2.3, type: 'city',
    }]);
  });
  await expect(place.getByRole('option')).toHaveCount(0);
});

test('shared result share uses native, clipboard and cancellation paths without private URLs', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused sharing contract check');
  const expectedShareUrl = externalBaseUrl ?? 'http://127.0.0.1:4315/';
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', {
      configurable: true,
      value: () => true,
    });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async (payload: ShareData) => {
        window.__wolkenpostSharePayload = {
          title: payload.title,
          text: payload.text,
          url: payload.url,
          files: payload.files?.map((file) => ({
            name: file.name,
            type: file.type,
            size: file.size,
          })),
        };
      },
    });
  });
  await page.goto('./?private-location=berlin#drawing');
  await dismissPrivacy(page);
  await startFlight(page);
  const share = page.locator('milos-share-button');
  await share.getByRole('button', { name: 'Teilen' }).click();
  await expect(share.locator('[data-milos-share-status]')).toHaveText('');
  await expect(share.locator('[data-milos-share-status]')).toHaveAttribute('data-visible', 'false');
  await expect.poll(() => page.evaluate(() => Boolean(window.__wolkenpostSharePayload))).toBe(true);
  await expect(page.locator('p.sr-only[aria-live="polite"]')).not.toContainText('Geteilt');
  const measureShareGeometry = () => share.evaluate((element) => {
    const bounds = element.getBoundingClientRect();
    const container = element.parentElement!.getBoundingClientRect();
    return {
      width: bounds.width,
      height: bounds.height,
      offsetX: bounds.x - container.x,
      offsetY: bounds.y - container.y,
    };
  });
  const initialShareGeometry = await measureShareGeometry();
  const nativePayload = await page.evaluate(() => window.__wolkenpostSharePayload);
  expect(nativePayload?.url).toBe(expectedShareUrl);
  expect(nativePayload?.files?.[0]).toMatchObject({ type: 'image/png' });
  expect(nativePayload?.files?.[0].name).toMatch(/^wolkenpost-\d{4}-\d{2}-\d{2}\.png$/);

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', { configurable: true, value: undefined });
    Object.defineProperty(navigator.clipboard, 'writeText', {
      configurable: true,
      value: async (value: string) => { window.__wolkenpostClipboard = value; },
    });
  });
  await share.getByRole('button', { name: 'Teilen' }).click();
  await expect(share.locator('[data-milos-share-status]')).toHaveText('Link kopiert');
  expect(await measureShareGeometry()).toEqual(initialShareGeometry);
  const copied = await page.evaluate(() => window.__wolkenpostClipboard);
  expect(copied).toContain(expectedShareUrl);
  expect(copied).not.toContain('private-location');
  expect(copied).not.toContain('#drawing');

  await page.evaluate(() => {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: async () => { throw new DOMException('cancelled', 'AbortError'); },
    });
  });
  await share.getByRole('button', { name: 'Teilen' }).click();
  await expect(share.locator('[data-milos-share-status]')).toHaveText('');
  expect(await measureShareGeometry()).toEqual(initialShareGeometry);
});

test('pending share is invalidated by disconnect and reconnect', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused share lifecycle check');
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'canShare', { configurable: true, value: () => true });
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: () => new Promise<void>((resolve) => {
        (window as typeof window & { __resolveShare?: () => void }).__resolveShare = resolve;
      }),
    });
  });
  await page.goto('./');
  await startFlight(page);
  const share = page.locator('milos-share-button');
  await share.getByRole('button', { name: 'Teilen' }).click();
  await page.evaluate(() => {
    const element = document.querySelector('milos-share-button')!;
    const parent = element.parentElement!;
    element.remove();
    parent.append(element);
    (window as typeof window & { __resolveShare?: () => void }).__resolveShare?.();
  });
  await expect(share.locator('[data-milos-share-status]')).toHaveText('');
  await expect(share.getByRole('button', { name: 'Teilen' })).toBeEnabled();
});

test('essentials assets keep their lock, MIME, CSP, reflow and module boundary', async ({ page }) => {
  test.skip(test.info().project.name !== 'desktop', 'focused artifact and CSP contract check');
  const consoleProblems = recordConsoleProblems(page);
  await page.addInitScript(() => {
    const target = window as typeof window & { __essentialsCsp?: string[] };
    target.__essentialsCsp = [];
    document.addEventListener('securitypolicyviolation', (event) => {
      target.__essentialsCsp?.push(`${event.violatedDirective}: ${event.blockedURI}`);
    });
  });
  const response = await page.goto('./');
  if (!externalBaseUrl) {
    expect(response?.headers()['content-security-policy']).toContain("style-src 'self'");
  }
  await dismissPrivacy(page);
  await expect(page.locator('milos-date-picker')).toHaveCount(0);
  await expect(page.locator('milos-place-search')).toHaveCount(1);
  await startFlight(page);
  await expect(page.locator('milos-share-button')).toHaveCount(1);

  await page.getByText('Darstellung, Bewegung und lokale Daten', { exact: true }).click();
  await page.getByLabel('Darstellung').selectOption('dark');
  const sharedDarkTheme = await page.evaluate(() => {
    const placeInput = document.querySelector<HTMLElement>('milos-place-search input')!;
    const shareButton = document.querySelector<HTMLElement>('milos-share-button button')!;
    return {
      placeBackground: getComputedStyle(placeInput).backgroundColor,
      placeText: getComputedStyle(placeInput).color,
      shareBackground: getComputedStyle(shareButton).backgroundColor,
      shareText: getComputedStyle(shareButton).color,
    };
  });
  expect(sharedDarkTheme).toEqual({
    placeBackground: 'rgb(21, 54, 51)',
    placeText: 'rgb(244, 244, 233)',
    shareBackground: 'rgb(168, 234, 209)',
    shareText: 'rgb(14, 41, 39)',
  });

  const assets = await page.evaluate(async () => {
    const links = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
      .map((link) => link.href)
      .filter((href) => href.includes('/vendor/milosapps-essentials/v1/'));
    const scripts = [...document.querySelectorAll<HTMLScriptElement>('script[type="module"]')]
      .map((script) => script.src)
      .filter((src) => src.includes('/vendor/milosapps-essentials/v1/'));
    const runtime = new URL('vendor/milosapps-essentials/v1/milos-app-essentials.js', document.baseURI).href;
    return Promise.all([...links, ...scripts, runtime].map(async (url) => {
      const result = await fetch(url);
      return { url, ok: result.ok, contentType: result.headers.get('content-type') };
    }));
  });
  expect(assets).toHaveLength(4);
  expect(assets.every(({ ok }) => ok)).toBe(true);
  expect(assets.filter(({ url }) => url.endsWith('.css'))
    .every(({ contentType }) => contentType?.includes('text/css'))).toBe(true);
  expect(assets.filter(({ url }) => url.endsWith('.js'))
    .every(({ contentType }) => {
      const essence = contentType?.split(';', 1)[0].trim().toLowerCase();
      return essence === 'text/javascript' || essence === 'application/javascript';
    })).toBe(true);

  const iconSourceSha256 = createHash('sha256')
    .update(await readFile('public/icon.svg'))
    .digest('hex');
  const iconAsset = await page.evaluate(async () => {
    const response = await fetch(new URL('icon.svg', document.baseURI));
    const digest = await crypto.subtle.digest('SHA-256', await response.arrayBuffer());
    return {
      ok: response.ok,
      contentType: response.headers.get('content-type'),
      sha256: [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, '0')).join(''),
    };
  });
  expect(iconAsset).toEqual({
    ok: true,
    contentType: expect.stringContaining('image/svg+xml'),
    sha256: iconSourceSha256,
  });

  for (const viewport of [
    { width: 1440, height: 900 },
    { width: 390, height: 844 },
    { width: 180, height: 400 },
  ]) {
    await page.setViewportSize(viewport);
    await expectNoHorizontalOverflow(page);
  }
  const csp = await page.evaluate(() => (
    window as typeof window & { __essentialsCsp?: string[] }
  ).__essentialsCsp ?? []);
  expect(csp).toEqual([]);
  expect(consoleProblems).toEqual([]);
});
