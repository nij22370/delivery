# Decisions — Why, Not Just What

> Log every meaningful decision and the reasoning behind it. Code shows *what* changed; this file shows *why*. When you settle an argument, write it down so it stays settled.

Format: newest at the top. Every decision gets the **model/session** that made it (Habit 14 — version-pin your context).

---

## D-58 — All in-app user notifications route through `notifyUser()` (no direct Pusher triggers for `private-user-{userId}`)

**Status:** Accepted · **Model:** kilo-auto/free session (Sep 3) · **Applies to:** `src/lib/notify.ts` and all 9 call sites in `src/app/api/jobs/[id]/*/route.ts`, `src/app/api/payments/{khalti,esewa}/verify/route.ts`, `src/app/api/admin/jobs/[id]/resolve/route.ts`, `src/app/api/admin/payouts/[id]/route.ts` (FEATURE-33).

**Decision:** Every route that produces a user-visible state change MUST call `notifyUser(userId, message, type, { link })` from `src/lib/notify.ts` rather than calling `pusherServer.trigger("private-user-...")` directly. `notifyUser` does both jobs — it persists a `Notification` row first (idempotent on `_id`), then triggers the Pusher `notification` event on the user's private channel. The `NotificationsPanel` reads from `GET /api/notifications` (DB-backed) and the transient `NotificationProvider` toast reads from Pusher, so one call satisfies both the bell inbox and the toast. All call sites use `void notifyUser(...)` (fire-and-forget per the field guide) so the live response is never blocked on a non-critical side effect.

**Why:** Two real bugs shipped in the FEATURE-24 window. (1) The bell inbox was permanently empty because no business-logic route ever called `notifyUser` — the helper existed but had zero callers. (2) The two message routes (`messages` and `admin-message`) called `pusherServer.trigger("private-job-...")` directly for the `new-message` event. That was correct for job-scoped real-time, but for the per-user inbox they were silent. Funneling everything through `notifyUser` makes it impossible to ship a route that updates the toast but forgets the inbox (or vice versa) — both come from the same code path.

**Tradeoff accepted:** A single `notifyUser` call produces one Pusher event and one DB write. If a user is offline, the Pusher event is dropped (the provider doesn't queue), but the `Notification` row persists and the bell inbox shows the message on the next page load. That's the right tradeoff for a non-critical side effect — the alternative (durable Pusher queueing) is out of scope and would require a separate worker.

**Linked rule (add to AGENTS.md on next edit):** "Any API route that produces a user-visible state change MUST call `notifyUser` for every affected user. The only exception is routes that write to a real-time channel the user is already subscribed to (e.g. `messages/route.ts` writes to `private-job-{jobId}` for both participants). A separate `notifyUser` for those would be redundant noise on a different device."

---

## D-50 — Change Password: server-side passwordHash check + signOut for logout

**Status:** Accepted · **Model:** kilo-auto/free session (Aug 30) · **Applies to:** `src/app/(dashboard)/settings/page.tsx`, `src/app/(admin)/admin/settings/page.tsx`, `src/components/profile/SettingsPageContent.tsx`, `src/components/profile/ChangePasswordForm.tsx`, `src/app/api/auth/change-password/route.ts`, `src/app/(dashboard)/layout.tsx`, `src/components/admin/AdminSidebar.tsx`

**Decision 1 — OAuth-only check is server-side only:** The `GET /api/auth/me` endpoint excludes `passwordHash` from its response (`select("-passwordHash -refreshTokenHash")`), so client-side `useAuth()` cannot determine whether a user has a password. The settings pages are server components that read the `accessToken` cookie, verify it with `verifyAccessToken` (from `@/lib/auth`, unmodified), query `User.findById` directly for `passwordHash`, and pass `hasPassword: boolean` to the shared `SettingsPageContent` client component. The API route (`POST /api/auth/change-password`) also checks `passwordHash` server-side as the definitive guard, returning 400 for OAuth-only users.

**Why:** The API response deliberately never includes `passwordHash` (security constraint: "Never pass `passwordHash` or `refreshTokenHash` from any API route"). Checking it server-side in a server component avoids modifying `src/lib/auth.ts` or `src/models/User.ts` (both off-limits per task scope) and avoids type-casting `oauthProvider` on the client, which would be an unreliable proxy (a user could have both `oauthProvider` and `passwordHash`). The `SettingsPageContent` client component receives `hasPassword` as a prop and never calls `useAuth()` itself.

**Decision 2 — Logout uses `logoutUser()` + `signOut()`:** The task specifies `signOut()` from `next-auth/react`, so the sidebar logout buttons call `logoutUser()` (which `POST /api/auth/logout` — clearing the app's custom JWT `accessToken`/`refreshToken` cookies) followed by `signOut({ redirect: true, callbackUrl: '/login' })` (per task instruction). The app's auth state is entirely driven by the JWT cookies read by `/api/auth/me`, so clearing those cookies via `logoutUser()` is what fully logs the user out; `signOut()` handles the NextAuth session cleanup + redirect. This mirrors the existing `Header.tsx` logout pattern (which uses `logoutUser()` + reload) but redirects to `/login` as the task requires.

**Why:** Using only `signOut()` would leave the JWT cookies intact and the user would remain authenticated to the app. Combining both ensures the custom JWT session is cleared while still satisfying the task's `signOut()` requirement and the `/login` redirect acceptance criterion.

---



**Status:** Accepted · **Model:** kilo-auto/free session (Aug 29) · **Applies to:** `src/app/api/jobs/[id]/admin-message/route.ts`, `src/components/admin/AdminMessagePanel.tsx`

**Decision:** The existing `GET/POST /api/jobs/:id/messages` route uses `assertParticipant()` which restricts access to the poster or driver of the job. An admin is neither, so they receive 403. Rather than modifying the existing messages route (out of scope and risky — it's used by the participant chat in `ChatPanel`), a new `GET/POST /api/jobs/:id/admin-message` route was created with `withRole(["admin"])` as the guard.

**Why:** The participant-gate on the existing messages route is correct and intentional (D-13: participant-only reads use `withAuth` + explicit participant checks). Admins need to send and read messages on behalf of the platform, not as a job participant. A separate admin-guarded route preserves the security boundary for participant traffic while giving admins the messaging access they need for dispute resolution.

**Tradeoff accepted:** The admin-message GET endpoint does not filter by `recipientId` unless the query param is provided — it returns all messages for the job by default. This is acceptable because the admin-panel UI always passes `recipientId` to filter the visible thread.

---

## D-33 — Remove sidebar from 404/error pages; use compact top header instead

**Status:** Accepted · **Model:** kilo-auto/free session (Aug 28) · **Applies to:** `src/app/not-found.tsx`, `src/app/error.tsx`

**Decision:** Both error pages had inline `<aside>` sidebars duplicating dashboard navigation. These sidebars are removed and replaced with a compact top header: brand logo (left) + notifications/help buttons + auth-aware profile/login avatar (right). The main content and footer already fill the viewport once the sidebar is removed. No shared component was introduced — the two pages keep their independent inline headers to avoid coupling.

**Why:** Error pages should communicate the error state, not compete for navigation attention. The sidebar was also duplicating routes available in the main layout. A compact top header preserves brand context and auth state without visual clutter.

---

## D-32 — `$dateTrunc` buckets for earnings; week start uses `startOfWeek`, not `weekStartDay`

**Status:** Accepted · **Model:** opencode session (Days 49–50) · **Applies to:** `src/lib/earnings.ts`

**Decision:** Earnings aggregation buckets `Payout.createdAt` with `$dateTrunc` (`unit: "week"` for weekly, `unit: "month"` for monthly) inside a `$group._id`, formatting the bucket via `$dateToString` (`%Y-%m-%d` weekly, `%Y-%m` monthly) so the label comes straight out of the aggregation. Weekly windows start Monday (`startOfWeek: "monday"`); monthly/all-time use the same month unit. Windows: weekly default 8 weeks (`weekStart(now) − (weeks−1)·7d`), monthly default 12 months, all-time has no `createdAt` filter. The `$match` filters `status: "paid"` so `pending`/`failed` payouts are excluded server-side. All bucket math runs in UTC.

**Why:** One `$match → $group → $sort` aggregation replaces "fetch all payouts and sum in JS", which violates the never-fetch-all rule and ships every record just to throw it away. `$dateTrunc` keeps bucket boundaries authoritative (MongoDB's calendar/week logic) instead of re-implementing "start of week" in consumers.

**Correction learned at runtime:** the option to control the week start is `startOfWeek` (a case-insensitive string like `"monday"`), **not** `weekStartDay`. The initial implementation passed `weekStartDay: 1` and Atlas rejected it with `Unrecognized argument to $dateTrunc: weekStartDay. Expected ... optionally, binSize, timezone, startOfWeek`. Switched to `startOfWeek: "monday"`; all 9 seed aggregation checks then passed. The seed script's independent JS expectations (UTC Monday week-start + month-start) matched the aggregation output exactly, confirming `$dateTrunc` week/month boundaries align with the JS helpers.

---

## D-31 — Close the check-then-insert TOCTOU window by making the unique index the arbiter

**Status:** Proposed (Day 45 prompt: "how do I close the window between 'check if exists' and 'save the record'?") · **Model:** opencode session (Days 45–48) · **Applies to:** `src/app/api/payments/khalti/verify/route.ts`, `src/app/api/payments/esewa/verify/route.ts`

**Decision:** The current verify flow is check-then-insert: `PaymentTransaction.findOne({gateway, transactionId})` → create Payout → create PaymentTransaction. That leaves a TOCTOU window — two concurrent verify calls with the same `transactionId` can both pass the existence check before either inserts, creating two Payouts. The unique compound index on `{gateway, transactionId}` is the correct arbiter but it only guards the PaymentTransaction record, not the Payout created before it. **Close the window by inverting the order:** insert (or upsert) the `PaymentTransaction` first and let the unique index reject the duplicate (`E11000`) — on a duplicate-key error, treat it as "already processed" and skip Payout creation. Only after a successful PaymentTransaction insert should the Payout be created.

**Why:** A DB uniqueness constraint is atomic; a `findOne` check is not. Relying on the index to be the arbiter (instead of a check) makes idempotency correct under concurrency with no extra lock machinery. Catch `code === 11000` on the PaymentTransaction insert and redirect to the job detail as an already-paid no-op.

---

## D-30 — Unified payment abstraction + eSewa implementation

**Status:** Accepted · **Model:** project session (Days 41–44) · **Applies to:** `src/lib/payments/esewa.ts`, `src/lib/payments/index.ts`, `src/app/api/payments/initiate/route.ts`, `src/app/api/payments/esewa/verify/route.ts`, `src/app/api/admin/payouts/route.ts`, `src/app/api/admin/payouts/[id]/route.ts`

**Decision:** A `PaymentInitResult` union (`redirect` | `form`) is the single contract for all gateways. `initiatePayment(gateway, job, poster)` routes to Khalti or eSewa inside `src/lib/payments/index.ts`; route handlers contain no gateway-specific logic. eSewa initiation signs HMAC-SHA256 over `total_amount,transaction_uuid,product_code` and returns a hidden-form POST target (not a redirect). eSewa verify decodes a base64 `data` query param, recomputes the HMAC over `signed_field_names` order, and rejects on mismatch.

**Why:** Khalti redirects to a JS URL; eSewa requires a server-rendered form POST with an HMAC signature. A single abstraction lets the initiate route stay gateway-agnostic. Verifying the signature server-side (not trusting the redirect params) is the same security posture as Khalti's lookup verification — base64 corruption or tampering must fail closed.

---

## D-29 — Khalti payment backend (sandbox)

**Status:** Accepted · **Model:** opencode session (Days 38–40) · **Applies to:** `src/lib/payments/khalti.ts`, `src/app/api/payments/initiate/route.ts`, `src/app/api/payments/khalti/verify/route.ts`

**Decision:** Khalti sandbox is the first payment gateway implemented. Initiation returns a redirect URL; verification calls Khalti's lookup API (never trusts client-provided status). Driver payout is 90% / 10% platform fee. PaymentTransaction model prevents duplicate processing via unique compound index on `{gateway, transactionId}`.

**Why:** Server-to-server verification is non-negotiable for payment security. The lookup API is authoritative — redirect parameters can be spoofed. Idempotency via unique index prevents double-payouts if Khalti redirects multiple times.

---

## D-28 — `sonner` for global notifications (reuse existing)

**Status:** Accepted · **Model:** user decision at opencode session (Day 36) · **Applies to:** `src/components/providers/PusherProvider.tsx`

**Decision:** The global `PusherProvider` reuses the app's existing `sonner` toast library instead of adding a new dependency. All toasts (mutation feedback and off-screen message notifications) use the same system — one `<Toaster />` in `layout.tsx`.

---

## D-27 — Read-mark and send update the cache; they never invalidate

**Status:** Accepted · **Model:** opencode session (Days 35–37) · **Applies to:** `useMarkMessagesRead` in `src/api/hooks/jobs/jobsApi.ts`, `PusherProvider.tsx`

**Decision:** After `PATCH /api/jobs/:id/messages/read` succeeds, the unread-counts cache entry for that job is set to 0 via `queryClient.setQueryData` — never `invalidateQueries`. The message-list query key is not touched at all.

**Why:** An invalidation forces a refetch and risks a flicker window where the badge re-appears before fresh data lands. Setting the count to 0 synchronously is zero-cost, instant, and consistent with the established "append to cache, never invalidate" rule that Day 34 introduced for message sends. The DB is the source of truth; the cache write is only a UI affordance mirror.

---

## D-26 — Denormalized rating average instead of on-demand aggregation

**Status:** Accepted · **Model:** project session (Day 25) · **Applies to:** `src/lib/updateDriverRating.ts`

**Decision:** Store `ratingAvg`/`ratingCount` on the driver's `DriverProfile`, recomputed from a full aggregation each time a new rating is inserted (fire-and-forget), instead of computing the average on every profile read.

**Why:** Driver profile views (public page, list views) vastly outnumber rating writes. On-demand means every read pays an aggregation whose cost grows linearly with the ratings collection. Denormalized means reads are O(1) and the cost is paid once per write.

**Tradeoff accepted:** Write-path latency (mitigated with fire-and-forget) and drift risk if ratings are ever edited/deleted without re-running the aggregation. The aggregation is the single write point, keyed off `toUserId`, and recomputes from the full set every time rather than incrementally.

---

## D-25 — Compound unique index as the only duplicate-rating guard

**Status:** Accepted · **Model:** project session (Day 24) · **Applies to:** `src/models/Rating.ts`, `POST /api/ratings`

**Decision:** `ratingSchema.index({ jobId: 1, fromUserId: 1 }, { unique: true })`, no application-level pre-check. The route catches MongoDB E11000 and maps it to 409 "You have already rated this job".

**Why:** A check-then-insert application pattern has a TOCTOU race — two concurrent submissions can both pass the check and both insert. The unique index makes the DB the single arbiter; the second insert fails atomically.

**Tradeoff accepted:** Index violations surface as a `MongoServerError` (detected via `error.code === 11000`), which is less readable than a clean "not found" check — but the 409 branch already provides a friendly message.

---

## D-24 — Fire-and-forget persistence for live location pings

**Status:** Accepted · **Model:** project session (Day 26) · **Applies to:** `POST /api/jobs/:id/location`

**Decision:** Trigger the Pusher `location-update` event first, return `{ ok: true }` immediately, and persist the `LocationPing` document in the background (`void LocationPing.create(...).catch(...)`).

**Why:** The live response must never be delayed by DB write latency. A failed write degrades to "no history" rather than a 500. Same pattern as `updateDriverRating`.

**Tradeoff accepted:** A ping can be broadcast live but lost on persistence without the caller knowing. Acceptable for tracking history; the live event is the source of truth for the map.

---

## D-23 — 48h TTL via `expireAfterSeconds: 0` + per-document `expiresAt`

**Status:** Accepted · **Model:** project session (Day 26) · **Applies to:** `src/models/LocationPing.ts`

**Decision:** Store the expiry instant on each document (`expiresAt = now + 48h`) and use `expireAfterSeconds: 0` on the index so MongoDB deletes each doc exactly when its `expiresAt` passes.

**Why:** The retention policy (`LOCATION_TTL_HOURS = 48`) lives in application code instead of being baked into the index. If retention changes to 24h, only the write path changes — no index rebuild. A fixed `expireAfterSeconds: 86400` would sweep all docs on the same absolute clock, which is wrong for pings with staggered lifetimes.

---

## D-22 — Atomic job accept prevents double-accept

**Status:** Accepted · **Model:** project session (Phase 4) · **Applies to:** `POST /api/jobs/:id/accept`

**Decision:** `Job.findOneAndUpdate({ _id, status: JOB_STATUS.POSTED }, { $set: { status: ACCEPTED, driverId: user.userId } }, { new: true })`. The `status: posted` filter in the update query is the concurrency guard.

**Why:** Two drivers accepting the same job concurrently would both pass a read-then-write check. The atomic find-and-modify means only one update can match the `posted` filter; the loser gets `null` → 409 "no longer available".

---

## D-21 — Role-scoped job visibility in the list endpoint

**Status:** Accepted · **Model:** project session (Phase 4) · **Applies to:** `GET /api/jobs`

**Decision:** `buildRoleScopedFilter` applies baseline scoping per role (posters → only their jobs; drivers → only `posted` jobs, or their own via `?driverId=me`) and layered filters can only narrow within that scope, never override it.

**Why:** A driver must never see other drivers' accepted/in-transit jobs, and a poster must never see other posters' jobs. Silent-ignore of illegal driver status filters (rather than erroring) keeps the API predictable.

---

## D-20 — Ratings gated on `JOB_STATUS.DELIVERED`, not a `"completed"` status

**Status:** Accepted · **Model:** project session (Day 23) · **Applies to:** `POST /api/ratings`

**Decision:** The plan text said rating is allowed when a job is `"completed"`, but the `JOB_STATUS` enum has no `"completed"` value. The trigger is `JOB_STATUS.DELIVERED` — the terminal success state.

---

## D-19 — Two separate JWT secrets (access + refresh)

**Status:** Accepted · **Model:** project session (Day 4) · **Applies to:** `src/lib/auth.ts`

**Decision:** `JWT_ACCESS_SECRET` and `JWT_REFRESH_SECRET` are distinct. A single `JWT_SECRET` means a leaked secret can forge both token kinds.

**Why:** Separate secrets limit blast radius — compromising the access secret (short-lived) doesn't compromise refresh tokens (long-lived, rotation-capable).

---

## D-18 — SHA-256 hashing for stored refresh tokens, not bcrypt

**Status:** Accepted · **Model:** project session (Day 4) · **Applies to:** `src/lib/auth.ts`

**Decision:** Store `hashToken(refreshToken)` (SHA-256 hex) on the User. Tokens are already high-entropy random values; bcrypt's work factor is for low-entropy passwords.

**Why:** SHA-256 is sufficient for token storage and avoids 100ms+ CPU overhead per request. bcrypt would add cost without meaningful security gain for random tokens.

---

## D-17 — Timing-attack mitigation + generic login errors

**Status:** Accepted · **Model:** project session (Day 4) · **Applies to:** `POST /api/auth/login`

**Decision:** `bcrypt.compare` always runs (against `DUMMY_PASSWORD_HASH` when the user is not found), and both "user not found" and "wrong password" return identical `"Invalid credentials"` 401.

**Why:** Without the dummy compare, response latency reveals whether an email is registered (user enumeration). A distinct "email not found" message enables account enumeration attacks.

---

## D-16 — Refresh token rotation + revocation

**Status:** Accepted · **Model:** project session (Day 4) · **Applies to:** `POST /api/auth/refresh`, `POST /api/auth/logout`

**Decision:** Every refresh issues a new token pair and overwrites the stored hash; logout `$unset`s `refreshTokenHash`. The stored-hash comparison is the security check.

**Why:** A rotated token can never be replayed — even if stolen, it's dead after its one use. Logout revokes the server-side hash so a lingering cookie cannot mint new access tokens.

---

## D-15 — Global Mongoose connection cache with fail-fast

**Status:** Accepted · **Model:** project session (Phase 1) · **Applies to:** `src/lib/db.ts`

**Decision:** Cache the connection and in-flight promise on `global.mongoose` (serverless-safe), with `bufferCommands: false` and promise reset on failure.

**Why:** Without caching, every serverless invocation opens a fresh Atlas connection — exhausting the M0 512-connection limit and adding 200–500ms cold-start overhead. `bufferCommands: false` fails fast instead of silently queueing operations while disconnected.

---

## D-14 — Mongoose HMR guard on every model export

**Status:** Accepted · **Model:** project session (Phase 1) · **Applies to:** all files in `src/models/`

**Decision:** `const X = mongoose.models.X || mongoose.model("X", schema)` in every model file.

**Why:** Next.js dev HMR re-runs module files frequently; without the guard, Mongoose throws `OverwriteModelError` on the second registration. This is a non-negotiable project rule.

---

## D-13 — API payload scoping (`withRole` + `withAuth`)

**Status:** Accepted · **Model:** project session (Phase 4+) · **Applies to:** all route files

**Decision:** Mutating/role-specific endpoints use `withRole(["poster"|"driver"|"admin"])`; participant-only reads use `withAuth` + explicit participant checks (e.g. poster-or-driver string comparison); public reads (reviews, driver profile) are unauthenticated.

**Why:** Each endpoint exposes the minimum surface. `withRole` centralizes the 401/403 contract; explicit participant checks keep job data private to the two parties.

---

## D-12 — Pagination from day one (never fetch all records)

**Status:** Accepted · **Model:** project session · **Applies to:** jobs, reviews, messages, admin queue

**Decision:** Every list endpoint returns `{ data|items, total, page, totalPages }` with default `PAGE_SIZE` and hard caps (`Math.min`).

**Why:** Fetching all records doesn't scale and bloats payloads. Paying for pagination up front means no rewrites when collections grow.

---

## D-11 — Cloudinary signed uploads (secret never reaches client)

**Status:** Accepted · **Model:** project session · **Applies to:** `POST /api/uploads/sign`

**Decision:** The server signs upload parameters with `CLOUDINARY_API_SECRET` and returns a short-lived signature; the client uploads directly to Cloudinary.

**Why:** The API secret must never be exposed to the browser. Signed uploads allow direct-to-CDN uploads without sacrificing security.

---

## D-10 — Pusher private channels restricted to job participants

**Status:** Accepted · **Model:** project session (Day 26) · **Applies to:** `POST /api/pusher/auth`

**Decision:** Channels are `private-job-{jobId}`. `handlePusherAuth` looks up the job and authorizes only the poster or the assigned driver.

**Why:** Private channels prevent eavesdropping on job location/messages, but only if subscription is gated to participants. Without the DB check, any authenticated user could subscribe to any job's channel.


**Why:** The strict constraints forbid inventing new statuses. `delivered` is the correct existing-value mapping. All checks reference `JOB_STATUS.DELIVERED` (no hardcoded strings).

---

## D-33 — Add `DISPUTED` to `JOB_STATUS` enum instead of using a magic string

**Status:** Accepted · **Model:** project session (Day 54) · **Applies to:** `src/types/job.ts`, `src/app/api/admin/jobs/[id]/status/route.ts`

**Decision:** Added `disputed` as a first-class member of `JOB_STATUS`. The admin status override route now imports and uses `JOB_STATUS.DISPUTED` instead of a raw `"disputed"` string.

**Why:** Magic strings in route handlers drift from the source-of-truth enum and break type safety. Adding `disputed` to the enum makes the status discoverable, typed, and consistent across the admin UI and API.

---

## D-34 — Admin user role changes constrained to poster ↔ driver only

**Status:** Accepted · **Model:** project session (Day 55) · **Applies to:** `PATCH /api/admin/users/:id/role`

**Decision:** The role-change endpoint only accepts `poster` and `driver` as target roles. Admin role assignment/removal is deliberately excluded.

**Why:** Allowing admins to change other admins' roles creates a privilege-escalation surface. Constraining to poster/driver keeps the endpoint safe for day-to-day operations while preserving admin immutability.

---

## D-35 — Align `IUser` TypeScript interface with Mongoose `timestamps: true`

**Status:** Accepted · **Model:** project session (Day 55) · **Applies to:** `src/models/User.ts`

**Decision:** Added `updatedAt: Date` to the `IUser` interface so TypeScript knows about the field Mongoose adds automatically via `timestamps: true`.

**Why:** Without the interface field, any consumer reading `user.updatedAt` gets a TypeScript error even though the field exists at runtime. Adding it to the interface keeps the types and schema in sync without runtime changes.

---

## D-36 — Dispute fields stored on the Job document, not a separate collection

**Status:** Accepted · **Model:** project session (Day 56) · **Applies to:** `src/models/Job.ts`

**Decision:** Added `disputeReason`, `flaggedBy`, and `resolutionNote` directly to the Job schema rather than creating a separate Dispute collection.

**Why:** Dispute state is tightly coupled to a single job — it always reads and writes together with the job document. A separate collection would require an extra lookup on every job detail render and complicate the resolve flow. Keeping it on Job keeps the read path O(1) and the resolve transaction atomic.

---

## D-37 — Dispute flag restricted to accepted/in_transit/delivered by participants only

**Status:** Accepted · **Model:** project session (Day 56) · **Applies to:** `POST /api/jobs/:id/dispute`

**Decision:** Only the poster or assigned driver can flag a dispute, and only when the job status is `accepted`, `in_transit`, or `delivered`.

**Why:** A dispute is a claim about an active delivery. Allowing it on `posted` jobs (before assignment) or by non-participants would create noise and abuse. The status guard ensures every flag has real delivery context behind it.

---

## D-38 — Resolve endpoint optionally updates linked Payout status in the same transaction

**Status:** Accepted · **Model:** project session (Day 56) · **Applies to:** `PATCH /api/admin/jobs/:id/resolve`

**Decision:** The resolve body accepts an optional `payoutStatus` (`paid` | `failed`). When provided, the route runs `Payout.updateOne({ jobId }, { status: payoutStatus })` in the same request handler after saving the job.

**Why:** Disputes often surface because a payout was incorrect. Updating the Payout in the same transaction keeps the financial state consistent without requiring the admin to visit two separate pages.

---

## D-39 — Analytics uses `$dateTrunc` daily bucketing for the last 30 days

**Status:** Accepted · **Model:** project session (Day 57) · **Applies to:** `GET /api/admin/analytics`

**Decision:** The `jobsPerDay` array uses `$group` with `$dateToString({ format: "%Y-%m-%d", date: "$createdAt" })` to bucket jobs by day for the last 30 days.

**Why:** `$dateTrunc` with `unit: "day"` would also work, but `$dateToString` is already used elsewhere in the codebase (earnings aggregation) and produces the exact `YYYY-MM-DD` labels the chart expects. No `weekStartDay` is used.

---

## D-40 — Analytics GMV calculated from `offeredPrice` of delivered jobs only

**Status:** Accepted · **Model:** project session (Day 57) · **Applies to:** `GET /api/admin/analytics`

**Decision:** GMV sums `offeredPrice` where `status === JOB_STATUS.DELIVERED`. This matches the existing revenue aggregation pattern in the admin jobs endpoint.

**Why:** Using delivered jobs only prevents counting revenue from cancelled or disputed jobs that never completed. It also aligns with how the existing admin dashboard calculates revenue, keeping the two endpoints consistent.

---

## D-41 — Lifecycle timestamps stored on Job document for dispute timeline

**Status:** Accepted · **Model:** project session (Day 56) · **Applies to:** `src/models/Job.ts`, accept/transit/deliver/dispute routes

**Decision:** Added `acceptedAt`, `inTransitAt`, `deliveredAt`, and `disputedAt` fields to the Job schema. Each lifecycle route (accept, transit, deliver, dispute) sets its corresponding timestamp atomically in the same `$set` as the status transition.

**Why:** The admin dispute detail panel needs a real delivery timeline. Storing timestamps on the Job document avoids an extra `JobEvent` collection and keeps the timeline query O(1). The atomic `findOneAndUpdate` ensures the timestamp and status transition are never out of sync.

---

## D-42 — Evidence images stored on Job document, uploaded via Cloudinary

**Status:** Accepted · **Model:** project session (Day 56) · **Applies to:** `src/models/Job.ts`, `POST /api/jobs/:id/evidence`

**Decision:** Added `evidenceImages: string[]` to the Job schema. A new `POST /api/jobs/:id/evidence` endpoint accepts `multipart/form-data` image uploads, uploads them to Cloudinary under `dispute-evidence/{jobId}` folder, and appends the returned `secure_url` values to the Job's `evidenceImages` array.

**Why:** Evidence is tightly coupled to a single job. Storing URLs on the Job document keeps the read path simple (no join required) and the upload transaction atomic. Cloudinary handles image optimization and CDN delivery. The 5MB per-file limit and MIME-type whitelist (jpeg/png/webp) prevent abuse.

---

## D-43 — Admin dispute detail fetches real chat messages from existing messages API

**Status:** Accepted · **Model:** project session (Day 56) · **Applies to:** `src/app/(admin)/admin/disputes/page.tsx`

**Decision:** The admin dispute detail panel fetches `GET /api/jobs/:id/messages?limit=50` for the disputed job and renders sender-colored chat bubbles with real timestamps, instead of showing hardcoded transcript text.

**Why:** The chat transcript is the most important evidence in a delivery dispute. Hardcoded text is useless to admins. The existing messages API already supports participant-only access and pagination, so reusing it avoids building a new endpoint. The admin dispute page uses `useQuery` with `enabled: Boolean(selectedDispute)` to fetch messages only when a dispute is selected.

---

## D-44 — Poster summary aggregation uses `countDocuments` + `$group` for status counts and totalSpent

**Status:** Accepted · **Model:** project session (Day 61) · **Applies to:** `GET /api/posters/:id/summary`

**Decision:** Active/pending/completed/cancelled counts use `countDocuments` with `$in` filters. `totalSpent` uses a single `$group` aggregation summing `offeredPrice` where `status === JOB_STATUS.DELIVERED`.

**Why:** `countDocuments` is the simplest, most readable way to get status counts. The `$group` aggregation for `totalSpent` avoids an extra `$match` stage and keeps the query O(1) for the poster. Using `DELIVERED` only ensures cancelled job prices never leak into the total.

---

## D-45 — Poster dashboard restricted to poster role via unified `/dashboard` RBAC entry point

**Status:** Accepted · **Model:** project session (Day 61) · **Applies to:** `src/app/(dashboard)/dashboard/page.tsx`

**Decision:** The `/dashboard` page uses `useAuthGuard` and `useEffect` role redirects: admin → `/admin`, driver → `/driver/earnings`, poster sees the dashboard content. The poster content calls `usePosterSummary(user._id)`.

**Why:** A single `/dashboard` entry point prevents users from guessing URLs and landing on the wrong role view. Defense in depth: the API guard prevents data leakage, and the client guard prevents UI flash for non-posters.

---

## D-46 — Recent Deliveries table reuses existing `GET /api/jobs` via `useMyJobs`

**Status:** Accepted · **Model:** project session (Day 61) · **Applies to:** `src/app/(dashboard)/dashboard/page.tsx`, `src/api/hooks/jobs/jobsApi.ts`

**Decision:** The Recent Deliveries table is populated by `useMyJobs({ page: 1, limit: 5 })`, which calls the existing role-scoped `GET /api/jobs` endpoint. No new jobs list endpoint was built.

**Why:** The existing jobs endpoint already applies poster scoping (`filter.posterId = user.userId`) and returns all fields needed for the table. Reusing it avoids duplicating logic and keeps the data layer consistent.

---

## D-47 — Total Spent subtitle contrast fixed with `text-surface-white/80`

**Status:** Accepted · **Model:** project session (Day 61) · **Applies to:** `src/app/(dashboard)/dashboard/page.tsx`

**Decision:** The primary Total Spent card uses `text-surface-white` for the value and `text-surface-white/80` for the subtitle/label, replacing the previous `text-on-primary` tokens which had insufficient contrast on the `bg-primary` background.

**Why:** Design-system color tokens must be legible on their backgrounds. `text-on-primary` was designed for dark-on-primary contexts, not white-primary cards. `text-surface-white` and its opacity variants ensure WCAG-readable contrast on the primary blue card.

---

## D-46 — Payout override restricted to `pending` status only

**Status:** Accepted · **Model:** project session (Day 62) · **Applies to:** `PATCH /api/admin/payouts/:id`

**Decision:** The route loads the Payout first and returns 400 if `payout.status !== "pending"`. Only `paid` or `failed` are accepted as override targets.

**Why:** A payout that is already paid or failed is an immutable financial record. Allowing re-override would corrupt the audit trail. The pending-only guard makes the Payout lifecycle unidirectional: `pending → paid|failed`.

---

## D-47 — Payout override stores reason in existing `notes` field

**Status:** Accepted · **Model:** project session (Day 62) · **Applies to:** `PATCH /api/admin/payouts/:id`

**Decision:** The override body `{ status, note }` maps to `Payout.updateOne({ $set: { status, notes: note, paidAt? } })`. No new schema fields were added.

**Why:** The Payout model already has a `notes` field intended for admin audit context. Reusing it avoids a schema migration and keeps the model stable. `paidAt` is set automatically when status is `paid`.

---

## D-48 — Payout route date serialization guards against missing timestamps

**Status:** Accepted · **Model:** project session (Day 62) · **Applies to:** `src/app/api/admin/payouts/route.ts`, `src/app/api/admin/payouts/[id]/route.ts`

**Decision:** Both payout routes use a `toIsoString` helper that validates the input with `new Date(value)` and falls back to `new Date().toISOString()` if the timestamp is invalid, instead of calling `.toISOString()` directly on potentially missing `createdAt`/`updatedAt` fields.

**Why:** Some legacy/seeded Payout documents had missing or invalid timestamp fields. Calling `.toISOString()` on `undefined` throws `RangeError: Invalid time value`, crashing the endpoint. The helper makes the serialization resilient without altering the schema or query logic.

---

## D-32 — `$dateTrunc` buckets for earnings; week start uses `startOfWeek`, not `weekStartDay`

**Status:** Accepted · **Model:** project session (Phase 7) · **Applies to:** `src/lib/earnings.ts`

**Decision:** Weekly earnings aggregation uses `$dateTrunc` with `startOfWeek: "monday"` (not `weekStartDay`). Atlas rejects `weekStartDay` with an "Unrecognized argument" error.

**Why:** `startOfWeek` is the documented MongoDB 5.0+ option name. The original draft used `weekStartDay` (a common confusion from SQL week functions) and failed at runtime against Atlas.

---

## D-33 — Active jobs fetch via my-active-ids + per-job fetch

**Status:** Accepted · **Model:** project session (Day 66) · **Applies to:** `src/app/(dashboard)/jobs/active/page.tsx`, `src/app/(dashboard)/tracking/page.tsx`

**Decision:** Active jobs pages first call `GET /api/jobs/my-active-ids` to get valid job IDs (filtering on the server by `status: { $in: [accepted, in_transit] }`), then fetch each job individually via `GET /api/jobs/[id]` using `Promise.all`.

**Why:** `GET /api/jobs?status=accepted` scoped by role (posters see only their own jobs, but drivers without `driverId=me` are bounded to `posted` status only). The `my-active-ids` endpoint already handles the correct scoping and returns the exact set of active IDs for any role. The per-job fetch ensures full job details (pickup/dropoff addresses, driver assignment) without relying on the list endpoint's role-scoped filtering quirks.

---

## D-51 — Single settings card design via removal of sub-navigation ProfileSidebar

**Status:** Accepted · **Model:** project session · **Applies to:** `src/components/profile/SettingsPageContent.tsx`

**Decision:** Removed `ProfileSidebar` and centered the settings container using a `max-w-2xl mx-auto px-4 py-8` wrapper.

**Why:** Since the "Edit Profile" button was removed per user request, only the "Change Password" tab remains in Settings. Displaying a sub-navigation sidebar with a single item is bad UX and adds visual clutter. A centered, single-card layout is standard for form-only settings pages.

---

## D-52 — Layout-wide unified header for dashboard and admin layouts

**Status:** Accepted · **Model:** project session · **Applies to:** `src/app/(dashboard)/layout.tsx`, `src/components/admin/AdminHeader.tsx`, `src/components/admin/AdminSidebar.tsx`

**Decision:** Moved the utility links (Settings, FAQ, Support) and Logout action from the bottom of the left sidebars to the top-right header area as clean icon buttons. Unified the dashboard mobile header into a layout-wide header for desktop as well, removing the notifications button for driver/poster dashboard views.

**Why:** Declutters the left navigation sidebars across all roles. Prevents the bottom section of sidebars from being cut off on lower-resolution screens. Standardizes the top header experience, ensuring a consistent placement of account/system operations (Settings, help, contact, logout) next to initials/role badges.

---

## D-53 — Using `support_agent` as the standard support icon across headers

**Status:** Accepted · **Model:** project session · **Applies to:** `src/components/admin/AdminHeader.tsx`, `src/app/(dashboard)/layout.tsx`

**Decision:** Changed the support link icon from `contact_support` to `support_agent` in both admin and dashboard layouts.

**Why:** `contact_support` and `help` rendered identically as question marks in some browsers. Using `support_agent` (headset icon) provides distinct visual clarity and matches the support icon used in other parts of the application (e.g. error boundaries, landing pages, earnings page support section).

---

## D-54 — Header actions profile avatar removal in driver/poster layouts

**Status:** Accepted · **Model:** project session · **Applies to:** `src/app/(dashboard)/layout.tsx`

**Decision:** Removed the top-right profile initials/role badge from the dashboard header area.

**Why:** The profile card is already rendered at the bottom of the sidebar. Re-rendering it in the header creates a repetitive profile display in the same layout view. Keeping it only in the sidebar footer eliminates duplication and aligns the dashboard header design with the admin header design.

---

## D-55 — Cast JWT `userId` to `ObjectId` in MongoDB filters

**Status:** Accepted · **Model:** project session (Sep 2) · **Applies to:** all API routes that filter by `userId` (posterId, driverId, etc.) when the value comes from the JWT.

**Decision:** All MongoDB filters that target an `ObjectId` field must cast the value from the JWT (a plain string) with `new Types.ObjectId(...)` before passing it to Mongoose. A plain string never matches an `ObjectId` field in BSON type comparison — the filter silently returns zero rows.

**Why:** Mongoose does not auto-cast scalar values when they are not in a `Schema.Types.ObjectId` field of a model passed to `.find()`. When the filter is constructed ad-hoc from JWT data, the cast is the caller's responsibility. The `/api/payments/history` bug (BUG-20) was caused by this exact omission — the Billing page showed 0 records because `{ posterId: user.userId }` never matched any `PaymentTransaction.posterId` (an `ObjectId`).

**Pattern:**

```ts
import { Types } from "mongoose";
const filter = { posterId: new Types.ObjectId(user.userId) };
```

---

## D-56 — Verify routes: `PaymentTransaction` is the idempotency anchor

**Status:** Accepted · **Model:** project session (Sep 2) · **Applies to:** `src/app/api/payments/khalti/verify/route.ts`, `src/app/api/payments/esewa/verify/route.ts`

**Decision:** Both Khalti and eSewa verify routes are reordered to create `PaymentTransaction` *first*, then `Payout`, then update the Job. Each step is wrapped in a try/catch that redirects to the failure URL on error (never returns JSON on a GET). A MongoDB duplicate-key error (code 11000) on `PaymentTransaction.create()` is treated as already-processed and redirects to the success URL.

**Why:** The `PaymentTransaction` collection has a unique index on `{gateway, transactionId}`. That index is the actual arbiter of "was this verify call processed before?". Creating it first means concurrent verify calls cannot both succeed at the `Payout` step (a previous D-31 finding). The `Payout` collection has no unique index, so without this anchor a retry could create duplicate `Payout` rows. Each step is wrapped so any subsequent failure (e.g. Payout create) redirects cleanly to the failure URL.

---

## D-57 — Single source of truth for poster "Total Spent": `/api/payments/history`

**Status:** Accepted · **Model:** project session (Sep 2) · **Applies to:** Analytics, Billing, Poster History Payments tab, and any future "money spent" UI for posters.

**Decision:** Any "Total Spent" UI for a poster reads from `GET /api/payments/history?aggregate=true` (sum of `PaymentTransaction.amount` for the authenticated poster). No UI computes this number from `Job.offeredPrice` or from a `countDocuments` of delivered jobs.

**Why:** Previously three different surfaces computed the same number from three different sources — and they all disagreed. `Job.aggregate` over delivered jobs overcounts when a delivered job is unpaid. `/api/jobs?status=delivered` is paginated and capped at page 1 of 10. The new `PaymentTransaction` is the canonical financial record (it is created by the verify routes, which are the only path that can move money). The driver-side "Total Earned" is intentionally separate and reads from the `Payout` collection (D-32).

