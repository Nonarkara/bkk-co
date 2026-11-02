---
updated: 2026-11-03
drafted_by: codex/gpt-6
reviewed: false
---
# Shipped and verified

Live: https://co.nonarkara.org · source repo: Nonarkara/bkk-co.

- Feature commit: `b4750b0`.
- PR: https://github.com/Nonarkara/bkk-co/pull/1 (merged).
- Merged source: `9fae865e1d3d4b1229f1ab7189092385ce8581da`.
- Cloudflare Worker version: `e420b2c2-c5f2-4fb2-b78a-0a9dc590a662`.
- Both PR checks and post-merge CI passed. Main run: https://github.com/Nonarkara/bkk-co/actions/runs/41507352276.

## Migration and deployment

`npx wrangler d1 execute bkk-co --remote --file=db/notebook.sql` applied the additive tables. The live database now has seven application tables; existing ratings were not dropped or migrated. Remote `PRAGMA foreign_key_list(notebook_posts)` confirms cascading ownership references. Migration ran on the existing APAC/SIN primary. No sibling IOC/Atlas project was deployed.

After merge, the Worker dry-run passed, then `npx wrangler deploy` uploaded ten changed/new assets and the Worker. Both custom domains and the daily18:15UTC cleanup trigger were deployed. `MODERATION_KEY` is a Worker secret stored in macOS Keychain; no value is recorded here.

## Live proof

- `live-bytes.json`: **187/187 public files** equal the merged checkout byte-for-byte. The CLI's191-file inventory includes directory entries; the verifier checks187 real files. The old domain's301 preserves its query string.
- `live-smoke.json`: real Chrome390×844 creates a disposable account, saves a private visit/photo, backs it up and restores both on a fresh browser using the notebook key. Research defaults off, no public post is created, anonymous/wrong-account reads reject, and the temporary account/visit/photos are deleted afterward. No real user's content was read or changed.
- `live-moderation.json`: the owner's actual secret authenticates the live review queue. No posts were changed.
- `live-existing-results.txt`: catalogue, validator, hours and read-only live ratings API checks pass.
- `live-empty-390.png` and `live-private-390.png`: actual live UI. The latter is explicitly marked as a synthetic release check and was deleted with its disposable account.

Source verification tools: `scripts/verify-notebook-release.mjs` is read-only. `test/notebook-live-smoke.mjs` requires the explicit `ALLOW_LIVE_NOTEBOOK_SMOKE=1` opt-in and always attempts cleanup. Other notebook write suites refuse public URLs or hard-code localhost.

See README.md for the67 real local API assertions, deterministic races/date/JPEG/cleanup checks, four-width browser matrix, moderation/export/draft tests, preservation captures and independent review. Source ratings/finder/hop/moods remain, including straight-line and river-only route qualifications.

This is a usable T1 pilot, not a completed Google Play release. Google sign-in and store publication were explicitly deferred. Offline maps and unlimited media hosting are not claimed. Keep the notebook key private and export before clearing a device.
