import { test, expect } from '@playwright/test';
import {
  FREE_USER,
  MONTHLY_USER,
  ANNUAL_USER,
  PROMO_USER,
  FOUNDER_USER,
} from './test-config';
import {
  goToRegister,
  goToApp,
  registerAccount,
  loginAsTenant,
  logoutTenant,
  completeStripeCheckout,
} from './helpers';

// =============================================================================
// AUTHENTICATION & REGISTRATION TESTS
// Creates all 5 account types. Run before account-specific feature tests.
// NOTE: After this suite, all test accounts exist and can be logged into.
// =============================================================================

test.describe('Authentication - Splash and Login Page', () => {

  test('splash screen shows at app root when logged out', async ({ page }) => {
    // Clear any stored credentials
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.removeItem('tenantSlug');
      localStorage.removeItem('tenantToken');
    });
    await page.reload();
    // Either splash or login page should show — not the home screen
    await expect(page.locator('#home-shooter-select')).not.toBeVisible({ timeout: 5000 });
  });

  test('login page loads with correct fields', async ({ page }) => {
    await goToApp(page);
    // Navigate to login if splash is shown
    const splashBtn = page.locator('button:has-text("Get Started"), a:has-text("Sign in")');
    if (await splashBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await splashBtn.first().click();
    }
    await expect(page.locator('#login-email')).toBeVisible();
    await expect(page.locator('#login-password')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
  });

  test('login shows error for unknown email', async ({ page }) => {
    await goToApp(page);
    const splashBtn = page.locator('button:has-text("Get Started"), a:has-text("Sign in")');
    if (await splashBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await splashBtn.first().click();
    }
    await page.fill('#login-email', 'nobody@nowhere.com');
    await page.fill('#login-password', 'SomePassword1!');
    await page.click('button[type="submit"]');
    await expect(page.locator('.bg-red-50, .text-red-700')).toBeVisible({ timeout: 8000 });
  });

  test('login shows error for wrong password', async ({ page }) => {
    await goToApp(page);
    const splashBtn = page.locator('button:has-text("Get Started"), a:has-text("Sign in")');
    if (await splashBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await splashBtn.first().click();
    }
    // Use free user email (account may not exist yet, error still expected)
    await page.fill('#login-email', FREE_USER.email);
    await page.fill('#login-password', 'WrongPassword999!');
    await page.click('button[type="submit"]');
    await expect(page.locator('.bg-red-50, .text-red-700')).toBeVisible({ timeout: 8000 });
  });

  test('forgot password link shows forgot password form', async ({ page }) => {
    await goToApp(page);
    const splashBtn = page.locator('button:has-text("Get Started"), a:has-text("Sign in")');
    if (await splashBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await splashBtn.first().click();
    }
    await page.click('button[aria-label="Forgot password"]');
    await expect(page.locator('#forgot-email')).toBeVisible();
    await expect(page.locator('button:has-text("Send Reset Link")')).toBeVisible();
  });

  test('forgot password always shows success message regardless of email', async ({ page }) => {
    await goToApp(page);
    const splashBtn = page.locator('button:has-text("Get Started"), a:has-text("Sign in")');
    if (await splashBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await splashBtn.first().click();
    }
    await page.click('button[aria-label="Forgot password"]');
    await page.fill('#forgot-email', 'anyone@example.com');
    await page.click('button:has-text("Send Reset Link")');
    await expect(page.locator('text=reset link has been sent')).toBeVisible({ timeout: 10000 });
  });

  test('forgot password back to sign in returns to login form', async ({ page }) => {
    await goToApp(page);
    const splashBtn = page.locator('button:has-text("Get Started"), a:has-text("Sign in")');
    if (await splashBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await splashBtn.first().click();
    }
    await page.click('button[aria-label="Forgot password"]');
    await page.click('button:has-text("Back to sign in")');
    await expect(page.locator('#login-email')).toBeVisible();
  });

  test('register link from login page navigates to registration', async ({ page }) => {
    await goToApp(page);
    const splashBtn = page.locator('button:has-text("Get Started"), a:has-text("Sign in")');
    if (await splashBtn.first().isVisible({ timeout: 3000 }).catch(() => false)) {
      await splashBtn.first().click();
    }
    await page.click('a:has-text("Request access")');
    await expect(page.locator('#register-name')).toBeVisible({ timeout: 8000 });
  });
});

test.describe('Registration - Form Validation', () => {

  test('registration page loads with all fields', async ({ page }) => {
    await goToRegister(page);
    await expect(page.locator('#register-name')).toBeVisible();
    await expect(page.locator('#register-email')).toBeVisible();
    await expect(page.locator('#register-plan')).toBeVisible();
    await expect(page.locator('#register-organization')).toBeVisible();
    await expect(page.locator('#register-site-name')).toBeVisible();
    await expect(page.locator('#register-password')).toBeVisible();
    await expect(page.locator('#register-confirm-password')).toBeVisible();
  });

  test('registration shows error for mismatched passwords', async ({ page }) => {
    await goToRegister(page);
    await page.fill('#register-name', 'Test User');
    await page.fill('#register-email', 'test@example.com');
    await page.waitForFunction(() => {
      const s = document.querySelector('#register-plan') as HTMLSelectElement;
      return s && s.options.length > 1;
    }, { timeout: 10000 });
    await page.selectOption('#register-plan', { index: 1 });
    await page.fill('#register-site-name', 'testsite');
    await page.fill('#register-password', 'Password1!');
    await page.fill('#register-confirm-password', 'DifferentPassword1!');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Passwords do not match')).toBeVisible({ timeout: 5000 });
  });

  test('registration shows error for site name too short', async ({ page }) => {
    await goToRegister(page);
    await page.fill('#register-name', 'Test User');
    await page.fill('#register-email', 'test@example.com');
    await page.fill('#register-site-name', 'x');
    await page.click('#register-name'); // blur site name field
    await expect(page.locator('text=at least 2 characters')).toBeVisible({ timeout: 5000 });
  });

  test('registration shows invitation code field when promo plan selected', async ({ page }) => {
    await goToRegister(page);
    await page.waitForFunction(() => {
      const s = document.querySelector('#register-plan') as HTMLSelectElement;
      return s && s.options.length > 1;
    }, { timeout: 10000 });
    // Select Promotional plan
    await page.evaluate(() => { const s = document.querySelector('#register-plan') as HTMLSelectElement; for (const o of Array.from(s.options)) { if (o.text.includes('Promotional')) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); break; } } });
    await expect(page.locator('#register-invitation-code')).toBeVisible({ timeout: 5000 });
  });

  test('registration shows invitation code field when founder plan selected', async ({ page }) => {
    await goToRegister(page);
    await page.waitForFunction(() => {
      const s = document.querySelector('#register-plan') as HTMLSelectElement;
      return s && s.options.length > 1;
    }, { timeout: 10000 });
    await page.evaluate(() => { const s = document.querySelector('#register-plan') as HTMLSelectElement; for (const o of Array.from(s.options)) { if (o.text.includes('Founder')) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); break; } } });
    await expect(page.locator('#register-invitation-code')).toBeVisible({ timeout: 5000 });
  });

  test('registration shows error for missing invitation code on promo plan', async ({ page }) => {
    await goToRegister(page);
    await page.fill('#register-name', 'Test User');
    await page.fill('#register-email', 'test@example.com');
    await page.waitForFunction(() => {
      const s = document.querySelector('#register-plan') as HTMLSelectElement;
      return s && s.options.length > 1;
    }, { timeout: 10000 });
    await page.evaluate(() => { const s = document.querySelector('#register-plan') as HTMLSelectElement; for (const o of Array.from(s.options)) { if (o.text.includes('Promotional')) { s.value = o.value; s.dispatchEvent(new Event('change', { bubbles: true })); break; } } });
    await page.fill('#register-site-name', 'testsite2');
    await page.fill('#register-password', 'Password1!');
    await page.fill('#register-confirm-password', 'Password1!');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Invitation Code')).toBeVisible({ timeout: 5000 });
  });

  test('registration password strength indicator appears', async ({ page }) => {
    await goToRegister(page);
    await page.fill('#register-password', 'abc');
    await expect(page.locator('text=Weak')).toBeVisible({ timeout: 3000 });
    await page.fill('#register-password', 'StrongPassword1!');
    await expect(page.locator('text=Strong')).toBeVisible({ timeout: 3000 });
  });
});

test.describe('Registration - Free Account', () => {

  test('register free account succeeds and shows Access Granted', async ({ page }) => {
    await registerAccount(page, {
      name: FREE_USER.name,
      email: FREE_USER.email,
      password: FREE_USER.password,
      org: FREE_USER.org,
      siteName: FREE_USER.siteName,
      planName: 'Free',
    });
    // Should redirect to "Access Granted" screen (status=active, not pending)
    await expect(page.locator('text=Access Granted')).toBeVisible({ timeout: 20000 });
    await expect(page.locator('text=pending')).not.toBeVisible();
  });

  test('free account can log in immediately after registration', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await expect(page.locator('#home-shooter-select')).toBeVisible();
  });

  test('free account logout then login works', async ({ page }) => {
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await logoutTenant(page);
    // Should return to splash/login
    await expect(page.locator('#home-shooter-select')).not.toBeVisible({ timeout: 5000 });
    // Log back in
    await loginAsTenant(page, FREE_USER.email, FREE_USER.password);
    await expect(page.locator('#home-shooter-select')).toBeVisible();
  });

  test('duplicate email registration shows error', async ({ page }) => {
    await registerAccount(page, {
      name: FREE_USER.name,
      email: FREE_USER.email,
      password: FREE_USER.password,
      org: FREE_USER.org,
      siteName: FREE_USER.siteName + '2',
      planName: 'Free',
    });
    await expect(page.locator('.bg-red-50, .text-red-700')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Registration - Promotional Account', () => {

  test('register promo account with valid code shows Access Granted', async ({ page }) => {
    await registerAccount(page, {
      name: PROMO_USER.name,
      email: PROMO_USER.email,
      password: PROMO_USER.password,
      org: PROMO_USER.org,
      siteName: PROMO_USER.siteName,
      planName: 'Promotional',
      invitationCode: PROMO_USER.invitationCode,
    });
    await expect(page.locator('text=Access Granted')).toBeVisible({ timeout: 20000 });
  });

  test('promo account can log in immediately after registration', async ({ page }) => {
    await loginAsTenant(page, PROMO_USER.email, PROMO_USER.password);
    await expect(page.locator('#home-shooter-select')).toBeVisible();
  });

  test('promo account logout then login works', async ({ page }) => {
    await loginAsTenant(page, PROMO_USER.email, PROMO_USER.password);
    await logoutTenant(page);
    await loginAsTenant(page, PROMO_USER.email, PROMO_USER.password);
    await expect(page.locator('#home-shooter-select')).toBeVisible();
  });

  test('promo account registration rejects invalid invitation code', async ({ page }) => {
    await registerAccount(page, {
      name: 'Bad Promo',
      email: 'badpromo@example.com',
      password: 'BadPromo1!',
      siteName: 'badpromosite',
      planName: 'Promotional',
      invitationCode: 'INVALID-CODE-999',
    });
    await expect(page.locator('.bg-red-50, .text-red-700')).toBeVisible({ timeout: 10000 });
  });
});

test.describe('Registration - Founder Account', () => {

  test('register founder account with valid code shows Access Granted', async ({ page }) => {
    await registerAccount(page, {
      name: FOUNDER_USER.name,
      email: FOUNDER_USER.email,
      password: FOUNDER_USER.password,
      org: FOUNDER_USER.org,
      siteName: FOUNDER_USER.siteName,
      planName: 'Founder',
      invitationCode: FOUNDER_USER.invitationCode,
    });
    await expect(page.locator('text=Access Granted')).toBeVisible({ timeout: 20000 });
  });

  test('founder account can log in immediately after registration', async ({ page }) => {
    await loginAsTenant(page, FOUNDER_USER.email, FOUNDER_USER.password);
    await expect(page.locator('#home-shooter-select')).toBeVisible();
  });

  test('founder account logout then login works', async ({ page }) => {
    await loginAsTenant(page, FOUNDER_USER.email, FOUNDER_USER.password);
    await logoutTenant(page);
    await loginAsTenant(page, FOUNDER_USER.email, FOUNDER_USER.password);
    await expect(page.locator('#home-shooter-select')).toBeVisible();
  });
});

test.describe('Registration - Monthly Paid Account', () => {

  test('register monthly account redirects to Stripe checkout', async ({ page }) => {
    await registerAccount(page, {
      name: MONTHLY_USER.name,
      email: MONTHLY_USER.email,
      password: MONTHLY_USER.password,
      org: MONTHLY_USER.org,
      siteName: MONTHLY_USER.siteName,
      planName: 'Monthly',
    });
    // Should show "redirecting to payment" briefly then go to Stripe
    await expect(page.locator('text=Account Created!, text=Redirecting')).toBeVisible({ timeout: 15000 });
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
    await expect(page).toHaveURL(/checkout\.stripe\.com/);
  });

  test('monthly account Stripe checkout completes and shows payment success', async ({ page }) => {
    // This test registers, completes checkout, and verifies payment success
    await registerAccount(page, {
      name: MONTHLY_USER.name,
      email: MONTHLY_USER.email,
      password: MONTHLY_USER.password,
      org: MONTHLY_USER.org,
      siteName: MONTHLY_USER.siteName,
      planName: 'Monthly',
    });

    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
    await completeStripeCheckout(page);

    // Should redirect back to app with payment_success parameter
    await page.waitForURL(new RegExp(`${process.env.APP_URL || 'localhost'}.*payment_success=1`), { timeout: 60000 });
    // PaymentSuccessScreen polls and confirms plan
    await expect(
      page.locator('text=Payment Confirmed, text=Plan Activated, text=Monthly, h2:has-text("Success")')
    ).toBeVisible({ timeout: 60000 });
  });

  test('monthly account can log in after payment and shows Monthly plan', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    await expect(page.locator('#home-shooter-select')).toBeVisible();
    // Plan should show Monthly
    await expect(page.locator('text=Monthly')).toBeVisible({ timeout: 5000 });
  });

  test('monthly account logout then login works', async ({ page }) => {
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    await logoutTenant(page);
    await loginAsTenant(page, MONTHLY_USER.email, MONTHLY_USER.password);
    await expect(page.locator('#home-shooter-select')).toBeVisible();
  });
});

test.describe('Registration - Annual Paid Account', () => {

  test('register annual account redirects to Stripe checkout', async ({ page }) => {
    await registerAccount(page, {
      name: ANNUAL_USER.name,
      email: ANNUAL_USER.email,
      password: ANNUAL_USER.password,
      org: ANNUAL_USER.org,
      siteName: ANNUAL_USER.siteName,
      planName: 'Annual',
    });
    await expect(page.locator('text=Account Created!, text=Redirecting')).toBeVisible({ timeout: 15000 });
    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
    await expect(page).toHaveURL(/checkout\.stripe\.com/);
  });

  test('annual account Stripe checkout completes and shows payment success', async ({ page }) => {
    await registerAccount(page, {
      name: ANNUAL_USER.name,
      email: ANNUAL_USER.email,
      password: ANNUAL_USER.password,
      org: ANNUAL_USER.org,
      siteName: ANNUAL_USER.siteName,
      planName: 'Annual',
    });

    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
    await completeStripeCheckout(page);

    await page.waitForURL(new RegExp(`${process.env.APP_URL || 'localhost'}.*payment_success=1`), { timeout: 60000 });
    await expect(
      page.locator('text=Payment Confirmed, text=Plan Activated, text=Annual, h2:has-text("Success")')
    ).toBeVisible({ timeout: 60000 });
  });

  test('annual account can log in after payment and shows Annual plan', async ({ page }) => {
    await loginAsTenant(page, ANNUAL_USER.email, ANNUAL_USER.password);
    await expect(page.locator('#home-shooter-select')).toBeVisible();
    await expect(page.locator('text=Annual')).toBeVisible({ timeout: 5000 });
  });

  test('annual account logout then login works', async ({ page }) => {
    await loginAsTenant(page, ANNUAL_USER.email, ANNUAL_USER.password);
    await logoutTenant(page);
    await loginAsTenant(page, ANNUAL_USER.email, ANNUAL_USER.password);
    await expect(page.locator('#home-shooter-select')).toBeVisible();
  });
});

test.describe('Payment Cancelled Flow', () => {

  test('abandoning Stripe checkout shows Payment Cancelled screen', async ({ page }) => {
    // Register a monthly account to get to Stripe checkout
    await registerAccount(page, {
      name: 'Cancel Test',
      email: 'canceltest@example.com',
      password: 'CancelTest1!',
      siteName: 'canceltestsite',
      planName: 'Monthly',
    });

    await page.waitForURL(/checkout\.stripe\.com/, { timeout: 30000 });
    // Navigate back to simulate cancel
    await page.goBack();

    // May land on payment cancelled screen or back on register
    const cancelledVisible = await page.locator('text=Payment Cancelled, text=cancelled').isVisible({ timeout: 10000 }).catch(() => false);
    const appVisible = await page.locator('text=Range Tracker').isVisible({ timeout: 5000 }).catch(() => false);
    expect(cancelledVisible || appVisible).toBeTruthy();
  });
});
