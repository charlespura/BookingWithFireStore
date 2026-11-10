import { test, expect } from '@playwright/test';
for (const width of [390, 768, 1440]) {
  test(`public pages at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 1000 });
    const failures: string[] = [];
    page.on('pageerror', (error) => failures.push(error.message));
    await page.goto('/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Good company.');
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1500);
    expect(
      await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
    ).toBe(true);
    await page.screenshot({ path: `docs/screenshots/landing-${width}.png`, fullPage: true });
    await page.getByRole('link', { name: 'Book a time' }).first().click();
    await expect(
      page.getByRole('heading', { name: 'Which space would you like to see?' }),
    ).toBeVisible();
    await page.getByText('Garden Pavilion visit', { exact: true }).click();
    await expect(page.getByRole('radio', { name: /Garden Pavilion visit/ })).toBeChecked();
    await expect(page.getByRole('button', { name: 'Choose a date' })).toBeDisabled();
    await page.screenshot({ path: `docs/screenshots/booking-${width}.png`, fullPage: true });
    await page.goto('/#/admin');
    await expect(page.getByRole('heading', { name: 'The visit desk.' })).toBeVisible();
    await page.screenshot({ path: `docs/screenshots/admin-${width}.png`, fullPage: true });
    expect(failures).toEqual([]);
  });
}
test('keyboard navigation and reduced motion', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.goto('/');
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link', { name: 'Skip to content' })).toBeFocused();
  await page.keyboard.press('Enter');
  await expect(page.locator('main')).toBeFocused();
  await page.getByRole('link', { name: 'Our spaces', exact: true }).click();
  await expect(page.getByRole('heading', { name: 'A setting that feels right.' })).toBeVisible();
  await expect(page).toHaveURL(/\/$/);
  await page.getByText('Does this reserve my event date?').click();
  await expect(page.getByText('No. This reserves a time to visit')).toBeVisible();
});
