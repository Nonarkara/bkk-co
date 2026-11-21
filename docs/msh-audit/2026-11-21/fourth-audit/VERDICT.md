# MSH audit #4 — PL;UB / CL;UB — VERDICT

**Verdict: REVISE**

Auditor: **Verifier** (independent agent; did not build the commit, did not repair
anything, did not deploy).
Audited commit: `d085ace`, live at <https://co.nonarkara.org> and
<https://club.nonarkara.org> (`app.js?v=ac2846cf`, `style.css?v=16408c16`).
Audited law: `~/Projects/_reference/MSH.md`.
Measured: 2026-11-21, headless Chrome (Playwright), 390×844 / 1024×768 / 1440×900,
both modes, live hosts.
Evidence directory: `/tmp/msh-audit-verifier-4/` (`EVIDENCE.md`, `data/`, `out/`, `shots/`).

The five findings the builder was caught on are **mostly repaired, and the
repairs are real** — but two of the repairs created new defects of their own
(findings 2 and 7), and finding 1 is the same loop as finding 2 seen from the
phone. Three of them are now clean by measurement, one is
half-repaired, and one (the 44 px floor) was applied to the two controls that
were named and not to the row they sit in. The defects that remain are not in
the five: they are what the repairs themselves created — a list that hides the
map it is counting, and a count that is decided by the DOM.

---

## Findings

### 1. HIGH — The one-click disclosure cannot keep its promise on the phone; expanding the list hides the map, and the count shrinks with it
**Surface:** phone drawer (390×844), both modes. **Screenshots:** `shots/PHONE-club-revealed.png`, `shots/PHONE-plub-revealed.png`.

| mode | label before the click | count after the click | rows delivered | promised | delivered |
|---|---|---|---|---|---|
| CL;UB | "Show all 46 places" | **9 places** | 9 | 46 | **9 (−80 %)** |
| PL;UB | "Show all 12 places" | **9 places** | 9 | 12 | **9 (−25 %)** |

One click on the disclosure grows the drawer over the map. The count is decided
by asking the DOM what is visible (`visibleOnMap()` in `app.js`), so the map the
drawer covers is no longer "visible", so the count falls, so the list is
re-rendered shorter. The disclosure button promises the number that was true
before the click and delivers the number that is true after it. **Cost:** at
CL;UB 390 the reader loses 37 of the 46 dispensaries the map was showing one
second earlier; the button is the only way to reach them and it is the thing
that removes them.

### 2. HIGH — One click on "Show all" pushes the map below the house floor of 60 %
**Surface:** desktop rail, 1024, both modes. **Screenshots:** `shots/REVEAL-plub-1024-after.png`, `shots/REVEAL-club-1024-after.png` (and `-before`).

| mode | viewport | usable map share, landing | after 1 click | panel height before → after | panel bottom |
|---|---|---|---|---|---|
| PL;UB | 1024 | 67.05 % | **57.74 %** | 425.7 → 674 px | 519.7 → **768** (full column) |
| CL;UB | 1024 | 63.01 % | **58.34 %** | 575.3 → 715 px | 628.3 → **768** (full column) |
| PL;UB | 1440 | 77.59 % | 68.78 % | 425.7 → 806 px | 519.7 → 900 |
| CL;UB | 1440 | 75.09 % | 69.15 % | 575.3 → 847 px | 628.3 → 900 |

The expanded paper panel grows to the full height of the rail column and covers
the strip that the dead-strip repair just gave back to the map. MSH §2.8 requires
the map to hold ≥ 60 % of the first screen. At load it does, in all six
measurements (63.01 % – 83.49 %). **One click later, at 1024, in both modes, it
does not.** This is a preserved finding broken by the repair for finding 5.

### 3. MEDIUM — The count still counts places the reader cannot see, whenever one falls under the map's own chrome
**Surface:** desktop, both modes. **Screenshots:** `shots/LIVE2-plub-1024-landing.png`, `shots/LIVE2-club-1024-landing.png`.

| mode | viewport | interface states | independent reading | the extra place is under |
|---|---|---|---|---|
| PL;UB | 1024 | "37 places" | 36 | the Key legend's swatch at (408, 738) |
| PL;UB | 1440 (after expanding) | "33 places" | 32 | the Key legend at (522, 887) |
| CL;UB | 1024 | "103 places" | 102 | the MapLibre attribution button at (1011, 731) |

`visibleOnMap()` returns true when the topmost element at the place's pixel is
anything inside `#map` — which includes the Key legend and the map's own
controls. A place painted over by an opaque white box is counted as visible.
This is the residue of the third audit's finding 2, which named the legend
explicitly. **The other half of that finding is fixed:** the strip undercount is
gone — 0 "visible but not counted" places across all 8 desktop measurements
(2 modes × 2 desktop viewports × 2 states), against 3 at 1440 in the old build.

### 4. MEDIUM — The 44 px floor was applied to the control that was named, not to the row it sits in
**Surface:** phone chrome, 390, both modes. **Screenshots:** `shots/PHONE-plub-drawer.png`.

Repaired and measured: `#list-toggle` **44×44** and the drawer's close button
**44×44** (both modes, 390). Not repaired, in the same row, 10 px away:
`Café` 63.5×32, `Co-work` 84.1×32, `Library` 76.8×32, `Food` 65.9×32; bar
buttons `3D Hunt` 66.2×36, `Guide` 78.8×36, `Notes` 70.9×36. The phone's only
filter surface is 12 px short of the floor the same commit applied beside it.

### 5. LOW — The rail's scroll cost is untouched: the disclosure made the clicks cheaper, not the scroll
**Surface:** desktop rail, 1440. **Screenshots:** `shots/REVEAL-club-1440-after.png`.

CL;UB at 1440: one click → 127 rows, rail scrollHeight **6463 px inside a
713 px viewport = 9.1 screens of scrolling inside a 360 px column** (PL;UB
1440: 2530 px in 717 px = 3.5 screens). The old build's ladder needed ≥ 9
"Show 12 more" clicks to reach the same place and the third audit measured
6245 px of scroll there; the scroll is the same size, the clicks are one.

### 6. LOW — Escape does not close the phone drawer
**Surface:** 390, both modes. After `Escape` the drawer is still open (focus
lands on the close button in CL;UB, on `list-find` in PL;UB). The 44 px close
button exists, so this is not a trap and not a dead end — it is the missing
keyboard affordance on the one modal-ish surface of the phone.

### 7. HIGH — "Show all N places" has no cap: one click can put 19,875 rows and 151,093 DOM nodes on the page
**Surface:** PL;UB at city zoom, 1024 and 390. **Screenshots:** `shots/BULK-plub-1024-after.png`.

The reader zooms out (z 9.2 — an ordinary act, the map's own control does it).
The count honestly becomes "19,875 places" and the button reads "Show all 19,875
places". One click:

| surface | promised | rows rendered | DOM nodes | rail scroll | click→render |
|---|---|---|---|---|---|
| desktop 1024 | 19,875 | **19,875** | 151,093 | **994,923 px** in a 585 px column (1,700 screens) | 1,643 ms, page blocked |
| phone 390 | 18,589 | 8,851 (the count falls to 8,851 mid-click — finding 1 again) | 67,619 | **434,464 px** in a 391 px column (1,111 screens) | 677 ms |

The old ladder of finding 5 added 12 rows per click; a reader who wanted
everything in PL;UB would have had to click "Show 12 more" about 1,700 times.
The repair removed the clicks and left the scroll — 160× longer than the
6,245 px the third audit measured as the complaint. The rail's scroll height
after one click (994,923 px) is now larger than the entire rest of the product
put together.

---

## The five repairs, measured

| # | audit-3 finding | verdict | headline numbers |
|---|---|---|---|
| 1 | HIGH dead strip | **REPAIRED** | ground below the panel is live map in all 4 desktop measurements: a real drag moves the camera, a real wheel zooms 16.8 → 17.22 (PL;UB) and 12 → 12.42 (CL;UB). Old build: drag Δ = 0, zoom 16.8 → 16.8 |
| 2 | HIGH dishonest count | **MOSTLY REPAIRED** | strip undercount gone (0 visible-not-counted in 12 desktop measurements, was 3 at 1440); legend/control overcount remains (1 place per affected view — finding 3) |
| 3 | MEDIUM 44 px, PL;UB-only | **PARTLY REPAIRED** | toggle 44×44 and drawer close 44×44 in both modes (was 34×32 and 32×32); the phone's filter row is still 32 px tall — finding 4 |
| 4 | LOW two error surfaces | **REPAIRED** | with the cannabis catalogue fetch aborted on the live club host: **1** "Directory unavailable", **1** Retry button (52×44), `#club-hotspots` hidden |
| 5 | LOW ten-click ladder | **CLICKS REPAIRED, SCROLL NOT** | 1 click instead of ≥ 9 "Show 12 more"; but the phone delivery is 9 of 46 (finding 1), the desktop click pushes the map under 60 % (finding 2), and the rail still scrolls 9.1 screens (finding 5) |

---

## Preserved — measured, still holding

| preserved finding | measurement |
|---|---|
| map ≥ 60 % of the first screen, every viewport, both modes | usable share at load: PL;UB 77.23 / 67.05 / 77.59 %, CL;UB 82.97 / 63.01 / 75.09 % (390 / 1024 / 1440) — all pass at load; see finding 2 for after one click |
| the paper panel hugs its content (no flat slab) | panel bottom − last content bottom = **0 px** in all 6 measurements (2 modes × 3 viewports); old build: 261.3 px @1024, 393.3 px @1440 |
| the camera's centre is held where the reader can see it | centre projects to (692, 411) @1024 and (900, 477) @1440 — inside the clear region right of the 360 px rail; padding left = 360 |
| no cross-mode flash | 0 true cross-mode hits in 41 samples per run × 6 runs (390/1024/1440 × 2 hosts). The 5 "café" hits on CL;UB@1024 were the dispensary record "Amsterdam Cafe Bangkok — Mapped café · Tier B · Bangkok"; the "Café / Co-work / Library / Food" hits on PL;UB are its own filter chips. Sampled every 25 ms from document start (`out/flash` probe) |
| no MapLibre warnings over a run of loads | 0 warnings at 1024 and 1440 in both modes; at 390 only the headless software renderer's "GPU stall due to ReadPixels" performance lines |
| keyboard: reachable, no trap, focus indicator everywhere | 50 tabs per desktop viewport: **0** focused elements without a focus indicator; with the phone drawer open, 40 tabs land 11/16 inside the drawer and the rest on the still-visible page above it — focus escapes, so **no trap** |
| reduced motion honoured | under `prefers-reduced-motion: reduce` the only motion left in the DOM is a 1e-05 s transition (i.e. none) |
| 150 % reader text: no sideways scroll, map keeps its share | no horizontal overflow at 390 / 1024 / 1440 (scrollWidth = clientWidth); map share unchanged at 77.29 / 68.55 / 79.08 % |
| loading / failed / genuinely-empty are three different facts | loading → "Loading Thailand listings…" (count "Loading…"); failed → "Directory unavailable." + 1 Retry; empty → "0 places" + "No matches in view. Pan, zoom out or clear a filter." |
| scanner (§3.A) | `npx github:Nonarkara/Non-Slop scan` on the shipped `public/`: **REVIEW, 4 points — no SLOP** (P0 0, P1 1 emoji-icon, P2 2). Full output: `out/nonslop-scan.txt` |

## Kept on purpose
The map-first layout, the paper panel as a floating card rather than a column,
the camera offset to the rail, the single-disclosure idea, the one-error-surface
decision, and the honest "places the reader can see" title on the count. Four of
the five repairs are right in kind; this verdict is about the loop the
DOM-based count creates with a list that is taller than the map it measures.

## Unverified (stated as unverified, not assumed)
1. **Contrast ratios** (§3.B13 "contrast") were not measured; I measured target
   sizes and focus indicators only.
2. **Real touch hardware** — the 44 px targets were measured in Chrome with
   `hasTouch`, not on a physical phone.
3. **The catalogue's own spatial truth** (Map MSH / FloodDash playbook) — I did
   not audit coordinates against source records; this audit is layout only.
4. **320 px width** was not measured (not claimed by the product).
5. **PL;UB's own catalogue failure path** — the forced-failure test was run on
   the cannabis catalogue, as the brief specified; PL;UB's non-cannabis
   catalogue failure was not forced.
6. **Long-tail content**: 10-row, empty, and very long place names were not
   re-injected (§4 of the law asks the builder for them; I did not mutate the
   live product).
7. **The builder's own gate** (`scripts/audit-msh.mjs`) was not read or run, by
   instruction, so I cannot say whether it sees these findings.
8. **One uncaught page error, not reproducible** — a single
   `EvalError: … violates the following Content Security Policy directive
   because 'unsafe-eval' is not an allowed source of script` was logged on
   CL;UB@1440 in one run. Six further loads (CL;UB and PL;UB, 1440 and 1024,
   3× each) were clean, so I record it as an observed transient, not a finding.
   What evaluates a string at runtime on that host was not traced — unverified.
