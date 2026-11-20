VERDICT: REVISE
Auditor: Verifier (independent auditor, third MSH audit)
Commit audited: 8b382ac  (live asset hashes app.js=be73d63d, manga-lens.js=e5a0c469, plub.js=4f5d2d1f)
Falsification tree: 5b089a4 (parent of the fix commit), served locally :44911
URLs: https://co.nonarkara.org (PL;UB) | https://club.nonarkara.org (CL;UB)
Widths: 390, 1024, 1440 | both modes | 150% font | keyboard-only | reduced motion | loading/failed/empty
Instrument: /tmp/msh-audit-verifier-3/*.mjs — scripts/audit-msh.mjs NOT read, NOT run.

== THE OLD SHAPE, RE-CREATED (my own numbers, not the builder's) ==
OLD 5b089a4 @1024: map canvas share 60.37% of viewport (the "60.4%" from the brief), paper rail 359x674
                     with 261 px of flat panel below the last row.
OLD 5b089a4 @1440: map share 70.58%, paper rail 359x806 with a 393 px flat slab below the last row.
OLD 5b089a4 @390 : map share 83.89%.
=> the historical numbers are reproducible by an independent instrument; the old shape is confirmed.

== THE LIVE NUMBERS (8b382ac) ==
vp   mode  chrome%  mapCanvas%  mapVisible%(of vp)  mapVisible%(below hdr)  deadStrip%  "Places in view"  counted/visible/visible-uncounted
390  PL;UB 16.11    83.89        83.89               94.5                    0.0         "20,640 matching"  (rail hidden; drawer open: 20 places)
1024 PL;UB 12.24    93.10        72.33               77.7                    11.9        37 places         37 / 36 / 0
1440 PL;UB 10.44    94.11        81.51               86.6                    10.9        48 places         48 / 48 / 3
390  CL;UB 12.20    88.74        88.74              101.1                    0.0         "329 matching"
1024 CL;UB  6.90    93.10        67.36               72.4                     7.0        103 places        103 / 102 / 0
1440 CL;UB  5.89    94.11        78.49               83.4                     7.9        127 places        127 / 127 / 0
mapVisible% = painted map minus painted app chrome (rail paper + chips strip). deadStrip% = painted map that is
inert (see Finding 1). Old F5 claim (76% PL;UB, 72% CL;UB @1024) reproduces as 77.7% / 72.4% below-header.
MSH floors: map >= 60% of first desktop and first phone screen -> PASS at every viewport/mode, both definitions.

== THE SEVEN FIXES, INDEPENDENTLY VERIFIED ==
F1 loading/failed/empty distinct + Retry re-fetches : VERIFIED
    loading  -> count "Loading…", body "Loading the directory…", 1 skeleton, panel ends at content
    failed   -> count "unavailable", "Directory unavailable." + Retry 52x44
    retry    -> refetched places-work.json / places-cannabis.json; PL;UB recovered to 48 places,
                CL;UB recovered to 127 places (before "unavailable", after real counts)
    empty    -> all kind chips off: "0 places" + "No matches in view. Pan, zoom out or clear a filter."
    Three states are textually distinct and none says "0 places / no matches in view" while loading.
F2 CL;UB claims mode from URL before catalogue     : VERIFIED
    body.className = "club-mode" from t=1474ms; rail never painted PL;UB's cafe list (10 samples, 0 rows).
F3 loading rail painted a skeleton                  : VERIFIED (4 bars; panel shrank to its content, 0px slab)
F4 rail is a paper panel ending at its content      : VERIFIED
    pixel truth PL;UB 1440: white run in the rail column ends at y=507 (= panel bottom), pink map below.
    pixel truth CL;UB 1440: white ends at y=615 (= panel bottom), teal map below. Slab = 0px (was 393px).
F5 1024 map share off the 60% floor                 : VERIFIED
    OLD 60.37% -> LIVE 77.7% (PL;UB) / 72.4% (CL;UB) below-header; 72.33% / 67.36% of full viewport.
F6 44px targets                                     : PARTIALLY VERIFIED — see Finding 3
    CL;UB phone list toggle 44x44 (was 30x32) OK; Retry 52x44 OK. PL;UB's own phone toggle is still 34x32.
F7 MapLibre null-vs-number warnings                 : VERIFIED
    16 loads (8 PL;UB + 8 CL;UB): 0 MapLibre/expression/null warnings. Only 5 font-preload warnings per load
    (browser-level preload notices, not MapLibre) and 2 aborted tile requests on one CLUB load.
PALETTE RACE (manga lens installing PL;UB's ground) : VERIFIED FIXED
    CL;UB map ground = #b5decc (Botanical Green) at every sample from t=1361ms to final.
    PL;UB map ground = #f9c1ce at every sample. Zero pink elements anywhere in the CL;UB DOM.

== FINDINGS ==
1. [HIGH] The floating rail left a dead strip: painted map that cannot be touched.
   Element: #side (grid-area side, z-index 2, background transparent, pointer-events auto) still spans the
   full grid row (360x806 @1440) while the paper panel inside it now ends at its content (y=507).
   The 360 px column below the panel is painted map but #side intercepts every pointer event there.
   Evidence: real mouse drag at (180,567) PL;UB 1440 -> map did NOT move; identical drag in the clear map
   -> map moved. Wheel over the strip -> zoom 16.8 -> 16.8 (unchanged); wheel in clear map -> 16.8 -> 17.30.
   Cost: 10.9% (PL;UB 1440), 11.9% (PL;UB 1024), 7.9% (CL;UB 1440), 7.0% (CL;UB 1024) of the first screen
   shows map the reader can see but cannot pan, zoom or click. First screen, both modes, desktop only.
   Repair: make the rail's hit box match its paper (e.g. #side { pointer-events: none } with
   .list-wrap / .rail-header { pointer-events: auto }), or hit-test the map canvas instead of a grid cell.
2. [HIGH] "Places in view" no longer matches what the reader can see, because of the same floating rail.
   The app overrides map.getBounds() to the region right of RAIL_WIDTH=360 for the FULL canvas height:
     sw = unproject([RAIL_WIDTH, canvas.clientHeight]); ne = unproject([canvas.clientWidth, 0])
   That cut was correct when the rail was a full-height column. Now the reader also sees painted map to the
   LEFT of 360px, below the panel's bottom edge, and those places are excluded from the count.
   Evidence PL;UB 1440: 51 source places project into the visible canvas, 48 are counted.
   The 3 missing are visible, painted, and simply not in the count:
     "li-bra-ry Cafe" (79,827), "li-bra-ry at Candide" (115,844), "ไล-บรา-รี่ แอทกองดิด" (116,841)
   Related minor: at 1024 the Key legend hides 1 counted place in each mode
     (PL;UB "French Bakery" 408,738 under footprint-key; CL;UB "Holy Smoke Cannabis Dispensary" 1011,731
     under a maplibregl control), so the count includes 1 place the reader cannot see.
   Repair: derive the "in view" region from the painted-visible map (exclude only the panel's own rect),
   not from a fixed 360px column.
3. [MEDIUM] The 44px work was done for CL;UB only; PL;UB's phone list toggle is still 34x32.
   PL;UB 390 #list-toggle = 34x32 (CL;UB 390 = 44x44). The drawer's close button is 32x32 in BOTH modes.
   Inside the open phone drawer, 26 of 32 (PL;UB) and 42 of 53 (CL;UB) interactive elements are under 44px
   in one dimension (mostly 32px-tall chips and CL;UB's 25 hotspot pills).
   Cost: the primary phone affordance of PL;UB (open the list) is a 34x32 target; the worst target in the
   product is still the drawer close button at 32x32, which is the escape hatch from the drawer.
   Repair: 44px min-height on the toggle and close button in both modes; chips may stay 32px if the law
   exempts chips, but the toggle and close button are primary controls and must be 44px.
4. [LOW] CL;UB's failed state shows the error twice with two competing Retry buttons.
   At 1440 and 1024 the failed render contains "Directory unavailable. Retry" in the club-hotspots header
   at (144,61) AND again inside the list at (121,204). Two error banners, two Retry buttons, one job.
   PL;UB shows it once. Repair: one error surface per mode.
5. [LOW] CL;UB's shorter preview (8 rows + "Show 12 more") is a smaller list, not a cheaper one.
   Measured clicks to reach every listing in view: PL;UB 4 clicks (5 -> 17 -> 29 -> 41 -> 46 rows);
   CL;UB 10 clicks (8 -> 20 -> 32 -> ... -> 116 -> 123 rows), then a list that scrolls 6245px inside a 713px
   viewport (8.8 screens). The label does update honestly ("Show 12 more" -> "Show 7 more" -> gone).
   Repair: if the point is compactness, one disclosure that reveals all ("Show all 123") beats ten clicks.

== PRESERVED ==
F5 map-first geometry: map >= 60% at every viewport/mode. Rail paper hugs its content (0px slab, pixel-verified).
Camera: padding {left:360} keeps the map centre at the centre of the visible right-hand region
(centre projects to x=900 @1440, 692 @1024) — correct for a left rail. Camera centre and padding agree
with the drawn map; the map does not drift under the rail.
F2/F7/palette: no cross-mode flash, no MapLibre warnings in 16 loads, no palette race.
Keyboard: 28 Tab stops in each of 4 combinations, 0 invisible stops, 0 focus traps, focus indicator on
every stop except one (the body element itself). Map canvas is focusable (tabindex 0, label "Map").
Reduced motion: prefers-reduced-motion honoured — camera flyTo/easeTo/fitBounds forced to duration 0,
0 animated elements, no map rotation/pitch.
150% font (root 16 -> 24px): no horizontal overflow, chips row wraps to two lines, map keeps 83.9% of the
390 screen, count still legible, no clipping.

== UNVERIFIED ==
3D Hunt, /day, notebook, passport and the atlas views were not audited (out of scope).
The "atlas row" and "status line" the brief mentioned do not exist as positioned DOM chrome in either mode:
atlas content is a MapLibre style layer (atlas-heat/hats/districts/parks/streets/loops, all visibility:none
except atlas-clusters) and the only chrome over the map is the standard maplibregl control stack plus the
Key legend. The 25 CL;UB hotspot pills live inside a closed <details> and are never painted at load.
CL;UB's "Browse hotspots" disclosure was opened and measured (does not spill past the panel).
=== END ===
