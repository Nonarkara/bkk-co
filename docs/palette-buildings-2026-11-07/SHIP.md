---
updated: 2026-11-07
drafted_by: codex/gpt-6
reviewed: false
---
# Palette manga release

Live: https://co.nonarkara.org

- Baseline main b50fa13. PR #11 https://github.com/Nonarkara/bkk-co/pull/11, head d9aaca9, merged runtime **773d02ab27a54ec0c8af8d1489d3bedb9bc52f22**.
- Feature push CI 42264455897 check + MSH PASS. PR CI 42264464506 check + MSH PASS after restarting a runner stalled for more than 5 minutes installing browser dependencies; final measured/planted layout job 2m39. Merged-main CI 42266090955 also passes. No test/budget was skipped or weakened. ci-setup-retry.txt records the attempt.
- Worker **e995e558-a850-4ad8-b938-977c23de60ae**, original routes/D1/privacy cron retained. Static frontend change only; no database/schema/backend/catalogue/alias mutation.
- Byte proof 2026-11-06T17:57:37.707Z: **231/231 public files match;0 mismatched, 0 missing, 0 orphans still served**. Required verify-live-bytes.mjs compared against previous 228-file proof. Per-file SHA256 and runtime source commit in live-bytes.json. Its source script uses UTC date path; report copied here and historical report restored.
- Actual public 390×844 / 1024×900 / 1440×900 browser: default close manga, source-contained Polygon masks, pan-before-filter, precise-mode camera/pins invariance, category filtering, Key, source-height Low view, reduced motion, enlarged/grayscale checks PASS, zero API writes/page/MapLibre errors. Live screenshots/results/provenance in live-browser/. Public catalogue/API read-only check passes 57,379 places. Exact deployed bytes are unchanged after this proof.

Palette 320: café—Coral Red; co-work—Sulpher Yellow; library—Oil Green; food—Light Glaucous Blue. Mixed categories use stripes; unknown footprints remain neutral. Colors describe matching raw pins inside actual source Polygon components, never all uses/floors. Both views retain identical GPS coordinates; styling is not a sensor-accuracy change. Street routes/heights remain source-backed and schematic; current access/entrances and surveyed pedestrian photography are not claimed.

Independent review and meaningful falsifiers: VALIDATION.md and independent-review/REVIEW.md. MSH normal/planted and geometry/runtime negative controls run in CI. Physical phone and screen-reader user study remain unverified. Documentation-only proof changes neither public/ nor src/.
