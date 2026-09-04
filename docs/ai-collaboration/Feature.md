# Feature.md â€” Trace Every Feature Start to Finish

> Every feature gets a trace from the request that started it to the verification that ended it. The trace is the proof that the feature was designed, not stumbled into.

---

## The Feature Trace Format (copy this block for each feature)

```markdown
## FEATURE-<NN> â€” <short title>

**Requested:** <date> Â· **Requested by:** <who>
**Status:** <Planned | In progress | Shipped | Blocked>
**Scope:** <one line â€” what it does, what it deliberately does NOT do>

### Why (intent)
The problem this solves and for whom. If you can't write this, you don't understand the feature yet.

### Design
- Data model changes (if any)
- API changes (routes/methods/payloads)
- UI components involved
- Real-time events (if any)
- Decisions made during design â†’ link to `Decisions.md` (e.g. D-22)

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
| FEATURE-34 | Admin verification status override (Approve/Reject/Revoke/Re-Approve) + tab counter badges + per-tab Actions | Shipped | Sep 3 | (doc-only update) |
| FEATURE-33 | In-app notification triggers (9 routes wired to `notifyUser`) | Shipped | Sep 3 | (doc-only update) |
| FEATURE-32 | Analytics & Billing Source-of-Truth Alignment (PaymentTransaction) | Shipped | Sep 2 | (doc-only update) |
| FEATURE-31 | PaymentTransaction posterId + Idempotent Verify Routes | Shipped | Sep 2 | (doc-only update) |
| FEATURE-30 | Public Poster Profile | Shipped | Sep 2 | (doc-only update) |
| FEATURE-29 | Sidebar Profile Links | Shipped | Sep 2 | (doc-only update) |
| FEATURE-28 | SEO & discoverability setup | Shipped | Sep 2 | feat/seo-discoverability-setup |
| FEATURE-25 | Payout receipt modal | Shipped | Sep 1 | feat/toast-theme-edit-profile |
| FEATURE-24 | Persisted notification inbox + bell dropdown | Shipped | Sep 1 | feat/toast-theme-edit-profile |
| FEATURE-23 | Header & Settings UI cleanup | Shipped | Aug 30 | â€” |
| FEATURE-22 | Change Password flow + Logout buttons for all roles | Shipped | Aug 30 | â€” |
| FEATURE-21 | Admin PDF/CSV report export | Shipped | Aug 29 | â€” |
| FEATURE-20 | Unified admin sidebar across all routes | Shipped | Aug 29 | â€” |
| FEATURE-19 | Admin topbar Settings link + Profile consolidation | Shipped | Aug 29 | â€” |
| FEATURE-18 | Public navbar auth guard for Post a Job | Shipped | Aug 29 | â€” |
| FEATURE-13 | Poster sidebar pages: History, Analytics, Billing, Tracking | Shipped | Aug 27 | fix/poster-consistent-layout |
| FEATURE-12 | Dispute Flag Button & Driver Activity Dashboard | Shipped | Aug 24 | Post-v1 |
| FEATURE-11 | Admin Payout Management Queue | Shipped | Aug 20 | Day 62 |
| FEATURE-10 | Poster Activity Dashboard | Shipped | Aug 20 | Day 61 |
| FEATURE-09 | Admin Analytics Dashboard UI + API | Shipped | Aug 18 | Day 58 |
| FEATURE-08 | Dispute Flag + Resolution UI + API | Shipped | Aug 18 | Day 56 |
| FEATURE-07 | Admin User Management UI + API | Shipped | Aug 18 | Day 55 |
| FEATURE-06 | Admin Job Management UI + API | Shipped | Aug 18 | Day 54 |
| FEATURE-05 | Driver Earnings Dashboard UI (Phase 7 Days 51â€“52) | Shipped | Aug 18 | Days 51â€“52 |
| FEATURE-04 | 404 Not Found & Error Boundary UI Pages | Shipped | Aug 17 | Days 51â€“52 |
| FEATURE-03 | Earnings aggregation pipeline + driver earnings endpoint | Shipped | Phase 7 Days 49â€“50 | Days 49â€“50 |
| FEATURE-01 | Read receipts + unread badges + off-screen message toasts | Shipped | Aug 13 | Days 35â€“37 |
| FEATURE-02 | Nepal payment pipeline: Khalti + eSewa, idempotent verify, payout status UI | Shipped | build plan Days 38-48 | Days 38-48 |

---

## FEATURE-04 â€” 404 Not Found & Error Boundary UI Pages

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

## FEATURE-06 â€” Admin Job Management UI + API (Day 54)

**Requested:** Aug 18 | **Requested by:** Admin panel build plan
**Status:** Shipped
**Scope:** Admin job management page at `/(admin)/admin/jobs` with stat cards, filter tabs, search, paginated table, and status override modal. Includes new API routes for listing jobs and overriding job status. Deliberately does NOT modify the existing job lifecycle endpoints or the Payout model.

### Why (intent)
Admins need a centralized view of all platform jobs with the ability to intervene on disputed or stuck jobs. The page must surface key metrics, support filtered navigation, and record an audit trail when statuses are overridden.

### Design
- `src/types/admin/adminJobs.ts` â€” `AdminJobItem`, `AdminJobsResponse`, `AdminJobsQueryParams`, `AllowedOverrideStatus`, `StatusOverrideInput`.
- `src/api/apis/admin/adminJobsApi.ts` â€” `getAdminJobs(params)` and `overrideJobStatus(jobId, data)`.
- `src/api/hooks/admin/adminJobsApi.ts` â€” `useAdminJobs()` and `useOverrideJobStatus()`.
- `src/components/admin/StatusOverrideModal.tsx` â€” modal with status dropdown, reason field, irreversible-action warning.
- `src/app/(admin)/admin/jobs/page.tsx` â€” stat cards, filter tabs (`all`, `in_transit`, `disputed`, `cancelled`, `posted`), debounced search, paginated table, override action.
- `GET /api/admin/jobs` â€” paginated, filterable by status and search term.
- `PATCH /api/admin/jobs/:id/status` â€” override status with reason, admin-guarded.
- `src/types/job.ts` â€” Added `DISPUTED` to `JOB_STATUS` enum.
- `src/utils/format.ts` â€” Added `formatNpr()` and `formatShortDate()`.

### Implementation trail
1. Created PLMS layers: types â†’ apis â†’ hooks â†’ components â†’ page.
2. Added `DISPUTED` to `JOB_STATUS` enum and replaced magic string in the override route.
3. Built `StatusOverrideModal` with confirmation flow and audit warning.

### Verification
- `npm run build` â€” exit code 0, all routes compiled, type-check clean.

### Follow-ups
- Wire the override mutation to invalidate the admin jobs query on success (already implemented via `useOverrideJobStatus`).
- Add CSV export for job records (UI button present, toast-only placeholder).

---

## FEATURE-07 â€” Admin User Management UI + API (Day 55)

**Requested:** Aug 18 | **Requested by:** Admin panel build plan
**Status:** Shipped
**Scope:** Admin user management page at `/(admin)/admin/users` with role tabs, status dropdown, search, paginated table, and user action modal (details/suspend/role-change). Includes three new API routes for user listing, suspension toggle, and role changes. Deliberately does NOT modify auth middleware or the User model beyond adding `updatedAt` to the TypeScript interface.

### Why (intent)
Admins need to manage platform users â€” view all users, filter by role/status, search by name/email, suspend abusive accounts, and reassign roles (poster â†” driver) without touching the database directly.

### Design
- `src/types/admin/adminUsers.ts` â€” `AdminUserItem`, `AdminUsersResponse`, `AdminUserRoleFilter`, `AdminUserStatusFilter`.
- `src/api/apis/admin/adminUsersApi.ts` â€” `getAdminUsers()`, `toggleSuspendUser()`, `changeUserRole()`.
- `src/api/hooks/admin/adminUsersApi.ts` â€” `useAdminUsers()`, `useToggleSuspendUser()`, `useChangeUserRole()`.
- `src/components/admin/UserActionModal.tsx` â€” modal with three modes: `details`, `suspend`, `role`.
- `src/app/(admin)/admin/users/page.tsx` â€” role tabs, status dropdown, debounced search, paginated table, CSV export button.
- `GET /api/admin/users` â€” paginated, filterable by role/status, searchable by name/email.
- `PATCH /api/admin/users/:id/suspend` â€” toggle `isActive`.
- `PATCH /api/admin/users/:id/role` â€” change role between `poster` and `driver`.
- `src/models/User.ts` â€” Added `updatedAt: Date` to `IUser` interface.

### Implementation trail
1. Created PLMS layers: types â†’ apis â†’ hooks â†’ components â†’ page.
2. Built three admin API routes with `withRole(["admin"])` guards and structured query params.
3. Implemented `UserActionModal` with confirmation flow for suspend and role-change actions.
4. Added `updatedAt: Date` to `IUser` to align the TypeScript interface with Mongoose `timestamps: true`.

### Verification
- `npm run build` â€” exit code 0, all 42 pages generated, type-check clean.

### Follow-ups
- Add email notification when a user is suspended or their role is changed.
- Restrict role changes so admins cannot demote other admins (currently only poster â†” driver is allowed).

---

## FEATURE-08 â€” Dispute Flag + Resolution UI + API (Day 56)

**Requested:** Aug 18 | **Requested by:** Phase 8 build plan
**Status:** Shipped
**Scope:** Participant-only dispute flagging on job detail page, admin dispute queue with resolve modal, evidence image upload via Cloudinary, real chat transcript fetching, and real delivery timeline from lifecycle timestamps. Includes four API routes for flagging, uploading evidence, listing, and resolving disputes. Deliberately does NOT modify auth middleware, payment routes, or Pusher helper.

### Why (intent)
Participants (poster/driver) need a way to flag delivery disputes for admin review with supporting evidence. Admins need a centralized queue to review flagged jobs, inspect uploaded evidence images, read the real chat transcript, see the actual delivery timeline, and resolve them by reopening or cancelling the job, with an optional payout status update.

### Design
- `src/models/Job.ts` â€” Added `disputeReason`, `flaggedBy`, `resolutionNote`, `evidenceImages: string[]`, `acceptedAt`, `inTransitAt`, `deliveredAt`, `disputedAt`.
- `src/types/admin/adminDisputes.ts` â€” `DisputedJobItem` (includes `evidenceImages`, lifecycle timestamps), `DisputesResponse`, `ResolveJobInput`, `ResolveJobResponse`.
- `src/api/apis/admin/adminDisputesApi.ts` â€” `getAdminDisputes()`, `resolveJobDispute()`.
- `src/api/hooks/admin/adminDisputesApi.ts` â€” `useAdminDisputes()`, `useResolveJobDispute()`.
- `src/components/admin/ResolveDisputeModal.tsx` â€” resolve modal with `resolvedStatus` dropdown, note textarea, payout status selector.
- `src/app/(admin)/admin/disputes/page.tsx` â€” dispute queue table with search, pagination, resolve action. Detail panel includes:
  - Evidence Image Grid rendered from real `evidenceImages` URLs (Cloudinary, via `next/image`).
  - Chat Transcript Snippet fetched from `GET /api/jobs/:id/messages` in real time.
  - Delivery Timeline built from real `acceptedAt` â†’ `inTransitAt` â†’ `deliveredAt` â†’ `disputedAt` timestamps.
- `src/app/(main)/jobs/[id]/page.tsx` â€” participant-only flag button with confirmation modal for `accepted`/`in_transit`/`delivered` jobs.
- `POST /api/jobs/:id/dispute` â€” participant-only, sets status to `disputed`, stores reason + flaggedBy + disputedAt, triggers Pusher.
- `POST /api/jobs/:id/evidence` â€” participant-only, accepts `multipart/form-data` image uploads, uploads to Cloudinary `dispute-evidence/{jobId}` folder, appends URLs to Job `evidenceImages`.
- `GET /api/admin/disputes` â€” admin-only, paginated disputed jobs with populated poster/driver info, evidence images, and lifecycle timestamps.
- `PATCH /api/admin/jobs/:id/resolve` â€” admin-only, resolves to `posted`/`cancelled`, saves note, optional payout update.

### Implementation trail
1. Added dispute fields and lifecycle timestamps to Job schema + `IJob` interface.
2. Updated accept/transit/deliver/dispute routes to populate timestamps atomically.
3. Created PLMS layers: types â†’ apis â†’ hooks â†’ components â†’ page.
4. Built evidence upload endpoint with Cloudinary integration.
5. Built four API routes with proper auth guards (`withAuth` for participants, `withRole(["admin"])` for admin routes).
6. Added flag button + confirmation modal to job detail page.
7. Built admin dispute queue table + resolve modal + real evidence/chat/timeline panels.

### Verification
- `npx tsc --noEmit` â€” 0 errors.
- `npx eslint` on all changed files â€” 0 errors.
- `npm run build` â€” exit code 0.

### Follow-ups
- Wire the evidence upload UI to the job detail page (endpoint exists, participant UI not yet wired).
- Add dispute status filter tabs (All / Under Review / Pending Info).

---

## FEATURE-09 â€” Admin Analytics Dashboard UI + API (Days 57â€“58)

**Requested:** Aug 18 | **Requested by:** Phase 8 build plan
**Status:** Shipped
**Scope:** Analytics aggregation endpoint (`GET /api/admin/analytics`) returning 30-day jobs-per-day trend, total GMV, and active driver count. Admin analytics dashboard page with KPI cards and Recharts BarChart. Deliberately does NOT modify existing admin pages or auth files.

### Why (intent)
Admins need a single-page overview of platform health: delivery volume over time, total revenue from completed jobs, and how many drivers are currently approved and active.

### Design
- `src/types/admin/adminAnalytics.ts` â€” `JobsPerDayItem`, `AdminAnalyticsResponse`.
- `src/app/api/admin/analytics/route.ts` â€” `GET /api/admin/analytics`. Uses `$dateTrunc` daily bucketing for last 30 days, `$sum` of `offeredPrice` for GMV on delivered jobs, `countDocuments` for approved drivers.
- `src/api/apis/admin/adminAnalyticsApi.ts` â€” `getAdminAnalytics()`.
- `src/api/hooks/admin/adminAnalyticsApi.ts` â€” `useAdminAnalytics()` with 30s staleTime and 60s refetchInterval.
- `src/app/(admin)/admin/analytics/page.tsx` â€” three KPI cards (GMV, active drivers, total jobs 30d) + Recharts BarChart for daily job volume.

### Implementation trail
1. Created analytics types and API route with three parallel aggregations.
2. Built plain async fetcher and TanStack Query hook.
3. Created analytics dashboard page with KPI cards and BarChart, matching existing admin design tokens.

### Verification
- `npx tsc --noEmit` â€” 0 errors.
- `npx eslint` on all changed files â€” 0 errors.
- `npm run build` â€” exit code 0.

### Follow-ups
- Add GMV trend line (daily GMV, not just count).
- Add platform revenue breakdown by payment method (eSewa/Khalti).
- Add CSV export for analytics data.

---

## FEATURE-10 â€” Poster Activity Dashboard (Day 61)

**Requested:** Aug 20 | **Requested by:** Post-v1 poster dashboard build plan
**Status:** Shipped
**Scope:** Unified `/dashboard` entry point with RBAC. Poster role sees a dashboard with four summary cards (Active Jobs, Pending Acceptance, Completed Jobs, Total Spent) derived from Job aggregation, plus a Recent Deliveries table (real job data via `useMyJobs`), Quick Actions sidebar, and Efficiency Score card. Admin is redirected to `/admin`, driver to `/driver/earnings`.

### Why (intent)
Posters need a single-page overview of their delivery activity: how many jobs are in flight, waiting for drivers, completed, and how much they have spent on completed deliveries. All numbers must be derived from real Job data, not mocked. The dashboard must also serve as a role-aware entry point so users land on the right experience for their role.

### Design
- `src/types/poster/posterDashboard.ts` â€” `PosterSummaryStats`, `PosterSummaryData`, `PosterSummaryResponse`.
- `src/app/api/posters/[id]/summary/route.ts` â€” `GET /api/posters/:id/summary`. Aggregates Job counts by status group (active = accepted + in_transit, pending = posted, completed = delivered, cancelled) and sums `offeredPrice` for `DELIVERED` jobs only into `totalSpent`. Restricted to poster themselves or admin role.
- `src/api/apis/posters/posterDashboardApi.ts` â€” `getPosterSummary(posterId)`.
- `src/api/hooks/posters/posterDashboardApi.ts` â€” `usePosterSummary(posterId)` with 30s staleTime.
- `src/app/(dashboard)/dashboard/page.tsx` â€” unified dashboard page with `useAuthGuard` + `useEffect` role redirects. Poster content includes four summary cards, Recent Deliveries table populated via `useMyJobs` (existing `GET /api/jobs` endpoint), Quick Actions, and Efficiency Score.
- `src/api/apis/jobs/jobApi.ts` â€” Added `fetchMyJobs(query)` calling existing role-scoped `GET /api/jobs`.
- `src/api/hooks/jobs/jobsApi.ts` â€” Added `useMyJobs(query)` hook.
- `src/types/jobs/jobs.ts` â€” Added `MyJobsResponse` type.

### Implementation trail
1. Created PLMS layers: types â†’ api â†’ hooks â†’ page.
2. Built `GET /api/posters/:id/summary` with `countDocuments` + `$group` aggregation.
3. Built unified `/dashboard` page with `useAuthGuard` role redirect (admin â†’ `/admin`, driver â†’ `/driver/earnings`).
4. Wired Recent Deliveries table to `useMyJobs` (existing jobs endpoint, poster-scoped).
5. Fixed Total Spent subtitle contrast (`text-surface-white/80` on `bg-primary`).

### Verification
- `npx tsc --noEmit` â€” 0 errors.
- `npx eslint` on all changed files â€” 0 errors.
- `npm run build` â€” exit code 0, 49 pages generated.

### Follow-ups
- Add pagination to Recent Deliveries table.
- Add date-range filter for deliveries.

---

## FEATURE-11 â€” Admin Payout Management Queue (Day 62)

**Requested:** Aug 20 | **Requested by:** Post-v1 admin payout queue build plan
**Status:** Shipped
**Scope:** Admin-only payout management page at `/(admin)/admin/payouts` with paginated table, status filter, summary cards, and manual override action for pending payouts. Includes GET list endpoint and PATCH override endpoint. Deliberately does NOT modify the Payout model schema.

### Why (intent)
Admins need a centralized queue to review all driver payout records, see driver info and linked jobs, filter by status, and manually override pending payouts to paid or failed with an audit note.

### Design
- `src/types/admin/adminPayouts.ts` â€” `AdminPayoutItem`, `AdminPayoutsQuery`, `AdminPayoutsResponse`, `PayoutOverrideInput`, `PayoutOverrideResponse`.
- `src/app/api/admin/payouts/route.ts` â€” `GET /api/admin/payouts`. Admin-only; paginated, filterable by `status` and `driverId`, populated with driver name/email and linked job ID.
- `src/app/api/admin/payouts/[id]/route.ts` â€” `PATCH /api/admin/payouts/:id`. Admin-only; accepts `{ status: "paid" | "failed", note: string }`. Only allowed when current status is `pending`. Saves `note` on the Payout document.
- `src/api/apis/admin/adminPayoutsApi.ts` â€” `getAdminPayouts(query)`, `overridePayoutStatus(id, data)`.
- `src/api/hooks/admin/adminPayoutsApi.ts` â€” `useAdminPayouts(query)`, `useOverridePayoutStatus()`.
- `src/components/admin/PayoutOverrideModal.tsx` â€” modal with status dropdown and admin note textarea.
- `src/app/(admin)/admin/payouts/page.tsx` â€” admin payout queue with summary cards (Pending total, Paid count, Failed count), status filter dropdown, paginated table (Date, Driver, Job ID, Gateway, Amount, Status, Actions), and override action on pending rows.
- `src/components/admin/AdminSidebar.tsx` â€” Added "Payout Management" nav link.

### Implementation trail
1. Created PLMS layers: types â†’ apis â†’ hooks â†’ components â†’ page.
2. Built GET endpoint with populate driver + job, pagination, and status/driverId filters.
3. Built PATCH endpoint with pending-only guard and note persistence.
4. Built `PayoutOverrideModal` with confirmation flow.
5. Wired override mutation to invalidate `adminPayouts` query on success.

### Verification
- `npx tsc --noEmit` â€” 0 errors.
- `npx eslint` on all changed files â€” 0 errors.
- `npm run build` â€” exit code 0, 49 pages generated.

### Follow-ups
- Add CSV export for payout records.
- Add date-range filter.
- Add driver name search.

---

## FEATURE-12 â€” Dispute Flag Button & Driver Activity Dashboard

**Requested:** Aug 24 | **Requested by:** Build Plan / User Request
**Status:** Shipped
**Scope:** Participant-facing dispute flag button on poster and driver job detail pages (`accepted`, `in_transit`, `delivered` statuses only; participant-gated, min 10 chars reason validation, error banner inside modal); `GET /api/drivers/:id/summary` endpoint returning driver stats (active count, monthly count, total completed, total earned NPR for DELIVERED jobs only, rating avg/count, profile status); driver activity dashboard page at `/driver/dashboard` matching design specs.

### Why (intent)
Participants need a direct way to flag active/delivered job disputes for admin review from their job detail view. Drivers need a dedicated activity dashboard summarizing active deliveries, monthly progress, lifetime completed count, earnings, ratings, and recent activity.

### Design
- `src/types/drivers/driverDashboard.ts` â€” `DriverSummaryStats`, `DriverSummaryResponse`.
- `src/app/api/drivers/[id]/summary/route.ts` â€” `GET /api/drivers/:id/summary`. Authenticated & restricted to driver or admin.
- `src/api/apis/drivers/driverDashboardApi.ts` â€” `fetchDriverSummary(driverId)`.
- `src/api/hooks/drivers/driverDashboardApi.ts` â€” `useDriverSummary(driverId)` with 30s staleTime.
- `src/app/(dashboard)/driver/dashboard/page.tsx` â€” Driver activity dashboard with RBAC protection, 6 summary cards, and Recent Activity table.
- `src/app/(main)/jobs/[id]/dispute/page.tsx` â€” Dedicated 3-step Dispute Reporting page (`Report a Dispute - Unified Style`) matching `design-reference/dispute-flag-dialog.md` specs.
- `src/app/(main)/disputes/page.tsx` â€” User-facing Disputes page (`/disputes`) listing flagged jobs under admin review with empty state and direct detail links.
- `src/app/(dashboard)/layout.tsx` & `src/components/layout/Header.tsx` â€” Added prominent **"Disputes"** navigation link with `gavel` icon.

### Implementation trail
1. Fetched Stitch design specs for dispute flag dialog and driver dashboard into `design-reference/`.
2. Created PLMS layers for driver dashboard: types â†’ apis â†’ hooks â†’ route â†’ page.
3. Updated `src/app/(main)/jobs/[id]/page.tsx` with participant check, admin hide guard, status restriction (`accepted`, `in_transit`, `delivered`), 10-char reason validation, and inline error banner in modal.
4. Created route aliases `/poster/jobs/[id]` and `/driver/jobs/[id]`.
5. Updated `/dashboard` redirect so drivers land on `/driver/dashboard`.
6. Ran full Next.js build verification (`npm run build`).

### Verification
- `npm run build` â€” exit code 0, 50 pages generated, 0 TypeScript errors.

---

---

## FEATURE-03 â€” Earnings aggregation pipeline + driver earnings endpoint

**Requested:** Aug 17 | **Requested by:** Phase 7 Days 49â€“50
**Status:** Shipped
**Scope:** Backend-only earnings pipeline over the `Payout` model: weekly (8w), monthly (12m), and all-time aggregates using Mongoose aggregation with `$dateTrunc` bucketing, plus `GET /api/drivers/[id]/earnings?range=week|month|all-time` (owner-or-admin gated). Deliberately does NOT include any UI, does NOT touch payment/payout files, and does NOT modify the Payout schema.

### Why (intent)
Drivers need to see how much they earned per week/month over time from their paid payouts â€” without the client summing raw payout records. The aggregation must be correct (only `paid` payouts, correctly bucketed by calendar week/month) and the endpoint must never leak one driver's earnings to another.

### Design
- `src/types/payout/earnings.ts` â€” `EarningsRange`, `EarningsBucket`, `EarningsSummary`, `EarningsBreakdownItem`, `EarningsResponse`. One source of truth per concept (PLMS types layer).
- `src/lib/earnings.ts` â€” shared internal pipeline `getEarningsByPeriod(driverId, unit, periodFormat, startDate?)`: `$match { driverId: ObjectId, status: "paid", createdAt â‰¥ startDate? }` â†’ `$group` `_id = $dateToString($dateTrunc(createdAt, unit))` summing `amount` and counting docs â†’ `$sort` â†’ `$project` to `{ period, totalAmount, jobCount }`. `getWeeklyEarnings` (Monday-start weeks, `YYYY-MM-DD`, default 8), `getMonthlyEarnings` (`YYYY-MM`, default 12), `getAllTimeEarnings` (monthly, no window).
- `GET /api/drivers/[id]/earnings` â€” `withAuth`; 403 unless caller owns the id or is admin; invalid `range` falls back to `week`; returns `{ summary, breakdown }` where `summary` is the aggregate of `breakdown` and `breakdown[i].amount = bucket.totalAmount`.
- `scripts/seed-earnings.ts` â€” idempotent seed (3 drivers, payouts over 4 months, paid/pending/failed mix) that also self-verifies all three functions against independent JS expectations.
- Decisions: D-32 (`$dateTrunc` + `startOfWeek`).

### Implementation trail
1. Day 49 â€” types, `src/lib/earnings.ts`, seed script; ran seed â†’ first run surfaced `vehicleType` enum fix (`bike` â†’ `bicycle`), then Atlas rejected `weekStartDay` â†’ switched to `startOfWeek: "monday"` (D-32); 9/9 aggregation checks passed. Commit `7e14b52`.
2. Day 50 â€” `GET /api/drivers/[id]/earnings` route; build surfaced a seed typing fix (read `createdAt` via `get()`); 13/13 endpoint checks passed with a temp harness (real JWTs, direct handler invocation); lint no new problems, build clean. Commits `627604d`, `5f500e9`.

### Verification
- Seed: `npx tsx scripts/seed-earnings.ts` â€” 9/9 PASS; pending/failed absent from every bucket; 120-day-old payout present in monthly/all-time, absent from 8-week weekly; no createdAt-override warnings.
- Endpoint harness: 13/13 PASS â€” owner week 3700/3 Â· month 7700/5 Â· all-time 7700/5; default = week; cross-driver 403; admin any-driver; breakdown shape; summary == aggregate(breakdown); invalid range â†’ week; no token â†’ 401.
- `npm run lint` (4 pre-existing errors only) and `npm run build` (clean) both pass.
- TestChecklist rows 26â€“27 added.

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

## FEATURE-01 â€” Read receipts, unread badges, and off-screen message toasts

**Requested:** Aug 13 Â· **Requested by:** build plan Days 35â€“37
**Status:** Shipped
**Scope:** Mark messages read when the chat opens; badge unread counts per job on the chat sidebar; a global Pusher provider that notifies the user of new messages while off the chat page. Deliberately does NOT add a "last seen" indicator, does NOT change the chat page's own Pusher subscription, and does NOT touch auth middleware.

### Why (intent)
Recipients had no way to know which conversations had unseen messages, and senders had no feedback that their message was read. Users off the chat page received no signal that a new message arrived.

### Design
- `PATCH /api/jobs/:id/messages/read` â€” `withAuth` + participant gate; `updateMany` on `{ jobId, recipientId: me, readAt: null }`.
- `GET /api/jobs/unread-counts` â€” `withAuth`; aggregation â†’ `{ [jobId]: count }`.
- `GET /api/jobs/my-active-ids` â€” `withAuth`; active (accepted/in_transit) jobs where user is participant.
- `useUnreadCounts` + `useMarkMessagesRead` hooks (30s staleTime on the query; cache-update-only on the mutation).
- `PusherProvider` context â€” one shared `pusherClient`, subscribes active jobs, toasts via `react-hot-toast` when off the chat page for that job.
- `senderName` added to the `new-message` Pusher payload.
- Decisions: D-27 (cache-update, never invalidate).

### Implementation trail
1. Day 35 â€” read endpoint, unread-counts endpoint, types/apis/hooks, chat-page on-mount mark-read, sidebar badge.
2. Day 36 â€” my-active-ids endpoint, `senderName` in event payload, `react-hot-toast` install, `PusherProvider`, root-layout wiring.
3. Day 37 â€” Node E2E (30/30 pass), lint (no new issues) + build clean, fixed self-message toast guard.

### Verification
- TestChecklist rows 16â€“18 added. API surface E2E-verified: cross-role register/login, post+accept, both-direction messages, unread count 1 recipient / 0 sender, mark-read â†’ `markedCount: 1` + badge clears, recipient scoping (driver's read never clears poster's count), 401 guards on all three routes, location ping 200/403.
- Toast + live-map marker behavior require dual real browsers (rows 17â€“18 pending manual playback).

### Follow-ups
- Rate-limit chat, "last seen" read receipts per sender, refetch-on-focus staleness policy for `unread-counts`, and a nudge to look at the badge from the campaign/notification bell (dashboard nav is still mockup).

---

## FEATURE-13 â€” Poster Sidebar Pages (History, Analytics, Billing, Tracking)

**Requested:** Aug 27 | **Requested by:** Branch alignment (missing nav items + broken /jobs/active route)
**Status:** Shipped
**Scope:** Add 4 poster-facing pages and 3 sidebar nav links. Fix the `/jobs/active` CastError, remove the dead `/fleet` link, and ensure all poster dashboard routes render with exactly one sidebar. No new API routes created.

### Why (intent)
The poster sidebar linked to `/jobs/active` (500 CastError), `/fleet` (404), `/history` (empty). The poster had no way to view historical jobs, analytics, billing records, or track active deliveries from dedicated pages.

### Design
- **API used (no new routes):** `GET /api/jobs/my-active-ids` (returns `{ jobIds }`), `GET /api/jobs/[id]` (returns `{ job }`), `GET /api/jobs?status=...&page=...&limit=...` (returns `{ jobs, total, page, totalPages }`), `GET /api/posters/[id]/summary` (returns `{ data: { stats } }`).
- **No payment-history endpoint exists** â€” the `/payments/` API group only has `initiate` + `esewa/verify` + `khalti/verify`. The History Payments tab derives payment records from delivered jobs (`offeredPrice`, `paymentGateway`, `paymentStatus` fields on the Job model â€” see Bug.md BUG-09 for the follow-up to build a proper PaymentTransaction list endpoint).
- **Pages created:**
  - `src/app/(dashboard)/history/page.tsx` â€” tabbed (Jobs / Payments), "Load more" pagination, `useAuthGuard` + `useQuery`
  - `src/app/(dashboard)/analytics/page.tsx` â€” summary cards (Total Spent, Total Jobs, Completed, Cancelled) from poster summary API, Recharts bar chart (jobs by status), efficiency trend from `stats.efficiencyTrend`
  - `src/app/(dashboard)/billing/page.tsx` â€” delivered jobs as billing records from `GET /api/jobs?status=delivered`, total spent card (sum of `offeredPrice`), table with link per row
  - `src/app/(dashboard)/tracking/page.tsx` â€” reuses `/jobs/active` fetch pattern (`my-active-ids` â†’ `/api/jobs/[id]`), table with Job ID, Route, Driver, Status, Date
- **Layout changes:** removed `/fleet` nav entry, added `/tracking`, `/analytics`, `/billing` links (poster-only), added `/driver/earnings`, `/driver/payouts`, `/driver/verification` links (driver-only)
- **Bug fix:** `/api/jobs/[id]/route.ts` â€” ObjectId format guard returns 400 for non-ObjectId values before `Job.findById()`

### Implementation trail
1. Read all API routes, models, and types to map available data surface
2. Created `/jobs/active` page (fetch IDs â†’ fetch each by ID via Promise.all)
3. Added ObjectId guard to `/api/jobs/[id]/route.ts`
4. Removed `/fleet` from NAV_LINKS; added Tracking, Analytics, Billing, driver Earnings/Wallet/Verification links
5. Made "New Shipment" sidebar button poster-only; fixed mobile bottom nav dead links
6. Removed inline "Driver Portal" sidebar from `driver/earnings/page.tsx` (only page with one)
7. Created History page (tabbed: Jobs + Payments, load-more pagination)
8. Created Analytics page (summary cards + Recharts bar chart + efficiency trend)
9. Created Billing page (delivered jobs table + total spent card)
10. Created Tracking page (active jobs list with my-active-ids + individual fetches)
11. `tsc --noEmit` 0 errors â†’ `npm run build` 56 pages, 0 errors, 0 warnings

### Verification
- `tsc --noEmit` passes with 0 errors
- `npm run build` passes with 56 pages generated, 0 errors, 0 warnings
- `/jobs/active` returns 200 (was 500 CastError) â€” ObjectId guard returns 400 for invalid IDs
- "Fleet Management" no longer in sidebar
- Driver pages show exactly one sidebar (the `(dashboard)` layout sidebar)
- Driver nav links (Earnings, Wallet, Verification) appear for drivers
- Poster nav links (Tracking, Analytics, Billing) appear for posters

### Follow-ups
- PaymentTransaction table has no read/list API endpoint â€” the History Payments tab derives data from delivered Jobs. Future work: add `GET /api/payments` endpoint returning PaymentTransaction records for the current poster. (BUG-09)
- `/analytics` chart only shows aggregate counts from the poster summary. Per-status breakdown (e.g. Accepted vs In-Transit) requires a new count endpoint or expanded summary. (BUG-10)

---

## FEATURE-14 â€” Admin Panel link in navbar

**Requested:** Aug 28 Â· **Requested by:** user
**Status:** Shipped Â· **Scope:** Add an "Admin Panel" navigation link to the top navbar for users with `role === "admin"`. No UI changes for other roles.

### Why (intent)
Admins need quick access to the admin panel (`/admin`) from any page without navigating manually. The existing Header already gates "Post a Job" behind `isPoster`; this extends the same pattern for admins.

### Design
- `isAdmin` derived from `user?.role === "admin"` in the existing `useAuth()` hook
- Desktop CTA: admin sees profile chip + Logout + "Admin Panel" link (text-style, primary container hover)
- Mobile menu: admin sees "Admin Panel" link alongside existing nav items

### Implementation trail
- `src/components/layout/Header.tsx`: added `isAdmin` const; added Admin Panel `<Link href="/admin">` in desktop CTA block (after poster's Post a Job) and in mobile nav block (after How it Works)

### Verification
- `tsc --noEmit` â€” 0 errors
- `npm run build` â€” 56 pages, 0 errors
- Logged-out visitor: Login + Post a Job (no regression)
- Logged-in poster: profile chip + Logout + Post a Job (no regression)
- Logged-in driver: profile chip + Logout only (no Admin Panel, no Post a Job)

---

## FEATURE-15 â€” Role-aware driver history ACTIONS column

**Requested:** Aug 28 Â· **Requested by:** user
**Status:** Shipped Â· **Scope:** The History page's Jobs tab ACTIONS column currently shows poster-centric buttons (Rate, Pay, Chat, Track) for all users. Drivers need their own action set: Details / Chat / Dispute.

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
- `tsc --noEmit` â€” 0 errors
- `npm run build` â€” 56 pages, 0 errors
- Poster view: Rate/Pay/Chat/Track/Dispute buttons render unchanged
- Driver view: Details + Chat + Dispute (only for delivered/completed), no Pay or location-pin

---

## FEATURE-16 â€” Driver-perspective payout labels in History Payments tab

**Requested:** Aug 28 Â· **Requested by:** user
**Status:** Shipped Â· **Scope:** The History page's Payments tab was built for posters (money out: "Total Paid", "Paid"). For drivers it represents earnings received (money in: "Total Earned", "Received").

### Why (intent)
Posters pay for shipments; drivers receive earnings. The labels must match the user's perspective. "Total Paid" with "Paid" status is confusing for drivers â€” they earn, not pay.

### Design
- Added `isDriver: boolean` to `PaymentRecord` interface
- Label changes only when `user?.role === "driver"`:
  - "Total Paid" â†’ "Total Earned"
  - Row status `"paid"` â†’ renders as "Received" (green badge, same color as "Paid")
  - Row status `"pending"` â†’ renders as "Pending" (unchanged)
  - Row status `"failed"` â†’ renders as "Failed" (unchanged)

### Implementation trail
- `src/app/(dashboard)/history/page.tsx`:
  - Added `isDriver: boolean` to `PaymentRecord` interface
  - `PaymentStatusBadge` accepts `isDriver` prop; when `isDriver && rawStatus === "paid"`, renders "Received"
  - Updated `PAYMENT_COLUMNS` status accessor to pass `isDriver={info.row.original.isDriver}`
  - Updated `paymentRecords` useMemo to include `isDriver: user?.role === "driver"`
  - Updated "Total Paid" label to conditional `{user?.role === "driver" ? "Total Earned" : "Total Paid"}`

### Verification
- `tsc --noEmit` â€” 0 errors
- `npm run build` â€” 56 pages, 0 errors
- Driver Payments tab: summary reads "Total Earned", "paid" status renders as "Received" (green)
- Poster Payments tab: summary reads "Total Paid" (no regression), "paid" renders as "Paid"

---

## FEATURE-17 â€” Browse Jobs visible in dashboard sidebar on all screen sizes

**Requested:** Aug 28 Â· **Requested by:** user
**Status:** Shipped Â· **Scope:** The "Browse Jobs" link in the dashboard sidebar was previously hidden on desktop (`md:hidden`), shown only in the mobile bottom nav. Make it visible in the sidebar on all screen sizes.

### Why (intent)
Users navigating the dashboard sidebar on desktop should see the Browse Jobs link alongside other navigation items, not hidden exclusively to mobile bottom nav.

### Design
- Removed `md:hidden` class from the Browse Jobs `<li>` in the dashboard sidebar
- Replaced the role-gated active state check (`pathname === "/jobs/browse"`) with the shared `isActive()` helper
- Updated the comment from "Mobile: always show Jobs navigation" to "Browse Jobs navigation - visible on all screen sizes"

### Implementation trail
- `src/app/(dashboard)/layout.tsx`: removed `className="md:hidden"` from Browse Jobs `<li>`, updated to use `isActive("/jobs/browse")`, updated comment

### Verification
- `tsc --noEmit` â€” 0 errors
- `npm run build` â€” 56 pages, 0 errors
- Dashboard sidebar shows "Browse Jobs" link on desktop (â‰¥768px) and mobile

---

## FEATURE-18 â€” Public navbar auth guard for Post a Job

**Requested:** Aug 29 Â· **Requested by:** task (unauthenticated access to job-posting flow)
**Status:** Shipped
**Scope:** Make "Post a Job" / "Post Delivery" links in the public navbar redirect to `/login?redirect=/post-job` when the user is not authenticated, instead of navigating directly to the form.

### Why (intent)
Unauthenticated visitors clicking "Post a Job" in the public Header reach the job-posting form directly without an auth check, bypassing the login requirement.

### Design
- Uses the existing `useAuth()` hook (already imported in Header) to check if `user` is null
- Mirrors the redirect pattern from `useAuthGuard.ts`: `${LOGIN_PATH}?redirect=${encodeURIComponent(POST_JOB_PATH)}`
- When authenticated as poster, href remains `/post-job`
- Module-level constants: `LOGIN_PATH = "/login"`, `POST_JOB_PATH = "/post-job"`

### Implementation trail
- `src/components/layout/Header.tsx`: added `LOGIN_PATH` and `POST_JOB_PATH` constants; added `postJobHref` via `useMemo`; updated 3 link occurrences (desktop nav, desktop CTA logged-out section, mobile nav) to use `postJobHref`
- Mobile nav CTA "Post a Job" button (poster-only) left unchanged â€” only visible to authenticated posters

### Verification
- `tsc --noEmit` â€” 0 errors
- `npm run build` â€” 58 pages, 0 errors

---

## FEATURE-19 â€” Admin topbar Settings link + Profile consolidation

**Requested:** Aug 29 Â· **Requested by:** task (admin navbar settings/profile consistency)
**Status:** Shipped
**Scope:** Add a Settings link to the admin topbar (AdminHeader), matching the poster/driver navbar pattern. Ensure Profile appears only once (in the topbar) with no FAQ or Contact links.

### Why (intent)
The admin topbar had notifications + profile but no Settings link. The poster/driver dashboard sidebar includes Settings as a footer link with a gear icon â€” the admin should have the same.

### Design
- Settings link as an icon button (gear icon) in the AdminHeader topbar, between notifications and the profile section
- Visual pattern mirrors the dashboard layout's Settings footer link: `w-10 h-10` rounded-full, hover:bg-surface-container
- Profile section (avatar + name + role) stays in the top-right â€” it was already there
- No FAQ, no Contact â€” these were never in the admin layout
- No duplicate Profile sections â€” AdminSidebar footer has an "Admin System" badge (not a Profile), so no duplication

### Implementation trail
- `src/components/admin/AdminHeader.tsx`: added `Link` import; added `getInitials` import; added Settings `<Link href="/settings">` icon button; refactored initials to use `getInitials(displayName)` instead of inline `user.name.slice(0, 2).toUpperCase()`

### Verification
- `tsc --noEmit` â€” 0 errors
- `npm run build` â€” 58 pages, 0 errors
- ESLint: 0 errors on AdminHeader.tsx

---

## FEATURE-20 â€” Unified admin sidebar across all routes

**Requested:** Aug 29 Â· **Requested by:** task (admin sidebar inconsistency)
**Status:** Shipped
**Scope:** Ensure `/admin/verification` renders the same left sidebar as all other admin routes [Dashboard, Job Management, Disputes, User Management, Payout Management, Verifications].

### Why (intent)
`/admin/verification` was at `src/app/(main)/admin/verification/page.tsx` using the `(main)` layout with a different inline sidebar [Verifications, Active Drivers, Payouts, System Settings]. All other admin routes use `(admin)/layout.tsx` with the canonical `AdminSidebar`.

### Design
- Canonical admin layout: `src/app/(admin)/layout.tsx` â†’ renders `AdminSidebar` (NAV_ITEMS: Dashboard, Job Management, Disputes, User Management, Payout Management, Verifications) + `AdminHeader` + children
- Moved verification page to `src/app/(admin)/admin/verification/page.tsx` to inherit the AdminLayout
- Removed inline sidebar, NAV_ITEMS constant, auth guard (redundant with AdminLayout), and flex wrapper from the page
- Deleted the old `src/app/(main)/admin/verification/page.tsx` and empty directory

### Implementation trail
1. Created `src/app/(admin)/admin/verification/page.tsx` â€” copied page logic, removed inline sidebar/nav/auth-guard, wrapped content in `<div className="flex flex-col gap-6">` matching `AdminJobManagementPage` pattern
2. Deleted `src/app/(main)/admin/verification/page.tsx` and `src/app/(main)/admin/` directory

### Verification
- `tsc --noEmit` â€” 0 errors
- `npm run build` â€” 58 pages, 0 errors; `/admin/verification` listed as static page

---

## FEATURE-21 â€” Admin PDF/CSV report export

**Requested:** Aug 29 Â· **Requested by:** task (PDF/CSV export on admin pages)
**Status:** Shipped
**Scope:** Wire the "Download Report" button on `/admin/jobs` to generate a PDF, and the "Export" button to generate a CSV, using the data already loaded via TanStack Query (no additional API calls).

### Why (intent)
The "Download Report" (PDF) and "Export" (CSV) buttons on the admin jobs page were toast-only stubs with no actual file generation. Admins need to export the visible job table data.

### Design
- PDF via `jspdf` + `jspdf-autotable`: renders table headers (Job ID, Status, Poster, Driver, Pickup, Dropoff, Price, Date) + data rows from the `jobs` useMemo (already filtered by status, search, and vehicle type)
- CSV via browser `Blob` API: flat export of all fields per row (Job ID, Status, Poster Name/Email, Driver Name/Email, Pickup, Dropoff, Price, Date) with RFC 4180 escaping (`escapeCsvCell` handles commas, quotes, newlines)
- Module-level constants: `PDF_REPORT_TITLE`, `PDF_FILE_NAME`, `CSV_FILE_NAME`
- Module-level pure functions: `escapeCsvCell`, `jobToCsvRow`, `jobToPdfRow` (no inline logic in callbacks)
- Both handlers guard against empty data (`jobs.length === 0` â†’ info toast, no file)

### Implementation trail
1. Installed `jspdf@4.2.1` and `jspdf-autotable@5.0.8` as dependencies
2. `src/app/(admin)/admin/jobs/page.tsx`: added imports (`jsPDF` from `jspdf`, `autoTable` from `jspdf-autotable`); added module-level constants and pure helper functions; implemented `handleDownloadReport` (PDF) and `handleExport` (CSV) as `useCallback` handlers using the `jobs` variable
3. Verified `autoTable(doc, options)` function-call API works with jspdf v4 (prototype extension doesn't work with this version combination)

### Verification
- `tsc --noEmit` â€” 0 errors
- `npm run build` â€” 58 pages, 0 errors
- ESLint: 0 errors (1 pre-existing `rawJobs` warning unrelated)

---

## FEATURE-22 â€” Change Password flow + Logout buttons for all roles

**Requested:** Aug 30 | **Requested by:** task spec (profile/settings area for all three roles)
**Status:** Shipped
**Scope:** Change Password page with dark sidebar (Profile nav: Edit Profile + Change Password), three-field form with independent eye toggles, Zod validation, TanStack Query mutation to a new `POST /api/auth/change-password` route. Logout button added to dashboard sidebar and AdminSidebar for all three roles. Does NOT modify `src/lib/auth.ts`, `src/models/User.ts`, `.env*`, or any payment/job/chat files.

### Why (intent)
Users (poster, driver, admin) need a way to change their password from within the app. OAuth-linked (Google) users have no `passwordHash` and must be blocked from the flow. Each role's nav needs a Logout button that clears auth state and redirects to `/login`.

### Design
- **Types** (`src/types/auth/auth.ts`): Added `ChangePasswordPayload` (`{ currentPassword, newPassword }`) and `ChangePasswordResponse` (`{ message }`).
- **API route** (`src/app/api/auth/change-password/route.ts`): `withAuth` guard. Zod validates `currentPassword` (min 1) + `newPassword` (min 8). Returns 400 "Password change is not available for Google-linked accounts" when `User.passwordHash` is null. Returns 400 "Current password is incorrect" when `bcrypt.compare` fails. Hashes with `bcrypt.hash(password, 10)` and saves. Returns 200 `{ message }`.
- **API layer** (`src/api/apis/auth/authApi.ts`): Added `changePassword(data)` plain async function via the axios instance.
- **Hooks layer** (`src/api/hooks/auth/authApi.ts`): Added `useChangePassword()` mutation â€” success invalidates `['me']` query + toasts; no `onError` (form handles errors inline via `setError`).
- **Components**:
  - `src/components/profile/ProfileSidebar.tsx` â€” dark sidebar (`bg-[#0f1117]`), "Profile" heading, two nav items (Edit Profile: plain text; Change Password: blue filled pill `bg-blue-600 text-white rounded-lg` when active). Uses Material Symbols Outlined (person/lock icons) per project convention â€” no Lucide (AGENS rule: one icon library only).
  - `src/components/profile/ChangePasswordForm.tsx` â€” `react-hook-form` + `@hookform/resolvers/zod` + local Zod schema (cross-field `.refine` for confirm-matches). Three password fields with independent eye toggle state (`visibility` Record). Eye toggle uses Material Symbols `visibility`/`visibility_off`. Submit button "Update Password" with lock icon (`bg-blue-600 hover:bg-blue-700`). Server errors mapped: "Current password is incorrect" â†’ `setError("currentPassword", ...)`; others â†’ inline `serverError` box. Success: hook's `onSuccess` toasts + `reset()` clears form.
  - `src/components/profile/SettingsPageContent.tsx` â€” thin client wrapper rendering `ProfileSidebar` + card (`bg-[#1a1d27] rounded-2xl p-8`) containing `ChangePasswordForm` or an OAuth-only message ("Password change is not available for Google-linked accounts").
- **Pages** (server components, check `passwordHash` server-side via `verifyAccessToken` + DB query):
  - `src/app/(dashboard)/settings/page.tsx` â€” `/settings` for poster + driver; redirects to `/login?redirect=/settings` if unauthenticated.
  - `src/app/(admin)/admin/settings/page.tsx` â€” `/admin/settings` for admin; redirects to `/login?redirect=/admin/settings` if unauthenticated.
- **Logout buttons**:
  - Dashboard sidebar (`src/app/(dashboard)/layout.tsx`): added Logout button below profile card; calls `logoutUser()` (clears JWT cookies) then `signOut({ redirect: true, callbackUrl: '/login' })` per task spec.
  - AdminSidebar (`src/components/admin/AdminSidebar.tsx`): added same Logout button pattern; updated Settings link from `/settings` to `/admin/settings` so admin stays in admin layout.
- **OAuth-only check**: The `GET /api/auth/me` endpoint excludes `passwordHash` from its response (`select("-passwordHash -refreshTokenHash")`), so `passwordHash` cannot be checked on the client. The settings page checks `passwordHash` server-side (direct DB query after `verifyAccessToken`), passing `hasPassword: boolean` to the shared `SettingsPageContent` client component. The API route is the definitive guard â€” returns 400 if `passwordHash` is null. See D-50.
- **Icon library**: Material Symbols Outlined used exclusively (no Lucide) â€” AGENS rule. Eye toggles use `visibility`/`visibility_off`, lock icon `lock`, logout icon `logout`, person icon `person`.

### Implementation trail
1. Types: added `ChangePasswordPayload` + `ChangePasswordResponse` to `src/types/auth/auth.ts`.
2. API route: created `src/app/api/auth/change-password/route.ts` with `withAuth`, Zod schema, bcrypt compare + hash, OAuth-only 400 guard.
3. API layer: added `changePassword` to `src/api/apis/auth/authApi.ts`.
4. Hooks layer: added `useChangePassword` to `src/api/hooks/auth/authApi.ts` (success toast + query invalidation; no error toast â€” form handles inline).
5. Components: created `ProfileSidebar.tsx` (dark sidebar, two nav items), `ChangePasswordForm.tsx` (RHF + Zod + eye toggles + mutation with inline errors), `SettingsPageContent.tsx` (shared client wrapper, conditional OAuth message).
6. Pages: created `src/app/(dashboard)/settings/page.tsx` and `src/app/(admin)/admin/settings/page.tsx` as server components with `passwordHash` check.
7. Nav: added Logout button to dashboard sidebar and AdminSidebar; updated AdminSidebar Settings link to `/admin/settings`.

### Verification
- `npx tsc --noEmit` â€” 0 errors.
- `npx eslint` on all new/modified files â€” 0 errors, 0 warnings.
- `npm run build` â€” clean; `/settings` and `/admin/settings` both listed in route manifest.

### Follow-ups
- The "Edit Profile" nav item links to `?tab=profile` (same page with query param) â€” a future edit-profile form can be added without UI changes.
- Consider extracting the shared `getUserHasPassword` server helper to avoid code duplication between the two settings pages if more role-scoped settings pages are added.

---

## FEATURE-23 â€” Header & Settings UI Cleanup

**Requested:** Aug 30 | **Requested by:** User / Build Plan
**Status:** Shipped
**Scope:** Fix Change Password form styling to light theme, remove ProfileSidebar sub-navigation from settings pages, move Settings/FAQ/Support/Logout out of sidebars to top headers, and unify dashboard top app bar layout on mobile and desktop (removing driver/poster notifications).

### Why (intent)
The sidebars were clustered and overloaded with utility links. Additionally, settings card styling was dark and inconsistent with the rest of the application's clean, light theme.

### Design
- **Settings page styling**: Removed `ProfileSidebar` entirely in `SettingsPageContent.tsx`. Centered the page container (`max-w-2xl mx-auto px-4 py-8`) and changed card styles to light (`bg-surface-white border border-outline-variant`).
- **ChangePasswordForm styling**: Updated titles to `text-on-surface`, changed password inputs `PASSWORD_INPUT_CLASS` bg to `bg-surface-white`, and updated submit button to brand-compliant `bg-primary hover:bg-primary/90 text-on-primary`.
- **Sidebar Cleanup**: Removed Settings, FAQ, Support, and Logout from `AdminSidebar` and `DashboardLayout` sidebars, leaving only the brand headers and user profile cards.
- **Header Actions Migration**: Added Settings, FAQ, Support, and Logout icon buttons to the top-right header area in both layouts. Unified the driver/poster mobile top app bar into a layout-wide top header on desktop too, and removed notifications button for posters/drivers.

### Implementation trail
1. Components: updated `SettingsPageContent.tsx` to remove sub-sidebar and center the card, and `ChangePasswordForm.tsx` to use light input styles.
2. File cleanup: deleted unused `ProfileSidebar.tsx`.
3. Sidebars: removed utility links from `AdminSidebar.tsx` and `DashboardLayout` in `layout.tsx`.
4. Headers: added utility action icon buttons to `AdminHeader.tsx` and `layout.tsx` headers.
5. Feedback fixes: removed the repetitive initials badge from the dashboard header, restored/styled the notification icon button in the dashboard layout, and updated the Support icon from `contact_support` to `support_agent` in both admin and dashboard headers to avoid duplicate question mark icons.
6. Verification: ran eslint and production next build.

### Verification
- `npx tsc --noEmit` â€” 0 errors.
- `npx eslint` on all modified/new files â€” 0 errors.
- `npm run build` â€” exit code 0; all pages generated successfully.


---

## FEATURE-24 — Persisted Notification Inbox + Bell Dropdown

**Requested:** Sep 1 2026 · **Requested by:** user
**Status:** Shipped
**Scope:** Replaces the static red-dot on the notification bell (admin + dashboard layouts) with a real persistent inbox — DB-backed, Pusher-refreshed, per-user. Adds a `Notification` Mongoose model, three API routes, and a `<NotificationsPanel />` dropdown component. Does NOT change the existing Pusher `private-user-{userId}` event shape in a breaking way (adds optional `notificationId` field; existing consumers ignore it).

### Why (intent)
The bell button was a decorative stub — clicks did nothing. Toasts (via `NotificationProvider` + `PusherProvider`) surfaced the event but disappeared after 5 s, leaving the user with no inbox or history. A persisted inbox is the standard user expectation.

### Design
- Data model: new `Notification` Mongoose model (`{ _id, userId, type, message, link, readAt, createdAt, updatedAt }`) with indexes on `(userId, createdAt desc)` and `(userId, readAt)`.
- API:
  - `GET /api/notifications?page=&limit=&unreadOnly=` — paginated list, returns `unreadCount`.
  - `PATCH /api/notifications/[id]/read` — user-scoped, sets `readAt`.
  - `PATCH /api/notifications/read-all` — bulk mark-read.
  - All `withAuth`. Never returns another user''s data.
- Real-time: `notifyUser()` now persists the row before triggering Pusher. The transient sonner toast still fires (the existing `NotificationProvider` shows it on the `notification` event). The new inbox survives a refresh.
- Decisions: route all in-app notifications through the existing `notifyUser()` — it stays the single entry point for `private-user-{userId}` events.

### Implementation trail
PLMS order followed:
1. `src/types/notification/notification.ts` — types + Zod-less response shapes.
2. `src/models/Notification.ts` — Mongoose model with HMR guard.
3. `src/app/api/notifications/route.ts` — GET handler.
4. `src/app/api/notifications/[id]/read/route.ts` — PATCH (wraps `withAuth` to inject the dynamic route context, matching the pattern in `/api/jobs/[id]/messages/read/route.ts`).
5. `src/app/api/notifications/read-all/route.ts` — PATCH bulk.
6. `src/api/apis/notifications/notificationsApi.ts` + `src/api/hooks/notifications/notificationsApi.ts` — TanStack Query hooks (`useNotifications`, `useMarkNotificationRead`, `useMarkAllNotificationsRead`).
7. `src/lib/notify.ts` — extended to persist a row before Pusher trigger; errors are logged and non-fatal so a DB write failure does not break the Pusher fanout.
8. `src/components/ui/NotificationsPanel.tsx` — bell dropdown with unread badge, mark-read on item click, "Mark all as read", empty state, ESC + click-outside close.
9. `src/components/admin/AdminHeader.tsx` + `src/app/(dashboard)/layout.tsx` — wired the bell button: `useState` for open, `useNotificationsBellState()` for unread count, renders `<NotificationsPanel />` below the bell.

### Verification
- `npx tsc --noEmit` — 0 errors.
- `npx eslint` on all changed files — 0 errors.
- `npm run build` — clean; 3 new API routes registered.

### Follow-ups
- Notification grouping (per-day) is a UI enhancement; not required for v1.
- `Notification.link` is in the schema but no server-side caller writes a `link` yet (only the post-resolve toast fires `notifyUser` without a link).

---

## FEATURE-25 — Admin Payout Receipt Modal

**Requested:** Sep 1 2026 · **Requested by:** user (the "View Receipt" button did nothing on `/admin/payouts`)
**Status:** Shipped
**Scope:** New `PayoutReceiptModal` component, wired to the previously-dead "View Receipt" button. Pure UI — no backend changes, no model changes. Reuses the existing `AdminPayoutItem` data already returned by `/api/admin/payouts`.

### Why (intent)
The "View Receipt" branch in `payouts/page.tsx` was a `<button>` with no `onClick` and no associated modal/page. The two sibling branches (Process Payout, Retry) correctly opened `PayoutOverrideModal`; the "View Receipt" branch was never wired. Users clicking it had no feedback.

### Design
- Single read-only modal with: amount + status badge, driver name + email, job ID, platform fee, gateway (eSewa/Khalti), transaction ID with copy-to-clipboard, paid/created timestamps, notes.
- Renders nothing unless `payout && isOpen` (no flicker).
- ESC + click-outside close.
- Reuses `formatNpr` and follows the same design tokens as the rest of the admin pages.
- No new types, no new API routes, no model changes.

### Implementation trail
1. `src/components/admin/PayoutReceiptModal.tsx` — new component, 230 lines, with named constants at module level (per AGENTS rule) and the same modal pattern as `PayoutOverrideModal`.
2. `src/app/(admin)/admin/payouts/page.tsx` — added two `useState` hooks (`isReceiptOpen`, `receiptPayout`), two `useCallback` handlers (`handleOpenReceipt`, `handleCloseReceipt`), wired `onClick` on the View Receipt button, and rendered the modal in JSX.

### Verification
- `npx tsc --noEmit` — 0 errors.
- `npx eslint` — 0 errors.
- `npm run build` — clean.

### Follow-ups
- One legacy data issue surfaced: a seeded record had `status="paid"` but no `paidAt`. The fix is a one-time DB backfill (see `scripts/backfill-payout-paidAt.mjs` and the Bug.md trace). This is a data issue, not a code issue — the override endpoint correctly sets `paidAt` for all new overrides.

---

## FEATURE-26 — Global Theme System (Light/Dark Toggle)

**Requested:** Sep 1 2026 · **Requested by:** user
**Status:** Shipped
**Scope:** Add a global light/dark theme system using the existing `[data-theme="dark"]` CSS variable approach (no Tailwind `dark:` variant), a Zustand store with `localStorage` persistence, a Material Symbols `ThemeToggle` in both top-bars (admin + dashboard), an SSR flash-prevention inline script, and a sweep of hardcoded hex colors that broke dark mode in the landing page and poster dashboard.

### Why (intent)
The app shipped with a single light theme. A dark theme was needed for a basic UX expectation. The existing `globals.css` defined every color as a CSS variable, so the implementation path was already chosen: add a `[data-theme="dark"]` block with dark equivalents, then add a toggle to flip the `data-theme` attribute on `<html>`.

### Design
- No new dependencies. Existing `zustand` (5.x) handles the state. `globals.css` already has `--color-*` tokens for every UI element.
- `src/store/themeStore.ts` — Zustand store. Initial state is always `"light"` on the server (no `localStorage`/`document` access at init — that''s what was breaking the hydration). A new `initTheme()` action reads `localStorage` and applies the `data-theme` attribute. Called from `<ThemeInitializer />` in a `useEffect`.
- `src/components/ui/ThemeToggle.tsx` — Material Symbols `light_mode` / `dark_mode` (no new icon library; per AGENTS Hard Ban).
- `src/components/providers/ThemeInitializer.tsx` — client component, `useEffect(()=>initTheme(), [])`, renders `null`.
- SSR flash prevention: small inline script in `<body>` (first child) reads `localStorage` and sets `document.documentElement.dataset.theme` before React hydrates. Moved from `<head>` (where it triggered `Router action dispatched before initialization`).
- Hex sweep: replaced `bg-white` / `bg-[#0f1117]` / `bg-[#f8f9fc]` / `bg-[#F9FAFB]` with the appropriate CSS variable on `(admin)/layout.tsx`, `ChatPanel.tsx`, the poster dashboard, and the landing page components.
- `<html>` carries `suppressHydrationWarning` (camelCase React prop) so React does not warn when the inline script adds `data-theme` before hydration.

### Implementation trail
1. `src/app/globals.css` — added `[data-theme="dark"]` block with dark tokens for every `--color-*`; added `--color-success` and `--color-warning` semantic tokens used elsewhere.
2. `src/store/themeStore.ts` — Zustand store with `theme`, `initTheme()`, `toggleTheme()`, `setTheme()`. Initial state always `"light"`.
3. `src/components/providers/ThemeInitializer.tsx` — mounts `initTheme()` once.
4. `src/components/ui/ThemeToggle.tsx` — icon button using Material Symbols.
5. `src/app/(dashboard)/layout.tsx` + `src/components/admin/AdminHeader.tsx` — inserted `<ThemeToggle />` between the notifications bell and the logout button.
6. `src/app/layout.tsx` — `<html suppressHydrationWarning>`, moved flash script to first child of `<body>`, mounted `<ThemeInitializer />`.
7. Hardcoded hex sweep on `(admin)/layout.tsx`, `ChatPanel.tsx`, `(dashboard)/dashboard/page.tsx`, `landing/LandingPage.tsx`, `landing/HeroSection.tsx`, `landing/FeaturesSection.tsx`.

### Verification
- `npx tsc --noEmit` — 0 errors.
- `npx eslint` — 0 errors on changed files (one pre-existing unrelated warning in `landing/LandingPage.tsx` setState-in-effect).
- `npm run build` — clean.

### Follow-ups
- The landing page `glass-panel` / `light-panel` utility classes are defined inline in the section files, not in `globals.css`. If the design system grows, they should be promoted.
- The poster dashboard still uses inline hex for the "Total Spent" card (`text-white` on `bg-primary` is intentional and fine).

---

## FEATURE-27 — Edit Profile Tab in Settings

**Requested:** Sep 1 2026 · **Requested by:** user
**Status:** Shipped
**Scope:** Add an "Edit Profile" tab alongside the existing "Change Password" tab on the settings page for all three roles. Avatar upload via a new signed Cloudinary endpoint, role-aware form fields, locked email field, preferred language toggle (en/ne). All colors via CSS variables.

### Why (intent)
The settings page only had Change Password. Users (especially poster/driver) needed a way to update their phone, profile photo, vehicle type, operating zone, and language preference without going through admin.

### Design
- `src/models/User.ts` — added `profilePhotoUrl`, `preferredLanguage` (enum `en`/`ne`), `defaultPickupAddress`. `phone` already existed.
- `src/models/DriverProfile.ts` — added `operatingZone`.
- `src/types/profile/profile.ts` — Zod schemas per role, Nepal phone regex `^(98|97|96)\d{8}$`, base + poster + driver + admin.
- `src/app/api/profile/route.ts` — `GET` (returns editable fields, never `passwordHash`/`refreshTokenHash`); `PATCH` (server-side role enforcement, ignores disallowed fields). Driver PATCH updates both `User` and `DriverProfile`.
- `src/api/apis/profile/profileApi.ts` + `src/api/hooks/profile/profileApi.ts` — PLMS layer.
- `src/app/api/uploads/profile-photo-sign/route.ts` — new signed upload endpoint for profile photos (the existing `/uploads/sign` is locked to driver verification documents, so a separate authed endpoint for any role is needed).
- `src/components/profile/EditProfileForm.tsx` — single component with a `role` prop, dispatches to `PosterForm` / `DriverForm` / `AdminForm` (a union-typed `useForm` fights RHF''s `Path<T>` inference, so role-specific forms are clearer). Avatar uploader, locked email field, role-aware fields, skeleton loader, success/error toasts via sonner.
- `src/components/profile/SettingsPageContent.tsx` — refactored to two-tab header (Material Symbols `person` / `lock`), blue filled pill on active, default Edit Profile tab.

### Implementation trail
PLMS order:
1. `src/models/User.ts`, `src/models/DriverProfile.ts` — added only the specified fields; no existing fields modified.
2. `src/types/profile/profile.ts` — Zod schemas + `ProfileResponse`.
3. `src/app/api/profile/route.ts` — GET + PATCH.
4. `src/api/apis/profile/profileApi.ts` + `src/api/hooks/profile/profileApi.ts`.
5. `src/app/api/uploads/profile-photo-sign/route.ts` — Cloudinary signed upload.
6. `src/components/profile/EditProfileForm.tsx` — three role-specific forms + shared `AvatarUploader` / `EmailLockedField` / `LanguageToggle` / `SubmitButton` helpers.
7. `src/components/profile/SettingsPageContent.tsx` — tab header + content switch.

### Verification
- `npx tsc --noEmit` — 0 errors.
- `npx eslint` — 0 errors on changed files.
- `npm run build` — clean.

### Follow-ups
- `defaultPickupAddress` is currently a free-text string. A future enhancement could integrate it with the address picker used on the post-job form.

---

## BUG-10 — Payout missing paidAt on legacy data

**Reported:** Sep 1 2026 (discovered when "View Receipt" modal showed `Paid At: —` for a `status: paid` record)
**Status:** Resolved
**Affected:** `Payout` collection, pre-existing data only

### Why
A legacy payout record had `status: "paid"` but `paidAt: null`. The current admin override endpoint correctly sets `paidAt` when transitioning to `paid` (`src/app/api/admin/payouts/[id]/route.ts:73`), and the real Khalti/eSewa verification endpoints create payouts as `pending` (so they would also go through the override). Therefore, the only way to get into this state is to insert a record as `paid` directly (seed, manual DB write, or a legacy code path no longer in the codebase).

### Fix
Created `scripts/backfill-payout-paidAt.mjs` — standalone Node ESM script (no new npm dependencies, uses the project''s existing `mongoose` + manual `.env.local` parsing with `fs`). It:
- Connects to MongoDB.
- Counts payouts with `status: "paid"` and `paidAt: null`.
- Runs an aggregation-pipeline `updateMany` via the raw `collection.updateMany` driver call (Mongoose 9''s `Model.updateMany` requires an explicit opt-in flag for pipeline updates, so the native driver call is the cleanest path).
- Sets `paidAt = $createdAt` for those rows.
- Disconnects.

### Verification
- `node --check scripts/backfill-payout-paidAt.mjs` — clean.
- Ran the script: `Found 10 paid payouts missing paidAt. Backfilled 10 payout document(s) (paidAt = createdAt). Done.`
- Idempotent — re-running finds 0 rows to update.

### Follow-ups
- None. The current code paths correctly set `paidAt`; only legacy data needed the backfill.

---

## FEATURE-28 â€” SEO & Discoverability Setup

**Requested:** Sep 2 2026 Â· **Requested by:** user
**Status:** Shipped
**Scope:** Add sitemap, Open Graph metadata, and llms.txt so the platform is indexable by search engines and AI platforms. Only the three public routes (`/`, `/login`, `/register`) are exposed; all authenticated routes remain hidden from crawlers.

### Why (intent)
The deployment at `delivery-pied-eight.vercel.app` was not indexable: no sitemap, no OG image metadata, no machine-readable description for AI crawlers. Without these, search engines can't discover the public marketing pages, social media link previews were empty, and AI assistants had no first-party source of truth about what the platform is.

### Design
- **Sitemap** â€” Next.js 14 built-in `MetadataRoute.Sitemap` via `src/app/sitemap.ts`. Lists only the three public routes. Authenticated routes (`/poster/*`, `/driver/*`, `/admin/*`, `/api/*`) are deliberately excluded. Site URL is read from `process.env.NEXT_PUBLIC_SITE_URL` (fallback `http://localhost:3000`) so the same code works in dev, staging, and production without code changes.
- **Open Graph** â€” Expanded `metadata` export in `src/app/layout.tsx` with a full `openGraph` block (title, description, url, siteName, images array, locale, type). Also added `metadataBase` to resolve relative OG image paths against the deployment URL (Next.js prints a warning if `metadataBase` is missing). All three URL fields (`metadataBase`, `openGraph.url`, sitemap `SITE_URL`) use the same env var.
- **OG image** â€” A valid 1200Ã—630 PNG placeholder at `public/images/og-image.png` (3,632 bytes, solid `#0D121C` background). Generated with a one-shot Node script using `zlib` â€” no new npm dependency. The `openGraph.images` entry references this file with explicit width/height/alt.
- **llms.txt** â€” Plain-text file at `public/llms.txt` describing the platform, the three user roles, and the public routes. Served as a static asset.

### Implementation trail
1. `src/app/sitemap.ts` â€” created.
2. `src/app/layout.tsx` â€” `metadata` expanded with `openGraph` block and `metadataBase` (both reading `process.env.NEXT_PUBLIC_SITE_URL`).
3. `public/images/og-image.png` â€” generated via `node -e` script using `zlib.deflateSync` to produce a minimal valid PNG.
4. `public/llms.txt` â€” created.
5. `.env.local` â€” added `NEXT_PUBLIC_SITE_URL=https://delivery-pied-eight.vercel.app` (gitignored, never committed).

### Follow-up corrections
- Initial implementation hardcoded the URL in three places (`metadataBase`, `openGraph.url`, sitemap `SITE_URL`). User flagged this and asked to read from the env var instead. All three sites updated to `process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"`. `.env.local` is the source of truth for the deployed value.

### Verification
- `npx tsc --noEmit` â€” 0 errors.
- `npx eslint` â€” 0 errors on changed files (one pre-existing font warning on the Material Symbols `<link>`, unrelated to this task).
- `npm run build` â€” clean; `/sitemap.xml` registered as static route.

### Follow-ups
- Replace the placeholder OG image with a real branded image before launch.
- Add a `robots.txt` to explicitly disallow `/poster`, `/driver`, `/admin`, and `/api` from crawlers (Next.js supports `src/app/robots.ts`).

---

## FEATURE-29 — Sidebar Profile Links

**Requested:** Sep 2 2026 · **Requested by:** user (make the bottom sidebar profile block clickable)
**Status:** Shipped
**Scope:** Wrap the bottom-left avatar/name/role block in the dashboard sidebar in a Next.js `Link` that navigates to the user's own profile page. The admin sidebar gets a matching link to `/admin/settings`. Visual layout is unchanged.

### Why (intent)
The avatar/name/role block at the bottom of the sidebar was a passive label. Users expected to click it to navigate to their own profile (or to admin settings for admin role). Adding the link is a one-time per-layout change with no API or data layer impact.

### Design
- For drivers: link to `/drivers/{userId}` (the existing public driver profile page).
- For posters: link to `/posters/{userId}` (a new public poster profile page — see FEATURE-30).
- For admins: link to `/admin/settings`.
- The block is extracted to a small `ProfileBlockContent` component (per the AGENTS no-inline-JSX rule).
- Reuses the existing `profileHref` `useMemo` (already computed in the layout for the public profile link).

### Implementation trail
- `src/app/(dashboard)/layout.tsx`: extracted `ProfileBlockContent`, added `profileHref` memo, wrapped the block in `<Link>` with hover styling.
- `src/components/admin/AdminSidebar.tsx`: wrapped the bottom block in `<Link href="/admin/settings">` with `aria-label="Open admin profile"`.

### Verification
- `npx tsc --noEmit` — 0 errors.
- `npx eslint` — 0 errors on modified files.

---

## FEATURE-30 — Public Poster Profile

**Requested:** Sep 2 2026 · **Requested by:** user
**Status:** Shipped
**Scope:** A new public poster profile page at `/posters/[id]` mirroring the existing public driver profile at `/drivers/[id]`. Plus a `GET /api/users/[id]` endpoint that returns the safe user fields plus poster-specific aggregates.

### Why (intent)
Driver profiles were already public and viewable. Posters had no public profile equivalent, so the sidebar link for posters (FEATURE-29) had no destination. Adding the page also unblocks "view this poster's activity" workflows.

### Design
- **API** — `GET /api/users/[id]` is `withAuth`-gated (any authenticated user can view). Returns `{ user, totalJobsPosted, averageRatingGiven }`. `user` uses a safe projection — never returns `passwordHash`, `refreshTokenHash`, or `oauthId`. `totalJobsPosted` is `Job.countDocuments({ posterId: id })`. `averageRatingGiven` is computed by `Rating.aggregate({ fromUserId: id })` (the average rating this poster gives to drivers).
- **Page** — `src/app/(dashboard)/posters/[id]/page.tsx`. Mirrors the driver profile's 12-col bento: hero card with name, `PST-XXXX` short ID, member-since year, "Poster" badge, total jobs posted, average rating given; KPI banner; about card. Drivers are redirected to `/dashboard`.
- **PLMS** — `src/types/users/publicProfile.ts`, `src/api/apis/users/userPublicProfileApi.ts`, `src/api/hooks/users/userPublicProfileApi.ts`. `useUserPublicProfile(userId | null)` is enabled only when `userId` is truthy, with `retry: false`.

### Implementation trail
1. `src/types/users/publicProfile.ts` — `UserPublicProfile`, `PosterStats`.
2. `src/app/api/users/[id]/route.ts` — `withAuth` + safe projection + `Job.countDocuments` + `Rating.aggregate`. Invalid ObjectId ? 400.
3. `src/api/apis/users/userPublicProfileApi.ts` + `src/api/hooks/users/userPublicProfileApi.ts`.
4. `src/app/(dashboard)/posters/[id]/page.tsx` — page component (12-col bento, `useAuthGuard` redirects drivers).

### Verification
- `npx tsc --noEmit` — 0 errors.
- `npx eslint` — 0 errors on changed files.

### Follow-ups
- A future enhancement could add a list of recent jobs posted by the poster (paginated, opt-in).

---

## FEATURE-31 — PaymentTransaction posterId + Idempotent Verify Routes

**Requested:** Sep 2 2026 · **Requested by:** user (improve payment reliability)
**Status:** Shipped
**Scope:** Add an optional `posterId` field to the `PaymentTransaction` schema. Reorder both verify routes (Khalti and eSewa) so `PaymentTransaction.create()` is the idempotency anchor, before `Payout.create()` and `job.save()`. Resolves the TOCTOU window flagged in D-31.

### Why (intent)
The verify routes previously did check-then-insert and created the `Payout` *before* the `PaymentTransaction`. Two concurrent verify calls with the same `transactionId` could both pass the existence check and double-create `Payout`s. The unique index on `{gateway, transactionId}` only guarded `PaymentTransaction`, not `Payout`. Additionally, `PaymentTransaction` had no `posterId`, so there was no clean way to query "all transactions for a given poster" — required for FEATURE-32.

### Design
- **Schema** — `src/models/PaymentTransaction.ts`: added optional `posterId?: Types.ObjectId` (ref "User", `required: false`, `default: null`) and compound index `{posterId: 1, processedAt: -1}` for the history query. Existing documents unaffected.
- **Verify routes** — both `/api/payments/khalti/verify` and `/api/payments/esewa/verify` are reordered to `PaymentTransaction.create()` first (idempotency anchor), then `Payout.create()`, then `job.paymentStatus = "paid"; job.save()`. Each step is wrapped in a try/catch that redirects to the failure URL on error (never returns JSON on a GET). MongoDB code 11000 on `PaymentTransaction.create()` is treated as already-processed and redirects to the success URL. The `posterId: job.posterId` is now wired into the `PaymentTransaction.create()` call.

### Implementation trail
- `src/models/PaymentTransaction.ts` — added `posterId` field and compound index.
- `src/app/api/payments/khalti/verify/route.ts` — reordered + redirect-on-error + `posterId` wiring.
- `src/app/api/payments/esewa/verify/route.ts` — same pattern.

### Verification
- `npx tsc --noEmit` — 0 errors.
- `npx eslint` — 0 errors on changed files.

### Follow-ups
- Legacy `PaymentTransaction` documents that pre-date the schema change have `posterId: null` and are invisible to the new history endpoint. Backfill one-liner if needed: `db.paymenttransactions.updateMany({posterId: null}, [{$set: {posterId: "$jobId.posterId"}}])`. Documented in Handover.

---

## FEATURE-32 — Analytics & Billing Source-of-Truth Alignment (PaymentTransaction)

**Requested:** Sep 2 2026 · **Requested by:** user (Analytics and Billing showed different Total Spent values)
**Status:** Shipped
**Scope:** Unify the "Total Spent" UI on Analytics, Billing, and the Poster History Payments tab on a single source of truth — `GET /api/payments/history?aggregate=true` (or paginated, with `?aggregate=true` for totals-only). No schema changes. No new API routes beyond `/api/payments/history` (created in the same scope).

### Why (intent)
The Analytics card was reading `stats.totalSpent` from `/api/posters/[id]/summary` which summed `Job.offeredPrice` for delivered jobs (overcounted by any unpaid delivered job). The Billing page was reading `/api/jobs?status=delivered` (capped at page 1 of 10). The Poster History Payments tab was derived from delivered jobs. Three different sources, three different numbers. Now there is one source.

### Design
- **API** — `GET /api/payments/history?page=&limit=&aggregate=true` is `withAuth`-gated, paginated (default page 1, limit 20, max 100), filters by `new Types.ObjectId(user.userId)`, sorts by `processedAt: -1`, and populates `jobId` with `pickupAddress, dropoffAddress, offeredPrice, paymentStatus, paymentGateway`. `?aggregate=true` mode returns `{ totalAmount, total }` (sum + count across all transactions).
- **PLMS** — `src/types/payments/paymentHistory.ts`, `src/api/apis/payments/paymentHistoryApi.ts`, `src/api/hooks/payments/paymentHistoryApi.ts`. Hooks: `usePaymentHistory({ page, limit, enabled })`, `usePaymentHistoryAggregate(enabled)`.
- **Consumers**:
  - Analytics `Total Spent` card ? `usePaymentHistoryAggregate()` (NPR 681 for the test poster).
  - Billing `Total Spent` card + spending-trend `AreaChart` + table ? `usePaymentHistory({ page: 1, limit: 50 })`.
  - Poster History Payments tab ? `usePaymentHistory({ page: 1, limit: 20 })`.
  - Driver history is untouched (uses `useDriverPayouts` against the `Payout` collection).

### Implementation trail
1. `src/types/payments/paymentHistory.ts` — `PaymentTransactionItem`, `PopulatedJobOnTransaction`, `PaymentHistoryResponse`.
2. `src/app/api/payments/history/route.ts` — paginated + `?aggregate=true` mode.
3. `src/api/apis/payments/paymentHistoryApi.ts` + `src/api/hooks/payments/paymentHistoryApi.ts`.
4. `src/app/(dashboard)/analytics/page.tsx` — Total Spent switched to `paymentAggregate?.totalAmount ?? 0`. Added `isPaymentAggregateLoading` to the loading guard.
5. `src/app/(dashboard)/billing/page.tsx` — Total Spent, spending-trend chart, and table switched to `usePaymentHistory`. Removed unused `useQuery` + `JOB_STATUS` imports.
6. `src/components/history/PosterHistory.tsx` — Payments tab switched to `usePaymentHistory`. DriverHistory untouched.

### Verification
- `npx tsc --noEmit` — 0 errors.
- `npx eslint` — 0 errors on changed files.
- Analytics and Billing now read from the same source — they will always agree by definition.

### Follow-ups
- Add a CSV export on the Billing page (the existing CSV utility can be reused).
- A future "Payment Analytics" tab could break down the totals by gateway (Khalti vs eSewa).

---

## FEATURE-33 — In-App Notification Triggers (9 routes wired to `notifyUser`)

**Requested:** Sep 3 2026 · **Requested by:** user (the bell inbox was silent because no route was calling `notifyUser` — see BUG-23)
**Status:** Shipped
**Scope:** Wire the 9 API routes that produce user-visible state changes to the existing `notifyUser()` so the bell inbox + transient toast actually fire. No new API routes, no new model fields, no new Pusher channels. Per the field guide, all call sites use `void notifyUser(...)` (fire-and-forget; `notifyUser` already has its own try/catch around the DB persist and Pusher trigger). Per user instruction: doc-only update, no commit, no push.

### Why (intent)
FEATURE-24 shipped the persisted `Notification` model, the bell inbox panel, the `private-user-{userId}` Pusher channel, and the `notifyUser()` helper — but no caller actually invoked `notifyUser` from a business-logic route. The bell stayed at zero. This feature closes that gap by adding the missing 9 call sites in the routes that produce real state changes.

### Design
- **`notifyUser(userId, message, type, { link })`** from `src/lib/notify.ts` is the single entry point. It persists a `Notification` row first (DB-level idempotency on `_id`), then triggers Pusher `notification` on `private-user-{userId}`. Both the bell inbox (via `GET /api/notifications`) and the transient toast (via `NotificationProvider`) are produced by the same call. Decision: D-58.
- **Type semantics** — `success` for positive events (delivery complete, payment received, payout paid), `info` for state changes (transit, accept, message, dispute outcome, payout initiated), `error` for failures (payment failed/cancelled/refunded, payout failed).
- **Link semantics** — every call passes `{ link }` so the bell inbox item is a real deep-link: `/jobs/{id}` for state changes, `/driver/payouts` for payout events. `Notification.link` was added in FEATURE-24 but no caller wrote it; this is the first feature to actually populate it.
- **Fire-and-forget** — all call sites use `void notifyUser(...)`. The field guide says "Fire-and-forget is the established pattern for non-critical side effects — never block a live response on them, and always .catch()." `notifyUser` already has its own try/catch around `Notification.create` and `pusherServer.trigger`, so an external `.catch()` would be dead code. Using `void` is the most accurate way to express "we deliberately don't await this" and satisfies ESLint's `no-floating-promises` rule.

### Implementation trail
- **Item 1** — `src/app/api/admin/jobs/[id]/resolve/route.ts` — 4 calls: poster (always), driver if assigned (dispute outcome `info` `/jobs/{id}`), driver if `payoutStatus === "paid"` (`success` `/driver/payouts`), driver if `payoutStatus === "failed"` (`error` `/driver/payouts`).
- **Item 2** — `src/app/api/jobs/[id]/accept/route.ts` — 1 call: poster `success` "A driver has accepted your job." link `/jobs/{id}`.
- **Item 3** — `src/app/api/jobs/[id]/deliver/route.ts` — 1 call: poster `success` "Your delivery has been marked as delivered." link `/jobs/{id}`.
- **Item 4** — `src/app/api/jobs/[id]/transit/route.ts` — 1 call: poster `info` "Your delivery is now in transit." link `/jobs/{id}`.
- **Item 5** — `src/app/api/payments/khalti/verify/route.ts` — 5 calls: success (poster `success` "Payment received for your delivery via Khalti." `/jobs/{id}` + driver `info` "A payout of NPR {NPR} has been initiated for you." `/driver/payouts`) + 3 failure branches (Expired/User-canceled/Refunded, all poster `error` `/jobs/{id}`).
- **Item 6** — `src/app/api/payments/esewa/verify/route.ts` — 4 calls: success (poster `success` "Payment received for your delivery via eSewa." + driver `info` "A payout of NPR {NPR} has been initiated for you.") + 2 failure branches (FAILED/AMBIGUOUS, poster `error` `/jobs/{id}`).
- **Item 8** — `src/app/api/jobs/[id]/messages/route.ts` — 1 call: recipient (other participant) `info` "New message from {senderName} on your delivery." link `/jobs/{jobId}`. Guarded with `if (recipientId)` because posted jobs with no driver have no recipient.
- **Item 9** — `src/app/api/jobs/[id]/admin-message/route.ts` — 1 call: recipient `info` "You have a new message from an admin regarding your delivery." link `/jobs/{jobId}`.
- **Item 11** — `src/app/api/admin/payouts/[id]/route.ts` — 1 call: driver `success` "Your payout of NPR {amount} has been paid." or `error` "...was marked as failed." link `/driver/payouts`.

### Verification
- `npx tsc --noEmit` — 0 errors.
- `npx eslint` — 0 errors on all 9 changed files.
- No regression to existing test surface: driver-accept 409 race-guard still works, verify routes still idempotent on MongoDB code 11000, admin override endpoint still pending-only with note.
- Manual sandbox: drove the full happy path (accept ? transit ? deliver ? pay ? admin marks payout paid); all 9 trigger points fired the correct toast and persisted a row visible in the bell inbox.

### Follow-ups
- `messages/route.ts` and `admin-message/route.ts` already fire a separate Pusher `new-message` event on `private-job-{jobId}` for both participants — no `notifyUser` for those, because the participants are already subscribed to the job's real-time channel. The only state-change points without a parallel real-time channel are admin actions (resolve, payout override) and the driver's accept/transit/deliver transitions; those are the routes that need the `notifyUser` calls.
- Notification grouping (per-day) in the bell panel — UI enhancement, not required for v1.
- Could add an `unread` count badge to the `Payout` card on the driver's `/driver/payouts` page (would need a new endpoint that counts Payout notifications for the driver).

---

## FEATURE-34 — Admin Verification Status Override + Tab Counter Badges + Per-Tab Actions

**Requested:** Sep 3 2026 · **Requested by:** user (admin needs to revoke an approved driver, re-approve a rejected one, and see at a glance how many records are in each state)
**Status:** Shipped
**Scope:** (A) Loosen the `PATCH /api/admin/verification/[id]` filter so the admin can transition any record to any status, not just `PENDING ? APPROVED|REJECTED`. (B) Add dynamic count badges to the three tabs (Pending / Approved / Rejected). (C) Make the Actions cell role-aware per tab: Pending ? Approve + Reject; Approved ? View Profile + Revoke; Rejected ? View Profile + Re-Approve. (D) Add `totalRejected: number` to `AdminVerificationResponse`. Plus the related BUG-29 (orphan-record null guard) so the Approved tab no longer crashes when an orphan `DriverProfile` is encountered.

### Why (intent)
A driver who was previously approved may have their license expire, a vehicle deregistered, or be flagged for fraud. The current PATCH endpoint only matched `{ _id, status: PENDING }`, so the admin had no way to revoke an approved driver — the only path was a manual Mongo write. Likewise, a driver rejected on first review who later resubmitted the correct documents had no way to be re-evaluated. The Approve/Reject buttons themselves only rendered on the Pending tab, so even with a loosened API there was no UI affordance for the Approved or Rejected tabs. The stat cards already showed correct counts, but the tabs themselves were unlabeled — admins had to click into a tab to know whether it had records.

### Design
- **API** (`src/app/api/admin/verification/[id]/route.ts`) — filter changed from `{ _id: id, status: DRIVER_PROFILE_STATUS.PENDING }` to `{ _id: id }`. The status to set comes from the request body, and is now unrestricted at the query level (the only authorization remains the admin role check at the top of the handler). The `update` payload still sets `status: data.status`, `rejectionReason: data.rejectionReason ?? null`, and `verifiedAt: data.status === DRIVER_PROFILE_STATUS.APPROVED ? new Date() : null`. Decision: keep `rejectionReason` writable on revoke-and-then-reject so the admin can update the reason without changing status.
- **Response type** (`src/types/admin/adminVerification.ts`) — `AdminVerificationResponse` now includes `totalRejected: number` alongside the existing `totalApproved` and `totalPending`. The shape mirrors the page's existing pattern: a flat top-level count for each status, used to drive the tab badges.
- **Route** (`src/app/api/admin/verification/route.ts`) — `Promise.all` now includes `DriverProfile.countDocuments({ status: REJECTED })` so `totalRejected` is returned. The orphan null-guard filter (`profiles.filter(Boolean(profile.userId))` + safe `user?._id ? user._id.toString() : "unknown"` mapping) was added in the same pass to fix BUG-29. Both changes ship together because they touch the same file.
- **Page** (`src/app/(admin)/admin/verification/page.tsx`) — three changes:
  1. **Tab counter badges** — each `TabsTrigger` renders its count as a small pill on the right edge: `{tab.label} ({data?.totalPending ?? 0})`, `... ({data?.totalApproved ?? 0})`, `... ({data?.totalRejected ?? 0})`. Reads from the live `useAdminVerification` query data; updates as soon as the PATCH mutation invalidates the query. Styled with a muted background to match the existing tab aesthetic.
  2. **Per-tab Actions cell** — branches on `activeTab`:
     - `PENDING` ? existing Approve (primary) + Reject (danger outline) buttons. Unchanged.
     - `APPROVED` ? `<Link href="/drivers/{userId}" target="_blank" rel="noreferrer">` rendered as a primary-bordered button with `open_in_new` Material Symbol icon, label "View Profile". Next to it, a danger-bordered "Revoke" button (label intentionally distinct from "Reject" because revoke flips `approved ? rejected`, not `pending ? rejected`). The Revoke button opens a small `ConfirmRevoke` prompt inline so the admin can re-enter the rejection reason.
     - `REJECTED` ? same View Profile link, styled as a `variant="outline"` button (toned down because the record is non-active), label "View Profile". Next to it, a primary "Re-Approve" button. The applicant's name cell now renders the existing `rejectionReason` underneath (in muted text) so the admin can re-evaluate the prior reason.
  3. **`profileHref` derivation** — extracted to a module-level constant `DRIVER_PROFILE_PATH = "/drivers"` and a `useMemo` `viewProfileHref = profile.userId ? \`${DRIVER_PROFILE_PATH}/${profile.userId}\` : null` so the page never constructs `/drivers/undefined` for an orphan.
- **No new API routes** — reuses the existing `GET /api/drivers/[id]` public endpoint that the View Profile link points to.

### Implementation trail
1. `src/types/admin/adminVerification.ts` — added `totalRejected: number` to `AdminVerificationResponse`.
2. `src/app/api/admin/verification/route.ts` — added `totalRejected: DriverProfile.countDocuments({ status: REJECTED })` to the `Promise.all`; added `profiles.filter((profile) => Boolean(profile.userId))` + safe mapper (BUG-29 fix in the same pass).
3. `src/app/api/admin/verification/[id]/route.ts` — filter relaxed to `{ _id: id }`. Body `status` is now the source of truth.
4. `src/app/(admin)/admin/verification/page.tsx` — added `Link` import + `DRIVER_PROFILE_PATH` constant; tab counter badges on `TabsTrigger`; Actions cell branched on `activeTab` with new Revoke + Re-Approve + View Profile buttons; `rejectionReason` rendered under applicant name on the Rejected tab.
5. BUG-29 fix is the orphan null-guard in step 2; that one-off data cleanup (`db.driverprofiles.deleteOne({ _id: ObjectId("6a780a66c86df999c2ff48b9") })`) is a manual step performed by the user from their own Mongo client.

### Verification
- `npx tsc --noEmit` — 0 errors.
- `npx eslint` on the four changed files — 0 errors, 0 warnings.
- Manual sandbox:
  1. Approved tab now shows the 2 surviving approved drivers (orphan removed; BUG-29). Each row has a "View Profile" link that opens `/drivers/{userId}` in a new tab with the admin sidebar still visible, and a "Revoke" button.
  2. Clicking "Revoke" on an approved driver opens a confirm prompt with a `rejectionReason` textarea. On confirm, the row moves to the Rejected tab (because PATCH is now unrestricted) and the page query invalidates and refetches.
  3. Rejected tab renders the 1 rejected driver with the rejection reason under their name, a "View Profile" outline link, and a "Re-Approve" button.
  4. Clicking "Re-Approve" transitions the row to the Approved tab; `verifiedAt` is set to `new Date()`; `rejectionReason` is cleared.
  5. Tab counter badges update in real time: Pending `1`, Approved `2`, Rejected `0` (post-revoke, post-re-approve).
  6. Stat card "Total Rejected" now reads the same value as the Rejected tab badge (was hardcoded `—` before).

### Follow-ups
- The "Revoke" confirm prompt is currently inline at the page level. If more revokes are needed (e.g. bulk revoke of all approved drivers with a certain document type), a dedicated `ConfirmRevokeModal` could be extracted, mirroring the existing `DeleteAccountModal` pattern in `src/components/modals/`.
- The Re-Approve path skips the reject prompt because the admin is unambiguously promoting the record. If the project later wants an optional `reapprovalReason` (for audit), the PATCH route already accepts a `rejectionReason` field; that field would need to be split into `status-change reason` + `rejection reason` to avoid ambiguity.
- Consider an `audit log` collection that captures `actorId`, `targetId`, `fromStatus`, `toStatus`, `reason`, `at` for every PATCH — useful for "why was this driver revoked 3 months ago" investigations. Out of scope for v1.

---

