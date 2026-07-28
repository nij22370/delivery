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

---

## Day 5 — Refresh Token Rotation

### API Routes
- `POST /api/auth/refresh`: Accepts `{ refreshToken }`. Verifies signature and expiry with `JWT_REFRESH_SECRET`, fetches the user, SHA-256 hashes the incoming token and compares it against `user.refreshTokenHash`. On match: issues new access + refresh tokens, updates the stored hash (rotation), returns `{ accessToken, refreshToken }`. On mismatch: returns 401.

### Architectural Decisions
- **Single `refreshTokenHash` on User document (Option A)**: One active session per user. Simpler than a separate collection — easy to migrate to multi-session later when we need it.
- **Token rotation on every use**: Each refresh token is single-use. The moment it is consumed the DB hash is overwritten. If a stolen token is used first, the legitimate user's next call fails (hash mismatch) — signaling compromise. If the legitimate user uses it first, the stolen copy is immediately invalidated.

### Learning Prompt: Why rotate refresh tokens on every use?
Refresh tokens are long-lived. If an attacker silently copies one (XSS, log leak, network interception), they can abuse it for its full 7-day lifetime without detection. **Rotation collapses that window to a single request.** The first party to use the token wins; the second party gets a 401. This converts a silent long-term compromise into an immediately detectable event.

