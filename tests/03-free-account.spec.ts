import { test, expect } from '@playwright/test';
import { FREE_USER, SHOOTER_1, SHOOTER_2, SAMPLE_SETTINGS, SAMPLE_RECORD } from './test-config';
import { loginAsTenant, navigateToSettings, selectShooter, fillRangeRecord, saveRangeRecord, openUpgradeModal, verifyPasswordInModal } from './helpers';

// =============================================================================
// FREE ACCOUNT FEATURE TESTS
// Assumes free account was registered in 02-auth.spec.ts.
// Tests shooter limits, settings limits, record limits, and all core features.
// =============================================================================

test.describe('Free Account - Plan Banner and Home Screen', () => {

  test('free account shows plan banner with correct limits', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await expect(page.locator('text=Free Plan')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=2')).toBeVisible();
    await expect(page.locator('text=20')).toBeVisible();
    await expect(page.locator('text=5')).toBeVisible();
  });

  test('free account shows Upgrade button in banner', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await expect(page.locator('button:has-text("Upgrade")')).toBeVisible();
  });
});

test.describe('Free Account - Shooter Management', () => {

  test('can create first shooter', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await page.selectOption('#home-shooter-select', 'new');
    await page.click('button:has-text("New Record")');

    await page.fill('#new-shooter-first-name', SHOOTER_1.firstName);
    await page.fill('#new-shooter-last-name', SHOOTER_1.lastName);
    await page.fill('#new-shooter-email', SHOOTER_1.email);
    await page.fill('#new-shooter-phone', SHOOTER_1.phone);
    await page.fill('#new-shooter-notes', SHOOTER_1.notes);

    await page.click('button[type="submit"], button:has-text("Create Shooter"), button:has-text("Save")');
    await page.waitForLoadState('networkidle');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#home-shooter-select option').filter({ hasText: SHOOTER_1.lastName })).toBeVisible({ timeout: 10000 });
  });

  test('can create second shooter', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await page.selectOption('#home-shooter-select', 'new');
    await page.click('button:has-text("New Record")');

    await page.fill('#new-shooter-first-name', SHOOTER_2.firstName);
    await page.fill('#new-shooter-last-name', SHOOTER_2.lastName);
    await page.fill('#new-shooter-email', SHOOTER_2.email);
    await page.fill('#new-shooter-phone', SHOOTER_2.phone);
    await page.fill('#new-shooter-notes', SHOOTER_2.notes);

    await page.click('button[type="submit"], button:has-text("Create Shooter"), button:has-text("Save")');
    await page.waitForLoadState('networkidle');
    await page.goto('/');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#home-shooter-select option').filter({ hasText: SHOOTER_2.lastName })).toBeVisible({ timeout: 10000 });
  });

  test('New Shooter option is disabled after reaching 2-shooter limit', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    const newShooterOption = page.locator('#home-shooter-select option[value="new"]');
    await expect(newShooterOption).toBeVisible();
    const isDisabled = await newShooterOption.evaluate((el: HTMLOptionElement) => el.disabled);
    expect(isDisabled).toBeTruthy();
  });

  test('plan banner updates shooter count after adding shooters', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await expect(page.locator('text=/2 of 2 shooters/')).toBeVisible({ timeout: 5000 });
  });
});

test.describe('Free Account - Settings', () => {

  test('settings screen loads for shooter 1', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await navigateToSettings(page);
    await expect(page.locator('text=Settings')).toBeVisible();
    await expect(page.locator('text=Range Location')).toBeVisible();
  });

  test('settings shows Free Plan limit banner', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await navigateToSettings(page);
    await expect(page.locator('text=Free Plan')).toBeVisible();
    await expect(page.locator('text=5')).toBeVisible();
  });

  test('can add up to 5 values for range_location category', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await navigateToSettings(page);

    for (const value of SAMPLE_SETTINGS.range_location) {
      await page.fill('#settings-add-range_location', value);
      await page.click('button[aria-label="Add range_location"], button[aria-label*="Add range location"]');
      await page.waitForLoadState('networkidle');
    }
    await expect(page.locator('text=5/5')).toBeVisible({ timeout: 5000 });
  });

  test('add button is disabled when settings category limit reached', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await navigateToSettings(page);
    const addInput = page.locator('#settings-add-range_location');
    await expect(addInput).toBeDisabled();
  });

  test('add input shows Limit reached placeholder when at max', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await navigateToSettings(page);
    const placeholder = await page.locator('#settings-add-range_location').getAttribute('placeholder');
    expect(placeholder).toMatch(/Limit reached/i);
  });

  test('can add settings to other categories', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await navigateToSettings(page);

    for (const value of SAMPLE_SETTINGS.range_type.slice(0, 3)) {
      await page.fill('#settings-add-range_type', value);
      await page.click('button[aria-label="Add range_type"], button[aria-label*="Add range type"]');
      await page.waitForLoadState('networkidle');
    }
    await expect(page.locator('text=3/5')).toBeVisible({ timeout: 5000 });
  });

  test('can add settings for all categories needed for records', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await navigateToSettings(page);

    const categoriesToAdd: [string, string[]][] = [
      ['practice_type', SAMPLE_SETTINGS.practice_type.slice(0, 1)],
      ['target_type', SAMPLE_SETTINGS.target_type.slice(0, 1)],
      ['target_distance', SAMPLE_SETTINGS.target_distance.slice(0, 1)],
      ['shooting_position', SAMPLE_SETTINGS.shooting_position.slice(0, 1)],
      ['firearm_type', SAMPLE_SETTINGS.firearm_type.slice(0, 1)],
      ['firearm_model', SAMPLE_SETTINGS.firearm_model.slice(0, 1)],
      ['ammunition', SAMPLE_SETTINGS.ammunition.slice(0, 1)],
    ];

    for (const [cat, values] of categoriesToAdd) {
      for (const value of values) {
        await page.fill(`#settings-add-${cat}`, value);
        await page.click(`button[aria-label="Add ${cat}"], button[aria-label*="Add ${cat.replace(/_/g, ' ')}"]`);
        await page.waitForLoadState('networkidle');
      }
    }
    await expect(page.locator('text=1/5')).toBeVisible({ timeout: 5000 });
  });

  test('settings page shows View Shooter Profile button', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await navigateToSettings(page);
    await expect(page.locator('button:has-text("View Shooter Profile")')).toBeVisible();
  });

  test('can delete a settings value', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await navigateToSettings(page);

    const rangeTypeBadge = page.locator('text=/[0-4]\\/5/').first();
    const currentText = await rangeTypeBadge.textContent().catch(() => '0/5');
    const currentCount = parseInt(currentText?.charAt(0) || '0');

    if (currentCount < 5) {
      await page.fill('#settings-add-range_type', 'TEMP_DELETE_ME');
      await page.click('button[aria-label="Add range_type"], button[aria-label*="Add range type"]');
      await page.waitForLoadState('networkidle');
    }

    const tempItem = page.locator('text=TEMP_DELETE_ME');
    if (await tempItem.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.click('button[aria-label="Delete TEMP_DELETE_ME"]');
      await page.waitForLoadState('networkidle');
      await expect(tempItem).not.toBeVisible({ timeout: 5000 });
    }
  });

  test('back to home button works from settings', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await navigateToSettings(page);
    await page.click('button[aria-label="Back to Home"], button:has-text("Back to Home")');
    await expect(page.locator('#home-shooter-select')).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Free Account - Range Records', () => {

  test('can create a range record with all fields', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await page.click('button:has-text("New Record")');

    const today = new Date().toISOString().split('T')[0];
    await expect(page.locator('#record-date')).toHaveValue(today);

    await fillRangeRecord(page, {
      rangeLocation: SAMPLE_SETTINGS.range_location[0],
      rangeType: SAMPLE_SETTINGS.range_type[0],
      practiceType: SAMPLE_SETTINGS.practice_type[0],
      targetType: SAMPLE_SETTINGS.target_type[0],
      targetDistance: SAMPLE_SETTINGS.target_distance[0],
      shootingPosition: SAMPLE_SETTINGS.shooting_position[0],
      firearmType: SAMPLE_SETTINGS.firearm_type[0],
      firearmModel: SAMPLE_SETTINGS.firearm_model[0],
      ammunition: SAMPLE_SETTINGS.ammunition[0],
      conditions: SAMPLE_RECORD.conditions,
      weather: SAMPLE_RECORD.weather,
      additionalNotes: SAMPLE_RECORD.additionalNotes,
    });

    await saveRangeRecord(page);
    await expect(page.locator('text=Previous Records, text=View Records, #home-shooter-select')).toBeVisible({ timeout: 15000 });
  });

  test('record appears in Previous Records list', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await page.click('button:has-text("View Previous Records")');
    await expect(page.locator('.divide-y > div, tr, li').first()).toBeVisible({ timeout: 10000 });
  });

  test('record date auto-populates with today', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await page.click('button:has-text("New Record")');
    const today = new Date().toISOString().split('T')[0];
    await expect(page.locator('#record-date')).toHaveValue(today);
    await page.click('button[aria-label="Back"], button:has-text("Back")');
  });

  test('can view a saved record', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await page.click('button:has-text("View Previous Records")');
    await page.click('button[aria-label*="View"], button:has-text("View")');
    await expect(page.locator('text=' + SAMPLE_RECORD.conditions)).toBeVisible({ timeout: 10000 });
    await expect(page.locator('text=' + SAMPLE_RECORD.weather)).toBeVisible();
  });

  test('can edit a saved record', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await page.click('button:has-text("View Previous Records")');
    await page.click('button[aria-label*="View"], button:has-text("View")');

    await page.click('button:has-text("Edit"), button[aria-label="Edit record"]');
    const newConditions = 'Updated conditions for test';
    await page.fill('#edit-conditions', newConditions);
    await page.click('button:has-text("Save"), button:has-text("Update")');
    await page.waitForLoadState('networkidle');

    await page.click('button:has-text("View Previous Records")');
    await page.click('button[aria-label*="View"], button:has-text("View")');
    await expect(page.locator(`text=${newConditions}`)).toBeVisible({ timeout: 8000 });
  });

  test('can delete a range record', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await page.click('button:has-text("View Previous Records")');

    const recordsBefore = await page.locator('[data-testid="record-row"], .record-row, .divide-y > div').count();
    await page.click('button[aria-label*="Delete"], button:has-text("Delete")');
    const confirmBtn = page.locator('button:has-text("Confirm"), button:has-text("Delete"), button:has-text("Yes")');
    if (await confirmBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await confirmBtn.click();
    }
    await page.waitForLoadState('networkidle');
    const recordsAfter = await page.locator('[data-testid="record-row"], .record-row, .divide-y > div').count();
    expect(recordsAfter).toBeLessThan(recordsBefore);
  });

  test('can export records to CSV', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await page.click('button:has-text("View Previous Records")');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("CSV"), button[aria-label*="CSV"], button[aria-label*="Export"]')
        .catch(() => page.click('button:has-text("Export")')),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.csv$/i);
  });

  test('filters work on Previous Records screen', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await page.click('button:has-text("View Previous Records")');

    await page.selectOption('#filter-type-0', 'range_location');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#filter-value-0')).toBeVisible({ timeout: 5000 });
  });

  test('date range filter shows start and end date inputs', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await page.click('button:has-text("View Previous Records")');

    await page.selectOption('#filter-type-0', 'date_range');
    await expect(page.locator('#filter-date-start-0')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('#filter-date-end-0')).toBeVisible({ timeout: 5000 });
  });

  test('clear filters resets all filter dropdowns', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await page.click('button:has-text("View Previous Records")');

    await page.selectOption('#filter-type-0', 'range_location');
    await page.waitForLoadState('networkidle');
    await page.click('button:has-text("Clear Filters"), button:has-text("Clear")');
    await page.waitForLoadState('networkidle');

    const filterType = await page.locator('#filter-type-0').inputValue();
    expect(filterType).toBe('');
  });

  test('PDF export works for a single record', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await page.click('button:has-text("View Previous Records")');
    await page.click('button[aria-label*="View"], button:has-text("View")');

    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.click('button:has-text("PDF"), button[aria-label*="PDF"]'),
    ]);
    expect(download.suggestedFilename()).toMatch(/\.pdf$/i);
  });

  test('batch create records up to the free plan limit', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);

    for (let i = 0; i < 18; i++) {
      await page.click('button:has-text("New Record")');
      await fillRangeRecord(page, {
        conditions: `Batch record ${i + 2}`,
        weather: 'Test weather',
      });
      await saveRangeRecord(page);
      const homeVisible = await page.locator('#home-shooter-select').isVisible({ timeout: 5000 }).catch(() => false);
      if (!homeVisible) {
        await page.click('button[aria-label="Back"], button:has-text("Back"), a:has-text("Back")');
        await page.waitForLoadState('networkidle');
      }
      await selectShooter(page, SHOOTER_1.lastName);
    }

    await page.click('button:has-text("View Previous Records")');
    await expect(page.locator('.divide-y > div, tr, li').first()).toBeVisible({ timeout: 10000 });
  });

  test('free plan record limit is enforced at 20 records per shooter', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await page.click('button:has-text("New Record")');

    const limitMsg = page.locator('text=/limit|maximum|20 records/i');
    const saveBtn = page.locator('button:has-text("Save Record"), button:has-text("Save")');

    const limitVisible = await limitMsg.isVisible({ timeout: 5000 }).catch(() => false);
    const saveBtnDisabled = await saveBtn.isDisabled({ timeout: 3000 }).catch(() => false);
    expect(limitVisible || saveBtnDisabled).toBeTruthy();
  });
});

test.describe('Free Account - Shooter Profile', () => {

  test('can edit shooter profile', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await navigateToSettings(page);
    await page.click('button:has-text("View Shooter Profile")');

    const newPhone = '555-999-8888';
    await page.fill('#profile-phone', newPhone);
    await page.click('button[type="submit"], button:has-text("Save"), button:has-text("Update")');
    await page.waitForLoadState('networkidle');

    await page.click('button[aria-label="Back"], button:has-text("Back")');
    await selectShooter(page, SHOOTER_1.lastName);
    await navigateToSettings(page);
    await page.click('button:has-text("View Shooter Profile")');
    await expect(page.locator('#profile-phone')).toHaveValue(newPhone, { timeout: 8000 });
  });

  test('shooter profile shows all fields', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await selectShooter(page, SHOOTER_1.lastName);
    await navigateToSettings(page);
    await page.click('button:has-text("View Shooter Profile")');

    await expect(page.locator('#profile-first-name')).toBeVisible();
    await expect(page.locator('#profile-last-name')).toBeVisible();
    await expect(page.locator('#profile-email')).toBeVisible();
    await expect(page.locator('#profile-phone')).toBeVisible();
  });
});

test.describe('Free Account - Upgrade Plan Modal', () => {

  test('upgrade modal opens and shows password field', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await openUpgradeModal(page);
    await expect(page.locator('#upgrade-modal-password')).toBeVisible();
    await expect(page.locator('button:has-text("Continue")')).toBeVisible();
  });

  test('upgrade modal shows error for wrong password', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await openUpgradeModal(page);
    await page.fill('#upgrade-modal-password', 'wrongpassword');
    await page.click('button:has-text("Continue")');
    await expect(page.locator('text=Incorrect password, text=incorrect')).toBeVisible({ timeout: 8000 });
  });

  test('upgrade modal shows plan options after password verified', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await openUpgradeModal(page);
    await verifyPasswordInModal(page, FREE_USER.password);
    await expect(page.locator('button[aria-label="Select Monthly plan"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Select Annual plan"]')).toBeVisible();
    await expect(page.locator('button[aria-label="Select Free plan"]')).not.toBeVisible();
  });

  test('upgrade modal close button works', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await openUpgradeModal(page);
    await page.click('button[aria-label="Close"]');
    await expect(page.locator('#upgrade-modal-password')).not.toBeVisible({ timeout: 5000 });
  });

  test('upgrade modal shows current plan in plan selection step', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await openUpgradeModal(page);
    await verifyPasswordInModal(page, FREE_USER.password);
    await expect(page.locator('text=Your current plan')).toBeVisible();
    await expect(page.locator('text=Free')).toBeVisible();
  });
});

test.describe('Free Account - Logout', () => {

  test('logout button is visible on home screen', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await expect(page.locator('button[aria-label="Log out"]')).toBeVisible();
  });

  test('logout clears session and returns to splash/login screen', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await page.click('button[aria-label="Log out"]');
    await page.waitForLoadState('networkidle');
    await expect(page.locator('#home-shooter-select')).not.toBeVisible({ timeout: 8000 });
    const slug = await page.evaluate(() => localStorage.getItem('tenantSlug'));
    const token = await page.evaluate(() => localStorage.getItem('tenantToken'));
    expect(slug).toBeNull();
    expect(token).toBeNull();
  });
});
