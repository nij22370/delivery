# Bug.md — Trace Every Bug Start to Finish

> Every bug gets a full trace: how it was found, what was tried, what worked, what didn't, how it was verified. A bug that is not traced is a bug that will be re-introduced.

---

## The Bug Trace Format (copy this block for each bug)

```markdown
## BUG-<NN> — <short title>

**Reported:** <date> · **Found by:** <who/how — user report, test, code review>
**Status:** <Open | Investigating | Fixed | Won't-fix | Duplicate>
**Severity:** <Critical | High | Medium | Low>

### Symptom
What actually happened, vs. what was expected. Screenshot/error text if available.

### Root cause
The actual mechanism (file:line + why). Not the symptom — the cause.

### Investigation trail
- What was checked first and why
- Hypotheses that were ruled out (and the evidence)
- The hypothesis that held

### Fix
The change(s) that resolved it (file paths + what changed).

### Regression guard
How to make sure it never comes back (test, checklist row, constraint).

### Verification
Commands run + results. Must reference `TestChecklist.md` rows.
```

---

## Bug Log

| ID | Title | Status | Found | Root cause (one line) | Fixed in |
| --- | --- | --- | --- | --- | --- |
| BUG-01 | Two parallel pages resolve to `/jobs/[id]` (build fails) | Fixed | Aug 16 — `npm run build` | `(dashboard)/jobs/[id]/page.tsx` duplicated `(main)/jobs/[id]/page.tsx`; route groups are URL-invisible, so both mapped to `/jobs/[id]` | `(main)/jobs/[id]/page.tsx` merged, `(dashboard)` duplicate deleted |
| BUG-02 | `FiltersSidebar` prop `minPayoutDollars` doesn't exist | Fixed | Aug 16 — build type-check | Stale USD-era prop name left on browse page after NPR migration | `minPayoutNpr` |
| BUG-03 | `@/types/payments` module missing | Fixed | Aug 16 — build type-check | `payment/success/loading.tsx` imported unused `PaymentVerifyResult` from a nonexistent module | removed unused import |
| BUG-04 | `useSearchParams()` not in Suspense on `/payment/failure` | Fixed | Aug 16 — prerender error | Client page read `useSearchParams()` at static-prerender time without a Suspense boundary | wrapped content in `<Suspense>` |
| BUG-05 | Gateway status strings are magic strings in verify routes | Open | Aug 16 — rules audit | `"Completed"`, `"Expired"`, `"COMPLETE"`, `"FAILED"`, `"AMBIGUOUS"` compared as raw literals in `khalti/verify` and `esewa/verify` instead of named constants | — |
| BUG-06 | `GET /api/drivers/payouts` fetches all records (no pagination) | Open | Aug 16 — rules audit | `Payout.find({ driverId })` with no `page`/`limit` violates "never fetch all records" | — |
| BUG-07 | Verify URLs built with string-interpolated query params | Open | Aug 16 — rules audit | `/payment/success` builds `` `${appUrl}/api/payments/khalti/verify?pidx=${pidx}` `` | — |
| BUG-08 | Payout split constants + gateway types duplicated across files | Open | Aug 16 — rules audit | 90/10 constants in 3 route files; `PaymentGateway`/`PayoutGateway` types in 4+ files | — |
| BUG-09 | No PaymentTransaction list/read API endpoint | Open | Aug 27 — FEATURE-13 | `PaymentTransaction` model exists but has no GET endpoint; History Payments tab derives payment records from delivered Jobs (`offeredPrice`, `paymentGateway`, `paymentStatus`) as a workaround | Add `GET /api/payments` returning PaymentTransaction records for the current poster; update Payments tab to use it |
| BUG-10 | Verification document badges show "Pending" when profile is "approved" | Fixed | Aug 28 — driver verification page | `StatusBadge` checked `isPending && isReady` before checking `isApproved`; since `isPending` (= `isLocked`) was true when approved, approved drivers saw "Pending" on all four document badges | Added `isApproved` prop to `StatusBadge`, checked first with green "Verified" badge |

---

### Known, deliberately untraced

- **`src/utils/mapIcons.js` uses `L.Icon` without importing `L`** — documented in `Handover.md`, not a Bug.md entry until it's actively causing a failure. Fix or delete before building on it.

---

## BUG-05 — Gateway status strings are magic strings in verify routes

**Reported:** Aug 16 · **Found by:** rules audit (Days 45–48)
**Status:** Open
**Severity:** Low

### Symptom
The two verify routes compare gateway statuses against raw string literals instead of named constants:
- `src/app/api/payments/khalti/verify/route.ts` — `"Completed"`, `"Pending"`, `"Expired"`, `"User canceled"`, `"Refunded"`
- `src/app/api/payments/esewa/verify/route.ts` — `"COMPLETE"`, `"FAILED"`, `"AMBIGUOUS"`

### Root cause
Copied straight from each gateway's sandbox docs; no named constants or shared status type (the `TransactionStatus` enum exists in `src/models/PaymentTransaction.ts` but is not reused here).

### Fix (when scheduled)
Define shared named constants (or reuse `TransactionStatus`) in `src/types/payments/` and import them in both routes.

### Regression guard
Rules audit pass; `no-magic-strings` style review on verify routes.

---

## BUG-06 — `GET /api/drivers/payouts` fetches all records (no pagination)

**Reported:** Aug 16 · **Found by:** rules audit (Days 45–48)
**Status:** Open
**Severity:** Medium

### Symptom
`src/app/api/drivers/payouts/route.ts` runs `Payout.find({ driverId }).sort({ createdAt: -1 }).populate(...).lean()` with no page/limit — violates AGENTS.md "Never fetch all records — pagination from day one, `PAGE_SIZE = 10`".

### Root cause
Built for the earnings summary before the pagination rule was applied to this route.

### Fix (when scheduled)
Add `page`/`limit` query params (default `PAGE_SIZE = 10`), return `{ items, total, page, totalPages }`; keep `totalEarned`/`pendingPayout` as separate summary fields.

### Regression guard
Rules audit pass; TestChecklist row for paginated payout fetch.

---

## BUG-07 — Verify URLs built with string-interpolated query params

**Reported:** Aug 16 · **Found by:** rules audit (Days 45–48)
**Status:** Open
**Severity:** Low

### Symptom
`src/app/payment/success/page.tsx` builds
`` `${appUrl}/api/payments/khalti/verify?pidx=${pidx}` `` and the eSewa equivalent with `?data=${data}` — string interpolation for query params, violating AGENTS.md "Never construct URLs with string interpolation for query params".

### Root cause
Server-side redirect convenience; the rule targets client fetch calls, but the spirit (structured params) applies.

### Fix (when scheduled)
Refactor verify into a direct server-side function call (or structured fetch with `URLSearchParams`) so no interpolated URL is constructed.

### Regression guard
Rules audit pass.

---

## BUG-08 — Payout split constants + gateway types duplicated across files

**Reported:** Aug 16 · **Found by:** rules audit (Days 45–48)
**Status:** Open
**Severity:** Medium

### Symptom
- `DRIVER_PAYOUT_PERCENTAGE = 0.9` / `PLATFORM_FEE_PERCENTAGE = 0.1` duplicated in `src/app/api/payments/khalti/verify/route.ts`, `src/app/api/payments/esewa/verify/route.ts`, and `src/app/api/jobs/[id]/deliver/route.ts`.
- `type PaymentGateway` declared in `src/models/Job.ts`, `src/models/PaymentTransaction.ts`, `src/models/Payout.ts` (as `PayoutGateway`), and `src/lib/payments/index.ts`; `PayoutGateway`/`PayoutStatus` also in `src/types/payout/payout.ts`.

### Root cause
Copied per-file instead of extracting to a shared module, violating "Every interface has exactly one source of truth per concept".

### Fix (when scheduled)
Single `PaymentGateway` type + payout split constants in `src/types/payments/payments.ts` (or `src/lib/payments/constants.ts`); models import from it.

### Regression guard
Rules audit pass; grep for duplicate type declarations.

---

## BUG-10 — Verification document badges show "Pending" when profile is "approved"

**Reported:** Aug 28 · **Found by:** user report
**Status:** Fixed
**Severity:** Medium

### Symptom
When a driver's top-level `verificationStatus === "approved"`, the top banner correctly reads "You are verified", but all four document section badges (Driver's Licence, Government ID, Vehicle Insurance, Background Check) show "Pending" instead of "Verified".

### Root cause
`src/app/(dashboard)/driver/verification/page.tsx:261` — `StatusBadge` checked `if (isPending && isReady)` **before** checking `isApproved`. Since `isPending` was mapped to `isLocked` (which is `isPending || isApproved`, i.e. true when approved), the first condition matched for approved drivers with uploaded files, rendering the "Pending" badge.

### Investigation trail
- Read the `StatusBadge` component at `page.tsx:261-284` — condition order was: Pending+Ready (first), Ready (second), Not Started (fallback)
- Confirmed `isApproved` was available in the page scope (line 309: `profile?.status === DRIVER_PROFILE_STATUS.APPROVED`) but not passed to `StatusBadge`
- No new API call needed — `verificationStatus` (mapped to `profile.status`) was already returned by the existing `GET /api/drivers/verification` endpoint

### Fix
- Added `isApproved: boolean` to `StatusBadgeProps` interface
- Added early return `if (isApproved)` that renders a green "Verified" badge with `verified` icon — checked **before** the Pending/Uploaded/Not Started logic
- Updated all four `StatusBadge` usages to pass `isApproved={isApproved}`
- When `verificationStatus === "pending"`, badges still show "Pending" (unchanged)
- When `verificationStatus === "rejected"`, badges still show "Rejected" (unchanged)

### Regression guard
Manual: approved driver sees 4 green "Verified" badges; pending driver sees "Pending" badges; rejected driver sees "Rejected".

### Verification
- `tsc --noEmit` — 0 errors
- `npm run build` — 0 errors, 0 warnings

---

## FEATURE-02 — Remove sidebar from 404 and error pages

**Requested:** Aug 28 · **Requested by:** user
**Status:** Shipped · **Scope:** The `not-found.tsx` and `error.tsx` pages had inline left sidebars (nav links + user profile card) that are unnecessary on error pages. Remove them and make the content area full-width, while preserving the brand header, top-header buttons, and footer.

### Why (intent)
Error pages should present the error message clearly without competing sidebar navigation. The sidebar was duplicating navigation that already exists in the main layout.

### Design
- Both pages already have inline (non-shared) sidebar markup
- Removed the `<aside>` sidebar, mobile drawer backdrop, hamburger toggle, and search input
- Replaced with a compact top header: brand logo on the left, notifications/help buttons + auth-aware profile/login avatar on the right
- Main content and footer already full-width after sidebar removal
- Cleaned up unused code: `NAV_ITEMS` constant, `formatRoleLabel` function, `roleLabel` variable, mobile menu `useState`/`useCallback` handlers

### Implementation trail
- `src/app/not-found.tsx`: removed `useState`, `useCallback` imports + mobile menu state; removed `NAV_ITEMS` constant + `formatRoleLabel` function; replaced sidebar with compact header; added auth-aware profile/login button in header
- `src/app/error.tsx`: same structural changes; preserved `useState` only for `isResetting` (refresh button state); kept `useCallback` only for `handleReset`

### Verification
- `tsc --noEmit` — 0 errors
- `npm run build` — 56 pages, 0 errors
- 404 page renders full-width without sidebar
- Error page renders full-width without sidebar
