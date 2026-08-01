import { expect, test } from '@playwright/test';

const externalBaseUrl = process.env.CLOUD_POST_E2E_BASE_URL;
import { expectNoHorizontalOverflow, recordConsoleProblems } from './helpers';

const cases = [
  { name: 'desktop-de', width: 1440, height: 900, locale: 'de' },
  { name: 'mobile-en', width: 390, height: 844, locale: 'en' },
  // CSS-pixel equivalent of a 360 x 800 viewport at 200% browser zoom.
  { name: 'zoom200-de', width: 180, height: 400, locale: 'de' },
] as const;

for (const visualCase of cases) {
  test(`${visualCase.name} keeps the shell contract visually intact`, async ({ page }, testInfo) => {
    test.skip(test.info().project.name !== 'desktop', 'single-browser visual contract');
    await page.addInitScript(() => {
      const target = window as typeof window & { __cloudPostCspViolations?: string[] };
      target.__cloudPostCspViolations = [];
      document.addEventListener('securitypolicyviolation', (event) => {
        target.__cloudPostCspViolations?.push(
          `${event.violatedDirective}: ${event.blockedURI}`,
        );
      });
    });
    const consoleProblems = recordConsoleProblems(page);
    await page.setViewportSize({ width: visualCase.width, height: visualCase.height });
    const response = await page.goto('./');
    expect(response).not.toBeNull();
    if (!externalBaseUrl) {
      const csp = response!.headers()['content-security-policy'];
      expect(csp).toContain("default-src 'self'");
      expect(csp).toContain("script-src 'self'");
      expect(csp).toContain("style-src 'self'");
    }

    if (visualCase.locale === 'en') {
      await page.locator('milos-app-shell')
        .getByRole('button', { name: 'EN', exact: true })
        .click();
    }

    await expect(page.locator('html')).toHaveAttribute('lang', visualCase.locale);
    await expect(page.locator('milos-app-shell')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    const shellContract = await page.locator('milos-app-shell').evaluate((shell) => {
      const root = shell.shadowRoot!;
      const brand = root.querySelector<HTMLElement>('.brand')!;
      const icon = root.querySelector<HTMLElement>('.app-icon')!;
      const componentStyles = root.querySelector<HTMLLinkElement>(
        'link[data-milos-app-shell-component]',
      )!;
      const themeStyles = document.querySelector<HTMLLinkElement>(
        'link[data-milos-app-shell-theme="cloud-post"]',
      )!;
      return {
        hostDisplay: getComputedStyle(shell).display,
        brandDisplay: getComputedStyle(brand).display,
        iconWidth: icon.getBoundingClientRect().width,
        iconHeight: icon.getBoundingClientRect().height,
        componentStyles: componentStyles.href,
        themeStyles: themeStyles.href,
      };
    });
    expect(shellContract.hostDisplay).toBe('grid');
    expect(shellContract.brandDisplay).toBe('flex');
    expect(shellContract.iconWidth).toBeCloseTo(38, 1);
    expect(shellContract.iconHeight).toBeCloseTo(38, 1);
    expect(shellContract.componentStyles).toMatch(/\/vendor\/milosapps-shell\/v2\/milos-app-shell\.css$/);
    expect(shellContract.themeStyles).toMatch(/\/vendor\/milosapps-shell\/v2\/milos-app-shell-theme\.css$/);
    await expectNoHorizontalOverflow(page);
    const undersizedTargets = await page.locator('button, a').evaluateAll((controls) => controls
      .filter((control) => {
        const style = getComputedStyle(control);
        return style.display !== 'none' && style.visibility !== 'hidden';
      })
      .map((control) => {
        const bounds = control.getBoundingClientRect();
        return {
          label: control.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80),
          width: bounds.width,
          height: bounds.height,
        };
      })
      .filter(({ width, height }) => width < 44 || height < 44));
    expect(undersizedTargets).toEqual([]);
    if (visualCase.name === 'zoom200-de') {
      const clippedText = await page.locator('h1, h2, p, a, button, label, strong, small')
        .evaluateAll((elements) => elements
          .filter((element) => {
            const style = getComputedStyle(element);
            return style.display !== 'none'
              && style.visibility !== 'hidden'
              && !element.classList.contains('sr-only')
              && element.scrollWidth > element.clientWidth + 3;
          })
          .map((element) => ({
            tag: element.tagName,
            className: element.className,
            text: element.textContent?.trim().replace(/\s+/g, ' ').slice(0, 80),
            clientWidth: element.clientWidth,
            scrollWidth: element.scrollWidth,
            clientHeight: element.clientHeight,
            scrollHeight: element.scrollHeight,
          })));
      expect(clippedText).toEqual([]);
    }
    await expect.poll(() => page.evaluate(() => {
      const footer = document.querySelector('milos-app-shell')?.shadowRoot?.querySelector('footer');
      if (!footer) return Number.POSITIVE_INFINITY;
      return document.documentElement.scrollHeight
        - (footer.getBoundingClientRect().bottom + window.scrollY);
    })).toBeLessThanOrEqual(1);
    const cspViolations = await page.evaluate(() => (
      window as typeof window & { __cloudPostCspViolations?: string[] }
    ).__cloudPostCspViolations ?? []);
    expect(cspViolations).toEqual([]);
    expect(consoleProblems).toEqual([]);

    await page.screenshot({
      path: testInfo.outputPath(`${visualCase.name}.png`),
      fullPage: true,
    });
  });
}
