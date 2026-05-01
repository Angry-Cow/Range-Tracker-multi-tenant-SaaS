// =============================================================================
// RANGE TRACKER PLAYWRIGHT TEST CONFIGURATION
// =============================================================================
// Fill in all values below before running the test suite.
// Every configurable piece of data lives here and is imported by all test files.
// =============================================================================

// --- Application URL ---
export const APP_URL = 'http://localhost:5173';

// --- Admin Credentials ---
export const ADMIN_USERNAME = 'ENTER_ADMIN_USERNAME';
export const ADMIN_PASSWORD = 'ENTER_ADMIN_PASSWORD';

// --- Free Plan Test Account ---
export const FREE_USER = {
  name: 'Test Free',
  email: 'testfree@example.com',
  password: 'TestFree1!',
  org: 'Free Org',
  siteName: 'freetestsite',
};

// --- Monthly Plan Test Account ---
export const MONTHLY_USER = {
  name: 'Test Monthly',
  email: 'testmonthly@example.com',
  password: 'TestMonthly1!',
  org: 'Monthly Org',
  siteName: 'monthlytestsite',
};

// --- Annual Plan Test Account ---
export const ANNUAL_USER = {
  name: 'Test Annual',
  email: 'testannual@example.com',
  password: 'TestAnnual1!',
  org: 'Annual Org',
  siteName: 'annualtestsite',
};

// --- Promotional Plan Test Account ---
export const PROMO_USER = {
  name: 'Test Promo',
  email: 'testpromo@example.com',
  password: 'TestPromo1!',
  org: 'Promo Org',
  siteName: 'promotestsite',
  invitationCode: 'ENTER_PROMO_INVITATION_CODE',
};

// --- Founder Plan Test Account ---
export const FOUNDER_USER = {
  name: 'Test Founder',
  email: 'testfounder@example.com',
  password: 'TestFounder1!',
  org: 'Founder Org',
  siteName: 'foundertestsite',
  invitationCode: 'ENTER_FOUNDER_INVITATION_CODE',
};

// --- Stripe Test Card Details ---
export const STRIPE = {
  cardNumber: '4242 4242 4242 4242',
  expiry: '12/29',
  cvc: '123',
  zip: '12345',
};

// --- Sample Shooter Data (used by multiple test accounts) ---
export const SHOOTER_1 = {
  firstName: 'John',
  lastName: 'Smith',
  email: 'john.smith@example.com',
  phone: '555-100-0001',
  notes: 'First test shooter',
};

export const SHOOTER_2 = {
  firstName: 'Jane',
  lastName: 'Doe',
  email: 'jane.doe@example.com',
  phone: '555-100-0002',
  notes: 'Second test shooter',
};

export const SHOOTER_3 = {
  firstName: 'Bob',
  lastName: 'Jones',
  email: 'bob.jones@example.com',
  phone: '555-100-0003',
  notes: 'Third test shooter - for unlimited plan tests',
};

// --- Sample Settings Values ---
export const SAMPLE_SETTINGS = {
  range_location: ['Local Indoor Range', 'Outdoor Field', 'Club Range', 'Private Range', 'State Range'],
  range_type: ['Indoor', 'Outdoor', 'Mixed'],
  practice_type: ['Accuracy', 'Speed', 'Competition Prep', 'Fun Shoot', 'Training'],
  target_type: ['Paper', 'Steel', 'Reactive', 'Silhouette', 'Bullseye'],
  target_distance: ['7 yards', '15 yards', '25 yards', '50 yards', '100 yards'],
  shooting_position: ['Standing', 'Kneeling', 'Prone', 'Bench Rest', 'Sitting'],
  firearm_type: ['Pistol', 'Rifle', 'Shotgun', 'Revolver', 'Carbine'],
  firearm_model: ['Glock 17', 'AR-15', 'Remington 870', 'Smith & Wesson 686', 'CZ P10'],
  ammunition: ['9mm 115gr FMJ', '5.56 62gr M855', '12ga 00 Buck', '.357 Mag 158gr', '9mm 124gr JHP'],
};

// --- Sample Range Record Data ---
export const SAMPLE_RECORD = {
  conditions: 'Clear, calm conditions',
  weather: 'Sunny, 72F, light breeze',
  additionalNotes: 'Good session. Groups tightened up at 25 yards.',
};
