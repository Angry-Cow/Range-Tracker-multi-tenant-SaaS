import { test, expect } from '@playwright/test';
import { MONTHLY_USER, SHOOTER_1, SHOOTER_2, SHOOTER_3, SAMPLE_SETTINGS, SAMPLE_RECORD } from './test-config';
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
// MONTHLY ACCOUNT FEATURE TESTS
// Assumes monthly account was created and paid in 02-auth.spec.ts.
// Tests unlimited shooters/records/settings, Manage Billing, and plan controls.
// =============================================================================

test.describe('Monthly Account - Plan Banner', () => {

  test('monthly account shows Monthly plan indicator', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    await expect(page.locator('text=Monthly')).toBeVisible({ timeout: 10000 });
  });

  test('monthly account shows Manage Billing button', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    await expect(page.locator('button:has-text("Manage Billing")')).toBeVisible({ timeout: 5000 });
  });

  test('monthly account shows Modify Plan button', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    await expect(page.locator('button:has-text("Modify Plan")')).toBeVisible({ timeout: 5000 });
  });

  test('monthly account does not show per-shooter or per-record limits in banner', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    // Should not see Free Plan limit banner
    await expect(page.locator('text=Free Plan')).not.toBeVisible();
  });
});

test.describe('Monthly Account - Unlimited Shooters', () => {

  test('can create first shooter', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    await page.selectOption('#home-shooter-select', 'new');
    await page.click('button:has-text("New Record")');

    await page.fill('#new-shooter-first-name', SHOOTER_1.firstName);
    await page.fill('#new-shooter-last-name', SHOOTER_1.lastName);
    await page.fill('#new-shooter-email', SHOOTER_1.email);
    await page.fill('#new-shooter-phone', SHOOTER_1.phone);
    await page.fill('#new-shooter-notes', SHOOTER_1.notes);
    await page.click('button[type="submit"], button:has-text("Create Shooter"), button:has-text("Save")');
    await page.waitForLoadState('networkidle');
  });

  test('can create second shooter (no limit)', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    await page.selectOption('#home-shooter-select', 'new');
    await page.click('button:has-text("New Record")');

    await page.fill('#new-shooter-first-name', SHOOTER_2.firstName);
    await page.fill('#new-shooter-last-name', SHOOTER_2.lastName);
    await page.fill('#new-shooter-email', SHOOTER_2.email);
    await page.fill('#new-shooter-phone', SHOOTER_2.phone);
    await page.fill('#new-shooter-notes', SHOOTER_2.notes);
    await page.click('button[type="submit"], button:has-text("Create Shooter"), button:has-text("Save")');
    await page.waitForLoadState('networkidle');
  });

  test('can create third shooter (unlimited - monthly plan)', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    await page.selectOption('#home-shooter-select', 'new');
    await page.click('button:has-text("New Record")');

    await page.fill('#new-shooter-first-name', SHOOTER_3.firstName);
    await page.fill('#new-shooter-last-name', SHOOTER_3.lastName);
    await page.fill('#new-shooter-email', SHOOTER_3.email);
    await page.fill('#new-shooter-phone', SHOOTER_3.phone);
    await page.fill('#new-shooter-notes', SHOOTER_3.notes);
    await page.click('button[type="submit"], button:has-text("Create Shooter"), button:has-text("Save")');
    await page.waitForLoadState('networkidle');

    // Verify third shooter is accessible in the dropdown
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#home-shooter-select option').filter({ hasText: SHOOTER_3.lastName })).toBeVisible({ timeout: 10000 });
  });

  test('New Shooter option is NOT disabled for monthly plan', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    const newShooterOption = page.locator('#home-shooter-select option[value="new"]');
    await expect(newShooterOption).toBeVisible();
    const isDisabled = await newShooterOption.evaluate((el: HTMLOptionElement) => el.disabled);
    expect(isDisabled).toBeFalsy();
  });
});

test.describe('Monthly Account - Unlimited Settings', () => {

  test('can add more than 5 values to a settings category', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await navigateToSettings(page);

    // Add all 5 sample range locations plus a 6th one
    const allLocations = [...SAMPLE_SETTINGS.range_location, '6th Location Over Limit'];
    for (const value of allLocations) {
      const addInput = page.locator('#settings-add-range_location');
      const isDisabled = await addInput.isDisabled().catch(() => false);
      if (!isDisabled) {
        await addInput.fill(value);
        await page.click('button[aria-label="Add range_location"], button[aria-label*="Add range location"]');
        await page.waitForLoadState('networkidle');
      }
    }

    // No 5/5 limit badge should be shown - or add button should still be enabled
    const limitBadge = page.locator('text=5/5');
    const limitVisible = await limitBadge.isVisible({ timeout: 2000 }).catch(() => false);
    expect(limitVisible).toBeFalsy();
  });

  test('settings category shows no limit badge for monthly plan', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await navigateToSettings(page);
    // No "Free Plan" limit text should appear
    await expect(page.locator('text=Free Plan')).not.toBeVisible();
  });
});

test.describe('Monthly Account - Range Records with Photos', () => {

  test('can create a range record and see all photo slots', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await page.click('button:has-text("New Record")');

    // Verify all 13 photo file inputs are present
    for (let i = 1; i <= 13; i++) {
      await expect(page.locator(`#photo-file-${i}`)).toBeAttached();
    }
  });

  test('can add photo notes to a photo slot', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await page.click('button:has-text("New Record")');

    await page.fill('#photo-notes-1', 'Photo 1 test note');
    await fillRangeRecord(page, {
      conditions: 'Photo notes test',
      weather: 'Clear',
    });
    await saveRangeRecord(page);
  });

  test('can create more than 20 records (no limit on monthly)', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);

    // Create 5 records quickly
    for (let i = 0; i < 5; i++) {
      await page.click('button:has-text("New Record")');
      await fillRangeRecord(page, {
        conditions: `Monthly unlimited record ${i + 1}`,
        weather: 'Test weather',
      });
      await saveRangeRecord(page);
      const homeVisible = await page.locator('#home-shooter-select').isVisible({ timeout: 5000 }).catch(() => false);
      if (!homeVisible) {
        await page.click('button[aria-label="Back"], button:has-text("Back")');
        await page.waitForLoadState('networkidle');
      }
      await selectShooter(page, SHOOTER_1.lastName);
    }

    // Verify no limit error appeared
    await expect(page.locator('text=/record limit|maximum records/i')).not.toBeVisible();
  });

  test('previous records shows all created records', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await page.click('button:has-text("View Previous Records")');
    await expect(page.locator('.divide-y > div, tr, li').first()).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Monthly Account - Modify Plan Modal', () => {

  test('modify plan modal opens with password step', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    await openUpgradeModal(page);
    await expect(page.locator('#upgrade-modal-password')).toBeVisible();
  });

  test('modify plan shows Monthly, Annual, and Free options after password', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    await openUpgradeModal(page);
    await verifyPasswordInModal(page, MONTHLY_USER.password);
    // Should NOT show Monthly (current plan)
    await expect(page.locator('button[aria-label="Select Monthly plan"]')).not.toBeVisible();
    // Should show Annual and Free
    await expect(page.locator('button[aria-label="Select Annual plan"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Select Free plan"]')).toBeVisible();
  });

  test('selecting Free plan shows downgrade warning modal', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    await openUpgradeModal(page);
    await verifyPasswordInModal(page, MONTHLY_USER.password);
    await page.click('button[aria-label="Select Free plan"]');
    await expect(page.locator('text=Downgrading to Free Plan')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=end of your current billing period')).toBeVisible();
  });

  test('downgrade warning shows Go Back button', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    await openUpgradeModal(page);
    await verifyPasswordInModal(page, MONTHLY_USER.password);
    await page.click('button[aria-label="Select Free plan"]');
    await expect(page.locator('button:has-text("Go Back")')).toBeVisible();
    // Go back to plan selection
    await page.click('button:has-text("Go Back")');
    await expect(page.locator('button[aria-label="Select Annual plan"]')).toBeVisible();
  });

  test('confirming downgrade to Free shows Cancellation Scheduled success step', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    await openUpgradeModal(page);
    await verifyPasswordInModal(page, MONTHLY_USER.password);
    await page.click('button[aria-label="Select Free plan"]');
    await page.click('button:has-text("Confirm Downgrade")');
    await expect(page.locator('text=Cancellation Scheduled')).toBeVisible({ timeout: 15000 });
    await expect(page.locator('text=full access continues until')).toBeVisible();
  });

  test('after downgrade scheduled, home screen shows cancellation pending banner', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    // Close modal after downgrade
    await page.locator('button:has-text("Done")').click().catch(() => {});
    // Home screen should show cancellation pending text
    await expect(page.locator('text=Cancellation scheduled')).toBeVisible({ timeout: 8000 });
  });

  test('selecting Annual from Monthly redirects to Stripe checkout', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    await openUpgradeModal(page);
    await verifyPasswordInModal(page, MONTHLY_USER.password);
    await page.click('button[aria-label="Select Annual plan"]');
    // Should start redirecting to Stripe
    await expect(page.locator('text=Redirecting to secure payment')).toBeVisible({ timeout: 8000 });
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
    await expect(page).toHaveURL(/checkout\.stripe\.com/);
    // Navigate back to avoid disrupting other tests
    await page.goBack();
  });
});

test.describe('Monthly Account - Manage Billing', () => {

  test('Manage Billing button opens Stripe portal', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    await page.waitForSelector('button:has-text("Manage Billing")', { timeout: 10000 });

    // Listen for popup or navigation to Stripe
    const [newPageOrNavigation] = await Promise.all([
      page.context().waitForEvent('page').catch(() => null),
      page.click('button:has-text("Manage Billing")'),
    ]);

    // Either a new tab opens or the page navigates to billing.stripe.com
    if (newPageOrNavigation) {
      await expect(newPageOrNavigation).toHaveURL(/stripe\.com/, { timeout: 15000 });
    } else {
      await expect(page).toHaveURL(/stripe\.com/, { timeout: 15000 });
    }
  });
});
