# Feature.md — Trace Every Feature Start to Finish

> Every feature gets a trace from the request that started it to the verification that ended it. The trace is the proof that the feature was designed, not stumbled into.

---

## The Feature Trace Format (copy this block for each feature)

```markdown
## FEATURE-<NN> — <short title>

**Requested:** <date> · **Requested by:** <who>
**Status:** <Planned | In progress | Shipped | Blocked>
**Scope:** <one line — what it does, what it deliberately does NOT do>

### Why (intent)
The problem this solves and for whom. If you can't write this, you don't understand the feature yet.

### Design
- Data model changes (if any)
- API changes (routes/methods/payloads)
- UI components involved
- Real-time events (if any)
- Decisions made during design → link to `Decisions.md` (e.g. D-22)

### Implementation trail
- What was built, in what order
- Files created/modified
- What was tried and discarded, and why

### Verification
Rows from `TestChecklist.md` that were run + actual results.

### Follow-ups
Known gaps, future enhancements, things deliberately left out.
```

---

## Feature Log

| ID | Title | Status | Requested | Shipped in |
| --- | --- | --- | --- | --- |
| FEATURE-13 | Poster sidebar pages: History, Analytics, Billing, Tracking | Shipped | Aug 27 | fix/poster-consistent-layout |
| FEATURE-12 | Dispute Flag Button & Driver Activity Dashboard | Shipped | Aug 24 | Post-v1 |
| FEATURE-11 | Admin Payout Management Queue | Shipped | Aug 20 | Day 62 |
| FEATURE-10 | Poster Activity Dashboard | Shipped | Aug 20 | Day 61 |
| FEATURE-09 | Admin Analytics Dashboard UI + API | Shipped | Aug 18 | Day 58 |
| FEATURE-08 | Dispute Flag + Resolution UI + API | Shipped | Aug 18 | Day 56 |
| FEATURE-07 | Admin User Management UI + API | Shipped | Aug 18 | Day 55 |
| FEATURE-06 | Admin Job Management UI + API | Shipped | Aug 18 | Day 54 |
| FEATURE-05 | Driver Earnings Dashboard UI (Phase 7 Days 51–52) | Shipped | Aug 18 | Days 51–52 |
| FEATURE-04 | 404 Not Found & Error Boundary UI Pages | Shipped | Aug 17 | Days 51–52 |
| FEATURE-03 | Earnings aggregation pipeline + driver earnings endpoint | Shipped | Phase 7 Days 49–50 | Days 49–50 |
| FEATURE-01 | Read receipts + unread badges + off-screen message toasts | Shipped | Aug 13 | Days 35–37 |
| FEATURE-02 | Nepal payment pipeline: Khalti + eSewa, idempotent verify, payout status UI | Shipped | build plan Days 38-48 | Days 38-48 |

---

## FEATURE-04 — 404 Not Found & Error Boundary UI Pages

**Requested:** Aug 17 | **Requested by:** Stitch design reference
**Status:** Shipped
**Scope:** Root App Router 404 page (`src/app/not-found.tsx`), root client error boundary (`src/app/error.tsx`), and root shell fallback (`src/app/global-error.tsx`) matching design references in `design-reference/404-not-found.md` and `design-reference/error-boundary.md`.

### Why (intent)
Provide branded, friendly, and responsive 404 and error recovery screens when users navigate to broken routes or encounter unexpected client rendering exceptions.

### Design
- `src/app/not-found.tsx`: Visual anchor with animated logistics icons, primary "Back to Dashboard", secondary "Contact Support", quick links grid.
- `src/app/error.tsx`: Centered error state with `cloud_off` animated icon, "Refresh Page" (calls `reset()`), "Contact Support", 3 helpful information cards.
- `src/app/global-error.tsx`: Root HTML/body error boundary for shell rendering failures.

### Implementation trail
1. `src/app/not-found.tsx` created matching 404 design specs.
2. `src/app/error.tsx` created matching error boundary specs.
3. `src/app/global-error.tsx` created with fallback root markup.

### Verification
- Production build verified (`npm run build`). All pages generated and typechecked cleanly.


---

## FEATURE-06 — Admin Job Management UI + API (Day 54)

**Requested:** Aug 18 | **Requested by:** Admin panel build plan
**Status:** Shipped
**Scope:** Admin job management page at `/(admin)/admin/jobs` with stat cards, filter tabs, search, paginated table, and status override modal. Includes new API routes for listing jobs and overriding job status. Deliberately does NOT modify the existing job lifecycle endpoints or the Payout model.

### Why (intent)
Admins need a centralized view of all platform jobs with the ability to intervene on disputed or stuck jobs. The page must surface key metrics, support filtered navigation, and record an audit trail when statuses are overridden.

### Design
- `src/types/admin/adminJobs.ts` — `AdminJobItem`, `AdminJobsResponse`, `AdminJobsQueryParams`, `AllowedOverrideStatus`, `StatusOverrideInput`.
- `src/api/apis/admin/adminJobsApi.ts` — `getAdminJobs(params)` and `overrideJobStatus(jobId, data)`.
- `src/api/hooks/admin/adminJobsApi.ts` — `useAdminJobs()` and `useOverrideJobStatus()`.
- `src/components/admin/StatusOverrideModal.tsx` — modal with status dropdown, reason field, irreversible-action warning.
- `src/app/(admin)/admin/jobs/page.tsx` — stat cards, filter tabs (`all`, `in_transit`, `disputed`, `cancelled`, `posted`), debounced search, paginated table, override action.
- `GET /api/admin/jobs` — paginated, filterable by status and search term.
- `PATCH /api/admin/jobs/:id/status` — override status with reason, admin-guarded.
- `src/types/job.ts` — Added `DISPUTED` to `JOB_STATUS` enum.
- `src/utils/format.ts` — Added `formatNpr()` and `formatShortDate()`.

### Implementation trail
1. Created PLMS layers: types → apis → hooks → components → page.
2. Added `DISPUTED` to `JOB_STATUS` enum and replaced magic string in the override route.
3. Built `StatusOverrideModal` with confirmation flow and audit warning.

### Verification
- `npm run build` — exit code 0, all routes compiled, type-check clean.

### Follow-ups
- Wire the override mutation to invalidate the admin jobs query on success (already implemented via `useOverrideJobStatus`).
- Add CSV export for job records (UI button present, toast-only placeholder).

---

## FEATURE-07 — Admin User Management UI + API (Day 55)

**Requested:** Aug 18 | **Requested by:** Admin panel build plan
**Status:** Shipped
**Scope:** Admin user management page at `/(admin)/admin/users` with role tabs, status dropdown, search, paginated table, and user action modal (details/suspend/role-change). Includes three new API routes for user listing, suspension toggle, and role changes. Deliberately does NOT modify auth middleware or the User model beyond adding `updatedAt` to the TypeScript interface.

### Why (intent)
Admins need to manage platform users — view all users, filter by role/status, search by name/email, suspend abusive accounts, and reassign roles (poster ↔ driver) without touching the database directly.

### Design
- `src/types/admin/adminUsers.ts` — `AdminUserItem`, `AdminUsersResponse`, `AdminUserRoleFilter`, `AdminUserStatusFilter`.
- `src/api/apis/admin/adminUsersApi.ts` — `getAdminUsers()`, `toggleSuspendUser()`, `changeUserRole()`.
- `src/api/hooks/admin/adminUsersApi.ts` — `useAdminUsers()`, `useToggleSuspendUser()`, `useChangeUserRole()`.
- `src/components/admin/UserActionModal.tsx` — modal with three modes: `details`, `suspend`, `role`.
- `src/app/(admin)/admin/users/page.tsx` — role tabs, status dropdown, debounced search, paginated table, CSV export button.
- `GET /api/admin/users` — paginated, filterable by role/status, searchable by name/email.
- `PATCH /api/admin/users/:id/suspend` — toggle `isActive`.
- `PATCH /api/admin/users/:id/role` — change role between `poster` and `driver`.
- `src/models/User.ts` — Added `updatedAt: Date` to `IUser` interface.

### Implementation trail
1. Created PLMS layers: types → apis → hooks → components → page.
2. Built three admin API routes with `withRole(["admin"])` guards and structured query params.
3. Implemented `UserActionModal` with confirmation flow for suspend and role-change actions.
4. Added `updatedAt: Date` to `IUser` to align the TypeScript interface with Mongoose `timestamps: true`.

### Verification
- `npm run build` — exit code 0, all 42 pages generated, type-check clean.

### Follow-ups
- Add email notification when a user is suspended or their role is changed.
- Restrict role changes so admins cannot demote other admins (currently only poster ↔ driver is allowed).

---

## FEATURE-08 — Dispute Flag + Resolution UI + API (Day 56)

**Requested:** Aug 18 | **Requested by:** Phase 8 build plan
**Status:** Shipped
**Scope:** Participant-only dispute flagging on job detail page, admin dispute queue with resolve modal, evidence image upload via Cloudinary, real chat transcript fetching, and real delivery timeline from lifecycle timestamps. Includes four API routes for flagging, uploading evidence, listing, and resolving disputes. Deliberately does NOT modify auth middleware, payment routes, or Pusher helper.

### Why (intent)
Participants (poster/driver) need a way to flag delivery disputes for admin review with supporting evidence. Admins need a centralized queue to review flagged jobs, inspect uploaded evidence images, read the real chat transcript, see the actual delivery timeline, and resolve them by reopening or cancelling the job, with an optional payout status update.

### Design
- `src/models/Job.ts` — Added `disputeReason`, `flaggedBy`, `resolutionNote`, `evidenceImages: string[]`, `acceptedAt`, `inTransitAt`, `deliveredAt`, `disputedAt`.
- `src/types/admin/adminDisputes.ts` — `DisputedJobItem` (includes `evidenceImages`, lifecycle timestamps), `DisputesResponse`, `ResolveJobInput`, `ResolveJobResponse`.
- `src/api/apis/admin/adminDisputesApi.ts` — `getAdminDisputes()`, `resolveJobDispute()`.
- `src/api/hooks/admin/adminDisputesApi.ts` — `useAdminDisputes()`, `useResolveJobDispute()`.
- `src/components/admin/ResolveDisputeModal.tsx` — resolve modal with `resolvedStatus` dropdown, note textarea, payout status selector.
- `src/app/(admin)/admin/disputes/page.tsx` — dispute queue table with search, pagination, resolve action. Detail panel includes:
  - Evidence Image Grid rendered from real `evidenceImages` URLs (Cloudinary, via `next/image`).
  - Chat Transcript Snippet fetched from `GET /api/jobs/:id/messages` in real time.
  - Delivery Timeline built from real `acceptedAt` → `inTransitAt` → `deliveredAt` → `disputedAt` timestamps.
- `src/app/(main)/jobs/[id]/page.tsx` — participant-only flag button with confirmation modal for `accepted`/`in_transit`/`delivered` jobs.
- `POST /api/jobs/:id/dispute` — participant-only, sets status to `disputed`, stores reason + flaggedBy + disputedAt, triggers Pusher.
- `POST /api/jobs/:id/evidence` — participant-only, accepts `multipart/form-data` image uploads, uploads to Cloudinary `dispute-evidence/{jobId}` folder, appends URLs to Job `evidenceImages`.
- `GET /api/admin/disputes` — admin-only, paginated disputed jobs with populated poster/driver info, evidence images, and lifecycle timestamps.
- `PATCH /api/admin/jobs/:id/resolve` — admin-only, resolves to `posted`/`cancelled`, saves note, optional payout update.

### Implementation trail
1. Added dispute fields and lifecycle timestamps to Job schema + `IJob` interface.
2. Updated accept/transit/deliver/dispute routes to populate timestamps atomically.
3. Created PLMS layers: types → apis → hooks → components → page.
4. Built evidence upload endpoint with Cloudinary integration.
5. Built four API routes with proper auth guards (`withAuth` for participants, `withRole(["admin"])` for admin routes).
6. Added flag button + confirmation modal to job detail page.
7. Built admin dispute queue table + resolve modal + real evidence/chat/timeline panels.

### Verification
- `npx tsc --noEmit` — 0 errors.
- `npx eslint` on all changed files — 0 errors.
- `npm run build` — exit code 0.

### Follow-ups
- Wire the evidence upload UI to the job detail page (endpoint exists, participant UI not yet wired).
- Add dispute status filter tabs (All / Under Review / Pending Info).

---

## FEATURE-09 — Admin Analytics Dashboard UI + API (Days 57–58)

**Requested:** Aug 18 | **Requested by:** Phase 8 build plan
**Status:** Shipped
**Scope:** Analytics aggregation endpoint (`GET /api/admin/analytics`) returning 30-day jobs-per-day trend, total GMV, and active driver count. Admin analytics dashboard page with KPI cards and Recharts BarChart. Deliberately does NOT modify existing admin pages or auth files.

### Why (intent)
Admins need a single-page overview of platform health: delivery volume over time, total revenue from completed jobs, and how many drivers are currently approved and active.

### Design
- `src/types/admin/adminAnalytics.ts` — `JobsPerDayItem`, `AdminAnalyticsResponse`.
- `src/app/api/admin/analytics/route.ts` — `GET /api/admin/analytics`. Uses `$dateTrunc` daily bucketing for last 30 days, `$sum` of `offeredPrice` for GMV on delivered jobs, `countDocuments` for approved drivers.
- `src/api/apis/admin/adminAnalyticsApi.ts` — `getAdminAnalytics()`.
- `src/api/hooks/admin/adminAnalyticsApi.ts` — `useAdminAnalytics()` with 30s staleTime and 60s refetchInterval.
- `src/app/(admin)/admin/analytics/page.tsx` — three KPI cards (GMV, active drivers, total jobs 30d) + Recharts BarChart for daily job volume.

### Implementation trail
1. Created analytics types and API route with three parallel aggregations.
2. Built plain async fetcher and TanStack Query hook.
3. Created analytics dashboard page with KPI cards and BarChart, matching existing admin design tokens.

### Verification
- `npx tsc --noEmit` — 0 errors.
- `npx eslint` on all changed files — 0 errors.
- `npm run build` — exit code 0.

### Follow-ups
- Add GMV trend line (daily GMV, not just count).
- Add platform revenue breakdown by payment method (eSewa/Khalti).
- Add CSV export for analytics data.

---

## FEATURE-10 — Poster Activity Dashboard (Day 61)

**Requested:** Aug 20 | **Requested by:** Post-v1 poster dashboard build plan
**Status:** Shipped
**Scope:** Unified `/dashboard` entry point with RBAC. Poster role sees a dashboard with four summary cards (Active Jobs, Pending Acceptance, Completed Jobs, Total Spent) derived from Job aggregation, plus a Recent Deliveries table (real job data via `useMyJobs`), Quick Actions sidebar, and Efficiency Score card. Admin is redirected to `/admin`, driver to `/driver/earnings`.

### Why (intent)
Posters need a single-page overview of their delivery activity: how many jobs are in flight, waiting for drivers, completed, and how much they have spent on completed deliveries. All numbers must be derived from real Job data, not mocked. The dashboard must also serve as a role-aware entry point so users land on the right experience for their role.

### Design
- `src/types/poster/posterDashboard.ts` — `PosterSummaryStats`, `PosterSummaryData`, `PosterSummaryResponse`.
- `src/app/api/posters/[id]/summary/route.ts` — `GET /api/posters/:id/summary`. Aggregates Job counts by status group (active = accepted + in_transit, pending = posted, completed = delivered, cancelled) and sums `offeredPrice` for `DELIVERED` jobs only into `totalSpent`. Restricted to poster themselves or admin role.
- `src/api/apis/posters/posterDashboardApi.ts` — `getPosterSummary(posterId)`.
- `src/api/hooks/posters/posterDashboardApi.ts` — `usePosterSummary(posterId)` with 30s staleTime.
- `src/app/(dashboard)/dashboard/page.tsx` — unified dashboard page with `useAuthGuard` + `useEffect` role redirects. Poster content includes four summary cards, Recent Deliveries table populated via `useMyJobs` (existing `GET /api/jobs` endpoint), Quick Actions, and Efficiency Score.
- `src/api/apis/jobs/jobApi.ts` — Added `fetchMyJobs(query)` calling existing role-scoped `GET /api/jobs`.
- `src/api/hooks/jobs/jobsApi.ts` — Added `useMyJobs(query)` hook.
- `src/types/jobs/jobs.ts` — Added `MyJobsResponse` type.

### Implementation trail
1. Created PLMS layers: types → api → hooks → page.
2. Built `GET /api/posters/:id/summary` with `countDocuments` + `$group` aggregation.
3. Built unified `/dashboard` page with `useAuthGuard` role redirect (admin → `/admin`, driver → `/driver/earnings`).
4. Wired Recent Deliveries table to `useMyJobs` (existing jobs endpoint, poster-scoped).
5. Fixed Total Spent subtitle contrast (`text-surface-white/80` on `bg-primary`).

### Verification
- `npx tsc --noEmit` — 0 errors.
- `npx eslint` on all changed files — 0 errors.
- `npm run build` — exit code 0, 49 pages generated.

### Follow-ups
- Add pagination to Recent Deliveries table.
- Add date-range filter for deliveries.

---

## FEATURE-11 — Admin Payout Management Queue (Day 62)

**Requested:** Aug 20 | **Requested by:** Post-v1 admin payout queue build plan
**Status:** Shipped
**Scope:** Admin-only payout management page at `/(admin)/admin/payouts` with paginated table, status filter, summary cards, and manual override action for pending payouts. Includes GET list endpoint and PATCH override endpoint. Deliberately does NOT modify the Payout model schema.

### Why (intent)
Admins need a centralized queue to review all driver payout records, see driver info and linked jobs, filter by status, and manually override pending payouts to paid or failed with an audit note.

### Design
- `src/types/admin/adminPayouts.ts` — `AdminPayoutItem`, `AdminPayoutsQuery`, `AdminPayoutsResponse`, `PayoutOverrideInput`, `PayoutOverrideResponse`.
- `src/app/api/admin/payouts/route.ts` — `GET /api/admin/payouts`. Admin-only; paginated, filterable by `status` and `driverId`, populated with driver name/email and linked job ID.
- `src/app/api/admin/payouts/[id]/route.ts` — `PATCH /api/admin/payouts/:id`. Admin-only; accepts `{ status: "paid" | "failed", note: string }`. Only allowed when current status is `pending`. Saves `note` on the Payout document.
- `src/api/apis/admin/adminPayoutsApi.ts` — `getAdminPayouts(query)`, `overridePayoutStatus(id, data)`.
- `src/api/hooks/admin/adminPayoutsApi.ts` — `useAdminPayouts(query)`, `useOverridePayoutStatus()`.
- `src/components/admin/PayoutOverrideModal.tsx` — modal with status dropdown and admin note textarea.
- `src/app/(admin)/admin/payouts/page.tsx` — admin payout queue with summary cards (Pending total, Paid count, Failed count), status filter dropdown, paginated table (Date, Driver, Job ID, Gateway, Amount, Status, Actions), and override action on pending rows.
- `src/components/admin/AdminSidebar.tsx` — Added "Payout Management" nav link.

### Implementation trail
1. Created PLMS layers: types → apis → hooks → components → page.
2. Built GET endpoint with populate driver + job, pagination, and status/driverId filters.
3. Built PATCH endpoint with pending-only guard and note persistence.
4. Built `PayoutOverrideModal` with confirmation flow.
5. Wired override mutation to invalidate `adminPayouts` query on success.

### Verification
- `npx tsc --noEmit` — 0 errors.
- `npx eslint` on all changed files — 0 errors.
- `npm run build` — exit code 0, 49 pages generated.

### Follow-ups
- Add CSV export for payout records.
- Add date-range filter.
- Add driver name search.

---

## FEATURE-12 — Dispute Flag Button & Driver Activity Dashboard

**Requested:** Aug 24 | **Requested by:** Build Plan / User Request
**Status:** Shipped
**Scope:** Participant-facing dispute flag button on poster and driver job detail pages (`accepted`, `in_transit`, `delivered` statuses only; participant-gated, min 10 chars reason validation, error banner inside modal); `GET /api/drivers/:id/summary` endpoint returning driver stats (active count, monthly count, total completed, total earned NPR for DELIVERED jobs only, rating avg/count, profile status); driver activity dashboard page at `/driver/dashboard` matching design specs.

### Why (intent)
Participants need a direct way to flag active/delivered job disputes for admin review from their job detail view. Drivers need a dedicated activity dashboard summarizing active deliveries, monthly progress, lifetime completed count, earnings, ratings, and recent activity.

### Design
- `src/types/drivers/driverDashboard.ts` — `DriverSummaryStats`, `DriverSummaryResponse`.
- `src/app/api/drivers/[id]/summary/route.ts` — `GET /api/drivers/:id/summary`. Authenticated & restricted to driver or admin.
- `src/api/apis/drivers/driverDashboardApi.ts` — `fetchDriverSummary(driverId)`.
- `src/api/hooks/drivers/driverDashboardApi.ts` — `useDriverSummary(driverId)` with 30s staleTime.
- `src/app/(dashboard)/driver/dashboard/page.tsx` — Driver activity dashboard with RBAC protection, 6 summary cards, and Recent Activity table.
- `src/app/(main)/jobs/[id]/dispute/page.tsx` — Dedicated 3-step Dispute Reporting page (`Report a Dispute - Unified Style`) matching `design-reference/dispute-flag-dialog.md` specs.
- `src/app/(main)/disputes/page.tsx` — User-facing Disputes page (`/disputes`) listing flagged jobs under admin review with empty state and direct detail links.
- `src/app/(dashboard)/layout.tsx` & `src/components/layout/Header.tsx` — Added prominent **"Disputes"** navigation link with `gavel` icon.

### Implementation trail
1. Fetched Stitch design specs for dispute flag dialog and driver dashboard into `design-reference/`.
2. Created PLMS layers for driver dashboard: types → apis → hooks → route → page.
3. Updated `src/app/(main)/jobs/[id]/page.tsx` with participant check, admin hide guard, status restriction (`accepted`, `in_transit`, `delivered`), 10-char reason validation, and inline error banner in modal.
4. Created route aliases `/poster/jobs/[id]` and `/driver/jobs/[id]`.
5. Updated `/dashboard` redirect so drivers land on `/driver/dashboard`.
6. Ran full Next.js build verification (`npm run build`).

### Verification
- `npm run build` — exit code 0, 50 pages generated, 0 TypeScript errors.

---

---

## FEATURE-03 — Earnings aggregation pipeline + driver earnings endpoint

**Requested:** Aug 17 | **Requested by:** Phase 7 Days 49–50
**Status:** Shipped
**Scope:** Backend-only earnings pipeline over the `Payout` model: weekly (8w), monthly (12m), and all-time aggregates using Mongoose aggregation with `$dateTrunc` bucketing, plus `GET /api/drivers/[id]/earnings?range=week|month|all-time` (owner-or-admin gated). Deliberately does NOT include any UI, does NOT touch payment/payout files, and does NOT modify the Payout schema.

### Why (intent)
Drivers need to see how much they earned per week/month over time from their paid payouts — without the client summing raw payout records. The aggregation must be correct (only `paid` payouts, correctly bucketed by calendar week/month) and the endpoint must never leak one driver's earnings to another.

### Design
- `src/types/payout/earnings.ts` — `EarningsRange`, `EarningsBucket`, `EarningsSummary`, `EarningsBreakdownItem`, `EarningsResponse`. One source of truth per concept (PLMS types layer).
- `src/lib/earnings.ts` — shared internal pipeline `getEarningsByPeriod(driverId, unit, periodFormat, startDate?)`: `$match { driverId: ObjectId, status: "paid", createdAt ≥ startDate? }` → `$group` `_id = $dateToString($dateTrunc(createdAt, unit))` summing `amount` and counting docs → `$sort` → `$project` to `{ period, totalAmount, jobCount }`. `getWeeklyEarnings` (Monday-start weeks, `YYYY-MM-DD`, default 8), `getMonthlyEarnings` (`YYYY-MM`, default 12), `getAllTimeEarnings` (monthly, no window).
- `GET /api/drivers/[id]/earnings` — `withAuth`; 403 unless caller owns the id or is admin; invalid `range` falls back to `week`; returns `{ summary, breakdown }` where `summary` is the aggregate of `breakdown` and `breakdown[i].amount = bucket.totalAmount`.
- `scripts/seed-earnings.ts` — idempotent seed (3 drivers, payouts over 4 months, paid/pending/failed mix) that also self-verifies all three functions against independent JS expectations.
- Decisions: D-32 (`$dateTrunc` + `startOfWeek`).

### Implementation trail
1. Day 49 — types, `src/lib/earnings.ts`, seed script; ran seed → first run surfaced `vehicleType` enum fix (`bike` → `bicycle`), then Atlas rejected `weekStartDay` → switched to `startOfWeek: "monday"` (D-32); 9/9 aggregation checks passed. Commit `7e14b52`.
2. Day 50 — `GET /api/drivers/[id]/earnings` route; build surfaced a seed typing fix (read `createdAt` via `get()`); 13/13 endpoint checks passed with a temp harness (real JWTs, direct handler invocation); lint no new problems, build clean. Commits `627604d`, `5f500e9`.

### Verification
- Seed: `npx tsx scripts/seed-earnings.ts` — 9/9 PASS; pending/failed absent from every bucket; 120-day-old payout present in monthly/all-time, absent from 8-week weekly; no createdAt-override warnings.
- Endpoint harness: 13/13 PASS — owner week 3700/3 · month 7700/5 · all-time 7700/5; default = week; cross-driver 403; admin any-driver; breakdown shape; summary == aggregate(breakdown); invalid range → week; no token → 401.
- `npm run lint` (4 pre-existing errors only) and `npm run build` (clean) both pass.
- TestChecklist rows 26–27 added.

### Follow-ups
- Permanent E2E harness for the earnings endpoint (temp one was deleted after verification); consider filling zero-activity buckets (e.g. `$densify`) if the UI wants a continuous timeline; timezone-aware bucketing (`Asia/Kathmandu`) if the product wants Nepal-local week/month boundaries instead of UTC.

## FEATURE-02 - Nepal payment pipeline: Khalti + eSewa, idempotent verify, payout status UI

**Requested:** Aug 14 | **Requested by:** build plan Days 38-48
**Status:** Shipped
**Scope:** Poster pays a driver-assigned accepted job via Khalti (redirect) or eSewa (hidden-form POST + HMAC). Server-side verify is idempotent (single Payout per transaction, failures never pay). Payout lifecycle tracked from creation (pending) through admin payment (paid/failed) and surfaced to drivers. Includes gateway selector UI, payment success/failure pages, earnings summary page.

### Why (intent)
Nepal operates on two domestic gateways (Khalti, eSewa); Stripe/PayPal defaults do not work. Payments must be server-verified (never trust redirect params), idempotent (gateways can redirect multiple times; a double redirect must never double-pay the driver), and legible to both sides.

### Design
- PaymentTransaction model with unique compound index {gateway, transactionId} - DB-level idempotency arbiter.
- Payout model (driverId/jobId/amount/platformFee/gateway/gatewayTransactionId/status/paidAt/notes) with status lifecycle pending -> paid|failed.
- Unified PaymentInitResult (redirect | form) contract in src/lib/payments/index.ts (D-30).
- Verify routes: Khalti lookup API + eSewa HMAC recomputation; all gateway failure statuses explicit; unpaid/tab-close leaves job retryable.
- Payout created on verify success and on job delivery (fallback for accept-to-deliver without gateway payout).
- Driver-facing payout badges + /driver/earnings summary page.
- Decisions: D-29 (Khalti backend), D-30 (unified abstraction), D-31 (TOCTOU close-the-window idempotency).

### Implementation trail
1. Day 38-40 - Khalti initiate + verify, PaymentTransaction, initiate route, admin payout routes.
2. Day 41-44 - eSewa form flow + HMAC, unified abstraction, deliver-route payout fallback.
3. Day 45 - idempotency hardening, explicit failure statuses, abandoned-payment retry.
4. Day 46 - gateway selector UI, success/failure pages.
5. Day 47 - payouts API + earnings page + per-job payout badges + Header Earnings link.
6. Day 48 - full sandbox walkthrough (both gateways, deliberate failures, double-verify).
7. Aug 16 - fixed build blocker (BUG-01-04); single role-aware /jobs/[id] page; rules audit (BUG-05-08, D-31).

### Verification
- TestChecklist rows 19-24 added. Manual sandbox walkthrough: eSewa success, Khalti success, tampered eSewa data -> rejection, tab-close -> retryable, sequential double verify -> single Payout.
- Build + lint pass (4 pre-existing lint errors in files outside this feature).

### Follow-ups
- Close BUG-06 (paginate /api/drivers/payouts), BUG-08 (dedupe constants/types), BUG-05 (status constants), BUG-07 (verify URL construction); apply D-31 (unique-index-as-arbiter order).
---

## FEATURE-01 — Read receipts, unread badges, and off-screen message toasts

**Requested:** Aug 13 · **Requested by:** build plan Days 35–37
**Status:** Shipped
**Scope:** Mark messages read when the chat opens; badge unread counts per job on the chat sidebar; a global Pusher provider that notifies the user of new messages while off the chat page. Deliberately does NOT add a "last seen" indicator, does NOT change the chat page's own Pusher subscription, and does NOT touch auth middleware.

### Why (intent)
Recipients had no way to know which conversations had unseen messages, and senders had no feedback that their message was read. Users off the chat page received no signal that a new message arrived.

### Design
- `PATCH /api/jobs/:id/messages/read` — `withAuth` + participant gate; `updateMany` on `{ jobId, recipientId: me, readAt: null }`.
- `GET /api/jobs/unread-counts` — `withAuth`; aggregation → `{ [jobId]: count }`.
- `GET /api/jobs/my-active-ids` — `withAuth`; active (accepted/in_transit) jobs where user is participant.
- `useUnreadCounts` + `useMarkMessagesRead` hooks (30s staleTime on the query; cache-update-only on the mutation).
- `PusherProvider` context — one shared `pusherClient`, subscribes active jobs, toasts via `react-hot-toast` when off the chat page for that job.
- `senderName` added to the `new-message` Pusher payload.
- Decisions: D-27 (cache-update, never invalidate).

### Implementation trail
1. Day 35 — read endpoint, unread-counts endpoint, types/apis/hooks, chat-page on-mount mark-read, sidebar badge.
2. Day 36 — my-active-ids endpoint, `senderName` in event payload, `react-hot-toast` install, `PusherProvider`, root-layout wiring.
3. Day 37 — Node E2E (30/30 pass), lint (no new issues) + build clean, fixed self-message toast guard.

### Verification
- TestChecklist rows 16–18 added. API surface E2E-verified: cross-role register/login, post+accept, both-direction messages, unread count 1 recipient / 0 sender, mark-read → `markedCount: 1` + badge clears, recipient scoping (driver's read never clears poster's count), 401 guards on all three routes, location ping 200/403.
- Toast + live-map marker behavior require dual real browsers (rows 17–18 pending manual playback).

### Follow-ups
- Rate-limit chat, "last seen" read receipts per sender, refetch-on-focus staleness policy for `unread-counts`, and a nudge to look at the badge from the campaign/notification bell (dashboard nav is still mockup).

---

## FEATURE-13 — Poster Sidebar Pages (History, Analytics, Billing, Tracking)

**Requested:** Aug 27 | **Requested by:** Branch alignment (missing nav items + broken /jobs/active route)
**Status:** Shipped
**Scope:** Add 4 poster-facing pages and 3 sidebar nav links. Fix the `/jobs/active` CastError, remove the dead `/fleet` link, and ensure all poster dashboard routes render with exactly one sidebar. No new API routes created.

### Why (intent)
The poster sidebar linked to `/jobs/active` (500 CastError), `/fleet` (404), `/history` (empty). The poster had no way to view historical jobs, analytics, billing records, or track active deliveries from dedicated pages.

### Design
- **API used (no new routes):** `GET /api/jobs/my-active-ids` (returns `{ jobIds }`), `GET /api/jobs/[id]` (returns `{ job }`), `GET /api/jobs?status=...&page=...&limit=...` (returns `{ jobs, total, page, totalPages }`), `GET /api/posters/[id]/summary` (returns `{ data: { stats } }`).
- **No payment-history endpoint exists** — the `/payments/` API group only has `initiate` + `esewa/verify` + `khalti/verify`. The History Payments tab derives payment records from delivered jobs (`offeredPrice`, `paymentGateway`, `paymentStatus` fields on the Job model — see Bug.md BUG-09 for the follow-up to build a proper PaymentTransaction list endpoint).
- **Pages created:**
  - `src/app/(dashboard)/history/page.tsx` — tabbed (Jobs / Payments), "Load more" pagination, `useAuthGuard` + `useQuery`
  - `src/app/(dashboard)/analytics/page.tsx` — summary cards (Total Spent, Total Jobs, Completed, Cancelled) from poster summary API, Recharts bar chart (jobs by status), efficiency trend from `stats.efficiencyTrend`
  - `src/app/(dashboard)/billing/page.tsx` — delivered jobs as billing records from `GET /api/jobs?status=delivered`, total spent card (sum of `offeredPrice`), table with link per row
  - `src/app/(dashboard)/tracking/page.tsx` — reuses `/jobs/active` fetch pattern (`my-active-ids` → `/api/jobs/[id]`), table with Job ID, Route, Driver, Status, Date
- **Layout changes:** removed `/fleet` nav entry, added `/tracking`, `/analytics`, `/billing` links (poster-only), added `/driver/earnings`, `/driver/payouts`, `/driver/verification` links (driver-only)
- **Bug fix:** `/api/jobs/[id]/route.ts` — ObjectId format guard returns 400 for non-ObjectId values before `Job.findById()`

### Implementation trail
1. Read all API routes, models, and types to map available data surface
2. Created `/jobs/active` page (fetch IDs → fetch each by ID via Promise.all)
3. Added ObjectId guard to `/api/jobs/[id]/route.ts`
4. Removed `/fleet` from NAV_LINKS; added Tracking, Analytics, Billing, driver Earnings/Wallet/Verification links
5. Made "New Shipment" sidebar button poster-only; fixed mobile bottom nav dead links
6. Removed inline "Driver Portal" sidebar from `driver/earnings/page.tsx` (only page with one)
7. Created History page (tabbed: Jobs + Payments, load-more pagination)
8. Created Analytics page (summary cards + Recharts bar chart + efficiency trend)
9. Created Billing page (delivered jobs table + total spent card)
10. Created Tracking page (active jobs list with my-active-ids + individual fetches)
11. `tsc --noEmit` 0 errors → `npm run build` 56 pages, 0 errors, 0 warnings

### Verification
- `tsc --noEmit` passes with 0 errors
- `npm run build` passes with 56 pages generated, 0 errors, 0 warnings
- `/jobs/active` returns 200 (was 500 CastError) — ObjectId guard returns 400 for invalid IDs
- "Fleet Management" no longer in sidebar
- Driver pages show exactly one sidebar (the `(dashboard)` layout sidebar)
- Driver nav links (Earnings, Wallet, Verification) appear for drivers
- Poster nav links (Tracking, Analytics, Billing) appear for posters

### Follow-ups
- PaymentTransaction table has no read/list API endpoint — the History Payments tab derives data from delivered Jobs. Future work: add `GET /api/payments` endpoint returning PaymentTransaction records for the current poster. (BUG-09)
- `/analytics` chart only shows aggregate counts from the poster summary. Per-status breakdown (e.g. Accepted vs In-Transit) requires a new count endpoint or expanded summary. (BUG-10)

---

## FEATURE-14 — Admin Panel link in navbar

**Requested:** Aug 28 · **Requested by:** user
**Status:** Shipped · **Scope:** Add an "Admin Panel" navigation link to the top navbar for users with `role === "admin"`. No UI changes for other roles.

### Why (intent)
Admins need quick access to the admin panel (`/admin`) from any page without navigating manually. The existing Header already gates "Post a Job" behind `isPoster`; this extends the same pattern for admins.

### Design
- `isAdmin` derived from `user?.role === "admin"` in the existing `useAuth()` hook
- Desktop CTA: admin sees profile chip + Logout + "Admin Panel" link (text-style, primary container hover)
- Mobile menu: admin sees "Admin Panel" link alongside existing nav items

### Implementation trail
- `src/components/layout/Header.tsx`: added `isAdmin` const; added Admin Panel `<Link href="/admin">` in desktop CTA block (after poster's Post a Job) and in mobile nav block (after How it Works)

### Verification
- `tsc --noEmit` — 0 errors
- `npm run build` — 56 pages, 0 errors
- Logged-out visitor: Login + Post a Job (no regression)
- Logged-in poster: profile chip + Logout + Post a Job (no regression)
- Logged-in driver: profile chip + Logout only (no Admin Panel, no Post a Job)

---

## FEATURE-15 — Role-aware driver history ACTIONS column

**Requested:** Aug 28 · **Requested by:** user
**Status:** Shipped · **Scope:** The History page's Jobs tab ACTIONS column currently shows poster-centric buttons (Rate, Pay, Chat, Track) for all users. Drivers need their own action set: Details / Chat / Dispute.

### Why (intent)
Drivers navigate to job detail pages (`/jobs/[id]`), chat with posters (`/jobs/[id]#chat`), and file disputes (`/jobs/[id]#dispute`). The existing Pay button and Track (location-pin) icon are poster-only actions that don't apply to drivers.

### Design
- Added `userRole: string` field to the `JobsTableRow` interface
- ACTIONS cell checks `userRole === "driver"`:
  - **Driver:** Details link (`/jobs/[id]`) + Chat button (`/jobs/[id]#chat`) + Dispute button (`/jobs/[id]#dispute`, only when status is `delivered` or `completed`)
  - **Poster:** Rate / Pay / Chat / Track / Dispute (unchanged from original behavior)

### Implementation trail
- `src/app/(dashboard)/history/page.tsx`:
  - Added `userRole` to `JobsTableRow` interface
  - Populated `userRole: user?.role ?? ""` in the `jobTableRows` useMemo
  - Rewrote ACTIONS column cell with role branching
  - Used `JOB_STATUS` enum constants instead of magic strings

### Verification
- `tsc --noEmit` — 0 errors
- `npm run build` — 56 pages, 0 errors
- Poster view: Rate/Pay/Chat/Track/Dispute buttons render unchanged
- Driver view: Details + Chat + Dispute (only for delivered/completed), no Pay or location-pin

---

## FEATURE-16 — Driver-perspective payout labels in History Payments tab

**Requested:** Aug 28 · **Requested by:** user
**Status:** Shipped · **Scope:** The History page's Payments tab was built for posters (money out: "Total Paid", "Paid"). For drivers it represents earnings received (money in: "Total Earned", "Received").

### Why (intent)
Posters pay for shipments; drivers receive earnings. The labels must match the user's perspective. "Total Paid" with "Paid" status is confusing for drivers — they earn, not pay.

### Design
- Added `isDriver: boolean` to `PaymentRecord` interface
- Label changes only when `user?.role === "driver"`:
  - "Total Paid" → "Total Earned"
  - Row status `"paid"` → renders as "Received" (green badge, same color as "Paid")
  - Row status `"pending"` → renders as "Pending" (unchanged)
  - Row status `"failed"` → renders as "Failed" (unchanged)

### Implementation trail
- `src/app/(dashboard)/history/page.tsx`:
  - Added `isDriver: boolean` to `PaymentRecord` interface
  - `PaymentStatusBadge` accepts `isDriver` prop; when `isDriver && rawStatus === "paid"`, renders "Received"
  - Updated `PAYMENT_COLUMNS` status accessor to pass `isDriver={info.row.original.isDriver}`
  - Updated `paymentRecords` useMemo to include `isDriver: user?.role === "driver"`
  - Updated "Total Paid" label to conditional `{user?.role === "driver" ? "Total Earned" : "Total Paid"}`

### Verification
- `tsc --noEmit` — 0 errors
- `npm run build` — 56 pages, 0 errors
- Driver Payments tab: summary reads "Total Earned", "paid" status renders as "Received" (green)
- Poster Payments tab: summary reads "Total Paid" (no regression), "paid" renders as "Paid"

---

## FEATURE-17 — Browse Jobs visible in dashboard sidebar on all screen sizes

**Requested:** Aug 28 · **Requested by:** user
**Status:** Shipped · **Scope:** The "Browse Jobs" link in the dashboard sidebar was previously hidden on desktop (`md:hidden`), shown only in the mobile bottom nav. Make it visible in the sidebar on all screen sizes.

### Why (intent)
Users navigating the dashboard sidebar on desktop should see the Browse Jobs link alongside other navigation items, not hidden exclusively to mobile bottom nav.

### Design
- Removed `md:hidden` class from the Browse Jobs `<li>` in the dashboard sidebar
- Replaced the role-gated active state check (`pathname === "/jobs/browse"`) with the shared `isActive()` helper
- Updated the comment from "Mobile: always show Jobs navigation" to "Browse Jobs navigation - visible on all screen sizes"

### Implementation trail
- `src/app/(dashboard)/layout.tsx`: removed `className="md:hidden"` from Browse Jobs `<li>`, updated to use `isActive("/jobs/browse")`, updated comment

### Verification
- `tsc --noEmit` — 0 errors
- `npm run build` — 56 pages, 0 errors
- Dashboard sidebar shows "Browse Jobs" link on desktop (≥768px) and mobile
