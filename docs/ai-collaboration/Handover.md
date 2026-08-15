# Handover — Where Things Stand Right Now

> **How to use:** Read this file first at the start of every session. Update it at the end of every session (5-line note is enough). Keep it a *living record*, never a dump of everything.

**App:** SwiftShip — Driver Delivery Platform
**Stack:** Next.js 16 (App Router) · MongoDB Atlas (Mongoose 9) · Tailwind v4 · React Query · Zustand · Pusher · Leaflet
**Last updated:** Aug 15 — Days 41–44 complete (eSewa + unified payment abstraction + admin payouts)

---

## Session Log

| Date | What was done | What's left | Watch out for |
| --- | --- | --- | --- |
| Setup | Installed the AI Collaboration Field Guide docs (`docs/ai-collaboration/`) and codified the review habits in `AGENTS.md`/`CLAUDE.md` | Adopt the habits — read `Handover.md` first, update it last, trace every bug/feature | None |
| Aug 11 | Added `POST /api/jobs/:id/transit` + `POST /api/jobs/:id/deliver` (driver-only, atomic status transitions with `driverId` filter, Pusher `status-change` trigger); lint + build clean; 22/22 Node E2E checks passed | Driver-side tracking UI / GPS sender; wire status stepper + buttons on tracking page to the new endpoints | Test harness note: PowerShell 5.1 mangles JSON quotes when passing `-d "{...}"` to native `curl.exe` — use Node fetch or `Invoke-WebRequest -UseBasicParsing` |
| Aug 11 | Live tracking Phases 2+3: driver execution page `/jobs/[id]/active` (Start Delivery / Mark Delivered / watchPosition GPS throttled 10s / Simulate GPS toggle), poster track page now draws the OSRM blue polyline + dynamic ETA + live `status-change`, shared `utils/routing.ts` + `utils/throttle.ts`, job-detail accepted card links to the active page | True dual-browser demo (poster + driver); optional last-location GET API so a late-joining poster sees the vehicle without waiting for the next ping | OSRM route is re-fetched on every driver ping (~10s) on the poster side — external API dependency; keep the 10s driver throttle in place |
| Aug 12 | Chat feature: `POST /api/jobs/:id/messages` (Zod + participant check + DB before Pusher), `ChatPanel.tsx` (TanStack Query + Pusher `new-message` + optimistic send), dedicated `/jobs/[id]/chat` route with `ActiveChatsSidebar`, `.chat-scroll` CSS, date utilities extracted to `utils/format.ts`, derived values memoized in chat page, job detail page replaced inline ChatPanel with "Open Chat" button | Rate-limit the chat feature for production; consider a "last seen" / read-receipt system | AGENTS.md compliance: moved date formatting utilities out of ChatPanel into shared utils (formatMessageTime, getChatDateLabel, isSameCalendarDay); memoized all derived values in chat page with useMemo |
| Aug 13 | Days 35–37: `PATCH /api/jobs/:id/messages/read` (marks recipient's unread as read), `GET /api/jobs/unread-counts` (per-job badge data), `GET /api/jobs/my-active-ids` (feeds global provider), `PusherProvider.tsx` global context (single shared client, subscribes active jobs, top-right `react-hot-toast` "New message from [name]"), unread badge in `ActiveChatsSidebar`, `senderName` added to `new-message` Pusher payload, chat page marks-read on open (cache update, no invalidation) | Manual dual-browser playback of TestChecklist rows 16–18 (API surface fully E2E-verified 30/30; toast + live-map marker need real browsers) | `react-hot-toast` added as the one new dependency (task-specified; sonner toasts untouched); read-mark updates only the unread-counts cache — never touch the message-list query key |
| Aug 14 | Days 38–40: `POST /api/payments/initiate` (poster-only, Khalti initiation, stores `pidx` on Job), `GET /api/payments/khalti/verify` (server-side lookup, 90/10 payout split, PaymentTransaction unique index for idempotency), `PaymentTransaction` model, `Payout` model, Job model extended with payment fields, `.env.example` with payment variables | Payment UI, success/failure pages, eSewa implementation, actual driver payout transfer | Khalti uses paisa (NPR × 100); verification never trusts redirect params; eSewa returns 501 Not Implemented |
| Aug 15 | Days 41–44: eSewa v2 HMAC initiation (`src/lib/payments/esewa.ts`), eSewa server-side verify (`/api/payments/esewa/verify`), unified payment abstraction (`src/lib/payments/index.ts`), admin payout endpoints (`GET/PATCH /api/admin/payouts` + `/:id`), auto-payout creation on job delivered | Frontend form submission for eSewa, payment success/failure pages | eSewa uses form POST (not redirect); signature verification must match signed_field_names order; admin endpoints require role="admin" |

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

### Infrastructure
- `src/lib/db.ts` — global Mongoose connection cache (serverless-safe), `bufferCommands: false`.
- `GET /api/health` — API + DB ready-state check.
- Design system applied in `src/app/globals.css`; `design_system.md` documents tokens.

---

## 🔄 In Progress / Tentative

- **OAuth (Google) login** — `[...nextauth]/route.ts` scaffold exists with `GOOGLE_CLIENT_ID/SECRET` env hooks, but the flow is not wired to the app's JWT session end-to-end. Login page is password-based.
- **`src/app/(dashboard)/pusher-test/page.tsx`** — a dev/test page for Pusher; not part of any phase plan.

---

## 🐛 Known Issues / Landmines

- **`src/utils/mapIcons.js` is broken** — `new L.Icon(...)` is used **without importing `L`**. Currently harmless because the live map uses its own inline markers and `MapPreview.tsx` is not part of an active phase. **Do not rely on it; fix or delete it before building anything on top of it.**
- **`src/app/api/auth/register/route.ts` uses `catch (error: any)`** — violates the "no `any`" rule; refactor to `unknown` when touched.
- **`src/utils/mapIcons.js`** also isn't type-safe (`.js` in a TS codebase).

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

