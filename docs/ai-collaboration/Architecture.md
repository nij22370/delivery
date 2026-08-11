# Architecture — The System Map

> A high-level map of the system: modules, services, how data moves between them. Not implementation detail — the shape of the thing, so the AI doesn't have to re-derive it every session.

---

## Stack Overview

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 (App Router), React 19, TypeScript 5 |
| Database | MongoDB Atlas (Mongoose 9 ODM) |
| Styling | Tailwind CSS v4 + SwiftShip Design System tokens |
| Auth | Custom JWT (access 15m + rotating refresh 7d) in httpOnly cookies; NextAuth (Google) scaffold |
| Real-time | Pusher (private channels) |
| Maps | Leaflet + react-leaflet, Nominatim geocoding |
| Uploads | Cloudinary signed uploads |
| Forms/Validation | React Hook Form + Zod 4 |
| Data fetching | TanStack React Query + axios; Zustand for client state |

---

## Folder Map (`driver-delivery-platform/`)

```
src/
├── app/
│   ├── (main)/            # marketing + auth pages (home, login, register, post-job, jobs/browse,
│   │                      #   jobs/[id], driver/verification, admin/verification)
│   ├── (dashboard)/       # authenticated shell (rate page, driver public page, pusher-test)
│   ├── (tracking)/        # jobs/[id]/track — full-screen live tracking
│   └── api/               # all Route Handlers (see API Map below)
├── api/
│   ├── api.ts             # axios instance
│   ├── apis/              # typed endpoint functions (auth, jobs, drivers, ratings, admin)
│   └── hooks/             # React Query hooks wrapping the apis layer
├── components/
│   ├── layout/            # Header, Footer
│   ├── post-job/          # multi-step form (locations, vehicle, pricing, review)
│   ├── providers/         # QueryProvider, AuthProvider
│   ├── LiveTrackingMap.tsx
│   └── MapPreview.tsx
├── models/                # Mongoose models: User, Job, DriverProfile, Rating, LocationPing, Message
├── lib/                   # db, auth (withAuth/withRole), pusher (server+client),
│                          #   triggerJobEvent, updateDriverRating, pricing, constants, errorResponse
├── types/                 # Zod schemas + API mirror types (single source of truth per concept)
├── utils/                 # format, geocode, mapIcons (BROKEN — see Handover)
└── hooks/                 # useAuthGuard, useDebouncedValue
```

---

## Data Models (MongoDB)

| Collection | Key fields | Notes |
| --- | --- | --- |
| `User` | name, email (unique), passwordHash, role (`poster/driver/admin`), oauthProvider/Id, refreshTokenHash | Secrets never returned in API responses |
| `Job` | posterId, driverId (nullable), status (enum `JOB_STATUS`), pickup/dropoff contact+address, vehicleType, packageDescription, offeredPrice (cents), pickupDate, pickupTimeWindow | `status` indexed; driverId default null |
| `DriverProfile` | userId (unique), status (`unverified/pending/approved/rejected`), vehicleType, doc URLs, backgroundCheck, rejectionReason, verifiedAt, **ratingAvg/ratingCount (denormalized)** | index `{status, createdAt:-1}` |
| `Rating` | jobId, fromUserId, toUserId, score (1–5), comment | **unique** `{jobId, fromUserId}`; no updatedAt |
| `LocationPing` | jobId, driverId, lat, lng, timestamp, expiresAt | TTL `expireAfterSeconds:0` + `{jobId, timestamp:-1}` |
| `Message` | jobId, senderId, recipientId, content (≤2000), readAt | `{jobId, createdAt:1}`, `{recipientId, readAt:1}` |

**Critical rule:** every model is exported via the Mongoose HMR guard (`mongoose.models.X || mongoose.model("X", schema)`).

---

## API Map

### Auth
| Method/Route | Access | Purpose |
| --- | --- | --- |
| POST `/api/auth/register` | public | create user (Zod + bcrypt) |
| POST `/api/auth/login` | public | JWT pair in httpOnly cookies |
| POST `/api/auth/refresh` | cookie | rotate token pair |
| POST `/api/auth/logout` | auth | revoke refresh hash + clear cookies |
| GET `/api/auth/me` | auth | current user |
| GET `/api/auth/[...nextauth]` | public | NextAuth Google scaffold |

### Jobs
| Method/Route | Access | Purpose |
| --- | --- | --- |
| POST `/api/jobs` | poster | create job |
| GET `/api/jobs` | auth | role-scoped paginated list (`?status`, `?vehicleType`, `?driverId=me`, `?page`, `?limit`) |
| GET `/api/jobs/:id` | auth | role-scoped detail |
| POST `/api/jobs/:id/accept` | driver | atomic accept (posted → accepted) |
| POST `/api/jobs/:id/location` | assigned driver | live ping → Pusher + fire-and-forget persist |
| GET `/api/jobs/:id/messages` | participants | paginated history |


### Drivers & Verification
| Method/Route | Access | Purpose |
| --- | --- | --- |
| GET/PUT `/api/drivers/verification` | driver | read/update own profile (upsert) |
| GET `/api/admin/verification` | admin | queue with status + search + pagination |
| PATCH `/api/admin/verification/:id` | admin | approve/reject (pending → approved/rejected) |
| GET `/api/drivers/:id` | public | public profile + totalDeliveries |
| GET `/api/drivers/:id/reviews` | public | paginated reviews |

### Ratings
| Method/Route | Access | Purpose |
| --- | --- | --- |
| POST `/api/ratings` | participants | rate for delivered job (unique index → 409) |
| GET `/api/ratings/check` | auth | `{ rated }` scoped to `{jobId, fromUserId: me}` |

### System
| Method/Route | Access | Purpose |
| --- | --- | --- |
| GET `/api/health` | public | API + DB ready state |
| POST `/api/pusher/auth` | auth | authorize participant for `private-job-{id}` |
| POST `/api/uploads/sign` | auth | Cloudinary signed upload params |
| POST `/api/test-pusher` | dev | Pusher smoke test |

---

## Environment Variables

Server-only: `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`, `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`, `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`.
Public (NEXT_PUBLIC): `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`.
All live in `.env.local` (git-ignored — never commit).

---

## Auth Model (How requests are guarded)

```
withRole(["poster"]) = withAuth + role check   → 401 no token / 403 wrong role
withAuth            = cookie accessToken → verifyAccessToken → JwtAccessPayload{ userId, role }
participant checks  = String(job.posterId) === user.userId || String(job.driverId) === user.userId
public read routes  = reviews, driver public profile (no auth)
```

---

## Real-Time Model

- Channels: `private-job-{jobId}` only (participant-gated).
- Events: `location-update`, `new-message`, `status-change`.
- Server: `pusherServer.trigger(...)` via `triggerJobEvent`.
- Client: `pusherClient` (browser key) subscribes on the track page; `LiveTrackingMap` listens for `location-update`.

---

## Design System

See `design_system.md` at the repo root and the design tokens in `src/app/globals.css`. One icon library only (Material Symbols Outlined). All new UI must match existing components exactly (Rule 0 in `AGENTS.md`).
