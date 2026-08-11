# Bug.md — Trace Every Bug Start to Finish

> Every bug gets a full trace: how it was found, what was tried, what worked, what didn't, how it was verified. A bug that is not traced is a bug that will be re-introduced.

---

## The Bug Trace Format (copy this block for each bug)

```markdown
## BUG-<NN> — <short title>

**Reported:** <date> · **Found by:** <who/how — user report, test, code review>
**Status:** <Open | Investigating | Fixed | Won't-fix | Duplicate>
**Severity:** <Critical | High | Medium | Low>

### Symptom
What actually happened, vs. what was expected. Screenshot/error text if available.

### Root cause
The actual mechanism (file:line + why). Not the symptom — the cause.

### Investigation trail
- What was checked first and why
- Hypotheses that were ruled out (and the evidence)
- The hypothesis that held

### Fix
The change(s) that resolved it (file paths + what changed).

### Regression guard
How to make sure it never comes back (test, checklist row, constraint).

### Verification
Commands run + results. Must reference `TestChecklist.md` rows.
```

---

## Bug Log

| ID | Title | Status | Found | Root cause (one line) | Fixed in |
| --- | --- | --- | --- | --- | --- |
| *(add first entry here)* | | | | | |

---

### Known, deliberately untraced

- **`src/utils/mapIcons.js` uses `L.Icon` without importing `L`** — documented in `Handover.md`, not a Bug.md entry until it's actively causing a failure. Fix or delete before building on it.
