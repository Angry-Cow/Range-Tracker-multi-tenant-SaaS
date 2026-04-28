# Code Analysis Report — Range Tracker App
**Date:** 2026-04-25  
**Scope:** All files in `src/` and `supabase/functions/`  
**Purpose:** Identify simplification opportunities and performance improvements

---

## 1. CODE DUPLICATION

### A. Photo Upload Logic — Critical
**Files:** `src/screens/RangeRecordScreen.tsx`, `src/screens/ViewRecordScreen.tsx`

`incrementalSave()` and `handleSubmit()` in both files contain ~60 lines of identical photo upload logic (iterating photoFiles, uploading to storage, setting URL). This logic also appears in the edit form of ViewRecordScreen.

**Fix:** Extract to `src/utils/photoUpload.ts`:
```typescript
export async function uploadPhotoFiles(
  photoFiles: { [key: number]: File },
  shooterId: string,
  supabase: SupabaseClient
): Promise<Record<string, string>> {
  const updates: Record<string, string> = {};
  for (const [photoNumber, file] of Object.entries(photoFiles)) {
    const num = parseInt(photoNumber);
    const fileExt = file.name.split('.').pop();
    const fileName = `${shooterId}/${Date.now()}_photo${num}.${fileExt}`;
    const { data, error } = await supabase.storage.from('range-photos').upload(fileName, file, {});
    if (error) throw error;
    updates[`photo_${num}_url`] = data!.path;
  }
  return updates;
}
```

---

### B. JWT / HMAC Functions Duplicated Across Edge Functions
**Files:** `supabase/functions/admin-api/index.ts`, `supabase/functions/register/index.ts`, `supabase/functions/create-checkout-session/index.ts`, `supabase/functions/tenant-api/index.ts`

`hmacSign()`, `createJWT()`, and `verifyTenantToken()` are defined verbatim in multiple edge functions. A bug fix must be applied in 3+ places.

**Fix:** Create `supabase/functions/_shared/jwt.ts` and import it into each function.

---

### C. CORS Headers Repeated in Every Edge Function
**Files:** All 8 edge functions

Every function defines the same `corsHeaders` object and OPTIONS handler.

**Fix:** Create `supabase/functions/_shared/cors.ts`:
```typescript
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

export function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
```

---

### D. Hard-coded Color Values and Hover Effects
**Files:** All screen and page components

The colors `#093057`, `#0a4070`, `#5e5e5e` appear 100+ times. The inline hover pattern:
```typescript
onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = '#0a4070'; }}
onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = '#093057'; }}
```
is repeated on nearly every button throughout the app.

**Fix:** Create `src/config/theme.ts`:
```typescript
export const COLORS = {
  primary: '#093057',
  primaryHover: '#0a4070',
  bgGray: '#5e5e5e',
};

export const primaryHoverProps = {
  onMouseEnter: (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = COLORS.primaryHover;
  },
  onMouseLeave: (e: React.MouseEvent<HTMLButtonElement>) => {
    e.currentTarget.style.backgroundColor = COLORS.primary;
  },
};
```
Then spread `{...primaryHoverProps}` on buttons instead of repeating the handlers.

---

### E. Plan Limit Checks Repeated in Multiple Screens
**Files:** `src/screens/HomeScreen.tsx`, `src/screens/NewShooterScreen.tsx`, `src/screens/SettingsScreen.tsx`, `src/screens/RangeRecordScreen.tsx`

The same pattern for checking whether the user is at their shooter or record limit is copy-pasted with minor variations.

**Fix:** Add computed values to `AppContext` (or a custom hook) and consume them everywhere:
```typescript
const { atShooterLimit, atRecordLimit } = useApp();
```

---

### F. Photo Number Array Repeated in 4+ Places
**Files:** `src/screens/RangeRecordScreen.tsx`, `src/screens/ViewRecordScreen.tsx`, `src/screens/PreviousRecordsScreen.tsx`, `src/utils/exportRecords.ts`, `src/utils/pdfExport.ts`

The literal `[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13]` (or a loop up to 12/13) appears in 5+ places. Adding a 14th photo slot would require changes in all of them.

**Fix:** Export a constant from `src/types.ts`:
```typescript
export const PHOTO_COUNT = 13;
export const PHOTO_NUMBERS = Array.from({ length: PHOTO_COUNT }, (_, i) => i + 1);
```

---

## 2. PERFORMANCE ISSUES

### A. N+1 Query in Stripe Webhook Downgrade Snapshot
**File:** `supabase/functions/stripe-webhook/index.ts`

`buildDowngradeSnapshot()` queries all shooters for a tenant, then fires a separate `count` query per shooter to get their record count. With 20 shooters this is 21 database round-trips.

**Fix:** Use a single aggregate query:
```typescript
const { data } = await supabase
  .from('tenant_range_records')
  .select('shooter_id')
  .eq('tenant_id', tenantId);

// Count client-side from single result set
const countByShooter = data.reduce((acc, row) => {
  acc[row.shooter_id] = (acc[row.shooter_id] || 0) + 1;
  return acc;
}, {} as Record<string, number>);
```

---

### B. Over-fetching Records Just to Count Them
**File:** `src/screens/RangeRecordScreen.tsx` (lines ~84-95)

```typescript
supabase.from('range_records').select('*').eq('shooter_id', selectedShooter.id)
```
All columns of all records are fetched purely to get `.length` for the record count limit check.

**Fix:**
```typescript
supabase
  .from('range_records')
  .select('*', { count: 'exact', head: true })
  .eq('shooter_id', selectedShooter.id)
```
This returns only the count with no row data.

---

### C. Missing Memoization in HomeScreen
**File:** `src/screens/HomeScreen.tsx`

Functions `shouldShowUpgradeControl()`, `getCancellationPendingText()`, `getPlanBannerText()`, and `getUpgradeLabel()` are called directly in JSX, recalculating on every render. While renders are infrequent, the pattern is fragile.

**Fix:** Replace with `useMemo`:
```typescript
const shouldShowUpgradeControl = useMemo(() => {
  // ... existing logic
}, [planInfo]);
```

---

### D. No Pagination on Previous Records
**File:** `src/screens/PreviousRecordsScreen.tsx` (line ~92-96)

All records for a shooter are loaded into memory in one query. A shooter with 500+ records will experience a slow load and high memory usage, and the filter/sort logic runs on the full dataset.

**Fix:** Implement server-side filtering with limit/offset, or at minimum add a `LIMIT 200` guard with a "load more" option.

---

### E. Duplicate Order Clauses in Settings Load
**File:** `src/screens/SettingsScreen.tsx`

Two `.order()` calls are chained — the second one (`created_at`) likely overwrites or conflicts with the first (`sort_order`), meaning the intentional sort order may not be applied correctly.

**Fix:** Use a single `.order('sort_order', { ascending: true })` and rely on insertion order for ties.

---

### F. Large Form State Object Parsed on Every Keystroke
**Files:** `src/screens/RangeRecordScreen.tsx`, `src/screens/ViewRecordScreen.tsx`

The `formData` object has ~45 fields. Every keystroke in any input calls `setFormData({ ...formData, fieldName: value })`, which spreads and recreates the entire 45-field object. With 13 photo sections each containing a textarea, typing quickly creates many expensive spreads.

**Fix:** Use `useReducer` instead of `useState` for formData, or split the photo sub-state into a separate state object:
```typescript
const [photoData, setPhotoData] = useState<PhotoState[]>(Array(13).fill({ url: '', rotation: 0, notes: '' }));
```

---

## 3. SIMPLIFICATION OPPORTUNITIES

### A. 730+ Line Screen Components
**Files:** `src/screens/RangeRecordScreen.tsx` (~730 lines), `src/screens/ViewRecordScreen.tsx` (~1005 lines)

Both screens are extremely long because each repeats the photo slot pattern inline. The photo section rendering (13 slots × ~20 lines each = 260+ lines) is identical logic.

**Fix:** Extract a `PhotoSlot` component:
```typescript
// src/components/PhotoSlot.tsx
interface PhotoSlotProps {
  num: number;
  photoUrl: string;
  rotation: number;
  notes: string;
  preview?: string;
  onFileChange: (file: File) => void;
  onRotate: () => void;
  onNotesChange: (notes: string) => void;
  onSave?: () => void;
  saving?: boolean;
  saveStatus?: string;
  readOnly?: boolean;
}
```
This alone would reduce both screen files by ~250 lines each.

---

### B. Verbose Plan Logic in HomeScreen
**File:** `src/screens/HomeScreen.tsx`

`shouldShowUpgradeControl()` has a long chain of conditions checking plan types. The logic could be expressed as a lookup:
```typescript
const SHOW_UPGRADE: Record<string, boolean | ((p: PlanInfo) => boolean)> = {
  Free: true,
  Monthly: true,
  Annual: true,
  Promotional: (p) => isWithin15Days(p.expires_at),
  Founder: false,
};
```

---

### C. Redundant State Reset in ViewRecordScreen
**File:** `src/screens/ViewRecordScreen.tsx`

`handleCancelEdit()` manually resets every field of `formData` by copying from `record`. Since `loadRecord()` already populates `formData` from the record data, this is redundant. A cleaner approach is to keep `record` as the source of truth and derive edit state from it.

---

### D. Admin API Route Handler is One Giant Switch Block
**File:** `supabase/functions/admin-api/index.ts`

The entire function is one large conditional chain. With many routes it becomes hard to navigate.

**Fix:** Use a simple route map pattern:
```typescript
const routes: Record<string, (req: Request, body: unknown) => Promise<Response>> = {
  'GET /tenants': handleGetTenants,
  'POST /tenants/approve': handleApproveTenant,
  // ...
};
```

---

## 4. DATABASE/QUERY IMPROVEMENTS

### A. Missing Indexes
No migration creates indexes on frequently queried foreign key columns. Every shooter/tenant lookup does a full table scan.

**Recommended migration:**
```sql
CREATE INDEX IF NOT EXISTS idx_tenant_shooters_tenant_id ON tenant_shooters(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_range_records_tenant_id ON tenant_range_records(tenant_id);
CREATE INDEX IF NOT EXISTS idx_tenant_range_records_shooter_id ON tenant_range_records(shooter_id);
CREATE INDEX IF NOT EXISTS idx_tenant_setting_values_shooter_id ON tenant_setting_values(shooter_id);
CREATE INDEX IF NOT EXISTS idx_range_records_shooter_id ON range_records(shooter_id);
CREATE INDEX IF NOT EXISTS idx_setting_values_shooter_id ON setting_values(shooter_id);
```
For apps with hundreds of records per tenant, this can cut query time by 10-100x.

---

### B. SELECT * Used Throughout
Almost every query uses `select('*')`, fetching all columns including large text fields (notes, all 13 photo URLs/rotations) even when only a few fields are needed for display.

**Example — PreviousRecordsScreen list view** only needs: `id`, `record_date`, `range_location`, `target_type`, `target_distance`, `firearm_model`. Fetching all 50+ columns wastes bandwidth.

**Fix:** Use explicit column lists for list views. Reserve `select('*')` for single-record detail views.

---

### C. Full Record Stored as Downgrade Snapshot (JSON)
**File:** `supabase/functions/stripe-webhook/index.ts`

The downgrade snapshot stores complete shooter/record data as a JSONB column. This is large and could become stale. A better approach is to store only the counts and let the application re-query if restoration is needed.

---

## 5. SECURITY IMPROVEMENTS

### A. Internal Error Details Leaked to Client
**File:** `supabase/functions/create-checkout-session/index.ts`

Error responses include raw error messages and internal step names:
```typescript
return json({ error: String(err), errorStep: "stripe.customers.create" }, 500);
```

**Fix:** Log full error server-side, return only a generic message and a reference ID to the client.

---

### B. No Rate Limiting on Public Endpoints
**Files:** `supabase/functions/register/index.ts`, `supabase/functions/send-error-report/index.ts`

These endpoints accept unauthenticated requests with no rate limiting. The register endpoint in particular could be abused for spam tenant creation.

**Fix:** Add IP-based rate limiting (Supabase doesn't provide this natively — consider using Cloudflare or a simple database-backed counter with TTL).

---

### C. No Audit Log for Admin Actions
**File:** `supabase/functions/admin-api/index.ts`

Admin operations (approve, suspend, delete tenants, change plans) leave no audit trail.

**Fix:** Add an `admin_audit_log` table and insert a row on every sensitive admin action.

---

### D. No Idempotency Keys on Stripe Calls
**File:** `supabase/functions/create-checkout-session/index.ts`

If the same request is retried (network timeout, user double-click), it could create duplicate Stripe checkout sessions.

**Fix:** Generate an idempotency key from the tenant ID + a request nonce and pass it to the Stripe API call.

---

## 6. PRIORITY RANKING

| Priority | Change | Effort | Impact |
|----------|--------|--------|--------|
| 1 | Add missing DB indexes | Low | High — faster every query |
| 2 | Fix N+1 in downgrade snapshot | Low | High — 20x fewer queries |
| 3 | Replace `select('*')` with column lists in list views | Low | Medium — less bandwidth |
| 4 | Fix over-fetch count query in RangeRecordScreen | Low | Medium |
| 5 | Extract `PhotoSlot` component | Medium | High — 500 fewer lines, easier maintenance |
| 6 | Extract `uploadPhotoFiles` utility | Low | High — eliminates duplicate code |
| 7 | Create shared CORS / JWT modules for edge functions | Medium | High — easier to maintain, fewer bugs |
| 8 | Add `PHOTO_COUNT` / `PHOTO_NUMBERS` constant | Low | Medium — safe to extend later |
| 9 | Create theme constants file | Low | Medium — eliminates 100+ duplicates |
| 10 | Add plan limit helpers to AppContext | Medium | Medium |
| 11 | Pagination for Previous Records | Medium | Medium — needed at scale |
| 12 | Add audit logging for admin actions | Medium | High — compliance/debugging |
| 13 | Fix error details leaked in Stripe responses | Low | High — security |

---

*End of analysis. To act on this, paste this file back into the chat and specify which items you want addressed.*
