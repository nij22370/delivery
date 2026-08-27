# Decisions — Why, Not Just What

> Log every meaningful decision and the reasoning behind it. Code shows *what* changed; this file shows *why*. When you settle an argument, write it down so it stays settled.

Format: newest at the top. Every decision gets the **model/session** that made it (Habit 14 — version-pin your context).

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

