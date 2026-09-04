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
- Created Login page at `src/app/login/page.tsx` â€” split-screen layout with hero image panel (desktop) and form panel. Connects to `POST /api/auth/login`.
- Integrated a comprehensive Design System into `src/app/globals.css`.
- Replaced custom layout with the finalized **SwiftShip** Design System.

## Standard Development Rules
### Mongoose & Next.js HMR Pattern
In a Next.js development environment, Hot Module Replacement (HMR) causes files to be re-run frequently. Without a proper guard, Mongoose will attempt to re-register the same model and throw an `OverwriteModelError`.
**Rule:** Always export models using the `mongoose.models.ModelName || mongoose.model('ModelName', schema)` pattern.

### Images in Next.js
**Rule:** Always configure external hostnames in `next.config.ts` under `images.remotePatterns` before using Next.js `<Image>` components to prevent runtime errors.

---

## Day 4 â€” JWT Login Endpoint

### API Routes
- `POST /api/auth/login`: Accepts `{ email, password }`. Finds user by email, runs `bcrypt.compare` (always â€” even when user is not found, to prevent timing attacks), signs a 15-minute JWT access token and a 7-day refresh token, stores a SHA-256 hash of the refresh token on the User document, and returns `{ accessToken, refreshToken }`.

### New Files
- `src/app/api/auth/login/route.ts` â€” login handler
- `src/lib/auth.ts` â€” `signAccessToken`, `signRefreshToken`, `verifyRefreshToken`, `hashToken`
- `src/types/auth.ts` â€” `JwtAccessPayload`, `JwtRefreshPayload` interfaces

### Modified Files
- `src/models/User.ts` â€” added `refreshTokenHash?: string | null` field
- `.env.local` â€” replaced `JWT_SECRET` with `JWT_ACCESS_SECRET` + `JWT_REFRESH_SECRET`

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

## Day 5 â€” Refresh Token Rotation

### API Routes
- `POST /api/auth/refresh`: Accepts `{ refreshToken }`. Verifies signature and expiry with `JWT_REFRESH_SECRET`, fetches the user, SHA-256 hashes the incoming token and compares it against `user.refreshTokenHash`. On match: issues new access + refresh tokens, updates the stored hash (rotation), returns `{ accessToken, refreshToken }`. On mismatch: returns 401.

### Architectural Decisions
- **Single `refreshTokenHash` on User document (Option A)**: One active session per user. Simpler than a separate collection â€” easy to migrate to multi-session later when we need it.
- **Token rotation on every use**: Each refresh token is single-use. The moment it is consumed the DB hash is overwritten. If a stolen token is used first, the legitimate user's next call fails (hash mismatch) â€” signaling compromise. If the legitimate user uses it first, the stolen copy is immediately invalidated.

### Learning Prompt: Why rotate refresh tokens on every use?
Refresh tokens are long-lived. If an attacker silently copies one (XSS, log leak, network interception), they can abuse it for its full 7-day lifetime without detection. **Rotation collapses that window to a single request.** The first party to use the token wins; the second party gets a 401. This converts a silent long-term compromise into an immediately detectable event.

---

## Day 6 â€” Auth Middleware

### New Files
- `src/lib/auth.ts` â€” Added `withAuth` higher-order function (HOF).

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

## Day 7 â€” `/api/me` & Logout

### New Files
- `src/app/api/auth/me/route.ts` â€” Retrieves the authenticated user's profile.
- `src/app/api/auth/logout/route.ts` â€” Invalidates the session.

### Architectural Decisions
- **Profile Retrieval (`/me`)**: Wraps the route with `withAuth`. Uses the `userId` from the verified JWT payload to fetch the full User document from MongoDB (excluding the password and token hashes).
- **Logout Logic**: 
  1. Revokes the `refreshTokenHash` in MongoDB to prevent future rotations.
  2. Clears the `accessToken` and `refreshToken` cookies by sending `Set-Cookie` headers with `Max-Age=0`.
- **JWT Stateless Tradeoff**: Because the `accessToken` is a stateless JWT, the logout route *cannot* instantly invalidate it globally. If an attacker possesses the raw token, it remains technically valid until its 15-minute expiration hits. This is the accepted tradeoff of stateless JWTs, mitigated by the short TTL.

---

## Day 8 â€” Role-Based Access Control (RBAC)

### New Files
- `src/lib/auth.ts` â€” Added `withRole(allowedRoles)` HOF.

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

## Day 9 â€” Google OAuth via Auth.js

### New Files
- `src/app/api/auth/[...nextauth]/route.ts` â€” NextAuth handler
- `src/components/providers/AuthProvider.tsx` â€” SessionProvider wrapper

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

## Day 10 â€” Session Unification

### Modified Files
- `src/app/api/auth/[...nextauth]/route.ts` â€” Updated the `signIn` callback to issue our own custom JWTs.

### Architectural Decisions
- **Standardizing on Custom JWT**: Instead of having the frontend and API routes deal with two different session formats (Auth.js session vs our JWT session), we chose unification.
- During the Auth.js `signIn` callback, immediately after creating/finding the Google user in MongoDB, we use `cookies()` from `next/headers` to issue our custom `accessToken` and `refreshToken` directly.
- NextAuth still issues its native session cookie, but our application ignores it and relies entirely on our custom tokens. This ensures our `withAuth` and `withRole` middleware works flawlessly for all users, regardless of how they logged in.

---

## Day 11 â€” Phase 1 Review

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

## Days 12â€“13 â€” Job Schema + Create Endpoint

### New Files
- `src/types/job.ts` â€” Zod schemas and TypeScript types for jobs.
- `src/models/Job.ts` â€” Mongoose Job model.
- `src/app/api/jobs/route.ts` â€” `POST /api/jobs` and `GET /api/jobs` handlers.

### Type Architecture â€” "Define Once" Pattern
`src/types/job.ts` is the **single source of truth** for all job validation. It exports:
- `jobCreationSchema` â€” full schema used by `POST /api/jobs` on the server.
- `jobLocationSchema` â€” `.pick()` slice used by the form's Step 1.
- `jobVehicleSchema` â€” `.pick()` slice used by the form's Step 2.
- `JOB_STATUS` / `JOB_VEHICLE_TYPE` â€” constants imported by the Mongoose model, API routes, and UI.

No schema is ever duplicated. Both the API route and each form step import from the same file.

### Job Model Fields
| Field | Type | Notes |
|---|---|---|
| `posterId` | `ObjectId` ref `User` | Set from JWT â€” never trusted from body |
| `driverId` | `ObjectId` ref `User` | Nullable; set when job is accepted |
| `status` | enum | `posted \| accepted \| in_transit \| delivered \| cancelled` â€” indexed |
| `pickupAddress` | `string` | Plain text |
| `dropoffAddress` | `string` | Plain text |
| `vehicleType` | enum | `bicycle \| motorcycle \| car \| van \| truck` |
| `packageDescription` | `string?` | Optional |
| `offeredPrice` | `number` | Integer cents (e.g., $12.99 â†’ `1299`) to avoid float precision issues |
| `createdAt` / `updatedAt` | Date | Auto via `{ timestamps: true }` |

### POST /api/jobs
- Protected by `withRole(["poster"])` â€” drivers get `403`, unauthenticated gets `401`.
- `posterId` set from `user.userId` in the JWT payload â€” a client cannot forge this.
- `status` hardcoded to `"posted"` â€” a client cannot override it.
- Validates body with `jobCreationSchema.safeParse()` â€” returns field-level errors on `400`.

### Architectural Decision: offeredPrice as Integer Cents
Storing currency as float causes silent precision errors in JavaScript (`0.1 + 0.2 !== 0.3`). Storing as integer cents (`1299`) makes arithmetic exact. The API accepts cents directly; the form (Day 16) converts from a decimal input before submitting.

---

## Day 14 â€” List/Filter Jobs Endpoint

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
Adding `index: true` to `status` is correct even at < 1,000 documents because: (1) adding an index to an empty collection is instant â€” adding it to 10M documents requires a blocking rebuild; (2) it builds the habit of annotating high-selectivity fields from the start; (3) MongoDB M0 free tier has limited index slots, teaching intentional index design.

---

## Day 15 â€” Job Posting Form (Steps 1â€“2)

### New Files
- `src/app/post-job/page.tsx` â€” Multi-step job posting form. Steps 1 & 2 built; Step 3 is a placeholder pending Day 16.
- `design-reference/job-posting-form/` â€” Stitch design assets for all 3 steps (screenshots + annotated HTML reference).

### Form Architecture
- **Step state**: local `useState` in the page component. No Zustand â€” overkill for 2 steps.
- **Step 1** (`StepLocations`): `zodResolver(jobLocationSchema)` â€” validates `pickupAddress` + `dropoffAddress`. Blocks "Next" on invalid input.
- **Step 2** (`StepVehicle`): `zodResolver(jobVehicleSchema)` â€” validates `vehicleType`. Vehicle selection calls `setValue` to drive RHF state, keeping radio-card selection governed by form validation rather than raw `useState`.

### Leaflet Map Preview Integration
- `src/components/MapPreview.tsx` â€” A static `react-leaflet` preview for Step 1.
- Receives `pickupAddress` and `dropoffAddress` via props and debounces them internally.
- Calls Nominatim Geocoding API to resolve coordinates, drops pins for each.
- When both are resolved, calls OSRM Directions API to draw a route polyline.
- Handles empty/partially filled states gracefully. Bounds auto-fit to the pins. 

### Learning Prompt: Clean multi-step form validation against a schema slice
Pattern: `const sliceSchema = fullSchema.pick({ field1: true, field2: true })`, then `useForm({ resolver: zodResolver(sliceSchema) })`. Each step validates only its own fields. On Day 16, all partials merge into the full `jobCreationSchema` shape before the API call. This avoids schema duplication and false validation failures on fields the user hasn't seen yet.

---

## Day 16 â€” Job Posting Form (Steps 3â€“4)

### Component Refactoring
Per standards, extracted multi-step form components into `src/components/post-job/`:
- `src/components/post-job/ProgressBar.tsx` â€” Progress indicator with 4 segments
- `src/components/post-job/FormFieldError.tsx` â€” Reusable error display
- `src/components/post-job/VehicleCard.tsx` â€” Card component for vehicle selection
- `src/components/post-job/StepLocations.tsx` â€” Step 1 form (pickup/dropoff)
- `src/components/post-job/StepVehicle.tsx` â€” Step 2 form (vehicle type)
- `src/components/post-job/StepPricing.tsx` â€” Step 3 form with price suggestion
- `src/components/post-job/StepReview.tsx` â€” Step 4 review and submit

### Step 3 â€” Pricing & Schedule
- **Price suggestion**: Vehicle-aware â€” uses the vehicle chosen in Step 2 plus Haversine distance between pickup/dropoff coordinates (geocoded via the `/api/geocode` proxy).
- **Formula**: `baseCents + max(0, km - freeKm) * perKmCents`, with a per-vehicle rate tier (`VEHICLE_RATES` in `src/lib/pricing.ts`). Each tier encodes its weight-capacity bracket (bicycle 5 kg, car 50 kg, van 500 kg, truck 2000 kg), mirroring the base-fare + distance + weight factors used by Nepali delivery platforms (Pathao Parcel et al.). Placeholder rates â€” tune per market.
- **UI**: Pre-filled `offeredPrice` in cents, but editable for user override.
- **Package description**: Optional textarea for delivery notes.

### Step 4 â€” Review & Submit
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

## Day 17 â€” Driver Browse Page

### New Files
- `src/app/jobs/browse/page.tsx` â€” Driver-facing job listings with filters, pagination, and map preview.

### Data Fetching
- `GET /api/jobs?status=posted` via TanStack Query (`useQuery` with `JOBS_QUERY_KEY = "browse-jobs"`).
- Query key includes `page`, `selectedVehicleTypes`, and `minPayoutCents` so changing a filter refetches scoped results.
- The client fetcher additionally filters the returned list by selected vehicle types and minimum payout before rendering; pagination resets to page 1 on any filter change (`setPage(1)` in each `onChange` handler).

### Filters
- **Vehicle Requirement**: checkboxes toggling each `JOB_VEHICLE_TYPE` value via a single `useCallback` toggle handler.
- **Distance (Radius)**: static `DISTANCE_RADIUS_OPTIONS` select (visual only â€” geocoding radius filtering is not wired server-side yet).
- **Minimum Payout**: range input in whole dollars; converted to cents in a `useMemo` for the query key/API.

### States
- Loading: `JobCardSkeleton` card placeholders.
- Error: centered error card with message from `error`.
- Empty: illustration card with a "Clear vehicle filter" action when filters are active.
- Data: `JobCard` list plus pagination footer (Previous/Next, page-of-total).

### Layout
- Three-column on desktop (`lg:flex-row`): filters sidebar, job list, sticky `MapPreview` map panel (`hidden lg:block`). Single-column with stacked sections on mobile.

### Role Scoping
- Drivers see only `status=posted` jobs by default. Posters are blocked by the `GET /api/jobs` role-scoping â€” the browse page itself just relies on the API contract.

---

## Day 18 â€” Job Detail & Accept Endpoint

### New Files
- `src/app/api/jobs/[id]/route.ts` â€” `GET /api/jobs/:id`.
- `src/app/api/jobs/[id]/accept/route.ts` â€” `POST /api/jobs/:id/accept`.
- `src/app/api/jobs/[id]/transit/route.ts` â€” `POST /api/jobs/:id/transit`.
- `src/app/api/jobs/[id]/deliver/route.ts` â€” `POST /api/jobs/:id/deliver`.
- `src/app/jobs/[id]/page.tsx` â€” Job detail page.

### API Routes
- **`GET /api/jobs/:id`** â€” `withAuth`. Loads the job and returns `{ job }`. Role scoping:
  - `poster`: 403 unless `job.posterId === user.userId`.
  - `driver`: 403 unless the job is `posted` (open) or `job.driverId === user.userId` (their own accepted job).
  - `admin`: sees all.
- **`POST /api/jobs/:id/accept`** â€” `withRole(["driver"])`. Atomic `findOneAndUpdate({ _id: id, status: "posted" }, { status: "accepted", driverId: user.userId })`. If no document matches, returns `409` ("no longer available"), preventing double-accept races.
- **`POST /api/jobs/:id/transit`** â€” `withRole(["driver"])`. Atomic `findOneAndUpdate({ _id: id, driverId: user.userId, status: "accepted" }, { status: "in_transit" })`. The `driverId` in the filter guarantees only the assigned driver can transition a job that is exactly `accepted`; `409` on any mismatch (unassigned driver, or status not `accepted`). On success triggers Pusher `status-change` with the new status + timestamp.
- **`POST /api/jobs/:id/deliver`** â€” `withRole(["driver"])`. Atomic `findOneAndUpdate({ _id: id, driverId: user.userId, status: "in_transit" }, { status: "delivered" })`; `409` on out-of-order or unassigned calls; triggers Pusher `status-change` on success. Enforces the strict `accepted â†’ in_transit â†’ delivered` state machine.
- Both follow the `console.error` + `{ message }` error convention used across the jobs/auth routes.

### Page (`src/app/jobs/[id]/page.tsx`)
- Fetches the job with `useQuery` keyed `["job-detail", id]`; accepts via `useMutation`, then invalidates the query so the UI reflects `accepted`.
- **Contact info gating**: pickup/dropoff contact name & phone are shown only when `isContactRevealed` (`status !== "posted"`); otherwise an italic "revealed after acceptance" note renders.
- **Accept flow**: primary "Accept Job" button with pending spinner + disabled state and a tonal "Decline" button (`window.history.back()`). On mutation error, an inline error banner renders. On success, an "Accepted" confirmation card replaces the action block and contact info appears.
- Status badge uses a `STATUS_STYLES` map for posted / accepted / in_transit / delivered / cancelled.

### Architectural Decisions
- **Code-first gate over data stripping**: contact info is simply hidden in the UI until `status` leaves `posted`; the detail route still returns all fields to the driver. This matches the "display belongs in the component, data in the layer" standard.

### Learning Prompt: Why is accept an atomic conditional update instead of find-then-update?
A find-then-update has a race window: two drivers could both read `status: posted` before either write completes, letting both accept a single job. `findOneAndUpdate` with `status: "posted"` in the filter makes the state transition conditional at the database level â€” exactly one update matches, so a second driver gets no document back and receives the 409 "no longer available". No two-phase locking needed, just an atomic predicate update.

---

## Day 19 â€” Cloudinary Signed Uploads

### New Files
- `src/app/api/uploads/sign/route.ts` â€” Cloudinary unsigned-upload signature endpoint.

### Setup
- `cloudinary` (`^2.10.0`) added to `package.json`.
- Credentials configured server-side via `process.env.CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` in `.env.local`. The API secret is never sent to the client.

### API Route
- **`POST /api/uploads/sign`** â€” `withRole(["driver"])`. Validates `documentType` against `ALLOWED_DOCUMENT_TYPES` (`licence`, `insurance`, `government_id`), then returns the params needed for a direct browser upload to Cloudinary:
  - `signature`, `timestamp`, `cloudName`, `apiKey`, `public_id`, `folder`.
- The `folder` is scoped to the user (`driver-verification/<userId>`) and the `public_id` is the document type itself, so re-uploads overwrite the prior file instead of accumulating duplicates.
- The signature is produced server-side with `cloudinary.utils.api_sign_request`; the client then POSTs the file + signed params straight to Cloudinary's upload endpoint.

### Architectural Decisions
- **Sign-and-upload instead of server-side upload**: the Next.js server never touches the large file payload. It only issues a short-lived signed authorization; the browser streams the file directly to Cloudinary. This keeps memory/timeouts off the server and avoids the server becoming a storage proxy.
- Route follows the repo convention: `withRole` guard, `JwtAccessPayload`, `catch (error: unknown)` + `console.error` + `{ message }`. The initial draft used `user: any` / `err: any` and leaked `err.message ?? err.status`; both were corrected. The dead `bodyParser: false` config (Pages-Router style) was removed.

### Learning Prompt: Why can't the browser upload directly with my raw API secret?
Exposing `CLOUDINARY_API_SECRET` in the client would let anyone forge upload parameters â€” arbitrary files, any public_id, unlimited storage and CDN usage billed to the account. The signature proves the upload parameters (`timestamp`, `folder`, `public_id`) were produced by our server for this authenticated user within the signing window; Cloudinary rejects uploads whose signature doesn't match the parameters. The secret stays server-side, and the browser receives only the short-lived, scoped signature.

---

## Day 20 â€” DriverProfile Schema + Upload UI

### New Files
- `src/models/DriverProfile.ts` â€” Mongoose model with HMR guard; `userId` (unique index, ref `User`), `status` enum, `vehicleType` enum, document URL fields (`licenceDocUrl`, `governmentIdDocUrl`, `insuranceDocUrl`), `backgroundCheck`, `verifiedAt`.
- `src/types/driverProfile/driverProfile.ts` â€” `DRIVER_PROFILE_STATUS`, `DRIVER_VEHICLE_TYPE`, update zod schema, API response types.
- `src/api/apis/drivers/driversApi.ts` â€” plain async layer using the shared axios instance.
- `src/api/hooks/drivers/driversApi.ts` â€” TanStack query + mutation hooks with toast/error handling.
- `src/app/api/drivers/verification/route.ts` â€” `GET` / `PUT` for the driver's own profile.
- `src/app/driver/verification/page.tsx` â€” document upload UI (vehicle selection, licence, government ID, insurance, background check authorization).

### API Routes
- **`GET /api/drivers/verification`** â€” `withRole(["driver"])`. Returns `{ profile }` for the current user; returns a default `unverified` structure when no profile exists yet (orphan case).
- **`PUT /api/drivers/verification`** â€” `withRole(["driver"])`. Validates against the update zod schema and upserts (`findOneAndUpdate` with `upsert: true`) a partially-built update, so drivers only send the fields they changed.

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
The Cloudinary URL is only a string in client state until the driver submits; the profile document and its `status: "pending"` are committed by `PUT /api/drivers/verification` in one operation. If the DB save fails, the UI shows the error via the mutation's `onError` toast and nothing is persisted â€” the uploaded file simply becomes orphaned Cloudinary storage. The `public_id = documentType` convention bounds the damage: a retry re-signs the same public_id and overwrites the orphan, so no duplicate files accumulate. The real fix (auto-deleting orphaned uploads on save failure) is a server-side cleanup job â€” noted as a follow-up.

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
Using Material Symbols Outlined exclusively â€” no icon library mixing.

---

## Days 21â€“23 â€” Admin Verification Queue

### New Files
- `src/types/admin/adminVerification.ts` â€” AdminTabKey, ApproveRejectStatus (derived from DriverProfileStatus), AdminVerificationProfile (mirrors API response including `updatedAt`), query/response interfaces.
- `src/app/api/admin/verification/route.ts` â€” `GET /api/admin/verification`. Protected by `withRole(["admin"])`. Supports `?status` (default `"pending"`), `?search` (User name/email via case-insensitive regex), `?page`, `?limit`. Uses `populate("userId","name email")` then maps name/email onto the profile response. Returns `totalApproved`/`totalPending` counts alongside paginated results.
- `src/app/api/admin/verification/[id]/route.ts` â€” `PATCH /api/admin/verification/:id`. Protected by `withRole(["admin"])`. Accepts `{ status: "approved"|"rejected", reason? }`. On approve: sets `verifiedAt = new Date()`, clears `rejectionReason`. On reject: sets `rejectionReason` from payload.
- `src/api/apis/admin/adminApi.ts` â€” Plain fetchers: `getVerificationQueue` (GET, structured params), `approveRejectDriver` (PATCH).
- `src/api/hooks/admin/adminApi.ts` â€” `useVerificationQueue` (30s staleTime, queue key) and `useApproveRejectDriver` (invalidates queue query on success, toasts).
- `src/app/admin/verification/page.tsx` â€” Admin queue UI with role guard, stat cards, tabs with count badge, debounced search, data table (avatar initials, copy-ID, vehicle/status/BG/documents/actions columns), pagination, reject confirmation modal.

### Modified Files
- `src/models/DriverProfile.ts` â€” Added `rejectionReason?: string | null` field with `default: null`.
- `src/types/driverProfile/driverProfile.ts` â€” Added `rejectionReason?: string | null` to `DriverProfile` response interface.
- `src/app/driver/verification/page.tsx` â€” Added rejected-status banner with reason text and "Update Documents" button (resets status to `unverified` via existing `handleUnlock`).
- `src/app/api/drivers/verification/route.ts` â€” Added `rejectionReason: null` to the orphan default profile structure.

### New Shared Utilities
- `src/hooks/useDebouncedValue.ts` â€” Generic debounce hook (debounces any value by `delayMs`).
- `src/utils/format.ts` â€” `getInitials(name)` (2-char max), `formatAppliedDate(createdAt)` (US locale short date + 12h time).

### Architectural Decisions
- **Derived types from source of truth**: `AdminTabKey` and `ApproveRejectStatus` are `Extract<DriverProfileStatus, ...>` unions. Raw status strings (`"approved"`, `"rejected"`) are never used; all status values reference `DRIVER_PROFILE_STATUS.*` constants.
- **Status badge map covers all statuses**: `STATUS_BADGE_STYLES` is typed `Record<DriverProfileStatus, string>` with an `unverified` entry, so any new status added to the enum is caught at compile time instead of silently rendering without color.
- **`rejectionReason` is excluded from the driver PUT validation schema**: drivers cannot self-set rejection reason via their own route. Only the admin PATCH can write it.
- **Global stat counts (`totalApproved`/`totalPending`) are computed per request**: At early-stage scale the extra two `countDocuments` calls are negligible; a `$facet` aggregation or separate stats endpoint can replace them if the collection grows beyond 100k profiles.
- **`formatAppliedDate` and `getInitials` live in shared `utils/format.ts`**: Per CLAUDE.md standards, all utility/formatting logic is centralized outside components.

### Learning Prompt: Why exclude rejection reason from the driver's validation schema?
Separating write permissions at the schema layer enforces a clean privilege boundary. The driver PUT schema controls what drivers can submit; the admin PATCH route has its own Zod schema that includes `status` and `reason`. If `rejectionReason` were in the driver schema, a malicious driver could self-clear the flag to reset their status. By keeping it out, rejection state is only modifiable by an admin, and the driver's only recourse is the explicit "Update Documents" flow which resets to `unverified` â€” a legitimate self-service path that doesn't bypass the review queue.

### Learning Prompt: Why populate rather than a separate User lookup per profile?
`DriverProfile.find().populate("userId","name email")` executes a single secondary query that resolves all referenced users in one round-trip, versus N individual `User.findById` calls. This avoids the N+1 pattern while keeping the code clean and the response latency bounded. The `populate` result is then mapped onto the response to extract `name`/`email` as top-level fields, satisfying the flat `AdminVerificationProfile` contract.

---

## Days 24â€“26 â€” Ratings & Reviews

### New Files
- `src/models/Rating.ts` â€” Rating model with jobId/fromUserId/toUserId refs, score (min 1, max 5), optional comment, `createdAt`-only timestamps. Compound unique index `{ jobId: 1, fromUserId: 1 }` (duplicate prevention). HMR guard export.
- `src/types/rating.ts` â€” Single source of truth: `ratingSubmitSchema` (zod) + inferred `RatingSubmitInput`, plus `RatingResponse`, `RatingSubmitResponse`, `RatingCheckResponse`, `ReviewItem`, `DriverReviewsResponse`.
- `src/app/api/ratings/route.ts` â€” `POST /api/ratings`. Protected by `withAuth()` (any authenticated role). Guard chain: 404 job not found â†’ 400 job not delivered â†’ 403 not a participant â†’ 400 self-rating â†’ 400 invalid recipient â†’ 409 duplicate (E11000). Returns 201 with the saved rating.
- `src/app/api/ratings/check/route.ts` â€” `GET /api/ratings/check?jobId=`. Protected by `withAuth()`. Returns `{ rated }` scoped to the current user (`{ jobId, fromUserId: user.userId }`).
- `src/lib/updateDriverRating.ts` â€” Aggregation helper. Guards on `User.role === "driver"`, then `$match` + `$group` (`$avg`, `$sum`), writes denormalized `ratingAvg`/`ratingCount` to `DriverProfile`.
- `src/app/api/drivers/[id]/reviews/route.ts` â€” `GET /api/drivers/:id/reviews`. Public (no auth). Paginated (`page`/`limit`, default 10), `populate("fromUserId","name")`, sorted `createdAt` descending. Returns `{ reviews, total, page, totalPages }`.
- `src/app/api/drivers/[id]/route.ts` â€” `GET /api/drivers/:id`. Public. Returns `{ user, profile }` (user name/role/createdAt + the driver profile with rating fields).
- `src/types/drivers/driverPublicProfile.ts` â€” `DriverPublicUser` + `DriverPublicProfileResponse`.
- `src/api/apis/ratings/ratingsApi.ts` + `src/api/hooks/ratings/ratingsApi.ts` â€” PLMS layer: `submitRating`, `checkRating`, `getDriverReviews` + `useSubmitRating` (invalidates ratings + driver-reviews keys, toasts), `useCheckRating`, `useDriverReviews`.
- `src/api/apis/drivers/driverPublicProfileApi.ts` + `src/api/hooks/drivers/driverPublicProfileApi.ts` â€” `getDriverPublicProfile` + `useDriverPublicProfile`.
- `src/app/(dashboard)/jobs/[id]/rate/page.tsx` â€” Rating form (poster-only, delivered-only, "Already submitted" state, 5-star selector, optional comment, `useSubmitRating` mutation, redirect to job detail on success).
- `src/app/(dashboard)/drivers/[id]/page.tsx` â€” Public driver profile: hero card (initials, verified badge, vehicle chip, stats), rating banner (avg + count), paginated review list; distinct loading/empty/error states.

### Modified Files
- `src/models/DriverProfile.ts` + `src/types/driverProfile/driverProfile.ts` â€” Added `ratingAvg` (default 0, min 0, max 5) and `ratingCount` (default 0, min 0) fields.
- `src/utils/format.ts` â€” Added `formatCompletedDate` (shared; used by the rate page).

### API Routes Added
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/ratings` | `withAuth()` | Submit a rating (guard chain 404â†’400â†’403â†’400â†’400â†’409) |
| GET | `/api/ratings/check?jobId=` | `withAuth()` | Whether the current user already rated the job |
| GET | `/api/drivers/:id/reviews?page=&limit=` | public | Paginated reviews for a driver |
| GET | `/api/drivers/:id` | public | Public driver profile (user + profile with ratings) |

### Architectural Decisions
- **"completed" vs `JOB_STATUS.DELIVERED`**: The Phase 4 plan says rating is allowed when the job is `"completed"`, but the Job model enum (`src/types/job.ts`) has no `"completed"` value â€” it is `posted | accepted | in_transit | delivered | cancelled`. Rather than inventing a new status (which the strict constraints forbid), the trigger is `JOB_STATUS.DELIVERED`. "Delivered" is the terminal success state of a job, so it is the correct existing-value mapping. All checks reference `JOB_STATUS.DELIVERED` (no hardcoded string).
- **Compound unique index as the only duplicate guard**: Duplicate prevention is `ratingSchema.index({ jobId: 1, fromUserId: 1 }, { unique: true })` â€” no application-level pre-check. The `POST` route catches the MongoDB E11000 error and returns 409. Rationale: the index is race-proof under concurrent requests, while a check-then-insert application pattern has a TOCTOU window. Tradeoff is answered in the Day 24 prompt below.
- **Denormalized `ratingAvg`/`ratingCount`**: recompute-and-store on every new rating via `updateDriverRating`, invoked fire-and-forget (`updateDriverRating(toUserId).catch(...)`) so the 201 response is not blocked by aggregation latency. The helper itself only runs when the recipient is a driver (role check).
- **`withAuth()` for submission, no auth for reviews**: rating submission needs the requester identity for participant/self-rating checks, so it uses `withAuth()`. Reviews are public read data (like job browsing), so the reviews/profile endpoints are unauthenticated.
- **Check endpoint is user-scoped**: `GET /api/ratings/check` is `withAuth()`-wrapped and queries `{ jobId, fromUserId: user.userId }`. An earlier version returned `rated: true` if *anyone* rated the job (no user context), which would falsely show "Already submitted" to a participant who hadn't rated. Scoping to the requester fixes the "Already submitted" state.
- **`toUserId` must be the other participant**: beyond the self-rating guard, the submit route validates `toUserId === (isPoster ? job.driverId : job.posterId)`, rejecting ratings sent to arbitrary users with 400.
- **Reviews paginated from day one**: `GET /api/drivers/:id/reviews` defaults to `limit = 10` with `page`/`total`/`totalPages`, per the never-fetch-all-records rule. The public profile page reads only the first page.
- **Recipient's name is fetched, not guessed**: the rate page resolves the driver's real name through `useDriverPublicProfile(job.driverId)` instead of a placeholder, matching the design reference's "How did {name} do?".

### Learning Prompt (Day 24): Compound unique index vs application-level duplicate check?
The compound unique index `{ jobId: 1, fromUserId: 1 }` is the cleanest and is what this project uses. An application-level check (`Rating.findOne({ jobId, fromUserId })` before insert) has a **time-of-check to time-of-use (TOCTOU) race**: two concurrent submissions can both pass the check and both insert. The unique index makes the database the single arbiter â€” the second insert fails atomically with an E11000 error, which the route maps to 409. The tradeoff is ergonomics: index violations surface as a `MongoServerError` you must detect via `error.code === 11000` (or the message), which is less readable than a clean "not found" check, and duplicate detection is coupled to the error-handling path. The app-level check is friendlier to read but only correct in single-writer scenarios or where duplicates are merely discouraged, not forbidden. For "never more than one rating per job per user", the unique index is the correct choice; a common hybrid is both â€” index for correctness, check for friendly error messages â€” but here the 409 branch already provides a friendly message, so no app-level check was added (per the plan's constraint).

### Learning Prompt (Day 25): On-demand average vs denormalized average on write?
Computing on-demand means each driver profile view runs an aggregation over that user's ratings and returns the live number â€” no extra state, always fresh, but every read pays the aggregation cost and the number grows linearly with the ratings collection. Storing a denormalized `ratingAvg`/`ratingCount` on the profile means reads are O(1) lookups, and the cost is paid once per write (one aggregation + one profile update per new rating). This project uses the denormalized approach per the PRD schema. Tradeoffs: on-demand wins when reads are rare and writes frequent; denormalized wins when reads dominate (the common case for a public profile page) and when you want the profile document itself to stay self-contained for list views. The costs of denormalization are write-path latency (mitigated here by fire-and-forget) and drift risk if ratings are ever deleted or edited without re-running the aggregation â€” which is why the aggregation is the single write point, keyed off `toUserId`, and recomputes from the full ratings set every time rather than incrementally.

### Learning Prompt (Day 26): Quiz â€” MongoDB aggregation pipelines ($match, $group, $avg)
Two example scenarios exercising the same pipeline family as `updateDriverRating`:

1. **Average job offer price per vehicle type.** `$match` only non-cancelled jobs, `$group` by `vehicleType` with `$avg: "$offeredPrice"`, `$sort` descending. Pipeline: `[{ $match: { status: { $ne: "cancelled" } } }, { $group: { _id: "$vehicleType", avgPrice: { $avg: "$offeredPrice" } } }, { $sort: { avgPrice: -1 } }]`.
2. **Top-rated drivers with a minimum review count.** `$group` ratings by `toUserId` computing `$avg` score and `$count`, then `$match` the grouped result with `count >= 5` (a `$match` after `$group` filters aggregates, not source docs), then `$lookup` the User names, `$sort` by avg descending, `$limit 10`.

Key points the quiz targets: `$match` before `$group` filters input documents and can use indexes; `$match` after `$group` filters group results and cannot use the original indexes; `_id` in `$group` is the grouping key; `$avg`/`$sum`/`$count` are accumulator operators that only make sense inside `$group`; and the pipeline is order-sensitive.

### Design System Notes
- **Star ratings**: Material Symbols `star` (filled via `fontVariationSettings: "'FILL' 1"`), `star_half`, and outline stars. Active color `warning-amber`; inactive `secondary-fixed-dim`. Rating banner uses `primary-fixed` / `on-primary-fixed` on the profile page.
- **Star selector touch targets**: each selectable star is `h-12 w-12` with flex centering so the visual 4xl glyph keeps its size while meeting the 48px mobile target.
- **Driver profile bento grid**: 12-column grid â€” hero card `md:col-span-4`, rating + reviews stack `md:col-span-8`; collapses to single column on mobile.

---

## Days 27â€“29 â€” Real-Time Pusher Infrastructure

### New Files
- `src/lib/pusher.ts` â€” Server-side Pusher instance (`pusherServer`). Reads `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER` from env. Used by all server-trigger helpers.
- `src/lib/pusherClient.ts` â€” Client-side Pusher-JS instance (`pusherClient`). Reads `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`. Dynamic-imported in the test page to avoid SSR issues.
- `src/lib/triggerJobEvent.ts` â€” `triggerJobEvent(jobId, eventName, payload)` helper. Triggers to the private channel `private-job-{jobId}`. Event names are a closed union: `'location-update' | 'new-message' | 'status-change'`. Channel name built from a `PRIVATE_CHANNEL_PREFIX` constant (no magic strings).
- `src/app/api/pusher/auth/route.ts` â€” `POST /api/pusher/auth`. Protected by `withAuth()`. Parses `{ socket_id, channel_name }`, extracts `jobId` from the `private-job-` prefix, verifies the authenticated user is `posterId` or `driverId` on that Job, then returns `pusherServer.authorizeChannel(socket_id, channel_name)`. Returns 403 for non-participants, 400 for invalid channel names.
- `src/app/api/test-pusher/route.ts` â€” Throwaway `POST /api/test-pusher` (no auth). Triggers `test-event` on `test-channel` with `{ message, timestamp }`. Returns `{ ok: true }`.
- `src/app/(dashboard)/pusher-test/page.tsx` â€” Throwaway `'use client'` page at `/pusher-test`. On mount, dynamically imports `pusherClient`, subscribes to `test-channel`, binds `test-event`, appends received messages to state. Button calls `POST /api/test-pusher`. Unsubscribes on unmount. Uses public channel (intentional â€” no auth for the throwaway test).
- `src/app/api/jobs/[id]/location/route.ts` â€” `POST /api/jobs/:id/location`. Protected by `withAuth()`. Validates body `{ lat: z.number(), lng: z.number() }`. Confirms the requester is the job's `driverId` (403 otherwise). Calls `triggerJobEvent(jobId, 'location-update', { lat, lng, timestamp, driverId })`. Returns `{ ok: true }`.

### API Routes Added
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/pusher/auth` | `withAuth()` | Authorize private channel subscription |
| POST | `/api/test-pusher` | none | Throwaway test trigger |
| POST | `/api/jobs/:id/location` | `withAuth()` | Driver sends GPS ping â†’ broadcasts to job channel |

### Architectural Decisions
- **Private channels over public channels for job data**: Job-specific events (location updates, status changes, messages) use `private-job-{jobId}` channels. Private channels require server-side authorization before the client can subscribe, enforced by `/api/pusher/auth`. This prevents unauthorized clients from reading real-time job data. The test page intentionally uses the public `test-channel` â€” that is a throwaway, not a production pattern.
- **`triggerJobEvent` centralizes all channel triggers**: Rather than calling `pusherServer.trigger()` directly in every route handler, all server-triggered events go through `triggerJobEvent`. This keeps the channel naming convention (`private-job-` prefix) in one place â€” if the prefix ever changes, only `triggerJobEvent` needs updating.
- **Dynamic import of `pusherClient` on the client**: The test page uses `import("@/lib/pusherClient")` inside a `useEffect` rather than a top-level import. This prevents `pusher-js` from being bundled into the server-side SSR build, which would fail because `WebSocket` is not available in Node.js. All future client-side Pusher pages should follow this pattern.
- **`/api/pusher/auth` extracts jobId from the channel name**: Rather than accepting `jobId` as a separate body field, the endpoint parses it from `channel_name`. This matches Pusher's auth protocol â€” Pusher sends the exact `channel_name` it needs authorized, so deriving `jobId` from it avoids a second trust boundary.
- **Location ping requires driver identity**: `POST /api/jobs/:id/location` compares `user.userId` against `job.driverId`. Only the assigned driver can send GPS pings for a job. This is checked after the Job is fetched, so a 404 for a missing job returns before the role check (consistent with the existing accept-route pattern).
- **Zod validation on `body: unknown`**: The location route parses the body as `unknown` and validates with Zod before accessing `lat`/`lng`. This follows the project-wide convention (no implicit `any` from `req.json()`).

### Learning Prompt: Why does Pusher use separate app-level keys for server vs client?
Pusher's security model requires two layers: the **app secret** (server-only, used to sign channel authorization responses and trigger events) and the **app key** (client-safe, used to establish the WebSocket connection). Exposing the secret on the client would allow any visitor to trigger arbitrary events on any channel. The `NEXT_PUBLIC_` prefix in Next.js enforces this boundary â€” only `NEXT_PUBLIC_PUSHER_KEY` and `NEXT_PUBLIC_PUSHER_CLUSTER` are available in browser bundles, while `PUSHER_SECRET` and `PUSHER_APP_ID` stay server-side. The key and cluster are duplicated across server/client env vars because the server Pusher instance also needs them, but the secret never crosses the boundary.

### Learning Prompt: Why authorize channels server-side instead of relying on Pusher's app-level access controls?
Pusher private channels require an authorization request: when a client subscribes, Pusher's servers call your `/api/pusher/auth` endpoint with the `socket_id` and `channel_name`. Your server verifies the user is allowed to view that channel and signs the response. This means access control logic lives entirely in your codebase â€” you decide who sees what. Without it, any authenticated user could subscribe to any `private-job-*` channel regardless of whether they are the poster or driver. The `/api/pusher/auth` route is the gatekeeper: it fetches the Job, checks poster/driver membership, and rejects non-participants with 403. This is the same pattern used by the job detail API (`GET /api/jobs/:id`) but applied at the WebSocket subscription layer.

---

## Days 30â€“32 â€” Live Tracking, Location History, and Messaging

### New Files
- `src/components/LiveTrackingMap.tsx` â€” `"use client"` Leaflet map. Props: `jobId`, `initialLat/Lng`, optional `pickupLat/Lng`, `dropoffLat/Lng`, `routePath` (renders the OSRM `<Polyline>`), `vehiclePosition` (controlled marker), `onLocationUpdate` (parent callback). Zoom 13, OSM tiles. Custom `divIcon` markers for PICKUP (white pill, green text, store icon), DROPOFF (pill, flag icon), and the moving vehicle (pulsing blue circle, truck icon). Single marker instance via `useRef` â€” updates use `marker.setLatLng()` without re-mounting. Subscribes to `private-job-{jobId}`, binds `location-update`, unsubscribes/unbinds on unmount. Default Leaflet icon fixed via `L.Icon.Default.mergeOptions` pointing at `public/leaflet/`.
- `src/utils/geocode.ts` â€” Shared `geocodeAddress(address)` + `Coordinates` type (moved from the local copy inside `MapPreview.tsx`; that component still works, only the new tracking page uses the shared version). Nominatim, `swiftship-dev/1.0` UA.
- `src/app/(tracking)/jobs/[id]/track/page.tsx` â€” Poster live-tracking view at `/jobs/[id]/track`, full-screen, no layout wrapper (its own shell). Desktop `w-64` sidebar (SwiftShip logo, Dashboard, Jobs, Deliveries [active], Wallet, Settings, user profile), mobile `h-12` top bar. Center: `LiveTrackingMap` via `next/dynamic({ ssr: false })`, only for `accepted`/`in_transit`; geocoded pickup/dropoff coords with Kathmandu fallback `[27.7172, 85.3240]`; `MapPlaceholder` for posted/delivered/cancelled/geocoding. Right floating panel (`md:absolute md:top-6 md:right-6 md:w-[400px]`, bottom sheet on mobile): ETA header, status badge, courier card (avatar initials, name, vehicle, `ratingAvg`), 4-stage delivery stepper (Confirmed / Picked Up / On the way / Dropoff) with state derived from `JOB_STATUS`, and Support/Call Driver actions.
- `src/models/LocationPing.ts` â€” `jobId` (Ref Job, index), `driverId` (Ref User), `lat`, `lng`, `timestamp`, `expiresAt`. TTL index `{ expiresAt: 1 }` with `expireAfterSeconds: 0` (MongoDB background deleter purges after `expiresAt`). Compound index `{ jobId: 1, timestamp: -1 }` for per-job history queries. HMR guard.
- `src/models/Message.ts` â€” `jobId` (Ref Job), `senderId`/`recipientId` (Ref User), `content` (maxlength 2000 via exported `MESSAGE_MAX_LENGTH`), `readAt` (nullable), `createdAt` only (no `updatedAt`). Indexes: `{ jobId: 1, createdAt: 1 }` (conversation history) and `{ recipientId: 1, readAt: 1 }` (unread queries). HMR guard.
- `src/types/message/message.ts` â€” `Message` + `GetMessagesResponse` mirroring the API response.
- `src/app/api/jobs/[id]/messages/route.ts` â€” `GET /api/jobs/:id/messages`. `withAuth()`; 404 if the job is missing; 403 unless the user is `posterId` or `driverId`; paginated `page`/`limit` (default 50, max 100, clamped via `Math.min`); returns `{ messages, total, page, limit, totalPages }` sorted `createdAt` ascending (oldest-first).
- `public/leaflet/` â€” copies of `marker-icon.png`, `marker-icon-2x.png`, `marker-shadow.png` (for the default-icon fix).

### Modified Files
- `src/app/api/jobs/[id]/location/route.ts` â€” Added fire-and-forget `LocationPing.create` (never awaited â€” `void ... .catch(...)`); `expiresAt = now + 48h` via `LOCATION_TTL_HOURS` constant. Pusher trigger logic unchanged.
- `src/app/globals.css` â€” Added `swiftship-pulse` keyframe for the vehicle marker ring.

### API Routes Added
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/jobs/:id/messages?page=&limit=` | `withAuth()` | Paginated job conversation history (participants only) |

### Architectural Decisions
- **Tracking view lives at `/jobs/[id]/track`, not `/jobs/[id]`**: the existing driver-facing detail page (`(main)/jobs/[id]/page.tsx`) already owns `/jobs/[id]`, and two route groups cannot map the same path. The tracking page is a distinct poster-only view with its own full-screen shell, so it sits in a dedicated `(tracking)` route group with no layout wrapper (the design's sidebar/top bar are rendered by the page itself).
- **Single marker instance updated via `setLatLng`**: the vehicle marker's `position` prop is set once (initial/pickup coords) and never changes from React state; `location-update` events call `markerRef.current.setLatLng()` directly. This avoids re-rendering the whole map on every GPS ping â€” the optimization the design reference demands.
- **`divIcon` markers instead of the default Leaflet icon**: the design's PICKUP/DROPOFF/vehicle markers are styled pills/circles, so they use `L.divIcon` with inline HTML (Material Symbols render because the font is loaded globally in `layout.tsx`). The default-icon fix (`L.Icon.Default.mergeOptions` + `public/leaflet/` assets) is applied anyway so any future bare `<Marker>` won't hit the classic broken-icon bug. Note: the pre-existing `src/utils/mapIcons.js` is broken (`new L.Icon` without importing `L`) â€” left untouched since `MapPreview.tsx` is not part of this phase.
- **Kathmandu fallback for pickup coords**: the Job model stores addresses as strings, not coordinates. The page geocodes `pickupAddress`/`dropoffAddress` via Nominatim (shared `geocode.ts`) and falls back to Kathmandu `[27.7172, 85.3240]` so the map always has a center. A `isGeocoding` placeholder ("Locating pickup point") shows while resolving instead of flashing the wrong state.
- **Location pings persisted fire-and-forget**: `POST /api/jobs/:id/location` returns `{ ok: true }` immediately after the Pusher trigger; the DB write is not awaited (`void ... .catch(console.error)`). Same pattern as `updateDriverRating` â€” the live response must not be delayed by persistence, and a failed write degrades to "no history" rather than a 500.
- **48h TTL via `expireAfterSeconds: 0`**: the TTL index deletes each document when `expiresAt` passes. The constant `LOCATION_TTL_HOURS = 48` keeps the expiry policy in one place. The compound `{ jobId, timestamp: -1 }` index serves future "playback route" queries (e.g., replay a delivery's path).
- **Messages are job-scoped, participant-only**: the endpoint reuses the exact participant check from the Pusher auth route (poster or driver, strings compared via `String()`). Pagination defaults to 50 with a hard cap of 100 (`Math.min`), oldest-first sort, mirroring the reviews endpoint's shape (`total`/`page`/`totalPages`).

### Learning Prompt: Why is `expireAfterSeconds: 0` used for the TTL instead of a fixed number of seconds?
Because the expiry instant is stored per-document on `expiresAt` (which the app sets to `now + 48h`). MongoDB's TTL monitor deletes a document when `expiresAt <= now + expireAfterSeconds`. Setting `expireAfterSeconds: 0` makes the effective delete time exactly `expiresAt`, so the 48-hour policy lives in application code (`LOCATION_TTL_HOURS`) rather than being baked into the index. If the retention period ever changes (e.g., to 24h), only the write path changes â€” no index rebuild. A fixed `expireAfterSeconds: 86400` would be the right tool when every document should live for the same duration from creation, which isn't the case here (pings for an in-progress job would all get swept on the same absolute clock otherwise).

## Day 27 â€” Driver Execution UI & Live Route ETA (Phases 2+3)

### New Files
- `src/app/(tracking)/jobs/[id]/active/page.tsx` â€” driver execution page (`/jobs/[id]/active`).
- `src/utils/routing.ts` â€” `fetchRoute()` (OSRM Directions API â†’ `{ path, distanceM, durationS }`), `interpolateAlongPath()` (haversine-weighted), `ROUTE_POLYLINE_STYLE`.
- `src/utils/throttle.ts` â€” `createThrottle(intervalMs)` leading-edge throttle.

### Modified Files
- `src/components/LiveTrackingMap.tsx` â€” new optional props: `routePath` (renders `<Polyline>`), `vehiclePosition` (controlled marker via `markerRef.setLatLng`), `onLocationUpdate` (callback to parent). New `RouteBoundsUpdater` fits the view to the full route once on load (never re-fits on live movement).
- `src/app/(tracking)/jobs/[id]/track/page.tsx` â€” poster tracking page.
- `src/utils/format.ts` â€” `formatEtaLabel`, `formatDistanceMiles`, `formatArrivalTime`.
- `src/app/(main)/jobs/[id]/page.tsx` â€” accepted card now links to `/jobs/[id]/active`.

### Driver Execution Page (`/jobs/[id]/active`)
- Placed in the `(tracking)` route group (no dashboard layout) so the map is truly full-screen, mirroring the poster track page. URL is the same as the plan's `(dashboard)` proposal; the group only changes the layout chrome.
- Auth + assignment guard: renders "Not Authorized" unless `user.role === "driver"` and `user._id === job.driverId`.
- **Start Delivery** â†’ `POST /api/jobs/:id/transit` (status `accepted â†’ in_transit`); **Mark Delivered** â†’ `POST /api/jobs/:id/deliver` (only visible while in transit); delivered state renders a completion card.
- GPS: while `in_transit` (and not simulating), `navigator.geolocation.watchPosition` updates the marker locally via `vehiclePosition` and pings `POST /api/jobs/:id/location` throttled to 10s (`createThrottle`).
- **Simulate GPS toggle**: drives a vehicle along the OSRM path (`interpolateAlongPath`, 40 Ã— 1s steps) so the demo works without a GPS device; sends the same pings.

### Poster Tracking Page Updates
- **Blue route polyline**: OSRM route is fetched from the driver's live position (or pickup before the first ping) to the dropoff and drawn via `<Polyline>` â€” replaces the "missing blue line".
- **Dynamic ETA**: "Arriving in X mins" + distance from `routeData.durationS`/`distanceM`; "Est. HH:MM" is anchored to the last location ping's server timestamp (`livePingTime`) rather than `Date.now()` during render (keeps the render pure per the lint rule).
- **Live status**: subscribes to `status-change` on `private-job-{id}` and patches the React Query cache (`setQueryData`), so the badge/stepper/map unlock without a refetch. Route re-fetches on each live location change (~10s cadence set by the driver's ping throttle).

### Architectural Decisions
- **Same URL, different group**: `(dashboard)` layout wraps children in a 256px sidebar + mobile bars, which would fight a full-screen driving map. Putting the page in `(tracking)` gives identical `/jobs/[id]/active` URLs with no chrome.
- **Controlled `vehiclePosition` + Pusher echo**: the driver's marker moves instantly from local GPS (controlled prop â†’ `setLatLng`), and the poster's marker moves via the Pusher `location-update` echo. Both paths reuse the same single-marker `setLatLng` optimization.
- **ETA anchored to ping time**: the poster cannot call `Date.now()` in render (lint rule `react-hooks/purity`). Using the driver ping's server timestamp as the anchor is semantically correct and keeps rendering pure.
- **Fire-and-forget pings**: the driver page does not await the location POST; a failed ping only logs, matching the server's own fire-and-forget persistence pattern.

### Design System Notes
- **Live-tracking shell**: full-screen `h-screen w-screen flex overflow-hidden`; desktop `w-64` sidebar (same SwiftShip logo block and nav-item styles as the dashboard layout), mobile `h-12` top bar; main canvas `flex-1 relative overflow-hidden`.
- **Floating detail panel**: `md:absolute md:top-6 md:right-6 md:w-[400px] md:max-h-[calc(100vh-3rem)]`, `bg-surface-white md:rounded-xl shadow-lg border border-secondary-container flex flex-col`; bottom sheet (`inset-x-0 bottom-0`) on mobile. Header `bg-surface-bright p-6 border-b border-surface-container-high`; body `flex-1 overflow-y-auto p-6 space-y-8`; footer `p-6 border-t border-secondary-container flex gap-3`.
- **Status badge**: rounded-full pill, per-status token classes (accepted/in_transit â†’ `bg-primary/10 text-primary`; delivered â†’ `bg-success-green/10 text-success-green`; cancelled â†’ `bg-error-container text-error-red`).
- **Delivery stepper**: left vertical line (`w-px bg-surface-container-high`); completed node `bg-success-green` with white check; active node white circle with `border-2 border-primary` + pulsing `w-2.5 h-2.5 bg-primary` dot; pending node `border-2 border-secondary-fixed-dim`.
- **Map markers**: PICKUP/DROPOFF pills (`#fff` bg, `#05A357` text, radius 17px, shadow), vehicle = solid `#276EF1` circle over a `swiftship-pulse` animated ring (keyframe added to `globals.css`).

---

## Day 33â€“34 â€” In-App Chat (Messaging API + ChatPanel)

### New Files
- `src/components/chat/ChatPanel.tsx` â€” reusable chat component; props: `{ jobId, currentUserId, otherParticipantName?, jobBackHref?, isTyping? }`. Loads message history via TanStack Query, subscribes to Pusher `new-message` on `private-job-{jobId}`, optimistic send with temp message swap, inline error on failure.
- `src/components/chat/ActiveChatsSidebar.tsx` â€” sidebar listing active conversations (used in the dedicated chat page layout).
- `src/app/(main)/jobs/[id]/chat/page.tsx` â€” dedicated chat page at `/jobs/[id]/chat`. Participant-only access (poster or driver), renders ChatPanel full-height with ActiveChatsSidebar on desktop.
- `src/app/globals.css` â€” `.chat-scroll` custom scrollbar (6px thumb, #e2e2e2, 10px radius, transparent track).

### Modified Files
- `src/app/api/jobs/[id]/messages/route.ts` â€” added `POST` handler alongside existing `GET`. Zod validation (`content: z.string().min(1).max(2000)`), participant check via shared `assertParticipant` helper, DB write completes before Pusher `new-message` trigger. Returns 201 with saved message.
- `src/utils/format.ts` â€” extracted chat date utilities from ChatPanel: `formatMessageTime`, `getChatDateLabel`, `isSameCalendarDay` (shared, not component-local per AGENTS.md).
- `src/app/(main)/jobs/[id]/page.tsx` â€” replaced inline ChatPanel with an "Open Chat â†’" button linking to `/jobs/[id]/chat` (visible when status is accepted/in_transit/delivered).

### API Routes
- `POST /api/jobs/:id/messages` â€” sends a message. Protected by `withAuth()` + participant check. Validates `{ content }` with Zod. Determines `recipientId` from poster/driver lookup. Writes to `Message` model, then fires `triggerJobEvent(jobId, "new-message", { messageId, senderId, content, createdAt })`. Returns 201.

### Architectural Decisions
- **Date utilities in shared utils**: AGENTS.md requires utility logic (formatDate, etc.) in shared `utils/` files â€” `formatMessageTime`, `getChatDateLabel`, `isSameCalendarDay` live in `utils/format.ts`, not inside ChatPanel.
- **Derived values memoized**: `isParticipant`, `isChatAvailable`, `otherParticipantName` in the chat page are wrapped in `useMemo` per AGENTS.md.
- **Dedicated route over inline**: Chat was moved from an inline panel on the job detail page to a dedicated `/jobs/[id]/chat` route so the chat has its own URL, avoids layout conflicts, and allows full-height rendering.

### Design System Notes
- **Sent bubble**: `bg-primary text-white rounded-2xl rounded-br-sm shadow-[0_1px_2px_rgba(39,110,241,0.2)]`.
- **Received bubble**: `bg-white border border-secondary-container rounded-2xl rounded-bl-sm shadow-[0_1px_2px_rgba(0,0,0,0.05)]`.
- **Message area**: `bg-[#F9FAFB]`, custom `.chat-scroll` scrollbar.
- **Input area**: attach button, auto-grow textarea (`field-sizing: content`), emoji button, send button (FILL=1).
- **Typing indicator**: three `w-1.5 h-1.5 bg-secondary rounded-full animate-bounce` dots with staggered delays (0ms, 150ms, 300ms).

---

## Days 35â€“37 â€” Read Receipts, Unread Badges, and Global Off-Screen Notifications

### New Files
- `src/app/api/jobs/[id]/messages/read/route.ts` â€” `PATCH` marks every message in the job where `recipientId === currentUser._id && readAt === null` as read. `withAuth` + participant check; only the recipient's own messages are ever touched.
- `src/app/api/jobs/unread-counts/route.ts` â€” `GET` returns `{ [jobId]: number }` â€” unread message counts for the current user, aggregated from `Message` where `recipientId === me && readAt === null`.
- `src/app/api/jobs/my-active-ids/route.ts` â€” `GET` returns `{ jobIds: string[] }` â€” IDs of the user's active jobs (status `accepted` or `in_transit`) where the user is poster or driver. Feeds the global Pusher provider.
- `src/components/providers/PusherProvider.tsx` â€” global React context provider. Fetches active job IDs (TanStack Query, 30s staleTime), subscribes to `private-job-{jobId}` for each with a single shared `pusherClient` instance, listens for `new-message`, and fires a top-right `react-hot-toast` ("New message from [senderName]") when the user is not already on that job's chat page. Reconciles channel subscriptions when the job set changes; full teardown on unmount.

### Modified Files
- `src/app/api/jobs/[id]/messages/route.ts` â€” the `new-message` Pusher payload now includes `senderName` (looked up from the sender's `User`), so the global provider can render the toast text.
- `src/app/(main)/jobs/[id]/chat/page.tsx` â€” on mount (once auth + job resolve, user is a participant, chat is available), fires `useMarkMessagesRead().mutate(id)`. No cache invalidation after the read-mark.
- `src/components/chat/ActiveChatsSidebar.tsx` â€” each conversation row reads `useUnreadCounts()` and renders an unread-count badge (primary pill) when the count is > 0; renders nothing at 0.
- `src/api/apis/jobs/jobApi.ts` â€” added `fetchUnreadCounts()`, `markJobMessagesRead(jobId)`, `fetchMyActiveJobIds()`.
- `src/api/hooks/jobs/jobsApi.ts` â€” added `useUnreadCounts()` (30s staleTime) and `useMarkMessagesRead()` (on success, sets that job's unread count to 0 in the cache â€” never invalidates).
- `src/types/message/message.ts` â€” added `UnreadCountsByJob` and `MarkMessagesReadResponse`.
- `src/app/layout.tsx` â€” wrapped `<main>` with `<PusherProvider>` inside the existing auth/query providers.
- `package.json` â€” added `react-hot-toast`.

### API Routes
- `PATCH /api/jobs/:id/messages/read` â€” `withAuth` + participant gate. `Message.updateMany({ jobId, recipientId: user.userId, readAt: null }, { $set: { readAt: new Date() } })`. Returns `{ ok, markedCount }`.
- `GET /api/jobs/unread-counts` â€” `withAuth`. Mongo aggregation `$match {recipientId, readAt: null}` â†’ `$group` by `jobId` â†’ plain `{ [jobId]: count }` object.
- `GET /api/jobs/my-active-ids` â€” `withAuth`. `Job.find({ status: { $in: [accepted, in_transit] }, $or: [{ posterId: me }, { driverId: me }] })` â†’ array of IDs.

### Architectural Decisions
- **Read-mark updates cache, never invalidates**: per the project rule, after a read-mark the message list query key is untouched. The unread-counts cache entry for that job is set to 0 directly via `queryClient.setQueryData`, so the badge clears instantly without a refetch.
- **Toast library**: the task specified `react-hot-toast`; installed as the one new dependency and used only by `PusherProvider` (the app's existing `sonner` toasts remain untouched).
- **Independent subscriptions**: the chat page's per-job Pusher subscription is unchanged. The global provider subscribes to the same channel separately â€” additive, no refactor of the chat page.
- **Single Pusher client**: `PusherProvider` imports the module-level `pusherClient` singleton from `src/lib/pusherClient.ts`; it never constructs a new instance per channel or mount.
- **Self-message guard**: the server echoes a sender's own message back over Pusher, so the provider skips toasts where `payload.senderId === currentUser._id` (also documented in ChatPanel's dedupe logic).

### Learning Prompt: Why must the unread badge clear without a refetch?
Opening the chat marks messages read, and the badge should disappear the instant the chat opens. If we invalidated the unread-counts query we'd trigger an extra network round-trip and (worse) risk a race where the badge flickers back before the fresh payload lands. Setting the count to 0 directly in the query cache is synchronous, zero-cost, and matches the project's "append to cache, never invalidate" rule for message/read flows.

### Verification (Day 37)
- Node E2E script (`day35-36.mjs`, temp) â€” 30/30 checks passed: register/login both roles, post job, accept, send messages both directions, `my-active-ids` correct for both participants, unread count 1 for recipient / 0 for sender, mark-read returns `markedCount: 1` and clears the badge, recipient scoping (driver's mark-read never clears the poster's unread), 401 on all three new routes without a cookie, location ping 200 (driver) / 403 (poster).
- `npm run lint` â€” only pre-existing errors remain (register page unescaped entities, auth register `any`, errorResponse `any`); none introduced by Days 35â€“37.
- `npm run build` â€” clean; all three new API routes listed in the route manifest.
- Live-map marker + toast behavior require two real browser sessions (poster + driver) with the dev server running and are documented in `TestChecklist.md` rows 16â€“18; the API surface behind them is fully E2E-verified.

---

## Days 38â€“40 â€” Khalti Sandbox Payment Backend

### New Files
- `src/lib/payments/khalti.ts` â€” `initiateKhalti(job, poster)` (POST to Khalti initiate API, returns `{method, url, pidx}`), `verifyKhaltiPayment(pidx)` (POST to Khalti lookup API, returns authoritative status), `getPaymentFailureUrl()`.
- `src/app/api/payments/initiate/route.ts` â€” `POST /api/payments/initiate` (poster-only, validates job ownership + status `accepted`, calls `initiateKhalti`, stores `paymentPidx`/`paymentGateway`/`paymentStatus` on Job, returns redirect URL).
- `src/app/api/payments/khalti/verify/route.ts` â€” `GET /api/payments/khalti/verify?pidx=...` (no auth required, server-side Khalti lookup, handles Completed/Pending/Expired/User canceled/Refunded/unknown statuses, creates PaymentTransaction + Payout on success, redirects to job detail or failure URL).
- `src/models/PaymentTransaction.ts` â€” `{jobId, gateway, transactionId, amount, status, processedAt}` with unique compound index `{gateway: 1, transactionId: 1}` for idempotency.
- `src/models/Payout.ts` â€” `{driverId, jobId, amount, platformFee, gateway, gatewayTransactionId, status, paidAt?, notes?}`; status `pending` on creation.
- `.env.example` â€” payment environment variables added.

### Modified Files
- `src/models/Job.ts` â€” added `paymentGateway`, `paymentPidx`, `paymentTransactionUuid`, `paymentStatus` fields.

### API Routes
- `POST /api/payments/initiate` â€” poster-only. Validates: user owns job, job status is `accepted`. For `gateway: "khalti"`, calls Khalti initiate API, stores `pidx` on Job, returns `{method: "redirect", url}`. For `gateway: "esewa"`, returns 501 Not Implemented.
- `GET /api/payments/khalti/verify?pidx=...` â€” no auth (Khalti redirect may not have session). Reads `pidx` from query, calls Khalti lookup API, finds Job by `paymentPidx`. Handles:
  - `Completed` â†’ checks for existing PaymentTransaction (idempotency), marks Job `paymentStatus: "paid"`, creates Payout (90% driver / 10% platform fee, status `pending`), creates PaymentTransaction, redirects to `/jobs/:id`.
  - `Pending` â†’ redirects to failure URL with `?reason=pending`.
  - `Expired`, `User canceled`, `Refunded` â†’ marks Job `paymentStatus: "failed"`, redirects to failure URL with appropriate reason.
  - Unknown status â†’ logs error, redirects to failure URL with `?reason=unknown`.

### Architectural Decisions
- **Server-side verification**: Khalti redirect params are never trusted; the lookup API is authoritative.
- **Idempotency**: PaymentTransaction unique index `{gateway, transactionId}` prevents duplicate processing.
- **Payout split**: 90% driver, 10% platform fee (hardcoded for now).
- **No UI**: Days 38â€“40 are backend only â€” payment buttons, success/failure pages come later.

### Learning Prompt: Why must payment verification use the Khalti lookup API?
The redirect from Khalti contains `pidx`, `status`, and `transaction_id` in the URL query string. These are client-provided and can be forged. The server must call Khalti's lookup API with the `pidx` to get the authoritative payment status. This prevents a malicious user from marking their own job as paid without actually paying.

### Learning Prompt: Why a unique index on PaymentTransaction?
Khalti may redirect the user multiple times (e.g., page reload, back button). Without idempotency, each redirect would create a new Payout and PaymentTransaction. The unique compound index `{gateway, transactionId}` ensures that only one PaymentTransaction is ever created for a given Khalti transaction â€” subsequent redirects detect the existing record and skip processing.

### Verification (Day 40)
- `npm run build` â€” clean; new payment routes listed in manifest (`/api/payments/initiate`, `/api/payments/khalti/verify`).
- Manual testing: poster initiates payment for accepted job â†’ Khalti sandbox URL returned â†’ complete sandbox payment â†’ verification endpoint processes â†’ Job `paymentStatus: "paid"`, Payout created, PaymentTransaction created.

---

## Days 41â€“44 â€” eSewa v2 + Unified Payment Abstraction + Admin Payouts

### New Files
- `src/lib/payments/esewa.ts` â€” `generateEsewaSignature(totalAmount, transactionUuid, productCode)` (HMAC-SHA256 over `total_amount={n},transaction_uuid={uuid},product_code={code}`), `initiateEsewa(job, poster)` (generates `crypto.randomUUID()` transactionUuid, saves `paymentTransactionUuid` + `paymentGateway: "esewa"` on Job, returns `{method: "form", url, params}` for hidden-form POST to `https://rc-epay.esewa.com.np/api/epay/main/v2/form`), `verifyEsewaSignature(signedFieldNames, data, receivedSignature)` (recomputes HMAC over fields listed in `signed_field_names` in order).
- `src/app/api/payments/esewa/verify/route.ts` â€” `GET /api/payments/esewa/verify?data=...` (no auth; decodes base64 `data` param, verifies HMAC signature over `signed_field_names` order, idempotency check on `transaction_code` in PaymentTransaction, on `COMPLETE` marks Job `paid`, creates PaymentTransaction + Payout, redirects to job detail; on `FAILED`/`AMBIGUOUS` marks Job `failed`, redirects to failure URL).
- `src/lib/payments/index.ts` â€” `PaymentGateway` type (`khalti | esewa`), `PaymentInitResult` union (`redirect` | `form`), `initiatePayment(gateway, job, poster)` routes to gateway-specific function.
- `src/app/api/admin/payouts/route.ts` â€” `GET /api/admin/payouts?status=&page=&limit=` (admin-only, paginated, populates `driverId` name/email and `jobId` offeredPrice).
- `src/app/api/admin/payouts/[id]/route.ts` â€” `PATCH /api/admin/payouts/:id` (admin-only, accepts `{status: "paid", notes?}`, validates forward transition only, sets `paidAt`, returns updated payout).

### Modified Files
- `src/app/api/payments/initiate/route.ts` â€” removed 501 eSewa stub, calls `initiatePayment()` from abstraction layer, handles `pidx` for Khalti, persists `paymentGateway` and `paymentStatus` on Job, returns `PaymentInitResult` as-is to frontend.
- `src/lib/payments/khalti.ts` â€” no functional changes; exported via `index.ts`.
- `src/app/api/jobs/[id]/deliver/route.ts` â€” on delivery, auto-creates Payout from PaymentTransaction (90/10 split) if none exists.

### API Routes Added
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/payments/esewa/verify?data=` | none | eSewa server-side verification (base64 HMAC) |
| GET | `/api/admin/payouts?status=&page=&limit=` | `withRole(["admin"])` | Paginated payout list with driver/job populates |
| PATCH | `/api/admin/payouts/:id` | `withRole(["admin"])` | Mark payout paid with notes + paidAt |

### Architectural Decisions
- **Unified abstraction layer**: `src/lib/payments/index.ts` is the single entry point. Route handlers contain zero gateway-specific logic. `PaymentInitResult` union handles Khalti redirect vs eSewa form POST.
- **eSewa uses form POST, not redirect**: Khalti returns a JS redirect URL; eSewa v2 requires a server-rendered hidden form with HMAC-signed parameters. The abstraction returns `{method: "form", url, params}` â€” frontend must programmatically create and submit the form.
- **HMAC verification mirrors Khalti lookup**: eSewa verify decodes the base64 `data` param, recomputes the HMAC over `signed_field_names` in the exact order specified, and rejects on mismatch. Corrupted or tampered data fails closed.
- **Idempotency on both gateways**: PaymentTransaction unique index `{gateway, transactionId}` covers both Khalti `transaction_id` and eSewa `transaction_code`.
- **Auto-payout on delivery**: When a driver marks a job `delivered`, the route checks for a PaymentTransaction and creates a Payout (status `pending`, 90/10 split) if one doesn't already exist. This ensures payouts are created even for jobs where payment was already verified (Khalti creates payout on verify; eSewa creates on verify; delivery creates as fallback).
- **Admin payout endpoints require `role === "admin"`**: `withRole(["admin"])` guard enforces this. PATCH only allows `status: "paid"` transition; `failed` and already-`paid` payouts are blocked.

### Verification (Day 44)
- `npm run build` â€” clean; all new routes listed in manifest.
- eSewa sandbox form submission reaches eSewa payment page (manual test).
- Manually corrupting base64 `data` param causes verify to reject (signature mismatch).
- Single `POST /api/payments/initiate` handles both gateways via `PaymentInitResult`.
- Admin can list pending payouts and mark them paid with notes.
- Both gateways work end-to-end after Day 43 refactor.

---

## Days 45â€“48 â€” Idempotency + Payment UI + Payout Status UI + Sandbox Walkthrough

### Day 45 â€” Payment Idempotency & Failure Handling
- **PaymentTransaction model** (`src/models/PaymentTransaction.ts`): logs every processed gateway transaction; unique compound index `{gateway, transactionId}` is the DB-level idempotency arbiter (prevents double-processing).
- **Verify routes are idempotent**: both `/api/payments/khalti/verify` and `/api/payments/esewa/verify` `findOne` an existing PaymentTransaction before creating a Payout; a second call with the same transaction ID is a no-op redirect to the job detail page.
- **All gateway failure statuses handled explicitly**: Khalti `Pending`, `Expired`, `User canceled`, `Refunded` + unknown fallback; eSewa `FAILED`, `AMBIGUOUS` + unknown fallback. Failures set `job.paymentStatus = "failed"` and never create a Payout.
- **Abandoned payment**: closing the tab mid-payment (no return redirect) leaves `paymentStatus = "initiated"` â€” the job detail page re-shows the payment section so the poster can retry.
- **Learning prompt (answer) â€” "How do I close the window between 'check if exists' and 'save the record'?":** A `findOne` check followed by a `create` is two separate operations â€” two concurrent calls can both pass the check before either insert, so the check is not an arbiter. The fix is to make the insert itself the arbiter: rely on the unique index by inserting the `PaymentTransaction` first and catching the duplicate-key error (`E11000`); on `E11000`, treat it as "already processed" and skip Payout creation. **Current code does NOT yet do this** â€” it creates the Payout before the PaymentTransaction, leaving a TOCTOU window for concurrent double-verify (see `Decisions.md` D-31). This is the single most important hardening item outstanding.

### Day 46 â€” Payment UI (Gateway Selector + Redirect/Form Flow)
- **`PaymentSelectionSection`** on the role-aware job detail page (`src/app/(main)/jobs/[id]/page.tsx`) shows eSewa + Khalti buttons only when the job is `accepted`, has an assigned driver, and is unpaid.
- **Both gateway response types handled**: Khalti `{method: "redirect"}` â†’ `window.location.href`; eSewa `{method: "form"}` â†’ programmatic hidden-form POST with signed params.
- **No double-submission**: buttons disable immediately on click and while pending; one redirect per click.
- **`/payment/success`** â€” server component resolving `?pidx=` (Khalti) or `?data=` (eSewa), calling the correct verify endpoint, checking the DB `paymentStatus`, and redirecting to the job detail on success or `/payment/failure` otherwise.
- **`/payment/failure`** â€” clean error UI with job/reason summary + "Try Again" link back to job detail.

### Day 47 â€” Payout Status UI
- **`GET /api/drivers/payouts`** â€” `withAuth`; returns the driver's payouts (createdAt desc) plus `totalEarned` (sum of paid) and `pendingPayout` (sum of pending).
- **Payout badges** on the job detail page (pending / paid + date / failed) so the driver sees what they are owed per job.
- **`/driver/earnings`** page â€” summary cards (Total Earned, Pending Payouts, Total Payout Transactions) + payout history table with job links, gateway chip, and notes. "Earnings" nav link added for drivers in the Header (desktop + mobile drawer).
- **Rule note (BUG-06):** the driver payouts endpoint is unpaginated, which violates "never fetch all records" â€” pagination is a planned follow-up.

### Day 48 â€” Full Sandbox Walkthrough
- Manual E2E verified with both gateways: poster posts â†’ driver accepts â†’ poster pays â†’ verify confirms â†’ Job `paid` â†’ Payout `pending` â†’ admin marks `paid` â†’ driver sees paid status on earnings page and job badge.
- Deliberate failure cases verified: tab-close mid-payment leaves a retryable state; tampered eSewa `data` is rejected (HMAC mismatch) and lands on the failure page; sequential double-verify with the same `pidx` creates exactly one Payout.

### Rules Audit (Aug 16) â€” Summary
- **Followed:** Mongoose HMR guard on all new models; no `any` (all catch blocks use `unknown` + `instanceof`); named constants for the 90/10 split; explicit gateway failure statuses; retryable-on-abandon; role-guarded admin/driver payout routes.
- **Violations found** (traced in `Bug.md` BUG-05â€“08, designs in `Decisions.md` D-31): status strings are magic strings; `/api/drivers/payouts` unpaginated; `/payment/success` string-interpolates verify URLs; `PaymentGateway` type + 90/10 constants duplicated across files; `ERROR_MSG_MISSING_SUCCESS_URL` dead code; bare `100` paisa multiplier in eSewa + initiate routes; and the TOCTOU double-Payout window described above.

### Architectural Decisions
- **D-31 (proposed):** close the TOCTOU window by making the unique index the arbiter â€” insert PaymentTransaction first, treat `E11000` as already-processed, then create the Payout.

### Verification (Day 48)
- `npm run build` â€” clean (after BUG-01â€“04 fixes).
- `npm run lint` â€” 19 problems / 4 errors, all pre-existing in files outside this feature (register page unescaped entities, `any` in auth register + errorResponse).
- Manual sandbox walkthrough of both gateways + failure cases above. TestChecklist rows 19â€“24 added.

---

## Phase 7 â€” Days 49â€“50 Earnings Aggregation Pipeline & Endpoint

### New Files
- `src/types/payout/earnings.ts` â€” types layer: `EarningsRange` (`"week" | "month" | "all-time"`), `EarningsBucket` (lib output: `period`, `totalAmount`, `jobCount`), `EarningsSummary`, `EarningsBreakdownItem` (`period`, `amount`, `jobCount`), `EarningsResponse` (`{ summary, breakdown }`).
- `src/lib/earnings.ts` â€” aggregation logic over the `Payout` model: `getWeeklyEarnings(driverId, weeks = 8)`, `getMonthlyEarnings(driverId, months = 12)`, `getAllTimeEarnings(driverId)`. All return `EarningsBucket[]` sorted chronologically, amounts in NPR.
- `scripts/seed-earnings.ts` â€” idempotent seed: 3 driver users + 1 poster + jobs + payouts spanning ~4 months with a mix of `paid`/`pending`/`failed` statuses. Run with `npx tsx scripts/seed-earnings.ts`. Self-verifies the three aggregation functions against independently computed JS expectations and prints PASS/FAIL per bucket.
- `src/app/api/drivers/[id]/earnings/route.ts` â€” `GET /api/drivers/[id]/earnings?range=week|month|all-time`.

### API Route
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/drivers/:id/earnings?range=` | `withAuth` (owner or admin) | Paid-payout earnings breakdown + summary for a driver |

Response shape:
```json
{
  "summary": { "totalAmount": 7700, "jobCount": 5 },
  "breakdown": [
    { "period": "2026-05", "amount": 2200, "jobCount": 1 },
    { "period": "2026-06", "amount": 1800, "jobCount": 1 }
  ]
}
```
- `range=week` â†’ weekly buckets (`$dateTrunc` unit `week`, Monday start), labeled `YYYY-MM-DD`, default 8 weeks.
- `range=month` â†’ monthly buckets, labeled `YYYY-MM`, default 12 months.
- `range=all-time` â†’ monthly buckets over the full payout history, no date window.
- `summary` is the aggregate of the full `breakdown` array; `breakdown[i].amount` is the lib's per-bucket `totalAmount`.
- Access: driver can query only their own `[id]`; admin can query any. Non-owner non-admin â†’ 403. No token â†’ 401 (via `withAuth`). Invalid `range` value falls back to `week` (default).

### Architectural Decisions
- **PLMS layering (types â†’ lib â†’ api):** bucket/response types live in `src/types/payout/earnings.ts`; the aggregation pipeline lives in `src/lib/earnings.ts`; the route handler only parses `range`, runs the owner/admin gate, and calls the matching lib function. No query logic in the route.
- **Single shared pipeline:** weekly and monthly share one internal `getEarningsByPeriod(driverId, unit, periodFormat, startDate?)`; the unit + `$dateToString` format are the only differences. `all-time` is the same pipeline without a `startDate` (no `createdAt` in the `$match`).
- **`$dateTrunc` for bucketing (MongoDB 5.0+):** the `$group._id` is `$dateToString` of `$dateTrunc` on `createdAt`, so the bucket label comes out of the aggregation itself â€” no client-side date math. Weekly uses `startOfWeek: "monday"` (the option is `startOfWeek`, not `weekStartDay` â€” Atlas rejects `weekStartDay` with a "Unrecognized argument" error, see D-32).
- **Window math in UTC:** `startDate` for weekly is `weekStart(now) âˆ’ (weeksâˆ’1)Â·7d`; for monthly it is `monthStart(now)` minus `(monthsâˆ’1)` months. Bucketing is UTC-based, consistent with how the app stores timestamps.
- **`status: "paid"` only:** the `$match` filters `status: "paid"`, so `pending` and `failed` payouts are excluded from every response â€” no application-level filtering, the DB does it.
- **Named constants, no magic strings:** `PAYOUT_STATUS_PAID`, `WEEK_START_DAY = "monday"`, `DATE_TRUNC_UNIT_WEEK/MONTH`, `WEEKLY/MONTHLY_PERIOD_FORMAT`, `DEFAULT_WEEKS/DEFAULT_MONTHS` all live at module level in `src/lib/earnings.ts`.
- **Driver id cast in `$match`:** `new Types.ObjectId(driverId)` (same pattern as `updateDriverRating`), so aggregation always compares against `ObjectId`.

### Learning Prompt: Why aggregate in the database instead of fetching payouts and summing in JS?
Fetching a driver's full payout history to compute totals in JS (a) violates "never fetch all records", (b) ships every record over the wire just to throw it away, and (c) makes totals drift as history grows. A single `$match â†’ $group â†’ $sort` aggregation returns only the summary buckets â€” MongoDB computes `$sum` and bucketing server-side, so the payload is tiny and the cost is one index-backed scan. `$dateTrunc` also keeps the bucket boundaries authoritative (MongoDB's own calendar/week logic) instead of re-implementing "start of week" in every consumer.

### Verification (Day 50)
- Seed run: `npx tsx scripts/seed-earnings.ts` â€” 9/9 aggregation checks PASSED (3 drivers Ã— weekly/monthly/all-time); pending/failed amounts absent from every bucket; the 120-day-old payout appears in monthly/all-time but not in the 8-week weekly window; no `createdAt` override warnings.
- Endpoint harness (temp script, direct handler invocation with real signed JWTs): 13/13 checks PASSED â€” driver-own week 3700/3, month 7700/5, all-time 7700/5; default range = week; driver querying another driver â†’ 403; admin can query any driver (week 4500/2, month 7700/5); breakdown shape valid; `summary` equals the aggregate of `breakdown`; invalid range falls back to week; no token â†’ 401.
- `npm run lint` â€” no new problems; the 4 errors are pre-existing (register page unescaped entities, `any` in `errorResponse.ts` and one other file).
- `npm run build` â€” clean; `/api/drivers/[id]/earnings` listed in the route manifest.

---

## Days 54â€“55 â€” Admin Job & User Management

### Day 54 â€” Admin Job Management

#### New Files
- `src/types/admin/adminJobs.ts` â€” Admin job domain types: `AdminJobItem`, `AdminJobsResponse`, `AdminJobsQueryParams`, `AllowedOverrideStatus`, `StatusOverrideInput`.
- `src/api/apis/admin/adminJobsApi.ts` â€” Plain fetchers: `getAdminJobs(params)` (GET `/api/admin/jobs` with status/search/page/limit), `overrideJobStatus(jobId, data)` (PATCH `/api/admin/jobs/:id/status`).
- `src/api/hooks/admin/adminJobsApi.ts` â€” `useAdminJobs(queryParams)` and `useOverrideJobStatus()` (invalidates admin jobs query on success, toasts).
- `src/components/admin/StatusOverrideModal.tsx` â€” Modal for overriding job status: dropdown of allowed target statuses, reason textarea, audit warning about irreversible action, confirm/cancel buttons.
- `src/app/(admin)/admin/jobs/page.tsx` â€” Admin job management page with stat cards (total, in-transit, disputed, cancelled), filter tabs, debounced search, paginated table, status override action.

#### Modified Files
- `src/types/job.ts` â€” Added `DISPUTED` to `JOB_STATUS` enum.
- `src/app/api/admin/jobs/[id]/status/route.ts` â€” Replaced magic string `"disputed"` with `JOB_STATUS.DISPUTED`.
- `src/utils/format.ts` â€” Added `formatNpr()` and `formatShortDate()` utilities.

#### API Routes
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/admin/jobs` | `withRole(["admin"])` | Paginated job list with `status`, `search`, `page`, `limit` |
| PATCH | `/api/admin/jobs/:id/status` | `withRole(["admin"])` | Override job status with audit reason |

#### Architectural Decisions
- **PLMS layering:** types â†’ apis â†’ hooks â†’ components â†’ page.
- **Status override is admin-only:** both endpoints wrapped in `withRole(["admin"])`.
- **Audit trail:** override route requires a `reason` string; the modal surfaces an irreversible-action warning before confirming.
- **`DISPUTED` status added to enum:** replaces the previous magic string `"disputed"` in the status override route.
- **Pagination from day one:** `PAGE_SIZE = 10` enforced on the admin jobs list.

---

### Day 55 â€” Admin User Management

#### New Files
- `src/types/admin/adminUsers.ts` â€” Admin user domain types: `AdminUserItem`, `AdminUsersResponse`, `AdminUserRoleFilter`, `AdminUserStatusFilter`.
- `src/types/adminUsers.ts` â€” Barrel re-export for admin user types.
- `src/app/api/admin/users/route.ts` â€” `GET /api/admin/users` (paginated, role/status filters, search).
- `src/app/api/admin/users/[id]/suspend/route.ts` â€” `PATCH /api/admin/users/:id/suspend` (toggle suspend, admin guard).
- `src/app/api/admin/users/[id]/role/route.ts` â€” `PATCH /api/admin/users/:id/role` (poster â†” driver, admin guard).
- `src/api/apis/admin/adminUsersApi.ts` â€” `getAdminUsers()`, `toggleSuspendUser()`, `changeUserRole()`.
- `src/api/hooks/admin/adminUsersApi.ts` â€” `useAdminUsers()`, `useToggleSuspendUser()`, `useChangeUserRole()`.
- `src/components/admin/UserActionModal.tsx` â€” Modal for user details/suspend/role-change with confirmation flow.
- `src/app/(admin)/admin/users/page.tsx` â€” User management page with role tabs, status dropdown, search, table, pagination.

#### Modified Files
- `src/models/User.ts` â€” Added `updatedAt: Date` to `IUser` interface to align with `timestamps: true`.

#### API Routes
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/admin/users` | `withRole(["admin"])` | Paginated user list with role/status filters + search |
| PATCH | `/api/admin/users/:id/suspend` | `withRole(["admin"])` | Toggle user suspend/active |
| PATCH | `/api/admin/users/:id/role` | `withRole(["admin"])` | Change user role (poster â†” driver) |

#### Architectural Decisions
- **PLMS layering:** types â†’ apis â†’ hooks â†’ components â†’ page.
- **Admin-only access:** all three endpoints wrapped in `withRole(["admin"])`.
- **Role change is constrained:** only poster â†” driver transitions allowed; admin role cannot be self-assigned.
- **Suspend is a toggle:** the endpoint flips `isActive` rather than accepting a boolean, preventing accidental desync.
- **TypeScript aligned with Mongoose timestamps:** added `updatedAt: Date` to `IUser` so the interface matches the runtime schema (`timestamps: true`).

#### Verification
- `npm run build` â€” exit code 0, all 42 pages generated, type-check clean.

---

## Days 56 â€” Driver Earnings and Payouts Restructuring

### Summary of Changes
Restructured the driver earnings and payouts pages to resolve layout/intent mismatch between the premium analytics dashboard and the detailed transactions ledger:
- Move original Payout history listing page to `/driver/payouts`.
- Rebuilt `/driver/earnings` page to match the premium "Driver Earnings Dashboard" with analytics grid, custom SVG-based weekly chart, and right-hand processing time panels.

#### New Files
- `src/app/(main)/driver/payouts/page.tsx` â€” Ledger view showing total paid, pending payouts, total payout transactions, and payout history list.

#### Modified Files
- `src/app/(main)/driver/earnings/page.tsx` â€” Premium analytics page with total earnings, weekly earnings + indicator, pending payouts, custom SVG weekly earnings bar chart, recent transactions, payout info processing times panel, and support block.

---

## Days 56â€“58 â€” Dispute Management & Analytics

### Day 56 â€” Dispute Flag + Resolution

#### Modified Files
- `src/models/Job.ts` â€” Added `disputeReason`, `flaggedBy`, `resolutionNote`, `evidenceImages: string[]`, `acceptedAt`, `inTransitAt`, `deliveredAt`, `disputedAt` to schema and `IJob` interface.
- `src/app/api/jobs/[id]/accept/route.ts` â€” Sets `acceptedAt` on atomic accept.
- `src/app/api/jobs/[id]/transit/route.ts` â€” Sets `inTransitAt` on atomic transit.
- `src/app/api/jobs/[id]/deliver/route.ts` â€” Sets `deliveredAt` on atomic deliver.
- `src/app/api/jobs/[id]/dispute/route.ts` â€” Sets `disputedAt` on dispute flag.

#### New Files
- `src/types/admin/adminDisputes.ts` â€” Dispute domain types: `DisputedJobItem` (now includes `evidenceImages`, `acceptedAt`, `inTransitAt`, `deliveredAt`, `disputedAt`), `DisputesQuery`, `DisputesResponse`, `ResolveJobInput`, `ResolveJobResponse`.
- `src/api/apis/admin/adminDisputesApi.ts` â€” `getAdminDisputes(query)` and `resolveJobDispute(jobId, data)`.
- `src/api/hooks/admin/adminDisputesApi.ts` â€” `useAdminDisputes()` and `useResolveJobDispute()`.
- `src/components/admin/ResolveDisputeModal.tsx` â€” Modal for resolving a dispute. Rewritten with a step-by-step plain-language flow: Step 1 radio buttons (cancel / re-post), Step 2 radio buttons (refund / pay / split), Step 3 note textarea. Step 2 only shows after Step 1 is chosen; split shows two NPR amount inputs. Single "Confirm Resolution" button. No dropdowns.
- `src/app/api/jobs/[id]/dispute/route.ts` â€” `POST /api/jobs/:id/dispute`. Participant-only (`withAuth`); validates participant, checks disputable statuses (`accepted`, `in_transit`, `delivered`), sets `status` to `disputed`, stores `disputeReason` and `flaggedBy`, sets `disputedAt`, triggers Pusher `status-change`.
- `src/app/api/admin/disputes/route.ts` â€” `GET /api/admin/disputes`. Admin-only (`withRole(["admin"])`); returns paginated disputed jobs with populated poster/driver names, dispute reason, flagged-by role, route, amount, evidence images, and lifecycle timestamps.
- `src/app/api/admin/jobs/[id]/resolve/route.ts` â€” `PATCH /api/admin/jobs/:id/resolve`. Admin-only; accepts `resolvedStatus` (`posted`/`cancelled`), `note`, and optional `payoutStatus` (`paid`/`failed`). Updates job status, clears `driverId` if reopened, saves `resolutionNote`, optionally updates linked `Payout` status, triggers Pusher `status-change`.
- `src/app/api/jobs/[id]/evidence/route.ts` â€” `POST /api/jobs/:id/evidence`. Participant-only (`withAuth`); accepts `multipart/form-data` image uploads, validates MIME type (jpeg/png/webp) and size (max 5MB), uploads to Cloudinary under `dispute-evidence/{jobId}` folder, appends `secure_url` values to Job `evidenceImages` array.
- `src/app/(admin)/admin/disputes/page.tsx` â€” Admin dispute queue with search, disputed jobs table (reason, flagged-by badge, parties, amount), resolve action, and pagination. Detail panel includes:
  - Evidence Image Grid rendered from real `evidenceImages` URLs (Cloudinary, via `next/image`).
  - Chat Transcript Snippet fetched from `GET /api/jobs/:id/messages` in real time.
  - Delivery Timeline built from real `acceptedAt` â†’ `inTransitAt` â†’ `deliveredAt` â†’ `disputedAt` timestamps.
- `src/app/(main)/jobs/[id]/page.tsx` â€” Added participant-only dispute flag button with confirmation modal for jobs in `accepted`/`in_transit`/`delivered` status.

#### API Routes
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| POST | `/api/jobs/:id/dispute` | `withAuth` (participant only) | Flag job as disputed with reason |
| POST | `/api/jobs/:id/evidence` | `withAuth` (participant only) | Upload evidence images to Cloudinary |
| GET | `/api/admin/disputes` | `withRole(["admin"])` | Paginated disputed jobs with participant info, evidence, and lifecycle timestamps |
| PATCH | `/api/admin/jobs/:id/resolve` | `withRole(["admin"])` | Resolve dispute, update status + note, optional payout update |
| GET/POST | `/api/jobs/:id/admin-message` | `withRole(["admin"])` | Admin-only messaging: GET fetches job messages (optionally filtered by `recipientId`), POST sends a message from admin to a job participant (poster or driver)

#### Architectural Decisions
- **Dispute fields on Job model:** `disputeReason`, `flaggedBy`, `resolutionNote`, `evidenceImages`, and lifecycle timestamps (`acceptedAt`, `inTransitAt`, `deliveredAt`, `disputedAt`) added directly to Job so the dispute state travels with the job document.
- **Participant-only flagging:** the dispute route checks `posterId` or `driverId` against the JWT `userId`; only disputable statuses (`accepted`, `in_transit`, `delivered`) are allowed.
- **Pusher event on dispute flag and resolve:** both routes fire `status-change` on `private-job-{jobId}` so real-time subscribers update immediately.
- **Payout status update on resolve:** optional `payoutStatus` in the resolve body updates the linked `Payout` document in the same transaction, keeping financial state consistent.
- **Evidence images via Cloudinary:** `POST /api/jobs/:id/evidence` uploads to Cloudinary `dispute-evidence/{jobId}` folder, returns `secure_url` array, and appends to Job `evidenceImages`. Admin panel renders these via `next/image`.
- **Real chat transcript:** admin dispute detail fetches `GET /api/jobs/:id/messages` for the disputed job and renders sender-colored bubbles with real timestamps.
- **Real delivery timeline:** built from `acceptedAt`, `inTransitAt`, `deliveredAt`, and `disputedAt` fields populated at each lifecycle transition (accept/transit/deliver/dispute).

### Day 57 â€” Analytics Endpoints

#### New Files
- `src/types/admin/adminAnalytics.ts` â€” `JobsPerDayItem` and `AdminAnalyticsResponse`.
- `src/app/api/admin/analytics/route.ts` â€” `GET /api/admin/analytics`. Admin-only; returns three metrics:
  1. `jobsPerDay`: `$dateTrunc` daily buckets for the last 30 days (`%Y-%m-%d` format).
  2. `gmv`: `$sum` of `offeredPrice` where `status === JOB_STATUS.DELIVERED`.
  3. `activeDrivers`: `countDocuments` on `DriverProfile` where `status === "approved"`.
- `src/api/apis/admin/adminAnalyticsApi.ts` â€” `getAdminAnalytics()`.
- `src/api/hooks/admin/adminAnalyticsApi.ts` â€” `useAdminAnalytics()` (30s staleTime, 60s refetch interval).

#### API Routes
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/admin/analytics` | `withRole(["admin"])` | Returns `jobsPerDay`, `gmv`, `activeDrivers` |

#### Architectural Decisions
- **`$dateTrunc` with day unit:** daily bucketing uses `$dateToString` on `createdAt` with `%Y-%m-%d` format â€” no `weekStartDay` used.
- **Single response shape:** all three metrics are returned in one call to avoid multiple round-trips.
- **GMV uses `offeredPrice` on delivered jobs:** matches the existing revenue aggregation pattern in the admin jobs endpoint.

### Day 58 â€” Analytics Dashboard UI

#### New Files
- `src/app/(admin)/admin/analytics/page.tsx` â€” Admin analytics page with:
  - Three KPI cards: Total GMV (NPR formatted), Active Drivers, Jobs (Last 30 Days).
  - Recharts `BarChart` for `jobsPerDay` trend (30-day daily volume).
  - Loading and empty states handled.

#### Modified Files
- `src/components/admin/AdminSidebar.tsx` â€” Added "Disputes" and "Analytics" nav links.
- `next.config.ts` â€” Added `res.cloudinary.com` to `images.remotePatterns` so Next.js `<Image />` can render Cloudinary URLs in the dispute evidence grid.

#### New Seed Scripts
- `scripts/seed-disputes.ts` â€” Seeds 5 disputed jobs with evidence images (Cloudinary demo URLs), chat messages, and lifecycle timestamps (`acceptedAt`, `inTransitAt`, `deliveredAt`, `disputedAt`). Run with `npx tsx scripts/seed-disputes.ts`.

#### Architectural Decisions
- **Recharts BarChart (not Line):** bars make per-day volume easier to read at a glance per the design reference.
- **KPI cards mirror existing admin dashboard styling:** same card structure, icon containers, and typography tokens.
- **TanStack Query with refetch:** `useAdminAnalytics` uses 30s staleTime and 60s refetchInterval for near-live metrics.

### Verification
- `npx tsc --noEmit` â€” 0 errors.
- `npx eslint` on all changed files â€” 0 errors.
- Build verified clean (`npm run build` exit code 0, all routes compiled).

---

## Day 61 â€” Poster Dashboard

### New Files
- `src/types/poster/posterDashboard.ts` â€” `PosterSummaryStats`, `PosterSummaryData`, `PosterSummaryResponse`.
- `src/app/api/posters/[id]/summary/route.ts` â€” `GET /api/posters/:id/summary`. Aggregates Job counts by status group (active, pending, completed, cancelled) and sums `offeredPrice` for `DELIVERED` jobs only into `totalSpent`. Restricted to the poster themselves or admin role.
- `src/api/apis/posters/posterDashboardApi.ts` â€” `getPosterSummary(posterId)`.
- `src/api/hooks/posters/posterDashboardApi.ts` â€” `usePosterSummary(posterId)`.
- `src/app/(dashboard)/dashboard/page.tsx` â€” Unified `/dashboard` entry point. Poster role sees poster summary dashboard with four summary cards (Active Jobs, Pending Acceptance, Completed Jobs, Total Spent), Recent Deliveries table (real job data via `useMyJobs`), Quick Actions, and Efficiency Score. Admin redirects to `/admin`, driver redirects to `/driver/earnings`.

### Modified Files
- `src/api/apis/jobs/jobApi.ts` â€” Added `fetchMyJobs(query)` calling existing `GET /api/jobs`.
- `src/api/hooks/jobs/jobsApi.ts` â€” Added `useMyJobs(query)` hook.
- `src/types/jobs/jobs.ts` â€” Added `MyJobsResponse` type.

### Architectural Decisions
- **Aggregation uses `$match` + `countDocuments` + `$group`:** simple, readable, no `$dateTrunc` needed for status counts.
- **`totalSpent` sums only `DELIVERED` jobs:** cancelled job prices are explicitly excluded.
- **Role guard on API:** `withAuth` checks `userId === params.id` or `role === "admin"`.
- **Unified `/dashboard` with RBAC:** `useAuthGuard` + `useEffect` redirects admin to `/admin` and driver to `/driver/earnings`. Poster sees the dashboard content.
- **Recent Deliveries from existing `GET /api/jobs`:** the existing jobs endpoint is already role-scoped (poster sees own jobs), so `useMyJobs` reuses it instead of building a new endpoint.
- **Total Spent subtitle contrast:** uses `text-surface-white/80` on `bg-primary` for visibility.

---

## Day 62 â€” Admin Payout Management Queue

### New Files
- `src/types/admin/adminPayouts.ts` â€” `AdminPayoutItem`, `AdminPayoutsQuery`, `AdminPayoutsResponse`, `PayoutOverrideInput`, `PayoutOverrideResponse`.
- `src/app/api/admin/payouts/route.ts` â€” `GET /api/admin/payouts`. Admin-only; returns paginated payout records with populated driver name/email and linked job ID. Filterable by `status` and `driverId`.
- `src/app/api/admin/payouts/[id]/route.ts` â€” `PATCH /api/admin/payouts/:id`. Admin-only; accepts `{ status: "paid" | "failed", note: string }`. Rejects updates when current status is not `pending`. Saves `note` on the Payout document.
- `src/api/apis/admin/adminPayoutsApi.ts` â€” `getAdminPayouts(query)`, `overridePayoutStatus(id, data)`.
- `src/api/hooks/admin/adminPayoutsApi.ts` â€” `useAdminPayouts(query)`, `useOverridePayoutStatus()`.
- `src/components/admin/PayoutOverrideModal.tsx` â€” Modal for overriding payout status with status dropdown and admin note textarea.
- `src/app/(admin)/admin/payouts/page.tsx` â€” Admin payout queue with summary cards (Pending, Paid, Failed), status filter dropdown, paginated table (Date, Driver, Job ID, Gateway, Amount, Status, Actions), and override action on pending rows.

### Modified Files
- `src/components/admin/AdminSidebar.tsx` â€” Added "Payout Management" nav link.

### Architectural Decisions
- **Override only on pending:** the PATCH route checks `payout.status === "pending"` before allowing any update. Paid or failed records cannot be re-overridden.
- **Note field:** the existing `notes` field on the Payout model is used to store the admin override reason.
- **Cache invalidation:** `useOverridePayoutStatus` invalidates the `adminPayouts` query on success so the queue reflects changes immediately.
- **Paginated from day one:** `PAGE_SIZE = 10` enforced on the admin payouts list.
- **No new Payout model fields:** the existing `notes` field is reused; no schema changes required.

### Verification
- `npx tsc --noEmit` â€” 0 errors.
- `npx eslint` on all changed files â€” 0 errors.
- Build verified clean (`npm run build` exit code 0, 49 pages generated).

---

## Day 62 â€” Driver Activity Dashboard

### New Files
- `src/types/drivers/driverDashboard.ts` â€” `DriverSummaryStats`, `DriverSummaryResponse`.
- `src/app/api/drivers/[id]/summary/route.ts` â€” `GET /api/drivers/:id/summary`. Authenticated & restricted to driver (`user.userId === id`) or admin role. Calculates active jobs (`accepted` | `in_transit`), completed total (`DELIVERED`), completed this month (`DELIVERED` within current calendar month), total earned NPR (`DELIVERED` jobs only), rating average/count (`DriverProfile`), and verification status (`DriverProfile.status`).
- `src/api/apis/drivers/driverDashboardApi.ts` â€” `fetchDriverSummary(driverId)`.
- `src/api/hooks/drivers/driverDashboardApi.ts` â€” `useDriverSummary(driverId)` with 30s staleTime.
- `src/app/(dashboard)/driver/dashboard/page.tsx` â€” Driver activity dashboard matching design specs (`design-reference/driver-dashboard.md`). Role-protected (posters/admins redirected away). Contains welcome header, online status toggle, 6 summary metric cards (Active Jobs, Monthly Goal with progress bar, Lifetime Deliveries, Total Earnings NPR, Driver Rating, Account Status), and Recent Activity table populated via `useMyJobs`.

### Modified Files
- `src/app/(dashboard)/dashboard/page.tsx` â€” Updated `DRIVER_REDIRECT` constant to `/driver/dashboard`.
- `src/api/apis/jobs/jobApi.ts` â€” Added `driverId` and `status` optional parameters to `MyJobsQuery` and `fetchMyJobs()`.
- `src/api/hooks/jobs/jobsApi.ts` â€” Imported `MyJobsQuery` from `jobApi` to support query params.
- `src/types/jobs/jobs.ts` â€” Updated `Job` interface status to use `JobStatus` (includes `disputed`).

### API Routes Added
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/drivers/:id/summary` | `withAuth()` | Returns driver activity summary (active count, monthly count, total completed, total earned NPR, rating, verification status) |

### Architectural Decisions
- **Total Earned includes `DELIVERED` jobs only:** `offeredPrice` is summed strictly for jobs where `status === JOB_STATUS.DELIVERED`. Cancelled, disputed, or in-transit jobs are explicitly excluded.
- **Calendar Month Calculation:** `completedJobsThisMonth` calculates start of month via `Date.UTC(year, month, 1)` and checks `deliveredAt >= startOfMonth` (or `updatedAt >= startOfMonth` fallback).
- **Role Guard on Summary API:** Returns 403 Forbidden if `user.role !== "admin"` and `user.userId !== id`.
- **Driver Dashboard Redirect:** Logged-in drivers landing on `/dashboard` are automatically redirected to `/driver/dashboard`.

---

## Day 63 â€” Participant Dispute System & Dedicated 3-Step Dispute Page

### New Files
- `src/app/(main)/jobs/[id]/dispute/page.tsx` â€” Dedicated full-page 3-step Dispute Reporting page (`Report a Dispute - Unified Style`) matching `design-reference/dispute-flag-dialog.md`. Includes:
  - **Job Summary Panel (Left Column):** Job ID, Pickup timeline, Dropoff timeline, Agreed Price (NPR), 72-hour filing deadline notice.
  - **Step 1 (Dispute Category):** 4 radio cards (`damaged`, `late`, `payment`, `behavior`).
  - **Step 2 (Detailed Description):** Textarea with minimum 10-character validation and character counter.
  - **Step 3 (Evidence Upload):** File drag & drop supporting PNG, JPG, WEBP (uploads directly to Cloudinary via `POST /api/jobs/:id/evidence`).
  - **Submit Flow:** Uploads evidence images, submits dispute reason via `POST /api/jobs/:id/dispute`, updates job status to `DISPUTED`, dispatches Pusher `status-change` event, and redirects to job detail page.
- `src/app/(main)/disputes/page.tsx` â€” User-facing Disputes page (`/disputes`) listing flagged jobs under admin review for both posters and drivers with status badges, issue details, and empty states.
- `src/app/(dashboard)/poster/jobs/[id]/page.tsx` â€” Poster job detail page route alias re-exporting `JobDetailPage`.
- `src/app/(dashboard)/driver/jobs/[id]/page.tsx` â€” Driver job detail page route alias re-exporting `JobDetailPage`.

### Modified Files
- `src/app/(main)/jobs/[id]/page.tsx` â€” Added participant-only check (`posterId` or `driverId` matching user), hidden for admins/non-participants, added "Raise a Dispute" card linking to `/jobs/[id]/dispute`, and added "Job Flagged Under Dispute" status callout banner for disputed jobs.
- `src/app/(dashboard)/layout.tsx` â€” Added **"Disputes"** navigation link with `gavel` icon to desktop and mobile sidebar.
- `src/components/layout/Header.tsx` â€” Added **"Disputes"** navigation link with `gavel` icon to desktop header and mobile drawer.
- `src/app/(dashboard)/dashboard/page.tsx` & `src/app/(dashboard)/driver/dashboard/page.tsx` â€” Added `[JOB_STATUS.DISPUTED]` red status badge mapping to recent activity tables.

### Architectural Decisions
- **Participant-Gated Disputes:** Flagging a dispute is restricted to the poster or assigned driver (`user._id === posterId || user._id === driverId`). Admins review and resolve disputes via `/admin/disputes`.
- **Status Restriction:** Disputes can only be raised when job status is `accepted`, `in_transit`, or `delivered`.
- **Role-Aware `/disputes` Query:** `GET /api/jobs?driverId=me&status=disputed` for drivers and `GET /api/jobs?status=disputed` for posters ensuring each participant sees their own disputed jobs.
- **Evidence Upload Integration:** Evidence files are uploaded to Cloudinary `dispute-evidence/{jobId}` folder via `POST /api/jobs/:id/evidence` before the dispute status is updated.

### Verification
- `npm run build` â€” exit code 0, 51 pages generated, 0 TypeScript errors.

---

## Day 65 â€” Admin Panel Walkthrough & Polish Pass

### Admin Panel Walkthrough Results
Full walkthrough of every admin panel section. All actions operable without direct database access (no Atlas/mongosh needed):

**1. User Management** â€” `GET /api/admin/users` (pagination, role/status filters, search); `PATCH /api/admin/users/[id]/suspend` (cannot suspend admins); `PATCH /api/admin/users/[id]/role` (cannot assign admin role). Suspended users blocked at `withAuth` (auth.ts:68-70, 403). Page at `/admin/users`.

**2. Job Oversight** â€” `GET /api/admin/jobs` (status filter, search); `PATCH /api/admin/jobs/[id]/status` (force-cancel stuck jobs: posted/accepted/in_transit/disputed â†’ cancelled). `JOB_STATUS.DELIVERED` is explicitly forbidden as an override target (route.ts:48-56) and delivered jobs cannot be modified (route.ts:69-77). Page at `/admin/jobs`.

**3. Dispute Handling** â€” `GET /api/admin/disputes` (paginated queue with evidence, timeline, chat); `PATCH /api/admin/jobs/[id]/resolve` (requires `resolvedStatus` + `note`, optional payout status). Page at `/admin/disputes`.

**4. Analytics** â€” `GET /api/admin/analytics` returns `jobsPerDay` (30-day aggregation), `gmv` (sum of delivered `offeredPrice`), `activeDrivers` (count of approved profiles). Page at `/admin/analytics` with Recharts BarChart.

**Additional sections**: Driver verification (`GET/PATCH /api/admin/verification/[id]`), Payout management (`GET/PATCH /api/admin/payouts`).

All API routes protected with `withRole(["admin"])`. Admin layout (`(admin)/layout.tsx`) enforces role check at UI level. **No gaps found requiring direct database access.**

### Build Check
- `npm run build` â€” exit code 0, 51 pages, 0 TypeScript errors, 0 lint issues.

### Secrets Audit
- `grep` for KHALTI/ESEWA/PUSHER/MONGODB/JWT/CLOUDINARY/NEXTAUTH in `src/` excluding `process.env` â€” no hardcoded secrets found. All secrets accessed via environment variables.

### Environment Variables
- All 22 required env vars present in `.env.local` (MONGODB_URI, JWT_*, NEXTAUTH_*, GOOGLE_*, CLOUDINARY_*, KHALTI_*, ESEWA_*, PAYMENT_*, PUSHER_*, NEXT_PUBLIC_PUSHER_*).

### README.md
- Written at project root with sections: Description, Stack, Local Setup, Environment Variables table, Architecture (PLMS layering, role system, payment flow, real-time, file uploads), Known Manual Tasks (referencing Bug.md BUG-05â€“08).

### PRD Definition of Done
| Item | Status |
| --- | --- |
| Poster can register and login with credentials | PASS |
| Poster can login with Google OAuth | PASS |
| Poster can post a job | PASS |
| Poster can pay via Khalti | PASS |
| Poster can pay via eSewa | PASS |
| Poster can track driver live on map | PASS |
| Poster can chat with driver | PASS |
| Poster can rate driver after delivery | PASS |
| Driver can register and login | PASS |
| Driver can upload verification documents | PASS |
| Driver can browse and accept posted jobs | PASS |
| Driver can share live location during delivery | PASS |
| Driver can chat with poster | PASS |
| Driver can view earnings dashboard | PASS |
| Admin can review verification queue and approve/reject | PASS |
| Admin can view and manage all jobs | PASS |
| Admin can view analytics dashboard | PASS |
| App is deployed on a public URL | **FAIL** â€” No deployment config; `NEXTAUTH_URL=http://localhost:3000` |
| No hardcoded secrets in source code | PASS |

**Result:** 17/19 PASS. Only "App is deployed on a public URL" is FAIL â€” no `vercel.json` or deployment configuration exists; all URLs point to localhost.

---

## Day 66-67 â€” Poster Sidebar Pages & Nav Cleanup

### New Pages
- `src/app/(dashboard)/jobs/active/page.tsx` â€” POSTER: active deliveries list (accepted + in_transit). Fetches job IDs from `GET /api/jobs/my-active-ids`, then individual job details from `GET /api/jobs/[id]`. Shows job cards with pickup/dropoff, status badge, NPR price, link to `/jobs/[id]`. Loading skeletons + empty state.
- `src/app/(dashboard)/history/page.tsx` â€” POSTER: tabbed page (Jobs / Payments). Jobs tab fetches `GET /api/jobs?status=delivered` and `GET /api/jobs?status=cancelled`, combines and sorts by createdAt desc, rows link to `/jobs/[id]`. Payments tab derives payment records from delivered jobs (offeredPrice, paymentGateway, paymentStatus) since no payment-list endpoint exists. "Load more" pagination. Loading skeletons + empty states.
- `src/app/(dashboard)/analytics/page.tsx` â€” POSTER: summary cards (Total Spent, Total Jobs, Completed, Cancelled) from `GET /api/posters/:id/summary`, Recharts BarChart showing jobs by status, efficiency trend from stats.efficiencyTrend. Loading skeletons.
- `src/app/(dashboard)/billing/page.tsx` â€” POSTER: delivered jobs as billing records from `GET /api/jobs?status=delivered`. Total Spent card (sum of offeredPrice). Table: Job ID (links to `/jobs/[id]`), Route, PAID status badge, Amount (NPR), Date. Loading skeleton + empty state.
- `src/app/(dashboard)/tracking/page.tsx` â€” POSTER: active jobs list. Reuses /jobs/active fetch pattern (my-active-ids + individual fetches). Table: Job ID, Route, Driver, Status badge, Date. Links to `/jobs/[id]` for full detail/map view. Loading skeletons + empty state.

### Modified Files
- `src/app/api/jobs/[id]/route.ts` â€” added ObjectId format guard: returns 400 before Job.findById() when id is not a valid ObjectId. Prevents CastError when non-ObjectId values (e.g. "active") reach the route.
- `src/app/(dashboard)/layout.tsx` â€” removed /fleet (dead link). Added 3 poster nav links: Tracking, Analytics, Billing. Added 3 driver nav links: Earnings, Wallet, Verification. Made "New Shipment" sidebar button poster-only. Fixed mobile bottom nav links. Removed dead /fleet special-case in isActive().

### API Routes (no new routes created)
- No API routes created. All new pages use existing endpoints: GET /api/jobs, GET /api/jobs/[id], GET /api/jobs/my-active-ids, GET /api/posters/:id/summary.
- Known gap (BUG-09): No GET /api/payments list endpoint; PaymentTransaction model exists but has no read API. History Payments tab derives payment data from delivered Jobs as a workaround.

### Build Verification
- tsc --noEmit: 0 errors
- npm run build: 56 pages, 0 errors, 0 warnings

---

## Day 69b â€” Admin Dispute Messaging Panel + ResolveDisputeModal Rewrite

### New Files
- `src/app/api/jobs/[id]/admin-message/route.ts` â€” Admin-only GET + POST route: `withRole(["admin"])` guards both handlers; GET fetches all job messages (or filters by recipientId via `$or` sender/recipient pairs) without a participant check â€” admin gets 403 on the standard `/messages` route; POST accepts `{ recipientId, content }`, validates recipient is job poster/driver via `assertRecipientIsParticipant`, saves to `Message` model, triggers `triggerJobEvent(jobId, "new-message", { messageId, senderId, senderName, recipientName, content, createdAt })` on `private-job-{jobId}` channel.

### Modified Files
- `src/components/admin/AdminMessagePanel.tsx` (created) â€” Client component with poster/driver tab interface: fetches messages from `/api/jobs/{jobId}/admin-message?recipientId={userId}&limit=50`, sends via POST to `/api/jobs/{jobId}/admin-message`, uses `useAuth()` for admin user ID, `apiFetch` for token-refresh handling, TanStack Query for caching with `invalidateQueries` on send; Pusher subscription to `private-job-{jobId}` channel for real-time incoming message refetches (skips self-authored via `senderId === adminUserId` check).
- `src/components/admin/ResolveDisputeModal.tsx` (rewritten) â€” Replaced two dropdowns (resolvedStatus + payoutStatus) with progressive radio-button steps: Step 1 cancel/re-post, Step 2 refund/pay/split (hidden until Step 1 chosen, split shows NPR amount inputs), Step 3 note textarea; maps to `ResolveJobInput` (`resolvedStatus`, `note`, `payoutStatus: "paid"` for split since resolve endpoint is unmodifiable).
- `src/app/(admin)/admin/disputes/page.tsx` â€” Fixed "Chat Transcript Snippet" `useQuery`: changed from plain `fetch` on the participant-gated `/api/jobs/{id}/messages` endpoint (returns 403 for admin) to `apiFetch` on the admin-only `/api/jobs/{id}/admin-message` endpoint (no `recipientId` param to fetch all job messages); added `apiFetch` import and `CHAT_TRANSCRIPT_LOAD_ERROR` constant.

### API Routes
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/jobs/[id]/admin-message` | `withRole(["admin"])` | Fetch all messages for a job (no participant check) or filter by `?recipientId=` for adminâ†”recipient conversations |
| POST | `/api/jobs/[id]/admin-message` | `withRole(["admin"])` | Send message from admin to a participant; validates recipient via `assertRecipientIsParticipant`, triggers Pusher `new-message` event |

### Key Decisions
- **Admin message view is separate from participant messaging**: The standard `/api/jobs/[id]/messages` route is guarded by `assertParticipant()` which returns 403 for admin users. The new `/api/jobs/[id]/admin-message` route bypasses this check, allowing admin to audit all messages and initiate admin-to-user conversations.
- **Pusher real-time via refetch, not cache mutation**: The AdminMessagePanel receives `new-message` Pusher events but cannot reliably determine which tab a message belongs to (the regular messages endpoint doesn't include `recipientId` in its payload). Instead of risking cache corruption, the panel triggers `refetchMessages()` only when `senderId !== adminUserId`, letting the admin-message endpoint's proper filtering handle correctness.
- **Chat Transcript Snippet uses admin-message endpoint without `recipientId`**: Calling `GET /api/jobs/{id}/admin-message` without a `recipientId` returns all messages for the job (`query = { jobId }`), which is the full poster-driver conversation needed for the audit transcript.

### Build Verification
- `npx tsc --noEmit` â€” 0 errors
- `npx eslint` on all new and modified files â€” 0 errors, 0 warnings

---

## Aug 30 â€” Change Password + Settings/Header UI Cleanup (FEATURE-22 + FEATURE-23)

### New Files
- `src/app/api/auth/change-password/route.ts` â€” `POST /api/auth/change-password`. `withAuth` guard. Zod validates `currentPassword` (min 1) + `newPassword` (min 8). Returns 400 "Password change is not available for Google-linked accounts" when `User.passwordHash` is null. Returns 400 "Current password is incorrect" when `bcrypt.compare` fails. Hashes with `bcrypt.hash(password, 10)` and saves. Returns 200 `{ message }`.
- `src/types/auth/auth.ts` â€” Added `ChangePasswordPayload` (`{ currentPassword, newPassword }`) and `ChangePasswordResponse` (`{ message }`).
- `src/components/profile/ProfileSidebar.tsx` â€” Dark sidebar (`bg-[#0f1117]`), "Profile" heading, two nav items (Edit Profile + Change Password) with blue filled pill for the active state. *Deleted in FEATURE-23 cleanup.*
- `src/components/profile/ChangePasswordForm.tsx` â€” `react-hook-form` + `@hookform/resolvers/zod` with cross-field `.refine` for confirm-matches. Three password fields with independent eye toggles. Server errors mapped inline: "Current password is incorrect" â†’ `setError("currentPassword", ...)`; others â†’ inline `serverError` box. Success: hook's `onSuccess` toasts + `reset()`.
- `src/components/profile/SettingsPageContent.tsx` â€” Shared client wrapper rendering `ProfileSidebar` + `ChangePasswordForm` card (`bg-[#1a1d27] rounded-2xl p-8`).
- `src/app/(dashboard)/settings/page.tsx` + `src/app/(admin)/admin/settings/page.tsx` â€” Server components that check `passwordHash` server-side (via `verifyAccessToken` + DB query) and pass `hasPassword: boolean` to the shared `SettingsPageContent`.

### Modified Files
- `src/app/(dashboard)/layout.tsx` + `src/components/admin/AdminSidebar.tsx` â€” Added Logout button below the profile card; calls `logoutUser()` (clears JWT cookies) then `signOut({ redirect: true, callbackUrl: '/login' })`.
- `src/components/admin/AdminSidebar.tsx` â€” Updated Settings link from `/settings` to `/admin/settings` so admin stays in admin layout.
- `src/api/apis/auth/authApi.ts` â€” Added `changePassword(data)` plain async function via the axios instance.
- `src/api/hooks/auth/authApi.ts` â€” Added `useChangePassword()` mutation â€” success invalidates `['me']` query + toasts.

### Architectural Decisions
- **OAuth-only check is server-side only**: `GET /api/auth/me` excludes `passwordHash` from its response (`select("-passwordHash -refreshTokenHash")`), so client-side `useAuth()` cannot determine whether a user has a password. The settings pages are server components that verify the JWT, query `User.findById` directly for `passwordHash`, and pass `hasPassword: boolean` to the shared client component. The API route is the definitive guard â€” returns 400 if `passwordHash` is null. (D-50.)
- **Logout uses `logoutUser()` + `signOut()`**: The app's auth state is entirely driven by the JWT cookies read by `/api/auth/me`, so clearing those cookies via `logoutUser()` is what fully logs the user out; `signOut()` handles the NextAuth session cleanup + redirect. Using only `signOut()` would leave the JWT cookies intact. (D-50.)
- **One icon library**: Material Symbols Outlined used exclusively (no Lucide) â€” AGENS rule.
- **Settings page styling fixed to light theme in FEATURE-23**: Removed `ProfileSidebar` entirely, centered the page container (`max-w-2xl mx-auto px-4 py-8`), changed card styles to light (`bg-surface-white border border-outline-variant`); `ChangePasswordForm` inputs use `bg-surface-white`; submit button is `bg-primary hover:bg-primary/90 text-on-primary`.
- **Header cleanup in FEATURE-23**: Removed repetitive profile badge from dashboard top bar; moved Settings, FAQ, Support, Logout out of sidebars to top headers; unified driver/poster mobile top app bar into a layout-wide top header on desktop; restored/styled the notification icon button in the dashboard layout; updated Support icon from `contact_support` to `support_agent` in both admin and dashboard headers to avoid duplicate question mark icons.

### Build Verification
- `npx tsc --noEmit` â€” 0 errors
- `npx eslint` â€” 0 errors on changed files
- `npm run build` â€” 58 pages, 0 errors

---

## Sep 1 â€” Notification Inbox + Payout Receipt + Theme System + Edit Profile (FEATURE-24/25/26/27)

### Notification Inbox + Bell Dropdown (FEATURE-24)

#### New Files
- `src/types/notification/notification.ts` â€” types + response shapes.
- `src/models/Notification.ts` â€” Mongoose model `{ _id, userId, type, message, link, readAt, createdAt, updatedAt }` with indexes on `(userId, createdAt desc)` and `(userId, readAt)`. HMR guard.
- `src/app/api/notifications/route.ts` â€” `GET /api/notifications?page=&limit=&unreadOnly=` â€” paginated, returns `unreadCount`.
- `src/app/api/notifications/[id]/read/route.ts` â€” `PATCH` user-scoped, sets `readAt`. Wraps `withAuth` to inject the dynamic route context (pattern matches `/api/jobs/[id]/messages/read/route.ts`).
- `src/app/api/notifications/read-all/route.ts` â€” `PATCH` bulk mark-read.
- `src/api/apis/notifications/notificationsApi.ts` + `src/api/hooks/notifications/notificationsApi.ts` â€” TanStack Query hooks (`useNotifications`, `useMarkNotificationRead`, `useMarkAllNotificationsRead`).
- `src/components/ui/NotificationsPanel.tsx` â€” Bell dropdown with unread badge, mark-read on item click, "Mark all as read", empty state, ESC + click-outside close.

#### Modified Files
- `src/lib/notify.ts` â€” Extended to persist a `Notification` row before triggering Pusher. Errors are logged and non-fatal so a DB write failure does not break the Pusher fanout.
- `src/components/admin/AdminHeader.tsx` + `src/app/(dashboard)/layout.tsx` â€” Wired the bell button: `useState` for open, `useNotificationsBellState()` for unread count, renders `<NotificationsPanel />` below the bell.

#### Architectural Decisions
- **Single entry point for `private-user-{userId}` events**: All in-app notifications go through `notifyUser()` â€” it persists a `Notification` row first, then triggers Pusher. Both the bell inbox and the transient toast are produced by the same call. (D-58.)
- **`Notification.link` is in the schema but no caller wrote it yet** â€” first populated in FEATURE-33.

### Payout Receipt Modal (FEATURE-25)
- `src/components/admin/PayoutReceiptModal.tsx` â€” New component, 230 lines, with named constants at module level (per AGENTS rule) and the same modal pattern as `PayoutOverrideModal`. Read-only: amount + status badge, driver name + email, job ID, platform fee, gateway (eSewa/Khalti), transaction ID with copy-to-clipboard, paid/created timestamps, notes. Renders nothing unless `payout && isOpen` (no flicker). ESC + click-outside close. Reuses `formatNpr`.
- `src/app/(admin)/admin/payouts/page.tsx` â€” Wired "View Receipt" `onClick` (was a dead stub).

### Global Theme System (FEATURE-26)
- `src/app/globals.css` â€” Added `[data-theme="dark"]` block with dark tokens for every `--color-*`; added `--color-success` and `--color-warning` semantic tokens.
- `src/store/themeStore.ts` â€” Zustand store (`theme`, `initTheme()`, `toggleTheme()`, `setTheme()`). Initial state always `"light"`. `localStorage`/`document` access only inside actions.
- `src/components/providers/ThemeInitializer.tsx` â€” Mounts `initTheme()` in `useEffect`.
- `src/components/ui/ThemeToggle.tsx` â€” Material Symbols `light_mode` / `dark_mode` (no new icon library; per AGENTS Hard Ban).
- `src/app/layout.tsx` â€” `<html suppressHydrationWarning>`, moved flash script to first child of `<body>`, mounted `<ThemeInitializer />`.
- `src/app/(dashboard)/layout.tsx` + `src/components/admin/AdminHeader.tsx` â€” Inserted `<ThemeToggle />` between the notifications bell and the logout button.
- Hex sweep on `(admin)/layout.tsx`, `ChatPanel.tsx`, `(dashboard)/dashboard/page.tsx`, `landing/LandingPage.tsx`, `landing/HeroSection.tsx`, `landing/FeaturesSection.tsx`.

#### Architectural Decisions
- **No new dependencies** â€” Existing `zustand` (5.x) handles the state. `globals.css` already had `--color-*` tokens for every UI element.
- **SSR flash prevention**: small inline script in `<body>` (first child) reads `localStorage` and sets `document.documentElement.dataset.theme` before React hydrates. Moved from `<head>` (where it triggered `Router action dispatched before initialization`).
- **Initial state is always `"light"` on the server** â€” no `localStorage`/`document` access at init. `initTheme()` action reads `localStorage` and applies the `data-theme` attribute.

### Edit Profile Tab (FEATURE-27)
- `src/models/User.ts` â€” Added `profilePhotoUrl`, `preferredLanguage` (enum `en`/`ne`), `defaultPickupAddress`. `phone` already existed.
- `src/models/DriverProfile.ts` â€” Added `operatingZone`.
- `src/types/profile/profile.ts` â€” Zod schemas per role, Nepal phone regex `^(98|97|96)\d{8}$`, base + poster + driver + admin.
- `src/app/api/profile/route.ts` â€” `GET` (returns editable fields, never `passwordHash`/`refreshTokenHash`); `PATCH` (server-side role enforcement, ignores disallowed fields). Driver PATCH updates both `User` and `DriverProfile`.
- `src/api/apis/profile/profileApi.ts` + `src/api/hooks/profile/profileApi.ts` â€” PLMS layer.
- `src/app/api/uploads/profile-photo-sign/route.ts` â€” New signed upload endpoint for profile photos (the existing `/uploads/sign` is locked to driver verification documents).
- `src/components/profile/EditProfileForm.tsx` â€” Single component with a `role` prop, dispatches to `PosterForm` / `DriverForm` / `AdminForm`. Avatar uploader, locked email field, role-aware fields, skeleton loader, success/error toasts via sonner.
- `src/components/profile/SettingsPageContent.tsx` â€” Refactored to two-tab header (Material Symbols `person` / `lock`), blue filled pill on active, default Edit Profile tab.

#### Architectural Decisions
- **Role-specific forms** instead of a union-typed `useForm` (RHF's `Path<T>` inference fights union types, so role-specific forms are clearer).
- **`defaultPickupAddress` is currently a free-text string** â€” future enhancement could integrate it with the address picker used on the post-job form.

### BUG-10 â€” Payout `paidAt` Backfill
- `scripts/backfill-payout-paidAt.mjs` â€” Standalone Node ESM script (no new npm deps, uses the project's existing `mongoose` + manual `.env.local` parsing with `fs`). Connects to MongoDB, finds Payout documents where `status="paid"` and `paidAt` is null, runs an aggregation-pipeline `updateMany` via the raw `collection.updateMany` driver call (Mongoose 9 wrapper requires an explicit opt-in for pipeline updates). Sets `paidAt = $createdAt`. Idempotent.
- Ran: `Found 10 paid payouts missing paidAt. Backfilled 10 payout document(s) (paidAt = createdAt). Done.`
- Re-running finds 0 rows to update.

### Build Verification (Sep 1)
- `npx tsc --noEmit` â€” 0 errors
- `npx eslint` â€” 0 errors on changed files (one pre-existing `setState-in-effect` warning in `LandingPage.tsx`)
- `npm run build` â€” clean

---

## Sep 2 â€” SEO, Public Poster Profile, Idempotent Verify, Analytics/Billing Unification (FEATURE-28â€“32 + BUG-11â€“22 + D-55â€“57)

### SEO & Discoverability Setup (FEATURE-28)
- `src/app/sitemap.ts` â€” `MetadataRoute.Sitemap` default export listing `/`, `/login`, `/register` with `lastModified`/`changeFrequency`/`priority`. `SITE_URL` reads from `process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"`. No authenticated routes included.
- `src/app/layout.tsx` â€” Added `metadataBase` (also env-driven) and a full `openGraph` block (title, description, url, siteName="SwiftShip", images array pointing to `/images/og-image.png` with 1200Ã—630 + alt, locale, type).
- `public/images/og-image.png` â€” Valid 1200Ã—630 PNG placeholder (3,632 bytes, solid `#0D121C` background). Generated with a one-shot Node script using `zlib.deflateSync` â€” no new npm dep.
- `public/llms.txt` â€” Plain-text description of SwiftShip, the three user roles (poster, driver, admin), and the three public routes.
- `.env.local` â€” Added `NEXT_PUBLIC_SITE_URL=https://delivery-pied-eight.vercel.app` (gitignored, never committed).

#### Architectural Decisions
- All three URL fields (`metadataBase`, `openGraph.url`, sitemap `SITE_URL`) read from the same env var. The initial implementation hardcoded the URL in three places; user flagged and asked to read from the env var â€” fixed in the same commit.
- Only public routes are exposed; all authenticated routes (`/poster/*`, `/driver/*`, `/admin/*`, `/api/*`) are deliberately excluded.

### Sidebar Profile Links (FEATURE-29)
- `src/app/(dashboard)/layout.tsx` â€” Extracted `ProfileBlockContent` component (per AGENTS no-inline-JSX rule). Added `profileHref` memo (driver â†’ `/drivers/[userId]`, poster â†’ `/posters/[userId]`, admin â†’ `/admin/settings`). Wrapped the block in `<Link>` with hover styling.
- `src/components/admin/AdminSidebar.tsx` â€” Wrapped the bottom block in `<Link href="/admin/settings">` with `aria-label="Open admin profile"`. Visual layout unchanged.

### Public Poster Profile (FEATURE-30)
- `src/app/api/users/[id]/route.ts` (new) â€” `GET /api/users/[id]` `withAuth`-gated (any authenticated user can view). Returns `{ user, totalJobsPosted, averageRatingGiven }`. Safe field projection (no `passwordHash`/`refreshTokenHash`/`oauthId`). `totalJobsPosted` is `Job.countDocuments({ posterId: id })`. `averageRatingGiven` is `Rating.aggregate({ fromUserId: id })`.
- `src/app/(dashboard)/posters/[id]/page.tsx` (new) â€” Public poster profile mirroring the driver profile's 12-col bento: hero card with name, `PST-XXXX` short ID, member-since year, "Poster" badge, total jobs posted, average rating given; KPI banner; about card. Drivers are redirected to `/dashboard`.
- PLMS: `src/types/users/publicProfile.ts`, `src/api/apis/users/userPublicProfileApi.ts`, `src/api/hooks/users/userPublicProfileApi.ts`. `useUserPublicProfile(userId | null)` is enabled only when `userId` is truthy, with `retry: false`.

### PaymentTransaction posterId + Idempotent Verify (FEATURE-31 / BUG-11)
- `src/models/PaymentTransaction.ts` â€” Added optional `posterId?: Types.ObjectId` (ref "User", `required: false`, `default: null`) and compound index `{posterId: 1, processedAt: -1}` for the history query. Existing documents unaffected.
- Both verify routes (`/api/payments/khalti/verify`, `/api/payments/esewa/verify`) reordered: `PaymentTransaction.create()` first (idempotency anchor via unique `{gateway, transactionId}`), then `Payout.create()`, then `job.paymentStatus = "paid"; job.save()`. Each step wrapped in a try/catch that redirects to the failure URL on error (never returns JSON on a GET). MongoDB code 11000 on `PaymentTransaction.create()` is treated as already-processed and redirects to the success URL. The `posterId: job.posterId` is now wired into the `PaymentTransaction.create()` call.
- Resolves the TOCTOU window flagged in D-31 â€” the unique index is now the actual arbiter. (D-56.)

### Analytics & Billing Source-of-Truth Alignment (FEATURE-32 / BUG-12)
- `GET /api/payments/history?page=&limit=&aggregate=true` â€” `withAuth`, paginated (default page 1, limit 20, max 100), filters by `new Types.ObjectId(user.userId)`, sorts by `processedAt: -1`, populates `jobId` with `pickupAddress, dropoffAddress, offeredPrice, paymentStatus, paymentGateway`. `?aggregate=true` mode returns `{ totalAmount, total }` (sum + count across all transactions).
- PLMS: `src/types/payments/paymentHistory.ts`, `src/api/apis/payments/paymentHistoryApi.ts`, `src/api/hooks/payments/paymentHistoryApi.ts`. Hooks: `usePaymentHistory({ page, limit, enabled })`, `usePaymentHistoryAggregate(enabled)`.
- Consumers: Analytics `Total Spent` card â†’ `usePaymentHistoryAggregate()`; Billing `Total Spent` card + spending-trend `AreaChart` + table â†’ `usePaymentHistory({ page: 1, limit: 50 })`; Poster History Payments tab â†’ `usePaymentHistory({ page: 1, limit: 20 })`; Driver history is untouched (uses `useDriverPayouts` against the `Payout` collection).

#### Architectural Decisions
- **Always cast string IDs from the JWT before using them in MongoDB filters.** (D-55.) The `/api/payments/history` filter was `{ posterId: user.userId }` (plain string) but `PaymentTransaction.posterId` is an `ObjectId` â€” BSON type mismatch returned 0 rows. One-line fix: `new Types.ObjectId(user.userId)`.

### BUG-20 â€” `/api/payments/history` Filter Mismatch
- **Symptom**: Billing page showed 0 records; Analytics Total Spent showed whatever `Job.aggregate` over delivered jobs returned (NPR 2,516), instead of the real PaymentTransaction total (NPR 681).
- **Root cause**: `src/app/api/payments/history/route.ts` filtered by `{ posterId: user.userId }` (string from JWT) but `PaymentTransaction.posterId` is a Mongo `ObjectId`. BSON type comparison returns 0 rows.
- **Fix**: One-line change: `new Types.ObjectId(user.userId)`. (D-55.)

### BUG-21 â€” Driver Dashboard Recent Activity Empty
- **Symptom**: Driver dashboard "Recent Activity" was empty despite a delivered job existing.
- **Root cause**: `src/app/(dashboard)/driver/dashboard/page.tsx:86` called `useMyJobs({ page: 1, limit: PAGE_SIZE })` with no `driverId` param. In `GET /api/jobs â†’ buildRoleScopedFilter`, a driver with no `driverId` param falls into the `else` branch (line 47) which sets `filter.status = JOB_STATUS.POSTED` â€” i.e. the open-jobs pool, not the driver's own jobs.
- **Fix**: Add `driverId: "me"` to the `useMyJobs` call.

### BUG-22 â€” Driver Column "Unassigned" (Two Bugs in One)
- **Symptom**: Poster dashboard "Recent Deliveries" table showed "Unassigned" for every row, including delivered jobs with a real driver.
- **Root cause (two parts)**:
  1. **Populate chained after `.lean()`** â€” `Job.find()` was followed by `.lean()` before `.populate("driverId", "name")`. Mongoose silently ignores `.populate()` when chained after `.lean()` (lean returns plain JS objects, bypassing the query-level populate step).
  2. **Frontend reading the wrong field** â€” render at `src/app/(dashboard)/dashboard/page.tsx:200` read `job.driver?.name`. The Job schema has `driverId`, not `driver`. Even after fixing the populate order, the render would still see `undefined` and fall through to "Unassigned". The `Job` type had a speculative `driver?: { name?: string }` augmentation that referenced a field that never existed on the schema.
- **Fix**:
  - API: `src/app/api/jobs/route.ts` â€” moved `.populate("driverId", "name")` to immediately after `.find(filter)` (before `.lean()`). Correct order: `.find().populate().sort().skip().limit().lean()`.
  - Type: `Job.driverId` is now `string | { _id: string; name: string } | null` to reflect the populated shape. Dropped the speculative `driver?` augmentation on `MyJobsResponse.jobs`.
  - API client: removed the dead `job.driver ?? undefined` post-`.map()` remap in `fetchMyJobs`.
  - Render: `src/app/(dashboard)/dashboard/page.tsx` â€” `typeof job.driverId === "object" && job.driverId !== null ? job.driverId.name : "Unassigned"`. The typeof guard handles all three shapes (populated, null, un-populated string).

### Additional Driver-Side Fixes (Sep 2)
- **Driver earnings time-range dropdown** â€” `src/app/(dashboard)/driver/earnings/page.tsx`: 7d/30d/90d/all selector with chart bucketing.
- **Driver verification gate on Accept** â€” `src/app/(dashboard)/jobs/browse/page.tsx` and `src/app/(dashboard)/jobs/[id]/page.tsx`: disabled Accept button when `DRIVER_PROFILE_STATUS.APPROVED` not met (tooltip + `aria-disabled` + `preventDefault`).
- `getDriverIdString(driverId)` helper pattern in `PosterHistory.tsx` + `PosterTrackingList.tsx` â€” returns `null | string`, used for `.slice(-6).toUpperCase()` short-ID formatting.
- `ProfileBlockContent` extracted to satisfy AGENTS no-inline-JSX rule (extended with optional `compact` prop in the Sep 3 mobile pass).

### Build Verification (Sep 2)
- `npx tsc --noEmit` â€” 0 errors
- `npx eslint` â€” 0 errors on all changed files
- Commit `845a23c` â€” `feat(dashboard,payments,profiles): unify total spent, public poster profile, sidebar links, idempotent verify, and driver gate` (37 files, 1560 ins / 377 del). NOT PUSHED.

---

## Sep 3 â€” Mobile Responsiveness + Footer + 9 Notification Triggers (FEATURE-33 + BUG-23â€“25 + D-58)

### Mobile Responsiveness (Driver/Poster + Admin Layouts)
Built across 8 turns in this session; the user explicitly said no commit / no push at the end.

**(A) Driver/Poster mobile sidebar** â€” Added hamburger button (`md:hidden`) to the dashboard top app bar and a slide-in `<aside>` overlay mirroring `AdminSidebar`'s pattern: `fixed top-0 bottom-0 left-0 z-50 w-64 â€¦ transition-transform` with `translate-x-0` / `-translate-x-full` toggle, `bg-black/50` backdrop, close X button in the header, the poster-only "New Shipment" CTA, the same `NAV_LINKS` filtered by `visibleNavLinks`, and the profile footer. The existing desktop `<nav className="hidden md:flex â€¦">` and the bottom `<nav className="md:hidden â€¦">` are untouched. Local `useState` only (no Zustand store).

**(B) Driver/Poster top-bar icon reduction** â€” Settings, FAQ, Support all moved to `hidden md:flex`. Logout moved to `hidden md:flex` and a new red-tinted Logout button was added to the mobile slide-in sidebar's profile footer (closes the menu + calls `handleLogout`). Admin header right-group gap reduced from `gap-2 md:gap-3` to `gap-1.5 md:gap-3` to give the visible icons more breathing room. The admin top bar also lost FAQ/Support/Settings/Logout on mobile (all moved into a new `UTILITY_LINKS` block + Logout button inside `AdminSidebar.tsx` â€” the new mobile-only utility section is `md:hidden`, so desktop is unchanged).

**(C) Admin bottom nav** â€” Added a fixed `md:hidden` bottom nav to `src/app/(admin)/layout.tsx` with 4 items (Dashboard `grid_view`, Jobs `work`, Disputes `shield`, Users `people`) using `usePathname()` for the active state, exact same `fixed bottom-0 left-0 w-full z-50 flex md:hidden justify-around items-center px-4 py-2 pb-[env(safe-area-inset-bottom)]` structure as the driver/poster bottom nav. `<main>` padding changed from `p-4 md:p-8` to `p-4 pb-20 md:p-8 md:pb-8` so content doesn't hide behind the bottom nav on mobile.

**(D) Mobile sidebar declutter + ProfileBlockContent compact prop** â€” Compact header `py-3 px-4`, absolute `top-3 right-3` X button, denser nav items `py-2.5`, "More" section moved inside `<ul>` as divider `<li>`, profile footer pinned with `border-t border-surface-variant py-3 px-4 mt-auto shrink-0`. `ProfileBlockContent` extended with optional `compact` prop (h-8 w-8 avatar, `flex flex-col gap-0` inner column, `text-xs` role badge â€” desktop unchanged).

**(E) Post Job bottom-nav alignment** â€” Container `w-16` â†’ `flex-1` with `gap-1` + `text-center` (other 3 nav items untouched).

**(F) Admin Platform Growth chart** â€” Wrapper `overflow-hidden w-full min-w-0`, day label `text-[9px] sm:text-[11px]`, gap reduced.

**(G) Landing page role tabs** â€” `overflow-x-auto max-w-full` + `whitespace-nowrap` per button.

**(H) Tables** â€” Every `<table>` (PosterHistory, DriverHistory, AdminHistory, Billing Ã—2) wrapped in `<div className="overflow-x-auto">`.

**(I) Safe area** â€” Bottom-nav `pb-[env(safe-area-inset-bottom)]` added.

### Footer Copy Fix
- `src/components/layout/Footer.tsx` â€” Columns renamed to Platform/Support/Legal. `For Posters`/`For Drivers` â†’ `/register`, `How it Works` â†’ `/#how-it-works` (anchors `id="how-it-works"` in `FeaturesSection.tsx:13`). `FAQ` â†’ `/faq`, rest â†’ `#`. Social icons removed. "Â© 2024 SwiftShip Logistics Inc." â†’ "Â© 2026 SwiftShip." (both mobile and desktop brand blocks).

### In-App Notification Triggers (FEATURE-33 / D-58)
Wire the 9 API routes that produce user-visible state changes to the existing `notifyUser()` so the bell inbox + transient toast actually fire. No new API routes, no new model fields, no new Pusher channels. Per the field guide, all call sites use `void notifyUser(...)` (fire-and-forget; `notifyUser` already has its own try/catch around the DB persist and Pusher trigger). Per user instruction: doc-only update, no commit, no push.

#### `notifyUser(userId, message, type, { link })` from `src/lib/notify.ts`
- Persists a `Notification` row first (DB-level idempotency on `_id`), then triggers Pusher `notification` on `private-user-{userId}`.
- Both the bell inbox (via `GET /api/notifications`) and the transient toast (via `NotificationProvider`) are produced by the same call.

#### 9 Call Sites
| # | Route | Triggers | Type | Link |
|---|-------|----------|------|------|
| 1 | `PATCH /api/admin/jobs/[id]/resolve` | poster + driver (dispute outcome); driver if `payoutStatus === "paid"`; driver if `payoutStatus === "failed"` | `info` / `success` / `error` | `/jobs/{id}` / `/driver/payouts` |
| 2 | `POST /api/jobs/[id]/accept` | poster | `success` "A driver has accepted your job." | `/jobs/{id}` |
| 3 | `POST /api/jobs/[id]/deliver` | poster | `success` "Your delivery has been marked as delivered." | `/jobs/{id}` |
| 4 | `POST /api/jobs/[id]/transit` | poster | `info` "Your delivery is now in transit." | `/jobs/{id}` |
| 5 | `GET /api/payments/khalti/verify` | success: poster + driver; 3 failure branches: poster (Expired / User-canceled / Refunded) | `success` / `info` / `error` | `/jobs/{id}` / `/driver/payouts` |
| 6 | `GET /api/payments/esewa/verify` | success: poster + driver; 2 failure branches: poster (FAILED / AMBIGUOUS) | `success` / `info` / `error` | `/jobs/{id}` / `/driver/payouts` |
| 8 | `POST /api/jobs/[id]/messages` | recipient (other participant) | `info` "New message from {senderName} on your delivery." | `/jobs/{jobId}` |
| 9 | `POST /api/jobs/[id]/admin-message` | recipient | `info` "You have a new message from an admin regarding your delivery." | `/jobs/{jobId}` |
| 11 | `PATCH /api/admin/payouts/[id]` | driver | `success` "Your payout of NPR {amount} has been paid." / `error` "â€¦was marked as failed." | `/driver/payouts` |

#### Architectural Decisions
- **All in-app user notifications route through `notifyUser()`** (D-58). Every route that produces a user-visible state change MUST call `notifyUser(userId, message, type, { link })` rather than calling `pusherServer.trigger("private-user-...")` directly. Funneling everything through `notifyUser` makes it impossible to ship a route that updates the toast but forgets the inbox (or vice versa) â€” both come from the same code path.
- **Type semantics** â€” `success` for positive events (delivery complete, payment received, payout paid), `info` for state changes (transit, accept, message, dispute outcome, payout initiated), `error` for failures (payment failed/cancelled/refunded, payout failed).
- **Link semantics** â€” every call passes `{ link }` so the bell inbox item is a real deep-link: `/jobs/{id}` for state changes, `/driver/payouts` for payout events. `Notification.link` was added in FEATURE-24 but no caller wrote it; this is the first feature to actually populate it.
- **Fire-and-forget** â€” all call sites use `void notifyUser(...)`. The field guide says "Fire-and-forget is the established pattern for non-critical side effects â€” never block a live response on them, and always .catch()." `notifyUser` already has its own try/catch around `Notification.create` and `pusherServer.trigger`, so an external `.catch()` would be dead code. Using `void` is the most accurate way to express "we deliberately don't await this" and satisfies ESLint's `no-floating-promises` rule.

#### Tradeoff Accepted
A single `notifyUser` call produces one Pusher event and one DB write. If a user is offline, the Pusher event is dropped (the provider doesn't queue), but the `Notification` row persists and the bell inbox shows the message on the next page load. That's the right tradeoff for a non-critical side effect â€” the alternative (durable Pusher queueing) is out of scope and would require a separate worker.

#### Linked Rule (Add to AGENTS.md on Next Edit)
"Any API route that produces a user-visible state change MUST call `notifyUser` for every affected user. The only exception is routes that write to a real-time channel the user is already subscribed to (e.g. `messages/route.ts` writes to `private-job-{jobId}` for both participants). A separate `notifyUser` for those would be redundant noise on a different device."

### BUG-23 â€” Bell Inbox Never Fires on Real State Changes
- **Symptom**: After shipping FEATURE-24 (persisted `Notification` model + bell inbox panel + Pusher channel), the bell badge stayed at 0 for every user. `useNotificationsBellState` polled the right endpoint, but no `Notification` rows were ever created.
- **Root cause**: `src/lib/notify.ts` was extended in FEATURE-24 to persist a `Notification` row before triggering Pusher, but the function was never called from any business-logic route.
- **Fix**: 9 `void notifyUser(...)` call sites across the routes that produce user-visible state changes. (See FEATURE-33 above.)

### BUG-24 â€” Admin Dispute Resolve Didn't Notify Driver/Poster on Outcome
- **Symptom**: When an admin resolved a dispute, the job status was updated, the resolution note was saved, and the (optional) payout status was changed. But neither the poster nor the driver received any in-app signal.
- **Root cause**: `src/app/api/admin/jobs/[id]/resolve/route.ts` performed the DB writes but never called `notifyUser`.
- **Fix**: 3 `void notifyUser(...)` calls in the resolve handler: poster (always, dispute outcome); driver (if assigned, dispute outcome); driver (if assigned, payout status â€” `paid` or `failed`).

### BUG-25 â€” Khalti/eSewa Verify Never Notified the Poster on Payment Failure
- **Symptom**: When a Khalti payment expired (or was cancelled/refunded) or an eSewa payment returned `FAILED`/`AMBIGUOUS`, the verify route set `job.paymentStatus = "failed"` and redirected to the failure URL. The poster saw the failure page once, but received no persistent in-app signal.
- **Root cause**: Both verify routes' failure branches were silent in-app (no `notifyUser`, no Pusher trigger). The success branches were also silent.
- **Fix**: Added `void notifyUser(...)` to all 5 failure branches and to the 2 success branches in each verify route. All messages link to `/jobs/{id}` (so the bell inbox item deep-links to the job where the poster can retry). The driver success notification includes the actual NPR amount (`Math.round(offeredPrice * DRIVER_PAYOUT_PERCENTAGE)`).

### Build Verification (Sep 3)
- `npx tsc --noEmit` â€” 0 errors
- `npx eslint` â€” 0 errors on all changed files (one pre-existing LandingPage `setState-in-effect` warning unrelated to this session)
- No regression to existing test surface: driver-accept 409 race-guard still works, verify routes still idempotent on MongoDB code 11000, admin override endpoint still pending-only with note.
- 9 route files + 12 mobile/footer files remain unstaged per the user's "no commit, no push" instruction.

---

## Day 68 â€” Driver UI Improvements & Error Page Cleanup

### New Features

**Admin Panel nav link in Header**
- `src/components/layout/Header.tsx`: Added `isAdmin` variable from `user?.role === "admin"`. Admin users now see an "Admin Panel" link (`/admin`) in the desktop CTA block (after Post a Job for posters) and in the mobile menu drawer (after How it Works). Post a Job button remains correctly gated to posters only â€” drivers never see it.

**Role-aware History page ACTIONS column**
- `src/app/(dashboard)/history/page.tsx`: The ACTIONS column in the Jobs tab is now role-aware:
  - **Drivers:** Details link (`/jobs/[id]`), Chat button (`/jobs/[id]#chat`), Dispute button (`/jobs/[id]#dispute`) â€” Dispute only appears when job status is `delivered` or `completed`. No Pay button or location-pin icon.
  - **Posters:** Unchanged â€” Rate, Pay, Chat, Track, Dispute buttons.
- Added `userRole` field to `JobsTableRow` interface, populated from `user?.role`.
- Replaced hardcoded status strings with `JOB_STATUS` enum constants.

**Driver-perspective payout labels in History Payments tab**
- `PaymentStatusBadge` component now accepts an `isDriver` prop. When the user is a driver and the payout status is `paid`, the badge renders "Received" (green) instead of "Paid".
- "Total Paid" summary label â†’ "Total Earned" when `user?.role === "driver"`.
- Pending and Failed badges remain unchanged for all roles.
- Added `isDriver` field to `PaymentRecord` interface.

**Verification document badges propagate approved status**
- `src/app/(dashboard)/driver/verification/page.tsx`: `StatusBadge` component now accepts an `isApproved` prop. When the driver's `verificationStatus === "approved"`, all four document section badges (Driver's Licence, Government ID, Vehicle Insurance, Background Check) render green "Verified" instead of incorrectly showing "Pending".
- The `isApproved` check is the first condition in the badge, before Pending/Uploaded/Not Started logic.

### Bug Fixes

**BUG-10 â€” Verification document badges show "Pending" when approved**
- Root cause: `StatusBadge` checked `isPending && isReady` before checking `isApproved`. Since `isPending` was mapped to `isLocked` (= `isPending || isApproved`), the Pending condition matched for approved drivers.
- Fix: Added `isApproved` prop, checked first with green "Verified" badge.

**Sidebar removal from error pages**
- Removed inline left sidebar from both `src/app/not-found.tsx` (404 page) and `src/app/error.tsx` (global error boundary). Pages now use a compact top header with brand logo + auth-aware profile/login avatar, full-width content area.
- Cleaned up unused code: `NAV_ITEMS` constants, `formatRoleLabel` function, `roleLabel` variable, mobile menu state/handlers.

**Browse Jobs in dashboard sidebar**
- `src/app/(dashboard)/layout.tsx`: Removed `md:hidden` from the "Browse Jobs" sidebar link so it is visible on all screen sizes, not just mobile bottom nav. Updated the active state check to use the shared `isActive()` helper.

### Build Verification
- tsc --noEmit: 0 errors
- npm run build: 56 pages, 0 errors, 0 warnings

---

## Day 69b â€” Admin Dispute Messaging Panel + ResolveDisputeModal Rewrite

### New Files
- `src/app/api/jobs/[id]/admin-message/route.ts` â€” Admin-only GET + POST route: `withRole(["admin"])` guards both handlers; GET fetches all job messages (or filters by recipientId via `$or` sender/recipient pairs) without a participant check â€” admin gets 403 on the standard `/messages` route; POST accepts `{ recipientId, content }`, validates recipient is job poster/driver via `assertRecipientIsParticipant`, saves to `Message` model, triggers `triggerJobEvent(jobId, "new-message", { messageId, senderId, senderName, recipientName, content, createdAt })` on `private-job-{jobId}` channel.

### Modified Files
- `src/components/admin/AdminMessagePanel.tsx` (created) â€” Client component with poster/driver tab interface: fetches messages from `/api/jobs/{jobId}/admin-message?recipientId={userId}&limit=50`, sends via POST to `/api/jobs/{jobId}/admin-message`, uses `useAuth()` for admin user ID, `apiFetch` for token-refresh handling, TanStack Query for caching with `invalidateQueries` on send; Pusher subscription to `private-job-{jobId}` channel for real-time incoming message refetches (skips self-authored via `senderId === adminUserId` check).
- `src/components/admin/ResolveDisputeModal.tsx` (rewritten) â€” Replaced two dropdowns (resolvedStatus + payoutStatus) with progressive radio-button steps: Step 1 cancel/re-post, Step 2 refund/pay/split (hidden until Step 1 chosen, split shows NPR amount inputs), Step 3 note textarea; maps to `ResolveJobInput` (`resolvedStatus`, `note`, `payoutStatus: "paid"` for split since resolve endpoint is unmodifiable).
- `src/app/(admin)/admin/disputes/page.tsx` â€” Fixed "Chat Transcript Snippet" `useQuery`: changed from plain `fetch` on the participant-gated `/api/jobs/{id}/messages` endpoint (returns 403 for admin) to `apiFetch` on the admin-only `/api/jobs/{id}/admin-message` endpoint (no `recipientId` param to fetch all job messages); added `apiFetch` import and `CHAT_TRANSCRIPT_LOAD_ERROR` constant.

### API Routes
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET | `/api/jobs/[id]/admin-message` | `withRole(["admin"])` | Fetch all messages for a job (no participant check) or filter by `?recipientId=` for adminâ†”recipient conversations |
| POST | `/api/jobs/[id]/admin-message` | `withRole(["admin"])` | Send message from admin to a participant; validates recipient via `assertRecipientIsParticipant`, triggers Pusher `new-message` event |

### Key Decisions
- **Admin message view is separate from participant messaging**: The standard `/api/jobs/[id]/messages` route is guarded by `assertParticipant()` which returns 403 for admin users. The new `/api/jobs/[id]/admin-message` route bypasses this check, allowing admin to audit all messages and initiate admin-to-user conversations.
- **Pusher real-time via refetch, not cache mutation**: The AdminMessagePanel receives `new-message` Pusher events but cannot reliably determine which tab a message belongs to (the regular messages endpoint doesn't include `recipientId` in its payload). Instead of risking cache corruption, the panel triggers `refetchMessages()` only when `senderId !== adminUserId`, letting the admin-message endpoint's proper filtering handle correctness.
- **Chat Transcript Snippet uses admin-message endpoint without `recipientId`**: Calling `GET /api/jobs/{id}/admin-message` without a `recipientId` returns all messages for the job (`query = { jobId }`), which is the full poster-driver conversation needed for the audit transcript.

### Build Verification
- `npx tsc --noEmit` â€” 0 errors
- `npx eslint` on all new and modified files â€” 0 errors, 0 warnings



---

## Sep 3 — Admin Verification Tab Fix (FEATURE-34 + BUG-29)

### Problem Statement
The Admin Verification queue at /admin/verification had three related defects:

1. **Approved tab was empty** (BUG-29). The Total Approved stat card read 3, but the table rendered No approved applications found. Direct curl of GET /api/admin/verification?status=approved returned 500 with the body {success:false,error:Cannot read properties of null (reading _id)}.
2. **No way to revoke an approved driver or re-approve a rejected one** (the heart of FEATURE-34). The PATCH endpoint's filter was { _id, status: PENDING }, so the admin could only flip PENDING to APPROVED or REJECTED. A driver with an expired license, a vehicle deregistered, or fraud flags could not be downgraded. A driver rejected on first review who later resubmitted the correct documents had no path to re-evaluation without a manual Mongo write.
3. **Tab labels were unlabeled**. The stat cards already showed the counts (totalPending, totalApproved, totalRejected) but the three tabs were just text. The admin had to click into a tab to learn whether it had records.

### Root Cause of BUG-29
One DriverProfile document was an orphan — its userId reference was broken because the underlying User had been deleted:
- DriverProfile._id = 6a780a66c86df999c2ff48b9
- DriverProfile.userId = 6a731f7aa1af2dddbd5e (no matching User document)

countDocuments({ status: approved }) does not depend on userId, so it returned 3 (the orphan was counted). But .populate(userId, name email) returns null for an orphan, so profile.userId was null for that one record. The route then did user._id.toString(), which threw TypeError: Cannot read properties of null (reading _id). The catch block returned 500; TanStack Query's data became undefined; the component's (data?.data ?? []).map(...) produced []; the empty state rendered. Result: stat card said 3, table said nothing.

This is a useful architectural signal: the stat-card's count and the table's contents can disagree when one query populates a foreign reference and the other doesn't. The crash is silent in the stat card and loud in the table.

### Fix Summary
- **One-off data cleanup**: db.driverprofiles.deleteOne({ _id: ObjectId(6a780a66c86df999c2ff48b9) }) (run manually from the user's Mongo client — mongosh is not installed in this dev environment).
- **Null guard in GET /api/admin/verification**: profiles.filter((profile) => Boolean(profile.userId)) before mapping; safe mapper with user?._id ? user._id.toString() : unknown, user?.name ?? Unknown, user?.email ?? Unknown. Defense in depth — any future orphan is dropped before the mapper, and the mapper's fallbacks are belt-and-suspenders for the populate-failure case.
- **PATCH /api/admin/verification/[id] filter loosened** from { _id, status: PENDING } to { _id }. Status now comes from the request body, with no query-level restriction. Authorization still requires withRole([admin]) at the top of the handler.
- **totalRejected: number added** to AdminVerificationResponse and to the route's Promise.all (DriverProfile.countDocuments({ status: REJECTED })).
- **Tab counter badges** on Pending/Approved/Rejected tabs reading from data?.totalPending/Approved/Rejected; updates live on PATCH invalidation.
- **Per-tab Actions cell** in src/app/(admin)/admin/verification/page.tsx:
  - PENDING -> Approve (primary) + Reject (danger outline) — unchanged.
  - APPROVED -> Link to /drivers/{userId} with target=_blank rel=noreferrer rendered as a primary-bordered button with open_in_new Material Symbol icon, label View Profile + Revoke (with inline confirm + rejectionReason re-entry). Label is Revoke not Reject because the transition is approved -> rejected, not pending -> rejected.
  - REJECTED -> same View Profile link (outline variant — toned down to signal the record is non-active) + Re-Approve (primary). The rejection reason is rendered under the applicant's name in muted text so the admin can re-evaluate it.
- **Constants and derived values**:
  - DRIVER_PROFILE_PATH = /drivers (module-level, per the no-magic-strings rule).
  - viewProfileHref = useMemo(() => profile.userId ? `${DRIVER_PROFILE_PATH}/${profile.userId}` : null, [profile.userId]) so the page never constructs /drivers/undefined.

### Architectural Lessons
- **Populated foreign references are nullable.** .populate(userId, ...) returns null for any orphan document, not the source document and not an empty object. Any consumer that destructures a populated field without a guard can crash the same way. The grep pattern to look for: populate then .toString() and verify the population result is null-checked.
- **Stat cards and table data can disagree when one query depends on a populated reference and the other doesn't.** This is intentional here (the count is filter-only, the table needs the populated user data) and is the right tradeoff — the count is correct, and the table failure is a loud signal that an orphan exists.
- **Filters on PATCH endpoints should match by _id only when the operation is intended to be unrestricted.** Adding status: PENDING to the filter made sense when the only transition was pending -> approved|rejected; once approved -> revoked and rejected -> approved were needed, the filter became a regression. The body is the right place for the desired status; the role check is the right place for authorization.
- **Per-tab Actions cells should be role-aware**, not just per-status. The same record may need different affordances on different tabs (e.g. Revoke on Approved, Re-Approve on Rejected). A single if (activeTab === PENDING) branch grows badly; switch on activeTab with a small component per branch.

### Files Touched
- src/types/admin/adminVerification.ts — added totalRejected: number to AdminVerificationResponse.
- src/app/api/admin/verification/route.ts — null-guard filter + safe mapper; added totalRejected: DriverProfile.countDocuments({ status: REJECTED }) to Promise.all.
- src/app/api/admin/verification/[id]/route.ts — filter relaxed to { _id: id }. Body status is the source of truth.
- src/app/(admin)/admin/verification/page.tsx — tab counter badges; per-tab Actions cell; DRIVER_PROFILE_PATH constant; viewProfileHref memo; rejectionReason rendered under applicant name on the Rejected tab.

### API Reference
| Method | Route | Auth | Purpose |
|--------|-------|------|---------|
| GET    | /api/admin/verification?status=approved|pending|rejected&page=1&limit=20 | withRole([admin]) | Paginated list of driver profiles for a status, with populated userId (name, email). Returns { success, data, total, page, totalPages, totalApproved, totalPending, totalRejected }. Orphans are filtered out server-side. |
| PATCH  | /api/admin/verification/[id] | withRole([admin]) | Update status, rejectionReason, verifiedAt. Filter is { _id: id } (any current status is allowed; admin can transition any record to any status). |

### Build Verification
- npx tsc --noEmit — 0 errors
- npx eslint on all 4 changed files — 0 errors, 0 warnings
- npm run build — clean