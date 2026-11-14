# STYLE.md: deliberate choices. Do not strip.

Owner: Non Arkaraprasertkul. Last checked: 2026-11-07.

Everything here was chosen on purpose. Agents and reviewers read this before any design review, never remove or "fix" what it lists, and ask the owner if a choice seems to cause a real problem. This file beats every generic rule, including Non-Slop's and MSH's defaults — but never the accessibility floor, the pin law (`GEO-SPATIAL-HALLUCINATION`) or the honesty laws.

Governing design law, in order: **MSH** (`~/Projects/_reference/MSH.md`) → **glance path** (`GLANCE-PATH-FOR-AI.md`) → **kinetic grids** (`KINETIC-GRIDS-FOR-AI.md`). Canonical pack and scanner: `~/Projects/Non-Slop/`.

## Type
- **Sao Chingcha** — the owner's own lettering. The wordmark `PL;UB`. Self-hosted (`public/fonts/*.woff2`, preloaded). This is a chosen face; never swap it for a default.
- **Non Architecture** — the owner's Latin handwriting for Nong Plub's voice, neighbourhood purpose and owner visit notes; never data, numbers or Thai. Self-hosted and preloaded.
- **Jost** — UI and body (400/500/600). House face.
- **Prompt** — Thai, non-looped only (IBM Plex Sans Thai / Noto Sans Thai / Kanit are the alternates). Never a looped face (Sarabun, TH Sarabun New): looped heads read as "not made by Thais".
- Scale: 20 / 14 / 12 px, with 11 px tracked micro for qualifications. ≤4 sizes per view.

## Colour
Wada plate 273 (locally credited catalogue: `~/Projects/palette/data/colors.json`). Plate273 owns the interface; chrome never competes with it. Owner-authorized mapped category fills use the separate Palette320 chord below.
- Ground **#ffffff** paper, wash **#f4f4f0**.
- Ink **#7d133a** (Pansy Purple, plate 273) — reading text and the wordmark. Contrast on white 10.36:1.
- Guide field **#f9c1ce** (Hermosa Pink, plate 273) — Nong Plub's bounded surfaces. Ink on it 6.69:1.
- Wordmark seam **#e88ba1** — the semicolon in `PL;UB` only. Nowhere else.
- Structure **#b6bfc1** (Neutral Gray, plate 273) — hairlines and arcs.
- Accent **#dd4027** (Red Orange, Palette combination 241) — **one job only: the co-working category mark.** A credited catalogue colour, not a hand-typed amber. It is also the only colour in the catalogue that no neighbourhood ground and no data role already wears, which is why it is the accent. Never a second accent, never Tailwind blue `#3B82F6`.
- **The palette is exhausted.** The twelve neighbourhood grounds, the four data roles and the ink family take 32 of the catalogue's 33 colours. A fifth data role cannot be given a colour without re-planning the grounds first; it is not solved by typing a hex.
- Unused plate colour: **#a36752** (Sudan Brown). Deliberately not in the interface.
- **Zero** border-radius except a true circle. **Zero** drop shadows except inset hairlines and `:focus-visible`. **Zero** gradients except a flat veil where text must sit on a photo or map.

## Devices
- Hairline 1px rules; boxes are their label plus ~0.5–1× padding. Nothing is inflated to fill a container.
- **Chrome filter chips are hairline instruments, not posters** (owner strip audit, 4 Nov 2026): off = `--rule` border + muted label, on = `--ink` border + ink label, paper ground, 32 px label-plus-padding. The chip row is a dense group — MSH wins over the 44 px rule here; 44 px belongs to isolated controls and full-width rows only. A filled ground means a primary action inside a sheet, never a resting filter state. The map dock (`atlas.css`) speaks the same language.
- **Symbols over words** where the meaning is one glance: `▲▼ → ✓ ▾ ◐ ✦ ↦ ⁘ ◇ ◎ ≋ ✎`. Each carries a fact; none is decoration.
- The semicolon in `PL;UB` is the seam: `PL` = Placemaking Laboratory, `UB` = Urban Bureau.
- Numbers always carry a source and a tier. "Not rated yet" is the honest state; never show a score a visitor did not give.

## Layout
- **Map-first.** The map is ≥60% of the first desktop and phone screen and is the entry (glance law). Readouts and actions dock its edge, never a dead band above it.
- Desktop is a **column** grid: a 360 px rail (bar, filters, list/sheet) + the map. Phone is the map behind a sheet that opens **only on tap** and keeps the pin in view.
- **Named grid: `modular`** for the stamp board (a grid of stamp modules). Its `transform: rotate(-6deg)` on a stamped cell is the deliberate ink-stamp mark, not a stray break. **No other rotation, diagonal or overlap is licensed** — this is a map-first civic tool; the governed grids are `column` and `modular`.
- Chrome is as tall as its contents: bar49px + chips41px =90px at normal type; dense filter controls remain32px. Enlarged text can increase this to preserve complete readable labels.
- One screen first; scroll only for reading depth or genuinely more detail.
- **Manga lens** (`public/manga-lens.js`, one control in the map's corner): the *same* OpenMapTiles source, drawn as line and tone — ink line-work, screentone, paper ground. It is a **lens, not a second map**: no second external geographic feed (the Palette overlay derives from existing footprints), no second style file, and it never declares a building height (unknown stays flat). Owner update7Nov2026: manga is the primary view, opening at close neighbourhood scale in Charoen Krung/Talat Noi; civic daylight is the secondary precision basemap. Both share the same mapped coordinates and GPS; the street sketch is always drawn in line and tone while it is open, and the toggle is disabled there so it cannot lie. The lens washes in over ~240 ms on the reader's own toggle and yields at once on a task change.

## Voice
- EN: plain, civic, confident — state the fact, skip the jargon, no hedging.
- TH: formal-neutral register. First person is strictly **ผม**. Never Sarabun.
- ZH: Simplified.
- The PLUB / Samsamastiti / SCITI wordplay chain is permanent — never "correct" it.

## Protected voice
- phrase "Samastiti": the intended Thai phonetic brand term; never corrected to "Smart City".
- marker "PL;UB": the wordmark construction; the semicolon is load-bearing.
- phrase "straight line": distances are straight-line estimates, never silently sold as walking routes.

## Allow
- rule cream-terracotta: Nong Plub's crayon palette (warm paper, brown hair, brick cheek) is character illustration, not the interface palette. The interface ground is white with Wada plate 273 ink.

- colour #fbf6ea: crayon character paper (illustration only).
- colour #9a6240: crayon character hair highlight (illustration only).

## Building-place colors · owner request7November2026
- Manga footprint fills use Palette combination320: Café=Coral Red`#f58e84`, Co-work=Sulpher Yellow`#f5ecc2`, Library=Oil Green`#819238`, Food=Light Glaucous Blue`#a5c8d1`. These are credited digital catalogue conversions, not exact historical ink. Four data roles, not new interface accents. A fifth role joins only when a rebuild brings the kind: it then takes a colour the catalogue owns and the key's source sentence names it. The catalogue holds no dispensaries yet, so no colour wears that role.
- White paper/dark outlines carry the scene. Category textures render at72% opacity beneath the existing screentone; icons and textures carry meaning without hue. Mixed categories have striped fills.
- A fill says a matching selected category pin lies strictly inside this actual source Polygon. It does not classify the entire building's use or every floor. Unmatched footprints, holes, ambiguous boundaries and outside points remain neutral. Never assign a nearest building. Never tint an entire merged vector-feature ID: one ID may group thousands of unrelated footprints.
- The main map retains source linework, routes and symbols. Native3D uses unchanged explicit source heights, with colors only on the corresponding single-component source footprint. Unknown heights stay flat. Both primary manga and secondary precision mode retain the same position and GPS.
- Street sketch 3D volumes render with manga dot screentone: unclassified extrusions use palette-volume-neutral with a 12% dot tone, palette masks keep colour + texture. No invented height, no second map, tone is runtime.
- The bottom map key is a compact content-sized instrument; source/category explanations live in Key. Header, logo, notebook and filter surfaces keep their existing white/purple identity.
- 3D walkthrough `public/street-world-3d.js` · 2026-11-09: WebGL manga city engine with Wada plate 273 palette, explicit-height only extrusion, collision grid for all footprints, no invented heights per GSH. Screentone shaders are runtime, no second map source.

## Neighborhood atmosphere · owner request7November2026
- A separate quiet ground beneath streets/buildings carries authored neighborhood atmosphere. Existing800m story circles, exact source anchors only; never implied administrative boundaries or amenity evidence. Unassigned city ground stays neutral. CategoryPalette320 meanings remain fixed above it.
- Regional Palette chords176(Ari),227(ThongLo),273(CharoenKrung),320(SamYan),241(Ramkhamhaeng) use locally verified digital catalogue conversions. Broad paper, a secondary band and sparse printed marks at16% opacity (28% before 7Nov Grand Budapest pass); no invented streets/parcels/density. Explain the role and circle limits in Key. This owner-authorized map ground does not add interface accents.
- Real neighborhood reference photos keep visible creator/license/source and changes; never imply the selected venue was photographed. Primary directions stay above this optional reading depth. No AI-generated placeholder photos.

## Grand Budapest basemap · owner request 7November2026
- The manga map's ground follows the Grand Budapest Hotel register, built only from Sanzo Wada catalogue colours (credited digital conversions, `palette/data/colors.json`): ground Hermosa Pink`#f9c1ce`; parks/landcover Turquoise Green`#b5decc` (mint); water Pale King's Blue`#a7d4e4` with Olympic Blue`#5a82b3` waterways and Vandar Poel's Blue`#064f6e` water labels on a white halo; major-road core Pale Lemon Yellow`#ffefae`; all line-work, rail and labels Pansy Purple`#7d133a`; residential hatch Cameo Pink`#e0b3b6`. Buildings stay white (the cut-out façade); the grey screentone is down to12%. Neighbourhood mood grounds drop from28% to16% so they tint the pink rather than stack into a hot pink.
- Every flat field follows an OpenMapTiles class the tiles already carry. No colour states a use, height or boundary the source lacks. Buildings stay white unless a matching pin is inside (Palette320 rule above, now at92% so it reads on white).
- Known limit: café Coral Red against the pink ground is1.5:1. Café fills rely on the plum footprint outline, texture and symbol, never on hue alone.
- `#map` paints the ground colour before the first tile, so a cold load opens on the set, not a void.
- Chrome: the rail owns Find/Explore/Filters/Key at every width; the map dock shows only an active view's status, its way out and "Show matches". One count per view. The phone list toggle is the symbol`☰` (accessible name "List, explore and filters") so all five chips fit at360px with4px gaps. Cluster badges use a hairline border; the single pin is the stronger mark.
## Grand Budapest, second pass · 8November2026
- Single pins wear their category colour (café Coral Red, co-work Sulpher Yellow, library Oil Green, food Light Glaucous Blue, the same chord as footprints and Key), so map pins, list icons and the Key read as one system. "Less documented" cafés stay white with a dashed ring: weaker evidence gets less colour, never the same jewel.
- Cluster badges stay white and scale with their count (icon 0.74×→1.08×, number 11→15px from 2 to 120 places), so the dense quarters are found first instead of fifty equal labels.
- Line weight by role: road casings stay full plum; building edges drop to 34% and paths to 50%. Uniform plum on every edge was noise.
- Neighbourhood mood tiles are flat paper plus sparse dots. The old tile carried a full-width band and a hairline, which repeated as pale horizontal stripes and read as tile seams. The 800m frame, its fill and its label are plum, no longer near-black `#20201d`.
- Collapsed attribution is its 28px icon, nothing wider.
