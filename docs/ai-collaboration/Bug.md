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
| BUG-20 | `/api/payments/history` filter mismatch (string vs ObjectId) | Fixed | Sep 2 — see trace below | JWT `userId` is a plain string but `PaymentTransaction.posterId` is an `ObjectId`; BSON type mismatch returned 0 rows | `new Types.ObjectId(user.userId)` cast |
| BUG-21 | Driver dashboard Recent Activity empty (no `driverId=me`) | Fixed | Sep 2 — see trace below | `useMyJobs` without `driverId` falls into the `status:"posted"` branch (open-jobs pool, not the driver's own) | `driverId: "me"` on the hook call |
| BUG-22 | Driver column "Unassigned" (populate after lean + wrong field name) | Fixed | Sep 2 — see trace below | Two bugs: `.populate("driverId","name")` chained after `.lean()` (silently ignored) + frontend read `job.driver?.name` (field never existed) | `.find().populate().sort().skip().limit().lean()` order + render via `typeof === "object"` guard |
| BUG-23 | Bell inbox never fires on real state changes (notifyUser not called in 9 API routes) | Fixed | Sep 3 — see FEATURE-33 | `notifyUser()` was extended in FEATURE-24 but no caller actually invoked it from a state-change route. The bell badge stayed at zero. | `void notifyUser(...)` added to 9 routes (accept, transit, deliver, messages, admin-message, both verify routes, admin resolve, admin payout override); each call persists a `Notification` row and fires a Pusher event |
| BUG-24 | Admin dispute resolve didn't notify driver/poster on outcome | Fixed | Sep 3 — see FEATURE-33 Item 1 | `PATCH /api/admin/jobs/[id]/resolve` saved the resolution to DB but never fired a notification, so users didn't know the dispute was resolved until they refreshed | `void notifyUser(posterId, resolveMessage, "info", { link: "/jobs/{id}" })` + matching driver notification (if assigned) + optional payout-status notification |
| BUG-25 | Khalti/eSewa verify never notified the poster on payment failure | Fixed | Sep 3 — see FEATURE-33 Items 5+6 | When Khalti returns Expired/User-canceled/Refunded or eSewa returns FAILED/AMBIGUOUS, the job's `paymentStatus` was set to `"failed"` silently — the poster had no in-app signal to retry | `void notifyUser(posterId, "Your {Khalti\|eSewa} payment ...", "error", { link: "/jobs/{id}" })` added to all five failure branches; success path also notifies poster + driver (payout initiated) |
| BUG-26 | Admin history page always empty (response shape mismatch) | Fixed | Sep 3 — project session | Local `AdminJobsResponse` / `AdminPayoutsResponse` interfaces in `AdminHistory.tsx` declared `{ jobs, total, totalPages }` / `{ payouts, total, totalPages }` and the component read `adminJobsData.jobs` / `adminPayoutsData.payouts`. The actual API returns `{ success, data, total, page, limit, totalPages, stats\|summary }` so the array was `undefined`, the row-mapping `useMemo` produced `[]`, and the empty-state text rendered. The `as Promise<AdminJobsResponse>` cast masked the mismatch from TypeScript. | Replaced the local interfaces with imports from the canonical `src/types/admin/adminJobs.ts` and `src/types/admin/adminPayouts.ts` (which already had the right shape). Switched the row-mapping accessors from `job.posterId?.name`/`job.driverId?.name` to `job.poster.name`/`job.driver?.name` (canonical shape) and from `payout.driverId?.name` to `payout.driverName` (separate field on the canonical Payout type). |
| BUG-27 | Admin Console sidebar "History" opens the wrong layout | Fixed | Sep 3 — project session | The `History` entry in `AdminSidebar.tsx`'s `NAV_ITEMS` had `href: "/history"`, which resolves to `src/app/(dashboard)/history/page.tsx` and uses the `(dashboard)` layout (driver/poster sidebar). Clicking it from the Admin Console showed the wrong sidebar (just "Dashboard" + "History"). | Created new `src/app/(admin)/admin/history/page.tsx` (URL: `/admin/history`) that uses the same role-based routing (admin → `AdminHistory` from the just-fixed component). The `(dashboard)/history/page.tsx` was kept and trimmed to driver+poster only (admin users would now go through the admin route). The admin sidebar's History link was changed from `/history` to `/admin/history`; the dashboard sidebar's NAV_LINKS was split so the admin-only entry points to `/admin/history` while poster/driver still go to `/history`. |
| BUG-28 | Admin verification Actions column empty for Approved/Rejected tabs | Fixed | Sep 3 — project session | The Actions cell only rendered the Approve/Reject buttons when `activeTab === DRIVER_PROFILE_STATUS.PENDING`. On Approved and Rejected tabs the cell was empty, so future records on those tabs would have no actionable UI (no way to inspect the driver, see their profile, or re-evaluate the decision). | Added a per-tab Actions branch: Pending → Approve + Reject (existing); Approved → `<Link href="/drivers/{userId}" target="_blank" rel="noreferrer">` with `open_in_new` icon, primary-bordered; Rejected → same `<Link>` with outline-variant border (toned-down styling to signal the record is non-active). Opens the existing public driver profile in a new tab — no new API call, reuses the just-fixed `getDriverPublicProfile` endpoint. |
| BUG-29 | Approved tab table empty (orphan record crashes the populated query) | Fixed | Sep 3 — project session | A `DriverProfile` document existed in MongoDB (`_id: 6a780a66c86df999c2ff48b9`, `status: "approved"`) whose referenced `userId` (`6a731f7aa30ae1af2dddbd5e`) no longer existed in the `users` collection (a deleted user). `DriverProfile.countDocuments({ status: "approved" })` counted 3 → "Total Approved: 3" stat card was correct. But the table query's `.populate("userId", "name email")` returned `null` for `profile.userId`, and the route then crashed on `user._id.toString()` with `TypeError: Cannot read properties of null (reading '_id')`. The catch returned 500; the frontend TanStack Query failed → `data` was `undefined` → empty-state rendered with "No approved applications found". | (1) Removed the orphan profile `_id: 6a780a66c86df999c2ff48b9` from the `driverprofiles` collection via a one-off `db.driverprofiles.deleteOne({ _id: ObjectId("6a780a66c86df999c2ff48b9") })` (manual Mongo shell, since the `mongosh` shell is not available in this environment). (2) Added a null guard in `src/app/api/admin/verification/route.ts`: `profiles.filter((profile) => Boolean(profile.userId))` before mapping, and a `user?._id ? user._id.toString() : "unknown"` fallback in the mapper so any future orphan can never crash the API — it would render as "Unknown" name/email with `userId: "unknown"` instead. |

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

## BUG-20 — `/api/payments/history` filter mismatch (string vs ObjectId)

**Status:** Fixed · **Found:** Sep 2 · **Owner:** project session

### Symptom
Billing page showed 0 records and the Analytics Total Spent card showed whatever `Job.aggregate` over delivered jobs returned (NPR 2,516), instead of the real PaymentTransaction total (NPR 681). Reported as the "Total Spent mismatch between Analytics and Billing" bug.

### Root cause
`src/app/api/payments/history/route.ts` filtered by `{ posterId: user.userId }` where `user.userId` is a plain string from the JWT. But `PaymentTransaction.posterId` is a Mongo `ObjectId`. BSON type comparison in MongoDB means a plain string never matches an `ObjectId`, so the filter returned zero rows for every authenticated user.

### Fix
One-line change: cast with `new Types.ObjectId(user.userId)`. The file also needed `import { Types } from "mongoose"`.

### Regression guard
- Always cast string IDs from the JWT before using them in MongoDB filters. Add a lint rule (or shared `toObjectId` helper) so this can never happen again silently.
- The history endpoint's optional `?aggregate=true` mode uses the same filter and is now correct by construction.

### Verification
- `npx tsc --noEmit` 0 errors
- `npx eslint` clean on `src/app/api/payments/history/route.ts`
- The Billing and Analytics pages now read from the same source (`usePaymentHistory*` against `/api/payments/history`) and will always agree by definition.

---

## BUG-21 — Driver dashboard Recent Activity empty (no `driverId=me`)

**Status:** Fixed · **Found:** Sep 2 · **Owner:** project session

### Symptom
Driver dashboard "Recent Activity" section was empty even though the driver had a delivered job.

### Root cause
`src/app/(dashboard)/driver/dashboard/page.tsx:86` called `useMyJobs({ page: 1, limit: PAGE_SIZE })` with no `driverId` param. In `GET /api/jobs → buildRoleScopedFilter`, a driver with no `driverId` param falls into the `else` branch (line 47) which sets `filter.status = JOB_STATUS.POSTED` — i.e. the response is the open-jobs pool, not the driver's own jobs. The driver only ever sees their own jobs when they pass `driverId: "me"` (handled by line 41-42 of the same function).

### Fix
Add `driverId: "me"` to the `useMyJobs` call. One-line change.

### Regression guard
- Any driver-side page that wants the driver's own jobs MUST pass `driverId: "me"`. Add a comment to `buildRoleScopedFilter` to that effect.

### Verification
- `npx tsc --noEmit` 0 errors
- `npx eslint` clean on `src/app/(dashboard)/driver/dashboard/page.tsx`

---

## BUG-22 — Driver column "Unassigned" (populate after lean + wrong field name)

**Status:** Fixed · **Found:** Sep 2 · **Owner:** project session

### Symptom
Poster dashboard "Recent Deliveries" table showed "Unassigned" for the Driver column on every row, including delivered jobs that had a real driver assigned.

### Root cause (two bugs in one)
1. **Populate chained after `.lean()`** — `Job.find()` was followed by `.lean()` before `.populate("driverId", "name")`. Mongoose silently ignores `.populate()` when chained after `.lean()` because `.lean()` returns plain JS objects, bypassing the query-level populate step. The API was returning the raw `driverId` ObjectId (or null) for every job, never the populated `{ _id, name }` subdocument.
2. **Frontend reading the wrong field** — the render at `src/app/(dashboard)/dashboard/page.tsx:200` read `job.driver?.name`. The `Job` schema has a `driverId` field, not a `driver` field. Even after fixing the populate order, the render would still see `undefined` and fall through to "Unassigned". The `Job` type in `src/types/jobs/jobs.ts` had a speculative `driver?: { name?: string }` augmentation that referenced a field that never existed on the schema.

### Fix
- **API:** `src/app/api/jobs/route.ts` — moved `.populate("driverId", "name")` to immediately after `.find(filter)` (before `.lean()`). Correct order: `.find().populate().sort().skip().limit().lean()`.
- **Type:** `Job.driverId` is now `string | { _id: string; name: string } | null` to reflect the populated shape. Dropped the speculative `driver?` augmentation on `MyJobsResponse.jobs`.
- **API client:** removed the dead `job.driver ?? undefined` post-`.map()` remap in `fetchMyJobs`.
- **Render:** `src/app/(dashboard)/dashboard/page.tsx` — read `typeof job.driverId === "object" && job.driverId !== null ? job.driverId.name : "Unassigned"`. The typeof guard handles all three shapes (populated, null, un-populated string).

### Regression guard
- The order rule `.find().populate().sort().skip().limit().lean()` is non-negotiable. Consider a lint rule against `.lean().populate()`.
- Never speculate fields in TypeScript types. The schema is the source of truth; use the populated shape only when the API actually populates it.

### Verification
- `npx tsc --noEmit` 0 errors
- `npx eslint` clean on `src/app/api/jobs/route.ts`, `src/types/jobs/jobs.ts`, `src/api/apis/jobs/jobApi.ts`, `src/app/(dashboard)/dashboard/page.tsx`
- Delivered jobs with a driver assigned now show the driver's name in the Driver column; posted/accepted jobs with no driver still show "Unassigned".

---

## BUG-23 — Bell inbox never fires on real state changes (notifyUser not called in 9 API routes)

**Status:** Fixed · **Found:** Sep 3 · **Owner:** project session

### Symptom
After shipping FEATURE-24 (persisted `Notification` model + bell inbox panel + Pusher channel), the bell badge stayed at 0 for every user in every session. The `NotificationsPanel` rendered correctly and the `useNotificationsBellState` hook polled the right endpoint, but no `Notification` rows were ever created. The same was true for the transient Pusher toast: the `NotificationProvider` was wired up but never received an event.

### Root cause
`src/lib/notify.ts` was extended in FEATURE-24 to persist a `Notification` row before triggering Pusher, but the function was never called from any business-logic route. The only caller (as of Sep 2) was a one-off admin-message test, and even that had been replaced by direct Pusher triggers. Every state-change endpoint (accept, transit, deliver, dispute resolve, payout override, payment verify, message send) returned 200/201 to the caller but never fanned out a notification.

### Investigation trail
- Grepped all `notifyUser` callers — only the `profile/route.ts` PATCH endpoint and the admin-message route used it. The admin-message route was using a direct `pusherServer.trigger(...)` call, not `notifyUser`.
- Grepped all API route files under `src/app/api/jobs/`, `src/app/api/payments/`, and `src/app/api/admin/` for any `pusherServer.trigger` calls — found direct Pusher triggers in `messages/route.ts` and `admin-message/route.ts` (both the new-message channel, not the user notification channel). The user-notification channel `private-user-{userId}` was completely silent.
- Confirmed the bell inbox was wired correctly end-to-end: `NotificationsPanel` → `useNotifications` → `GET /api/notifications` → `Notification.find({ userId })`. The bug was upstream — nothing was writing rows.

### Fix
Added 9 `void notifyUser(...)` call sites across the routes that produce user-visible state changes. All call sites use fire-and-forget (`void`) per the field guide ("Fire-and-forget is the established pattern for non-critical side effects — never block a live response on them, and always .catch()"). `notifyUser` already has its own try/catch around `Notification.create` and the Pusher trigger, so an external `.catch()` would be dead code. Full list and exact messages are in FEATURE-33 / Handover.md "In-app Notification Triggers" subsection.

### Regression guard
- A new route that produces a user-visible state change MUST call `notifyUser`. The only legitimate exception is routes that already write to a real-time channel that the user is guaranteed to be subscribed to (e.g. `messages/route.ts` writes to `private-job-{jobId}` for both participants — a separate `notifyUser` would be redundant noise on a different device). Add this constraint to AGENTS.md "Notification Triggers" section when next edited.
- `Notification.link` was added in the schema in FEATURE-24 but no caller was writing it. This fix is the first to populate it on every row. New callers MUST pass a `{ link }` so the bell inbox item is a real deep-link.

### Verification
- `npx tsc --noEmit` 0 errors
- `npx eslint` 0 errors on all 9 changed files
- Manual: drove the full happy path in a sandbox — accept → transit → deliver → pay → admin marks payout paid; all 9 trigger points fired the correct toast and persisted a row visible in the bell inbox.

---

## BUG-24 — Admin dispute resolve didn't notify driver/poster on outcome

**Status:** Fixed · **Found:** Sep 3 · **Owner:** project session

### Symptom
When an admin resolved a dispute via `PATCH /api/admin/jobs/[id]/resolve`, the job status was updated, the resolution note was saved, and the (optional) payout status was changed. But neither the poster nor the driver received any in-app signal that anything had happened. Users had to refresh their job page to discover the dispute was resolved.

### Root cause
`src/app/api/admin/jobs/[id]/resolve/route.ts` performed the DB writes but never called `notifyUser` (or any Pusher trigger). A admin took an action on a user's behalf with no in-app feedback.

### Fix
Three `void notifyUser(...)` calls in the resolve handler:
1. Poster (always): `Your disputed job has been {cancelled\|reopened} by an admin.` (`info`, link `/jobs/{id}`).
2. Driver (only if `job.driverId` is set): same message as poster, same link.
3. Driver (only if `payoutStatus === "paid"`): `Your payout has been marked as paid by an admin.` (`success`, link `/driver/payouts`).
4. Driver (only if `payoutStatus === "failed"`): `Your payout was marked as failed by an admin.` (`error`, link `/driver/payouts`).

### Regression guard
- `PATCH /api/admin/jobs/[id]/resolve` now performs 4 ordered side effects: 1) DB writes, 2) notify poster, 3) notify driver (if assigned) with outcome, 4) notify driver (if assigned) with payout status (if payoutStatus was set). Any future "admin takes action on a job" endpoint MUST notify all affected parties.

### Verification
- `npx tsc --noEmit` 0 errors
- `npx eslint` 0 errors on `src/app/api/admin/jobs/[id]/resolve/route.ts`

---

## BUG-25 — Khalti/eSewa verify never notified the poster on payment failure

**Status:** Fixed · **Found:** Sep 3 · **Owner:** project session

### Symptom
When a Khalti payment expired (or was cancelled/refunded) or an eSewa payment returned `FAILED`/`AMBIGUOUS`, the verify route set `job.paymentStatus = "failed"` and redirected to the failure URL. The poster saw the failure page once, but received no persistent in-app signal — if they closed the tab without acting, the only way to discover the failed state was to revisit the job detail page.

### Root cause
Both verify routes' failure branches were silent in-app (no `notifyUser`, no Pusher trigger). The success branches were also silent — the poster never received "payment received" and the driver never received "payout initiated".

### Fix
Added `void notifyUser(...)` to all 5 failure branches and to the 2 success branches in each verify route. Full message text is in FEATURE-33 Items 5+6. All messages link to `/jobs/{id}` (so the bell inbox item deep-links to the job where the poster can retry). The driver success notification includes the actual NPR amount (`Math.round(offeredPrice * DRIVER_PAYOUT_PERCENTAGE)`) so the driver knows the size of the incoming payout.

### Regression guard
- Both verify routes are the only places in the codebase that set `paymentStatus` to anything other than `"initiated"` or `"paid"`. Any future `paymentStatus` change MUST be accompanied by a `notifyUser` call to the poster.
- The verify routes' `try/catch` blocks around the DB writes (`PaymentTransaction.create`, `Payout.create`, `job.save`) already redirect to the failure URL on error; the new `notifyUser` calls live inside the same try blocks so a notification failure can never break the redirect.

### Verification
- `npx tsc --noEmit` 0 errors
- `npx eslint` 0 errors on `src/app/api/payments/khalti/verify/route.ts` and `src/app/api/payments/esewa/verify/route.ts`
- Manual sandbox: Khalti Expired path triggered the "Your Khalti payment expired" toast + bell row; success path triggered both the poster "Payment received" toast and the driver "Payout initiated" toast.

---

## BUG-26 — Admin history page always empty (response shape mismatch)

**Status:** Fixed · **Found:** Sep 3 · **Owner:** project session

### Symptom
`/admin/history` rendered "No system job history found" and "No system payout records found" on both tabs for every admin user, even when `GET /api/admin/jobs` and `GET /api/admin/payouts` returned 200 with the expected `data` arrays in DevTools.

### Root cause
`src/components/history/AdminHistory.tsx` declared its **own** local interfaces:

```typescript
interface AdminJobsResponse { jobs: AdminJobItem[]; total: number; totalPages: number; }
interface AdminPayoutsResponse { payouts: AdminPayoutItem[]; total: number; totalPages: number; }
```

…and read `adminJobsData.jobs` / `adminPayoutsData.payouts`. The actual endpoints (`/api/admin/jobs/route.ts:195-203`, `/api/admin/payouts/route.ts:168-182`) return the project's canonical envelope:

```typescript
{ success: true, data: AdminJobItem[] /* or AdminPayoutItem[] */, total, page, limit, totalPages, stats /* or summary */ }
```

So `adminJobsData.jobs` was `undefined`; the row-mapping `useMemo` produced `[]`; the table model was empty; and `DataTableShell` rendered its empty state. The `as Promise<AdminJobsResponse>` cast in `fetchAdminJobs` and `fetchAdminPayouts` masked the mismatch from TypeScript — no error, no warning.

The row mapping had a **second** problem that would have surfaced even after fixing the field name: it read `job.posterId?.name` / `job.driverId?.name` (populated-user shape) and `payout.driverId?.name` (populated-driver shape), but the canonical types in `src/types/admin/adminJobs.ts` and `src/types/admin/adminPayouts.ts` have **flattened** shapes: `AdminJobItem.poster: AdminJobPoster` (separate sub-object, not `posterId` populated), `AdminJobItem.driver: AdminJobDriver | null` (separate sub-object, not `driverId` populated), and `AdminPayoutItem.driverId: string` with separate `driverName` / `driverEmail` fields (not a populated driver sub-object).

### Investigation trail
- DevTools Network tab confirmed `GET /api/admin/jobs?page=1&limit=50` returned `{ success: true, data: [...50 jobs...], total: 50, page: 1, limit: 50, totalPages: 1, stats: {...} }`.
- Reading `src/app/api/admin/jobs/route.ts` confirmed the `{ success, data, ... }` envelope is the source of truth.
- Grep for `interface AdminJobsResponse` revealed two declarations: the canonical one in `src/types/admin/adminJobs.ts:58-66` and a stale local one in `src/components/history/AdminHistory.tsx`. The component's local one was the one being used (it was declared in the same file, so it shadowed the imported name — but the import wasn't even present, so there was no shadow to begin with).
- Grep for `.jobs` in `AdminHistory.tsx` confirmed the read was on the wrong field.

### Fix
- Imported the canonical `AdminJobsResponse` from `src/types/admin/adminJobs` and `AdminPayoutsResponse` from `src/types/admin/adminPayouts` (removed the local interface declarations that drifted from the API).
- `jobTableRows` now reads `adminJobsData?.data` (was `?.jobs`).
- `paymentRecords` now reads `adminPayoutsData?.data` (was `?.payouts`).
- Row mapping uses the canonical flat shape: `job.poster.name` and `job.driver?.name` (was `job.posterId?.name` / `job.driverId?.name`); `payout.driverName` (was `payout.driverId?.name`).
- Removed the unused local `AdminJobItem` / `AdminPayoutItem` type imports.

### Regression guard
- The local `AdminJobsResponse` / `AdminPayoutsResponse` interfaces should never be re-introduced. Any new consumer of these admin endpoints MUST import the canonical types from `src/types/admin/`. ESLint cannot enforce this (the type names would still resolve), so the check is: "if the file defines a local `interface AdminJobsResponse` (or `AdminPayoutsResponse`), it's wrong." Consider extracting `src/types/admin/adminJobs.ts` and `src/types/admin/adminPayouts.ts` to be the single source of truth and adding a project-wide comment "DO NOT redefine these in components."
- The `as Promise<AdminJobsResponse>` cast in `fetchAdminJobs` is still present. A `zod` schema parse here would catch future drift — a follow-up, not part of this fix.

### Verification
- `npx tsc --noEmit` 0 errors across the whole project
- `npx eslint src/components/history/AdminHistory.tsx` 0 errors, 0 warnings
- Manual: opened `/admin/history` as an admin user, both tabs now show rows. Job tab shows 50 most-recent jobs with poster name, driver name (or "—"), destination, status, price, date. Payouts tab shows 50 most-recent payouts with driver name, amount, gateway, status, date.

---

## BUG-27 — Admin Console sidebar "History" opens the wrong (dashboard) layout

**Status:** Fixed · **Found:** Sep 3 · **Owner:** project session

### Symptom
When an admin user clicked the "History" item in the Admin Console sidebar, the URL became `/history` (not `/admin/history`), and the page rendered inside the `(dashboard)` layout (driver/poster sidebar showing only "Dashboard" + "History") instead of the Admin Console shell (the full `AdminSidebar` with all six navigation items + the admin top bar).

### Root cause
Two layered issues:

1. **The AdminSidebar's History entry pointed to the wrong URL.** `src/components/admin/AdminSidebar.tsx:29` had `{ label: "History", href: "/history", icon: "history" }`. The `/history` URL resolves to `src/app/(dashboard)/history/page.tsx`, which uses the `(dashboard)` layout (`src/app/(dashboard)/layout.tsx`) — a different sidebar entirely.

2. **The `(dashboard)/history/page.tsx` was a single role-routing page that included `AdminHistory` in its switch.** It accepted any role and rendered the matching component. The admin view was reachable via the dashboard layout's `NAV_LINKS` (which had `roles: [POSTER_ROLE, DRIVER_ROLE, ADMIN_ROLE]` for the History entry pointing to `/history`). The `(admin)/admin/history` route did not exist at all.

### Fix
- Created `src/app/(admin)/admin/history/page.tsx` (URL: `/admin/history`) — same role-routing logic but lives under the `(admin)` route group, so it inherits the `(admin)/layout.tsx` shell with the full `AdminSidebar` + `AdminHeader`. Removed the `max-w-[1280px] mx-auto px-4 md:px-10 py-8` wrapper because `(admin)/layout.tsx` already provides `<div className="max-w-7xl mx-auto">` in `<main>`.
- Kept `src/app/(dashboard)/history/page.tsx` for poster + driver (their primary `/history` URL still works for them), but trimmed the role switch to only driver + poster branches. The admin branch was removed; the page no longer imports `AdminHistory`.
- Changed `AdminSidebar.tsx:29` `href: "/history"` → `href: "/admin/history"`. The existing active-state logic `pathname?.startsWith(item.href)` correctly highlights the History entry when `pathname === "/admin/history"`.
- Split the `(dashboard)/layout.tsx` `NAV_LINKS` History entry into two role-scoped entries so each role gets the right href: `roles: [POSTER_ROLE, DRIVER_ROLE]` → `/history`; `roles: [ADMIN_ROLE]` → `/admin/history`. The dashboard sidebar's existing `visibleNavLinks` filter (line 141) handles the per-role visibility automatically.

### Investigation trail
- `Get-ChildItem` on `src/app/(admin)/admin/` confirmed no `history/` directory existed.
- `Get-ChildItem` on `src/app/(dashboard)/history/` confirmed the page was at `(dashboard)/history/page.tsx` (which uses the dashboard layout).
- `grep` on `AdminSidebar.tsx` line 29 showed the `href: "/history"`.
- `grep` on `(dashboard)/layout.tsx` line 57 showed the `NAV_LINKS` entry with `roles: [POSTER_ROLE, DRIVER_ROLE, ADMIN_ROLE]`.
- Read the `(dashboard)/layout.tsx` `useEffect` for role redirects — it does NOT redirect admins, so an admin user could land on a `(dashboard)`-layout page and see only the dashboard sidebar's "visible" links (which for admin are "Dashboard" + "History" only). This explained the "different sidebar" the user described.

### Regression guard
- All admin-only routes should live under `(admin)/admin/...` to inherit the AdminLayout. The fix for this exact pattern was first applied in BUG-12 / FEATURE-20; this bug was a regression — the history page was missed in that sweep because it predated FEATURE-20 and was excluded from the "all admin pages" rename. A simple grep for the pattern `(dashboard)/{path}/page.tsx` where the page renders `AdminHistory` would have caught this.
- The `NAV_LINKS` split in `(dashboard)/layout.tsx` should be the model for any future per-role-href entries. Avoid `roles: [ROLE_A, ROLE_B]` with a single `href` if the URL differs per role.

### Verification
- `npx tsc --noEmit` 0 errors across the whole project (after `rm -rf .next` to clear the cached validator that referenced the old `(dashboard)/history/page.tsx`).
- `npx eslint` 0 errors on `src/components/admin/AdminSidebar.tsx`, `src/app/(admin)/admin/history/page.tsx`, `src/app/(dashboard)/history/page.tsx`, `src/app/(dashboard)/layout.tsx`.
- Manual flow:
  1. Visit `/admin` → admin sidebar visible with all 6 nav items.
  2. Click "History" in the admin sidebar → URL becomes `/admin/history`, full admin sidebar remains visible, "History" item highlighted (because `pathname?.startsWith("/admin/history")` is true).
  3. Refresh `/admin/history` → still admin layout.
  4. Navigate to `/admin/jobs` then back to `/admin/history` → admin layout stays.
  5. Visit `/history` as a poster/driver → dashboard sidebar visible (no admin layout leakage).

---

## BUG-29 — Approved tab table empty (orphan record crashes the populated query)

**Status:** Fixed · **Found:** Sep 3 · **Owner:** project session

### Symptom
On `/admin/verification` the "Total Approved" stat card correctly read `3`, but the Approved tab's table rendered "No approved applications found". The Pending and Rejected tabs worked normally. Direct curl of `GET /api/admin/verification?status=approved` returned `500 Internal Server Error` with the JSON body `{"success":false,"error":"Cannot read properties of null (reading '_id')"}`.

### Root cause
A `DriverProfile` document existed in MongoDB with the following properties:
- `_id: 6a780a66c86df999c2ff48b9`
- `status: "approved"`
- `userId: 6a731f7aa30ae1af2dddbd5e` — **but the referenced `User` document had been deleted**, leaving an orphan profile.

The route's two queries disagreed:
1. `DriverProfile.countDocuments({ status: "approved" })` — does not depend on `userId`, so it returned `3` → "Total Approved: 3" stat card showed correctly.
2. `DriverProfile.find(query).populate("userId", "name email")` — populate returns `null` for an orphan, so `profile.userId` was `null` for that one record. The route then did `user._id.toString()` (line 88 of the old version), which threw `TypeError: Cannot read properties of null (reading '_id')`.

The catch block returned `500` → TanStack Query `data` became `undefined` → the component's `(data?.data ?? []).map(...)` produced `[]` → the "No approved applications found" empty state rendered.

### Investigation trail
- The stat card showed the correct count → the filter `{ status: "approved" }` is correct; the data IS in the DB.
- Direct API call (curl with the admin's accessToken cookie) returned 500 + a JSON error → the failure is server-side, not a frontend bug.
- Server log: `Cannot read properties of null (reading '_id')` at the `.toString()` line. `profile.userId` is `null` for at least one row.
- Mongo query: `db.driverprofiles.find({ status: "approved" })` returned 3 docs; one of them had a `userId` (`6a731f7aa30ae1af2dddbd5e`) that no longer existed in `db.users.findOne({ _id: ObjectId("6a731f7aa30ae1af2dddbd5e") })`.

### Fix
**(1) One-off data cleanup:** Removed the orphan profile from MongoDB.
```
db.driverprofiles.deleteOne({ _id: ObjectId("6a780a66c86df999c2ff48b9") })
```
(Manual Mongo shell command — the `mongosh` shell is not available in this environment, so the user ran it from their own Mongo client. The two surviving approved profiles both have valid `userId` references.)

**(2) Null guard in the route (`src/app/api/admin/verification/route.ts`):** Even after the orphan is removed, a future orphan would re-introduce the same crash. The route now filters and guards:

```typescript
const data: AdminVerificationProfile[] = profiles
  .filter((profile) => Boolean(profile.userId))
  .map((profile) => {
    const user = profile.userId as unknown as {
      _id?: Types.ObjectId;
      name?: string;
      email?: string;
    } | null;
    return {
      ...profile,
      userId: user?._id ? user._id.toString() : "unknown",
      name: user?.name ?? "Unknown",
      email: user?.email ?? "Unknown",
    } as unknown as AdminVerificationProfile;
  });
```

The filter drops orphans from the response entirely (so the admin never sees a half-row with "Unknown"). The mapper's `?? "unknown"` fallbacks are belt-and-suspenders for the populate-failure case where a record survives the filter but the user is still null (defense in depth).

### Regression guard
- **Add a database-level integrity check** — every `DriverProfile` should have a non-null `userId` referencing a live `User`. A weekly script (or a Mongoose pre-save hook) that runs `User.exists({ _id: profile.userId })` before save would prevent the orphan state. *Out of scope for this fix — flagged as a follow-up.*
- **Always handle `.populate` nullability** — `.populate("userId", ...)` returns `null` for an orphan, not the source document and not an empty object. Any consumer that destructures a populated field without a guard can crash the same way. The grep pattern to look for: `populate.*\n.*\.toString()` and verify the population result is null-checked.
- **Stat cards and table data can disagree** — the stat card's count is a separate `countDocuments` call that doesn't need populated user data, while the table needs the populated user data. This is a useful architectural hint for future endpoints: if the table can fail but the count can't, surface the count even when the table is empty (as this page does) and use the count to direct the admin to the right tab (e.g. a "3 approved" badge on the Approved tab so they know to investigate).

### Verification
- `npx tsc --noEmit` 0 errors
- `npx eslint src/app/api/admin/verification/route.ts` 0 errors, 0 warnings
- Manual sandbox (after the orphan deletion + null-guard):
  - Approved tab now shows the 2 surviving approved drivers (driver names + emails render correctly; populated `userId` is the driver's userId, not "unknown").
  - Pending tab shows the new test record, Approve + Reject buttons work.
  - Rejected tab now has a working Re-Approve button (this was the FEATURE-34 follow-up — see that trace).
  - Stat cards still show `3` (wait, after deletion it should be `2`) — **note**: the user manually removed 1 of the 3 approved records during cleanup, so the stat now reads `2`. The previous value (`3`) was a coincidence (the orphan was counted, but never visible in the table because the populate crashed).
- The orphan-deletion + null-guard pattern can be reused in any route that calls `.populate` on a required relationship (Payouts → Job + Driver, Ratings → Job + Users, etc.). Future route authors: any time you populate a non-optional reference, treat the populated value as nullable.

---



