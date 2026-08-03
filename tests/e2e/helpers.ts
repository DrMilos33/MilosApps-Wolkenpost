import { expect, type Page, type Route } from '@playwright/test';

export function windResponse(requestUrl: string) {
  const url = new URL(requestUrl);
  const latitudes = url.searchParams.get('latitude')?.split(',').map(Number) ?? [];
  const longitudes = url.searchParams.get('longitude')?.split(',').map(Number) ?? [];
  const variables = url.searchParams.get('hourly')?.split(',') ?? [];
  const times = Array.from({ length: 37 }, (_, index) => {
    const date = new Date(Date.UTC(2026, 6, 30, index));
    return date.toISOString().slice(0, 16);
  });
  return latitudes.map((latitude, nodeIndex) => ({
    latitude,
    longitude: longitudes[nodeIndex],
    hourly: {
      time: times,
      ...Object.fromEntries(variables.map((variable) => {
        const levelFactor = variable.includes('850hPa')
          ? 1.45
          : variable.includes('925hPa')
            ? 1.12
            : 0.62;
        const isDirection = variable.includes('direction');
        return [
          variable,
          times.map((_, timeIndex) => isDirection
            ? (variable.includes('10m') ? 130 : variable.includes('925hPa') ? 205 : 250)
              + ((nodeIndex + timeIndex) % 18)
            : (10 + nodeIndex * 0.25 + timeIndex * 0.02) * levelFactor),
        ];
      })),
    },
  }));
}

export async function fulfillWind(route: Route, delayMs = 0) {
  if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs));
  await route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify(windResponse(route.request().url())),
  });
}

export async function startFlight(page: Page) {
  await page.getByRole('button', { name: 'Flug mit Live-Wind starten' }).click();
  await expect(page.getByRole('heading', { name: /Angekommen nahe/ })).toBeVisible();
}

export async function expectNoHorizontalOverflow(page: Page) {
  const sizes = await page.evaluate(() => ({
    scrollWidth: document.documentElement.scrollWidth,
    clientWidth: document.documentElement.clientWidth,
  }));
  expect(sizes.scrollWidth).toBeLessThanOrEqual(sizes.clientWidth + 1);
}

export function recordConsoleProblems(page: Page): string[] {
  const problems: string[] = [];
  page.on('console', (message) => {
    if (message.type() === 'error') problems.push(`console: ${message.text()}`);
  });
  page.on('pageerror', (error) => problems.push(`pageerror: ${error.message}`));
  return problems;
}
