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
