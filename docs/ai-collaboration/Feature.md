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

## FEATURE-05 — Driver Earnings Dashboard UI (Phase 7 Days 51–52)

**Requested:** Aug 18 | **Requested by:** Phase 7 build plan
**Status:** Shipped
**Scope:** Client-side driver earnings dashboard at `/(dashboard)/driver/earnings` with summary metric cards, a Recharts bar chart, payout info sidebar, support card, and recent transactions table. Deliberately does NOT modify backend models, API routes, or auth files; consumes the existing `GET /api/drivers/:id/earnings` endpoint plus the existing `GET /api/drivers/payouts` endpoint.

### Why (intent)
Drivers need a single-page financial overview that combines earned totals, weekly trends, and recent payout history — all role-gated and styled to match the SwiftShip design system.

### Design
- `src/types/earnings.ts` — re-exports `EarningsRange`, `EarningsSummary`, `EarningsBreakdownItem`, `EarningsResponse` from the existing payout types (single source of truth).
- `src/api/apis/drivers/earningsApi.ts` — plain async fetcher for `GET /drivers/:id/earnings?range=`, using structured `params` (no string interpolation).
- `src/hooks/useEarnings.ts` — TanStack Query hook (`useEarnings(driverId, range)`) with `enabled: !!driverId` and 30s staleTime.
- `src/components/earnings/SummaryCards.tsx` — 3-column grid (This Week / This Month / All Time) rendering `summary.totalAmount` as `NPR X,XXX`. Extracted to standalone component per Rule 0.
- `src/components/earnings/EarningsChart.tsx` — Recharts `BarChart` rendering the `week` range `breakdown` items. Includes range selector dropdown (`week` / `month` / `all-time`), gradient bars, custom tooltip with NPR formatting, and empty state. `formatPeriodLabel` and `formatYAxisTick` are pure module-level helpers.
- `src/components/earnings/RecentTransactions.tsx` — payout history table with gateway chips and status badges.
- `src/components/earnings/PayoutInfoCard.tsx` — payout processing info sidebar card.
- `src/components/earnings/SupportCard.tsx` — need-help support card.
- `src/app/(dashboard)/driver/earnings/page.tsx` — composes all components above; uses `useAuthGuard` + `useEffect` redirect for non-driver roles.

### Implementation trail
1. Created PLMS layers in order: types → lib (earningsApi) → hooks (useEarnings) → components (SummaryCards, EarningsChart, RecentTransactions, PayoutInfoCard, SupportCard) → page.
2. Resolved route collision: existing `(main)/driver/earnings/page.tsx` (payout history) conflicted with the new dashboard path. Moved old page to `(main)/driver/payouts/page.tsx` and updated two `href="/driver/earnings"` links in `Header.tsx` and `not-found.tsx` to `/driver/payouts`.
3. Moved shared `formatNpr` from component-local definitions into `src/utils/format.ts` per AGENTS.md utility rule.
4. Removed `status: "paid"` filter from `src/lib/earnings.ts` `$match` stage so earnings totals include all payout statuses (pending, paid, failed) as requested.

### Verification
- Dev server: `npm run dev` compiles clean; `/driver/earnings` returns 200 with no parallel-pages error.
- `npx tsc --noEmit` — 0 errors across new files.
- `npm run lint` on new files — 0 errors.
- Endpoint responds successfully for driver `6a7587f2aca69b244ff3f491` across `week`, `month`, and `all-time` ranges.

### Follow-ups
- Wire the chart's range selector to switch between `week`/`month`/`all-time` queries (currently only `week` data feeds the chart).
- Paginate `/api/drivers/payouts` (existing BUG-06).
- Close the TOCTOU window in payout creation (D-31).

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
