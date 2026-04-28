/*
  # Set token and show values on all plans

  1. Updates
    - All plans: show = 1 (visible in plan selection dropdown)
    - Founder plan: token = '5#!&%'
    - Promotional plan: token = '80343'
    - Free, Monthly, Annual plans: token remains NULL
*/

UPDATE plans SET show = 1;

UPDATE plans SET token = '5#!&%' WHERE plan_name = 'Founder';
UPDATE plans SET token = '80343' WHERE plan_name = 'Promotional';
UPDATE plans SET token = NULL WHERE plan_name NOT IN ('Founder', 'Promotional');
