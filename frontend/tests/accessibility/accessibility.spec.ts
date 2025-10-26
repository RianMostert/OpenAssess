import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const PAGES = ['/', '/auth/login', '/auth/register'];

for (const pagePath of PAGES) {
  test(`axe: ${pagePath}`, async ({ page }) => {
    await page.goto(`http://localhost:3000${pagePath}`);
    // Wait for main content to load
    await page.waitForLoadState('networkidle');

    const accessibilityScanResults = await new AxeBuilder({ page }).analyze();

    // Fail the test if there are serious or critical violations
    const violations = accessibilityScanResults.violations || [];
    const serious = violations.filter(v => v.impact === 'serious' || v.impact === 'critical');

    if (serious.length > 0) {
      console.log(`Accessibility violations for ${pagePath}:`, JSON.stringify(serious, null, 2));
    }

    expect(serious.length, `Accessibility serious/critical violations on ${pagePath}`).toBe(0);
  });
}
