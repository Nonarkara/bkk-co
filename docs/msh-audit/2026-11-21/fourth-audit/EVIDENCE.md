# EVIDENCE — MSH audit #4, PL;UB / CL;UB

Auditor: **Verifier** (independent agent; did not build the commit under audit,
did not repair anything, did not deploy, wrote nothing inside the repository).

Everything below was produced by instruments I wrote and ran, in this
directory. Every number in `VERDICT.md` comes from a file in `out/` or `data/`.
Where a number could not be measured, it is in **Unverified**, not in a finding.

---

## 1. What was audited

| | |
|---|---|
| Commit | `d085ace` (the `origin/main` HEAD the brief names) |
| Live hosts | <https://co.nonarkara.org> (PL;UB), <https://club.nonarkara.org> (CL;UB) |
| Served assets | `app.js?v=ac2846cf`, `style.css?v=16408c16` — the live `index.html` is byte-identical to `/tmp/msh-audit-verifier-4/new/public/index.html` (`diff` empty), so the extracted "new" tree **is** the shipped build |
| Trees under audit | `old/` = parent commit, `new/` = shipped build, both already extracted |
| Law | `~/Projects/_reference/MSH.md` (read in full before any measurement) |
| Browser | Google Chrome via Playwright, headless, flags `--no-sandbox --disable-dev-shm-usage --disable-gpu --enable-unsafe-swiftshader` (no `--use-gl=swiftshader` — it hangs the map canvas) |
| Viewports | 390×844, 1024×768, 1440×900 |

## 2. The instruments

All in `instrument/`:

| file | what it does |
|---|---|
| `measure.mjs` | the main pass: map share (painted + usable), panel hug, ground interactivity, count honesty (two readings), 44 px targets, disclosure cost, cross-mode flash, keyboard, reduced motion, 150 % text, error surface, loading/empty states |
| `measure.v1.mjs` | the first instrument, kept for the record (superseded by `measure.mjs`) |
| `phone.mjs` | the phone drawer: toggle/close geometry, the disclosure on the phone, Escape |
| `kb.mjs` | keyboard with the drawer open: reachability, focus indicator, trap, Escape |
| `reveal.mjs` | isolates the cost of one disclosure click — **no drag and no zoom before the click**, so the camera cannot confound the result |
| `states.mjs` | loading / failed / genuinely-empty states, and the OLD CL;UB ladder (finding 5 before/after) |
| `bulk.mjs`, `bulk2.mjs` | the uncapped "Show all N" render at city zoom (desktop / phone) |
| `flash.mjs` | samples `document.body.innerText` every 25 ms from document start to check for a cross-mode flash |
| `err.mjs` | 3 × 2 loads per host to test whether a CSP `EvalError` reproduces |
| `tables.mjs` | assembles `data/*.json` from the raw runs |
| `recon.mjs` | one-off DOM reconnaissance used to find the real selectors |

## 3. Falsifying the old shape first (why the instrument may be trusted)

An instrument that cannot reproduce the third audit's numbers cannot be trusted
on the new build. The old tree was served locally on `127.0.0.1:8801` and run
through the *same* instrument that later measured the live hosts.

| third audit's fact | my measurement on the old build | reproduced |
|---|---|---|
| map share of the first screen @1024 = **60.37 %** | **60.37 %** (canvas 1024×715 minus the 360 px blocking rail column, computed from the measured cover rectangles) | ✅ |
| flat slab below the last row @1024 = **261 px** | **261.3 px** (viewport 768 − last row bottom 506.7) | ✅ |
| flat slab below the last row @1440 = **393 px** | **393.3 px** (viewport 900 − last row bottom 506.7) | ✅ |
| "Places in view" = **48** at 1440 in PL;UB | **48 places** | ✅ |
| "Places in view" = **37** at 1024 in PL;UB | **37 places** | ✅ |
| the drag in the ground below the panel does nothing; the wheel leaves zoom at 16.8 | **GROUND_DEAD**: drag Δ = 0.000000, wheel 16.8 → 16.8 | ✅ |
| the count ignores the strip of ground below the panel (3 places at 1440 uncounted) | my paint-based reading found **51** visible vs the interface's **48** → exactly 3 painted places uncounted | ✅ |

Raw: `out/OLD4-plub-1024.json`, `out/OLD4-plub-1440.json`,
`data/q0-falsification-old-shape.json`.

Two of my own numbers needed fixing before they reproduced the history, and
both are recorded here rather than hidden:
* the map-share formula double-counted the grid step (`100*painted/total*step²/vp`);
* the first visibility rule treated a transparent hit-box as "map visible"
  without asking whether an **opaque ancestor** (the white paper panel) sat
  under it. That rule made my reading disagree with the app on 16 places in
  CL;UB@1024. The corrected rule (opaque element *or* opaque ancestor hides
  the place) agrees with the app everywhere except the cases that became
  finding 3.

## 4. How each number was taken

### Map share (`data/q1-map-share.json`)
The canvas rectangle is read from `map.getCanvas().getBoundingClientRect()`.
Every element in the document is then classified as an *opaque cover*
(background alpha > 0.5, or a background image) or a *pointer-blocking cover*
(`pointer-events` ≠ `none`), excluding the canvas and its ancestors. The
canvas is then grid-sampled at 6 px and each sample is attributed to
"painted map" (no opaque cover) or "usable map" (no opaque **and** no
pointer-blocking cover). Both are divided by the viewport area.
* **painted** = what the reader's eye gets.
* **usable** = what the reader's hand gets. The third audit's 60.37 % figure is
  the usable measure (canvas minus the full-height blocking column), and that is
  the number I use for the ≥ 60 % law check.

### The dead strip (`data/q7-dead-strip.json`)
A **real** mouse drag (mouse.down → 14 moves → mouse.up) and a **real** wheel
(`mouse.wheel(0, −320)`) at x = 180, ~60 px below the paper panel's bottom
edge, then `map.getCenter()` / `map.getZoom()` are read back. Verdict
`GROUND_INTERACTIVE` requires both the drag to move the camera and the wheel to
change the zoom.

### The count (`data/q2-count-honesty.json`)
The interface's number is read from `#count`. Two independent readings:
* **the app's own** — `lastList` filtered by the raw canvas bounds
  (`map.unproject` corners) and then `visibleOnMap(p)`, the app's own function;
* **mine** — the same candidate set, but each place's projected pixel is
  resolved with `document.elementsFromPoint()` and judged by *paint*: the map's
  own marker → visible; the canvas → visible; an opaque element or an opaque
  ancestor → hidden; a transparent overlay → the map paints through → visible.
The two readings share no code. `map.queryRenderedFeatures` was used as a
second opinion on what the map paints.

### 44 px targets (`data/q3-44px-targets.json`)
`getBoundingClientRect()` of `#list-toggle` and `.list-close`, measured with
the drawer closed and open, in both modes.

### Error surface (`data/q4-error-surface.json`)
On the **live** club host, `page.route('**/places-cannabis.json', r => r.abort())`,
then the count of "Directory unavailable" strings and of Retry buttons.

### Disclosure (`data/q5-disclosure.json`, `data/q8-disclosure-isolation.json`)
`reveal.mjs` clicks the disclosure exactly once from the landing state with no
camera movement, and records the count, the rows, the panel height and the map
share before and after. `phone.mjs` does the same on the phone drawer.

### The bulk render (`out/BULK.json`, `out/BULK-phone.json`)
`map.setZoom(9.2)` + `map.panTo([100.62, 13.60])` — the camera a reader reaches
by pressing the map's own zoom-out control — then one click on "Show all N
places", measuring the rows, the DOM node count, the rail's scroll height and
the time until the page responds again.

### Preserved findings
* cross-mode flash — `instrument/flash.mjs`, `document.body.innerText` sampled
  every 25 ms from document start (`out/` runs + the dedicated probe);
* keyboard — 50 `Tab` presses per viewport, recording the focused element, its
  geometry and whether it has an outline, a box-shadow or a border;
  `kb.mjs` repeats it with the phone drawer open;
* reduced motion — a context with `reducedMotion: 'reduce'`, then every
  computed `animation-*` / `transition-duration` in the DOM;
* 150 % text — `document.documentElement.style.fontSize = '150%'`, then
  `scrollWidth` vs `clientWidth` and the map share re-measured with the same
  sampler;
* the three states — `states.mjs`: a delayed route (loading), an aborted route
  (failed), and a camera moved away from every place (genuinely empty);
* scanner — `npx --yes github:Nonarkara/Non-Slop scan /tmp/msh-audit-verifier-4/new/public`
  → `out/nonslop-scan.txt`: **REVIEW, 4 points, P0 0, no SLOP**.

## 5. Commands

```bash
# serve the two extracted trees
cd /tmp/msh-audit-verifier-4/old/public && python3 -m http.server 8801 &
cd /tmp/msh-audit-verifier-4/new/public && python3 -m http.server 8802 &

# falsify the old shape with the same instrument used on the live hosts
node instrument/measure.mjs --url http://127.0.0.1:8801/index.html --mode plub \
     --vw 1024,1440 --label OLD4-plub --skip rm,text150,states

# the live hosts, both modes, three viewports
node instrument/measure.mjs --url https://co.nonarkara.org      --mode plub --vw 390,1024,1440 --label LIVE2-plub
node instrument/measure.mjs --url https://club.nonarkara.org    --mode club --vw 390,1024,1440 --label LIVE2-club

# the surfaces the main pass never opens
node instrument/phone.mjs  --url https://co.nonarkara.org   --mode plub
node instrument/phone.mjs  --url https://club.nonarkara.org --mode club
node instrument/kb.mjs     --url https://co.nonarkara.org   --mode plub
node instrument/kb.mjs     --url https://club.nonarkara.org --mode club
node instrument/reveal.mjs --url https://co.nonarkara.org   --mode plub
node instrument/reveal.mjs --url https://club.nonarkara.org --mode club
node instrument/states.mjs --url https://club.nonarkara.org --mode club --old
node instrument/states.mjs --url https://co.nonarkara.org   --mode plub
node instrument/bulk.mjs && node instrument/bulk2.mjs
node instrument/flash.mjs && node instrument/err.mjs

# tables
node instrument/tables.mjs
```

## 6. Reasoning behind the calls

* **Why the app's count and mine can both be right.** The interface is not
  asked "what is in the camera's bounds" any more; it is asked "can the reader
  see this place". Both readings agree with that question. They disagree only
  where the app's own rule is looser than the question: `visibleOnMap()` accepts
  any element inside `#map` as "visible", which includes the Key legend and the
  map's controls (finding 3).
* **Why the desktop disclosure is honest and the phone one is not.** On the
  desktop the rail is a column beside the map, so a taller panel does not cover
  the map; on the phone the drawer is a sheet *over* the map, so a taller list
  covers the map it is describing, and the DOM-based count shrinks to match.
  The same code produces honest numbers on one surface and false promises on
  the other — which is why findings 1 and 2 are the same mechanism measured
  from two sides.
* **Why the map-share drop is attributed to the disclosure.** The measurement
  that produced it (`reveal.mjs`) performs **no camera movement** before the
  click, so the only thing that changes between the two readings is the
  panel's height. Zoom does not affect map share (the canvas does not resize),
  so the earlier run — which did drag and zoom first — gives the same figure
  (57.74 % / 58.34 %) for the same reason.
* **Why the OLD build is not a strawman.** The old build was served from the
  same extracted tree, measured by the same instrument, and reproduced six
  independent historical numbers exactly (§3). The comparison in finding 7
  (994,923 px of scroll now, 6,245 px in the third audit) is between two
  measurements of the same surface, not between an estimate and a measurement.
* **Why the scanner row is "no SLOP" and not "clean".** The law's §3.A asks for
  the scanner's verdict; the scanner returned REVIEW with 4 points and one
  emoji-icon P1. REVIEW is not SLOP, so the row is satisfied, and the two
  REVIEW sentences and the heavy image are recorded in
  `out/nonslop-scan.txt` for the builder rather than rewritten by me.

## 7. What I did not do
* I did not read or run `scripts/audit-msh.mjs` (the builder's instrument), by
  instruction — I did read the product source (`app.js`, `style.css`,
  `index.html`) in the two extracted trees, because the product *is* the
  artifact under audit.
* I did not modify the repository, deploy, or fix any finding.
* I did not delete the old tree's servers until the measurements were taken.

## 8. Directory map

```
/tmp/msh-audit-verifier-4/
├── VERDICT.md          the verdict, findings, preserved list, unverified list
├── EVIDENCE.md         this file
├── data/               one JSON table per question (q0 … q8)
├── instrument/         every script used, including the superseded v1
├── out/                raw run output (per viewport, per host) + probe logs
└── shots/              screenshots for the findings
```
