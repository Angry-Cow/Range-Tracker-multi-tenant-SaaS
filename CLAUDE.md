# Project Notes for Claude

## IMPORTANT: Known Security Warning — Do NOT "Fix" It

### Storage Bucket SELECT Policy on `range-photos`

The `range-photos` Supabase storage bucket has a public SELECT policy:

```sql
CREATE POLICY "Public can view range photos"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'range-photos');
```

**This policy is intentional and must NOT be removed.**

- The bucket is already a public bucket — photos are served via public URLs without auth.
- The SELECT policy is required so the Supabase JS storage client can perform its internal existence check before uploading. Without it, all photo uploads fail with an RLS error, causing range record saves to fail.
- Security tools and pre-publish checks will flag this as a broad SELECT policy. **Ignore that warning for this bucket.** Do not remove or restrict this policy.

This was documented on 2026-04-20 after the policy was previously removed during a security tightening pass, which broke photo uploads on range records.

---

## Architecture Notes

- This is a multi-tenant SaaS app. All tenant data lives in `tenant_*` tables (`tenant_shooters`, `tenant_range_records`, `tenant_setting_values`).
- The legacy `range_records`, `shooters`, `setting_values` tables still exist for the original TOLR tenant migrated from the old schema. Do not drop them.
- All tenant API calls go through the `tenant-api` Supabase Edge Function. The `apiClient` in `src/lib/apiClient.ts` is the frontend wrapper for this.
- Photo uploads bypass the edge function and go directly to Supabase Storage using the anon key. This is by design.
- Stripe webhooks update tenant plan data via the `stripe-webhook` edge function.
- `APP_URL` environment variable must be set to `https://rangetrackerapp.com` in production for Stripe redirect URLs to work correctly.

---

## Development Principles

### 1. Think Before Coding

Don't assume. Don't hide confusion. Surface tradeoffs.
Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.
- Do not make any changes until you have 95% confidence in what you need to build.
- Ask follow up questions until you reach that confidence.

### 2. Simplicity First

Minimum code that solves the problem. Nothing speculative.
- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.
Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

### 3. Surgical Changes

Touch only what you must. Clean up only your own mess.
When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.
When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.
The test: Every changed line should trace directly to the user's request.

### 4. Goal-Driven Execution

Define success criteria. Loop until verified.
Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"
For multi-step tasks, state a brief plan:
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.
