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
- Accent **#f59e0b** (amber) — **one job only: the co-working category dot.** Never a second accent, never Tailwind blue `#3B82F6`.
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
- **Manga lens** (`public/manga-lens.js`, one control in the map's corner): the *same* OpenMapTiles source, drawn as line and tone — ink line-work, screentone, paper ground. It is a **lens, not a second map**: no second data source, no second style file, and it never declares a building height (unknown stays flat). Owner update7Nov2026: manga is the primary view, opening at close neighbourhood scale in Charoen Krung/Talat Noi; civic daylight is the secondary precision basemap. Both share the same mapped coordinates and GPS; the street sketch is always drawn in line and tone while it is open, and the toggle is disabled there so it cannot lie. The lens washes in over ~240 ms on the reader's own toggle and yields at once on a task change.

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
- Manga footprint fills use Palette combination320: Café=Coral Red`#f58e84`, Co-work=Sulpher Yellow`#f5ecc2`, Library=Oil Green`#819238`, Food=Light Glaucous Blue`#a5c8d1`. These are credited digital catalogue conversions, not exact historical ink. Four data roles, not new interface accents.
- White paper/dark outlines carry the scene. Category textures render at72% opacity beneath the existing screentone; icons and textures carry meaning without hue. Mixed categories have striped fills.
- A fill says a matching selected category pin lies strictly inside this actual source Polygon. It does not classify the entire building's use or every floor. Unmatched footprints, holes, ambiguous boundaries and outside points remain neutral. Never assign a nearest building. Never tint an entire merged vector-feature ID: one ID may group thousands of unrelated footprints.
- The main map retains source linework, routes and symbols. Native3D uses unchanged explicit source heights, with colors only on the corresponding single-component source footprint. Unknown heights stay flat. Both primary manga and secondary precision mode retain the same position and GPS.
- The bottom map key is a compact content-sized instrument; source/category explanations live in Key. Header, logo, notebook and filter surfaces keep their existing white/purple identity.
