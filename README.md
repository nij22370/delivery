# SwiftShip
Nepal-only delivery marketplace connecting posters with drivers.

## Stack
- Next.js 16 App Router
- TypeScript
- Tailwind CSS
- MongoDB Atlas (Mongoose ODM)
- Pusher (real-time)
- Khalti & eSewa (payment gateways)
- Cloudinary (file uploads)
- NextAuth (Google OAuth)
- TanStack Query (data fetching)
- Zustand (client state)
- Leaflet (maps)
- Recharts (analytics charts)

## Local Setup
1. Clone the repository
2. Run `npm install`
3. Copy `.env.local.example` to `.env.local` and fill in real values
4. Run `npm run dev`
5. Open `http://localhost:3000` in your browser

## Environment Variables

| Variable | Description |
| --- | --- |
| `MONGODB_URI` | MongoDB Atlas connection string |
| `JWT_ACCESS_SECRET` | Secret for signing short-lived access tokens (15 min) |
| `JWT_REFRESH_SECRET` | Secret for signing long-lived refresh tokens (7 days) |
| `NEXTAUTH_SECRET` | NextAuth.js session encryption secret |
| `NEXTAUTH_URL` | Canonical app URL (e.g., `http://localhost:3000`) |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `CLOUDINARY_CLOUD_NAME` | Cloudinary cloud name |
| `CLOUDINARY_API_KEY` | Cloudinary API key |
| `CLOUDINARY_API_SECRET` | Cloudinary API secret |
| `KHALTI_SECRET_KEY` | Khalti sandbox/live secret key |
| `KHALTI_PUBLIC_KEY` | Khalti sandbox/live public key |
| `ESEWA_MERCHANT_CODE` | eSewa merchant code |
| `ESEWA_SECRET_KEY` | eSewa secret key |
| `PAYMENT_SUCCESS_URL` | Redirect URL after successful payment |
| `PAYMENT_FAILURE_URL` | Redirect URL after failed payment |
| `PUSHER_APP_ID` | Pusher app ID |
| `PUSHER_KEY` | Pusher public key |
| `PUSHER_SECRET` | Pusher secret key |
| `PUSHER_CLUSTER` | Pusher cluster (e.g., `ap2`) |
| `NEXT_PUBLIC_PUSHER_KEY` | Pusher public key (browser-exposed) |
| `NEXT_PUBLIC_PUSHER_CLUSTER` | Pusher cluster (browser-exposed) |

## Architecture

### PLMS Layering
All code follows the PLMS (Presentation → Logic → Model → Service) layer order:
- **Types** (`src/types/`) — Type definitions that mirror API responses exactly
- **Lib** (`src/lib/`) — Business logic, auth, payment, utilities
- **API** (`src/app/api/`) — Next.js route handlers (API layer)
- **Hooks** (`src/api/hooks/`) — TanStack Query data fetching hooks
- **Pages** (`src/app/`) — React components and client-side UI

### Role System
Three roles enforced via `withRole()` on every API route:
- **poster** — Posts jobs, pays for deliveries, tracks drivers, rates drivers
- **driver** — Browses jobs, accepts deliveries, shares live location, chats, earns
- **admin** — Full platform oversight (users, jobs, disputes, analytics, verifications, payouts)

All admin routes are wrapped with `withRole(["admin"])`, and the admin layout (`src/app/(admin)/layout.tsx`) redirects non-admin users at the UI level.

### Payment Flow
1. Poster initiates payment via `POST /api/payments/initiate` (selects Khalti or eSewa)
2. Gateway redirects user back to verify endpoint (`POST /api/payments/{gateway}/verify`)
3. Server-side verification calls the gateway's lookup API — never trusts client-provided status
4. On success: `Job.paymentStatus` set to `"paid"`, `PaymentTransaction` record created (unique compound index on `{gateway, transactionId}` for idempotency), `Payout` record created with `status: "pending"`
5. Admin manually marks payout as `"paid"` or `"failed"` via `PATCH /api/admin/payouts/[id]` — mirrors manual disbursement via merchant portal

### Real-time
- Pusher private channels, one channel per job: `job-{jobId}`
- Events: `location-update`, `new-message`, `status-change`
- Client subscribes via `PusherProvider` wrapper; location pings stored in `LocationPing` model with TTL expiry

### File Uploads
- Cloudinary signed uploads via `POST /api/uploads/sign`
- Driver verification documents stored under `driver-verification/{userId}/{documentType}`
- Dispute evidence stored under `dispute-evidence/{jobId}/`

## Known Manual Tasks
No regular admin tasks require direct database access. The entire admin panel (user management, job oversight, dispute resolution, analytics, driver verification, and payout management) is fully operable through the UI.

The following items are documented as open bugs in `docs/ai-collaboration/Bug.md` — they do not require database access but are noted for completeness:
- **BUG-05** (Medium): Gateway status strings are magic strings in verify routes — replace with named constants
- **BUG-06** (Medium): `GET /api/drivers/payouts` fetches all records without pagination — add `page`/`limit` params
- **BUG-07** (Low): Verify URLs built with string-interpolated query params — use structured query params
- **BUG-08** (Medium): Payout split constants and gateway types duplicated across files — centralize in `src/lib/constants.ts`
