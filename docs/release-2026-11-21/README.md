# PL;UB and CL;UB — the release of 21 November 2026

Two bureaus over one codebase: **PL;UB** at [co.nonarkara.org](https://co.nonarkara.org)
(where to work) and **CL;UB** at [club.nonarkara.org](https://club.nonarkara.org)
(where the licensed dispensaries are).

This day had **three ships**, because there were three audits to answer. The
second independent audit returned **REVISE** with seven findings. The third
returned **REVISE** again with five. The fourth — which falsified the third's
own numbers against the parent commit before it measured the new build —
returned **REVISE** a third time with **seven more, three of them HIGH, and
all three of the HIGH ones inside the repair I had just made for the third
audit.**

That is the honest shape of the day: each repair was right in kind, and each
one created the next defect. The disclosure I built to replace a twelve-click
ladder was the thing that lied to the reader, hid the map and put nineteen
thousand rows on the page.

| | |
|---|---|
| Worker | `9b917012-86e6-4726-acf0-f0b37af765e5`, from commit `b4eef71` |
| Domains | co · club · bkkco (301 to co) |
| Catalogue | 57,379 places, signed; 329 cannabis listings in a separate file, reproducible from its builder |
| Bytes on co | **412 / 412 matched**, 0 mismatched, 0 missing, 0 orphans — [proof](live-bytes-co.nonarkara.org.json) |
| Bytes on club | **411 / 411 matched**, 0 mismatched, 0 missing, 0 orphans, 1 file rewritten by the Worker — [proof](live-bytes-club.nonarkara.org.json) |
| Ship gate | **46 / 46 steps passed** — the rig answers, 37 suites from CI, the MSH gate and its planted twin, the pinned-source equality, the catalogue rebuild, the deploy, the byte comparison, the live URL — [report](../release/2026-11-21/ship-report.json) |
| Measured live | **49 / 49 checks** on the two public hosts — 27 for the third audit's five repairs, 22 for the fourth's seven |
| Independent audits | **four.** The fourth is filed here with its instrument, its tables and its 78 screenshots: [fourth](msh-audit/2026-11-21/fourth-audit/VERDICT.md). The third is [here](msh-audit/2026-11-21/third-audit/VERDICT.md), the second is in [the morning ship record](README-morning-ship.md), the first in [the second ship's record](README-second-ship.md). |

The day's earlier two ships are kept whole: the **morning ship** (Worker
`ad014e9a`, commit `8b382ac`, also 45/45) as
[README-morning-ship.md](README-morning-ship.md) and
[ship-report-earlier-ship.json](../release/2026-11-21/ship-report-earlier-ship.json);
the **second ship** (Worker `86441033`, commit `d085ace`, also 45/45) as
[README-second-ship.md](README-second-ship.md) and
[ship-report-second-ship.json](../release/2026-11-21/ship-report-second-ship.json).

## What the fourth audit found

The auditor built its own instrument, never read or ran the project's own gate,
and **falsified the old shape first**: it served the parent commit locally and
reproduced the third audit's history exactly (60.37 % map at 1024, a 261 px flat
slab, `GROUND_DEAD` — a drag that moved nothing and a wheel that stayed at
16.8). Then it confirmed the five repairs and found seven more:

- **[HIGH] The disclosure could not keep its promise on the phone.** One click
  on "Show all 46 places" delivered **9 rows**. The count is decided by asking
  the DOM what is visible, so the drawer the reader had just opened shrank the
  map, so the count fell, so the list was re-rendered shorter. The button
  promised the number that was true before the click and delivered the number
  that was true after it. At CL;UB 390 the reader lost **37 of 46**
  dispensaries, and the button was the only way to reach them.
- **[HIGH] One click pushed the map below the house floor of 60 %.** PL;UB 1024:
  67.05 % → **57.74 %**. CL;UB 1024: 63.01 % → **58.34 %**. The expanded paper
  panel grew to the full height of the rail column and took back the strip the
  dead-strip repair had just given to the map.
- **[MEDIUM] The count still counted places under the map's own chrome.**
  `visibleOnMap()` accepted *anything* inside `#map` as "visible" — including the
  Key legend and the attribution button. One place per affected view was
  counted but painted over.
- **[MEDIUM] The 44 px floor was applied to the named control, not to the row.**
  The phone's filter chips were still 32 px and the bar's buttons 36 px, ten
  pixels from a 44 px toggle in the same row.
- **[LOW] The rail's scroll cost was untouched.** CL;UB 1440: 6,463 px of
  scroll inside a 713 px column — 9.1 screens. The clicks were cheaper; the
  scroll was the same.
- **[LOW] Escape did not close the phone drawer.** It had a 44 px close button,
  so it was not a trap — but a keyboard reader had no way out but the button.
- **[HIGH] "Show all N places" had no cap.** At city zoom — an ordinary act,
  the map's own control does it — one click put **19,875 rows** and **151,093
  DOM nodes** on the page and **994,923 px** of scroll into a 585 px column,
  in 1,643 ms with the page blocked.

The five repairs it confirmed: the dead strip is alive again (a real drag
moves the camera, a real wheel zooms 16.8 → 17.22), the strip undercount is
gone, the toggle and the drawer close are 44×44 in both modes, the failure is
said once with one Retry, and the twelve-click ladder is one click.

## What was repaired

1. **The reader's own panel may not redefine the map.** `visibleOnMap()` no
   longer counts the phone drawer or the place sheet as something standing on
   the map, so opening the list cannot shrink the list. Live: PL;UB 390
   promised **19** and delivered **19**; CL;UB 390 **70 → 70**; PL;UB 1440
   **51 → 51**; CL;UB 1440 **127 → 127**.
2. **The paper cannot grow over the ground.** The list scrolls inside a
   bounded window (`max-height: 50vh`), so the panel ends where its content
   ends no matter how many rows are behind the disclosure. The panel went from
   798 px to **559 px** (PL;UB) and 839 px to **620 px** (CL;UB), and the map
   after the click holds **76.6 %** (PL;UB 1440) and **76.0 %** (CL;UB 1440).
   On the phone the arrival state holds **80.6 %** and **86.9 %**.
3. **Only the canvas counts.** A place is visible when the topmost thing at
   its projected pixel is the map canvas itself — not the legend, not the
   attribution button. There are no DOM markers in this product; the places
   are a GeoJSON layer, and the question is asked of the DOM once, in one
   place.
4. **The disclosure is capped, and it says so.** "Show 200 of 20,640 places".
   Measured live at city zoom: 20,640 in view → **200 rows, 1,545 DOM nodes**.
5. **The header band is 44 px.** This one is mine, not the auditor's. The
   fourth audit sent me to look at the phone's filter row, and looking at the
   row meant looking at the band — and **the wordmark, the search field, the
   three bar buttons and the rail's own actions had been 36 px on every page of
   every product**, on every viewport, in both modes, since the beginning. No
   audit had censused them; three audits had looked at two named buttons.
7. **Escape closes the phone drawer** and hands focus back to the toggle that
   opened it. Inside the search field Escape still clears the search, because
   Chrome does that natively and the reader is typing, not navigating.
8. **Every surface has 44 px controls, not only the map.** This one is also
   mine, and it came from the same place as the header band: three audits had
   measured the map, the rail and the header band, and **nobody had ever
   censused the guide sheet, the notebook, the 3D hunt or the standalone
   pages**. They were holding the same 32 px and 36 px controls the header
   band held — the guide's action links, the notebook's five disclosure rows,
   its share and export buttons, the 3D hunt's street picker, its hunt
   counter, its close button and its map pins. All of them are 44 px now. The
   map pins and the 3D hunt's credit chips stay visually small, because a
   symbol must not become a slab to be tappable; their hit area is expanded
   instead, by the mechanism the house rule already allows.

## The gate now measures

The builder's gate is not a verdict — the verdict comes from another agent. It
is the instrument that stops the next regression while the next auditor is
being briefed. Since the fourth audit it has learned four new things:

- **Every tap target.** All interactive elements, both modes, 390 / 1024 / 1440,
  with the drawer open on the phone. 44 px for an isolated control or a
  full-width row; a dense chip row keeps its 32 px; a link that flows inline
  with the sentence around it is text, not a control; a control whose hit area
  is expanded by a pseudo-element is 44 px to the finger even when its box is
  smaller — and the gate **measures that expansion** rather than trusting it,
  so a token `::after` cannot pass as a 44 px target. It rounds to the
  nearest pixel, because a 44 px target measures 43.94.
- **Every surface.** The census opens all sixteen of them — five standalone
  pages and three sheets, at 390 and 1440 — because a census that opens one
  page is a census of one page, and the guide sheet and the notebook had never
  been opened by anything.
- **The disclosure's promise**, and the map's share after the click — judged on
  the phone in the state the reader returns to, because the drawer is the
  reader's own temporary overlay and the floor belongs to the screen they
  arrived on.
- **The phone drawer's keyboard way out**, in both modes.
- **What a field paints.** The void measure used to call the search input
  empty space. A field paints its placeholder. First-screen void: **3.1 % →
  1.6 %** at 390, **2.8 % → 1.6 %** at 1440.
- **Whether the rig is alive at all.** This ship's first attempt was blocked
  for a reason that was not the product's: `workerd` ran out of memory after
  eight hours of serving the catalogue and died mid-run, and the gate spent
  four minutes timing out before it could say so. The gate now asks the server,
  while it waits, whether it is still answering — and says *"the local server
  stopped answering mid-run; this measurement is void, not a failure"* — and
  the ship gate checks the rig before it judges anything, so a dead server
  costs a second instead of the whole run. A gate that cannot run is a SKIP,
  never a PASS, and a broken rig is never a verdict on the product.

And each new measurement can fail. The planted run injects four known defects
— a white panel over the map, an overlay panel on the map, a 22×22 button, and
a handler that swallows the Escape key — and plants that button again on all
sixteen surfaces. The gate reports **42 failures** and refuses to pass unless
every one of them was caught, and the planted run's own summary line states
each count, so a weakened gate is visible in the log.

## Measured now

| | 390px | 1024px | 1440px |
|---|---|---|---|
| PL;UB chrome | 13% (111 px) | 19% (61 px) | 19% (61 px) |
| PL;UB map | **81%** (net 79%) | **74%** (net 74%) | **80%** (net 79%) |
| CL;UB chrome | 13% (111 px) | 19% (61 px) | 19% (61 px) |
| CL;UB map | **87%** (net 86%) | **69%** (net 69%) | **76%** (net 76%) |
| Void, both modes | 1.6% / 1.0% | 0.7% | 1.6% |
| Camera | z16.8 / z12 | z16.8 / z12 | z16.8 / z12 |

At 260px — a 390px phone at 150 % reader text — the search keeps 147 px, the
bar overflows by 0 px, and the page does not scroll sideways.

## Still honestly unfinished

- **GitHub CI cannot start.** Every job is refused with "recent account
  payments have failed or your spending limit needs to be increased". This is
  an owner action; the local ship gate is the only runner, and it is green.
- **The rail's scroll is contained, not shortened.** The fourth audit's fifth
  finding is the one thing that is repaired in kind and not in volume. The
  scroll now happens inside a bounded window that cannot take the map's
  screen, and it is reached in one click instead of twelve — but CL;UB at 1440
  still scrolls **6,463 px** for 127 listings. That is the content's length,
  not the interface's padding; a shorter way to reach the same 127 rows would
  be a different product, and nobody has asked for one.
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
  changed, because the gate that produced the 46/46 above must be the gate
  that shipped.

## Unverified by any independent audit

Stated as unverified, not assumed:

- **Contrast ratios.** No audit has measured them. The law asks for it; the
  auditors measured target sizes and focus indicators.
- **Real touch hardware.** The 44 px targets were measured in Chrome with
  `hasTouch`, not on a physical phone.
- **320 px width.** Not measured; not claimed by the product.
- **PL;UB's own catalogue failure path.** The forced-failure test was run on
  CL;UB's cannabis catalogue. PL;UB's non-cannabis catalogue failure was never
  forced.
- **The catalogue's own spatial truth.** The audits are layout audits. Nobody
  has audited a coordinate against a source record.
- **The other surfaces** — the 3D hunt, `/day`, the notebook, the guide and the
  atlas views — have never been audited by an independent agent. They were
  measured by the builder's own probe and then by the builder's own gate,
  which now opens all sixteen surfaces and censuses them: 0 console errors, 0
  sideways scroll, 0 controls under 44 px, and the 3D hunt opens as a
  full-screen `<dialog>` with a WebGL canvas at 390 and 1440. A builder's gate
  is evidence; it is not a verdict.
