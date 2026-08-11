# Constraints — What Is Off-Limits

> A short, explicit list of what must never happen. "Allow" should never mean "allow anything." Constraints turn permission into *scoped* permission. Review this before proposing any change.

---

## 🔴 Hard Bans

- **No new dependencies** without explicit user approval first. `package.json` changes require asking.
- **Never invent a new `JOB_STATUS` value.** The enum is fixed: `posted | accepted | in_transit | delivered | cancelled`. There is **no `"completed"`** — use `JOB_STATUS.DELIVERED`.
- **Never fetch all records.** Every list endpoint paginates from day one (`PAGE_SIZE`/`limit` + caps). No unbounded `.find()`.
- **No `any` type anywhere.** Use specific types or `unknown` + `instanceof` guards in `catch` blocks.
- **No new design patterns or component styles.** Match the existing app's UI exactly (Rule 0 — scan, replicate, never build independently).
- **No mixing icon libraries.** Material Symbols Outlined only.
- **Never commit `.env.local`** or any real secrets.
- **Never return `passwordHash` or `refreshTokenHash`** from any API route.
- **No commented-out code** — implement it or delete it.
- **No `setTimeout` to delay navigation** — redirect immediately when ready.
- **Never touch/rewrite `src/utils/mapIcons.js` without first fixing its `L` import problem** (or deleting it) — see Handover.

---

## 🔒 Security Constraints

- Every protected route uses `withAuth` (401 contract) and/or `withRole` (403 contract). Never hand-roll auth in a handler.
- Job data is visible only to: its poster, its assigned driver, or an admin. Public endpoints expose only public data (reviews, driver profile).
- Pusher private channels `private-job-{jobId}` must stay participant-gated in `POST /api/pusher/auth`.
- Duplicate ratings are prevented **by the unique index**, never by a check-then-insert (TOCTOU).
- Login must not reveal whether an email exists (timing-safe compare + generic 401 message).
- Cloudinary `CLOUDINARY_API_SECRET` stays server-side — only signed params go to the client.

---

## 🛠 Technical Constraints

- **Mongoose models**: always `mongoose.models.X || mongoose.model("X", schema)` (HMR guard). Never a bare `mongoose.model()` call.
- **Next.js external images**: configure `images.remotePatterns` in `next.config.ts` before using `<Image>` with external hosts.
- **API URLs**: never string-interpolate query params; pass structured parameters (body or `URLSearchParams`).
- **Zod schemas are the single source of truth** for validation — no duplicated validation in handlers.
- **Types mirror the API response exactly** — one source of truth per concept; never define the same concept twice.
- **Fire-and-forget** is the established pattern for non-critical side effects (rating recompute, location persistence) — never block a live response on them, and always `.catch()`.
- **No magic numbers/strings** — module-level named constants (`PAGE_SIZE`, `LOCATION_TTL_HOURS`, endpoint constants).

---

## 🎨 UI Constraints

- Mobile-first at all times; test at 375 / 390 / 768 / 1280 px.
- Touch targets ≥ `h-12` (48px).
- Destructive actions require a confirmation modal before the API call.
- Split screens: `hidden md:flex` for desktop, `flex md:hidden` for mobile.
- Reuse existing components/tokens from `design_system.md` and `globals.css`; never introduce a parallel visual language.

---

## 📋 Process Constraints

- **One logical change per request** — never bundle unrelated fixes.
- **Plan first** — explain the approach before implementing (Habit 11).
- **Read the diff** before applying/accepting any change (Habit 10).
- **Update `Handover.md`** at the end of every session (Habit 13).
- **Log decisions** in `Decisions.md` with the reasoning (Habit 2).
- **Trace every bug/feature** in `Bug.md` / `Feature.md` (Habit 5).
- **Version-pin context** — note which model/session made a decision (Habit 14).
- Follow the 7-Phase Debugging Workflow in `AGENTS.md` for every error.

---

## ❓ When in Doubt

1. Check `AGENTS.md` / `CLAUDE.md` (same rules).
2. Check `docs/ai-collaboration/` — Handover (state), Decisions (why), Flow (how).
3. Check `project_docs.md` for phase plans and learning prompts.
4. Check `design_system.md` for UI tokens.
5. If a constraint conflicts with a request — surface it and ask. Never silently violate.
