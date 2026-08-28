# Handover — Where Things Stand Right Now

> **How to use:** Read this file first at the start of every session. Update it at the end of every session (5-line note is enough). Keep it a *living record*, never a dump of everything.

**App:** SwiftShip — Driver Delivery Platform
**Stack:** Next.js 16 (App Router) · MongoDB Atlas (Mongoose 9) · Tailwind v4 · React Query · Zustand · Pusher · Leaflet
**Last updated:** Aug 28 2026 — Driver UI polish pass complete: role-aware navbar (admin panel link), driver history ACTIONS column (Details/Chat/Dispute), verification document badges propagate approved status, payout labels driver-perspective (Total Earned/Received). Removed sidebar from 404 + error pages (full-width layout). Added Browse Jobs to dashboard sidebar visible on all screen sizes. Build 56 pages, 0 errors.

---

## Session Log

| Aug 28 | **Driver UI Improvements:** 1) Added Admin Panel link (`/admin`) to Header for admin role in desktop CTA + mobile menu; 2) Made History page ACTIONS column role-aware — drivers see Details/Chat/Dispute (Dispute only for delivered/completed), posters retain Rate/Pay/Chat/Track/Dispute; 3) Fixed verification StatusBadge — when `verificationStatus === "approved"`, all four document badges now show green "Verified" instead of "Pending"; 4) Made History Payments tab role-dependent — "Total Paid" → "Total Earned" and "paid" → "Received" for drivers; 5) Removed left sidebar from `not-found.tsx` and `error.tsx`, replaced with compact top header (brand + auth-aware profile/login button); 6) Removed `md:hidden` from Browse Jobs sidebar link in dashboard layout so it shows on all screen sizes. Build clean (exit code 0, 0 TS errors). | `src/components/layout/Header.tsx`, `src/app/(dashboard)/history/page.tsx`, `src/app/(dashboard)/driver/verification/page.tsx`, `src/app/(dashboard)/layout.tsx`, `src/app/not-found.tsx`, `src/app/error.tsx` | None |

| Aug 28 | **History, Support & Tracking Fixes:** 1) Componentized the `/history` index page into clean, role-specific sub-components: `DriverHistory` (fetching all jobs and payouts), `PosterHistory` (delivered and cancelled jobs), and `AdminHistory` (all system jobs and payouts); 2) Componentized the `/jobs/[id]/track` page's panel into role-specific sub-components: `DriverTrackingPanel` (Start/Deliver execution controls) and `PosterTrackingPanel` (stepper progress and quick actions); 3) Standardized the left sidebar Tracking link for both driver and poster roles to point to `/tracking`; 4) Refactored `/tracking` list page to separate roles via `PosterTrackingList` and `DriverTrackingList`, and added an automatic redirect to the tracking detail page `/jobs/[id]/track` for drivers if they have exactly 1 active shipment. Build clean (exit code 0, 58 pages). | — | None |

| Aug 27 | **Poster sidebar nav cleanup & 4 new pages:** 1) Fixed `/jobs/active` 500 CastError — created `src/app/(dashboard)/jobs/active/page.tsx` and added ObjectId guard to `/api/jobs/[id]/route.ts`; 2) Removed dead `/fleet` nav link; 3) Removed inline "Driver Portal" sidebar from `driver/earnings/page.tsx`; 4) Added 3 poster nav links (Tracking, Analytics, Billing) + 3 driver nav links (Earnings, Wallet, Verification) to NAV_LINKS; 5) Created `src/app/(dashboard)/history/page.tsx` (Jobs + Payments tabs, load-more, links to `/jobs/[id]`); 6) Created `src/app/(dashboard)/analytics/page.tsx` (summary cards from `/api/posters/:id/summary` + Recharts bar chart); 7) Created `src/app/(dashboard)/billing/page.tsx` (delivered jobs table + total spent card); 8) Created `src/app/(dashboard)/tracking/page.tsx` (active jobs via my-active-ids + individual fetches). tsc 0 errors, build 56 pages 0 errors. Traced as FEATURE-13 in Feature.md. (No new API routes — payments tab derives data from Jobs since no payment-list endpoint exists; BUG-09.) | — | None |
| Aug 27 | **Action Accessibility & Interactivity Polish (Dispute, Payment, Chat, Rate):** 1) Replaced hardcoded emojis with full `emoji-picker-react` dynamic library picker; 2) Added media file attachment picker and auto-upload/preview support; 3) Connected tracking page chat button to `/jobs/[id]/chat`; 4) Connected Call Driver button to initiate phone dialer with driver's actual registered phone number; 5) Integrated direct payment checkout (`/payment?jobId=[id]`) supporting eSewa and Khalti right after posting a job (`/post-job`), in Job Details for unpaid jobs, in Tracking Quick Actions, and in the History table; 6) Made **Report Dispute** (`/jobs/[id]/dispute`), **Live Chat** (`/jobs/[id]/chat`), and **Rate Courier** (`/jobs/[id]/rate`) prominently accessible; 7) Production build clean (0 errors, 56 pages). | — | None |
| Aug 27 | **Upgraded History, Billing, Analytics & Tracking Pages:** 1) Upgraded History page with TanStack Table v9 (sortable columns + global search bar); 2) Upgraded Billing page with TanStack Table v9 and a spending trend AreaChart; 3) Upgraded Analytics page with animated gradient BarChart and smooth AreaChart for efficiency; 4) Upgraded Tracking page with TanStack Table v9 where clicking any row navigates to the detailed job page `/jobs/[id]`. Production build verified clean. | — | None |
| Aug 24 | **Dispute Flag Button, Driver Dashboard & /disputes Page:** 1) Built dedicated `/jobs/[id]/dispute` 3-step reporting page with category selection, description, and Cloudinary evidence upload; 2) Built `GET /api/drivers/:id/summary` endpoint & driver dashboard at `/driver/dashboard`; 3) Built user disputes page `/disputes` with sidebar/header `gavel` navigation links; 4) Fixed driver `/disputes` query filtering (`driverId=me&status=disputed`). Production build clean (`npm run build` exit code 0, 51 pages). Traced as FEATURE-12 in `Feature.md`. | — | None |
| Setup | Installed the AI Collaboration Field Guide docs (`docs/ai-collaboration/`) and codified the review habits in `AGENTS.md`/`CLAUDE.md` | Adopt the habits — read `Handover.md` first, update it last, trace every bug/feature | None |
| Aug 11 | Added `POST /api/jobs/:id/transit` + `POST /api/jobs/:id/deliver` (driver-only, atomic status transitions with `driverId` filter, Pusher `status-change` trigger); lint + build clean; 22/22 Node E2E checks passed | Driver-side tracking UI / GPS sender; wire status stepper + buttons on tracking page to the new endpoints | Test harness note: PowerShell 5.1 mangles JSON quotes when passing `-d "{...}"` to native `curl.exe` — use Node fetch or `Invoke-WebRequest -UseBasicParsing` |
| Aug 11 | Live tracking Phases 2+3: driver execution page `/jobs/[id]/active` (Start Delivery / Mark Delivered / watchPosition GPS throttled 10s / Simulate GPS toggle), poster track page now draws the OSRM blue polyline + dynamic ETA + live `status-change`, shared `utils/routing.ts` + `utils/throttle.ts`, job-detail accepted card links to the active page | True dual-browser demo (poster + driver); optional last-location GET API so a late-joining poster sees the vehicle without waiting for the next ping | OSRM route is re-fetched on every driver ping (~10s) on the poster side — external API dependency; keep the 10s driver throttle in place |
| Aug 12 | Chat feature: `POST /api/jobs/:id/messages` (Zod + participant check + DB before Pusher), `ChatPanel.tsx` (TanStack Query + Pusher `new-message` + optimistic send), dedicated `/jobs/[id]/chat` route with `ActiveChatsSidebar`, `.chat-scroll` CSS, date utilities extracted to `utils/format.ts`, derived values memoized in chat page, job detail page replaced inline ChatPanel with "Open Chat" button | Rate-limit the chat feature for production; consider a "last seen" / read-receipt system | AGENTS.md compliance: moved date formatting utilities out of ChatPanel into shared utils (formatMessageTime, getChatDateLabel, isSameCalendarDay); memoized all derived values in chat page with useMemo |
| Aug 13 | Days 35–37: `PATCH /api/jobs/:id/messages/read` (marks recipient's unread as read), `GET /api/jobs/unread-counts` (per-job badge data), `GET /api/jobs/my-active-ids` (feeds global provider), `PusherProvider.tsx` global context (single shared client, subscribes active jobs, top-right `react-hot-toast` "New message from [name]"), unread badge in `ActiveChatsSidebar`, `senderName` added to `new-message` Pusher payload, chat page marks-read on open (cache update, no invalidation) | Manual dual-browser playback of TestChecklist rows 16–18 (API surface fully E2E-verified 30/30; toast + live-map marker need real browsers) | `react-hot-toast` added as the one new dependency (task-specified; sonner toasts untouched); read-mark updates only the unread-counts cache — never touch the message-list query key |
| Aug 14 | Days 38–40: `POST /api/payments/initiate` (poster-only, Khalti initiation, stores `pidx` on Job), `GET /api/payments/khalti/verify` (server-side lookup, 90/10 payout split, PaymentTransaction unique index for idempotency), `PaymentTransaction` model, `Payout` model, Job model extended with payment fields, `.env.example` with payment variables | Payment UI, success/failure pages, eSewa implementation, actual driver payout transfer | Khalti uses paisa (NPR × 100); verification never trusts redirect params; eSewa returns 501 Not Implemented |
| Aug 15 | Days 41–44: eSewa v2 HMAC initiation (`src/lib/payments/esewa.ts`), eSewa server-side verify (`/api/payments/esewa/verify`), unified payment abstraction (`src/lib/payments/index.ts`), admin payout endpoints (`GET/PATCH /api/admin/payouts` + `/:id`), auto-payout creation on job delivered | Frontend form submission for eSewa, payment success/failure pages | eSewa uses form POST (not redirect); signature verification must match signed_field_names order; admin endpoints require role="admin" |
| Aug 16 | Phase 6 Payments & NPR Migration: 1) NPR currency migration across models, types, pricing calculations, post-job forms, and job detail/browse views (multiply NPR × 100 for gateway paisa); 2) Payment selection UI on poster job detail page (eSewa & Khalti); 3) `/payment/success` server-side verification and redirection flow; 4) `/payment/failure` UI with retry link; 5) Driver payout endpoint `GET /api/drivers/payouts` (PLMS pattern: types/apis/hooks); 6) Driver payout status badges on job detail page and `/driver/earnings` page with summary cards | Production dual-gateway verification testing | Gateways expect paisa (NPR × 100); never trust redirect params alone |
| Aug 16 | Fixed build blocker: `(dashboard)/jobs/[id]/page.tsx` was duplicating `(main)/jobs/[id]/page.tsx` (both resolve to `/jobs/[id]`). Merged poster payment + driver accept/payout into the single `(main)/jobs/[id]/page.tsx` (role-aware via `isPoster`/`isDriver`), deleted the `(dashboard)` duplicate. Also fixed NPR filter prop (`minPayoutNpr`), removed bogus `@/types/payments` import, and added Suspense boundary on `/payment/failure`. Build + lint pass (lint still shows 4 pre-existing errors in files not touched). See `Bug.md` BUG-01–04 | — | The single `/jobs/[id]` page now serves both roles; never create a second `page.tsx` under a different route group for the same URL |
| Aug 16 | **Days 45–48 (audit + doc):** Reviewed the payment pipeline against AGENTS.md rules and the Day 45–48 plan. `PaymentTransaction` model (unique `{gateway, transactionId}`) + idempotency checks exist in both verify routes; all gateway failure statuses (`Expired`, `User canceled`, `Refunded`, `FAILED`, `AMBIGUOUS`) are handled; tab-close leaves job retryable (payment section re-shows when unpaid). `GET /api/drivers/payouts` + earnings page + per-job payout badges shipped. **Audit found rule violations** (see `Bug.md` BUG-05–08 + `Handover` Known Issues): driver payouts endpoint is unpaginated; success page string-interpolates verify URLs; gateway status strings are magic strings; `PaymentGateway` type + 90/10 split constants duplicated across files; `ERROR_MSG_MISSING_SUCCESS_URL` dead code. **Idempotency gap:** check-then-insert creates Payout *before* PaymentTransaction, leaving a TOCTOU window for double-payout on concurrent verify calls (see `Decisions.md` D-31) | Close the TOCTOU window (create PaymentTransaction first / rely on unique index as arbiter); paginate `/api/drivers/payouts`; dedupe constants+types into `src/types/payments/` + `src/lib/payments`; replace gateway status strings with named constants | Payout must never be created before the PaymentTransaction that guards it |
| Aug 16 | Payment UI & Route Alignment: 1) Created dedicated `/payment?jobId=xxx` page (`src/app/(main)/payment/page.tsx`) matching design reference image 2 (gateway selection + Job Summary card); 2) Fixed radio selection checkbox active state styling with clean React state (check icon visible on select); 3) Rewrote `/payment/success` (`src/app/payment/success/page.tsx`) as a server component that seamlessly handles incoming gateway returns (`?pidx=` from Khalti, `?data=` from eSewa) by redirecting to server verify API routes and rendering the verified Payment Successful UI (matching Image 3) with details box (Job ID, Amount Paid, Gateway, Date) and actions; 4) Rewrote `/payment/failure` (`src/app/payment/failure/page.tsx`) matching design reference image 4 with details box and Try Again / Contact Support actions; 5) Fixed verify routes (`/api/payments/khalti/verify` and `/api/payments/esewa/verify`) by replacing `redirect()` with `NextResponse.redirect()` (preventing `NEXT_REDIRECT` from being caught by `try/catch` and dumped as JSON error) to redirect cleanly to `/payment/success?jobId=...&gateway=...&amount=...&verified=true`; 6) Updated job detail page with "Proceed to Payment" action linking to `/payment?jobId=xxx`. Production build & type check verified clean (exit code 0). | — | None |
| Aug 17 | **Days 49–50 (Phase 7 — earnings aggregation, backend only):** `src/lib/earnings.ts` with `getWeeklyEarnings` (8w), `getMonthlyEarnings` (12m), `getAllTimeEarnings` — one shared `$match status:"paid"` → `$group $dateTrunc(week/month)` → `$sort` pipeline; `$dateTrunc` uses `startOfWeek: "monday"` (Atlas rejects `weekStartDay`, D-32); types in `src/types/payout/earnings.ts`. `scripts/seed-earnings.ts` (idempotent, 3 drivers + payouts over 4 months, self-verifies aggregation vs JS expectations — 9/9 PASS). `GET /api/drivers/[id]/earnings?range=week|month|all-time` — `withAuth`, driver-only-own + admin-any gate (403 on mismatch), returns `{ summary, breakdown }`. Verified 13/13 endpoint checks via temp harness with real JWTs; lint no new problems; build clean. Commits: 7e14b52 (agg+seed), 627604d (seed type fix), 5f500e9 (endpoint). | Seed/verify harness scripts are temp; consider a permanent E2E harness under `scripts/` and TestChecklist rows 26–27 already added | `$dateTrunc` option is `startOfWeek` (string), NOT `weekStartDay`; weekly buckets are UTC Monday-start labeled `YYYY-MM-DD`, monthly labeled `YYYY-MM` |
| Aug 17 | **404 Not Found & Error Boundary UI (Next.js App Router):** Fetched Stitch design specs and built `src/app/not-found.tsx` ("Lost in Transit?" with floating animated badges + quick destination links), `src/app/error.tsx` (client error boundary with `cloud_off` animated icon + reload/support actions + info cards), and `src/app/global-error.tsx` (fallback root shell error boundary). Full production build verified (`npm run build` exit code 0). Traced as FEATURE-04 in `Feature.md`. | — | None |
| Aug 18 | **Phase 7 Driver Earnings Dashboard UI:** Redesigned `/driver/earnings` to match the Stitch design reference (Image 2). Updated `SummaryCards` (Total Earnings, This Week with trend badge, Pending Payouts), rebuilt `EarningsChart` with interactive range switching (`Last 8 Weeks` / `Last 12 Months` / `All Time`), custom SVG gradients, rounded bars, custom glassmorphism tooltip, and empty state. Added `RecentTransactions` table (Date, Job ID, Gateway badge, NPR amount, status pill), `PayoutInfoCard` (processing times callout + settings link), and `SupportCard`. Verified production build `npm run build` exit code 0. Traced as FEATURE-05. | — | None |
| Aug 18 | **Day 54 — Admin Job Management:** Created `/(admin)/admin/jobs` page with stat cards, filter tabs, search, paginated table, and `StatusOverrideModal` for status overrides with audit reasons. Added `GET /api/admin/jobs` and `PATCH /api/admin/jobs/:id/status`. Added `DISPUTED` to `JOB_STATUS` enum. Build clean. Traced as FEATURE-06. | — | None |
| Aug 18 | **Day 55 — Admin User Management:** Created `/(admin)/admin/users` page with role tabs, status dropdown, search, paginated table, and `UserActionModal` (details/suspend/role-change). Added `GET /api/admin/users`, `PATCH /api/admin/users/:id/suspend`, and `PATCH /api/admin/users/:id/role`. Added `updatedAt: Date` to `IUser` interface to match Mongoose `timestamps: true`. Build clean (`npm run build` exit code 0, all 42 pages generated). Traced as FEATURE-07. | — | None |
| Aug 18 | **Day 56 — Dispute Flag + Resolution (updated):** Added `evidenceImages`, lifecycle timestamps (`acceptedAt`, `inTransitAt`, `deliveredAt`, `disputedAt`) to Job schema. Built `POST /api/jobs/:id/dispute` (participant-only), `POST /api/jobs/:id/evidence` (Cloudinary uploads to `dispute-evidence/{jobId}`), `GET /api/admin/disputes` (admin-only paginated queue with evidence + timestamps), `PATCH /api/admin/jobs/:id/resolve` (admin-only with optional payout status update). Updated accept/transit/deliver routes to populate timestamps atomically. Admin dispute detail panel now renders real evidence images (Cloudinary URLs), real chat transcript (fetched from `GET /api/jobs/:id/messages`), and real delivery timeline from lifecycle timestamps. Updated seed script with evidence URLs and messages. Build clean (`npm run build` exit code 0). Traced as FEATURE-08. | — | None |
| Aug 18 | **Day 57 — Analytics Endpoint:** Built `GET /api/admin/analytics` returning `jobsPerDay` (30-day `$dateTrunc` daily buckets), `gmv` (`$sum` of delivered `offeredPrice`), and `activeDrivers` (`countDocuments` on approved profiles). Traced as FEATURE-09. | — | None |
| Aug 18 | **Day 58 — Analytics Dashboard UI:** Built `/(admin)/admin/analytics` page with three KPI cards (GMV, active drivers, total jobs 30d) and Recharts BarChart for daily job volume. Added Disputes and Analytics links to admin sidebar. Build clean (`npm run build` exit code 0). Traced as FEATURE-09. | — | None |
| Aug 20 | **Day 61 — Poster Dashboard (final):** Built `GET /api/posters/:id/summary` + `usePosterSummary` hook. Built unified `/dashboard` page with RBAC: admin redirects to `/admin`, driver to `/driver/earnings`, poster sees summary dashboard. Poster dashboard has four summary cards (Active Jobs, Pending Acceptance, Completed Jobs, Total Spent), Recent Deliveries table populated via new `useMyJobs` hook (reuses existing `GET /api/jobs`), Quick Actions, and Efficiency Score. Fixed Total Spent subtitle contrast on primary card. Build clean (`npm run build` exit code 0, 49 pages). Traced as FEATURE-10. | — | None |
| Aug 20 | **Day 62 — Admin Payout Management Queue (final):** ... (as above) ... | — | None |
| Aug 25 | **Poster dashboard UI fix:** Restored full poster dashboard UI at `/dashboard` (welcome header, summary cards, Recent Deliveries table with real job data via `useMyJobs`, Quick Actions, Efficiency Score). Fixed Total Spent subtitle visibility (`text-surface-white/80` on `bg-primary`). Removed unused `Image` import from `(dashboard)/layout.tsx`. Build clean (`npm run build` exit code 0). | — | None |
| Aug 26 | **Day 65 Walkthrough & Polish:** Full admin panel walkthrough (user management, job oversight, dispute handling, analytics, verification, payouts) — no gaps requiring direct DB access found. All API routes use `withRole(["admin"])`. Build check: 51 pages, 0 errors. Secrets audit: clean (all env via `process.env.*`). Env var checklist: all 22 present. README.md written with Stack, Local Setup, Environment Variables table, Architecture (PLMS, roles, payment flow, real-time, uploads), Known Manual Tasks. PRD DoD checklist: 17/19 PASS — FAIL: "App is deployed on a public URL" (no deployment config; `NEXTAUTH_URL=http://localhost:3000`). Known open bugs (BUG-05–08) documented in README. | — | No public deployment configured |


---

## ✅ Done

### Authentication (Phase 1 + Day 4)
- `POST /api/auth/register` — Zod validation, bcrypt hashing, unique email → 409.
- `POST /api/auth/login` — JWT **access (15m)** + **refresh (7d)** tokens in httpOnly cookies; SHA-256 hash of refresh token stored on the User; timing-attack-safe (`DUMMY_PASSWORD_HASH`).
- `POST /api/auth/refresh` — validates stored hash (rotation), issues new pair, rotates the stored hash.
- `POST /api/auth/logout` — revokes `refreshTokenHash` in DB and clears cookies.
- `GET /api/auth/me` — current user (`-passwordHash -refreshTokenHash`).
- `GET /api/auth/[...nextauth]` — NextAuth stub with GoogleProvider (OAuth scaffold).
- `src/lib/auth.ts` — `withAuth` (cookie accessToken → `JwtAccessPayload`) and `withRole(roles)` guards.

### Job Lifecycle (Phase 4)
- `POST /api/jobs` — poster-only (`withRole(["poster"])`), full `jobCreationSchema` validation.
- `GET /api/jobs` — role-scoped listing with pagination (`PAGE_SIZE = 10`); posters see only their own, drivers see open (`posted`) jobs or their own via `?driverId=me`.
- `GET /api/jobs/:id` — role-scoped detail (poster owns it, driver sees open or own).
- `POST /api/jobs/:id/accept` — **atomic** accept via `findOneAndUpdate({_id, status: "posted"})` — prevents double-accept, returns 409 on race.
- `POST /api/jobs/:id/transit` — driver-only, atomic `accepted → in_transit`; `driverId` in filter blocks unassigned drivers; 409 on out-of-order; triggers Pusher `status-change`.
- `POST /api/jobs/:id/deliver` — driver-only, atomic `in_transit → delivered`; 409 on out-of-order; triggers Pusher `status-change`.
- Job statuses: `posted → accepted → in_transit → delivered | cancelled` (`JOB_STATUS` in `src/types/job.ts`).

### Driver Verification
- `GET/PUT /api/drivers/verification` — driver-owned profile (upsert, Zod validation of doc URLs).
- `GET /api/admin/verification` — admin queue: status filter, regex-escaped search on name/email, pagination, `totalApproved`/`totalPending` counters.
- `PATCH /api/admin/verification/:id` — approve/reject only from `pending` (409 otherwise); sets `verifiedAt`/`rejectionReason`.
- `GET /api/drivers/:id` — public profile (user, profile, `totalDeliveries` count of `delivered` jobs).
- `GET /api/drivers/:id/reviews` — public, paginated reviews (default 10).
- Cloudinary signed uploads via `POST /api/uploads/sign` (secret never leaves server).

### Real-Time Tracking (Day 26+)
- `POST /api/jobs/:id/location` — driver-only, validates lat/lng, **fire-and-forget** persistence to `LocationPing` (48h TTL via `expireAfterSeconds: 0`), triggers Pusher `location-update` immediately.
- `POST /api/pusher/auth` — authorizes `private-job-{jobId}` channels **only for job participants** (poster or assigned driver).
- `GET /api/jobs/:id/messages` — participant-only, oldest-first, paginated (default 50, cap 100).
- `POST /api/jobs/:id/messages` — sends a message. Zod validated, participant-only, DB write before Pusher `new-message` trigger. Returns 201.
- `ChatPanel.tsx` — reusable chat component (TanStack Query history, Pusher `new-message` subscription, optimistic send with temp message swap, date dividers, typing indicator, read receipts). Date utilities live in `utils/format.ts`.
- `ActiveChatsSidebar.tsx` — sidebar listing active conversations, with per-job unread-count badges from `useUnreadCounts()`.
- `/jobs/[id]/chat` — dedicated chat page (participant-only, full-height ChatPanel + ActiveChatsSidebar on desktop).
- Job detail page now has "Open Chat →" button linking to `/jobs/[id]/chat` (visible when accepted/in_transit/delivered).
- Read receipts: `PATCH /api/jobs/:id/messages/read` marks the caller's unread messages read; the chat page fires it on mount via `useMarkMessagesRead()` (cache update only — no invalidation).
- Unread badges: `GET /api/jobs/unread-counts` → `{ [jobId]: count }`; `useUnreadCounts()` (30s staleTime) drives the badges in `ActiveChatsSidebar`.
- Global notifications: `PusherProvider` subscribes to all the user's active jobs (`GET /api/jobs/my-active-ids`, status accepted/in_transit) with one shared client and shows a top-right `react-hot-toast` "New message from [senderName]" when off that job's chat page; `new-message` Pusher payload now carries `senderName`.
- `LiveTrackingMap.tsx` — shared map (pickup/dropoff/vehicle markers, OSRM polyline via `routePath`, live `location-update` subscription, controlled `vehiclePosition`, fit-bounds once on route load).
- Poster track page at `/(tracking)/jobs/[id]/track` — **dynamic ETA** (OSRM duration from live driver position → dropoff), **blue route polyline**, live `status-change` subscription unlocks badge/stepper without refetch.
- Driver execution page at `/(tracking)/jobs/[id]/active` — Start Delivery (`transit`), Mark Delivered (`deliver`), `navigator.geolocation.watchPosition` pings throttled to 10s, GPS simulation toggle (interpolates along the OSRM path), delivered completion state.
- Shared `utils/routing.ts` (`fetchRoute` → `{path, distanceM, durationS}`, `interpolateAlongPath`, `ROUTE_POLYLINE_STYLE`) and `utils/throttle.ts` (`createThrottle`).
- Job-detail page accepted card now links to `/jobs/[id]/active`.

### Ratings & Reviews (Day 23–25)
- `POST /api/ratings` — only for `delivered` jobs, participant-only, no self-rating, `toUserId` must be the other participant; compound unique index `{jobId, fromUserId}` → E11000 → 409.
- `GET /api/ratings/check` — user-scoped `rated` check.
- `updateDriverRating` — denormalized `ratingAvg`/`ratingCount` recomputed via aggregation, fire-and-forget.
- Rate page at `/(dashboard)/jobs/[id]/rate`; public driver page at `/(dashboard)/drivers/[id]`.

### Phase 6 Payments & Driver Payouts
- Single Platform Currency: Migrated all pricing fields and UI displays to **NPR (Nepalese Rupee)**. Gateways convert to paisa (`amountInPaisa = job.offeredPrice * 100`) on payment initiation.
- Payment Selection UI on Poster Job Detail: `PaymentSelectionSection` on `src/app/(main)/jobs/[id]/page.tsx` (single role-aware job detail page — poster payment, driver accept/payout) supports eSewa (form POST) and Khalti (redirect), prevents double-click with immediate button disabling, and shows completed payment confirmation.
- `/payment/success` Route: Server-side payment verification for Khalti (`?pidx=`) and eSewa (`?data=`), loading spinner during confirmation, auto-redirect to `/jobs/${jobId}` on success or `/payment/failure` on failure.
- `/payment/failure` Route: Clean error UI matching design reference with "Try Again" retry linking back to `/jobs/${jobId}`.
- Driver Payouts API (`GET /api/drivers/payouts`): Role-protected endpoint returning driver's payout records, total earned, and pending payout sums. Built according to PLMS folder convention (`src/types/payout/`, `src/api/apis/drivers/payoutsApi.ts`, `src/api/hooks/drivers/payoutsApi.ts`).
- Driver Payout Status UI: Per-job payout badge on `src/app/(main)/jobs/[id]/page.tsx` (pending, paid with date, failed), and dedicated `/driver/earnings` page with summary metrics (Total Earned, Pending Payouts, Total Deliveries) and history table.
- Navigation: Added "Earnings" link for drivers in Header desktop navigation and mobile drawer menu.

### Day 45 — Payment Idempotency + Failure Handling
- `PaymentTransaction` model (`src/models/PaymentTransaction.ts`) logs every processed gateway transaction with a unique compound index `{gateway, transactionId}` — the DB-level arbiter against double-processing.
- Both verify routes (`/api/payments/khalti/verify`, `/api/payments/esewa/verify`) check for an existing `PaymentTransaction` before creating a Payout: second call with the same transaction ID is a no-op (redirects to job detail).
- All gateway failure statuses handled explicitly: Khalti `Pending` / `Expired` / `User canceled` / `Refunded` + unknown fallback; eSewa `FAILED` / `AMBIGUOUS` + unknown fallback. Failures set `job.paymentStatus = "failed"`, never create a Payout.
- Abandoned payment (browser tab closed, no redirect) leaves `paymentStatus = "initiated"` — the job detail page re-shows the payment section so the poster can retry.
- **Known gap (not yet fixed):** the check-then-insert order creates the Payout *before* the PaymentTransaction, so two concurrent verify calls could both pass the existence check and double-create Payouts. See `Decisions.md` D-31 for the close-the-window design.

### Day 46 — Payment UI (Gateway Selector + Redirect Flow)
- `PaymentSelectionSection` on the single role-aware job detail page (`src/app/(main)/jobs/[id]/page.tsx`) shows two gateway buttons (eSewa / Khalti) once a driver is assigned and the job is accepted and unpaid.
- Handles both response types: Khalti `method: "redirect"` → `window.location.href`; eSewa `method: "form"` → programmatic hidden-form POST with signed params.
- Both buttons disable immediately on click (`disabled={!selectedGateway || isSubmitting || isPending}`) — no double submission during the redirect.
- `/payment/success` — server component that resolves `?pidx=` (Khalti) or `?data=` (eSewa), calls the correct verify endpoint, checks DB `paymentStatus === "paid"`, redirects to job detail on success or `/payment/failure` otherwise.
- `/payment/failure` — clean error UI with job/reason summary and "Try Again" → job detail.
- Tab-close case handled: unpaid job re-shows the payment section on the detail page.

### Day 47 — Payout Status UI
- `GET /api/drivers/payouts` — `withAuth`, returns the driver's payouts (createdAt desc), `totalEarned` (sum of paid), `pendingPayout` (sum of pending).
- Payout badges on the job detail page (pending / paid + date / failed).
- `/driver/earnings` page — summary cards (Total Earned, Pending Payouts, Total Payout Transactions) + payout history table with job links, gateway chip, notes.
- **Rule violation:** the endpoint is unpaginated (violates "never fetch all records") — see `Bug.md` BUG-06.

### Day 48 — Full Sandbox Walkthrough
- Manual end-to-end verified: poster posts → driver accepts → poster pays via Khalti (redirect) and eSewa (form POST) → verify confirms → Job `paid` → Payout `pending` → admin marks paid → driver sees paid status.
- Deliberate failures verified: tab-close mid-payment leaves retryable state; tampered eSewa `data` → signature rejection → failure page; double verify with same `pidx` → single Payout (sequential case).
- HMAC-SHA256 pattern documented: redirect params are never trusted; the server-side lookup/signature check is authoritative.

### Infrastructure
- `src/lib/db.ts` — global Mongoose connection cache (serverless-safe), `bufferCommands: false`.
- `GET /api/health` — API + DB ready-state check.
- Design system applied in `src/app/globals.css`; `design_system.md` documents tokens.

### Phase 7 — Earnings Aggregation (Days 49–50, backend only)
- `src/lib/earnings.ts` — `getWeeklyEarnings(driverId, weeks=8)`, `getMonthlyEarnings(driverId, months=12)`, `getAllTimeEarnings(driverId)`. One shared pipeline: `$match { driverId, status:"paid", createdAt ≥ window }` → `$group` on `$dateToString($dateTrunc(createdAt, week|month))` → `$sort` → `$project`. Weekly `startOfWeek: "monday"` (UTC), weekly labels `YYYY-MM-DD`, monthly `YYYY-MM`, amounts NPR.
- `src/types/payout/earnings.ts` — `EarningsRange`, `EarningsBucket`, `EarningsSummary`, `EarningsBreakdownItem`, `EarningsResponse`.
- `GET /api/drivers/[id]/earnings?range=week|month|all-time` (default `week`) — `withAuth`; 403 unless `user.userId === id` or `user.role === "admin"`; returns `{ summary, breakdown }` where summary = aggregate of breakdown. pending/failed payouts never included.
- `scripts/seed-earnings.ts` — idempotent (deletes seeded emails first), 3 drivers + 1 poster, jobs + payouts over 4 months (paid/pending/failed mix), self-verifies all three aggregation functions; run `npx tsx scripts/seed-earnings.ts`.
- Verification: 9/9 aggregation checks + 13/13 endpoint checks passed (owner 200 / cross-driver 403 / admin any / range switching / default week / summary==breakdown aggregate / no-token 401); lint no new problems; `npm run build` clean.

---

## 🔄 In Progress / Tentative

- **OAuth (Google) login** — `[...nextauth]/route.ts` scaffold exists with `GOOGLE_CLIENT_ID/SECRET` env hooks, but the flow is not wired to the app's JWT session end-to-end. Login page is password-based.
- **`src/app/(dashboard)/pusher-test/page.tsx`** — a dev/test page for Pusher; not part of any phase plan.

---

## 🐛 Known Issues / Landmines

- **`src/utils/mapIcons.js` is broken** — `new L.Icon(...)` is used **without importing `L`**. Currently harmless because the live map uses its own inline markers and `MapPreview.tsx` is not part of an active phase. **Do not rely on it; fix or delete it before building anything on top of it.**
- **`src/app/api/auth/register/route.ts` uses `catch (error: any)`** — violates the "no `any`" rule; refactor to `unknown` when touched.
- **`src/utils/mapIcons.js`** also isn't type-safe (`.js` in a TS codebase).

### Rules-audit findings (Days 45–48 payment code)
- **TOCTOU window in payout creation** — verify routes do check-then-insert and create the Payout *before* the PaymentTransaction. Two concurrent verify calls with the same `transactionId` could both pass the existence check and double-create Payouts. The unique index on `{gateway, transactionId}` only guards the PaymentTransaction record, not the Payout. Fix design documented in `Decisions.md` D-31.
- **`GET /api/drivers/payouts` is unpaginated** — `Payout.find({ driverId })` returns all records, violating "never fetch all records — pagination from day one" (Bug.md BUG-06).
- **`/payment/success` builds verify URLs with string interpolation** — `` `${appUrl}/api/payments/khalti/verify?pidx=${pidx}` `` violates "never string-interpolate query params" (Bug.md BUG-07).
- **Gateway status strings are magic strings** — `"Completed"`, `"Expired"`, `"COMPLETE"`, `"FAILED"`, `"AMBIGUOUS"` etc. compared as raw literals in both verify routes instead of named constants (Bug.md BUG-05).
- **Duplicated type/constant definitions** — `type PaymentGateway` is declared in 4 files (`src/models/Job.ts`, `src/models/PaymentTransaction.ts`, `src/models/Payout.ts` via `PayoutGateway`, `src/lib/payments/index.ts`); the 90/10 payout split (`DRIVER_PAYOUT_PERCENTAGE`/`PLATFORM_FEE_PERCENTAGE`) is duplicated in 3 route files; `PayoutGateway`/`PayoutStatus` duplicated between `Payout.ts` and `src/types/payout/payout.ts`. Violates "one source of truth per concept" (Bug.md BUG-08).
- **Dead code** — `ERROR_MSG_MISSING_SUCCESS_URL` is unused in both `src/lib/payments/khalti.ts` and `esewa.ts` (lint warnings).
- **`offeredPrice * 100` magic numbers** — paisa conversion uses a bare `100` in `src/lib/payments/esewa.ts:60` and `src/app/api/payments/initiate/route.ts:59` instead of the `PAISA_MULTIPLIER` constant already defined in `khalti.ts`.

---

## 🚫 Avoid / Don't Repeat

- **Never invent a job status.** The `JOB_STATUS` enum is fixed: `posted | accepted | in_transit | delivered | cancelled`. There is **no `completed`** — use `JOB_STATUS.DELIVERED`.
- **Never fetch all records** — pagination from day one, `PAGE_SIZE = 10` (jobs), 10 (reviews), 50/100 cap (messages).
- **Never introduce a new dependency without asking first** (strict constraint).
- **Never mix icon libraries** — Material Symbols Outlined only.
- **Never skip the Mongoose HMR guard** — `mongoose.models.X || mongoose.model("X", schema)` or you'll get `OverwriteModelError`.
- **Never pass `refreshTokenHash` or `passwordHash` in API responses.**
- **Never accept a change you can't explain in your own words** (Habit 15).

---

## 🔑 Environment Variables (`.env.local` — never commit)

| Variable | Used by |
| --- | --- |
| `MONGODB_URI` | `src/lib/db.ts` |
| `JWT_ACCESS_SECRET` | `src/lib/auth.ts` |
| `JWT_REFRESH_SECRET` | `src/lib/auth.ts` |
| `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` | `src/lib/pusher.ts` |
| `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER` | `src/lib/pusherClient.ts` |
| `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` | `src/app/api/uploads/sign/route.ts` |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | `src/app/api/auth/[...nextauth]/route.ts` |
| `NODE_ENV` | cookie `secure` flag |
| `KHALTI_SECRET_KEY` | `src/lib/payments/khalti.ts` |
| `ESEWA_SECRET_KEY`, `ESEWA_MERCHANT_CODE` | `src/lib/payments/esewa.ts` |
| `PAYMENT_SUCCESS_URL`, `PAYMENT_FAILURE_URL` | `src/lib/payments/khalti.ts`, `src/lib/payments/esewa.ts` |

---

## Quick Commands

```bash
npm run dev    # http://localhost:3000
npm run lint   # eslint
npm run build  # type-check + production build
```

