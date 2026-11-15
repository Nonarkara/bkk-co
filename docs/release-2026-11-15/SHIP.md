# PLUB · CL;UB — 15 November 2026

A day spent on the parts of a launch nobody sees: the policy, the lost reader,
the gates, and the claims the documents make.

Commit `b163dd8` · Worker `df7ad30b-14aa-4339-9a8f-f04c6d5ee3aa`

---

## 1. What was checked of the unified release

The other agent's work — PL;UB and CL;UB in one codebase, the cannabis venues
in a separate file — was verified rather than trusted.

| Claim | Checked | Result |
|---|---|---|
| The signed catalogue is untouched | sha256 of `places-work.json` against the manifest that publishes it | matches |
| The cannabis venues are separate | `public/data/places-cannabis.json`, 328 rows, loaded only in CL;UB mode | apart from the catalogue |
| The data is open | OSM and Overture only; no platform fields anywhere | holds |
| The deployed bytes match | `scripts/verify-live-bytes.mjs` on both domains | 408/408 and 407/407 |

## 2. The policy was three origins wider than the app

The Content-Security-Policy allowed Google Fonts, Google Maps, the Places API,
Overture and OpenStreetMap tiles. **The interface loads none of them.** The
fonts are self-hosted; the map reads `tiles.openfreemap.org` for its style,
tiles, glyphs and sprite; every Google reference in the code is an outbound
*link*, not a load.

So the policy granted exactly what an injected script did not need. It also
carried `script-src 'unsafe-inline'` for one inline script on one page, and
**no HSTS at all**.

Now:

```
default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline';
worker-src 'self' blob:; frame-src https://www.youtube-nocookie.com;
img-src/font-src/connect-src 'self' + https://tiles.openfreemap.org;
object-src 'none'; frame-ancestors 'none'; base-uri 'self';
form-action 'self'; upgrade-insecure-requests
```

with `Strict-Transport-Security: max-age=31536000; includeSubDomains`.

The one inline script moved to `public/neighbourhoods.js`, so `script-src` can
say `'self'` and mean it.

**Verified in the browser against the tightened policy:** the map renders with
its tiles, glyphs and sprite; the 3D world opens with its canvas at full size;
no page raises a policy refusal or a failed request.

## 3. A lost reader met an empty body

`/nope` answered 404 with nothing in it. There is now a designed page — the
house eyebrow, one line of truth, one filled primary action and three quiet
alternates — served by the Worker with the same headers as everything else,
while a missing *data* file stays a plain 404.

Alongside it: a `robots.txt` that points at a sitemap, allows `/v1` because
the read-only catalogue is public by design, and keeps crawlers out of the
write APIs and the bulk data; and a `sitemap.xml` naming the seven pages a
reader can land on, and never a private surface.

## 4. Three new gates, all in CI

| Gate | What it proves |
|---|---|
| `test/security-headers.mjs` | HSTS with a real max-age, no framing, no inline script on any shipped page, and every origin in every directive is one the interface loads |
| `test/public-surfaces.mjs` | robots → sitemap → real pages; the notebook stays unindexed; the 404 page declares its language, carries no inline script and offers a way back |
| `test/data-role-palette.mjs` | every mark is a colour the catalogue owns; the legend names exactly what the key shows; the accent has one job |

## 5. The gate's own bugs, twice

`scripts/ship.mjs` lost both of its fixes to a history rewrite by another
agent, and for two days the ship gate reported three failures that were the
*instrument's* bugs: it ran `PLUB_VENDOR_INDEX=1` as if it were the executable,
so two healthy tests looked broken, and it judged the planted-defect gate by
its exit code when that run exits 0 on purpose and reports what it caught.

Both fixes are back and committed. The lesson is written down: after a history
rewrite, read your fixes back out of the files.

## 6. Claims that were stale

`README.md` said the street sketch covered "five optional areas" and listed
five of the twelve that ship. `context.md` had the same claim. Both now say
twelve, and name them. The README also now introduces CL;UB and says what the
cannabis file is and is not.

## 7. The byte verifier learned about the one deliberate rewrite

`club.nonarkara.org` serves the same `index.html` with the CL;UB title and
description written into two meta tags. The verifier called that a mismatch
and exited 1, which taught everyone to ignore its verdict. It is now compared
apart from the rest and reported as a rewrite — a difference anywhere else is
still a mismatch.

## 8. Still honestly unfinished

- **The catalogue is thin.** 590 of 20,640 work places carry any documented
  working fact; 60 clear the coverage floor. Improved by people reporting,
  not by code.
- **Heights are exhausted** in the pinned snapshot: 320 explicit heights in
  the twelve areas, 248 inside the radius that ships. 244 are drawn as
  volumes; the other 4 are parent outlines drawn through the mapped
  height-bearing part inside them, so no building is extruded twice.
- **The palette is exhausted**: 32 of 33 catalogue colours have a job.
- **`club.nonarkara.org` is live on the Worker** — the record already points
  there. Both hosts answer 200 with a byte-identical `etag` and the same policy
  headers, and the CL;UB title and description are the ones the Worker writes
  for that host. The CNAME staged in the other repository stays the documented
  fallback path; it is not an open action.
