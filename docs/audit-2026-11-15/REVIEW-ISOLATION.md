# Review — PL;UB / CL;UB separation (commit 88e00f3)

**Checks.** `git show 88e00f3 --stat`; `git show 88e00f3 -- src/worker.js public/app.js public/views.js public/notebook.js`; read `src/worker.js` (catalogue L1–60, `postScore` L118–142, router L158/L167/L191); read `test/club-isolation.mjs` in full; ran `node test/club-isolation.mjs` → **PASS** (exit 0, summary line printed); grep/read `public/app.js` (clubMode, mode, idx, api/scores; L130–260, L300–330); grep `public/views.js` (L342–344). Two disclosed deviations from the read budget: three read-only git metadata queries (log/status/diff, to see what changed after the commit) and one `node -e` over the three `public/data/places-*.json` files to test catalogue overlap. Nothing was modified; nothing committed.

## Findings

### F1 [minor] The catalogue is picked by a caller-supplied parameter: the separation is per mode, not per host
- **File/line:** `src/worker.js:16-19` (`isClubRequest`), `public/app.js:67,251,860`, `src/worker.js:158`.
- **Says vs. actually:** the commit says "a PL;UB request never touches the cannabis file" and the summary reads "PL;UB (co.nonarkara.org) and CL;UB (club.nonarkara.org) keep separate catalogues at the server". `isClubRequest` accepts `?mode=club` on **any** hostname, and the PL;UB UI's own CL;UB toggle (`app.js:251,860`) writes that parameter onto `co.nonarkara.org`. So co.nonarkara.org does load `public/data/places-cannabis.json`, and since `worker.js:158` builds the notebook's trust boundary from `knownIds(env, request.url)` — the same query string — the PL;UB host accepts a dispensary id in the notebook/community API. The claim holds only for requests without `?mode=club`; the commit's own wording ("per mode") is accurate, the host-level reading and the title "the two bureaus are actually separate" are not.
- **Misleads:** anyone auditing by hostname, and any reader of the host-scoped claim.

### F2 [minor] The commit's place sheet called a detail-field count an "index" and kept the Great Good Place artwork
- **File/line:** 88e00f3 `public/app.js` (`renderSheet`, hunk `@@ -660,7 +667,7 @@`); `test/club-isolation.mjs:134`; HEAD `public/app.js:466,755`.
- **Says vs. actually:** the sheet showed a dispensary's `p.idx` as "CL;UB index · top N% of the listed venues" and still rendered the PL;UB petals plus the four-row working-conditions table — only the caption changed. `p.idx` for a cannabis row is the count of populated detail fields (0–4): `test/club-isolation.mjs:134` asserts `row[7] === [hours, web|social, tel, addr].filter(Boolean).length`; HEAD renders it "N/4 details" / "Source details · N of 4 fields". So a data-completeness count was presented as an index and ranked dispensaries by it, beside working-condition questions the commit says do not exist.
- **Misleads:** the CL;UB reader. HEAD (54cb696) has since replaced that sheet branch — the defect is in the commit as written, not in the shipped tree.

### F3 [minor] The dispensary guard is inert on PL;UB; the claim rests on catalogue hygiene alone
- **File/line:** `src/worker.js:127` (guard), `:51` (PL;UB `cat.cannabis` is `EMPTY`), `test/club-isolation.mjs:13,86`.
- **Says vs. actually:** on a PL;UB request `cat.cannabis.ids.has(...)` is always false, so rejection falls through to `validateScore` against the base ids. I checked the data directly: `places-work.json`/`places-food.json` kinds are `["cafe","restaurant","coworking","library"]`, with 0 cannabis-kind rows and 0 ids shared with `places-cannabis.json` — the claim holds today. The test proves it for one id only (`cannabis.rows[0][0]`), so catalogue drift would silently make a dispensary ratable on PL;UB.

### F4 [note] A mode-independent cache key holds a first-request-wins catalogue
- **File/line:** `src/worker.js:21,36-45,26`.
- `catalogues.base` is one module-level promise and `loadBase` builds its asset URL from the *first* request's origin, so whichever host reaches the isolate first supplies the work catalogue for both modes (the commit intends one copy). The test's ASSETS stub (`test/club-isolation.mjs:18-25`) ignores the hostname, so no test can detect it. Unverified: whether the two hosts serve identical `/data/places-work.json`.

### F5 [note] The client declares its mode to the server only on notebook calls
- **File/line:** `public/notebook.js:9` (appends `?mode=club`), `public/views.js:342,344` (rating POST sends no mode).
- On co.nonarkara.org in club mode the notebook is therefore in the CL;UB catalogue while the rating endpoint is in the PL;UB one; the only observable effect is the error string for a dispensary ("unknown place" instead of "not rated for working conditions"), since `views.js:342` posts no score when the form asks no working questions.

### F6 [note] Unverified, outside the read budget
- `src/notebook.js`'s use of the `knownIds` callback — whether a community entry published in club mode is filtered when read in PL;UB mode, i.e. whether a dispensary published from the PL;UB host can surface on a PL;UB surface. I did not read that file.

**No [major] finding.** No path was found where a cannabis id is rated, entered into the notebook, published, or counted on a PL;UB-mode surface: the base catalogue is work+food only (verified against the data files), the cannabis file is fetched only in club mode, `postScore` refuses a dispensary on both hosts, a dispensary preview never carries a Great Good Place index, and the client asks a dispensary no working questions.

## Verdict
**PARTIAL.** The separation is real, not prose: the server loads work+food only for a PL;UB request and adds the cannabis file only for a club request (verified in `src/worker.js:36-59` and by the passing `test/club-isolation.mjs`), no dispensary id exists in the base catalogue (checked directly against the three data files), a dispensary is refused on both hosts with different and appropriate messages, and the client asks it no working questions. Two sentences overstate it: "a PL;UB request never touches the cannabis file" is true only per mode and not per host, because `?mode=club` on co.nonarkara.org loads the cannabis catalogue and lets that host accept dispensary ids in the notebook API; and the commit's "CL;UB index" caption presented a 0–4 detail-field count as an index next to Great Good Place petals and a working-conditions table (already replaced at HEAD). Remaining unverified, caused by the read budget rather than by a defect: whether the notebook/community feed filters club-mode entries when read in PL;UB mode, and whether the two hosts serve byte-identical work catalogues (F4). Nothing was fixed; the audited files are untouched.
