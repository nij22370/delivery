# Feature.md — Trace Every Feature Start to Finish

> Every feature gets a trace from the request that started it to the verification that ended it. The trace is the proof that the feature was designed, not stumbled into.

---

## The Feature Trace Format (copy this block for each feature)

```markdown
## FEATURE-<NN> — <short title>

**Requested:** <date> · **Requested by:** <who>
**Status:** <Planned | In progress | Shipped | Blocked>
**Scope:** <one line — what it does, what it deliberately does NOT do>

### Why (intent)
The problem this solves and for whom. If you can't write this, you don't understand the feature yet.

### Design
- Data model changes (if any)
- API changes (routes/methods/payloads)
- UI components involved
- Real-time events (if any)
- Decisions made during design → link to `Decisions.md` (e.g. D-22)

### Implementation trail
- What was built, in what order
- Files created/modified
- What was tried and discarded, and why

### Verification
Rows from `TestChecklist.md` that were run + actual results.

### Follow-ups
Known gaps, future enhancements, things deliberately left out.
```

---

## Feature Log

| ID | Title | Status | Requested | Shipped in |
| --- | --- | --- | --- | --- |
| FEATURE-01 | Read receipts + unread badges + off-screen toasts | Shipped | Aug 13 | Days 35–37 |

---

## FEATURE-01 — Read receipts, unread badges, and off-screen message toasts

**Requested:** Aug 13 · **Requested by:** build plan Days 35–37
**Status:** Shipped
**Scope:** Mark messages read when the chat opens; badge unread counts per job on the chat sidebar; a global Pusher provider that notifies the user of new messages while off the chat page. Deliberately does NOT add a "last seen" indicator, does NOT change the chat page's own Pusher subscription, and does NOT touch auth middleware.

### Why (intent)
Recipients had no way to know which conversations had unseen messages, and senders had no feedback that their message was read. Users off the chat page received no signal that a new message arrived.

### Design
- `PATCH /api/jobs/:id/messages/read` — `withAuth` + participant gate; `updateMany` on `{ jobId, recipientId: me, readAt: null }`.
- `GET /api/jobs/unread-counts` — `withAuth`; aggregation → `{ [jobId]: count }`.
- `GET /api/jobs/my-active-ids` — `withAuth`; active (accepted/in_transit) jobs where user is participant.
- `useUnreadCounts` + `useMarkMessagesRead` hooks (30s staleTime on the query; cache-update-only on the mutation).
- `PusherProvider` context — one shared `pusherClient`, subscribes active jobs, toasts via `react-hot-toast` when off the chat page for that job.
- `senderName` added to the `new-message` Pusher payload.
- Decisions: D-27 (cache-update, never invalidate).

### Implementation trail
1. Day 35 — read endpoint, unread-counts endpoint, types/apis/hooks, chat-page on-mount mark-read, sidebar badge.
2. Day 36 — my-active-ids endpoint, `senderName` in event payload, `react-hot-toast` install, `PusherProvider`, root-layout wiring.
3. Day 37 — Node E2E (30/30 pass), lint (no new issues) + build clean, fixed self-message toast guard.

### Verification
- TestChecklist rows 16–18 added. API surface E2E-verified: cross-role register/login, post+accept, both-direction messages, unread count 1 recipient / 0 sender, mark-read → `markedCount: 1` + badge clears, recipient scoping (driver's read never clears poster's count), 401 guards on all three routes, location ping 200/403.
- Toast + live-map marker behavior require dual real browsers (rows 17–18 pending manual playback).

### Follow-ups
- Rate-limit chat, "last seen" read receipts per sender, refetch-on-focus staleness policy for `unread-counts`, and a nudge to look at the badge from the campaign/notification bell (dashboard nav is still mockup).
