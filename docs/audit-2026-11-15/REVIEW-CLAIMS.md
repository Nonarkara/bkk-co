# Claims audit — 15 November 2026

Independent audit of the public claims against the shipped system. Read-only: no
file was modified except this report. No browser was run; the audit used the
three permitted data files, `src/`, the release proof and five read-only live
requests to the two public domains.

Checked: `README.md` — **mostly honest**: 57,379, twelve areas, 120 photos, 100 hop notes, both domains and the separate CL;UB file all verified; one attribution off (finding 7).
Checked: `context.md` — **honest**: its older counts carry dates; the 100-visit / 100-hop / 200-report / 5-consenting-account rules match `src/notebook.js`; one stale figure (finding 6).
Checked: `STYLE.md` — **honest**: colours, sizes and the 240 ms manga lens are design law, not capability claims; one register with no subject (finding 8).
Checked: `AGENTS.md` — **honest**: twelve neighbourhoods confirmed live (`/v1/neighbourhoods` → 12); `ship.mjs` does read the workflow; the MSH and byte gates exist as described.
Checked: `public/data/manifest.json` — **internally consistent**: 57 379 = 20 160 + 57 + 423 + 36 739; 7 379 + 50 159 + 1 hand − 74 dropped − 86 merged = 57 379.
Checked: `public/data/street-world.json` (manifest key only) — 12 areas, 20 650 footprints, 248 explicit heights; one field disagrees with the launch note (finding 4).
Checked: `public/data/height-coverage.json` — **internally consistent**: the twelve area rows sum exactly to 20 650 / 248 / 6163 / 14 239, supporting LAUNCH's 320 → 248.
Checked: `docs/release-2026-11-15/LAUNCH.md` — **partly stale**: security table, byte count and suite count no longer match the shipped system (findings 2, 3, 5); the "honest unfinished" section is otherwise candid.

## Findings
### [major] The CL;UB data file is loaded on every request, not only in CL;UB mode
- Document: `docs/release-2026-11-15/LAUNCH.md:18-20`
- What it says: "The separate file is loaded only when someone asks for the CL;UB mode."
- What the system does: `src/worker.js:15-20` fetches `places-work`, `places-food` **and** `places-cannabis` in one loop on every catalogue load, on every host, merging all three into one id set; `src/worker.js:88-90` validates `place` against that set on the rating endpoint. The asset is also public on the main domain (`GET co.nonarkara.org/data/places-cannabis.json` → 200). Live: the file holds 261 rows, so LAUNCH's count is right — the isolation claim is what fails.
- Who is misled: a reviewer told the two bureaus' data never meet, and a reader who believes a dispensary can never be rated — its id is a valid `place` for `POST /api/scores`. (Whether the UI exposes that is not verified.)

### [major] The open DNS action for club.nonarkara.org is already done
- Document: `docs/release-2026-11-15/LAUNCH.md:103-106`
- What it says: club.nonarkara.org "is served by the Worker and answers 200, but the CNAME the other repository stages is still the documented path for the GitHub Pages fallback. Someone with DNS access should point the record at the Worker".
- What the system does: the live club response carries byte-identical `content-security-policy`, `strict-transport-security`, `permissions-policy` and `etag` to co.nonarkara.org, and its meta description is exactly the string the Worker writes for club mode (`src/worker.js:170`). The release folder's own proof ran against `origin: https://club.nonarkara.org`. The record already points at the Worker.
- Who is misled: the owner is sent to do DNS work that is finished, and a reader concludes the CL;UB site is a GitHub Pages fallback whose content may drift from the Worker's.

### [minor] The byte-proof numbers in the launch note are two commits stale
- Document: `docs/release-2026-11-15/LAUNCH.md:68` (and `:4`)
- What it says: "405 / 405 bytes matched, 0 mismatched, 0 missing, 0 orphans at `fcda6f4`."
- What the system does: the proof shipped beside it, `docs/release-2026-11-15/live-bytes.json`, records `matched: 407`, source commit `2d3df78`, observed `2026-11-15T08:37:15Z`; repository HEAD is `b163dd8`. The live bytes match 2d3df78, not fcda6f4.
- Who is misled: anyone re-running the verifier expecting 405 files, or treating fcda6f4 as the shipped source commit.

### [minor] The CI suite count is 35, not 32
- Document: `docs/release-2026-11-15/LAUNCH.md:62`
- What it says: "32 test suites from CI".
- What the system does: `.github/workflows/notebook.yml` lists 35 distinct invocations (34 `node test/…` plus `python3 test/enrichment.py`), and `scripts/ship.mjs:48,76` reads that list and prints its count, so the gate reports 35.
- Who is misled: a reader checking the release doc against the gate output sees a mismatch and cannot tell which number is the gate's.

### [minor] "all 248 are drawn" is not what the shipped manifest says
- Document: `docs/release-2026-11-15/LAUNCH.md:96-98`
- What it says: "248 fall inside the radius that ships and all 248 are drawn."
- What the system does: `public/data/street-world.json` ships `explicitHeightCount: 248` but `renderedHeightCount: 244`; `public/data/height-coverage.json` confirms 248 explicit heights exist in source and ship (`heightsShippedButNotInSource: 0`). The two shipped files disagree about how many become volumes.
- Who is misled: a reader of the launch note overstates 3D volume coverage by four buildings, and no shipped file explains the gap.

### [minor] The quoted Content-Security-Policy is not the shipped one
- Document: `docs/release-2026-11-15/LAUNCH.md:26`
- What it says: `img-src/font-src/connect-src 'self' + https://tiles.openfreemap.org`.
- What the system does: the live header is `img-src 'self' data: blob: https://tiles.openfreemap.org`. The substance holds (no origin beyond openfreemap, `script-src 'self'`, `object-src 'none'`, HSTS, `X-Frame-Options: DENY` all confirmed live) — the quoted string omits `data:` and `blob:`.
- Who is misled: someone reproducing the quoted policy verbatim would ship a stricter policy that blocks data-URI and blob images (photo previews, the 3D canvas).

### [minor] The Wi-Fi tag count in the data contract is 530, not 535
- Document: `context.md:66`
- What it says: "Only 535 carry a Wi-Fi tag".
- What the system does: `public/data/manifest.json` says `wifiTagged: 530`, and the live manifest agrees. The rest of that section checks out (`parkingNearby` 16 625, `hoursTagged` 1 558 ≈ "~1,500").
- Who is misled: a reader of the data contract quotes a number the published manifest does not carry.

### [minor] README attributes all 57,379 places to OSM and Overture
- Document: `README.md:11`
- What it says: "57,379 … from OpenStreetMap and Overture Maps".
- What the system does: `manifest.json` `bySource` is `osm 7379`, `overture 50159`, `hand 1` — one venue is a visitor-confirmed hand pin, not on OpenStreetMap (`context.md`, "Hand pins").
- Who is misled: a reader counting provenance misses that a third source exists.

### [minor] STYLE.md lists a Chinese register the product has none of
- Document: `STYLE.md:45`
- What it says: "ZH: Simplified." under Voice.
- What the system does: the shipped front end contains 0 Chinese characters across `public/*.js` and `public/*.html`; Thai is present (2 696 characters; `index.html`/`day.html` carry `lang="th"`). STYLE.md is a design law, so this is a rule without a subject rather than a false capability.
- Who is misled: a reader who takes STYLE.md as a statement of what ships.

## Not independently verified
- "50 + 50 cafés" (`README.md:22`) — `public/data/discovery.json` is outside the files this audit was allowed to read; the two documents agree with each other.
- "Only 590 of 20,640 work places carry any documented working fact, and 60 clear the coverage floor" (`LAUNCH.md:91-92`) — 20,640 checks out against the manifest; the 590 and 60 need the venue evidence file, also out of bounds.
