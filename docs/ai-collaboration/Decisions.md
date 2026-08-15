# Decisions — Why, Not Just What

> Log every meaningful decision and the reasoning behind it. Code shows *what* changed; this file shows *why*. When you settle an argument, write it down so it stays settled.

Format: newest at the top. Every decision gets the **model/session** that made it (Habit 14 — version-pin your context).

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
