# Project Documentation

## Architecture Overview
- **Framework:** Next.js 16 (App Router)
- **Database:** MongoDB Atlas (Mongoose ODM)
- **Styling:** Tailwind CSS v4
- **Form Handling:** React Hook Form
- **Validation:** Zod
- **Authentication:** NextAuth.js (v4), bcryptjs

## Phase 1 Implementation Summary
### Database Layer
- Created `User` schema at `src/models/User.ts`.
- Mongoose Models are exported using a standard HMR guard to prevent overwrite errors during Next.js Hot Module Replacement.
- **Fields:** `name`, `email` (unique index), `passwordHash`, `role` (enum: poster, driver, admin), `oauthProvider`, `oauthId`.

### API Routes
- `POST /api/auth/register`: Validates user input (Zod), checks for existing email, hashes password (bcrypt), and creates the User in the DB.

### Frontend
- Created Registration page at `src/app/register/page.tsx`.
- Created Login page at `src/app/login/page.tsx` — split-screen layout with hero image panel (desktop) and form panel. Connects to `POST /api/auth/login`.
- Integrated a comprehensive Design System into `src/app/globals.css`.
- Replaced custom layout with the finalized **SwiftShip** Design System.

## Standard Development Rules
### Mongoose & Next.js HMR Pattern
In a Next.js development environment, Hot Module Replacement (HMR) causes files to be re-run frequently. Without a proper guard, Mongoose will attempt to re-register the same model and throw an `OverwriteModelError`.
**Rule:** Always export models using the `mongoose.models.ModelName || mongoose.model('ModelName', schema)` pattern.

### Images in Next.js
**Rule:** Always configure external hostnames in `next.config.ts` under `images.remotePatterns` before using Next.js `<Image>` components to prevent runtime errors.

---

## Day 4 — JWT Login Endpoint

### API Routes
- `POST /api/auth/login`: Accepts `{ email, password }`. Finds user by email, runs `bcrypt.compare` (always — even when user is not found, to prevent timing attacks), signs a 15-minute JWT access token and a 7-day refresh token, stores a SHA-256 hash of the refresh token on the User document, and returns `{ accessToken, refreshToken }`.

### New Files
- `src/app/api/auth/login/route.ts` — login handler
- `src/lib/auth.ts` — `signAccessToken`, `signRefreshToken`, `verifyRefreshToken`, `hashToken`
- `src/types/auth.ts` — `JwtAccessPayload`, `JwtRefreshPayload` interfaces

### Modified Files
- `src/models/User.ts` — added `refreshTokenHash?: string | null` field
- `.env.local` — replaced `JWT_SECRET` with `JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET`

### Architectural Decisions
- **Two separate JWT secrets**: A single `JWT_SECRET` means a leaked secret can forge both access and refresh tokens. Separate secrets limit blast radius.
- **SHA-256 for token hashing (not bcrypt)**: Tokens are already cryptographically random and high-entropy. bcrypt's work factor is designed for low-entropy passwords. SHA-256 is sufficient for token storage and avoids 100ms+ CPU overhead per request.
- **Timing attack mitigation**: When a user is not found, `bcrypt.compare` is still called against a `DUMMY_PASSWORD_HASH`. Without this, an attacker could detect missing accounts by response time alone.
- **Generic error message**: Both "user not found" and "wrong password" return the identical `"Invalid credentials"` 401, preventing user enumeration.

### Learning Prompt: Why is "email not found" vs "wrong password" a security problem?
Splitting those messages enables a **user enumeration attack**. An attacker submits a list of candidate emails. `"email not found"` confirms the address is not registered; `"wrong password"` confirms it is. With 10,000 emails an attacker can map the entire registered user base, then target those accounts with credential stuffing or phishing. A single generic error removes that information leak.

### Learning Prompt: Why not just use rate limiting to stop the timing attack?
Rate limiting is necessary to stop brute force guessing, but it does not stop user enumeration:
1. **Distributed Attacks (Botnets)**: Attackers can send 1 request from 10,000 different IPs. IP-based rate limiters won't block them.
2. **"Low and Slow" Attacks**: Even at 1 request per minute (perfectly bypassing strict rate limits), the timing difference (5ms vs 300ms) is massive. An attacker can still map out your users slowly over time.
3. **Defense in Depth**: We use rate limiting to stop password brute forcing, AND we use the dummy hash to prevent the system from leaking who has an account in the first place.
4. **Why isn't the dummy hash in `.env`?** It's not a cryptographic secret. Its only job is to provide the `$2b$10$` prefix so the server wastes 300ms doing dummy math. It can never be used to log in, because the code always returns a 401 Unauthorized if the user isn't found, regardless of the hash math.

---

## Day 5 — Refresh Token Rotation

### API Routes
- `POST /api/auth/refresh`: Accepts `{ refreshToken }`. Verifies signature and expiry with `JWT_REFRESH_SECRET`, fetches the user, SHA-256 hashes the incoming token and compares it against `user.refreshTokenHash`. On match: issues new access + refresh tokens, updates the stored hash (rotation), returns `{ accessToken, refreshToken }`. On mismatch: returns 401.

### Architectural Decisions
- **Single `refreshTokenHash` on User document (Option A)**: One active session per user. Simpler than a separate collection — easy to migrate to multi-session later when we need it.
- **Token rotation on every use**: Each refresh token is single-use. The moment it is consumed the DB hash is overwritten. If a stolen token is used first, the legitimate user's next call fails (hash mismatch) — signaling compromise. If the legitimate user uses it first, the stolen copy is immediately invalidated.

### Learning Prompt: Why rotate refresh tokens on every use?
Refresh tokens are long-lived. If an attacker silently copies one (XSS, log leak, network interception), they can abuse it for its full 7-day lifetime without detection. **Rotation collapses that window to a single request.** The first party to use the token wins; the second party gets a 401. This converts a silent long-term compromise into an immediately detectable event.

---

## Day 6 — Auth Middleware

### New Files
- `src/lib/auth.ts` — Added `withAuth` higher-order function (HOF).

### Architectural Decisions
- **Middleware Implementation**: `withAuth` wraps any Next.js Route Handler, automatically verifying the JWT in the `accessToken` cookie. If valid, it passes the decoded `JwtAccessPayload` to the inner handler. If invalid or missing, it automatically returns a standard `401 Unauthorized` response.
- **Cookie vs Header Storage**: Decided to use `HttpOnly` cookies rather than an `Authorization: Bearer <token>` header for token delivery.

### Learning Prompt: HttpOnly Cookie vs. Authorization Header in Next.js
**HttpOnly Cookies:**
- *Pros:* Automatically sent with every request by the browser. Immune to XSS (Cross-Site Scripting) because JavaScript cannot read them. Native support in Next.js Server Components and Server Actions.
- *Cons:* Susceptible to CSRF (Cross-Site Request Forgery), though Next.js and `SameSite=Lax` provide strong defaults against this.

**Authorization Header:**
- *Pros:* Immune to CSRF. Truly stateless and works seamlessly across different domains/mobile apps.
- *Cons:* Must be stored in memory or `localStorage` on the client, making it highly vulnerable to XSS. Difficult to use seamlessly with Next.js Server Components because the token must be manually passed from the client to the server on every initial page load.

**Conclusion:** For a Next.js App Router application, `HttpOnly` cookies are vastly superior due to the need for Server Components to access auth state without client-side hydration delays.

---

## Day 7 — `/api/me` & Logout

### New Files
- `src/app/api/auth/me/route.ts` — Retrieves the authenticated user's profile.
- `src/app/api/auth/logout/route.ts` — Invalidates the session.

### Architectural Decisions
- **Profile Retrieval (`/me`)**: Wraps the route with `withAuth`. Uses the `userId` from the verified JWT payload to fetch the full User document from MongoDB (excluding the password and token hashes).
- **Logout Logic**: 
  1. Revokes the `refreshTokenHash` in MongoDB to prevent future rotations.
  2. Clears the `accessToken` and `refreshToken` cookies by sending `Set-Cookie` headers with `Max-Age=0`.
- **JWT Stateless Tradeoff**: Because the `accessToken` is a stateless JWT, the logout route *cannot* instantly invalidate it globally. If an attacker possesses the raw token, it remains technically valid until its 15-minute expiration hits. This is the accepted tradeoff of stateless JWTs, mitigated by the short TTL.

---

## Day 8 — Role-Based Access Control (RBAC)

### New Files
- `src/lib/auth.ts` — Added `withRole(allowedRoles)` HOF.

### Architectural Decisions
- **Composition over Inheritance**: `withRole` is designed as a composable wrapper around `withAuth`. It doesn't duplicate the authentication logic; it simply takes the `JwtAccessPayload` provided by `withAuth` and checks the role. This separates Authentication (who are you?) from Authorization (are you allowed?).

### Learning Prompt: 401 vs 403 Scenarios
- **401 Unauthorized**: "I don't know who you are. Authenticate first."
  1. No session cookie is present.
  2. The JWT is expired.
  3. The JWT signature is invalid or tampered with.
- **403 Forbidden**: "I know who you are. You just can't do this."
  1. A `poster` user tries to access a route wrapped in `withRole(["driver"])`.
  2. A `driver` tries to access an `admin` dashboard route.
  3. An authenticated user tries to delete a document owned by another user.

---

## Day 9 — Google OAuth via Auth.js

### New Files
- `src/app/api/auth/[...nextauth]/route.ts` — NextAuth handler
- `src/components/providers/AuthProvider.tsx` — SessionProvider wrapper

### Architectural Decisions
- **Hybrid Auth Strategy (Temporary)**: We currently have two parallel authentication systems. Our custom JWT logic manages the credential flow, while Auth.js issues its own session cookie for Google logins. 
- **Upserting Users**: Inside the Auth.js `signIn` callback, we intercept the login to check MongoDB for an existing user by email. If they don't exist, we create them with `oauthProvider: "google"`. If they do exist (via prior credential signup), we gracefully link their `oauthId`.

### Learning Prompt: What does Auth.js do behind the scenes?
When a user clicks "Sign in with Google":
1. Auth.js redirects them to Google's OAuth consent screen with our `clientId` and `redirect_uri`.
2. Google authenticates the user and redirects back to our server (`/api/auth/callback/google`) with a short-lived `code`.
3. Auth.js takes that `code` and makes a secure, server-to-server call to Google to exchange it for an `access_token` and an `id_token`.
4. Auth.js decodes the `id_token` (which is a JWT) to extract the user's profile data (`name`, `email`, `sub`/`oauthId`).
5. Our custom `signIn` callback fires, allowing us to sync this data with MongoDB.
6. Finally, Auth.js serializes the session state and sets its own HttpOnly session cookie on the browser.

---

## Day 10 — Session Unification

### Modified Files
- `src/app/api/auth/[...nextauth]/route.ts` — Updated the `signIn` callback to issue our own custom JWTs.

### Architectural Decisions
- **Standardizing on Custom JWT**: Instead of having the frontend and API routes deal with two different session formats (Auth.js session vs our JWT session), we chose unification.
- During the Auth.js `signIn` callback, immediately after creating/finding the Google user in MongoDB, we use `cookies()` from `next/headers` to issue our custom `accessToken` and `refreshToken` directly.
- NextAuth still issues its native session cookie, but our application ignores it and relies entirely on our custom tokens. This ensures our `withAuth` and `withRole` middleware works flawlessly for all users, regardless of how they logged in.

---

## Day 11 — Phase 1 Review

### Architectural Decisions
- Verified that all authentication flows (Register, Credential Login, Google Login, Protected Routes, Refresh, Logout) behave as expected.

### Learning Prompt: JWT Tokens and RBAC Review
1. **Why do we need both an access token and a refresh token?**
   An access token is stateless and cannot be easily revoked without database lookups on every request. Therefore, it is given a very short lifespan (15 minutes). The refresh token is long-lived (7 days) but is stateful (its hash is stored in the DB). When the access token expires, the client uses the refresh token to get a new one. This is the exact moment the server checks the DB to ensure the user's session is still valid.
2. **Why rotate the refresh token on every use?**
   If a long-lived refresh token is stolen, an attacker could maintain access for 7 days. By rotating the token on every use (issuing a new one and updating the hash in the DB), it becomes single-use. If an attacker uses the stolen token, the legitimate user's next request will fail (due to a hash mismatch), immediately alerting the user of the compromise.
3. **How does our RBAC work?**
   Authentication (Who are you?) is separated from Authorization (What can you do?). `withAuth` verifies the token and establishes identity. `withRole` wraps `withAuth` and checks the decoded payload against allowed roles. It returns `401 Unauthorized` for missing authentication, and `403 Forbidden` for missing authorization.

---

## Days 12–13 — Job Schema + Create Endpoint

### New Files
- `src/types/job.ts` — Zod schemas and TypeScript types for jobs.
- `src/models/Job.ts` — Mongoose Job model.
- `src/app/api/jobs/route.ts` — `POST /api/jobs` and `GET /api/jobs` handlers.

### Type Architecture — "Define Once" Pattern
`src/types/job.ts` is the **single source of truth** for all job validation. It exports:
- `jobCreationSchema` — full schema used by `POST /api/jobs` on the server.
- `jobLocationSchema` — `.pick()` slice used by the form's Step 1.
- `jobVehicleSchema` — `.pick()` slice used by the form's Step 2.
- `JOB_STATUS` / `JOB_VEHICLE_TYPE` — constants imported by the Mongoose model, API routes, and UI.

No schema is ever duplicated. Both the API route and each form step import from the same file.

### Job Model Fields
| Field | Type | Notes |
|---|---|---|
| `posterId` | `ObjectId` ref `User` | Set from JWT — never trusted from body |
| `driverId` | `ObjectId` ref `User` | Nullable; set when job is accepted |
| `status` | enum | `posted \| accepted \| in_transit \| delivered \| cancelled` — indexed |
| `pickupAddress` | `string` | Plain text |
| `dropoffAddress` | `string` | Plain text |
| `vehicleType` | enum | `bicycle \| motorcycle \| car \| van \| truck` |
| `packageDescription` | `string?` | Optional |
| `offeredPrice` | `number` | Integer cents (e.g., $12.99 → `1299`) to avoid float precision issues |
| `createdAt` / `updatedAt` | Date | Auto via `{ timestamps: true }` |

### POST /api/jobs
- Protected by `withRole(["poster"])` — drivers get `403`, unauthenticated gets `401`.
- `posterId` set from `user.userId` in the JWT payload — a client cannot forge this.
- `status` hardcoded to `"posted"` — a client cannot override it.
- Validates body with `jobCreationSchema.safeParse()` — returns field-level errors on `400`.

### Architectural Decision: offeredPrice as Integer Cents
Storing currency as float causes silent precision errors in JavaScript (`0.1 + 0.2 !== 0.3`). Storing as integer cents (`1299`) makes arithmetic exact. The API accepts cents directly; the form (Day 16) converts from a decimal input before submitting.

---

## Day 14 — List/Filter Jobs Endpoint

### GET /api/jobs
- Protected by `withAuth` (any authenticated role).
- **Role-scoped results** derived from the JWT, not query params:
  - **Poster**: only sees their own jobs (`posterId = user.userId`).
  - **Driver**: defaults to `status: "posted"` (open jobs to accept). Passing `?driverId=me` switches to their own accepted jobs. A driver cannot see another driver's in-progress jobs.
  - **Admin**: no baseline scope; sees all jobs.
- Query params `?status`, `?vehicleType`, `?page`, `?limit` layer on top of role scoping, never override it.
- Returns `{ jobs, total, page, totalPages }`. Out-of-range page returns `jobs: []` (no crash).
- `PAGE_SIZE = 10` enforced from day one.

### Learning Prompt: When does a MongoDB index actually matter at small scale?
Adding `index: true` to `status` is correct even at < 1,000 documents because: (1) adding an index to an empty collection is instant — adding it to 10M documents requires a blocking rebuild; (2) it builds the habit of annotating high-selectivity fields from the start; (3) MongoDB M0 free tier has limited index slots, teaching intentional index design.

---

## Day 15 — Job Posting Form (Steps 1–2)

### New Files
- `src/app/post-job/page.tsx` — Multi-step job posting form. Steps 1 & 2 built; Step 3 is a placeholder pending Day 16.
- `design-reference/job-posting-form/` — Stitch design assets for all 3 steps (screenshots + annotated HTML reference).

### Form Architecture
- **Step state**: local `useState` in the page component. No Zustand — overkill for 2 steps.
- **Step 1** (`StepLocations`): `zodResolver(jobLocationSchema)` — validates `pickupAddress` + `dropoffAddress`. Blocks "Next" on invalid input.
- **Step 2** (`StepVehicle`): `zodResolver(jobVehicleSchema)` — validates `vehicleType`. Vehicle selection calls `setValue` to drive RHF state, keeping radio-card selection governed by form validation rather than raw `useState`.

### Leaflet Map Preview Integration
- `src/components/MapPreview.tsx` — A static `react-leaflet` preview for Step 1.
- Receives `pickupAddress` and `dropoffAddress` via props and debounces them internally.
- Calls Nominatim Geocoding API to resolve coordinates, drops pins for each.
- When both are resolved, calls OSRM Directions API to draw a route polyline.
- Handles empty/partially filled states gracefully. Bounds auto-fit to the pins. 

### Learning Prompt: Clean multi-step form validation against a schema slice
Pattern: `const sliceSchema = fullSchema.pick({ field1: true, field2: true })`, then `useForm({ resolver: zodResolver(sliceSchema) })`. Each step validates only its own fields. On Day 16, all partials merge into the full `jobCreationSchema` shape before the API call. This avoids schema duplication and false validation failures on fields the user hasn't seen yet.

---

## Day 16 — Job Posting Form (Steps 3–4)

### Component Refactoring
Per standards, extracted multi-step form components into `src/components/post-job/`:
- `src/components/post-job/ProgressBar.tsx` — Progress indicator with 4 segments
- `src/components/post-job/FormFieldError.tsx` — Reusable error display
- `src/components/post-job/VehicleCard.tsx` — Card component for vehicle selection
- `src/components/post-job/StepLocations.tsx` — Step 1 form (pickup/dropoff)
- `src/components/post-job/StepVehicle.tsx` — Step 2 form (vehicle type)
- `src/components/post-job/StepPricing.tsx` — Step 3 form with price suggestion
- `src/components/post-job/StepReview.tsx` — Step 4 review and submit

### Step 3 — Pricing & Schedule
- **Price suggestion**: Vehicle-aware — uses the vehicle chosen in Step 2 plus Haversine distance between pickup/dropoff coordinates (geocoded via the `/api/geocode` proxy).
- **Formula**: `baseCents + max(0, km - freeKm) * perKmCents`, with a per-vehicle rate tier (`VEHICLE_RATES` in `src/lib/pricing.ts`). Each tier encodes its weight-capacity bracket (bicycle 5 kg, car 50 kg, van 500 kg, truck 2000 kg), mirroring the base-fare + distance + weight factors used by Nepali delivery platforms (Pathao Parcel et al.). Placeholder rates — tune per market.
- **UI**: Pre-filled `offeredPrice` in cents, but editable for user override.
- **Package description**: Optional textarea for delivery notes.

### Step 4 — Review & Submit
- **Summary screen**: Displays all entered fields (locations, vehicle, price, notes).
- **Submission**: TanStack Query mutation to `POST /api/jobs`.
- **States**: 
  - Loading: Button disabled with spinner state
  - Error: Displays error message in red container
  - Success: Redirects to `/jobs/[id]` via `router.push()`

### Leafet Icon Fix (Day 15 follow-up)
- Moved marker icons from `node_modules` to `public/images/`
- Created `src/utils/mapIcons.js` with `DEFAULT_MARKER_ICON` export
- Updated MapPreview to use the static public asset paths

### Learning Prompt: Why calculate price after geocoding instead of using address strings?
Geocoding converts addresses to precise coordinates. The Haversine formula calculates the exact "as-the-crow-flies" distance, which is then multiplied by our per-km rate. This is more accurate than estimating by address string length or zip codes. The API is called only when both addresses are resolved, minimizing external calls.

---

## Day 17 — Driver Browse Page

### New Files
- `src/app/jobs/browse/page.tsx` — Driver-facing job listings with filters, pagination, and map preview.

### Data Fetching
- `GET /api/jobs?status=posted` via TanStack Query (`useQuery` with `JOBS_QUERY_KEY = "browse-jobs"`).
- Query key includes `page`, `selectedVehicleTypes`, and `minPayoutCents` so changing a filter refetches scoped results.
- The client fetcher additionally filters the returned list by selected vehicle types and minimum payout before rendering; pagination resets to page 1 on any filter change (`setPage(1)` in each `onChange` handler).

### Filters
- **Vehicle Requirement**: checkboxes toggling each `JOB_VEHICLE_TYPE` value via a single `useCallback` toggle handler.
- **Distance (Radius)**: static `DISTANCE_RADIUS_OPTIONS` select (visual only — geocoding radius filtering is not wired server-side yet).
- **Minimum Payout**: range input in whole dollars; converted to cents in a `useMemo` for the query key/API.

### States
- Loading: `JobCardSkeleton` card placeholders.
- Error: centered error card with message from `error`.
- Empty: illustration card with a "Clear vehicle filter" action when filters are active.
- Data: `JobCard` list plus pagination footer (Previous/Next, page-of-total).

### Layout
- Three-column on desktop (`lg:flex-row`): filters sidebar, job list, sticky `MapPreview` map panel (`hidden lg:block`). Single-column with stacked sections on mobile.

### Role Scoping
- Drivers see only `status=posted` jobs by default. Posters are blocked by the `GET /api/jobs` role-scoping — the browse page itself just relies on the API contract.

---

## Day 18 — Job Detail & Accept Endpoint

### New Files
- `src/app/api/jobs/[id]/route.ts` — `GET /api/jobs/:id`.
- `src/app/api/jobs/[id]/accept/route.ts` — `POST /api/jobs/:id/accept`.
- `src/app/api/jobs/[id]/transit/route.ts` — `POST /api/jobs/:id/transit`.
- `src/app/api/jobs/[id]/deliver/route.ts` — `POST /api/jobs/:id/deliver`.
- `src/app/jobs/[id]/page.tsx` — Job detail page.

### API Routes
- **`GET /api/jobs/:id`** — `withAuth`. Loads the job and returns `{ job }`. Role scoping:
  - `poster`: 403 unless `job.posterId === user.userId`.
  - `driver`: 403 unless the job is `posted` (open) or `job.driverId === user.userId` (their own accepted job).
  - `admin`: sees all.
- **`POST /api/jobs/:id/accept`** — `withRole(["driver"])`. Atomic `findOneAndUpdate({ _id: id, status: "posted" }, { status: "accepted", driverId: user.userId })`. If no document matches, returns `409` ("no longer available"), preventing double-accept races.
- **`POST /api/jobs/:id/transit`** — `withRole(["driver"])`. Atomic `findOneAndUpdate({ _id: id, driverId: user.userId, status: "accepted" }, { status: "in_transit" })`. The `driverId` in the filter guarantees only the assigned driver can transition a job that is exactly `accepted`; `409` on any mismatch (unassigned driver, or status not `accepted`). On success triggers Pusher `status-change` with the new status + timestamp.
- **`POST /api/jobs/:id/deliver`** — `withRole(["driver"])`. Atomic `findOneAndUpdate({ _id: id, driverId: user.userId, status: "in_transit" }, { status: "delivered" })`; `409` on out-of-order or unassigned calls; triggers Pusher `status-change` on success. Enforces the strict `accepted → in_transit → delivered` state machine.
- Both follow the `console.error` + `{ message }` error convention used across the jobs/auth routes.

### Page (`src/app/jobs/[id]/page.tsx`)
- Fetches the job with `useQuery` keyed `["job-detail", id]`; accepts via `useMutation`, then invalidates the query so the UI reflects `accepted`.
- **Contact info gating**: pickup/dropoff contact name & phone are shown only when `isContactRevealed` (`status !== "posted"`); otherwise an italic "revealed after acceptance" note renders.
- **Accept flow**: primary "Accept Job" button with pending spinner + disabled state and a tonal "Decline" button (`window.history.back()`). On mutation error, an inline error banner renders. On success, an "Accepted" confirmation card replaces the action block and contact info appears.
- Status badge uses a `STATUS_STYLES` map for posted / accepted / in_transit / delivered / cancelled.

### Architectural Decisions
- **Code-first gate over data stripping**: contact info is simply hidden in the UI until `status` leaves `posted`; the detail route still returns all fields to the driver. This matches the "display belongs in the component, data in the layer" standard.

### Learning Prompt: Why is accept an atomic conditional update instead of find-then-update?
A find-then-update has a race window: two drivers could both read `status: posted` before either write completes, letting both accept a single job. `findOneAndUpdate` with `status: "posted"` in the filter makes the state transition conditional at the database level — exactly one update matches, so a second driver gets no document back and receives the 409 "no longer available". No two-phase locking needed, just an atomic predicate update.

---

## Day 19 — Cloudinary Signed Uploads

### New Files
- `src/app/api/uploads/sign/route.ts` — Cloudinary unsigned-upload signature endpoint.

### Setup
- `cloudinary` (`^2.10.0`) added to `package.json`.
- Credentials configured server-side via `process.env.CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in `.env.local`. The API secret is never sent to the client.

### API Route
- **`POST /api/uploads/sign`** — `withRole(["driver"])`. Validates `documentType` against `ALLOWED_DOCUMENT_TYPES` (`licence`, `insurance`, `government_id`), then returns the params needed for a direct browser upload to Cloudinary:
  - `signature`, `timestamp`, `cloudName`, `apiKey`, `public_id`, `folder`.
- The `folder` is scoped to the user (`driver-verification/<userId>`) and the `public_id` is the document type itself, so re-uploads overwrite the prior file instead of accumulating duplicates.
- The signature is produced server-side with `cloudinary.utils.api_sign_request`; the client then POSTs the file + signed params straight to Cloudinary's upload endpoint.

### Architectural Decisions
- **Sign-and-upload instead of server-side upload**: the Next.js server never touches the large file payload. It only issues a short-lived signed authorization; the browser streams the file directly to Cloudinary. This keeps memory/timeouts off the server and avoids the server becoming a storage proxy.
- Route follows the repo convention: `withRole` guard, `JwtAccessPayload`, `catch (error: unknown)` + `console.error` + `{ message }`. The initial draft used `user: any` / `err: any` and leaked `err.message ?? err.status`; both were corrected. The dead `bodyParser: false` config (Pages-Router style) was removed.

### Learning Prompt: Why can't the browser upload directly with my raw API secret?
Exposing `CLOUDINARY_API_SECRET` in the client would let anyone forge upload parameters — arbitrary files, any public_id, unlimited storage and CDN usage billed to the account. The signature proves the upload parameters (`timestamp`, `folder`, `public_id`) were produced by our server for this authenticated user within the signing window; Cloudinary rejects uploads whose signature doesn't match the parameters. The secret stays server-side, and the browser receives only the short-lived, scoped signature.

---

## Day 20 — DriverProfile Schema + Upload UI

### New Files
- `src/models/DriverProfile.ts` — Mongoose model with HMR guard; `userId` (unique index, ref `User`), `status` enum, `vehicleType` enum, document URL fields (`licenceDocUrl`, `governmentIdDocUrl`, `insuranceDocUrl`), `backgroundCheck`, `verifiedAt`.
- `src/types/driverProfile/driverProfile.ts` — `DRIVER_PROFILE_STATUS`, `DRIVER_VEHICLE_TYPE`, update zod schema, API response types.
- `src/api/apis/drivers/driversApi.ts` — plain async layer using the shared axios instance.
- `src/api/hooks/drivers/driversApi.ts` — TanStack query + mutation hooks with toast/error handling.
- `src/app/api/drivers/verification/route.ts` — `GET` / `PUT` for the driver's own profile.
- `src/app/driver/verification/page.tsx` — document upload UI (vehicle selection, licence, government ID, insurance, background check authorization).

### API Routes
- **`GET /api/drivers/verification`** — `withRole(["driver"])`. Returns `{ profile }` for the current user; returns a default `unverified` structure when no profile exists yet (orphan case).
- **`PUT /api/drivers/verification`** — `withRole(["driver"])`. Validates against the update zod schema and upserts (`findOneAndUpdate` with `upsert: true`) a partially-built update, so drivers only send the fields they changed.

### Upload Flow
1. `UploadZone` validates file type/size locally (`ACCEPTED_MIME_TYPES`, `MAX_FILE_SIZE_BYTES = 10MB`).
2. It requests a signature from `POST /api/uploads/sign`.
3. The browser POSTs the file + signed params to Cloudinary, receiving `secure_url`.
4. The URL is held in local form state (with server values as fallbacks) until "Submit for Review".
5. Submit runs `PUT /api/drivers/verification` with `status: "pending"` and the doc URLs, then invalidates the query so the page reflects the locked `pending` state.

### Architectural Decisions
- **Responses mirror existing API shape** (`{ profile }` / `{ message }`), consistent with `{ job }` / `{ user }` used by jobs/auth routes. The original code used a bespoke `{ success, data }` envelope plus a bare `POST` alias of `PUT`; both were removed to avoid introducing a new design pattern.
- **No `any`**: all route handlers take `JwtAccessPayload` and use `catch (error: unknown)` + `console.error`. The original `user: any`, `err: any`, `setQuery: any` were replaced.
- **Reused shared enum**: `vehicleType` uses `DRIVER_VEHICLE_TYPE` everywhere (types, model, page). Removed the duplicate local `VEHICLE_TYPES` array and the dead `SubmitVerificationInput` / create-schema types in favour of one source of truth.
- **Form state derives from server with fallbacks**: the page keeps local selections and falls back to `profile` values, instead of a hydration `useEffect` that calls `setState` in an effect (which the repo's `react-hooks/set-state-in-effect` rule rejects). Inline JSX handlers and the submit-button label were extracted to named `useCallback`s / a pure helper.

### Learning Prompt: What happens if the Cloudinary upload succeeds but the DB save fails?
The Cloudinary URL is only a string in client state until the driver submits; the profile document and its `status: "pending"` are committed by `PUT /api/drivers/verification` in one operation. If the DB save fails, the UI shows the error via the mutation's `onError` toast and nothing is persisted — the uploaded file simply becomes orphaned Cloudinary storage. The `public_id = documentType` convention bounds the damage: a retry re-signs the same public_id and overwrites the orphan, so no duplicate files accumulate. The real fix (auto-deleting orphaned uploads on save failure) is a server-side cleanup job — noted as a follow-up.

---

## Design System Notes

### Touch Targets
All interactive elements in the new post-job form have `h-12` (48px) minimum height per mobile-first standard.

### Color Usage
- Primary: `#276EF1` (buttons, active states)
- Surface: `#FFFFFF` (form backgrounds)
- Outline variant: `#E2E2E2` (borders)

### Spacing
- Mobile base: 16px padding (`px-4`, `py-4`)
- Desktop: 32px padding (`md:px-8`, `md:py-8`)

### Icons
Using Material Symbols Outlined exclusively — no icon library mixing.

---

## Days 21–23 — Admin Verification Queue

### New Files
- `src/types/admin/adminVerification.ts` — AdminTabKey, ApproveRejectStatus (derived from DriverProfileStatus), AdminVerificationProfile (mirrors API response including `updatedAt`), query/response interfaces.
- `src/app/api/admin/verification/route.ts` — `GET /api/admin/verification`. Protected by `withRole(["admin"])`. Supports `?status` (default `"pending"`), `?search` (User name/email via case-insensitive regex), `?page`, `?limit`. Uses `populate("userId","name email")` then maps name/email onto the profile response. Returns `totalApproved`/`totalPending` counts alongside paginated results.
- `src/app/api/admin/verification/[id]/route.ts` — `PATCH /api/admin/verification/:id`. Protected by `withRole(["admin"])`. Accepts `{ status: "approved"|"rejected", reason? }`. On approve: sets `verifiedAt = new Date()`, clears `rejectionReason`. On reject: sets `rejectionReason` from payload.
- `src/api/apis/admin/adminApi.ts` — Plain fetchers: `getVerificationQueue` (GET, structured params), `approveRejectDriver` (PATCH).
- `src/api/hooks/admin/adminApi.ts` — `useVerificationQueue` (30s staleTime, queue key) and `useApproveRejectDriver` (invalidates queue query on success, toasts).
- `src/app/admin/verification/page.tsx` — Admin queue UI with role guard, stat cards, tabs with count badge, debounced search, data table (avatar initials, copy-ID, vehicle/status/BG/documents/actions columns), pagination, reject confirmation modal.

### Modified Files
- `src/models/DriverProfile.ts` — Added `rejectionReason?: string | null` field with `default: null`.
- `src/types/driverProfile/driverProfile.ts` — Added `rejectionReason?: string | null` to `DriverProfile` response interface.
- `src/app/driver/verification/page.tsx` — Added rejected-status banner with reason text and "Update Documents" button (resets status to `unverified` via existing `handleUnlock`).
- `src/app/api/drivers/verification/route.ts` — Added `rejectionReason: null` to the orphan default profile structure.

### New Shared Utilities
- `src/hooks/useDebouncedValue.ts` — Generic debounce hook (debounces any value by `delayMs`).
- `src/utils/format.ts` — `getInitials(name)` (2-char max), `formatAppliedDate(createdAt)` (US locale short date + 12h time).

### Architectural Decisions
- **Derived types from source of truth**: `AdminTabKey` and `ApproveRejectStatus` are `Extract<DriverProfileStatus, ...>` unions. Raw status strings (`"approved"`, `"rejected"`) are never used; all status values reference `DRIVER_PROFILE_STATUS.*` constants.
- **Status badge map covers all statuses**: `STATUS_BADGE_STYLES` is typed `Record<DriverProfileStatus, string>` with an `unverified` entry, so any new status added to the enum is caught at compile time instead of silently rendering without color.
- **`rejectionReason` is excluded from the driver PUT validation schema**: drivers cannot self-set rejection reason via their own route. Only the admin PATCH can write it.
- **Global stat counts (`totalApproved`/`totalPending`) are computed per request**: At early-stage scale the extra two `countDocuments` calls are negligible; a `$facet` aggregation or separate stats endpoint can replace them if the collection grows beyond 100k profiles.
- **`formatAppliedDate` and `getInitials` live in shared `utils/format.ts`**: Per CLAUDE.md standards, all utility/formatting logic is centralized outside components.

### Learning Prompt: Why exclude rejection reason from the driver's validation schema?
Separating write permissions at the schema layer enforces a clean privilege boundary. The driver PUT schema controls what drivers can submit; the admin PATCH route has its own Zod schema that includes `status` and `reason`. If `rejectionReason` were in the driver schema, a malicious driver could self-clear the flag to reset their status. By keeping it out, rejection state is only modifiable by an admin, and the driver's only recourse is the explicit "Update Documents" flow which resets to `unverified` — a legitimate self-service path that doesn't bypass the review queue.

### Learning Prompt: Why populate rather than a separate User lookup per profile?
`DriverProfile.find().populate("userId","name email")` executes a single secondary query that resolves all referenced users in one round-trip, versus N individual `User.findById` calls. This avoids the N+1 pattern while keeping the code clean and the response latency bounded. The `populate` result is then mapped onto the response to extract `name`/`email` as top-level fields, satisfying the flat `AdminVerificationProfile` contract.

---

## Days 24–26 — Ratings & Reviews

### New Files
- `src/models/Rating.ts` — Rating model with jobId/fromUserId/toUserId refs, score (min 1, max 5), optional comment, `createdAt`-only timestamps. Compound unique index `{ jobId: 1, fromUserId: 1 }` (duplicate prevention). HMR guard export.
- `src/types/rating.ts` — Single source of truth: `ratingSubmitSchema` (zod) + inferred `RatingSubmitInput`, plus `RatingResponse`, `RatingSubmitResponse`, `RatingCheckResponse`, `ReviewItem`, `DriverReviewsResponse`.
- `src/app/api/ratings/route.ts` — `POST /api/ratings`. Protected by `withAuth()` (any authenticated role). Guard chain: 404 job not found → 400 job not delivered → 403 not a participant → 400 self-rating → 400 invalid recipient → 409 duplicate (E11000). Returns 201 with the saved rating.
- `src/app/api/ratings/check/route.ts` — `GET /api/ratings/check?jobId=`. Protected by `withAuth()`. Returns `{ rated }` scoped to the current user (`{ jobId, fromUserId: user.userId }`).
- `src/lib/updateDriverRating.ts` — Aggregation helper. Guards on `User.role === "driver"`, then `$match` + `$group` (`$avg`, `$sum`), writes denormalized `ratingAvg`/`ratingCount` to `DriverProfile`.
- `src/app/api/drivers/[id]/reviews/route.ts` — `GET /api/drivers/:id/reviews`. Public (no auth). Paginated (`page`/`limit`, default 10), `populate("fromUserId","name")`, sorted `createdAt` descending. Returns `{ reviews, total, page, totalPages }`.
- `src/app/api/drivers/[id]/route.ts` — `GET /api/drivers/:id`. Public. Returns `{ user, profile }` (user name/role/createdAt + the driver profile with rating fields).
- `src/types/drivers/driverPublicProfile.ts` — `DriverPublicUser` + `DriverPublicProfileResponse`.
- `src/api/apis/ratings/ratingsApi.ts` + `src/api/hooks/ratings/ratingsApi.ts` — PLMS layer: `submitRating`, `checkRating`, `getDriverReviews` + `useSubmitRating` (invalidates ratings + driver-reviews keys, toasts), `useCheckRating`, `useDriverReviews`.
- `src/api/apis/drivers/driverPublicProfileApi.ts` + `src/api/hooks/drivers/driverPublicProfileApi.ts` — `getDriverPublicProfile` + `useDriverPublicProfile`.
- `src/app/(dashboard)/jobs/[id]/rate/page.tsx` — Rating form (poster-only, delivered-only, "Already submitted" state, 5-star selector, optional comment, `useSubmitRating` mutation, redirect to job detail on success).
- `src/app/(dashboard)/drivers/[id]/page.tsx` — Public driver profile: hero card (initials, verified badge, vehicle chip, stats), rating banner (avg + count), paginated review list; distinct loading/empty/error states.

### Modified Files
- `src/models/DriverProfile.ts` + `src/types/driverProfile/driverProfile.ts` — Added `ratingAvg` (default 0, min 0, max 5) and `ratingCount` (default 0, min 0) fields.
- `src/utils/format.ts` — Added `formatCompletedDate` (shared; used by the rate page).

### API Routes Added
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/ratings` | `withAuth()` | Submit a rating (guard chain 404→400→403→400→400→409) |
| GET | `/api/ratings/check?jobId=` | `withAuth()` | Whether the current user already rated the job |
| GET | `/api/drivers/:id/reviews?page=&limit=` | public | Paginated reviews for a driver |
| GET | `/api/drivers/:id` | public | Public driver profile (user + profile with ratings) |

### Architectural Decisions
- **"completed" vs `JOB_STATUS.DELIVERED`**: The Phase 4 plan says rating is allowed when the job is `"completed"`, but the Job model enum (`src/types/job.ts`) has no `"completed"` value — it is `posted | accepted | in_transit | delivered | cancelled`. Rather than inventing a new status (which the strict constraints forbid), the trigger is `JOB_STATUS.DELIVERED`. "Delivered" is the terminal success state of a job, so it is the correct existing-value mapping. All checks reference `JOB_STATUS.DELIVERED` (no hardcoded string).
- **Compound unique index as the only duplicate guard**: Duplicate prevention is `ratingSchema.index({ jobId: 1, fromUserId: 1 }, { unique: true })` — no application-level pre-check. The `POST` route catches the MongoDB E11000 error and returns 409. Rationale: the index is race-proof under concurrent requests, while a check-then-insert application pattern has a TOCTOU window. Tradeoff is answered in the Day 24 prompt below.
- **Denormalized `ratingAvg`/`ratingCount`**: recompute-and-store on every new rating via `updateDriverRating`, invoked fire-and-forget (`updateDriverRating(toUserId).catch(...)`) so the 201 response is not blocked by aggregation latency. The helper itself only runs when the recipient is a driver (role check).
- **`withAuth()` for submission, no auth for reviews**: rating submission needs the requester identity for participant/self-rating checks, so it uses `withAuth()`. Reviews are public read data (like job browsing), so the reviews/profile endpoints are unauthenticated.
- **Check endpoint is user-scoped**: `GET /api/ratings/check` is `withAuth()`-wrapped and queries `{ jobId, fromUserId: user.userId }`. An earlier version returned `rated: true` if *anyone* rated the job (no user context), which would falsely show "Already submitted" to a participant who hadn't rated. Scoping to the requester fixes the "Already submitted" state.
- **`toUserId` must be the other participant**: beyond the self-rating guard, the submit route validates `toUserId === (isPoster ? job.driverId : job.posterId)`, rejecting ratings sent to arbitrary users with 400.
- **Reviews paginated from day one**: `GET /api/drivers/:id/reviews` defaults to `limit = 10` with `page`/`total`/`totalPages`, per the never-fetch-all-records rule. The public profile page reads only the first page.
- **Recipient's name is fetched, not guessed**: the rate page resolves the driver's real name through `useDriverPublicProfile(job.driverId)` instead of a placeholder, matching the design reference's "How did {name} do?".

### Learning Prompt (Day 24): Compound unique index vs application-level duplicate check?
The compound unique index `{ jobId: 1, fromUserId: 1 }` is the cleanest and is what this project uses. An application-level check (`Rating.findOne({ jobId, fromUserId })` before insert) has a **time-of-check to time-of-use (TOCTOU) race**: two concurrent submissions can both pass the check and both insert. The unique index makes the database the single arbiter — the second insert fails atomically with an E11000 error, which the route maps to 409. The tradeoff is ergonomics: index violations surface as a `MongoServerError` you must detect via `error.code === 11000` (or the message), which is less readable than a clean "not found" check, and duplicate detection is coupled to the error-handling path. The app-level check is friendlier to read but only correct in single-writer scenarios or where duplicates are merely discouraged, not forbidden. For "never more than one rating per job per user", the unique index is the correct choice; a common hybrid is both — index for correctness, check for friendly error messages — but here the 409 branch already provides a friendly message, so no app-level check was added (per the plan's constraint).

### Learning Prompt (Day 25): On-demand average vs denormalized average on write?
Computing on-demand means each driver profile view runs an aggregation over that user's ratings and returns the live number — no extra state, always fresh, but every read pays the aggregation cost and the number grows linearly with the ratings collection. Storing a denormalized `ratingAvg`/`ratingCount` on the profile means reads are O(1) lookups, and the cost is paid once per write (one aggregation + one profile update per new rating). This project uses the denormalized approach per the PRD schema. Tradeoffs: on-demand wins when reads are rare and writes frequent; denormalized wins when reads dominate (the common case for a public profile page) and when you want the profile document itself to stay self-contained for list views. The costs of denormalization are write-path latency (mitigated here by fire-and-forget) and drift risk if ratings are ever deleted or edited without re-running the aggregation — which is why the aggregation is the single write point, keyed off `toUserId`, and recomputes from the full ratings set every time rather than incrementally.

### Learning Prompt (Day 26): Quiz — MongoDB aggregation pipelines ($match, $group, $avg)
Two example scenarios exercising the same pipeline family as `updateDriverRating`:

1. **Average job offer price per vehicle type.** `$match` only non-cancelled jobs, `$group` by `vehicleType` with `$avg: "$offeredPrice"`, `$sort` descending. Pipeline: `[{ $match: { status: { $ne: "cancelled" } } }, { $group: { _id: "$vehicleType", avgPrice: { $avg: "$offeredPrice" } } }, { $sort: { avgPrice: -1 } }]`.
2. **Top-rated drivers with a minimum review count.** `$group` ratings by `toUserId` computing `$avg` score and `$count`, then `$match` the grouped result with `count >= 5` (a `$match` after `$group` filters aggregates, not source docs), then `$lookup` the User names, `$sort` by avg descending, `$limit 10`.

Key points the quiz targets: `$match` before `$group` filters input documents and can use indexes; `$match` after `$group` filters group results and cannot use the original indexes; `_id` in `$group` is the grouping key; `$avg`/`$sum`/`$count` are accumulator operators that only make sense inside `$group`; and the pipeline is order-sensitive.

### Design System Notes
- **Star ratings**: Material Symbols `star` (filled via `fontVariationSettings: "'FILL' 1"`), `star_half`, and outline stars. Active color `warning-amber`; inactive `secondary-fixed-dim`. Rating banner uses `primary-fixed` / `on-primary-fixed` on the profile page.
- **Star selector touch targets**: each selectable star is `h-12 w-12` with flex centering so the visual 4xl glyph keeps its size while meeting the 48px mobile target.
- **Driver profile bento grid**: 12-column grid — hero card `md:col-span-4`, rating + reviews stack `md:col-span-8`; collapses to single column on mobile.

---

## Days 27–29 — Real-Time Pusher Infrastructure

### New Files
- `src/lib/pusher.ts` — Server-side Pusher instance (`pusherServer`). Reads `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` from env. Used by all server-trigger helpers.
- `src/lib/pusherClient.ts` — Client-side Pusher-JS instance (`pusherClient`). Reads `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`. Dynamic-imported in the test page to avoid SSR issues.
- `src/lib/triggerJobEvent.ts` — `triggerJobEvent(jobId, eventName, payload)` helper. Triggers to the private channel `private-job-{jobId}`. Event names are a closed union: `'location-update' | 'new-message' | 'status-change'`. Channel name built from a `PRIVATE_CHANNEL_PREFIX` constant (no magic strings).
- `src/app/api/pusher/auth/route.ts` — `POST /api/pusher/auth`. Protected by `withAuth()`. Parses `{ socket_id, channel_name }`, extracts `jobId` from the `private-job-` prefix, verifies the authenticated user is `posterId` or `driverId` on that Job, then returns `pusherServer.authorizeChannel(socket_id, channel_name)`. Returns 403 for non-participants, 400 for invalid channel names.
- `src/app/api/test-pusher/route.ts` — Throwaway `POST /api/test-pusher` (no auth). Triggers `test-event` on `test-channel` with `{ message, timestamp }`. Returns `{ ok: true }`.
- `src/app/(dashboard)/pusher-test/page.tsx` — Throwaway `'use client'` page at `/pusher-test`. On mount, dynamically imports `pusherClient`, subscribes to `test-channel`, binds `test-event`, appends received messages to state. Button calls `POST /api/test-pusher`. Unsubscribes on unmount. Uses public channel (intentional — no auth for the throwaway test).
- `src/app/api/jobs/[id]/location/route.ts` — `POST /api/jobs/:id/location`. Protected by `withAuth()`. Validates body `{ lat: z.number(), lng: z.number() }`. Confirms the requester is the job's `driverId` (403 otherwise). Calls `triggerJobEvent(jobId, 'location-update', { lat, lng, timestamp, driverId })`. Returns `{ ok: true }`.

### API Routes Added
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/pusher/auth` | `withAuth()` | Authorize private channel subscription |
| POST | `/api/test-pusher` | none | Throwaway test trigger |
| POST | `/api/jobs/:id/location` | `withAuth()` | Driver sends GPS ping → broadcasts to job channel |

### Architectural Decisions
- **Private channels over public channels for job data**: Job-specific events (location updates, status changes, messages) use `private-job-{jobId}` channels. Private channels require server-side authorization before the client can subscribe, enforced by `/api/pusher/auth`. This prevents unauthorized clients from reading real-time job data. The test page intentionally uses the public `test-channel` — that is a throwaway, not a production pattern.
- **`triggerJobEvent` centralizes all channel triggers**: Rather than calling `pusherServer.trigger()` directly in every route handler, all server-triggered events go through `triggerJobEvent`. This keeps the channel naming convention (`private-job-` prefix) in one place — if the prefix ever changes, only `triggerJobEvent` needs updating.
- **Dynamic import of `pusherClient` on the client**: The test page uses `import("@/lib/pusherClient")` inside a `useEffect` rather than a top-level import. This prevents `pusher-js` from being bundled into the server-side SSR build, which would fail because `WebSocket` is not available in Node.js. All future client-side Pusher pages should follow this pattern.
- **`/api/pusher/auth` extracts jobId from the channel name**: Rather than accepting `jobId` as a separate body field, the endpoint parses it from `channel_name`. This matches Pusher's auth protocol — Pusher sends the exact `channel_name` it needs authorized, so deriving `jobId` from it avoids a second trust boundary.
- **Location ping requires driver identity**: `POST /api/jobs/:id/location` compares `user.userId` against `job.driverId`. Only the assigned driver can send GPS pings for a job. This is checked after the Job is fetched, so a 404 for a missing job returns before the role check (consistent with the existing accept-route pattern).
- **Zod validation on `body: unknown`**: The location route parses the body as `unknown` and validates with Zod before accessing `lat`/`lng`. This follows the project-wide convention (no implicit `any` from `req.json()`).

### Learning Prompt: Why does Pusher use separate app-level keys for server vs client?
Pusher's security model requires two layers: the **app secret** (server-only, used to sign channel authorization responses and trigger events) and the **app key** (client-safe, used to establish the WebSocket connection). Exposing the secret on the client would allow any visitor to trigger arbitrary events on any channel. The `NEXT_PUBLIC_` prefix in Next.js enforces this boundary — only `NEXT_PUBLIC_PUSHER_KEY` and `NEXT_PUBLIC_PUSHER_CLUSTER` are available in browser bundles, while `PUSHER_SECRET` and `PUSHER_APP_ID` stay server-side. The key and cluster are duplicated across server/client env vars because the server Pusher instance also needs them, but the secret never crosses the boundary.

### Learning Prompt: Why authorize channels server-side instead of relying on Pusher's app-level access controls?
Pusher private channels require an authorization request: when a client subscribes, Pusher's servers call your `/api/pusher/auth` endpoint with the `socket_id` and `channel_name`. Your server verifies the user is allowed to view that channel and signs the response. This means access control logic lives entirely in your codebase — you decide who sees what. Without it, any authenticated user could subscribe to any `private-job-*` channel regardless of whether they are the poster or driver. The `/api/pusher/auth` route is the gatekeeper: it fetches the Job, checks poster/driver membership, and rejects non-participants with 403. This is the same pattern used by the job detail API (`GET /api/jobs/:id`) but applied at the WebSocket subscription layer.

---

## Days 30–32 — Live Tracking, Location History, and Messaging

### New Files
- `src/components/LiveTrackingMap.tsx` — `"use client"` Leaflet map. Props: `jobId`, `initialLat/Lng`, optional `pickupLat/Lng`, `dropoffLat/Lng`, `routePath` (renders the OSRM `<Polyline>`), `vehiclePosition` (controlled marker), `onLocationUpdate` (parent callback). Zoom 13, OSM tiles. Custom `divIcon` markers for PICKUP (white pill, green text, store icon), DROPOFF (pill, flag icon), and the moving vehicle (pulsing blue circle, truck icon). Single marker instance via `useRef` — updates use `marker.setLatLng()` without re-mounting. Subscribes to `private-job-{jobId}`, binds `location-update`, unsubscribes/unbinds on unmount. Default Leaflet icon fixed via `L.Icon.Default.mergeOptions` pointing at `public/leaflet/`.
- `src/utils/geocode.ts` — Shared `geocodeAddress(address)` + `Coordinates` type (moved from the local copy inside `MapPreview.tsx`; that component still works, only the new tracking page uses the shared version). Nominatim, `swiftship-dev/1.0` UA.
- `src/app/(tracking)/jobs/[id]/track/page.tsx` — Poster live-tracking view at `/jobs/[id]/track`, full-screen, no layout wrapper (its own shell). Desktop `w-64` sidebar (SwiftShip logo, Dashboard, Jobs, Deliveries [active], Wallet, Settings, user profile), mobile `h-12` top bar. Center: `LiveTrackingMap` via `next/dynamic({ ssr: false })`, only for `accepted`/`in_transit`; geocoded pickup/dropoff coords with Kathmandu fallback `[27.7172, 85.3240]`; `MapPlaceholder` for posted/delivered/cancelled/geocoding. Right floating panel (`md:absolute md:top-6 md:right-6 md:w-[400px]`, bottom sheet on mobile): ETA header, status badge, courier card (avatar initials, name, vehicle, `ratingAvg`), 4-stage delivery stepper (Confirmed / Picked Up / On the way / Dropoff) with state derived from `JOB_STATUS`, and Support/Call Driver actions.
- `src/models/LocationPing.ts` — `jobId` (Ref Job, index), `driverId` (Ref User), `lat`, `lng`, `timestamp`, `expiresAt`. TTL index `{ expiresAt: 1 }` with `expireAfterSeconds: 0` (MongoDB background deleter purges after `expiresAt`). Compound index `{ jobId: 1, timestamp: -1 }` for per-job history queries. HMR guard.
- `src/models/Message.ts` — `jobId` (Ref Job), `senderId`/`recipientId` (Ref User), `content` (maxlength 2000 via exported `MESSAGE_MAX_LENGTH`), `readAt` (nullable), `createdAt` only (no `updatedAt`). Indexes: `{ jobId: 1, createdAt: 1 }` (conversation history) and `{ recipientId: 1, readAt: 1 }` (unread queries). HMR guard.
- `src/types/message/message.ts` — `Message` + `GetMessagesResponse` mirroring the API response.
- `src/app/api/jobs/[id]/messages/route.ts` — `GET /api/jobs/:id/messages`. `withAuth()`; 404 if the job is missing; 403 unless the user is `posterId` or `driverId`; paginated `page`/`limit` (default 50, max 100, clamped via `Math.min`); returns `{ messages, total, page, limit, totalPages }` sorted `createdAt` ascending (oldest-first).
- `public/leaflet/` — copies of `marker-icon.png`, `marker-icon-2x.png`, `marker-shadow.png` (for the default-icon fix).

### Modified Files
- `src/app/api/jobs/[id]/location/route.ts` — Added fire-and-forget `LocationPing.create` (never awaited — `void ... .catch(...)`); `expiresAt = now + 48h` via `LOCATION_TTL_HOURS` constant. Pusher trigger logic unchanged.
- `src/app/globals.css` — Added `swiftship-pulse` keyframe for the vehicle marker ring.

### API Routes Added
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/jobs/:id/messages?page=&limit=` | `withAuth()` | Paginated job conversation history (participants only) |

### Architectural Decisions
- **Tracking view lives at `/jobs/[id]/track`, not `/jobs/[id]`**: the existing driver-facing detail page (`(main)/jobs/[id]/page.tsx`) already owns `/jobs/[id]`, and two route groups cannot map the same path. The tracking page is a distinct poster-only view with its own full-screen shell, so it sits in a dedicated `(tracking)` route group with no layout wrapper (the design's sidebar/top bar are rendered by the page itself).
- **Single marker instance updated via `setLatLng`**: the vehicle marker's `position` prop is set once (initial/pickup coords) and never changes from React state; `location-update` events call `markerRef.current.setLatLng()` directly. This avoids re-rendering the whole map on every GPS ping — the optimization the design reference demands.
- **`divIcon` markers instead of the default Leaflet icon**: the design's PICKUP/DROPOFF/vehicle markers are styled pills/circles, so they use `L.divIcon` with inline HTML (Material Symbols render because the font is loaded globally in `layout.tsx`). The default-icon fix (`L.Icon.Default.mergeOptions` + `public/leaflet/` assets) is applied anyway so any future bare `<Marker>` won't hit the classic broken-icon bug. Note: the pre-existing `src/utils/mapIcons.js` is broken (`new L.Icon` without importing `L`) — left untouched since `MapPreview.tsx` is not part of this phase.
- **Kathmandu fallback for pickup coords**: the Job model stores addresses as strings, not coordinates. The page geocodes `pickupAddress`/`dropoffAddress` via Nominatim (shared `geocode.ts`) and falls back to Kathmandu `[27.7172, 85.3240]` so the map always has a center. A `isGeocoding` placeholder ("Locating pickup point") shows while resolving instead of flashing the wrong state.
- **Location pings persisted fire-and-forget**: `POST /api/jobs/:id/location` returns `{ ok: true }` immediately after the Pusher trigger; the DB write is not awaited (`void ... .catch(console.error)`). Same pattern as `updateDriverRating` — the live response must not be delayed by persistence, and a failed write degrades to "no history" rather than a 500.
- **48h TTL via `expireAfterSeconds: 0`**: the TTL index deletes each document when `expiresAt` passes. The constant `LOCATION_TTL_HOURS = 48` keeps the expiry policy in one place. The compound `{ jobId, timestamp: -1 }` index serves future "playback route" queries (e.g., replay a delivery's path).
- **Messages are job-scoped, participant-only**: the endpoint reuses the exact participant check from the Pusher auth route (poster or driver, strings compared via `String()`). Pagination defaults to 50 with a hard cap of 100 (`Math.min`), oldest-first sort, mirroring the reviews endpoint's shape (`total`/`page`/`totalPages`).

### Learning Prompt: Why is `expireAfterSeconds: 0` used for the TTL instead of a fixed number of seconds?
Because the expiry instant is stored per-document on `expiresAt` (which the app sets to `now + 48h`). MongoDB's TTL monitor deletes a document when `expiresAt <= now + expireAfterSeconds`. Setting `expireAfterSeconds: 0` makes the effective delete time exactly `expiresAt`, so the 48-hour policy lives in application code (`LOCATION_TTL_HOURS`) rather than being baked into the index. If the retention period ever changes (e.g., to 24h), only the write path changes — no index rebuild. A fixed `expireAfterSeconds: 86400` would be the right tool when every document should live for the same duration from creation, which isn't the case here (pings for an in-progress job would all get swept on the same absolute clock otherwise).

## Day 27 — Driver Execution UI & Live Route ETA (Phases 2+3)

### New Files
- `src/app/(tracking)/jobs/[id]/active/page.tsx` — driver execution page (`/jobs/[id]/active`).
- `src/utils/routing.ts` — `fetchRoute()` (OSRM Directions API → `{ path, distanceM, durationS }`), `interpolateAlongPath()` (haversine-weighted), `ROUTE_POLYLINE_STYLE`.
- `src/utils/throttle.ts` — `createThrottle(intervalMs)` leading-edge throttle.

### Modified Files
- `src/components/LiveTrackingMap.tsx` — new optional props: `routePath` (renders `<Polyline>`), `vehiclePosition` (controlled marker via `markerRef.setLatLng`), `onLocationUpdate` (callback to parent). New `RouteBoundsUpdater` fits the view to the full route once on load (never re-fits on live movement).
- `src/app/(tracking)/jobs/[id]/track/page.tsx` — poster tracking page.
- `src/utils/format.ts` — `formatEtaLabel`, `formatDistanceMiles`, `formatArrivalTime`.
- `src/app/(main)/jobs/[id]/page.tsx` — accepted card now links to `/jobs/[id]/active`.

### Driver Execution Page (`/jobs/[id]/active`)
- Placed in the `(tracking)` route group (no dashboard layout) so the map is truly full-screen, mirroring the poster track page. URL is the same as the plan's `(dashboard)` proposal; the group only changes the layout chrome.
- Auth + assignment guard: renders "Not Authorized" unless `user.role === "driver"` and `user._id === job.driverId`.
- **Start Delivery** → `POST /api/jobs/:id/transit` (status `accepted → in_transit`); **Mark Delivered** → `POST /api/jobs/:id/deliver` (only visible while in transit); delivered state renders a completion card.
- GPS: while `in_transit` (and not simulating), `navigator.geolocation.watchPosition` updates the marker locally via `vehiclePosition` and pings `POST /api/jobs/:id/location` throttled to 10s (`createThrottle`).
- **Simulate GPS toggle**: drives a vehicle along the OSRM path (`interpolateAlongPath`, 40 × 1s steps) so the demo works without a GPS device; sends the same pings.

### Poster Tracking Page Updates
- **Blue route polyline**: OSRM route is fetched from the driver's live position (or pickup before the first ping) to the dropoff and drawn via `<Polyline>` — replaces the "missing blue line".
- **Dynamic ETA**: "Arriving in X mins" + distance from `routeData.durationS`/`distanceM`; "Est. HH:MM" is anchored to the last location ping's server timestamp (`livePingTime`) rather than `Date.now()` during render (keeps the render pure per the lint rule).
- **Live status**: subscribes to `status-change` on `private-job-{id}` and patches the React Query cache (`setQueryData`), so the badge/stepper/map unlock without a refetch. Route re-fetches on each live location change (~10s cadence set by the driver's ping throttle).

### Architectural Decisions
- **Same URL, different group**: `(dashboard)` layout wraps children in a 256px sidebar + mobile bars, which would fight a full-screen driving map. Putting the page in `(tracking)` gives identical `/jobs/[id]/active` URLs with no chrome.
- **Controlled `vehiclePosition` + Pusher echo**: the driver's marker moves instantly from local GPS (controlled prop → `setLatLng`), and the poster's marker moves via the Pusher `location-update` echo. Both paths reuse the same single-marker `setLatLng` optimization.
- **ETA anchored to ping time**: the poster cannot call `Date.now()` in render (lint rule `react-hooks/purity`). Using the driver ping's server timestamp as the anchor is semantically correct and keeps rendering pure.
- **Fire-and-forget pings**: the driver page does not await the location POST; a failed ping only logs, matching the server's own fire-and-forget persistence pattern.

### Design System Notes
- **Live-tracking shell**: full-screen `h-screen w-screen flex overflow-hidden`; desktop `w-64` sidebar (same SwiftShip logo block and nav-item styles as the dashboard layout), mobile `h-12` top bar; main canvas `flex-1 relative overflow-hidden`.
- **Floating detail panel**: `md:absolute md:top-6 md:right-6 md:w-[400px] md:max-h-[calc(100vh-3rem)]`, `bg-surface-white md:rounded-xl shadow-lg border border-secondary-container flex flex-col`; bottom sheet (`inset-x-0 bottom-0`) on mobile. Header `bg-surface-bright p-6 border-b border-surface-container-high`; body `flex-1 overflow-y-auto p-6 space-y-8`; footer `p-6 border-t border-secondary-container flex gap-3`.
- **Status badge**: rounded-full pill, per-status token classes (accepted/in_transit → `bg-primary/10 text-primary`; delivered → `bg-success-green/10 text-success-green`; cancelled → `bg-error-container text-error-red`).
- **Delivery stepper**: left vertical line (`w-px bg-surface-container-high`); completed node `bg-success-green` with white check; active node white circle with `border-2 border-primary` + pulsing `w-2.5 h-2.5 bg-primary` dot; pending node `border-2 border-secondary-fixed-dim`.
- **Map markers**: PICKUP/DROPOFF pills (`#fff` bg, `#05A357` text, radius 17px, shadow), vehicle = solid `#276EF1` circle over a `swiftship-pulse` animated ring (keyframe added to `globals.css`).