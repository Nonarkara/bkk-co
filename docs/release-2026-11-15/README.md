# PL;UB and CL;UB — the release of 15 November 2026

Two bureaus over one codebase: **PL;UB** at [co.nonarkara.org](https://co.nonarkara.org)
(where to work) and **CL;UB** at [club.nonarkara.org](https://club.nonarkara.org)
(where the licensed dispensaries are).

## What is deployed

| | |
|---|---|
| Worker | `f80e93e2-9f33-4d2a-bf35-7c6860684da8`, from commit `6059a9b` |
| Domains | co · club · bkkco (301 to co) |
| Catalogue | 57,379 places, signed; the live read-only API passes |
| CL;UB catalogue | 261 venues in `public/data/places-cannabis.json`, loaded only in CL;UB mode |
| Bytes on co | **408 / 408 matched**, 0 mismatched, 0 missing, 0 orphans — [proof](live-bytes-co.nonarkara.org.json) |
| Bytes on club | **407 / 407 matched**, 0 mismatched, 0 missing, 0 orphans, 1 file rewritten by the Worker — [proof](live-bytes-club.nonarkara.org.json) |

The one rewrite is `index.html`: the Worker writes the CL;UB title and description
into the same page for that host. Everything else is byte-identical to this
repository.

## The two bureaus are actually separate

The document used to say the cannabis file "is loaded only when someone asks for
the CL;UB mode". It was not true: the Worker loaded it on every request on every
host. It is true now. A PL;UB request never touches the cannabis catalogue, a
dispensary is not a ratable place, a shared link to one resolves on CL;UB and not
on PL;UB, and the place sheet calls a dispensary's score a CL;UB index rather
than PL;UB's Great Good Place index. `test/club-isolation.mjs` drives the Worker
and counts the files it fetched.

## What the gates say

- 35 test suites from CI, read out of `.github/workflows/notebook.yml` so the
  local gate and CI cannot fall out of step.
- MSH measured at 390 / 1024 / 1440: chrome 6%, map 65–89%, no void, no orphan
  column, no bleed — and at 260px, which is a 390px phone at 150% text.
- The planted MSH run catches all 10 planted defects.
- Every shipped footprint equals the pinned OpenStreetMap source, byte for byte.

## What is still open

- **GitHub CI cannot start.** Every job is refused with "recent account payments
  have failed or your spending limit needs to be increased". The workflow is
  correct; the account is not. Until that is settled, the local gate
  (`node scripts/ship.mjs`) is the only runner, and it uses the same list.
- **The type scale is in pixels**, so a reader who enlarges text through the
  operating system sees no change; browser zoom still works. The bar now wraps
  rather than crushing the search at a narrowed layout — the search keeps 161px
  of a 260px screen instead of vanishing — but honouring the reader's own font
  size means re-planning the type scale in `rem` and re-measuring every
  viewport. That is the next piece of work, not something to slip into a launch.
- **The catalogue is thin**: 590 of 20,640 work places carry a documented working
  fact and 60 clear the coverage floor. People reporting what they find improves
  this; code does not.
- **Heights are exhausted** in the pinned snapshot: 320 explicit heights in the
  twelve areas, 248 inside the radius that ships, 244 drawn as volumes. The
  other 4 are parent outlines drawn through the mapped height-bearing part inside
  them, so no building is extruded twice.
- **The palette is exhausted**: 32 of the catalogue's 33 colours have a job.

## The other CL;UB build

The original mixed build is preserved on the private `club-source` branch. The
separate public [CL;UB repository](https://github.com/Nonarkara/club) publishes
only its static directory and its open-data extract and is
[live on GitHub Pages](https://nonarkara.github.io/club/). It remains a
fallback path: `club.nonarkara.org` is served by the Worker, with a
byte-identical `etag` and the same policy headers as `co.nonarkara.org`, and the
CL;UB title and description are the ones the Worker writes for that host. The
`custom-domain` branch stages the CNAME for the Pages fallback.
