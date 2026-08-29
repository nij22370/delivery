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
| BUG-11 | Public navbar "Post a Job" links to `/post-job` without auth check | Fixed | Aug 29 — task | Header.tsx renders `<Link href="/post-job">` for logged-out visitors; unauthenticated users reach the job-posting form directly | Redirect href to `/login?redirect=/post-job` when no session, mirroring `useAuthGuard` pattern |
| BUG-12 | Admin verification page renders a different sidebar | Fixed | Aug 29 — task | `src/app/(main)/admin/verification/page.tsx` uses `(main)` layout with inline sidebar [Verifications, Active Drivers, Payouts, System Settings] instead of the unified AdminSidebar from `(admin)/layout.tsx` | Moved page to `(admin)/admin/verification/page.tsx`, removed inline sidebar, deleted old file |
| BUG-13 | Admin export buttons are stubs (toast-only) | Fixed | Aug 29 — task | `handleExport` and `handleDownloadReport` in `src/app/(admin)/admin/jobs/page.tsx` only call `toast.info()` — no actual PDF/CSV generation | Implemented with `jspdf`/`jspdf-autotable` (PDF) and `Blob` API (CSV) using TanStack Query data |
| BUG-14 | Admin topbar missing Settings link | Fixed | Aug 29 — task | `AdminHeader.tsx` has no Settings link; should mirror poster/driver pattern (Settings + Profile in topbar, no FAQ/Contact) | Added Settings icon link (`/settings`) to AdminHeader topbar next to Profile |
| BUG-15 | Admin export stubs on /admin/users and /admin/payouts | Open | Aug 29 — task | "Export CSV" buttons on users and payouts pages are non-functional (toast-only or missing handler); jobs page already works | Replicate jobs page CSV export pattern on users and payouts |
| BUG-16 | Admin Settings+Profile in topbar instead of sidebar | Open | Aug 29 — task | Settings link and Profile (avatar+name+role) were added to AdminHeader topbar in BUG-14, but the requirement is for them to live at the bottom of the left sidebar only | Remove from AdminHeader, add to AdminSidebar bottom |
| BUG-17 | Dispute resolve modal uses two dropdowns instead of plain-language guidance | Fixed | Aug 29 — task | `ResolveDisputeModal.tsx` uses two `<select>` dropdowns ("Resolution" + "Payout Status") with no explanation of what each choice does; admin must mentally map technical values to real-world outcomes | Replaced with step-by-step radio buttons: Step 1 (cancel / re-post), Step 2 (refund / pay / split), Step 3 (note textarea); single "Confirm Resolution" button; split shows two NPR inputs |
| BUG-18 | Dispute detail bottom action buttons are ambiguous — four actions without context | Fixed | Aug 29 — task | Four buttons ("Dismiss Dispute", "Split/Partial", "Pay Driver", "Refund Poster") with no explanation, no confirmation, no consequence labels; admin must know the internal mapping | Replaced with two buttons: "Dismiss (no action needed)" (grey/left, direct resolve) and "Resolve Dispute →" (blue/right, opens simplified modal) |
| BUG-19 | Admin cannot message poster/driver directly from dispute detail panel | Fixed | Aug 29 — task | Chat bubble icons on Poster/Driver cards are non-functional; existing `POST /api/jobs/:id/messages` uses `assertParticipant()` which returns 403 for admin users who are not the poster or driver | Created `GET/POST /api/jobs/:id/admin-message` with `withRole(["admin"])` guard, added `AdminMessagePanel` with poster/driver tabs, reuses `Message` model and `private-job-{jobId}` Pusher channel via `triggerJobEvent` |

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

---

## BUG-11 — Public navbar "Post a Job" links to `/post-job` without auth check

**Reported:** Aug 29 · **Found by:** task description
**Status:** Fixed
**Severity:** Medium

### Symptom
The public Header (`src/components/layout/Header.tsx`) renders `<Link href="/post-job">` in the desktop nav ("Post Delivery"), desktop CTA ("Post a Job"), and mobile nav ("Post Delivery") for logged-out visitors. Clicking any of these navigates directly to the job-posting form without an auth check.

### Root cause
The `Header` uses `useAuth()` (which returns `user` but never redirects). The "Post a Job" / "Post Delivery" links always point to `/post-job` regardless of auth state. Unlike protected routes that use `useAuthGuard()`, the public navbar had no auth gate on these links.

### Investigation trail
- Read `Header.tsx` — found the three `<Link href="/post-job">` occurrences for logged-out/poster users
- Read `useAuthGuard.ts` — confirmed the established pattern: `router.replace(`${redirectTo}?redirect=${encodeURIComponent(window.location.pathname)}`)`
- Confirmed `useAuth()` is already imported in Header (used for role-aware rendering)

### Fix
- Added `LOGIN_PATH = "/login"` and `POST_JOB_PATH = "/post-job"` module-level constants
- Added `postJobHref` computed via `useMemo`: returns `POST_JOB_PATH` when `user` exists, otherwise `${LOGIN_PATH}?redirect=${encodeURIComponent(POST_JOB_PATH)}`
- Updated all three "Post a Job" / "Post Delivery" links to use `postJobHref`:
  - Desktop nav "Post Delivery" (line 69)
  - Desktop CTA "Post a Job" (logged-out section)
  - Mobile nav "Post Delivery"

### Regression guard
Logged-out visitor clicking "Post a Job" lands on `/login?redirect=/post-job`; after login, redirected to `/post-job`. Authenticated poster still gets `/post-job` directly. Driver/admin nav links unchanged.

### Verification
- `tsc --noEmit` — 0 errors
- `npm run build` — 58 pages, 0 errors

---

## BUG-12 — Admin verification page renders a different sidebar

**Reported:** Aug 29 · **Found by:** task description (screenshot comparison)
**Status:** Fixed
**Severity:** Medium

### Symptom
`/admin/jobs` renders the unified AdminSidebar [Dashboard, Job Management, Disputes, User Management, Payout Management, Verifications] via `(admin)/layout.tsx`. But `/admin/verification` renders a completely different inline sidebar [Verifications, Active Drivers, Payouts, System Settings] because the page lived at `src/app/(main)/admin/verification/page.tsx` using the `(main)` layout (Header + Footer) with its own inline sidebar.

### Root cause
Route group mismatch: the verification page file was placed under `(main)/admin/verification/` instead of `(admin)/admin/verification/`. Since route groups are URL-invisible, both paths resolve to `/admin/verification`, but the `(main)` layout was used instead of the `(admin)` layout with the canonical AdminSidebar.

### Investigation trail
- Listed all files under `(admin)` and `(main)/admin` route groups
- Confirmed `(admin)/layout.tsx` uses `AdminSidebar` component with the canonical NAV_ITEMS
- Confirmed `(main)/admin/verification/page.tsx` had its own inline `<aside>` with different `NAV_ITEMS` (lines 48-53, 185-206)
- Confirmed all other admin pages (jobs, disputes, users, payouts, analytics) live under `(admin)/admin/`

### Fix
- Created `src/app/(admin)/admin/verification/page.tsx` with the same logic but without the inline sidebar, `NAV_ITEMS` constant, `useAuthGuard`/`useRouter` auth guard, and loading spinner (the `(admin)/layout.tsx` handles auth guarding and sidebar)
- Deleted `src/app/(main)/admin/verification/page.tsx` and the empty `(main)/admin/` directory
- Canonical admin layout confirmed: `src/app/(admin)/layout.tsx` with `AdminSidebar.tsx` NAV_ITEMS = [Dashboard, Job Management, Disputes, User Management, Payout Management, Verifications]

### Regression guard
`/admin/verification` renders with the same left sidebar as `/admin/jobs`. All auth/role checks handled by the `(admin)` layout. Page content (tabs, stat cards, table, reject modal) unchanged.

### Verification
- `tsc --noEmit` — 0 errors
- `npm run build` — 58 pages, 0 errors; `/admin/verification` listed as static page

---

## BUG-13 — Admin export buttons are stubs (toast-only)

**Reported:** Aug 29 · **Found by:** task description
**Status:** Fixed
**Severity:** Medium

### Symptom
The "Download Report" (PDF) and "Export" (CSV) buttons on `/admin/jobs` only called `toast.info(...)` — no file was generated.

### Root cause
The `handleExport` and `handleDownloadReport` handlers in `src/app/(admin)/admin/jobs/page.tsx` were placeholder stubs.

### Fix
- Installed `jspdf@4.2.1` and `jspdf-autotable@5.0.8` as dependencies
- Implemented `handleDownloadReport`: creates a `jsPDF` document, uses `autoTable(doc, { head, body })` to render the visible job table data (Job ID, Status, Poster, Driver, Pickup, Dropoff, Price, Date) from the `jobs` TanStack Query result, and saves as `job-management-report.pdf`
- Implemented `handleExport`: builds CSV rows from the `jobs` array using `escapeCsvCell` for proper RFC 4180 escaping (handles commas, quotes, newlines), creates a `Blob`, and triggers download as `job-management-report.csv`
- Both handlers use the `jobs` useMemo (already filtered by status, search, and vehicle type — not re-fetching from the API)

### Regression guard
Both buttons generate files with the same data visible on screen. No new API calls. Empty data set shows a toast instead of an empty file.

### Verification
- `tsc --noEmit` — 0 errors
- `npm run build` — 58 pages, 0 errors
- ESLint: 0 errors (1 pre-existing `rawJobs` warning unrelated to this change)

---

## BUG-14 — Admin topbar missing Settings link

**Reported:** Aug 29 · **Found by:** task description
**Status:** Fixed
**Severity:** Low

### Symptom
`AdminHeader.tsx` (the admin topbar) had notifications and profile (avatar + name) but no Settings link. The poster/driver dashboard sidebar includes Settings as a footer link; the admin topbar needed the same pattern.

### Root cause
`AdminHeader.tsx` was originally built without a Settings entry. No FAQ or Contact links existed in the admin layout, so only Settings + Profile consolidation was needed.

### Fix
- Added `Link` import and `getInitials` utility import to `AdminHeader.tsx`
- Added a Settings icon button (`<Link href="/settings">`) between notifications and the profile section in the topbar, matching the visual pattern from the dashboard layout (icon-only button, `w-10 h-10`, rounded-full, hover:bg-surface-container)
- Refactored initials computation to use `getInitials(displayName)` instead of inline `user.name.slice(0, 2).toUpperCase()`

### Regression guard
Admin topbar now shows: notifications | Settings | Profile (avatar + name + role). No FAQ, no Contact. No duplicate Profile section elsewhere in the admin layout — the only Profile is in AdminHeader (the AdminLayout footer has an "Admin System" badge, not a Profile).

### Verification
- `tsc --noEmit` — 0 errors
- `npm run build` — 58 pages, 0 errors
- ESLint: 0 errors on AdminHeader.tsx

---

## BUG-17 — Dispute resolve modal uses two dropdowns instead of plain-language guidance

**Reported:** Aug 29 · **Found by:** task description (screenshots)
**Status:** Fixed
**Severity:** Medium

### Symptom
The "Resolve Dispute" modal in `src/components/admin/ResolveDisputeModal.tsx` uses two `<select>` dropdowns labeled "Resolution" and "Payout Status" with technical values (`posted`/`cancelled`, `paid`/`failed`) and no explanation of what each combination does. Four bottom buttons ("Dismiss", "Split/Partial", "Pay Driver", "Refund Poster") open the same modal with different presets, making the flow confusing for a non-technical admin.

### Root cause
The modal predates the `JOB_STATUS` and payout split constants (D-36/38). It directly exposes low-level database enum values to the admin without a translation layer, and the four pre-set buttons bypass the modal's step-by-step thinking by hard-coding preset combinations.

### Fix
- Rewrote `ResolveDisputeModal.tsx` with a step-by-step plain-language flow:
  - **Step 1 — "What happened?"** radio buttons: "Job should be cancelled" / "Job should be re-posted so another driver can take it"
  - **Step 2 — "Who gets the money?"** radio buttons (shown only after Step 1 chosen): "Refund the poster (sender)" / "Pay the driver (courier)" / "Split it between both"
  - Step 2 "Split" shows two NPR amount numeric inputs
  - **Step 3 — "Explain your decision"** textarea labeled "This is saved for records"
  - Single "Confirm Resolution" button at the bottom
- Removed `initialResolvedStatus` and `initialPayoutStatus` props (admin now chooses everything inside the modal)
- Removed `modalPreset` state from `src/app/(admin)/admin/disputes/page.tsx`
- Split amounts are embedded in the resolution note (the resolve endpoint's `payoutStatus` accepts only `paid`/`failed`; the amounts are communicated via the note field since the resolve API is out of scope)
- Replaced four bottom buttons with two: "Dismiss (no action needed)" (grey, left-aligned, calls resolve mutation directly) and "Resolve Dispute →" (blue, right-aligned, opens the simplified modal)
- Removed non-functional chat bubble icons from Poster and Driver cards (the real messaging UI is now in the Admin Messages section below)

### Regression guard
Resolve modal has no dropdown elements — only radio buttons, number inputs, and textarea. Step 2 and Step 3 are hidden until Step 1 is chosen. Split amounts are required when "Split it between both" is selected. Bottom of dispute detail has exactly two buttons.

### Verification
- `tsc --noEmit` — only pre-existing errors in `users/page.tsx`; 0 errors on changed files
- `npm run build` — ✓ Compiled successfully, TypeScript finished, 58 pages generated, exit code 0
- ESLint: 0 errors, 0 warnings on changed files

---

## BUG-18 — Dispute detail bottom action buttons are ambiguous

**Reported:** Aug 29 · **Found by:** task description (screenshots)
**Status:** Fixed
**Severity:** Medium

### Symptom
Four action buttons at the bottom of the dispute detail panel — "Dismiss Dispute", "Split/Partial", "Pay Driver", "Refund Poster" — each opens the resolve modal with a different preset. There is no explanation of what each button does, no confirmation step, and no consequence description. An admin clicking "Split/Partial" and "Pay Driver" sees the same modal state, making it unclear which action was actually taken.

### Root cause
The original design used pre-set modal states to communicate intent: each button opened the modal with `resolvedStatus`/`payoutStatus` values pre-selected. But the modal's dropdowns used technical labels (`posted`/`cancelled`/`paid`/`failed`) that don't map to plain English, so the button-to-modal connection was opaque.

### Fix
- Replaced four buttons with two clearly labelled buttons:
  - "Dismiss (no action needed)" — grey, left-aligned, calls `resolveMutation.mutate` directly with `resolvedStatus: "posted"`, `payoutStatus: "failed"`, and note "Dismissed — no action needed"
  - "Resolve Dispute →" — blue, right-aligned, opens the simplified `ResolveDisputeModal` where the admin makes all decisions step-by-step
- "Split/Partial", "Pay Driver", and "Refund Poster" no longer exist as standalone buttons — those decisions are made inside the modal via Step 2 radio buttons

### Regression guard
Bottom of dispute detail has exactly two buttons. "Dismiss" resolves immediately without opening a modal. "Resolve Dispute →" opens the modal for step-by-step resolution.

### Verification
- `tsc --noEmit` — 0 errors on changed files
- `npm run build` — ✓ Compiled successfully, 58 pages generated, exit code 0
- ESLint: 0 errors on changed files

---

## BUG-19 — Admin cannot message poster/driver directly from dispute detail panel

**Reported:** Aug 29 · **Found by:** task description
**Status:** Fixed
**Severity:** High

### Symptom
The dispute detail panel shows Poster and Driver cards with chat bubble icons, but clicking them does nothing. When an admin needs to ask the poster for more evidence or clarify the situation with the driver, there is no way to send a message directly from the dispute page.

### Root cause
The existing `POST /api/jobs/:id/messages` route uses `assertParticipant()` (in `src/app/api/jobs/[id]/messages/route.ts:32-49`) which checks whether the caller is the poster or driver of the job. An admin user is neither, so they receive a 403 "Forbidden" response. The chat icons on the dispute cards were never wired to any handler.

### Fix
- Created `src/app/api/jobs/[id]/admin-message/route.ts` — a new API route with two handlers:
  - **GET**: wrapped in `withRole(["admin"])`, returns paginated messages for the job (optionally filtered by `?recipientId=`). Admin bypasses the participant check, so they can read any job's message history.
  - **POST**: wrapped in `withRole(["admin"])`, accepts `{ recipientId, content }`, validates the recipient is a job participant (poster or driver), saves to the existing `Message` model with `senderId = admin userId`, and triggers a Pusher `new-message` event on the `private-job-{jobId}` channel via `triggerJobEvent(jobId, "new-message", {...})` so the recipient receives it in real time
- Created `src/components/admin/AdminMessagePanel.tsx` — a self-contained messaging component with:
  - Two tabs: "Message Poster" and "Message Driver" (driver tab hidden when no driver assigned)
  - Scrollable message history per tab, fetched from `GET /api/jobs/:id/admin-message?recipientId=xxx`
  - Text input + "Send" button, posting to `POST /api/jobs/:id/admin-message`
  - Message bubbles: admin's messages on the right (label "You"), recipient's on the left
  - `useAuth()` to get the admin's userId for message alignment
- Placed the "Admin Messages" section in the dispute detail panel below "Evidence & Claims" and above "Timeline and Chat snippet"
- Replaced the non-functional chat bubble icons on Poster/Driver cards with nothing (the messaging is now in the dedicated Admin Messages section)

### Regression guard
- Existing `POST /api/jobs/:id/messages` route is unchanged (no new endpoint added to it)
- No new Mongoose model — reuses `Message` from `src/models/Message.ts`
- No new Pusher channel — reuses `private-job-{jobId}` via the existing `triggerJobEvent` helper
- The admin-message route is wrapped in `withRole(["admin"])` — non-admin users get 403
- The POST handler validates that `recipientId` is a job participant (poster or driver) before saving — admin cannot message arbitrary users

### Verification
- `tsc --noEmit` — 0 errors on changed files
- `npm run build` — ✓ Compiled successfully, 58 pages generated, exit code 0
- ESLint: 0 errors on changed files

---


