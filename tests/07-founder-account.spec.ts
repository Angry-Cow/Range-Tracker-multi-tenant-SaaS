import { test, expect } from '@playwright/test';
import { FOUNDER_USER, SHOOTER_1, SHOOTER_2, SHOOTER_3, SAMPLE_SETTINGS, SAMPLE_RECORD } from './test-config';
import {
  loginAsTenant,
  navigateToSettings,
  selectShooter,
  fillRangeRecord,
  saveRangeRecord,
} from './helpers';

// =============================================================================
// FOUNDER ACCOUNT FEATURE TESTS
// Assumes founder account was registered in 02-auth.spec.ts.
// Tests unlimited everything, no upgrade option shown, permanent free access.
// =============================================================================

test.describe('Founder Account - Plan Banner', () => {

  test('founder account shows Founder plan indicator', async ({ page }) => {
    await loginAsTenant(page, FOUNDER_USER.email, FOUNDER_USER.password);
    await expect(page.locator('text=Founder')).toBeVisible({ timeout: 10000 });
  });

  test('founder account does NOT show Upgrade or Modify Plan button', async ({ page }) => {
    await loginAsTenant(page, FOUNDER_USER.email, FOUNDER_USER.password);
    // Founder plan has no upgrade button per business logic
    await expect(page.locator('button:has-text("Upgrade")')).not.toBeVisible({ timeout: 3000 });
    await expect(page.locator('button:has-text("Modify Plan")')).not.toBeVisible({ timeout: 3000 });
  });

  test('founder account does NOT show Manage Billing button', async ({ page }) => {
    await loginAsTenant(page, FOUNDER_USER.email, FOUNDER_USER.password);
    await expect(page.locator('button:has-text("Manage Billing")')).not.toBeVisible({ timeout: 3000 });
  });

  test('founder account does NOT show Free Plan limit banner', async ({ page }) => {
    await loginAsTenant(page, FOUNDER_USER.email, FOUNDER_USER.password);
    await expect(page.locator('text=Free Plan')).not.toBeVisible();
  });
});

test.describe('Founder Account - Unlimited Shooters', () => {

  test('can create multiple shooters with no limit', async ({ page }) => {
    await loginAsTenant(page, FOUNDER_USER.email, FOUNDER_USER.password);

    for (const shooter of [SHOOTER_1, SHOOTER_2, SHOOTER_3]) {
      await page.selectOption('#home-shooter-select', 'new');
      await page.click('button:has-text("New Record")');
      await page.fill('#new-shooter-first-name', shooter.firstName);
      await page.fill('#new-shooter-last-name', shooter.lastName);
      await page.fill('#new-shooter-email', shooter.email);
      await page.fill('#new-shooter-phone', shooter.phone);
      await page.fill('#new-shooter-notes', shooter.notes);
      await page.click('button[type="submit"], button:has-text("Create Shooter"), button:has-text("Save")');
      await page.waitForLoadState('networkidle');
    }

    await page.goto('/');
    await page.waitForLoadState('networkidle');
    for (const shooter of [SHOOTER_1, SHOOTER_2, SHOOTER_3]) {
      await expect(page.locator('#home-shooter-select option').filter({ hasText: shooter.lastName })).toBeVisible({ timeout: 10000 });
    }
  });

  test('New Shooter option is NOT disabled for founder plan', async ({ page }) => {
    await loginAsTenant(page, FOUNDER_USER.email, FOUNDER_USER.password);
    const newShooterOption = page.locator('#home-shooter-select option[value="new"]');
    const isDisabled = await newShooterOption.evaluate((el: HTMLOptionElement) => el.disabled);
    expect(isDisabled).toBeFalsy();
  });
});

test.describe('Founder Account - Unlimited Settings', () => {

  test('can add more than 5 settings values without limit', async ({ page }) => {
    await loginAsTenant(page, FOUNDER_USER.email, FOUNDER_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await navigateToSettings(page);

    const allLocations = [...SAMPLE_SETTINGS.range_location, 'Founder Extra 6', 'Founder Extra 7'];
    for (const value of allLocations) {
      const addInput = page.locator('#settings-add-range_location');
      const isDisabled = await addInput.isDisabled().catch(() => false);
      if (!isDisabled) {
        await addInput.fill(value);
        await page.click('button[aria-label="Add range_location"], button[aria-label*="Add range location"]');
        await page.waitForLoadState('networkidle');
      }
    }

    // No Free Plan limit text
    await expect(page.locator('text=Free Plan')).not.toBeVisible();
    // No 5/5 limit badge
    expect(await page.locator('text=5/5').isVisible({ timeout: 2000 }).catch(() => false)).toBeFalsy();
  });

  test('settings page shows no Free Plan banner for founder', async ({ page }) => {
    await loginAsTenant(page, FOUNDER_USER.email, FOUNDER_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await navigateToSettings(page);
    await expect(page.locator('text=Free Plan')).not.toBeVisible();
  });
});

test.describe('Founder Account - Unlimited Range Records', () => {

  test('can create range records without limit', async ({ page }) => {
    await loginAsTenant(page, FOUNDER_USER.email, FOUNDER_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);

    // Add settings first
    await navigateToSettings(page);
    for (const [cat, vals] of Object.entries(SAMPLE_SETTINGS)) {
      const addInput = page.locator(`#settings-add-${cat}`);
      const isDisabled = await addInput.isDisabled().catch(() => false);
      if (!isDisabled) {
        await addInput.fill(vals[0]);
        await page.click(`button[aria-label="Add ${cat}"], button[aria-label*="Add ${cat.replace(/_/g, ' ')}"]`);
        await page.waitForLoadState('networkidle');
      }
    }
    await page.click('button[aria-label="Back to Home"], button:has-text("Back to Home")');

    // Create 3 records
    for (let i = 0; i < 3; i++) {
      await selectShooter(page, SHOOTER_1.lastName);
      await page.click('button:has-text("New Record")');
      await fillRangeRecord(page, {
        conditions: `Founder unlimited record ${i + 1}`,
        weather: 'Sunny',
        additionalNotes: SAMPLE_RECORD.additionalNotes,
      });
      await saveRangeRecord(page);
      const homeVisible = await page.locator('#home-shooter-select').isVisible({ timeout: 5000 }).catch(() => false);
      if (!homeVisible) {
        await page.click('button[aria-label="Back"], button:has-text("Back")');
        await page.waitForLoadState('networkidle');
      }
    }

    await expect(page.locator('text=/record limit|20 records|maximum/i')).not.toBeVisible();
  });

  test('can view previous records for founder account', async ({ page }) => {
    await loginAsTenant(page, FOUNDER_USER.email, FOUNDER_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await page.click('button:has-text("View Previous Records")');
    await expect(page.locator('.divide-y > div, tr, li').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Founder Account - All Core Features', () => {

  test('all 13 photo slots are present on range record form', async ({ page }) => {
    await loginAsTenant(page, FOUNDER_USER.email, FOUNDER_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await page.click('button:has-text("New Record")');

    for (let i = 1; i <= 13; i++) {
      await expect(page.locator(`#photo-file-${i}`)).toBeAttached();
    }
    await page.click('button[aria-label="Back"], button:has-text("Back")');
  });

  test('can edit shooter profile for founder account', async ({ page }) => {
    await loginAsTenant(page, FOUNDER_USER.email, FOUNDER_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await navigateToSettings(page);
    await page.click('button:has-text("View Shooter Profile")');

    await expect(page.locator('#profile-first-name')).toBeVisible();
    await expect(page.locator('#profile-last-name')).toBeVisible();
    await expect(page.locator('#profile-email')).toBeVisible();
    await expect(page.locator('#profile-phone')).toBeVisible();
  });

  test('Settings and View Previous Records buttons are active when shooter selected', async ({ page }) => {
    await loginAsTenant(page, FOUNDER_USER.email, FOUNDER_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);

    await expect(page.locator('button:has-text("Settings")')).toBeEnabled();
    await expect(page.locator('button:has-text("View Previous Records")')).toBeEnabled();
  });

  test('Settings and View Previous Records buttons are disabled when no shooter selected', async ({ page }) => {
    await loginAsTenant(page, FOUNDER_USER.email, FOUNDER_USER.password);
    // Reset selection to blank
    await page.selectOption('#home-shooter-select', '');
    await expect(page.locator('button:has-text("Settings")')).toBeDisabled();
    await expect(page.locator('button:has-text("View Previous Records")')).toBeDisabled();
  });
});
