import { expect, test } from '@playwright/test';

const externalBaseUrl = process.env.CLOUD_POST_E2E_BASE_URL;
import { expectNoHorizontalOverflow, recordConsoleProblems } from './helpers';

const cases = [
  { name: 'desktop-de', width: 1440, height: 900, locale: 'de', theme: 'system' },
  { name: 'desktop-dark-de', width: 1440, height: 900, locale: 'de', theme: 'dark' },
  { name: 'mobile-de-375', width: 375, height: 844, locale: 'de', theme: 'system' },
  { name: 'mobile-de-390', width: 390, height: 844, locale: 'de', theme: 'system' },
  { name: 'mobile-en', width: 390, height: 844, locale: 'en', theme: 'system' },
  // CSS-pixel equivalent of a 360 x 800 viewport at 200% browser zoom.
  { name: 'zoom200-de', width: 180, height: 400, locale: 'de', theme: 'system' },
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

    const privacyNotice = page.locator('[data-milos-privacy-notice]');
    await expect(privacyNotice).toHaveCount(0);
    await expect(page.locator('[data-milos-privacy-info]')).toBeVisible();

    if (visualCase.locale === 'en') {
      await page.locator('milos-app-shell')
        .getByRole('button', { name: 'EN', exact: true })
        .click();
    }

    if (visualCase.theme === 'dark') {
      await page.getByText('Darstellung, Bewegung und lokale Daten', { exact: true }).click();
      await page.getByLabel('Darstellung').selectOption('dark');
      await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
      await page.getByText('Darstellung, Bewegung und lokale Daten', { exact: true }).click();
    }

    await page.locator('h1').scrollIntoViewIfNeeded();

    await expect(page.locator('html')).toHaveAttribute('lang', visualCase.locale);
    await expect(page.locator('milos-app-shell')).toHaveCount(1);
    await expect(page.locator('h1')).toHaveCount(1);
    await expect(page.getByRole('heading', {
      level: 2,
      name: visualCase.locale === 'de' ? 'Was fliegt heute?' : 'What will fly today?',
    })).toBeVisible();
    await expect(page.getByRole('heading', {
      level: 2,
      name: visualCase.locale === 'de' ? 'Wo geht die Reise los?' : 'Where does the journey begin?',
    })).toBeVisible();
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

    const settingsSummary = page.getByText(
      visualCase.locale === 'de'
        ? 'Darstellung, Bewegung und lokale Daten'
        : 'Appearance, motion and local data',
      { exact: true },
    );
    await settingsSummary.click();

    const layoutContract = await page.evaluate(async () => {
      const links = [...document.querySelectorAll<HTMLLinkElement>('link[rel="stylesheet"]')]
        .map((link) => link.href)
        .filter((href) => href.includes('/vendor/milosapps-layout/v1/'));
      const responses = await Promise.all(links.map(async (href) => {
        const response = await fetch(href);
        return {
          href,
          ok: response.ok,
          contentType: response.headers.get('content-type'),
        };
      }));
      const intro = document.querySelector<HTMLElement>('[data-milos-intro]')!.getBoundingClientRect();
      const primary = document.querySelector<HTMLElement>('[data-milos-primary-work]')!.getBoundingClientRect();
      const h1 = document.querySelector<HTMLElement>('h1')!;
      const stepHeadings = [...document.querySelectorAll<HTMLElement>('[data-milos-step] h2')];
      const introIcon = document.querySelector<HTMLElement>('.hero-orbit')!;
      const settings = document.querySelector<HTMLElement>('.settings-section')!;
      return {
        responses,
        clientWidth: document.documentElement.clientWidth,
        scrollWidth: document.documentElement.scrollWidth,
        introHeight: intro.height,
        primaryTop: primary.top + window.scrollY,
        layoutDisplay: getComputedStyle(document.querySelector<HTMLElement>('[data-milos-layout="compact"]')!).display,
        h1Size: Number.parseFloat(getComputedStyle(h1).fontSize),
        h2Sizes: stepHeadings.map((heading) => Number.parseFloat(getComputedStyle(heading).fontSize)),
        introIconWidth: introIcon.getBoundingClientRect().width,
        introIconHeight: introIcon.getBoundingClientRect().height,
        settingsHeight: settings.getBoundingClientRect().height,
      };
    });
    console.info(`[layout-density:${visualCase.name}] ${JSON.stringify(layoutContract)}`);
    expect(layoutContract.responses.map(({ href }) => href)).toEqual([
      expect.stringMatching(/\/vendor\/milosapps-layout\/v1\/milos-app-layout\.css$/),
      expect.stringMatching(/\/vendor\/milosapps-layout\/v1\/milos-app-layout-theme\.css$/),
    ]);
    expect(layoutContract.responses.every(({ ok, contentType }) => ok && contentType?.includes('text/css'))).toBe(true);
    expect(layoutContract.layoutDisplay).toBe('grid');
    await expect(page.locator('[data-milos-primary-work]')).not.toHaveAttribute('data-milos-flow', 'paired');
    await expect(page.locator('[data-milos-intro-icon]')).toHaveCount(1);
    await expect(page.locator('[data-milos-settings]')).toHaveCount(1);
    await expect(page.locator('[data-milos-settings-intro]')).toHaveCount(1);
    await expect(page.locator('[data-milos-settings-controls]')).toHaveCount(1);
    await expect(page.locator('[data-milos-settings-control]')).toHaveCount(3);
    await expect(page.locator('[data-milos-settings-danger]')).toHaveCount(1);
    if (visualCase.name.startsWith('desktop')) {
      expect(layoutContract.introHeight).toBeLessThanOrEqual(220);
      expect(layoutContract.primaryTop).toBeLessThanOrEqual(400);
      expect(layoutContract.h1Size).toBeLessThanOrEqual(48);
      expect(Math.max(...layoutContract.h2Sizes)).toBeLessThanOrEqual(26.4);
      expect(Math.max(layoutContract.introIconWidth, layoutContract.introIconHeight)).toBeLessThanOrEqual(72);
      expect(layoutContract.settingsHeight).toBeLessThanOrEqual(220);
    }
    if (visualCase.name.startsWith('mobile-')) {
      expect(layoutContract.clientWidth).toBe(visualCase.width);
      expect(layoutContract.scrollWidth).toBe(layoutContract.clientWidth);
      expect(layoutContract.introHeight).toBeLessThanOrEqual(220);
      expect(layoutContract.primaryTop).toBeLessThanOrEqual(420);
      expect(layoutContract.h1Size).toBeLessThanOrEqual(36);
      expect(Math.max(...layoutContract.h2Sizes)).toBeLessThanOrEqual(22.4);
      expect(Math.max(layoutContract.introIconWidth, layoutContract.introIconHeight)).toBeLessThanOrEqual(52);
      expect(layoutContract.settingsHeight).toBeLessThanOrEqual(360);
    }
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
