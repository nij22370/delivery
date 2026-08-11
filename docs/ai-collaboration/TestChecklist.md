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
