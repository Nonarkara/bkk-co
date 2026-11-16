# PLUB · CL;UB — launch readiness, 15 November 2026

The state of the system on the morning of a public launch, and what is still
honestly unfinished. Commit `fcda6f4` · Worker `f9ebb73e-374b-4b9f-8a33-839866c2ef51`.

---

## 1. Two bureaus, one codebase, two data sets

| | PL;UB | CL;UB |
|---|---|---|
| Domain | https://co.nonarkara.org | https://club.nonarkara.org |
| Question | Where can I work? | Where are the licensed dispensaries? |
| Data | the signed catalogue, 57,379 places | `public/data/places-cannabis.json`, 328 venues across Thailand |

The cannabis venues never enter the signed catalogue. The catalogue's sha256
still matches the manifest that publishes it, and `test/venue-reports.mjs` and
`test/check.mjs` both hold that line.

The cannabis catalogue is likewise the builder's output and not a hand-kept
file: `scripts/build-cannabis.py` reproduces the shipped bytes exactly, its
digest is published in `public/data/manifest-cannabis.json`, and
`test/cannabis-catalogue.mjs` holds that line in CI.

**The separation is real, not a promise.** The Worker keeps two catalogues. A
request that asks for PL;UB loads the work catalogue and never touches the
cannabis file; a request that asks for CL;UB — the club host, or `?mode=club`,
which the interface's own toggle sets — loads that file as well. So a
dispensary is not a ratable PL;UB place, a shared link to one resolves in CL;UB
mode and not in PL;UB mode, and the place sheet counts a dispensary's listed
details rather than giving it PL;UB's Great Good Place index. `test/club-isolation.mjs` drives the
Worker, counts the files it fetched and checks that no dispensary id is in
PL;UB's catalogue at all.

CL;UB answers "where are the licensed dispensaries", not "can I work there", so
a dispensary carries no working conditions and nothing on it to score: the
rating endpoint refuses one, and the visit form asks no Wi-Fi, outlet, quiet or
laptop questions there. It does carry the open map tags it inherits from
OpenStreetMap and Overture — opening hours on 76 of the 328, a Wi-Fi tag on 13.

## 2. The security posture, as it now stands

| Header | Value |
|---|---|
| `Content-Security-Policy` | `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; worker-src 'self' blob:; frame-src https://www.youtube-nocookie.com; img-src 'self' data: blob: https://tiles.openfreemap.org; font-src 'self' https://tiles.openfreemap.org; connect-src 'self' https://tiles.openfreemap.org; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'; upgrade-insecure-requests` |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` |
| `X-Frame-Options` | `DENY` |
| `X-Content-Type-Options` | `nosniff` |
| `Referrer-Policy` | `strict-origin-when-cross-origin` |
| `Permissions-Policy` | geolocation only, on self; camera, microphone, payment, USB and every sensor off |

**What changed and why.** The policy previously allowed Google Fonts, Google
Maps, the Places API, Overture and OpenStreetMap tiles. The interface loads
none of them: the fonts are self-hosted, the map reads `tiles.openfreemap.org`
for its style, tiles, glyphs and sprite, and every other Google reference is an
outbound *link*, not a load. The policy was three origins wider than the app
needed, which is exactly what an injected script was allowed to reach.

`script-src` is now `'self'` with no `'unsafe-inline'`. The one inline script
in the repository — on the neighbourhood page — moved to
`public/neighbourhoods.js`. `object-src 'none'` and `upgrade-insecure-requests`
are new, and HSTS says that a browser which has seen this once will not try
plain HTTP again.

Verified in the browser against the tightened policy: the map renders with its
tiles, glyphs and sprite; the 3D world opens with its canvas at full size; no
page raises a policy violation or a failed request.

`test/security-headers.mjs` holds all of it: HSTS with a real max-age, no
framing, no inline script on any shipped page, and **every origin in every
directive must be one the interface actually loads**.

## 3. What the gates now cover

`scripts/ship.mjs` runs the whole gate in one command and reads its test list
out of `.github/workflows/notebook.yml`, so the local gate and CI cannot fall
out of step. A step that cannot run is marked SKIP, never PASS.

| Gate | What it proves |
|---|---|
| 36 test suites from CI | the model, the catalogue, the notebook, the API, the palette, the platform law, the headers, the separation of the two bureaus, the CL;UB catalogue's lock |
| `scripts/audit-msh.mjs` | chrome ≤34 %, map ≥60 %, no void, no orphan column, no inflated box, no Thai name without its face |
| `scripts/audit-msh.mjs --planted` | the gate can still fail |
| `python3 test/street-world-source.py` | every shipped footprint equals the pinned OpenStreetMap source |
| `scripts/verify-cannabis-rebuild.mjs` | the shipped CL;UB catalogue is what its builder produces, byte for byte |
| `scripts/verify-live-bytes.mjs` | every deployed byte equals the repository |

**405 / 405 bytes matched, 0 mismatched, 0 missing, 0 orphans** at `fcda6f4`.

## 4. The honesty rules, still enforced

- The signed catalogue carries a sha256 the manifest publishes. Curated visit
  evidence lives in `public/data/venue-reports.json` and is never written back
  into the catalogue.
- A dimension with no evidence stays unknown. It is never scored zero.
- The on-site report is a named, dated, first-hand account with six sources,
  each with a tier. It is published through `/v1` and shown on the place sheet
  beside the map's own evidence, never merged into it.
- No platform data ships, and no shipped code can render a platform rating.
  `test/no-platform-scraping.mjs` checks the files, the scripts, the
  stylesheets, the Worker's API calls and the catalogue.
- Every colour that marks a place is a colour the Sanzo Wada catalogue owns.
  `test/data-role-palette.mjs` reads the proved catalogue and checks the
  marks, the legend's sentence, the ink blends and the accent's single job.
- The street-world manifest names the extraction cache that actually holds its
  geometry, recomputed from the area list, and the raw-source test asserts the
  named cache holds all twelve neighbourhoods.

## 5. What is still honestly unfinished

- **The catalogue is thin.** Only 590 of 20,640 work places carry any
  documented working fact, and 60 clear the coverage floor. This is the single
  most valuable thing left to improve, and it is improved by people reporting
  what they find, not by code.
- **Heights are exhausted.** The pinned snapshot holds 320 buildings with an
  explicit height in the twelve areas; 248 fall inside the radius that ships.
  244 are drawn as volumes. The other 4 are parent outlines whose volume is
  drawn once, on the mapped height-bearing part inside them, so the same
  building is never extruded twice. More volume means a newer snapshot or a
  decision to accept a floor count as a height. PLUB takes neither on its own.
- **The palette is exhausted.** 32 of the catalogue's 33 colours already have a
  job. The next category needs the grounds re-planned, not a new hex.
- **Overpass is unreachable from this machine**, so live enrichment runs
  cannot happen here; the pinned snapshot is the only source.

`club.nonarkara.org` is no longer on this list: the record already points at
the Worker. Both hosts answer 200 with a byte-identical `etag`, the same
policy headers, and the CL;UB title and description the Worker writes for that
host. The staged CNAME in the other repository remains the documented
fallback path, not an open action.
