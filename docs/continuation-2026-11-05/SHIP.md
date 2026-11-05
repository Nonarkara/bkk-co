---
updated: 2026-11-05
drafted_by: codex/gpt-6
reviewed: false
---
# Public release proof

Live: https://co.nonarkara.org

- Baseline main4d496db, Worker f0993451-9f24-4026-b66f-bbd499ef4e49. Adopted other-agent work is preserved; no orphan bytes discarded.
- Integration PR10: https://github.com/Nonarkara/bkk-co/pull/10. Head72a9f4a; push/PR CI41987736462/41987744415 PASS. Merged runtime **7ddf3ac080e39a52d5e436f84488794213cb8a93**; merged-main CI41987939487 PASS.
- Deployed Worker **31bf3a95-9b44-4325-ac04-45ebd93f07d1**, original D1 binding and daily privacy cleanup retained. No schema/catalogue change. Read-only aggregate preflight found zero stored hops and zero accounts over100; no historical export truncation exists to migrate. No production test writes.
- Byte proof 2026-11-05T07:32:56.636Z: **229/229 public files match the release checkout** using ordinary public URLs, full SHA256/size list in live-bytes.json. Old-domain301 preserves query strings. Report includes the actual source commit and Worker UUID.
- Public read-only `test/continuation-live.mjs`: actual390×844,1024×900,1440×900. Residential tone target, white route numbers, exact complete line/point retention through optional shared notes and anonymous sign-in gate, task/class cleanup and enlarged notebook pass. Zero API writes/page errors. Screenshots/results in live-browser/; live phone feed-390.png shows real map symbols, numbered stops and straight links together with compact empty-feed action.
- `live-catalogue.txt`:57,379 catalogue records and public read-only API check pass. Source-data bytes/86aliases remain intact. Street sketches still cover five areas; unknown heights flat.

Independent review: VALIDATION.md and manga-audit/final/RECHECK.md. Actual publishing/photo/export/moderation/deletion tests ran only in fresh immutable local Worker/D1 fixtures. New manga-motion behavioral guards run in CI; backend quota/export race tests and browser original-defect falsifiers travel with the implementation. Physical-phone hardware and screen-reader user study, live venue conditions/entrances/access/traffic and surveyed eye-height realism remain unverified.

Final evidence commit changes docs only; public/src remain unchanged from deployed runtime7ddf3ac.
