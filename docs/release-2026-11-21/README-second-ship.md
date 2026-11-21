# PL;UB and CL;UB — the release of 21 November 2026

Two bureaus over one codebase: **PL;UB** at [co.nonarkara.org](https://co.nonarkara.org)
(where to work) and **CL;UB** at [club.nonarkara.org](https://club.nonarkara.org)
(where the licensed dispensaries are).

This day had two ships, because there were two audits to answer. The second
independent audit returned **REVISE** with seven findings; all seven were
repaired and shipped in the morning, and closing them turned up an eighth
defect nobody had reported — the two products' map colours were decided by the
order of two network requests. The third independent audit, run on that build
with its own instrument, returned **REVISE** again with five more. Two of them
were HIGH, and both were the same mistake seen twice: **the rail is a paper
panel laid over the map, and the rest of the product still assumed it was a
column standing in front of it.**

| | |
|---|---|
| Worker | `86441033-c973-46a6-947a-12662dfbaa46`, from commit `d085ace` |
| Domains | co · club · bkkco (301 to co) |
| Catalogue | 57,379 places, signed; 329 cannabis listings in a separate file, reproducible from its builder |
| Bytes on co | **412 / 412 matched**, 0 mismatched, 0 missing, 0 orphans — [proof](live-bytes-co.nonarkara.org.json) |
| Bytes on club | **411 / 411 matched**, 0 mismatched, 0 missing, 0 orphans, 1 file rewritten by the Worker — [proof](live-bytes-club.nonarkara.org.json) |
| Ship gate | **45 / 45 steps passed** — 37 suites from CI, the MSH gate and its planted twin, the pinned-source equality, the catalogue rebuild, the deploy, the byte comparison, the live URL — [report](../release/2026-11-21/ship-report.json) |
| Measured live | **27 / 27 checks** on the two public hosts |
| Independent audits | three. The third is filed here with its instrument and tables: [third](msh-audit/2026-11-21/third-audit/VERDICT.md). The second is written up in [the morning ship record](README-morning-ship.md). |

The earlier ship of this day (Worker `ad014e9a`, commit `8b382ac`, also 45/45)
is kept as [ship-report-earlier-ship.json](../release/2026-11-21/ship-report-earlier-ship.json),
and its written account as [README-morning-ship.md](README-morning-ship.md).

## What the third audit found

The auditor built its own instrument, never read or ran the project's own gate,
and **falsified the old shape** first: it served the parent commit locally and
reproduced the historical numbers exactly (60.37 % map at 1024, a 261 px flat
slab), so its numbers could be trusted on the new build. It confirmed all seven
earlier fixes and the palette race. Then it found five more:

- **[HIGH] The floating rail left a dead strip.** The rail's grid cell spanned
  the whole screen height while the paper panel inside it ended at its content,
  so the 360 px column *below* the panel was painted map that no pointer event
  could reach. A real drag there did not move the map; a wheel there did not
  zoom (16.8 → 16.8, while the same wheel in the clear map went to 17.30). It
  cost **10.9 % / 11.9 % / 7.9 % / 7.0 %** of the first screen, desktop, both
  modes.
- **[HIGH] "Places in view" was dishonest.** The count was a fixed 360 px
  column cut for the canvas's whole height. It left out three painted places
  in the strip below the panel (*li-bra-ry Cafe*, *li-bra-ry at Candide*,
  *ไล-บรา-รี่ แอทกองดิด*) and counted one place per mode that was hidden under
  the Key legend or a map control.
- **[MEDIUM] The 44 px work had been done for CL;UB only.** PL;UB's phone list
  toggle was still 34×32, and the drawer's close button — the way *out* of the
  drawer — was 32×32 in **both** modes.
- **[LOW] CL;UB said the failure twice**, with two competing Retry buttons.
- **[LOW] CL;UB's eight-row preview was a smaller list, not a cheaper one.**
  Reaching every listing in view took **ten clicks**, then a list that scrolled
  6245 px inside a 713 px window.

## What was repaired

1. **The dead strip is alive.** The rail's grid cell no longer takes pointer
   events; the paper panel and the place sheet take the hit box back, and the
   ground below the panel belongs to the map again. Measured with real mouse
   input on the live hosts: a drag at (180, 580) in PL;UB and (180, 688) in
   CL;UB moves the map, in both modes.
2. **"Places in view" now tells the truth.** The visible map is not a
   rectangle — the rail is a paper panel laid over the canvas that ends where
   its content ends, so the ground the reader can see is an L, and the Key
   legend and the map's own controls cover patches of it. A bounding box
   cannot express that, so the DOM does: a place is visible when the topmost
   thing at its projected pixel is the map canvas. Measured live at 1440:
   PL;UB 53 counted / 53 visible, CL;UB 122 counted / 122 visible, **zero**
   visible-but-uncounted and **zero** counted-but-invisible. The atlas fit,
   the Einstein-hat tiles and the journey origin ask the same question now.
3. **Thumbs, in both modes.** PL;UB's phone list toggle and the drawer's close
   button are 44×44 on both hosts. The phone chip row pays 12 px for it, and
   the map gives up 1.5 % of the 390 screen for a target a thumb can hit.
4. **One failure, one surface.** CL;UB's rail says "Directory unavailable"
   once, with one Retry button. The duplicate banner at the top of the rail is
   gone.
5. **One disclosure for the whole rail.** The ladder of "Show 12 more" is one
   "Show all N places", in both modes — one click to every listing in view,
   then "Show fewer" to put it back.

The gate: 45 steps — 37 suites from CI, the MSH gate and its planted twin, the
pinned-source equality, the catalogue rebuild, the deploy, the byte comparison
and the live URL. **45/45.**

## Measured now

| | 390px | 1024px | 1440px |
|---|---|---|---|
| PL;UB chrome | 11% | 16% | 16% |
| PL;UB map | 83% (net 81%) | **76%** (net 75%) | **81%** (net 81%) |
| CL;UB chrome | 12% | 15% | 15% |
| CL;UB map | 88% (net 87%) | **72%** (net 71%) | **78%** (net 78%) |
| Void, both modes | 3.1% | 2.4% | 2.8% |
| Camera | z16.8 / z12 | z16.8 / z12 | z16.8 / z12 |

At 260px — a 390px phone at 150 % reader text — the search keeps 147 px, the
bar overflows by 0 px, and the page does not scroll sideways.

The PL;UB phone map gives up one and a half points of its 390 screen: that is
the price of a 44 px list toggle, and it is the only thing this release took
away from the reader's screen.

## Still honestly unfinished

- **GitHub CI cannot start.** Every job is refused with "recent account
  payments have failed or your spending limit needs to be increased". This is
  an owner action; the local ship gate is the only runner, and it is green.
- **The catalogue is thin.** Of the 20,640 work places, **579** carry opening
  hours — 2.8 %. Of the 36,739 food rows, **967** — 2.6 %. There is **one**
  curated on-site report in the whole corpus. The map knows where a place is
  long before anyone has said anything about it, and nothing in the interface
  pretends otherwise.
- **Heights are nearly absent.** Of 20,650 neighbourhood footprints, **248**
  carry an explicit height in the source and **244** are drawn as volumes; 6,163
  are knowable only as floor counts and 14,239 carry no height information at
  all. Nothing is invented, so the city is mostly flat. Overpass answers 406
  from this environment, so heights must come from the pinned offline snapshot.
- **The palette is nearly exhausted.** The Sanzo Wada catalogue owns **38**
  colours; **36** are already spoken for in the shipped interface. Two remain:
  Corinthian Pink `#f8b6ba` and Cerulian Blue `#0093a5`. A new category will
  have to borrow one, and one colour, one job.
- **CL;UB's second ink register is asserted, not enforced.** All eight of its
  tokens (`--club-ink` Deep Slate Olive, `--club-muted` Dark Medici Blue,
  `--club-rule` Warm Gray, `--club-guide` Turquoise Green, `--club-seam` Night
  Green, `--club-oil` Oil Green, `--club-leaf` Yellow Green, `--club-teal`
  Green Blue) are genuine catalogue colours — but
  `test/data-role-palette.mjs` only reads PL;UB's four marks, because its
  token pattern is
  `--(cat-[a-z]+|ink|ink-80|ink-45|rule|guide|accent)`. The rule that "every
  colour that marks a thing is a catalogue colour" is enforced for PL;UB and
  asserted for CL;UB.
- **Older release wording still reads as current.** `docs/release-2026-11-15/`
  is headed "What is deployed" in the present tense, and
  `docs/release-2026-11-18/README.md` is titled the release of the *19th* in
  the folder of the 18th.
- **The release records are dated in UTC.** `scripts/audit-msh.mjs`,
  `scripts/ship.mjs` and `scripts/verify-live-bytes.mjs` stamp their output
  with the UTC date, so a ship that lands after 17:00 Bangkok time is filed
  under the previous day and overwrites that day's evidence. This release was
  filed by hand under the day it actually happened; the scripts have not been
  changed, because the gate that produced the 45/45 above must be the gate
  that shipped.
