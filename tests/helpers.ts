import { Page, expect } from '@playwright/test';
import { APP_URL, STRIPE } from './test-config';

// =============================================================================
// NAVIGATION HELPERS
// =============================================================================

export async function goToApp(page: Page) {
  await page.goto(APP_URL);
}

export async function goToRegister(page: Page) {
  await page.goto(`${APP_URL}/register`);
}

export async function goToAdmin(page: Page) {
  await page.goto(`${APP_URL}/admin`);
}

// =============================================================================
// AUTH HELPERS
// =============================================================================

export async function loginAsAdmin(page: Page, username: string, password: string) {
  await goToAdmin(page);
  await page.fill('#admin-username', username);
  await page.fill('#admin-password', password);
  await page.click('button[type="submit"]');
  await expect(page.locator('text=Range Tracker Admin')).toBeVisible({ timeout: 10000 });
}

export async function loginAsTenant(page: Page, email: string, password: string) {
  await goToApp(page);
  // If splash screen is shown, click through to login
  const splashButton = page.locator('button:has-text("Get Started"), button:has-text("Sign In"), a:has-text("Sign in")');
  if (await splashButton.first().isVisible({ timeout: 3000 }).catch(() => false)) {
    await splashButton.first().click();
  }
  // Wait for the login form to be ready
  await expect(page.locator('#login-email')).toBeVisible({ timeout: 10000 });
  await page.fill('#login-email', email);
  await page.fill('#login-password', password);
  await page.click('button[type="submit"]');
  await expect(page.locator('#home-shooter-select')).toBeVisible({ timeout: 15000 });
}

export async function logoutTenant(page: Page) {
  await page.click('button[aria-label="Log out"]');
  await page.waitForLoadState('networkidle');
}

export async function logoutAdmin(page: Page) {
  await page.click('button[aria-label="Sign out"]');
}

// =============================================================================
// REGISTRATION HELPERS
// =============================================================================

interface RegisterOptions {
  name: string;
  email: string;
  password: string;
  org?: string;
  siteName: string;
  planName: string;
  invitationCode?: string;
}

export async function registerAccount(page: Page, opts: RegisterOptions) {
  await goToRegister(page);

  await page.fill('#register-name', opts.name);
  await page.fill('#register-email', opts.email);

  // Wait for plans to load
  await page.waitForFunction(
    () => {
      const select = document.querySelector('#register-plan') as HTMLSelectElement;
      return select && select.options.length > 1;
    },
    { timeout: 15000 }
  );

  // Select plan by partial name match
  await page.evaluate((planName) => {
    const sel = document.querySelector('#register-plan') as HTMLSelectElement;
    if (!sel) return;
    for (const opt of Array.from(sel.options)) {
      if (opt.text.includes(planName)) {
        sel.value = opt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        break;
      }
    }
  }, opts.planName);

  if (opts.invitationCode) {
    await page.fill('#register-invitation-code', opts.invitationCode);
  }

  if (opts.org) {
    await page.fill('#register-organization', opts.org);
  }

  await page.fill('#register-site-name', opts.siteName);
  await page.fill('#register-password', opts.password);
  await page.fill('#register-confirm-password', opts.password);
  await page.click('button[type="submit"]');
}

// =============================================================================
// STRIPE CHECKOUT HELPER
// =============================================================================

export async function completeStripeCheckout(page: Page) {
  // Wait for Stripe checkout to load
  await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
  await page.waitForLoadState('networkidle', { timeout: 30000 });

  // Fill card number - Stripe uses iframes; try direct input first, then iframe
  try {
    // Try finding card fields in iframes
    const cardFrame = page.frameLocator('iframe[name*="card"], iframe[title*="card"], iframe[src*="stripe"]').first();

    await cardFrame.locator('[placeholder*="Card number"], [name="cardnumber"], input[autocomplete="cc-number"]').fill(STRIPE.cardNumber);
    await cardFrame.locator('[placeholder*="MM / YY"], [name="exp-date"], input[autocomplete="cc-exp"]').fill(STRIPE.expiry);
    await cardFrame.locator('[placeholder*="CVC"], [name="cvc"], input[autocomplete="cc-csc"]').fill(STRIPE.cvc);
  } catch {
    // Fallback: Stripe unified element
    await page.locator('[placeholder*="Card number"], input[name="cardnumber"]').fill(STRIPE.cardNumber);
    await page.locator('[placeholder*="MM / YY"], input[name="exp-date"]').fill(STRIPE.expiry);
    await page.locator('[placeholder*="CVC"], input[name="cvc"]').fill(STRIPE.cvc);
  }

  // Billing postal code if present
  try {
    const zipField = page.locator('[placeholder*="ZIP"], input[name="postal"], input[autocomplete="postal-code"]');
    if (await zipField.isVisible({ timeout: 3000 })) {
      await zipField.fill(STRIPE.zip);
    }
  } catch { /* zip not required on this checkout */ }

  // Submit payment
  await page.click('button[type="submit"]:has-text("Pay"), button[type="submit"]:has-text("Subscribe"), button[data-testid="hosted-payment-submit-button"]');
}

// =============================================================================
// SHOOTER HELPERS
// =============================================================================

interface ShooterData {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  notes: string;
}

export async function createShooter(page: Page, shooter: ShooterData) {
  await page.selectOption('#home-shooter-select', 'new');
  await page.click('button:has-text("New Record")');

  await page.fill('#new-shooter-first-name', shooter.firstName);
  await page.fill('#new-shooter-last-name', shooter.lastName);
  await page.fill('#new-shooter-email', shooter.email);
  await page.fill('#new-shooter-phone', shooter.phone);
  await page.fill('#new-shooter-notes', shooter.notes);

  await page.click('button[type="submit"], button:has-text("Create Shooter"), button:has-text("Save")');
  // After save, should navigate to home or new record screen
  await page.waitForLoadState('networkidle');
}

// Select a shooter by partial last name match using evaluate
export async function selectShooter(page: Page, lastName: string) {
  await page.evaluate((last) => {
    const sel = document.querySelector('#home-shooter-select') as HTMLSelectElement;
    if (!sel) return;
    for (const opt of Array.from(sel.options)) {
      if (opt.text.includes(last) && opt.value !== 'new' && opt.value !== '') {
        sel.value = opt.value;
        sel.dispatchEvent(new Event('change', { bubbles: true }));
        break;
      }
    }
  }, lastName);
  await page.waitForLoadState('networkidle');
}

// =============================================================================
// SETTINGS HELPERS
// =============================================================================

export async function navigateToSettings(page: Page) {
  await page.click('button:has-text("Settings")');
  await expect(page.locator('h1:has-text("Settings")')).toBeVisible({ timeout: 10000 });
}

export async function addSettingValue(page: Page, categoryKey: string, value: string) {
  await page.fill(`#settings-add-${categoryKey}`, value);
  await page.click(`#settings-add-${categoryKey} ~ button, button[aria-label="Add ${categoryKey.replace(/_/g, ' ')}"]`);
  await page.waitForLoadState('networkidle');
}

// =============================================================================
// RANGE RECORD HELPERS
// =============================================================================

interface RecordData {
  date?: string;
  rangeLocation?: string;
  rangeType?: string;
  practiceType?: string;
  targetType?: string;
  targetDistance?: string;
  shootingPosition?: string;
  firearmType?: string;
  firearmModel?: string;
  ammunition?: string;
  conditions?: string;
  weather?: string;
  additionalNotes?: string;
}

export async function fillRangeRecord(page: Page, data: RecordData) {
  if (data.date) await page.fill('#record-date', data.date);
  if (data.rangeLocation) await page.selectOption('#record-range-location', { label: data.rangeLocation });
  if (data.rangeType) await page.selectOption('#record-range-type', { label: data.rangeType });
  if (data.practiceType) await page.selectOption('#record-practice-type', { label: data.practiceType });
  if (data.targetType) await page.selectOption('#record-target-type', { label: data.targetType });
  if (data.targetDistance) await page.selectOption('#record-target-distance', { label: data.targetDistance });
  if (data.shootingPosition) await page.selectOption('#record-shooting-position', { label: data.shootingPosition });
  if (data.firearmType) await page.selectOption('#record-firearm-type', { label: data.firearmType });
  if (data.firearmModel) await page.selectOption('#record-firearm-model', { label: data.firearmModel });
  if (data.ammunition) await page.selectOption('#record-ammunition', { label: data.ammunition });
  if (data.conditions) await page.fill('#record-conditions', data.conditions);
  if (data.weather) await page.fill('#record-weather', data.weather);
  if (data.additionalNotes) await page.fill('#record-additional-notes', data.additionalNotes);
}

export async function saveRangeRecord(page: Page) {
  await page.click('button:has-text("Save Record"), button:has-text("Save")');
  await page.waitForLoadState('networkidle');
}

// =============================================================================
// UPGRADE PLAN MODAL HELPERS
// =============================================================================

export async function openUpgradeModal(page: Page) {
  const upgradeBtn = page.locator('button:has-text("Upgrade"), button:has-text("Modify Plan")');
  await upgradeBtn.click();
  await expect(page.locator('#upgrade-modal-password')).toBeVisible({ timeout: 5000 });
}

export async function verifyPasswordInModal(page: Page, password: string) {
  await page.fill('#upgrade-modal-password', password);
  await page.click('button:has-text("Continue")');
  // Wait for plan selection step
  await expect(page.locator('text=Select a new plan')).toBeVisible({ timeout: 8000 });
}

export async function selectPlanInModal(page: Page, planName: string) {
  await page.click(`button[aria-label="Select ${planName} plan"]`);
}

// =============================================================================
// ADMIN HELPERS
// =============================================================================

export async function findTenantRow(page: Page, email: string) {
  return page.locator(`.divide-y > div`).filter({ hasText: email });
}

export async function setTenantPlanAdmin(page: Page, tenantEmail: string, planName: string) {
  const row = await findTenantRow(page, tenantEmail);
  const planSelect = row.locator('select[id^="plan-select-"]');
  await planSelect.evaluate((sel: HTMLSelectElement, name) => {
    for (const opt of Array.from(sel.options)) {
      if (opt.text.includes(name)) { sel.value = opt.value; sel.dispatchEvent(new Event('change', { bubbles: true })); break; }
    }
  }, planName);
  await row.locator('button:has-text("Set")').click();
  await page.waitForLoadState('networkidle');
}

export async function suspendTenantAdmin(page: Page, tenantName: string) {
  const row = page.locator('.divide-y > div').filter({ hasText: tenantName });
  await row.locator(`button[aria-label*="Suspend"]`).click();
  await page.waitForLoadState('networkidle');
}

export async function reactivateTenantAdmin(page: Page, tenantName: string) {
  const row = page.locator('.divide-y > div').filter({ hasText: tenantName });
  await row.locator(`button[aria-label*="Reactivate"]`).click();
  await page.waitForLoadState('networkidle');
}

export async function deleteTenantAdmin(page: Page, tenantName: string) {
  const row = page.locator('.divide-y > div').filter({ hasText: tenantName });
  await row.locator(`button[aria-label*="Delete"]`).click();
  // Confirm delete modal
  await page.click('button:has-text("Delete Permanently")');
  await page.waitForLoadState('networkidle');
}

// =============================================================================
// WAIT HELPERS
// =============================================================================

export async function waitForHomeScreen(page: Page) {
  await expect(page.locator('#home-shooter-select')).toBeVisible({ timeout: 20000 });
}

export async function waitForPaymentSuccess(page: Page) {
  // PaymentSuccessScreen polls for plan confirmation
  await page.waitForURL(/payment_success=1/, { timeout: 60000 });
  // Wait for the success message or plan confirmation
  await expect(
    page.locator('text=Payment Confirmed, text=Plan Activated, text=Welcome, h2:has-text("Success")')
  ).toBeVisible({ timeout: 60000 });
}
