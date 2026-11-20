# PL;UB and CL;UB — the release of 21 November 2026

Two bureaus over one codebase: **PL;UB** at [co.nonarkara.org](https://co.nonarkara.org)
(where to work) and **CL;UB** at [club.nonarkara.org](https://club.nonarkara.org)
(where the licensed dispensaries are).

This release answers the second independent audit. A separate agent was given the
house design law and the running interface, and returned **REVISE** with seven
named findings. All seven were measured before they were touched, repaired, and
measured again — and closing them turned up an eighth defect that nobody had
reported: the two products' map colours were decided by the order of two
network requests.

| | |
|---|---|
| Worker | `ad014e9a-6c85-47d5-9e12-ab9645dfa08b`, from commit `8b382ac` |
| Domains | co · club · bkkco (301 to co) |
| Catalogue | 57,379 places, signed; 329 cannabis listings in a separate file, reproducible from its builder |
| Bytes on co | **412 / 412 matched**, 0 mismatched, 0 missing, 0 orphans — [proof](live-bytes-co.nonarkara.org.json) |
| Bytes on club | **411 / 411 matched**, 0 mismatched, 0 missing, 0 orphans, 1 file rewritten by the Worker — [proof](live-bytes-club.nonarkara.org.json) |
| Ship gate | **45 / 45 steps passed** — 37 suites from CI, the MSH gate and its planted twin, the pinned-source equality, the catalogue rebuild, the deploy, the byte comparison, the live URL — [report](../release/2026-11-21/ship-report.json) |
| Measured live | **18 / 18 checks** on the two public hosts — [the numbers are in the audit report](../msh-audit/2026-11-21/msh-report.json) |

## What the audit found

The auditor's verdict was REVISE. Two of its seven findings were about the
product lying to the reader, which is worse than anything it called cosmetic:

- **PL;UB said "0 places — no matches in view" while the catalogue was still
  loading**, and said it *for good* when the fetch failed, with nothing to
  press. Four loads in eight showed the empty sentence; a failure never
  recovered. The reader was told the city was empty.
- **CL;UB painted PL;UB's café list for 300–580 ms** in seven loads out of
  eight, on its way to being a cannabis directory.

The rest: the loading rail was 85 % blank; the rail was a full-height white
column with a 360×392 px flat slab below the last place — 43 % of the rail's
height; the 1024 map share sat at 60.37 % against a 60 % floor, four tenths of
a point of headroom; CL;UB's phone list toggle was 30×32 px and its Retry
button 42×22 px, on a host where the toggle is the only way to reach the list;
and MapLibre's expression evaluator was comparing `null` with a number on both
hosts.

## What was repaired

1. **Loading, failed and genuinely empty are three different facts.** The rail
   says "Loading the directory…" and paints a skeleton of the rows that are
   coming; it says "Directory unavailable" and offers a **Retry that really
   re-fetches**; and only says "no matches in view" when there are genuinely
   none. A failed directory stays failed until the reader asks again — a
   directory that flickers from unavailable back to loading on its own is a
   directory nobody can reason about. Verified live: a failed catalogue reads
   `unavailable` with a 52×44 px Retry, and pressing it brings back 48 places.
2. **CL;UB claims its mode from the URL, before any catalogue loads.** The
   cannabis host never hands the reader a café list on its way to being a
   directory. If the cannabis directory fails, the Retry re-frames the camera
   onto the listings that arrive — otherwise the reader is left looking at an
   empty Bangkok with a full directory behind it.
3. **The rail is a paper panel over the map, and it ends where its content
   ends.** The flat 360×392 px slab is gone; the map carries the space below
   the panel. The camera's centre is held where the reader can actually see it
   (`map.setPadding({left: 360})`), so the ground does not move when the panel
   changes shape, and `map.getBounds()` is corrected in one place so the list,
   the 3D hunt, the hat layer and the journey origins all agree on what is
   visible. Measured: 0 px of white below the last row, in both modes.
4. **CL;UB's preview is eight rows, with the rest one tap away** behind "Show
   12 more". Twenty rows filled the whole column at 1024 and took a third of
   the screen with them. The map is now the largest object on the screen in
   both modes.
5. **Thumbs.** CL;UB's phone list toggle and the Retry button are 44 px.
6. **The console is quiet.** Every count a feature may not carry is coalesced
   to a number, so MapLibre never compares `null` with one. The lens's own
   style is preloaded and fetched by the exact URL the page declares, so the
   window in which the basemap's expressions are evaluated against tiles that
   do not carry every property they read is closed. Measured over sixteen
   loads: **zero warnings, zero errors**.
7. **And the palette stopped being a race.** The manga lens brings PL;UB's
   ground with it whenever it installs, so the order of two network requests
   decided whether CL;UB wore PL;UB's Grand Budapest pink or CL;UB's Botanical
   Green. Claiming the mode earlier moved that race and exposed it. The mode's
   palette is now applied from one place, and reapplied whenever the lens
   installs. Verified: PL;UB `#f9c1ce` / `#f5ecc2`, CL;UB `#b5decc` /
   `#87c540`, on both the local build and the live hosts.

## What the gate now does that it did not do

- **A void is flat emptiness measured against what an element actually
  paints.** A container that merely holds a descendant's text paints nothing
  around it, and a hairline paints its edge, not its box. Marking those as
  occupied is exactly how a rail carrying one short list looked like a full
  screen of content.
- **A dead band is judged by its height, not only by its area.** A slab 43 % of
  the screen's height is 11 % of its area, so the area threshold alone let it
  through. The band rule now fails a flat empty band that runs down more than
  a third of the screen and is wide enough to be a column.
- **The map's share subtracts the panel, not the transparent column behind
  it** — what the reader cannot see of the map is the paper standing over it.
- **The cell-overlap test was wrong**: it required a cell to sit strictly
  inside a box, so the map's last column was never marked and a free strip
  down the edge of the screen masked the very band the band measure was
  looking for.

The gate still fails when it should. The planted run reports **18 caught
failures** on injected defects — and during this ship it caught a real
regression of ours: the lens's new style URL broke `test/manga-motion.mjs`,
which exercises the lens with no document to ask. That is the gate doing its
job, and the fix shipped with it.

## Measured now

| | 390px | 1024px | 1440px |
|---|---|---|---|
| PL;UB chrome | 11% | 16% | 16% |
| PL;UB map | 84% (net 82%) | **76%** (net 76%) | **82%** (net 81%) |
| CL;UB chrome | 12% | 15% | 15% |
| CL;UB map | 88% (net 87%) | **72%** (net 72%) | **79%** (net 78%) |
| Void, both modes | 3.1% | 2.4% | 2.8% |
| Basemap street lines | 115 / 6,210 | 172 / 15,483 | 215 / 19,437 |
| Camera | z16.8 / z12 | z16.8 / z12 | z16.8 / z12 |

Before this release both modes sat at **60.4 %** of the 1024 screen — four
tenths of a point over the floor. They now sit at 76 % and 72 %.

At 260px — a 390px phone at 150 % reader text — the search keeps 147 px, the
bar overflows by 0 px, and the page does not scroll sideways.

## Still honestly unfinished

- **GitHub CI cannot start.** Every job is refused with "recent account
  payments have failed or your spending limit needs to be increased". This is
  an owner action; the local ship gate is the only runner, and it is green.
- **The catalogue is thin.** Of the 20,640 work places, **579** carry opening
  hours — 2.8 %. (The 20 November record said 590; that figure is measured
  again here from the shipped catalogue and the gap is the same kind of gap.)
  The map knows where a place is long before anyone has said anything about
  it, and nothing in the interface pretends otherwise.
- **Heights are nearly absent.** Of 20,650 neighbourhood footprints, **248**
  carry an explicit height in the source and **244** are drawn as volumes; 6,163
  are knowable only as floor counts and 14,239 carry no height information at
  all. Nothing is invented, so the city is mostly flat. Overpass answers 406
  from this environment, so heights must come from the pinned offline snapshot.
- **The palette is nearly exhausted.** The Sanzo Wada catalogue owns **38**
  colours; **36** are already spoken for in the shipped interface. Two remain:
  Corinthian Pink `#f8b6ba` and Cerulian Blue `#0093a5`. A new category will
  have to borrow one, and one colour, one job.
- **CL;UB's second ink register is not modelled** by
  `test/data-role-palette.mjs`, which knows PL;UB's four marks. The rule that
  "every colour that marks a thing is a catalogue colour" is enforced for
  PL;UB and asserted, not enforced, for CL;UB.
- **Older release wording still reads as current.** `docs/release-2026-11-15/`
  is headed "What is deployed" in the present tense, and
  `docs/release-2026-11-18/README.md` is titled the release of the *19th* in
  the folder of the 18th.
- **The release records are dated in UTC.** `scripts/ship.mjs` and
  `scripts/verify-live-bytes.mjs` stamp their output with the UTC date, so a
  ship that lands at 01:15 Bangkok time is filed under the previous day and
  overwrites that day's evidence. This release was filed by hand under the day
  it actually happened; the scripts have not been changed, because the gate
  that produced the 45/45 above must be the gate that shipped.
