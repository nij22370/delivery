# Rollback — The Way Back Out

> Written before the change is made, not after it breaks. Every risky change needs an exit plan: what will be undone, how, and how you'll verify the undoing worked.

---

## The Golden Rules

1. **Never roll back blind.** Check `git status` and `git diff` first — know what you're reverting.
2. **`git revert` over manual editing.** Reverting a commit is replayable and reviewable; hand-editing files back "the way they were" is how state drifts.
3. **`project_docs.md` is the source of truth for *intent*.** If a decision was rolled back, annotate it there (and in `Decisions.md`).
4. **When in doubt, ask.** Rolling back the wrong thing can be worse than the original bug.

---

## Commands Reference (run from `driver-delivery-platform/`)

```bash
# Inspect before touching anything
git status                 # what is modified/staged/untracked
git log --oneline -10      # recent commits
git diff --stat            # which files changed, how much

# Undo uncommitted changes to specific files
git checkout -- <file>            # discard working-tree changes for a file
git restore <file>                # same thing, modern syntax

# Undo uncommitted changes across the whole tree (CAREFUL)
git checkout -- .                 # or: git restore .

# Revert a specific commit (safe: creates a new commit)
git revert <commit-sha>
git revert HEAD                  # revert the most recent commit

# Revert an in-progress change you made, keep it available for inspection
git stash push -m "WIP: <desc>"
git stash list
git stash apply                  # bring it back if you change your mind

# Undo a mistaken 'git reset --hard' or 'git checkout -- .' (if you had it staged/committed)
git reflog                       # find the pre-reset commit
git reset --hard <sha-from-reflog>
```

---

## Rollback Scenarios

### Scenario A — A feature/commit broke the build
1. `git log --oneline -5` to find the culprit commit.
2. `git revert <sha>` (creates an inverse commit — history stays linear and reviewable).
3. Run `npm run lint` + `npm run build` to confirm the revert restored a green build.
4. Note the revert in `Handover.md` ("reverted X because Y").

### Scenario B — Broken uncommitted changes (the common AI case)
1. `git status` to see exactly what changed.
2. `git restore <file-or-.>` to drop the changes.
3. Re-run the failing check. If still failing, the problem predates your change — investigate (7-Phase Debugging Workflow) rather than continuing to revert.

### Scenario C — Accidental mass deletion / reset
1. **Do not panic, do not write more files.**
2. `git reflog` — find the last good state.
3. `git reset --hard <sha>` to restore it.
4. If untracked files were deleted (not in git), check editor trash / Windows Recycle Bin; `docs/ai-collaboration/` files were newly created so **back them up in git early** (`git add` + commit once they're stable).

---

## Environment & Config Rollback

| Item | Location | Rollback action |
| --- | --- | --- |
| `.env.local` | `driver-delivery-platform/.env.local` | **Not in git.** Back it up before any edit (`Copy-Item .env.local .env.local.bak`). Restore from backup. If lost, re-request keys from the owner. |
| Env var additions | `.env.example` (if present) | Revert the file; note any documented key in `Handover.md` |
| `package.json` deps | repo | `git restore package.json package-lock.json` then `npm install` to sync `node_modules` |
| Database schema | MongoDB Atlas | No migration system in use — schema is applied implicitly by Mongoose. To "unroll" a model change: revert the model file, restart the app. Note: TTL/unique indexes already built in Atlas persist until explicitly dropped (`db.collection.dropIndex(...)` in Atlas UI / shell) |
| Pusher/Cloudinary keys | `.env.local` | Same as env above |

---

## Post-Rollback Verification Checklist

- [ ] `git status` shows only the files you intended to restore
- [ ] `npm run lint` passes
- [ ] `npm run build` passes
- [ ] `npm run dev` + `GET /api/health` returns DB `connected`
- [ ] The affected flow from `TestChecklist.md` was re-run manually
- [ ] `Handover.md` updated: what was rolled back and why
- [ ] `Decisions.md` annotated: the reverted decision now says "reverted"

---

## When NOT to Roll Back

- **A test-only or docs-only change that "broke" something unrelated** — investigate first; don't revert the docs.
- **Schema/index changes already synced to Atlas** — reverting the code won't drop the index; do both deliberately.
- **If the rollback itself is risky** (mass checkout of untracked work) — ask for confirmation first.
