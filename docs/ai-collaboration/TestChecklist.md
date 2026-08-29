# Test Checklist — Proof, Not Claims

> A concrete list of what to run and check before any change counts as "done." Not a vibe check — actual commands, actual expected outputs. AI claiming success and code actually working are two different facts.

---

## 🚀 Automated Gates (run in `driver-delivery-platform/`)

### 1. Lint
```bash
npm run lint
```
**Expected:** `✔ No ESLint warnings or errors` (exit code 0). No unused imports/vars, no `any`-type leaks.

### 2. Type-check + Production Build
```bash
npm run build
```
**Expected:** Compilation succeeds, route pages prerender (or are correctly marked dynamic), and the final summary shows `✓ Compiled successfully` + `✓ Generating static pages (N/N)` with no errors.

> If the build fails, you are **not done** — resolve it or explicitly document why it's blocked in `Handover.md`.

### 3. Dev server smoke test
```bash
npm run dev
# then in another terminal:
Invoke-RestMethod http://localhost:3000/api/health
```
**Expected:** `200` with `{ ok/status, db: "connected" }` (JSON shape per `src/app/api/health/route.ts`).

---

## 🧪 Manual Functional Smoke Test

After starting `npm run dev`, walk these flows against `http://localhost:3000`. Record actual results in the table below.

| # | Flow | Steps | Expected |
| --- | --- | --- | --- |
| 1 | Register (poster) | `/register` — new email, name, password ≥8, role poster | 201, redirected to login |
| 2 | Register (driver) | same, role driver | 201 |
| 3 | Login | `/login` with both accounts | cookies set (`accessToken`/`refreshToken` httpOnly), redirected to role-appropriate page |
| 4 | Post a job | `/post-job` 4-step form (locations → vehicle → pricing → review) | Job created; appears in poster's list |
| 5 | Browse jobs (driver) | `/jobs/browse` | sees the posted job; cannot see another driver's accepted jobs |
| 6 | Accept job (driver) | click Accept on the open job | status → `accepted`, driverId set |
| 7 | Track (driver) | `/jobs/:id/track` | map renders; moving marker updates via Pusher `location-update` |
| 8 | Track (poster) | same URL as poster | sees driver's live position |
| 9 | Messages | send a message on the job detail/track page from both sides | `new-message` event appears live for the other participant |
| 10 | Verify driver | driver `/driver/verification` — submit docs → status `pending` | admin queue shows the driver |
| 11 | Admin review | admin `/admin/verification` → approve | profile `approved`, `verifiedAt` set |
| 12 | Deliver → Rate | advance job to `delivered`, then `/jobs/:id/rate` | rating saved once; second attempt → 409; driver `ratingAvg` updated |
| 13 | Public profile | `/drivers/:id` | name, rating avg, total deliveries, reviews list |
| 14 | Refresh session | wait 15m (or use short access expiry in dev) and make a request | `refresh` endpoint rotates token silently, request succeeds |
| 15 | Logout | click logout | cookies cleared, protected pages redirect to `/login` |
| 16 | Read receipts + unread badge | two sessions (poster+driver on an accepted job): sender sends a chat message, receiver stays on job list | unread badge shows the count on the receiver's job list; badge clears the moment the receiver opens that job's chat (no refetch — cache update) |
| 17 | Off-screen toast | sender is on a different page, receiver sends a chat message | toast "New message from [name]" appears top-right; **no** toast when already on that job's chat page; no toast for your own echoed message |
| 18 | Dual-session live tracking + chat (Day 37) | same job open in two browsers (poster + driver); driver pings location while poster watches the map | message arrives live on receiver; `readAt` null until chat opened then populated in DB; vehicle marker updates live; no stale/duplicate Pusher subscriptions, no key warnings, no Pusher auth failures in the console |
| 19 | Khalti redirect payment (Day 46) | poster on accepted job with assigned driver, select Khalti, pay in sandbox | window redirects to Khalti; after payment returns via /payment/success; Job paymentStatus becomes paid; exactly one Payout created (pending) |
| 20 | eSewa form payment (Day 46) | poster selects eSewa; sandbox form submits signed params | hidden form POSTs to eSewa; return via /payment/success; job paid; one Payout created |
| 21 | Double verify is a no-op (Day 45) | hit verify twice with the same transactionId/pidx sequentially | second call redirects without creating a second Payout; Payout count stays 1 |
| 22 | Payment failure statuses (Day 45) | force Expired/User canceled/Refunded (Khalti) and FAILED/AMBIGUOUS (eSewa) | job paymentStatus = failed, no Payout created, user lands on /payment/failure with retry link |
| 23 | Abandoned payment retry (Day 45) | close the tab mid-redirect / never return from gateway | job stays retryable: payment section re-shows on job detail; poster can pay again |
| 24 | Payout status UI (Day 47) | driver opens /driver/earnings and job detail after admin marks payout paid | earnings cards show correct totals; payout history table shows gateway + status + date; job detail badge shows paid/pending/failed |
| 25 | Manual payment verify (both gateways) | poster logs in, job accepted + driver assigned; Khalti: GET /api/payments/khalti/verify?pidx=<pidx>; eSewa: GET /api/payments/esewa/verify?data=<base64> | verify returns a redirect to the job detail; Job paymentStatus becomes paid; exactly one Payout (pending) appears in the driver's /driver/earnings and the admin payout queue; repeat call with same pidx/data is a no-op |
| 26 | Earnings aggregation seed (Day 49) | `npx tsx scripts/seed-earnings.ts` | 9/9 PASS (3 drivers × weekly 8w / monthly 12m / all-time); pending + failed payouts absent from all buckets; weekly labels `YYYY-MM-DD` (Monday start), monthly `YYYY-MM`; all amounts NPR |
| 27 | Earnings endpoint (Day 50) | sign a JWT for a seeded driver (`signAccessToken`) and call `GET /api/drivers/[id]/earnings?range=week\|month\|all-time` | owner id → 200 with `{ summary, breakdown }` and `summary == aggregate(breakdown)`; another driver's id → 403; admin token → 200 for any id; omitted/invalid `range` → weekly; no cookie → 401; pending/failed payouts excluded from every response |
| 28 | Navbar role-aware (Day 68) | log in as poster / driver / admin | poster sees profile + Logout + Post a Job; driver sees profile + Logout only (no Post a Job); admin sees profile + Logout + Admin Panel link; logged-out sees Login + Post a Job |
| 29 | Driver History ACTIONS column (Day 68) | driver opens /history → Jobs tab | driver rows show Details (links to /jobs/[id]), Chat (/jobs/[id]#chat), and Dispute (/jobs/[id]#dispute only for delivered/completed); no Pay button or location-pin icon; poster rows unchanged (Rate/Pay/Chat/Track/Dispute) |
| 30 | Verification badges (Day 68) | driver with approved profile opens /driver/verification | all four document badges show green "Verified"; driver with pending status sees "Pending" badges; banner reads "You are verified" |
| 31 | Driver payout labels (Day 68) | driver opens /history → Payments tab | summary reads "Total Earned"; "paid" status renders as "Received" (green badge); "pending" renders as "Pending" (unchanged); poster still sees "Total Paid" and "Paid" |
| 32 | Error pages full-width (Day 68) | visit /nonexistent and trigger an error | 404 and error pages render without left sidebar; brand header + auth-aware profile/login button in top header |
| 33 | Browse Jobs in sidebar (Day 68) | open dashboard on desktop | "Browse Jobs" link visible in left sidebar (not hidden to mobile only); clicking it navigates to /jobs/browse |
| 34 | Post a Job auth redirect (Day 69) | click "Post a Job" / "Post Delivery" in public navbar while logged out | lands on `/login?redirect=/post-job`, not `/post-job`; after login, redirected to post-job form |
| 35 | Unified admin sidebar (Day 69) | navigate to `/admin/verification` | renders the same AdminSidebar as `/admin/jobs` [Dashboard, Job Management, Disputes, User Management, Payout Management, Verifications]; no inline sidebar with different items |
| 36 | Admin PDF export (Day 69) | open `/admin/jobs`, click "Download Report" | downloads `job-management-report.pdf` with table headers + data rows matching what's on screen |
| 37 | Admin CSV export (Day 69) | open `/admin/jobs`, click "Export" | downloads `job-management-report.csv` with headers + all row fields, valid CSV format |
| 38 | Resolve modal radio buttons (Dispute UX) | open a dispute, click "Resolve Dispute →" | modal shows Step 1 radio buttons (cancel / re-post); Step 2 (refund / pay / split) appears only after Step 1 chosen; Step 3 note textarea appears after Step 2; split shows two NPR inputs; Confirm button disabled until all steps complete |
| 39 | Dismiss dispute (Dispute UX) | open a dispute, click "Dismiss (no action needed)" | dispute resolves directly (job re-opened as `posted`, payout marked `failed`, note "Dismissed — no action needed"); no modal opens |
| 40 | Admin-to-poster messaging (Dispute UX) | open a dispute, open Admin Messages → "Message Poster" tab, type a message, click Send | message saved to `Message` model (senderId=admin, recipientId=poster), Pusher `new-message` triggered on `private-job-{jobId}`, toast "Message sent", message appears in thread history on next fetch |
| 41 | Admin-to-driver messaging (Dispute UX) | open a dispute with an assigned driver, open Admin Messages → "Message Driver" tab, type a message, click Send | same as row 40 but recipientId=driver; driver-only disputes show no "Message Driver" tab
| 38 | Admin topbar Settings + Profile (Day 69) | open any `/admin/*` page | topbar shows Settings icon link (`/settings`) + Profile (avatar + name + role); no FAQ, no Contact; no duplicate Profile section in sidebar or elsewhere |
**Rule:** if a flow you touched is not in the table, add it. The table is the living definition of "works."

---

## 📱 Responsive Check

For any UI change, verify at these widths (DevTools responsive mode):
- 375px (iPhone SE) · 390px (iPhone 14) · 768px (iPad) · 1280px (Desktop)

Checklist:
- [ ] Nav collapses into hamburger/drawer below `md`
- [ ] Touch targets ≥ `h-12` (48px)
- [ ] Grids use explicit responsive column counts (`grid-cols-1 md:grid-cols-2 lg:grid-cols-4`)
- [ ] No horizontal scroll overflow introduced
- [ ] Split-screen panels behave (`hidden md:flex` / `flex md:hidden`)

---

## ✅ Definition of Done

A change is **done** only when **all** of these hold:

- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] Manual smoke test rows relevant to the change pass (or are explicitly marked known-failing with a reason)
- [ ] No new `any`, no new magic numbers/strings, no unused imports
- [ ] Mongoose models use the HMR guard
- [ ] No new dependency added without approval
- [ ] `project_docs.md` updated with what was built + learning-prompt answers (existing project rule)
- [ ] `docs/ai-collaboration/Handover.md` updated (done/in-progress/known issues)
- [ ] New decision → logged in `docs/ai-collaboration/Decisions.md`
- [ ] New bug or feature → traced in `docs/ai-collaboration/Bug.md` / `Feature.md`
- [ ] You can explain the change in your own words (Habit 15)

---

## ⚠️ Known Non-Gating Items

- `src/utils/mapIcons.js` fails to import `L` — it does not break `npm run build`, but **do not** build on it (see Handover).
- OAuth Google login is a scaffold, not a gated feature yet.
