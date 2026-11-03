---
updated: 2026-11-03
drafted_by: codex/gpt-6
reviewed: false
---
# Release evidence

Baseline: main6ad5fc9;192livepublicfiles matched before edits (baseline-live-bytes.json). PL;UB wordmark, Sao Chingcha, sticker/vector roles and Wongnai handoff preserved.

Changed:352phone numbers and10addresses across357existingplaces; immutable57,538catalogue rows. Bangkok hours/mood/hop time; invalid clocks unknown. Photo preview and keyboard dialog, Blob URL retirement. Multipart device backups preserve same-day visits and reject forged cloud identity. Isolated local API runner eliminates rerun429falsealarms. No schema, account privacy, consent or ranking changes.

Local checks:67Worker/D1API assertions pass on two independently fresh emulator runs; catalogue checks; race/privacy/date checks; timezone/hop checks under New York; deterministic enrichment; Wrangler dry-run. Four-viewports realChrome audit covers photo viewing/preview, stalled optional score request, source disclosure, enlarged30px forms, repeatedURLcleanup, and backup largerthan15MB (8visits,3parts,8restored,0onrepeat).

MSH task: read a place and log a visit; or reopen a saved visit and act. All4viewports use90px combinedheader/filterchrome (10.7%of844phone,10%of900,12.5%of720). Log action follows identity with73px to its bottom instead of395px in the old composition. First saved action ends at453pxphone/429pxdesktop; same600px-and-viewport gate rejects restored utility-first arrangement. Screenshots and browser-results.json hold actual measurements. Map stays dominant on load; notebook entries precede guide/utilities. Longer form scroll carries fields/photos rather than decorative gaps. Independent review closed all confirmed findings; see REVIEW.md.

Final gate also caught a keyboard-input CSS regression: notebook full-width styling overrode the visuallyhidden Import input, making the1024px page1365px wide. The file-input rule now explicitly wins, retains nativekeyboardfocus, and is covered by the existing rendered overflow gate.

Live deployment and CI proof appended after release. Physical-device/fullscreen-reader tests and walking road/canal crossings are outside this audit; venue contact facts remain dated source snapshots.

## Shipped and live-verified

PR https://github.com/Nonarkara/bkk-co/pull/2 merged; feature7a6ff04, merge/source4e11de943574973e1cc6a663cd777cac8c600e63. Worker3fc3fdfa-b81b-45b7-974a-58d35679da0c, deployed from clean main with npx wrangler deploy.95new/changed assets uploaded,99reused;194actualpublicfiles byte-match this checkout. Legacydomain301/querypreservationpasses. Dailyprivacycleanup retained.

Read-only verifier: PLUB_RELEASE_REPORT=docs/audit-2026-11-03/live-bytes.json node scripts/verify-notebook-release.mjs (source/Worker supplied in environment). Live node test/check.mjs https://co.nonarkara.org passes. node test/audit-live.mjs passes at390/1024/1440/1280: dated exact-source disclosure, visible log action, selected-photo preview/viewer/keyboard close, anonymousaccount state; zeroAPIwrites and zeroJavaScripterrors. live-browser.json and live-facts screenshots record evidence. No synthetic public recommendations or cloud data created for this release audit.

GitHub branch/PR/main checks all passed:41583591537,41583612836,41583699876. This follow-up contains proof/docs only; runtime remains the byte-verified merge/source above. Independent finalCSScheck confirms1024pxpagewidth,359pxnotebookrail and keyboardImport working after file-input specificity fix.
