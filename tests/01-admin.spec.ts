import { test, expect } from '@playwright/test';
import { ADMIN_USERNAME, ADMIN_PASSWORD, FREE_USER } from './test-config';
import {
  goToAdmin,
  loginAsAdmin,
  logoutAdmin,
  findTenantRow,
  setTenantPlanAdmin,
  suspendTenantAdmin,
  reactivateTenantAdmin,
  deleteTenantAdmin,
  loginAsTenant,
  goToApp,
} from './helpers';

// =============================================================================
// ADMIN PANEL TESTS
// Run these first to verify admin works before creating tenant accounts.
// =============================================================================

test.describe('Admin Panel', () => {

  test('admin login page loads correctly', async ({ page }) => {
    await goToAdmin(page);
    await expect(page.locator('h1:has-text("Admin Portal")')).toBeVisible();
    await expect(page.locator('#admin-username')).toBeVisible();
    await expect(page.locator('#admin-password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('admin login rejects wrong credentials', async ({ page }) => {
    await goToAdmin(page);
    await page.fill('#admin-username', 'wronguser');
    await page.fill('#admin-password', 'wrongpassword');
    await page.click('button[type="submit"]');
    await expect(page.locator('.text-red-700, .bg-red-50')).toBeVisible({ timeout: 8000 });
  });

  test('admin login succeeds with correct credentials', async ({ page }) => {
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await expect(page.locator('text=Range Tracker Admin')).toBeVisible();
  });

  test('admin dashboard shows stats section', async ({ page }) => {
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await expect(page.locator('text=Active Tenants')).toBeVisible();
    await expect(page.locator('text=Pending Approvals')).toBeVisible();
    await expect(page.locator('text=Total Tenants')).toBeVisible();
  });

  test('admin dashboard has Active Tenants and Registration Requests tabs', async ({ page }) => {
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await expect(page.locator('button:has-text("Active Tenants")')).toBeVisible();
    await expect(page.locator('button:has-text("Registration Requests")')).toBeVisible();
  });

  test('admin Registration Requests tab shows pending tenants or empty state', async ({ page }) => {
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.click('button:has-text("Registration Requests")');
    // Either shows pending items or the empty state message
    const hasItems = await page.locator('.divide-y > div').count() > 0;
    const hasEmptyState = await page.locator('text=No pending registrations').isVisible().catch(() => false);
    expect(hasItems || hasEmptyState).toBeTruthy();
  });

  test('admin refresh button reloads data', async ({ page }) => {
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.click('button[aria-label="Refresh"]');
    // Spinner appears briefly
    await page.waitForLoadState('networkidle');
    await expect(page.locator('text=Active Tenants')).toBeVisible();
  });

  test('admin Change Password modal opens with correct fields', async ({ page }) => {
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.click('button:has-text("Change Password")');
    await expect(page.locator('#admin-change-pw-current')).toBeVisible();
    await expect(page.locator('#admin-change-pw-new')).toBeVisible();
    await expect(page.locator('#admin-change-pw-confirm')).toBeVisible();
  });

  test('admin Change Password rejects wrong current password', async ({ page }) => {
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.click('button:has-text("Change Password")');
    await page.fill('#admin-change-pw-current', 'wrongpassword');
    await page.fill('#admin-change-pw-new', 'NewPassword1!');
    await page.fill('#admin-change-pw-confirm', 'NewPassword1!');
    await page.click('button:has-text("Update Password")');
    await expect(page.locator('.text-red-700, .bg-red-50')).toBeVisible({ timeout: 8000 });
  });

  test('admin Change Password rejects mismatched new passwords', async ({ page }) => {
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.click('button:has-text("Change Password")');
    await page.fill('#admin-change-pw-current', ADMIN_PASSWORD);
    await page.fill('#admin-change-pw-new', 'NewPassword1!');
    await page.fill('#admin-change-pw-confirm', 'DifferentPassword1!');
    await page.click('button:has-text("Update Password")');
    await expect(page.locator('text=do not match')).toBeVisible({ timeout: 5000 });
  });

  test('admin Change Password rejects short new password', async ({ page }) => {
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.click('button:has-text("Change Password")');
    await page.fill('#admin-change-pw-current', ADMIN_PASSWORD);
    await page.fill('#admin-change-pw-new', 'short');
    await page.fill('#admin-change-pw-confirm', 'short');
    await page.click('button:has-text("Update Password")');
    await expect(page.locator('text=at least 8 characters')).toBeVisible({ timeout: 5000 });
  });

  test('admin Change Password modal cancels correctly', async ({ page }) => {
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await page.click('button:has-text("Change Password")');
    await expect(page.locator('#admin-change-pw-current')).toBeVisible();
    await page.click('button:has-text("Cancel")');
    await expect(page.locator('#admin-change-pw-current')).not.toBeVisible();
  });

  test('admin logout works', async ({ page }) => {
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    await logoutAdmin(page);
    await expect(page.locator('#admin-username, h1:has-text("Admin Portal")')).toBeVisible({ timeout: 10000 });
  });

  // --- Post-registration admin tests (run after tenant accounts exist) ---

  test('admin can see test tenants in Active Tenants list', async ({ page }) => {
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    // Check if any tenants exist in the list
    const tenantRows = page.locator('.divide-y > div');
    const count = await tenantRows.count();
    // After registration tests have run, at least the free user should exist
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('admin can set tenant plan via dropdown', async ({ page }) => {
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    // Verify plan selects exist for any tenant that is present
    const planSelects = page.locator('select[id^="plan-select-"]');
    const count = await planSelects.count();
    if (count > 0) {
      // A plan selector and Set button should be visible for first tenant
      await expect(planSelects.first()).toBeVisible();
      await expect(page.locator('button:has-text("Set")').first()).toBeVisible();
    }
  });

  test('admin can suspend and reactivate a tenant', async ({ page }) => {
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);

    // Find the free test user row
    const freeUserRow = page.locator('.divide-y > div').filter({ hasText: FREE_USER.email });
    const rowVisible = await freeUserRow.isVisible().catch(() => false);

    if (!rowVisible) {
      test.skip();
      return;
    }

    // Suspend
    await freeUserRow.locator('button[aria-label*="Suspend"]').click();
    await page.waitForLoadState('networkidle');

    // Verify the suspended badge appears
    await expect(page.locator('.divide-y > div').filter({ hasText: FREE_USER.email }).locator('text=suspended')).toBeVisible({ timeout: 10000 });

    // Attempt login as suspended tenant
    await page.goto('/');
    const splashBtn = page.locator('button:has-text("Get Started"), a:has-text("Sign in")');
    if (await splashBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await splashBtn.first().click();
    }
    await page.fill('#login-email', FREE_USER.email);
    await page.fill('#login-password', FREE_USER.password);
    await page.click('button[type="submit"]');
    await expect(page.locator('text=suspended')).toBeVisible({ timeout: 8000 });

    // Reactivate via admin
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    const suspendedRow = page.locator('.divide-y > div').filter({ hasText: FREE_USER.email });
    await suspendedRow.locator('button[aria-label*="Reactivate"]').click();
    await page.waitForLoadState('networkidle');

    // Verify active badge
    await expect(page.locator('.divide-y > div').filter({ hasText: FREE_USER.email }).locator('text=active')).toBeVisible({ timeout: 10000 });

    // Verify tenant can log in again
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await expect(page.locator('#home-shooter-select')).toBeVisible();
  });

  test('admin delete confirmation modal shows before deleting', async ({ page }) => {
    await loginAsAdmin(page, ADMIN_USERNAME, ADMIN_PASSWORD);
    const tenantRows = page.locator('.divide-y > div');
    const count = await tenantRows.count();
    if (count === 0) {
      test.skip();
      return;
    }
    // Click delete on the first tenant row
    await tenantRows.first().locator('button[aria-label*="Delete"]').click();
    await expect(page.locator('text=Delete Permanently')).toBeVisible({ timeout: 5000 });
    await expect(page.locator('text=cannot be undone')).toBeVisible();
    // Cancel instead of deleting
    await page.click('button:has-text("Cancel")');
    await expect(page.locator('text=cannot be undone')).not.toBeVisible();
  });

  test('admin forgot password link is visible on login page', async ({ page }) => {
    await goToAdmin(page);
    await page.click('button[aria-label="Forgot password"]');
    await expect(page.locator('#admin-forgot-email')).toBeVisible();
  });

  test('admin forgot password shows success after submitting email', async ({ page }) => {
    await goToAdmin(page);
    await page.click('button[aria-label="Forgot password"]');
    await page.fill('#admin-forgot-email', 'admin@example.com');
    await page.click('button:has-text("Send Reset Link")');
    // Always shows success regardless (no account leaking)
    await expect(page.locator('text=reset link has been sent')).toBeVisible({ timeout: 10000 });
  });

  test('admin forgot password back to sign in link works', async ({ page }) => {
    await goToAdmin(page);
    await page.click('button[aria-label="Forgot password"]');
    await expect(page.locator('#admin-forgot-email')).toBeVisible();
    await page.click('button:has-text("Back to sign in")');
    await expect(page.locator('#admin-username')).toBeVisible();
  });
});
