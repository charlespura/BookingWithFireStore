import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
import { initializeTestEnvironment } from '@firebase/rules-unit-testing';
import { doc, setDoc } from 'firebase/firestore';
import { defaultServices, defaultSettings } from '../../src/lib/models';
import { dateKey } from '../../src/lib/time';
test('visitor request, realtime staff actions and responsive dashboard', async ({ page }) => {
  const env = await initializeTestEnvironment({
    projectId: 'demo-victorina',
    firestore: { rules: readFileSync('firestore.rules', 'utf8'), host: '127.0.0.1', port: 8080 },
  });
  await env.clearFirestore();
  await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-victorina/accounts', {
    method: 'DELETE',
  });
  const response = await fetch(
    'http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:signUp?key=demo-key',
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'owner@example.com',
        password: 'Test-owner-123!',
        returnSecureToken: true,
      }),
    },
  );
  const account = (await response.json()) as { localId: string };
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore();
    await setDoc(doc(db, 'admins', account.localId), { role: 'admin' });
    await setDoc(doc(db, 'settings', 'business'), { ...defaultSettings, published: true });
    for (const s of defaultServices) {
      const { id, ...data } = s;
      await setDoc(doc(db, 'services', id), data);
    }
  });
  try {
    await page.setViewportSize({ width: 390, height: 1000 });
    await page.goto('/#/book?service=garden');
    await page.getByRole('button', { name: 'Choose a date' }).click();
    const tomorrow = dateKey(new Date(Date.now() + 86400000));
    await page.getByLabel('Another date').fill(tomorrow);
    await page.getByRole('button', { name: 'Choose a time' }).click();
    await page.getByRole('radio', { name: '10:00 AM' }).check();
    await page.getByRole('button', { name: 'Your details' }).click();
    await page.getByRole('button', { name: 'Confirm booking' }).click();
    await expect(page.getByText('Enter your first name.')).toBeVisible();
    await page.getByLabel('First name', { exact: true }).fill('Maria');
    await page.getByLabel('Last name', { exact: true }).fill('Santos');
    await page.getByLabel('Email address', { exact: true }).fill('maria@example.com');
    await page.getByLabel('Contact number', { exact: true }).fill('+639171234567');
    await page.getByLabel('Event type', { exact: true }).selectOption('Wedding');
    await page.getByLabel('Expected event guests').fill('150');
    await page.getByLabel('I agree that Club Victorina').check();
    await page.getByRole('button', { name: 'Confirm booking' }).click();
    await expect(page.getByRole('heading', { name: 'Your visit request is in.' })).toBeVisible();
    await page.screenshot({ path: 'docs/screenshots/confirmation-390.png', fullPage: true });
    const downloadPromise = page.waitForEvent('download');
    await page.getByRole('button', { name: 'Add to calendar' }).click();
    expect((await downloadPromise).suggestedFilename()).toBe('club-victorina-visit.ics');
    await page.goto('/#/admin');
    await page.getByLabel('Email address', { exact: true }).fill('owner@example.com');
    await page.getByLabel('Password', { exact: true }).fill('Test-owner-123!');
    await page.getByRole('button', { name: 'Sign in', exact: true }).click();
    await expect(page.getByRole('heading', { name: 'Keep the day in view.' })).toBeVisible();
    await page.getByLabel('Visit date', { exact: true }).fill(tomorrow);
    await expect(page.getByRole('heading', { name: 'Maria Santos' })).toBeVisible();
    for (const width of [390, 768, 1440]) {
      await page.setViewportSize({ width, height: 1000 });
      expect(
        await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth),
      ).toBe(true);
      await page.evaluate(async () => {
        await document.fonts.ready;
        window.scrollTo(0, 0);
        await new Promise<void>((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(() => resolve())),
        );
      });
      await page.screenshot({
        path: `docs/screenshots/dashboard-${width}.png`,
        fullPage: true,
        animations: 'disabled',
      });
    }
    await page.getByRole('button', { name: 'Confirm', exact: true }).click();
    await expect(page.locator('.day-booking .status-pill')).toHaveText('confirmed');
    await page.getByRole('button', { name: 'Reschedule', exact: true }).click();
    await page
      .getByRole('combobox', { name: 'Available time', exact: true })
      .selectOption({ label: '11:00 AM' });
    await page.getByRole('button', { name: 'Save new time' }).click();
    await expect(page.getByRole('dialog')).not.toBeVisible();
    await expect(page.locator('.day-time')).toContainText('11:00 AM');
    await page.getByRole('button', { name: 'Cancel', exact: true }).click();
    await expect(page.locator('.day-booking .status-pill')).toHaveText('cancelled');
    await page.getByRole('button', { name: 'Services & hours' }).click();
    await page.getByLabel('Service name', { exact: true }).first().fill('Ballroom walk-through');
    await page.getByRole('button', { name: 'Save service', exact: true }).first().click();
    await expect(page.getByLabel('Service name', { exact: true }).first()).toHaveValue(
      'Ballroom walk-through',
    );
    await page.getByLabel('Block a date', { exact: true }).fill(tomorrow);
    await page.getByRole('button', { name: 'Add blocked date' }).click();
    await page.getByRole('button', { name: 'Save hours and blocked dates' }).click();
    await expect(page.getByRole('button', { name: `Unblock ${tomorrow}` })).toBeVisible();
  } finally {
    await env.cleanup();
  }
});
