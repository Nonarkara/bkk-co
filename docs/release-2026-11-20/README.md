# PL;UB and CL;UB — the release of 20 November 2026

Two bureaus over one codebase: **PL;UB** at [co.nonarkara.org](https://co.nonarkara.org)
(where to work) and **CL;UB** at [club.nonarkara.org](https://club.nonarkara.org)
(where the licensed dispensaries are).

This release answers an independent audit. A separate agent was given the house
design law and the running interface, and returned **REVISE** with fourteen
named offenders. Every one was measured before it was touched, repaired, and
measured again. The gate was taught to see what that auditor saw, because the
old gate's PASS was disputed on five specific grounds.

| | |
|---|---|
| Worker | `b1ad11b8-1ae4-481b-b806-ec85d237496b`, from commit `1277cda` |
| Domains | co · club · bkkco (301 to co) |
| Catalogue | 57,379 places, signed; 329 cannabis listings in a separate file, reproducible from its builder |
| Bytes on co | **412 / 412 matched**, 0 mismatched, 0 missing, 0 orphans — [proof](live-bytes-co.nonarkara.org.json) |
| Bytes on club | **411 / 411 matched**, 0 mismatched, 0 missing, 0 orphans, 1 file rewritten by the Worker — [proof](live-bytes-club.nonarkara.org.json) |
| Ship gate | **45 / 45 steps passed** — 37 suites from CI, the MSH gate and its planted twin, the pinned-source equality, the catalogue rebuild, the deploy, the byte comparison, the live URL — [report](../release/2026-11-20/ship-report.json) |

## What the audit found

The auditor's verdict was REVISE and its fourteen offenders were measured, not
described. The two that mattered most were not cosmetic:

- **CL;UB opened on the whole country.** The cannabis directory fitted all 329
  listings into one view: **4,259 metres per pixel**, with 88.7% of the phone
  screen carrying three cluster numbers and no street line-work. The map was
  a field with numbers on it. At 1440 the same view sat at zoom 6.4.
- **The filter strip hid the filters.** Ten chips in a horizontal scroller
  335px wide, inside a 360px rail, with the scrollbar removed: 540px of
  content hidden, six filters invisible, and "Crossing paths" cut mid-word.
  `nav.chips` put "Food" at x=287–353 on a 320px phone and sliced "Library"
  at 260px.

The rest: a 🌙 emoji where the house mark is a hairline glyph; MapLibre's own
blue focus ring (`rgb(0,150,255)`) on every map control; Einstein tiles at
91×26px, under the house chip height; a search field with `outline: none` and
no focus indicator at all; "3D Hunt" twice, 94px apart; a distance three
quarters of an hour away written "~73210 m"; and a rail of flat white at
360×504px on CL;UB against 360×255px on PL;UB.

## What was repaired

1. **CL;UB opens on the metro, never the country.** The landing camera is zoom
   12, centred on the median of the 160 Bangkok listings — **37.1 m/px**, with
   6,210 basemap street lines drawn on the first screen and 70 listings in
   view. The zoom was chosen by measuring zooms 11 to 14, not by taste. The
   national view stays reachable, but as an action the reader takes:
   **☷ All Thailand · 329**, in the hotspot disclosure. Verified: z12 → z5.11.
2. **The filter strip lives inside the one Explore disclosure**, as wrapped
   rows — ten filters in four rows, every chip whole, nothing hidden, nothing
   outside the rail, in both modes, at 390 and at 1440. The rail header keeps
   the actions and the scope row, and stays inside the repo's own 128px rule
   for it. Ten chips cannot fit one 360px rail row; visible-when-opened beats
   hidden-in-a-scrollbar.
3. **The category row wraps**, so a category is never pushed past the
   viewport at 320px or sliced at 260px.
4. **☾, not 🌙** — in all three places the late-night mark appears.
5. **The house focus ring, in the bureau's own ink.** MapLibre's blue
   `#0096ff` box-shadow is gone; a 2px ink outline takes its place, and CL;UB
   rings in Deep Slate Olive, never in PL;UB's Pansy Purple. The search field
   has the same ring — it had none at all.
6. **Einstein tiles are 32px**, the house chip height.
7. **One 3D Hunt**, in the top bar.
8. **Distances are read at a glance**: metres under a kilometre, kilometres
   above it.
9. **The repeated section is gone.** "Talk of the town & Research" repeated
   three Explore destinations; it and its CSS were removed.
10. **The type scale is rem** (`1.25 / 0.875 / 0.75 / 0.6875rem`) with
    `text-size-adjust: 100%`, and every control that holds text has a
    `min-height`. Measured at a reader's 16 / 20 / 24 / 32px: chrome 16.1 /
    21.1 / 22.8 / 26.2%, map 83.9 / 78.9 / 77.2 / 73.8%, **zero clipped text,
    zero chips outside the viewport, no sideways scroll** at every size.
11. **The CSP no longer eats restored photos.** `connect-src` refuses `data:`
    URLs, so a photo restored from a backup never arrived. The bytes are now
    decoded rather than fetched. The policy is not weakened.
12. **Every page has a favicon, and `/favicon.ico` answers** — it was a 404 on
    every page view of both hosts.

## What the gate now does that it did not do

The old gate's PASS was disputed on five grounds, and each one is now a
threshold it actually enforces:

- **The rail column counts as chrome**, not just the top and bottom bands.
- **A void is the largest free rectangle**, not the longest free row.
- **A filter strip is measured with its disclosure open** — every chip whole,
  nothing hidden, nothing outside. This is a stronger check than the old one,
  which could not see the strip at all.
- **A map share needs a content floor**: the first screen must draw at least
  40 basemap street lines, or the map is a field and not a place. CL;UB at
  country scale drew 16.
- **CL;UB is audited as a second mode**, at every viewport, with its own
  verdict. The old instrument never opened it.
- **The basemap wait asks for the line-work the verdict measures**, twice, so
  a screen that has not painted yet is not called empty.

The gate still fails when it should: the planted run reports **22 caught
failures** on injected defects.

## Measured now

| | 390px | 1024px | 1440px |
|---|---|---|---|
| PL;UB chrome | 11% | 16% | 16% |
| PL;UB map | 84% (net 82%) | 61% (net 60%) | 71% (net 70%) |
| CL;UB chrome | 11% | 15% | 15% |
| CL;UB map | 89% (net 88%) | 61% | 71% |
| Void, both modes | 4.2% | 4.2% | 4.2% |
| Basemap street lines | 115 / 6,210 | 155 / 10,596 | 207 / 15,453 |
| Camera | z16.8 / z12 | z16.8 / z12 | z16.8 / z12 |

At 260px — a 390px phone at 150% reader text — the search keeps 147px, the
bar overflows by 0px, and the page does not scroll sideways.

## Still honestly unfinished

- **GitHub CI cannot start.** Every job is refused with "recent account
  payments have failed or your spending limit needs to be increased". This is
  an owner action; the local ship gate is the only runner, and it is green.
- **The catalogue is thin.** Only **590 of 20,640** work places carry any
  documented working fact, and **60** clear the coverage floor. This is the
  single largest gap in the product and it is not a code problem — it is
  people reporting what they find.
- **Heights are nearly absent.** Of 20,650 neighbourhood footprints,
  **248** carry an explicit height in the source and **244** are drawn as
  volumes; 6,163 are knowable only as floor counts and 14,239 carry no height
  information at all. Nothing is invented, so the city is mostly flat.
  Overpass answers 406 from this environment, so heights must come from the
  pinned offline snapshot.
- **The palette is nearly exhausted.** The Sanzo Wada catalogue owns **38**
  colours; **36** are already spoken for in the shipped interface. Two remain.
  A new category will have to borrow one, and one colour, one job.
- **CL;UB's second ink register is not modelled** by
  `test/data-role-palette.mjs`, which knows PL;UB's four marks. The rule that
  "every colour that marks a thing is a catalogue colour" is enforced for
  PL;UB and asserted, not enforced, for CL;UB.
- **Older release wording still reads as current** in
  `docs/release/2026-11-15/SHIP.md` and `docs/release/2026-11-18/`.
