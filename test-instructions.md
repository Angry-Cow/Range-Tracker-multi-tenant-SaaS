# Range Tracker — Automated UI Test Instructions

**Target:** https://rangetrackerapp.com  
**Admin panel:** https://rangetrackerapp.com/admin  
**Prerequisites before running:**
- CAPTCHA has been disabled on RegisterPage (confirmed by operator)
- Production build has been deployed
- Test data below has been confirmed by operator

---

## Test Data

Substitute the values below everywhere you see `{{PLACEHOLDER}}`. The operator will supply these before the run.

```
ADMIN_USERNAME:            {{ADMIN_USERNAME}}
ADMIN_PASSWORD:            {{ADMIN_PASSWORD}}

TENANT_FREE_NAME:          {{TENANT_FREE_NAME}}
TENANT_FREE_EMAIL:         {{TENANT_FREE_EMAIL}}
TENANT_FREE_PASSWORD:      {{TENANT_FREE_PASSWORD}}
TENANT_FREE_SITE:          {{TENANT_FREE_SITE}}          (e.g. "free-test-site")

TENANT_MONTHLY_NAME:       {{TENANT_MONTHLY_NAME}}
TENANT_MONTHLY_EMAIL:      {{TENANT_MONTHLY_EMAIL}}
TENANT_MONTHLY_PASSWORD:   {{TENANT_MONTHLY_PASSWORD}}
TENANT_MONTHLY_SITE:       {{TENANT_MONTHLY_SITE}}

TENANT_ANNUAL_NAME:        {{TENANT_ANNUAL_NAME}}
TENANT_ANNUAL_EMAIL:       {{TENANT_ANNUAL_EMAIL}}
TENANT_ANNUAL_PASSWORD:    {{TENANT_ANNUAL_PASSWORD}}
TENANT_ANNUAL_SITE:        {{TENANT_ANNUAL_SITE}}

TENANT_FOUNDER_NAME:       {{TENANT_FOUNDER_NAME}}
TENANT_FOUNDER_EMAIL:      {{TENANT_FOUNDER_EMAIL}}
TENANT_FOUNDER_PASSWORD:   {{TENANT_FOUNDER_PASSWORD}}
TENANT_FOUNDER_SITE:       {{TENANT_FOUNDER_SITE}}
FOUNDER_TOKEN:             {{FOUNDER_TOKEN}}

TENANT_PROMO_NAME:         {{TENANT_PROMO_NAME}}
TENANT_PROMO_EMAIL:        {{TENANT_PROMO_EMAIL}}
TENANT_PROMO_PASSWORD:     {{TENANT_PROMO_PASSWORD}}
TENANT_PROMO_SITE:         {{TENANT_PROMO_SITE}}
PROMO_TOKEN:               {{PROMO_TOKEN}}

STRIPE_CARD_NUMBER:        4242 4242 4242 4242
STRIPE_EXPIRY:             12/29
STRIPE_CVC:                123
STRIPE_ZIP:                12345

SHOOTER_A_FIRST:           Alice
SHOOTER_A_LAST:            Smith
SHOOTER_A_EMAIL:           alice@test.invalid
SHOOTER_A_PHONE:           555-0001
SHOOTER_A_NOTES:           Primary test shooter

SHOOTER_B_FIRST:           Bob
SHOOTER_B_LAST:            Jones
SHOOTER_B_EMAIL:           bob@test.invalid
SHOOTER_B_PHONE:           555-0002
SHOOTER_B_NOTES:           (leave blank)

SHOOTER_C_FIRST:           Carol
SHOOTER_C_LAST:            Extra
(used only to test Free plan shooter limit — should be rejected)

SETTING_RANGE_LOCATION:    Indoor Range A, Outdoor Range B, Home Range
SETTING_RANGE_TYPE:        Indoor, Outdoor
SETTING_PRACTICE_TYPE:     Drills, Competition Prep, Casual
SETTING_TARGET_TYPE:       Paper, Steel, IPSC
SETTING_TARGET_DISTANCE:   7 yards, 15 yards, 25 yards
SETTING_SHOOTING_POSITION: Standing, Kneeling, Prone
SETTING_FIREARM_TYPE:      Pistol, Rifle, Shotgun
SETTING_FIREARM_MODEL:     Glock 17, AR-15, Remington 870
SETTING_AMMUNITION:        9mm 115gr FMJ, 5.56 55gr, .223 62gr

SAMPLE_PHOTO:              (operator supplies a small JPEG/PNG accessible on the test machine)
```

---

## Conventions

- **PASS** = the expected result occurred; record it and continue.
- **FAIL** = the expected result did not occur; record the exact state/error and continue to the next test (do not abort the run unless navigation is impossible).
- After each action, wait for the page to settle (spinner gone, no loading state visible) before proceeding.
- When a test says "verify text contains X", a substring match is sufficient.
- When a test says "verify URL contains X", check the browser address bar.
- Screenshots are recommended at each PASS/FAIL assertion but are not required.

---

## SUITE 1 — Admin Login

### 1.1 Invalid credentials rejected

1. Navigate to `https://rangetrackerapp.com/admin`.
2. Verify the page shows a username field, a password field, and a "Sign In" button.
3. Enter username `wronguser` and password `wrongpass`.
4. Click "Sign In".
5. **PASS** if an error message is displayed and you remain on the admin login page.
6. **FAIL** if you are redirected away from the login page.

### 1.2 Valid credentials accepted

1. On the admin login page, enter `{{ADMIN_USERNAME}}` and `{{ADMIN_PASSWORD}}`.
2. Click "Sign In".
3. **PASS** if you are redirected to the Admin Dashboard, which shows "Active Tenants" and "Registration Requests" tabs, a tenant list, and a header with the admin's name.
4. **FAIL** otherwise.

---

## SUITE 2 — Tenant Registration: Free Plan

### 2.1 Register Free plan tenant

1. Navigate to `https://rangetrackerapp.com/register`.
2. Verify the form has fields: Full Name, Email Address, Plan, Organization/Club, Site Name, Password, Confirm Password, and a CAPTCHA area.
3. Fill in:
   - Full Name: `{{TENANT_FREE_NAME}}`
   - Email: `{{TENANT_FREE_EMAIL}}`
   - Plan: select "Free" from the dropdown
   - Organization: leave blank
   - Site Name: `{{TENANT_FREE_SITE}}`
   - Password: `{{TENANT_FREE_PASSWORD}}`
   - Confirm Password: `{{TENANT_FREE_PASSWORD}}`
4. The CAPTCHA has been disabled. If a CAPTCHA field is still present, type whatever is displayed and click the refresh icon if needed.
5. Click "Request Access".
6. **PASS** if the page transitions to the "Access Granted" state (green checkmark, heading "Access Granted", and a site name displayed).
7. **FAIL** if an error is shown or you are stuck on the form.

### 2.2 Navigate to app after Free plan registration

1. On the "Access Granted" screen, click "Open Range Tracker".
2. **PASS** if you are redirected to `https://rangetrackerapp.com` and the Home screen is shown (shooter dropdown visible, "Log Out" button visible).
3. **FAIL** otherwise.

### 2.3 Verify Free plan banner

1. On the Home screen, verify a plan information banner is visible showing shooter and record limits.
2. **PASS** if the banner references "Free" plan and shows numeric limits (e.g., "2 shooters", "20 records").
3. **FAIL** if no banner is present.

### 2.4 Log out

1. Click "Log Out".
2. **PASS** if the page shows the login form (email and password fields, "Sign In" button).

---

## SUITE 3 — Tenant Registration: Monthly Plan

### 3.1 Register Monthly plan tenant

1. Navigate to `https://rangetrackerapp.com/register`.
2. Fill in:
   - Full Name: `{{TENANT_MONTHLY_NAME}}`
   - Email: `{{TENANT_MONTHLY_EMAIL}}`
   - Plan: select "Monthly" from the dropdown
   - Organization: "Test Organization"
   - Site Name: `{{TENANT_MONTHLY_SITE}}`
   - Password: `{{TENANT_MONTHLY_PASSWORD}}`
   - Confirm Password: `{{TENANT_MONTHLY_PASSWORD}}`
3. Handle CAPTCHA if present (same as 2.1).
4. Click "Request Access".
5. **PASS** if the page transitions to a "redirecting" state (spinner visible, text mentions "Redirecting you to secure payment").
6. **FAIL** if an error appears or no redirect occurs.

### 3.2 Complete Stripe checkout

1. You will be redirected to a Stripe-hosted checkout page.
2. Verify the page is on a `checkout.stripe.com` or `stripe.com` URL.
3. Enter payment details:
   - Card number: `{{STRIPE_CARD_NUMBER}}`
   - Expiry: `{{STRIPE_EXPIRY}}`
   - CVC: `{{STRIPE_CVC}}`
   - ZIP/postal: `{{STRIPE_ZIP}}`
4. Click the payment/subscribe button.
5. **PASS** if Stripe accepts the card and redirects back to `rangetrackerapp.com`.
6. **FAIL** if Stripe shows a card error.

### 3.3 Verify post-payment landing

1. After Stripe redirects back, you should land on the Home screen or a payment-success screen.
2. If a payment-success screen appears, verify it mentions success, then navigate to the Home screen.
3. **PASS** if the Home screen loads and no plan-limit banner (or an "unlimited" indicator) is shown.
4. **FAIL** if a payment-verification-failed screen appears.

### 3.4 Log out

1. Click "Log Out".

---

## SUITE 4 — Tenant Registration: Annual Plan

### 4.1 Register Annual plan tenant

1. Navigate to `https://rangetrackerapp.com/register`.
2. Fill in:
   - Full Name: `{{TENANT_ANNUAL_NAME}}`
   - Email: `{{TENANT_ANNUAL_EMAIL}}`
   - Plan: select "Annual" from the dropdown
   - Site Name: `{{TENANT_ANNUAL_SITE}}`
   - Password: `{{TENANT_ANNUAL_PASSWORD}}`
   - Confirm Password: `{{TENANT_ANNUAL_PASSWORD}}`
3. Handle CAPTCHA if present.
4. Click "Request Access".
5. Complete Stripe checkout using the same test card as Suite 3.
6. **PASS** if you land back on the app Home screen without errors.
7. **FAIL** otherwise.

### 4.2 Log out

1. Click "Log Out".

---

## SUITE 5 — Tenant Registration: Founder Plan

### 5.1 Register Founder plan tenant

1. Navigate to `https://rangetrackerapp.com/register`.
2. Fill in:
   - Full Name: `{{TENANT_FOUNDER_NAME}}`
   - Email: `{{TENANT_FOUNDER_EMAIL}}`
   - Plan: select "Founder" from the dropdown
3. Verify an "Invitation Code" field appears after selecting Founder.
4. Fill in:
   - Invitation Code: `{{FOUNDER_TOKEN}}`
   - Site Name: `{{TENANT_FOUNDER_SITE}}`
   - Password: `{{TENANT_FOUNDER_PASSWORD}}`
   - Confirm Password: `{{TENANT_FOUNDER_PASSWORD}}`
5. Handle CAPTCHA if present.
6. Click "Request Access".
7. **PASS** if the "Access Granted" screen appears (no Stripe redirect expected for Founder).
8. **FAIL** if an error about the invitation code is shown or you are stuck on the form.

### 5.2 Verify Founder plan — no upgrade prompt

1. Click "Open Range Tracker".
2. On the Home screen, verify no "Upgrade" button is present in the plan banner.
3. **PASS** if no upgrade control is visible.
4. **FAIL** if an upgrade button is shown.

### 5.3 Log out

1. Click "Log Out".

---

## SUITE 6 — Tenant Registration: Promotional Plan

### 6.1 Register Promotional plan tenant

1. Navigate to `https://rangetrackerapp.com/register`.
2. Fill in:
   - Full Name: `{{TENANT_PROMO_NAME}}`
   - Email: `{{TENANT_PROMO_EMAIL}}`
   - Plan: select "Promotional" from the dropdown
3. Verify an "Invitation Code" field appears.
4. Fill in:
   - Invitation Code: `{{PROMO_TOKEN}}`
   - Site Name: `{{TENANT_PROMO_SITE}}`
   - Password: `{{TENANT_PROMO_PASSWORD}}`
   - Confirm Password: `{{TENANT_PROMO_PASSWORD}}`
5. Handle CAPTCHA if present.
6. Click "Request Access".
7. **PASS** if the "Access Granted" screen appears.
8. **FAIL** otherwise.

### 6.2 Log out

1. Click "Open Range Tracker", then click "Log Out".

---

## SUITE 7 — Registration Validation (Error Cases)

### 7.1 Mismatched passwords rejected

1. Navigate to `https://rangetrackerapp.com/register`.
2. Fill in Name, Email, Plan (Free), Site Name, Password `TestPass1!`, Confirm Password `DifferentPass1!`.
3. Click "Request Access".
4. **PASS** if an inline error "Passwords do not match" is shown and submission is blocked.
5. **FAIL** if the form submits.

### 7.2 Invalid invitation code rejected

1. Navigate to `https://rangetrackerapp.com/register`.
2. Fill in Name, Email, Plan (Founder), Invitation Code `INVALIDCODE`, Site Name, matching passwords.
3. Handle CAPTCHA if present.
4. Click "Request Access".
5. **PASS** if an error message about the invitation code is shown.
6. **FAIL** if the registration succeeds.

### 7.3 Duplicate email rejected

1. Navigate to `https://rangetrackerapp.com/register`.
2. Fill in Name, Email `{{TENANT_FREE_EMAIL}}` (already registered in Suite 2), Plan (Free), Site Name `another-site`, matching passwords.
3. Handle CAPTCHA if present.
4. Click "Request Access".
5. **PASS** if an error is shown indicating the email is already in use.
6. **FAIL** if a new account is created.

### 7.4 Duplicate site name rejected

1. Navigate to `https://rangetrackerapp.com/register`.
2. Fill in Name, a new unique email, Plan (Free), Site Name `{{TENANT_FREE_SITE}}` (already taken), matching passwords.
3. Handle CAPTCHA if present.
4. Click "Request Access".
5. **PASS** if an error is shown indicating the site name is already taken.
6. **FAIL** if a new account is created.

---

## SUITE 8 — Tenant Login and Logout

### 8.1 Login with valid credentials

1. Navigate to `https://rangetrackerapp.com`.
2. On the login page, enter `{{TENANT_FREE_EMAIL}}` and `{{TENANT_FREE_PASSWORD}}`.
3. Click "Sign In".
4. **PASS** if the Home screen loads, showing the shooter dropdown and "Log Out" button.
5. **FAIL** otherwise.

### 8.2 Login with wrong password rejected

1. Log out if currently logged in.
2. Enter `{{TENANT_FREE_EMAIL}}` and password `wrongpassword`.
3. Click "Sign In".
4. **PASS** if an error message is shown and you remain on the login page.
5. **FAIL** if you are logged in.

### 8.3 Forgot password flow (initiate reset)

1. On the login page, click "Forgot password?".
2. Verify an email input field appears.
3. Enter `{{TENANT_FREE_EMAIL}}`.
4. Click "Send Reset Link".
5. **PASS** if a confirmation message is shown stating that a reset link has been sent.
6. **FAIL** if an error is shown.
7. Note: Do not complete the reset; the actual email verification is a manual step.

### 8.4 Log out

1. Log in as the Free tenant.
2. Click "Log Out".
3. **PASS** if you are returned to the login page.

---

## SUITE 9 — Home Screen State Validation

### 9.1 Buttons disabled with no shooter selected

1. Log in as `{{TENANT_FREE_EMAIL}}`.
2. On the Home screen, verify the shooter dropdown is showing (either blank or "Select a shooter").
3. Do not select a shooter.
4. **PASS** if "Settings", "View Previous Records", and "New Record" buttons are all visually disabled (greyed out, not clickable).
5. **FAIL** if any of those buttons are enabled.

### 9.2 "New Shooter" option disables Settings and Previous Records

1. In the shooter dropdown, select "New Shooter" (if present as an option).
2. **PASS** if "Settings" and "View Previous Records" remain disabled.
3. **FAIL** if they become enabled.

---

## SUITE 10 — Shooter Creation (Free Plan)

### 10.1 Create Shooter A

1. Log in as `{{TENANT_FREE_EMAIL}}` (if not already logged in).
2. In the shooter dropdown, select "New Shooter" or click an equivalent "Add Shooter" button/option.
3. On the New Shooter screen, fill in:
   - First Name: `{{SHOOTER_A_FIRST}}`
   - Last Name: `{{SHOOTER_A_LAST}}`
   - Email: `{{SHOOTER_A_EMAIL}}`
   - Phone: `{{SHOOTER_A_PHONE}}`
   - Notes: `{{SHOOTER_A_NOTES}}`
4. Click "Enter".
5. **PASS** if you are redirected to the Settings screen for this shooter, and no error is shown.
6. **FAIL** if an error occurs.

### 10.2 Navigate back to Home and create Shooter B

1. On the Settings screen, click "Back to Home".
2. In the shooter dropdown, select "New Shooter" again.
3. Fill in:
   - First Name: `{{SHOOTER_B_FIRST}}`
   - Last Name: `{{SHOOTER_B_LAST}}`
   - Email: `{{SHOOTER_B_EMAIL}}`
   - Phone: `{{SHOOTER_B_PHONE}}`
   - Notes: (leave blank)
4. Click "Enter".
5. **PASS** if you proceed to the Settings screen without error.

### 10.3 Free plan shooter limit enforced

1. Navigate back to the Home screen.
2. In the shooter dropdown, select "New Shooter" again.
3. **PASS** if the New Shooter form shows a warning banner indicating the shooter limit has been reached and all fields are disabled.
4. Attempt to click "Enter" if it is still visible.
5. **PASS** if no new shooter is created (you stay on the screen or an error is shown).
6. **FAIL** if a third shooter is successfully created.

---

## SUITE 11 — Settings: Adding Values to All Categories

Perform this suite while logged in as `{{TENANT_FREE_EMAIL}}` with Shooter A selected.

### 11.1 Navigate to Settings

1. On the Home screen, select `{{SHOOTER_A_FIRST}} {{SHOOTER_A_LAST}}` from the shooter dropdown.
2. Click "Settings".
3. **PASS** if the Settings screen loads, showing 9 category sections.

### 11.2 Add values to each category

For each of the following categories, perform steps a–d:

**Categories and values to add:**
- Range Location: "Indoor Range A", "Outdoor Range B"
- Range Type: "Indoor", "Outdoor"
- Practice Type: "Drills", "Competition Prep"
- Target Type: "Paper", "Steel"
- Target Distance: "7 yards", "15 yards"
- Shooting Position: "Standing", "Kneeling"
- Firearm Type: "Pistol", "Rifle"
- Firearm Model: "Glock 17", "AR-15"
- Ammunition: "9mm 115gr FMJ", "5.56 55gr"

**Steps for each value:**
a. Find the text input for the category.
b. Type the value.
c. Click "Add".
d. **PASS** if the value appears in the list below the input and the input clears. **FAIL** if an error is shown.

### 11.3 Free plan settings limit enforced

1. In the "Range Location" category, attempt to add a 6th value: "Extra Location".
2. **PASS** if an error or a limit warning is shown and the value is not added (the Free plan allows 5 per category per shooter).
3. **FAIL** if the 6th value is added.

### 11.4 Delete a settings value

1. In the "Range Type" category, click the delete icon next to "Outdoor".
2. **PASS** if "Outdoor" disappears from the list.
3. **FAIL** if it remains.

---

## SUITE 12 — Shooter Profile: View and Edit

### 12.1 Navigate to Shooter Profile from Settings

1. On the Settings screen (Shooter A selected), click "View Shooter Profile".
2. **PASS** if the Shooter Profile screen loads, showing fields for First Name, Last Name, Email, and Phone pre-populated with Shooter A's data.

### 12.2 Edit shooter details and save

1. Clear the Phone field and type "555-9999".
2. Click "Save Changes".
3. **PASS** if you are returned to the Settings screen with no error shown.
4. Navigate back to Shooter Profile to verify.
5. **PASS** if the Phone field shows "555-9999".

### 12.3 Cancel edit without saving

1. On Shooter Profile, change First Name to "ZZZDONTKEEP".
2. Click "Cancel".
3. **PASS** if you are returned to the Settings screen without the name being changed.
4. Navigate back to Shooter Profile to verify.
5. **PASS** if First Name still shows `{{SHOOTER_A_FIRST}}`.

---

## SUITE 13 — Range Record Creation

Perform this suite logged in as `{{TENANT_FREE_EMAIL}}` with Shooter A selected.

### 13.1 Create a basic range record

1. Navigate to the Home screen, select Shooter A.
2. Click "New Record".
3. Verify the Range Record screen loads with all dropdown fields, date, and photo slots.
4. Fill in:
   - Date: today's date (should be pre-filled; leave as-is)
   - Range Location: "Indoor Range A" (from dropdown)
   - Range Type: "Indoor"
   - Practice Type: "Drills"
   - Target Type: "Paper"
   - Target Distance: "7 yards"
   - Shooting Position: "Standing"
   - Firearm Type: "Pistol"
   - Firearm Model: "Glock 17"
   - Ammunition: "9mm 115gr FMJ"
   - Conditions: "Good lighting"
   - Weather: "Clear"
   - Additional Notes: "Automated test record 1"
5. Click "Save Record".
6. **PASS** if you are returned to the Home screen with no error.

### 13.2 Create a record with a photo

1. Click "New Record" again.
2. Fill in the date and at least one dropdown field (Range Location: "Indoor Range A").
3. In Photo Slot 1, click the upload button/area.
4. Select `{{SAMPLE_PHOTO}}` from the file system.
5. **PASS** if a thumbnail appears in Photo Slot 1 after upload completes.
6. Add a note to Photo 1: type "Test photo note" in the photo note field.
7. Click "Save Record".
8. **PASS** if saved without error and you return to the Home screen.

### 13.3 Save Progress (incremental save)

1. Click "New Record".
2. Fill in Range Location: "Outdoor Range B".
3. Click "Save Progress" (not "Save Record").
4. **PASS** if a save confirmation is shown (checkmark, success message, or the button briefly changes state) and you remain on the record form.
5. Continue filling fields: Range Type "Outdoor", then click "Save Record".
6. **PASS** if saved without error.

### 13.4 Cancel record creation

1. Click "New Record".
2. Fill in Range Location: "Indoor Range A".
3. Click "Cancel".
4. **PASS** if you are returned to the Home screen with no new record created (verify by navigating to Previous Records — the count should not have increased by 1).

---

## SUITE 14 — Free Plan Record Limit

This test requires creating enough records to hit the Free plan limit of 20 per shooter.

### 14.1 Approach the record limit

1. Note the current record count for Shooter A (navigate to Previous Records to see the count).
2. Create additional records one at a time until the total reaches 20. For each record, fill in at minimum:
   - Range Location: "Indoor Range A"
   - Firearm Model: "Glock 17"
   - Additional Notes: "Limit test record N" (increment N each time)
3. After each save, return to "New Record". If the form shows a warning banner indicating the record limit is reached, the limit has been hit.
4. **PASS** if a warning banner appears on or before the 20th record.

### 14.2 Record limit enforced on 21st attempt

1. With 20 records for Shooter A, click "New Record".
2. Fill in all required fields and click "Save Record".
3. **PASS** if an error message or warning is shown and the record is not saved, OR if the "Save Record" button is disabled.
4. **FAIL** if a 21st record is successfully saved.

---

## SUITE 15 — Previous Records: Display and Navigation

### 15.1 Navigate to Previous Records

1. From the Home screen with Shooter A selected, click "View Previous Records".
2. **PASS** if the Previous Records screen loads, showing a list of records and a record count.

### 15.2 Verify pagination for 20+ records

1. Verify the record count display. With 20+ records it should say something like "Displaying 1–20 of [total] records".
2. **PASS** if the display shows a range (e.g., "1–20 of 22") and Previous/Next navigation buttons are visible.
3. **FAIL** if only "20 records found" is shown with no navigation buttons.

### 15.3 Navigate to page 2

1. Click the "Next" button in the pagination controls.
2. **PASS** if the display updates to show page 2 (e.g., "Displaying 21–22 of 22 records") and a smaller set of records is shown.
3. Click "Previous".
4. **PASS** if page 1 is restored with 20 records shown.

### 15.4 Previous button disabled on page 1

1. Ensure you are on page 1.
2. **PASS** if the "Previous" button appears disabled (greyed out, not clickable).

### 15.5 Next button disabled on last page

1. Navigate to the last page.
2. **PASS** if the "Next" button appears disabled.

---

## SUITE 16 — Previous Records: Filtering

### 16.1 Filter by Range Location

1. On the Previous Records screen for Shooter A, find "Filter 2 - Type" (the first filter row).
2. Select "Range Location" from the type dropdown.
3. In "Filter 2 - Value", select "Indoor Range A".
4. **PASS** if the record list updates and all visible records show "Indoor Range A", and the count decreases (or stays the same if all records match).

### 16.2 Add a second filter

1. In "Filter 3 - Type", select "Firearm Model".
2. In "Filter 3 - Value", select "Glock 17".
3. **PASS** if the record list updates to show only records matching both filters.

### 16.3 Filter by Date Range

1. Click "Clear All" to reset filters.
2. In "Filter 2 - Type", select "Date Range".
3. Two date inputs appear. Set start date to one month ago and end date to today.
4. **PASS** if the record list updates to show only records within that range.

### 16.4 Clear all filters

1. Click "Clear All".
2. **PASS** if all filter dropdowns reset to "-- Select Filter --" and the full record count is restored.

---

## SUITE 17 — Previous Records: Export

### 17.1 Download CSV

1. On the Previous Records screen with at least one record visible, click "Download CSV".
2. **PASS** if a CSV file is downloaded to the local machine (file appears in downloads or a download prompt appears).
3. **FAIL** if an error is shown or nothing happens.

### 17.2 Download Photos ZIP

1. Navigate to Previous Records for Shooter A (who has at least one record with a photo from Suite 13.2).
2. Verify the "Download Photos (.zip)" button is enabled (not greyed out).
3. Click "Download Photos (.zip)".
4. **PASS** if the button shows progress ("Downloading 1/1...") and a ZIP file is downloaded.
5. **FAIL** if an error is shown.

### 17.3 Photo download button disabled when no photos

1. Filter records to show only records without photos (e.g., filter by a Range Location that was used in records created without photos in Suite 13.1 and 13.4 context — records with no photo).
2. If achievable: **PASS** if the "Download Photos (.zip)" button is visually disabled and shows the tooltip "No photos in the current filtered records".

---

## SUITE 18 — View Record: Read Mode

### 18.1 Open a record

1. On the Previous Records screen, click "View" on any record.
2. **PASS** if the View Record screen loads, showing the record's date, all filled fields, and "Edit" and "Download PDF" buttons.

### 18.2 Verify read-only state

1. Verify that fields are displayed as text (not as editable inputs) when not in edit mode.
2. **PASS** if the record displays as read-only.

### 18.3 Download PDF

1. Click "Download PDF".
2. **PASS** if a PDF file is downloaded or a new browser tab opens with the PDF.
3. **FAIL** if an error is shown.

### 18.4 Navigate back to Previous Records

1. Click "Back to Records".
2. **PASS** if you return to the Previous Records screen with the same shooter's records still listed.

---

## SUITE 19 — View Record: Edit Mode

### 19.1 Enter edit mode

1. Open any record from Previous Records.
2. Click "Edit".
3. **PASS** if the record fields become editable (dropdowns and text inputs are now active), and "Save" and "Cancel Edit" buttons are shown.

### 19.2 Edit a field and save

1. In edit mode, change "Conditions" to "Edited conditions text".
2. Click "Save".
3. **PASS** if the record returns to read-only mode and "Edited conditions text" is displayed in the Conditions field.

### 19.3 Cancel edit without saving

1. Click "Edit" again.
2. Change the Conditions field to "DO NOT SAVE THIS".
3. Click "Cancel Edit".
4. **PASS** if the record reverts to the previously saved value ("Edited conditions text") without saving the change.

### 19.4 Edit photo notes

1. Click "Edit".
2. If the record has a photo (from Suite 13.2), find the photo note field for Photo 1.
3. Change the note to "Updated photo note".
4. Click "Save".
5. **PASS** if the updated note is shown in the saved record.

---

## SUITE 20 — Shooter Deletion

### 20.1 Delete Shooter B

1. Navigate to Home, select Shooter B.
2. Click "Settings".
3. Click "View Shooter Profile".
4. Click "Delete User Account".
5. **PASS** if a confirmation modal appears warning that all data will be permanently deleted.
6. Click "Delete Permanently" in the modal.
7. **PASS** if you are redirected to the Home screen and Shooter B is no longer in the shooter dropdown.
8. **FAIL** if Shooter B still appears in the dropdown.

---

## SUITE 21 — Admin Dashboard: Tenant Management

Log in to the admin panel (`https://rangetrackerapp.com/admin`) as `{{ADMIN_USERNAME}}` / `{{ADMIN_PASSWORD}}` for all tests in this suite.

### 21.1 View Active Tenants tab

1. Click the "Active Tenants" tab.
2. **PASS** if a list of tenants is shown, each with name, status badge, email, slug, and action buttons.
3. Verify the summary cards at the top show counts (Active Tenants, Pending Approvals, Total Tenants).

### 21.2 Verify registered tenants appear

1. Search or scroll the tenant list for `{{TENANT_FREE_SITE}}`.
2. **PASS** if the Free tenant appears with status "active".
3. Do the same for the Monthly, Annual, Founder, and Promo tenants.
4. **PASS** if all 5 registered tenants are visible.

### 21.3 Suspend a tenant

1. Find the Free tenant (`{{TENANT_FREE_SITE}}`).
2. Click "Suspend".
3. **PASS** if the tenant's status badge changes to "suspended" and the button changes to "Reactivate".

### 21.4 Verify suspended tenant cannot log in

1. In a separate browser tab, navigate to `https://rangetrackerapp.com`.
2. Attempt to log in as `{{TENANT_FREE_EMAIL}}` / `{{TENANT_FREE_PASSWORD}}`.
3. **PASS** if login is rejected with an error indicating the account is suspended or inactive.
4. Return to the admin tab.

### 21.5 Reactivate a tenant

1. In the admin panel, click "Reactivate" on the Free tenant.
2. **PASS** if the status badge returns to "active".
3. Verify the Free tenant can log in again (repeat Suite 8.1 briefly).

### 21.6 Set tenant plan via admin

1. In the admin panel, find the Free tenant.
2. Locate the plan selector dropdown and change it to "Promotional" (or another valid plan).
3. Click "Set".
4. **PASS** if the plan label updates in the tenant row.
5. Set it back to "Free" and click "Set".
6. **PASS** if it reverts.

### 21.7 Admin change password

1. In the admin dashboard header, click "Change Password".
2. A modal appears with fields: Current Password, New Password, Confirm New Password.
3. Enter `{{ADMIN_PASSWORD}}` in Current Password.
4. Enter a new password and confirm it (use `{{ADMIN_PASSWORD}}NewTest1!` or similar).
5. Click "Update Password".
6. **PASS** if a success message appears and the modal closes.
7. Immediately change it back: click "Change Password" again, enter the new password as current, and revert to `{{ADMIN_PASSWORD}}`.
8. **PASS** if revert succeeds.

### 21.8 Admin sign out

1. Click "Sign Out" in the admin dashboard.
2. **PASS** if you are returned to the admin login page.

---

## SUITE 22 — Plan Upgrade: Free to Monthly

### 22.1 Initiate upgrade from Free plan

1. Log in as `{{TENANT_FREE_EMAIL}}`.
2. On the Home screen, locate the plan banner and click "Upgrade" (or "Modify Plan" if visible).
3. **PASS** if an upgrade/plan modal appears showing plan options.

### 22.2 Select Monthly plan and proceed to Stripe

1. In the modal, select the "Monthly" plan.
2. Click the confirm/upgrade button.
3. **PASS** if you are redirected to Stripe checkout.
4. Complete checkout with the test card.
5. **PASS** if you return to the app on the Home screen with the plan updated to Monthly (no shooter/record limit banner, or an unlimited indicator).

---

## SUITE 23 — Manage Billing (Monthly/Annual Tenants)

### 23.1 Open billing portal

1. Log in as `{{TENANT_MONTHLY_EMAIL}}`.
2. On the Home screen, click "Manage Billing".
3. **PASS** if you are redirected to a Stripe billing portal page (URL contains `billing.stripe.com`).
4. Navigate back to the app (close the Stripe tab or click back).

---

## SUITE 24 — Downgrade / Cancel Subscription

### 24.1 Initiate downgrade to Free

1. Log in as `{{TENANT_MONTHLY_EMAIL}}`.
2. Click "Modify Plan" on the Home screen.
3. In the modal, select "Free" plan and confirm.
4. **PASS** if a confirmation message indicates the downgrade is scheduled at period end (e.g., "Your plan will change to Free on [date]").
5. **PASS** if the Home screen shows a "cancellation pending" banner noting the future downgrade date.
6. **FAIL** if the plan is changed immediately to Free with limits applied now.

---

## SUITE 25 — Pagination Stress Test (Monthly Tenant)

This suite requires creating 22 range records for a single shooter under an unlimited plan (Monthly/Annual) to fully verify pagination.

### 25.1 Setup: Create a shooter and 22 records

1. Log in as `{{TENANT_MONTHLY_EMAIL}}`.
2. Create a new shooter: First Name "Paginate", Last Name "Tester".
3. Add settings for this shooter (Range Location "Test Range", Firearm Model "Test Pistol").
4. Create 22 range records for this shooter. For each record:
   - Range Location: "Test Range"
   - Firearm Model: "Test Pistol"
   - Additional Notes: "Pagination record N" (N = 1 through 22)
   - Click "Save Record" after each.

### 25.2 Verify pagination display

1. Navigate to Previous Records for "Paginate Tester".
2. **PASS** if the count reads "Displaying 1–20 of 22 records" (or equivalent wording showing a range and total).
3. **FAIL** if it reads "22 records found" with no range and no pagination controls.

### 25.3 Navigate pages

1. Click "Next".
2. **PASS** if the display reads "Displaying 21–22 of 22 records" and 2 records are shown.
3. Click "Previous".
4. **PASS** if page 1 is restored with 20 records.

---

## SUITE 26 — Full Navigation Flow Verification

This suite verifies every navigation path at least once.

### 26.1 Splash screen to login

1. Clear browser localStorage (or open a private/incognito window).
2. Navigate to `https://rangetrackerapp.com`.
3. **PASS** if the splash screen (logo, "Get Started" button) appears.
4. Click "Get Started".
5. **PASS** if you are taken to the login page.

### 26.2 Login to Home

1. Log in as `{{TENANT_FREE_EMAIL}}`.
2. **PASS** if the Home screen loads.

### 26.3 Home to New Record and back

1. Select a shooter.
2. Click "New Record".
3. **PASS** if the Range Record screen loads.
4. Click "Cancel".
5. **PASS** if you return to the Home screen.

### 26.4 Home to Settings and back

1. Click "Settings".
2. **PASS** if the Settings screen loads.
3. Click "Back to Home".
4. **PASS** if the Home screen loads.

### 26.5 Settings to Shooter Profile and back

1. Click "Settings".
2. Click "View Shooter Profile".
3. **PASS** if Shooter Profile loads.
4. Click "Cancel".
5. **PASS** if Settings screen is restored.

### 26.6 Home to Previous Records and back

1. Click "View Previous Records".
2. **PASS** if Previous Records loads with records listed.
3. Click "Back to Home".
4. **PASS** if Home screen loads.

### 26.7 Previous Records to View Record and back

1. Click "View Previous Records".
2. Click "View" on any record.
3. **PASS** if the View Record screen loads.
4. Click "Back to Records".
5. **PASS** if Previous Records loads.

### 26.8 Register page link from login

1. Log out.
2. On the login page, click "Request access" link.
3. **PASS** if the Register page loads.
4. On the Register page, click "Sign in".
5. **PASS** if you return to the login page.

---

## Test Run Completion

After all suites are complete, provide a summary report in the following format:

```
SUITE 1  — Admin Login:                   PASS/FAIL  (N/N tests passed)
SUITE 2  — Free Plan Registration:        PASS/FAIL
SUITE 3  — Monthly Plan Registration:     PASS/FAIL
SUITE 4  — Annual Plan Registration:      PASS/FAIL
SUITE 5  — Founder Plan Registration:     PASS/FAIL
SUITE 6  — Promo Plan Registration:       PASS/FAIL
SUITE 7  — Registration Validation:       PASS/FAIL
SUITE 8  — Tenant Login/Logout:           PASS/FAIL
SUITE 9  — Home Screen State:             PASS/FAIL
SUITE 10 — Shooter Creation:              PASS/FAIL
SUITE 11 — Settings Values:               PASS/FAIL
SUITE 12 — Shooter Profile Edit:          PASS/FAIL
SUITE 13 — Range Record Creation:         PASS/FAIL
SUITE 14 — Free Plan Record Limit:        PASS/FAIL
SUITE 15 — Pagination Display:            PASS/FAIL
SUITE 16 — Filtering:                     PASS/FAIL
SUITE 17 — Export (CSV/ZIP):              PASS/FAIL
SUITE 18 — View Record Read Mode:         PASS/FAIL
SUITE 19 — View Record Edit Mode:         PASS/FAIL
SUITE 20 — Shooter Deletion:              PASS/FAIL
SUITE 21 — Admin Dashboard:               PASS/FAIL
SUITE 22 — Plan Upgrade Free→Monthly:     PASS/FAIL
SUITE 23 — Manage Billing:                PASS/FAIL
SUITE 24 — Downgrade/Cancel:              PASS/FAIL
SUITE 25 — Pagination Stress Test:        PASS/FAIL
SUITE 26 — Full Navigation Flow:          PASS/FAIL

TOTAL: N/26 suites fully passed
FAILURES:
  - [Suite X.Y] [brief description of what failed]
```

---

## Notes for the Executing Agent

- Do not skip a suite because a previous suite failed. Record the failure and continue.
- If a page shows an unexpected error (500, blank page, unhandled exception visible in UI), record it as a FAIL with the error text and continue.
- The Stripe test card `4242 4242 4242 4242` is always approved in Stripe test mode. If it is rejected, this indicates the environment is not in test mode — flag this immediately.
- The CAPTCHA on RegisterPage has been disabled for this test run. If a CAPTCHA is still present and unreadable, flag it to the operator before continuing.
- Admin password reset (forgot-password email flow) is marked for manual testing and is NOT included in this automated run.
- All email verification steps (checking that welcome/approval emails arrived) are manual checks by the operator and are NOT part of this automated run.
- If you encounter a "payment-verification-failed" screen after a Stripe checkout, record it as a FAIL for that suite and flag it to the operator.
