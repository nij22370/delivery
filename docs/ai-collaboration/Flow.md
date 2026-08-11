# Flow — How Execution Travels

> Document how execution actually travels between files, functions, and modules: what calls what, in what order, and exactly which part of that path you're modifying right now. Bugs live in the gaps between files.

---

## 1. Authentication Flow

```
Browser                              Server
  │ POST /api/auth/register            │ Zod validate → bcrypt.hash → User.create → 201
  │ POST /api/auth/login               │ find user → bcrypt.compare (always, dummy hash)
  │                                    │ → signAccessToken + signRefreshToken
  │                                    │ → store hashToken(refresh) on User
  │                                    │ → set httpOnly cookies accessToken (15m) + refreshToken (7d)
  │                                    │
  │ (every authed request)             │ cookie accessToken → withAuth → verifyAccessToken
  │                                    │   → JwtAccessPayload { userId, role } passed to handler
  │ POST /api/auth/refresh             │ cookie refreshToken → verifyRefreshToken
  │                                    │ → find user → compare hashToken(refresh)
  │                                    │ → rotate: new pair + new stored hash
  │ POST /api/auth/logout              │ withAuth → User.findByIdAndUpdate($unset refreshTokenHash)
  │                                    │ → clear both cookies (maxAge 0)
```

**Key files:** `src/lib/auth.ts` (withAuth/withRole/sign/verify/hash), `src/app/api/auth/{login,refresh,logout,me,register}/route.ts`, `src/types/auth/auth.ts`.

---

## 2. Job Lifecycle

```
poster:  POST /api/jobs ──withRole(["poster"])──► Job.create({ status: "posted", posterId })
                                                          │
driver:  GET /api/jobs ──withAuth──► buildRoleScopedFilter(user, status, vehicleType, driverId)
         │   posters → { posterId: me }        drivers → { status: "posted" } (or own via driverId=me)
         │   → find().sort(createdAt:-1).skip().limit() + countDocuments → { jobs, total, page, totalPages }
         │
driver:  POST /api/jobs/:id/accept ──withRole(["driver"])──► findOneAndUpdate({_id, status:"posted"},
         │                                                        { $set: { status:"accepted", driverId } })
         │   null → 409; otherwise 200 with job
         │
driver:  POST /api/jobs/:id/location ──withAuth──► participant check (job.driverId === user.userId)
         │   Zod {lat,lng} → triggerJobEvent("location-update") → return { ok:true }
         │   └─► void LocationPing.create(...48h TTL...)  (fire-and-forget)
         │
         status transitions: posted → accepted → in_transit → delivered | cancelled
poster:  POST /api/ratings ──withAuth──► job must be DELIVERED → participant + no-self + toUserId===other
         │   → Rating.create (unique {jobId,fromUserId} index → E11000 → 409)
         │   └─► updateDriverRating(toUserId)  (fire-and-forget aggregation → DriverProfile.ratingAvg)
```

**Key files:** `src/types/job.ts` (schema + `JOB_STATUS`), `src/models/Job.ts`, `src/app/api/jobs/route.ts`, `src/app/api/jobs/[id]/{route,accept,location}/route.ts`, `src/lib/triggerJobEvent.ts`.


---

## 3. Real-Time Tracking (Pusher)

```
Browser (track page)                     Server
  │ pusherClient.subscribe("private-job-{id}")  │
  │   → POST /api/pusher/auth (withAuth)        │ Job.findById → isPoster || isDriver?
  │   → authorizeChannel(socket_id, channel)    │ 403 if neither; auth token if participant
  │                                             │
  │ driver: POST /api/jobs/:id/location ────────► triggerJobEvent(jobId, "location-update", {lat,lng,...})
  │                                             │   └─► pusherServer.trigger("private-job-{id}", ...)
  │ LiveTrackingMap.tsx ← event "location-update" on channel
  │   → update marker + polyline; ping persisted to DB fire-and-forget
```

**Key files:** `src/lib/pusher.ts` (server), `src/lib/pusherClient.ts` (browser), `src/lib/triggerJobEvent.ts`, `src/app/api/pusher/auth/route.ts`, `src/components/LiveTrackingMap.tsx`, `src/app/(tracking)/jobs/[id]/track/page.tsx`.

---

## 4. Messaging Flow

```
participant: GET /api/jobs/:id/messages ──withAuth──► job exists? isPoster || isDriver? → 403
   → Message.find({ jobId }).sort({ createdAt: 1 }).skip().limit(min(limit, 100))
   → { messages, total, page, totalPages }

send: POST /api/jobs/:id/messages (same participant gate)
   → Message.create → triggerJobEvent(jobId, "new-message", message)
   → client bound to "new-message" on private-job-{id} appends to list
```

**Key files:** `src/models/Message.ts`, `src/app/api/jobs/[id]/messages/route.ts`, `src/types/message/message.ts`.

---

## 5. Driver Verification Flow

```
driver: GET /api/drivers/verification ──withRole(["driver"])──► DriverProfile.findOne({userId})
   (no profile → default { status:"unverified", vehicleType:"bike", backgroundCheck:{authorized:false} })
driver: PUT /api/drivers/verification ──withRole(["driver"])──► Zod → findOneAndUpdate(upsert:true)
   uploads: POST /api/uploads/sign ──► Cloudinary signature (server-side secret) → client direct upload → doc URLs
admin:  GET /api/admin/verification ──withRole(["admin"])──► status filter + search (escaped regex) + pagination
admin:  PATCH /api/admin/verification/:id ──► { status: approved|rejected, reason }
   → findOneAndUpdate({ _id, status: "pending" })  (409 if not pending)
   → approved → verifiedAt = now; rejected → rejectionReason + verifiedAt = null
public: GET /api/drivers/:id ──► user + profile + countDocuments({driverId, status:"delivered"})
public: GET /api/drivers/:id/reviews ──► Rating.find({toUserId}).populate(fromUserId,"name").sort(createdAt:-1)
```

**Key files:** `src/models/DriverProfile.ts`, `src/app/api/drivers/verification/route.ts`, `src/app/api/admin/verification/{route,[id]/route}.ts`, `src/app/api/drivers/[id]/{route,reviews/route}.ts`, `src/app/api/uploads/sign/route.ts`.

---

## 6. Price Suggestion (Post-Job Step 3)

Vehicle-aware suggestion: `StepPricing` receives the vehicle chosen in Step 2
and passes it to `calculateSuggestedPrice(pickup, dropoff, vehicleType)`.

```
calculateSuggestedPrice(pickup, dropoff, vehicleType)
   → geocodeAddress(pickup) + geocodeAddress(dropoff)  (via /api/geocode proxy)
   → haversineDistanceMeters → distanceKm/miles
   → billableKm = max(0, km - freeKm)
   → suggestedPriceCents = baseCents + billableKm * perKmCents
```

Rate tiers (per vehicle, mirroring Nepali platforms' base + per-km factor
structure; each tier encodes its weight bracket `maxKg`):
`src/lib/pricing.ts` → `VEHICLE_RATES`.

**Key files:** `src/lib/pricing.ts`, `src/utils/geocode.ts`, `src/components/post-job/StepPricing.tsx`.

---

## 7. Data Fetching Layer (Client)

```
Page/component → src/api/hooks/... (React Query hooks)
   └─► src/api/apis/... (typed axios calls to /api/*)
         └─► Next.js Route Handler → connectDB() → Mongoose model → JSON
```

**Key files:** `src/api/api.ts` (axios instance), `src/api/apis/{auth,jobs,drivers,ratings,admin}/...`, `src/api/hooks/{...}`, `src/components/providers/QueryProvider.tsx`.
