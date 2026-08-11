# AI Collaboration — SwiftShip Delivery Platform

> Source: *AI Collaboration Field Guide* — 15 documentation habits that turn AI-assisted coding from a gamble into a system you control. Applied to this project on Day of Setup.

**The core idea:** Every AI session starts with amnesia. These files are the memory. Stop clicking "Allow" blindly — trace it, then direct it.

## The 5 Core Files

| # | File | Purpose |
| --- | --- | --- |
| 1 | [`Handover.md`](./Handover.md) | Where things stand right now — done, in progress, broken, avoid |
| 2 | [`Decisions.md`](./Decisions.md) | Why, not just what — every meaningful decision + reasoning |
| 3 | Explicit comments | Inline intent — non-obvious logic is commented as it is written (rule in `AGENTS.md`) |
| 4 | [`Flow.md`](./Flow.md) | How execution travels — what calls what, in what order |
| 5 | [`Bug.md`](./Bug.md) / [`Feature.md`](./Feature.md) | Start-to-finish traces for every bug and feature |

## The 4 Guardrail Documents

| # | File | Purpose |
| --- | --- | --- |
| 6 | [`Architecture.md`](./Architecture.md) | The system map — modules, services, data movement |
| 7 | [`Constraints.md`](./Constraints.md) | What is off-limits — scoped permission, not "allow anything" |
| 8 | [`TestChecklist.md`](./TestChecklist.md) | Proof, not claims — actual commands and expected outputs |
| 9 | [`Rollback.md`](./Rollback.md) | The way back out — undo plan for risky changes |

## The 6 Review Habits (codified in `AGENTS.md`)

| # | Habit | Rule |
| --- | --- | --- |
| 10 | Read the diff | Never accept a change based on a summary — read the actual diff, every time |
| 11 | Ask why before what | Plan first — explain approach before implementing |
| 12 | Small requests only | One logical change per request |
| 13 | Session handoff summary | Update `Handover.md` at the end of every session |
| 14 | Version-pin your context | Note which model/session made which decision |
| 15 | Own the mental model | If you can't explain the code in your own words, don't accept it |

## How to Use This Every Session

1. **Start:** Read `Handover.md` first — it tells you where things stand.
2. **Scope:** Read `Architecture.md` + `Flow.md` for anything you're about to touch.
3. **Guard:** Check `Constraints.md` before proposing anything — off-limits means off-limits.
4. **Do:** One logical change per request. Plan first. Read the diff before applying.
5. **Verify:** Run the commands in `TestChecklist.md` before claiming "done".
6. **Record:** End the session by updating `Handover.md` (5-line note is enough) and logging decisions in `Decisions.md`.
7. **Trace:** New bug → `Bug.md`. New feature → `Feature.md`.

> A blind "Allow" is not a decision. This is.
