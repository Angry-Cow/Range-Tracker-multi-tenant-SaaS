import { test, expect } from '@playwright/test';
import { ANNUAL_USER, SHOOTER_1, SHOOTER_2, SAMPLE_SETTINGS, SAMPLE_RECORD } from './test-config';
import {
  loginAsTenant,
  navigateToSettings,
  selectShooter,
  fillRangeRecord,
  saveRangeRecord,
  openUpgradeModal,
  verifyPasswordInModal,
} from './helpers';

// =============================================================================
// ANNUAL ACCOUNT FEATURE TESTS
// Assumes annual account was created and paid in 02-auth.spec.ts.
// Tests unlimited features, Manage Billing, and plan modification options.
// =============================================================================

test.describe('Annual Account - Plan Banner', () => {

  test('annual account shows Annual plan indicator', async ({ page }) => {
    await loginAsTenant(page, ANNUAL_USER.email, ANNUAL_USER.password);
    await expect(page.locator('text=Annual')).toBeVisible({ timeout: 10000 });
  });

  test('annual account shows Manage Billing button', async ({ page }) => {
    await loginAsTenant(page, ANNUAL_USER.email, ANNUAL_USER.password);
    await expect(page.locator('button:has-text("Manage Billing")')).toBeVisible({ timeout: 5000 });
  });

  test('annual account shows Modify Plan button', async ({ page }) => {
    await loginAsTenant(page, ANNUAL_USER.email, ANNUAL_USER.password);
    await expect(page.locator('button:has-text("Modify Plan")')).toBeVisible({ timeout: 5000 });
  });

  test('annual account does not show Free Plan limit banner', async ({ page }) => {
    await loginAsTenant(page, ANNUAL_USER.email, ANNUAL_USER.password);
    await expect(page.locator('text=Free Plan')).not.toBeVisible();
  });
});

test.describe('Annual Account - Unlimited Shooters', () => {

  test('can create multiple shooters with no limit', async ({ page }) => {
    await loginAsTenant(page, ANNUAL_USER.email, ANNUAL_USER.password);

    for (const shooter of [SHOOTER_1, SHOOTER_2]) {
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
    await expect(page.locator('#home-shooter-select option').filter({ hasText: SHOOTER_1.lastName })).toBeVisible({ timeout: 10000 });
    await expect(page.locator('#home-shooter-select option').filter({ hasText: SHOOTER_2.lastName })).toBeVisible({ timeout: 10000 });
  });

  test('New Shooter option is NOT disabled for annual plan', async ({ page }) => {
    await loginAsTenant(page, ANNUAL_USER.email, ANNUAL_USER.password);
    const newShooterOption = page.locator('#home-shooter-select option[value="new"]');
    const isDisabled = await newShooterOption.evaluate((el: HTMLOptionElement) => el.disabled);
    expect(isDisabled).toBeFalsy();
  });
});

test.describe('Annual Account - Unlimited Settings', () => {

  test('can add more than 5 settings values per category', async ({ page }) => {
    await loginAsTenant(page, ANNUAL_USER.email, ANNUAL_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await navigateToSettings(page);

    const allLocations = [...SAMPLE_SETTINGS.range_location, 'Extra Location 6', 'Extra Location 7'];
    for (const value of allLocations) {
      const addInput = page.locator('#settings-add-range_location');
      const isDisabled = await addInput.isDisabled().catch(() => false);
      if (!isDisabled) {
        await addInput.fill(value);
        await page.click('button[aria-label="Add range_location"], button[aria-label*="Add range location"]');
        await page.waitForLoadState('networkidle');
      }
    }

    // Verify no limit message
    await expect(page.locator('text=Free Plan')).not.toBeVisible();
    // No 5/5 badge should appear
    const limitBadge = page.locator('text=5/5');
    expect(await limitBadge.isVisible({ timeout: 2000 }).catch(() => false)).toBeFalsy();
  });
});

test.describe('Annual Account - Unlimited Range Records', () => {

  test('can create range records with no per-shooter limit', async ({ page }) => {
    await loginAsTenant(page, ANNUAL_USER.email, ANNUAL_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);

    // First add a setting so dropdowns have values
    await navigateToSettings(page);
    for (const [cat, vals] of Object.entries(SAMPLE_SETTINGS)) {
      await page.fill(`#settings-add-${cat}`, vals[0]);
      await page.click(`button[aria-label="Add ${cat}"], button[aria-label*="Add ${cat.replace(/_/g, ' ')}"]`);
      await page.waitForLoadState('networkidle');
    }
    await page.click('button[aria-label="Back to Home"], button:has-text("Back to Home")');

    // Create 3 records
    for (let i = 0; i < 3; i++) {
      await selectShooter(page, SHOOTER_1.lastName);
      await page.click('button:has-text("New Record")');
      await fillRangeRecord(page, {
        conditions: `Annual test record ${i + 1}`,
        weather: 'Overcast',
        additionalNotes: SAMPLE_RECORD.additionalNotes,
      });
      await saveRangeRecord(page);
      const homeVisible = await page.locator('#home-shooter-select').isVisible({ timeout: 5000 }).catch(() => false);
      if (!homeVisible) {
        await page.click('button[aria-label="Back"], button:has-text("Back")');
        await page.waitForLoadState('networkidle');
      }
    }

    // No limit message should appear
    await expect(page.locator('text=/record limit|20 records/i')).not.toBeVisible();
  });

  test('all 13 photo slots are available on range record form', async ({ page }) => {
    await loginAsTenant(page, ANNUAL_USER.email, ANNUAL_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await page.click('button:has-text("New Record")');

    for (let i = 1; i <= 13; i++) {
      await expect(page.locator(`#photo-file-${i}`)).toBeAttached();
    }
    // Navigate back
    await page.click('button[aria-label="Back"], button:has-text("Back")');
  });
});

test.describe('Annual Account - Modify Plan Modal', () => {

  test('modify plan modal shows Monthly and Free options (not Annual)', async ({ page }) => {
    await loginAsTenant(page, ANNUAL_USER.email, ANNUAL_USER.password);
    await openUpgradeModal(page);
    await verifyPasswordInModal(page, ANNUAL_USER.password);
    // Should NOT show Annual (current plan)
    await expect(page.locator('button[aria-label="Select Annual plan"]')).not.toBeVisible();
    // Should show Monthly and Free
    await expect(page.locator('button[aria-label="Select Monthly plan"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Select Free plan"]')).toBeVisible();
  });

  test('selecting Free from Annual shows downgrade warning', async ({ page }) => {
    await loginAsTenant(page, ANNUAL_USER.email, ANNUAL_USER.password);
    await openUpgradeModal(page);
    await verifyPasswordInModal(page, ANNUAL_USER.password);
    await page.click('button[aria-label="Select Free plan"]');
    await expect(page.locator('text=Downgrading to Free Plan')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=end of your current billing period')).toBeVisible();
    // Cancel
    await page.click('button:has-text("Go Back")');
    await page.click('button[aria-label="Close"]');
  });

  test('confirming downgrade from Annual to Free schedules cancellation', async ({ page }) => {
    await loginAsTenant(page, ANNUAL_USER.email, ANNUAL_USER.password);
    await openUpgradeModal(page);
    await verifyPasswordInModal(page, ANNUAL_USER.password);
    await page.click('button[aria-label="Select Free plan"]');
    await page.click('button:has-text("Confirm Downgrade")');
    await expect(page.locator('text=Cancellation Scheduled')).toBeVisible({ timeout: 15000 });
    await page.click('button:has-text("Done")');
    await expect(page.locator('text=Cancellation scheduled')).toBeVisible({ timeout: 8000 });
  });

  test('selecting Monthly from Annual redirects to Stripe checkout', async ({ page }) => {
    await loginAsTenant(page, ANNUAL_USER.email, ANNUAL_USER.password);
    await openUpgradeModal(page);
    await verifyPasswordInModal(page, ANNUAL_USER.password);
    await page.click('button[aria-label="Select Monthly plan"]');
    await expect(page.locator('text=Redirecting to secure payment')).toBeVisible({ timeout: 8000 });
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
    await expect(page).toHaveURL(/checkout\.stripe\.com/);
    await page.goBack();
  });
});

test.describe('Annual Account - Manage Billing', () => {

  test('Manage Billing button navigates to Stripe portal', async ({ page }) => {
    await loginAsTenant(page, ANNUAL_USER.email, ANNUAL_USER.password);
    await page.waitForSelector('button:has-text("Manage Billing")', { timeout: 10000 });

    const [newPageOrNavigation] = await Promise.all([
      page.context().waitForEvent('page').catch(() => null),
      page.click('button:has-text("Manage Billing")'),
    ]);

    if (newPageOrNavigation) {
      await expect(newPageOrNavigation).toHaveURL(/stripe\.com/, { timeout: 15000 });
    } else {
      await expect(page).toHaveURL(/stripe\.com/, { timeout: 15000 });
    }
  });
});
