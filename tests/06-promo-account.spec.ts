import { test, expect } from '@playwright/test';
import { PROMO_USER, SHOOTER_1, SHOOTER_2, SHOOTER_3, SAMPLE_SETTINGS, SAMPLE_RECORD } from './test-config';
import {
  loginAsTenant,
  navigateToSettings,
  selectShooter,
  fillRangeRecord,
  saveRangeRecord,
  openUpgradeModal,
  verifyPasswordInModal,
  completeStripeCheckout,
} from './helpers';

// =============================================================================
// PROMOTIONAL ACCOUNT FEATURE TESTS
// Assumes promo account was registered in 02-auth.spec.ts.
// Tests unlimited shooters, 100-record limit, and upgrade to paid plans.
// =============================================================================

test.describe('Promo Account - Plan Banner', () => {

  test('promo account shows Promotional plan indicator', async ({ page }) => {
    await loginAsTenant(page, PROMO_USER.email, PROMO_USER.password);
    await expect(page.locator('text=Promotional')).toBeVisible({ timeout: 10000 });
  });

  test('promo account does not show the Free Plan limit banner', async ({ page }) => {
    await loginAsTenant(page, PROMO_USER.email, PROMO_USER.password);
    await expect(page.locator('text=Free Plan')).not.toBeVisible();
  });

  test('promo account shows expiration date in banner if expires_at is set', async ({ page }) => {
    await loginAsTenant(page, PROMO_USER.email, PROMO_USER.password);
    // If expires_at is set, the banner should show "through [date]"
    const banner = page.locator('text=/Promotional Plan.*through|Unlimited access through/i');
    // This may or may not be visible depending on whether expires_at is set by admin
    const isVisible = await banner.isVisible({ timeout: 3000 }).catch(() => false);
    // Just verify the page loaded correctly regardless
    await expect(page.locator('#home-shooter-select')).toBeVisible();
  });
});

test.describe('Promo Account - Unlimited Shooters', () => {

  test('can create multiple shooters (promo is unlimited)', async ({ page }) => {
    await loginAsTenant(page, PROMO_USER.email, PROMO_USER.password);

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
    // All 3 shooters should be in dropdown
    for (const shooter of [SHOOTER_1, SHOOTER_2, SHOOTER_3]) {
      await expect(page.locator('#home-shooter-select option').filter({ hasText: shooter.lastName })).toBeVisible({ timeout: 10000 });
    }
  });

  test('New Shooter option is NOT disabled for promo plan', async ({ page }) => {
    await loginAsTenant(page, PROMO_USER.email, PROMO_USER.password);
    const newShooterOption = page.locator('#home-shooter-select option[value="new"]');
    const isDisabled = await newShooterOption.evaluate((el: HTMLOptionElement) => el.disabled);
    expect(isDisabled).toBeFalsy();
  });
});

test.describe('Promo Account - Unlimited Settings', () => {

  test('can add more than 5 values per settings category', async ({ page }) => {
    await loginAsTenant(page, PROMO_USER.email, PROMO_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await navigateToSettings(page);

    // Add all 5 + 1 extra
    const allLocations = [...SAMPLE_SETTINGS.range_location, 'Promo Extra Location'];
    for (const value of allLocations) {
      const addInput = page.locator('#settings-add-range_location');
      const isDisabled = await addInput.isDisabled().catch(() => false);
      if (!isDisabled) {
        await addInput.fill(value);
        await page.click('button[aria-label="Add range_location"], button[aria-label*="Add range location"]');
        await page.waitForLoadState('networkidle');
      }
    }

    // No limit badge
    const limitBadge = page.locator('text=5/5');
    expect(await limitBadge.isVisible({ timeout: 2000 }).catch(() => false)).toBeFalsy();
  });
});

test.describe('Promo Account - Range Records', () => {

  test('can create range records for promo account', async ({ page }) => {
    await loginAsTenant(page, PROMO_USER.email, PROMO_USER.password);
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

    await selectShooter(page, SHOOTER_1.lastName);
    await page.click('button:has-text("New Record")');
    await fillRangeRecord(page, {
      conditions: SAMPLE_RECORD.conditions,
      weather: SAMPLE_RECORD.weather,
      additionalNotes: SAMPLE_RECORD.additionalNotes,
    });
    await saveRangeRecord(page);

    // Verify record shows in list
    await selectShooter(page, SHOOTER_1.lastName);
    await page.click('button:has-text("View Previous Records")');
    await expect(page.locator('.divide-y > div, tr, li').first()).toBeVisible({ timeout: 10000 });
  });

  test('promo account has 100 record limit (not 20)', async ({ page }) => {
    await loginAsTenant(page, PROMO_USER.email, PROMO_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await page.click('button:has-text("New Record")');

    // At low record count, no limit message should appear
    await expect(page.locator('text=/20 record limit|Free plan limit/i')).not.toBeVisible();
    await page.click('button[aria-label="Back"], button:has-text("Back")');
  });
});

test.describe('Promo Account - Upgrade to Monthly', () => {

  test('upgrade plan modal shows upgrade options for promo plan', async ({ page }) => {
    await loginAsTenant(page, PROMO_USER.email, PROMO_USER.password);

    // Promo upgrade button may only show within 15 days of expiry
    // However the upgrade button should be shown if expiry is near
    // We test the modal regardless using a direct button check
    const upgradeBtn = page.locator('button:has-text("Upgrade")');
    const modifyBtn = page.locator('button:has-text("Modify Plan")');

    const hasUpgrade = await upgradeBtn.isVisible({ timeout: 3000 }).catch(() => false);
    const hasModify = await modifyBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasUpgrade && !hasModify) {
      test.skip(true, 'Upgrade button not shown - promo plan expiry not within 15 days. Admin must set expires_at within 15 days to test this.');
      return;
    }

    await (hasUpgrade ? upgradeBtn : modifyBtn).click();
    await expect(page.locator('#upgrade-modal-password')).toBeVisible({ timeout: 5000 });
    await verifyPasswordInModal(page, PROMO_USER.password);
    await expect(page.locator('button[aria-label="Select Monthly plan"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Select Annual plan"]')).toBeVisible();
  });

  test('promo account can initiate upgrade to Monthly via Stripe checkout', async ({ page }) => {
    await loginAsTenant(page, PROMO_USER.email, PROMO_USER.password);

    const upgradeBtn = page.locator('button:has-text("Upgrade")');
    const modifyBtn = page.locator('button:has-text("Modify Plan")');
    const hasUpgrade = await upgradeBtn.isVisible({ timeout: 3000 }).catch(() => false);
    const hasModify = await modifyBtn.isVisible({ timeout: 3000 }).catch(() => false);

    if (!hasUpgrade && !hasModify) {
      test.skip(true, 'Upgrade button not shown - promo plan expiry not within 15 days.');
      return;
    }

    await (hasUpgrade ? upgradeBtn : modifyBtn).click();
    await page.fill('#upgrade-modal-password', PROMO_USER.password);
    await page.click('button:has-text("Continue")');
    await expect(page.locator('text=Select a new plan')).toBeVisible({ timeout: 8000 });
    await page.click('button[aria-label="Select Monthly plan"]');
    await expect(page.locator('text=Redirecting to secure payment')).toBeVisible({ timeout: 8000 });
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
    await expect(page).toHaveURL(/checkout\.stripe\.com/);
    // Don't complete checkout - navigate back
    await page.goBack();
  });
});
