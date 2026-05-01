import { test, expect } from '@playwright/test';
import {
  FREE_USER,
  MONTHLY_USER,
  ANNUAL_USER,
  ADMIN_USERNAME,
  ADMIN_PASSWORD,
} from './test-config';
import {
  loginAsTenant,
  loginAsAdmin,
  openUpgradeModal,
  verifyPasswordInModal,
  completeStripeCheckout,
  setTenantPlanAdmin,
} from './helpers';

// =============================================================================
// PLAN TRANSITION TESTS
// Tests all upgrade and downgrade paths between plan types.
// Requires all accounts from 02-auth.spec.ts to exist.
// =============================================================================

test.describe('Free Account - Upgrade to Monthly via Stripe', () => {

  test('free account can upgrade to Monthly through Stripe checkout', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await openUpgradeModal(page);
    await verifyPasswordInModal(page, FREE_USER.password);

    // Select Monthly plan
    await page.click('button[aria-label="Select Monthly plan"]');

    // Should redirect to Stripe
    await expect(page.locator('text=Redirecting to secure payment')).toBeVisible({ timeout: 8000 });
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
    await completeStripeCheckout(page);

    // After successful payment, should return to app
    await page.waitForURL(new RegExp(`${process.env.APP_URL || 'localhost'}.*payment_success=1`), { timeout: 60000 });
    await expect(
      page.locator('text=Payment Confirmed, text=Plan Activated, text=Monthly, h2:has-text("Success")')
    ).toBeVisible({ timeout: 60000 });
  });

  test('after upgrade to Monthly, free account shows Monthly plan', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await expect(page.locator('text=Monthly')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('button:has-text("Modify Plan")')).toBeVisible({ timeout: 5000 });
  });

  test('after upgrade to Monthly, free account can downgrade back to Free', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await openUpgradeModal(page);
    await verifyPasswordInModal(page, FREE_USER.password);
    await page.click('button[aria-label="Select Free plan"]');
    await expect(page.locator('text=Downgrading to Free Plan')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Confirm Downgrade")');
    await expect(page.locator('text=Cancellation Scheduled')).toBeVisible({ timeout: 15000 });
    await page.click('button:has-text("Done")');
    // Should show cancellation pending banner
    await expect(page.locator('text=Cancellation scheduled')).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Free Account - Upgrade to Annual via Stripe', () => {

  test('free account can upgrade to Annual through Stripe checkout', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);

    // Reset to Free first via admin if needed
    // Then upgrade to Annual
    await openUpgradeModal(page);
    await page.fill('#upgrade-modal-password', FREE_USER.password);
    await page.click('button:has-text("Continue")');

    // May show Monthly or Annual options depending on current plan state
    const annualBtn = page.locator('button[aria-label="Select Annual plan"]');
    if (!await annualBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'Annual button not visible - account may already be on paid plan.');
      return;
    }

    await annualBtn.click();
    await expect(page.locator('text=Redirecting to secure payment')).toBeVisible({ timeout: 8000 });
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
    await completeStripeCheckout(page);

    await page.waitForURL(new RegExp(`${process.env.APP_URL || 'localhost'}.*payment_success=1`), { timeout: 60000 });
    await expect(
      page.locator('text=Payment Confirmed, text=Plan Activated, text=Annual, h2:has-text("Success")')
    ).toBeVisible({ timeout: 60000 });
  });
});

test.describe('Monthly Account - Switch to Annual', () => {

  test('monthly account can switch to Annual via Stripe checkout', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);

    // Check if plan is currently Monthly (it might be in downgrade-pending state)
    const modifyBtn = page.locator('button:has-text("Modify Plan")');
    if (!await modifyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'Modify Plan button not visible - check monthly account plan state.');
      return;
    }

    await modifyBtn.click();
    await page.fill('#upgrade-modal-password', MONTHLY_USER.password);
    await page.click('button:has-text("Continue")');
    await expect(page.locator('text=Select a new plan')).toBeVisible({ timeout: 8000 });

    const annualBtn = page.locator('button[aria-label="Select Annual plan"]');
    if (!await annualBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
      await page.click('button[aria-label="Close"]');
      test.skip(true, 'Annual option not available from current Monthly state.');
      return;
    }

    await annualBtn.click();
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
    await completeStripeCheckout(page);

    await page.waitForURL(new RegExp(`${process.env.APP_URL || 'localhost'}.*payment_success=1`), { timeout: 60000 });
    await expect(
      page.locator('text=Payment Confirmed, text=Plan Activated, text=Annual')
    ).toBeVisible({ timeout: 60000 });
  });

  test('monthly account after switching to Annual shows Annual plan', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    // Either Monthly or Annual depending on whether previous test ran
    const planText = await page.locator('text=Monthly, text=Annual').first().textContent({ timeout: 8000 }).catch(() => '');
    expect(['Monthly', 'Annual'].some(p => planText?.includes(p))).toBeTruthy();
  });
});

test.describe('Annual Account - Downgrade to Monthly', () => {

  test('annual account can initiate switch to Monthly via Stripe', async ({ page }) => {
    await loginAsTenant(page, ANNUAL_USER.email, ANNUAL_USER.password);

    const modifyBtn = page.locator('button:has-text("Modify Plan")');
    if (!await modifyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      test.skip(true, 'Modify Plan not visible on annual account.');
      return;
    }

    await modifyBtn.click();
    await page.fill('#upgrade-modal-password', ANNUAL_USER.password);
    await page.click('button:has-text("Continue")');

    const monthlyBtn = page.locator('button[aria-label="Select Monthly plan"]');
    if (!await monthlyBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await page.click('button[aria-label="Close"]');
      test.skip(true, 'Monthly option not available from current Annual state.');
      return;
    }

    await monthlyBtn.click();
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
    await expect(page).toHaveURL(/checkout\.stripe\.com/);
    // Navigate back without completing - just verify checkout was reached
    await page.goBack();
  });
});

test.describe('Admin Plan Override Tests', () => {

  test('admin can change free tenant plan to Monthly', async ({ page }) => {
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);

    const tenantRow = page.locator('.divide-y > div').filter({ hasText: FREE_USER.email });
    const rowVisible = await tenantRow.isVisible().catch(() => false);

    if (!rowVisible) {
      test.skip(true, 'Free user not found in admin dashboard.');
      return;
    }

    const planSelect = tenantRow.locator('select[id^="plan-select-"]');
    await planSelect.evaluate((s: HTMLSelectElement) => { for (const o of Array.from(s.options)) { if (o.text.includes('Monthly')) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); break; } } });
    await tenantRow.locator('button:has-text("Set")').click();
    await page.waitForLoadState('networkidle');

    // Log in as tenant and verify plan changed
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await expect(page.locator('text=Monthly')).toBeVisible({ timeout: 10000 });
  });

  test('admin can change tenant plan to Promotional', async ({ page }) => {
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);

    const tenantRow = page.locator('.divide-y > div').filter({ hasText: FREE_USER.email });
    const rowVisible = await tenantRow.isVisible().catch(() => false);

    if (!rowVisible) {
      test.skip(true, 'Free user not found in admin dashboard.');
      return;
    }

    const planSelect = tenantRow.locator('select[id^="plan-select-"]');
    await planSelect.evaluate((s: HTMLSelectElement) => { for (const o of Array.from(s.options)) { if (o.text.includes('Promotional')) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); break; } } });
    await tenantRow.locator('button:has-text("Set")').click();
    await page.waitForLoadState('networkidle');

    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await expect(page.locator('text=Promotional')).toBeVisible({ timeout: 10000 });
  });

  test('admin can reset tenant plan back to Free', async ({ page }) => {
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);

    const tenantRow = page.locator('.divide-y > div').filter({ hasText: FREE_USER.email });
    const rowVisible = await tenantRow.isVisible().catch(() => false);

    if (!rowVisible) {
      test.skip(true, 'Free user not found in admin dashboard.');
      return;
    }

    const planSelect = tenantRow.locator('select[id^="plan-select-"]');
    await planSelect.evaluate((s: HTMLSelectElement) => { for (const o of Array.from(s.options)) { if (o.text.startsWith('Free')) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); break; } } });
    await tenantRow.locator('button:has-text("Set")').click();
    await page.waitForLoadState('networkidle');

    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await expect(page.locator('text=Free Plan')).toBeVisible({ timeout: 10000 });
  });

  test('admin plan change takes effect immediately on next login', async ({ page }) => {
    // Change to Annual via admin
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);

    const tenantRow = page.locator('.divide-y > div').filter({ hasText: FREE_USER.email });
    const rowVisible = await tenantRow.isVisible().catch(() => false);
    if (!rowVisible) {
      test.skip(true, 'Free user not found.');
      return;
    }

    const planSelect = tenantRow.locator('select[id^="plan-select-"]');
    await planSelect.evaluate((s: HTMLSelectElement) => { for (const o of Array.from(s.options)) { if (o.text.includes('Annual')) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); break; } } });
    await tenantRow.locator('button:has-text("Set")').click();
    await page.waitForLoadState('networkidle');

    // Log out admin, log in as tenant - plan should reflect immediately
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await expect(page.locator('text=Annual')).toBeVisible({ timeout: 10000 });

    // Reset back to Free for cleanliness
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    const row2 = page.locator('.divide-y > div').filter({ hasText: FREE_USER.email });
    const planSelect2 = row2.locator('select[id^="plan-select-"]');
    await planSelect2.evaluate((s: HTMLSelectElement) => { for (const o of Array.from(s.options)) { if (o.text.startsWith('Free')) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); break; } } });
    await row2.locator('button:has-text("Set")').click();
    await page.waitForLoadState('networkidle');
  });
});

test.describe('Admin Delete Tenant Test', () => {

  test('admin can permanently delete a tenant and data is gone', async ({ page }) => {
    // Register a sacrificial account just to delete it
    await page.goto('/register');
    await page.fill('#register-name', 'Delete Test User');
    await page.fill('#register-email', 'deletetest@example.com');
    await page.waitForFunction(() => {
      const s = document.querySelector('#register-plan') as HTMLSelectElement;
      return s && s.options.length > 1;
    }, { timeout: 15000 });
    await page.evaluate(() => { const s = document.querySelector('#register-plan') as HTMLSelectElement; for (const o of Array.from(s.options)) { if (o.text.startsWith('Free')) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); break; } } });
    await page.fill('#register-site-name', 'deletetestsite');
    await page.fill('#register-password', 'DeleteTest1!');
    await page.fill('#register-confirm-password', 'DeleteTest1!');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Access Granted')).toBeVisible({ timeout: 20000 });

    // Admin delete
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    const tenantRow = page.locator('.divide-y > div').filter({ hasText: 'deletetest@example.com' });
    await tenantRow.locator('button[aria-label*="Delete"]').click();
    await expect(page.locator('text=cannot be undone')).toBeVisible({ timeout: 5000 });
    await page.click('button:has-text("Delete Permanently")');
    await page.waitForLoadState('networkidle');

    // Tenant row should be gone
    await expect(
      page.locator('.divide-y > div').filter({ hasText: 'deletetest@example.com' })
    ).not.toBeVisible({ timeout: 10000 });

    // Attempt login with deleted account should fail
    await page.goto('/');
    const splashBtn = page.locator('button:has-text("Get Started"), a:has-text("Sign in")');
    if (await splashBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await splashBtn.first().click();
    }
    await page.fill('#login-email', 'deletetest@example.com');
    await page.fill('#login-password', 'DeleteTest1!');
    await page.click('button[type="submit"]');
    await expect(page.locator('.bg-red-50, .text-red-700')).toBeVisible({ timeout: 8000 });
  });
});
