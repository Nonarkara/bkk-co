# PL;UB and CL;UB — the release of 18 November 2026

Two bureaus over one codebase: **PL;UB** at [co.nonarkara.org](https://co.nonarkara.org)
(where to work) and **CL;UB** at [club.nonarkara.org](https://club.nonarkara.org)
(where the licensed dispensaries are).

This release is the result of auditing what other agents had built over three
days, measuring the live interface rather than trusting its own reports, and
repairing every offender that was found.

| | |
|---|---|
| Worker | `7bae4c6b-4451-44a3-b966-6fd9da42ac09`, from commit `44655cb` |
| Domains | co · club · bkkco (301 to co) |
| Catalogue | 57,379 places, signed; 329 cannabis listings in a separate file, reproducible from its builder |
| Bytes on co | **412 / 412 matched**, 0 mismatched, 0 missing, 0 orphans — [proof](live-bytes-co.nonarkara.org.json) |
| Bytes on club | **411 / 411 matched**, 0 mismatched, 0 missing, 0 orphans, 1 file rewritten by the Worker — [proof](live-bytes-club.nonarkara.org.json) |
| Ship gate | **45 / 45 steps passed** — 37 suites from CI, the MSH gate and its planted twin, the pinned-source equality, the catalogue rebuild, the deploy, the byte comparison, the live URL — [report](../release/2026-11-18/ship-report.json) |

## What the survey found

Twenty-eight commits landed between 16 and 18 November: a compact three-row
sidebar rail, the Einstein tile layer, the 3D scavenger hunt, a Thailand-wide
cannabis directory with the DTAM register, per-neighbourhood Wada chords, a
late-night category, and a much quieter top bar. The work was real. It also
came with **no new gates** in twenty-eight commits, and with evidence that did
not cover the code it claimed to cover.

## What was repaired

Each of these was measured on the running system before it was touched.

1. **A whole feature set was unreachable on the cannabis host.** The Explore
   disclosure was hidden at 900px and wider, which took Featured places, the
   50 + 50 source lists, the street sketch, the map views, the map key and
   Research & data off `club.nonarkara.org` with it. The rule that hid the
   whole actions row was the very one that the commit claiming to fix it had
   added.
2. **Half the cannabis rail was dead space.** CL;UB's rail holds one group
   where PL;UB holds four, so a three-row preview left **452px** of white
   space below the list. The group now previews a page of its own and opens
   ordered by how much the source says about each place — at a country-wide
   view, "near the map centre" means near the middle of Thailand.
3. **PL;UB's controls leaked into the cannabis bureau.** The working-day mood
   filters stayed on screen there, filtering nothing, and PL;UB's neighbourhood
   labels — which carry a mood suffix — were drawn over the cannabis map, on
   top of the counts they collided with.
4. **The neighbourhood composition bar was broken.** It computed `flex: NaN` and
   read *undefined Late night*: late night is an overlay on the open map, not
   a kind in the catalogue.
5. **CL;UB wore the wrong bureau's palette.** Twenty-six elements on the
   cannabis host carried PL;UB's Pansy Purple while its map was Botanical
   Green. The club now speaks its own register — Deep Slate Olive and Dark
   Medici Blue, both proved catalogue colours.
6. **Asset version strings were hand-written and had drifted**, so a changed
   file could keep serving its old bytes. `scripts/stamp-assets.mjs` now
   stamps every reference with the fingerprint of the file it points at, and
   the gate fails when a stamp is out of date.
7. **The map's cluster counts were unexplained.** The Key now says that a
   number is the count of matching listings grouped in that area — not a
   venue, not a score.
8. **The ship gate could only run once a day**: it wrote its own evidence into
   the repository, so the next run found a dirty tree and refused to start.

## What the gates say now

- 37 suites from CI, read out of `.github/workflows/notebook.yml` so the local
  gate and CI cannot fall out of step.
- MSH measured at 390 / 1024 / 1440: chrome 11.3% / 5.9% / 5.9%, map 84% /
  61% / 71%, no void, no orphan column, no bleed — and at 260px, which is a
  390px phone at 150% text, where the search keeps 147px and nothing bleeds.
- The planted MSH run catches all 11 planted defects.
- Every shipped footprint equals the pinned OpenStreetMap source, byte for byte.
- The CL;UB catalogue is what its builder produces, byte for byte, and its
  digest is locked by `public/data/manifest-cannabis.json`.
- Every asset reference carries the fingerprint of the file it points at.

## Still honestly unfinished

- **GitHub CI cannot start.** Every job is refused with "recent account
  payments have failed or your spending limit needs to be increased". The
  workflow is correct; the account is not. Until that is settled, the local
  gate is the only runner, and it uses the same list.
- **The type scale is in pixels**, so a reader who enlarges text through the
  operating system sees no change; browser zoom still works. Honouring the
  reader's own font size means re-planning the scale in `rem` and re-measuring
  every viewport. That is the next piece of work.
- **The catalogue is thin**: 590 of 20,640 work places carry a documented
  working fact and 60 clear the coverage floor. People reporting what they
  find improves this; code does not.
- **Heights are exhausted** in the pinned snapshot: 320 explicit heights in the
  twelve areas, 248 inside the radius that ships, 244 drawn as volumes.
- **Seven browser tests fail, and all seven failed before this release too.**
  They are not in CI and were not introduced here: `atlas-edges` (a
  co-located cluster missing), `atlas-live` and `audit-browser` (timeouts on
  the sign-in and hand-pin surfaces), `community-browser` (an assertion on the
  community sheet), `footprint-neighborhood-browser` (the test injects an inline
  script that the shipped Content-Security-Policy correctly refuses), and
  `footprint-source-recovery` and `footprint-zoom` pass once pointed at a
  running server. Each was reproduced on the pre-release tree.
