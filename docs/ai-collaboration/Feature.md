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
| FEATURE-07 | Admin User Management UI + API | Shipped | Aug 18 | Day 55 |
| FEATURE-06 | Admin Job Management UI + API | Shipped | Aug 18 | Day 54 |
| FEATURE-05 | Driver Earnings Dashboard UI (Phase 7 Days 51–52) | Shipped | Aug 18 | Days 51–52 |
| FEATURE-04 | 404 Not Found & Error Boundary UI Pages | Shipped | Aug 17 | Days 51–52 |
| FEATURE-03 | Earnings aggregation pipeline + driver earnings endpoint | Shipped | Phase 7 Days 49–50 | Days 49–50 |
| FEATURE-01 | Read receipts + unread badges + off-screen toasts | Shipped | Aug 13 | Days 35–37 |
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
