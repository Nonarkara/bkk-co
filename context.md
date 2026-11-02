# BKK Co. · Bangkok Co(working) — project context

**Live:** https://co.nonarkara.org · **Repo:** github.com/Nonarkara/bkk-co (private) · **Tier:** T1 Pilot
**Name:** Bangkok Co(working), short form BKK Co. It replaces the old "Bangkok IOC" identity of this folder; do not use that name for this system.
**Home folder:** `~/Projects/bangkok-ioc/bkk-co` (folder name is historical). Sibling checkouts there are other projects with their own deploys — never deploy them from here.
**Domain history:** co.nonarkara.org is primary (owner's choice). bkkco.nonarkara.org, used briefly on 2026-11-02, 301-redirects to it.

## What it is
One map of Bangkok places you can work from: cafés, co-working, libraries, restaurants.
Places come from open data; work scores (Wi-Fi, outlets, quiet, laptop-friendly) come from visitors.

## Data (rebuild: `python3 scripts/build-places.py`)
| Source | Licence | Pin | Notes |
|---|---|---|---|
| OpenStreetMap, Geofabrik `thailand-261024.osm.pbf` | ODbL-1.0 | node, or mean of the venue's own footprint | MD5-pinned; unnamed venues dropped, never named |
| Overture Maps Places `2026-10-21.0` | CDLA-Permissive-2.0 | source point | confidence floor cafe 0.6, restaurant 0.8, coworking 0.5, library 0.6; open only |

Merge rule: same normalised name within 60 m = one venue, OSM wins and borrows Overture's website/phone.
Raw sources live in `../source-cache/` (outside the repo). Refresh Overture: `--fetch-overture`, then bump `OV_RELEASE`.
Not used on purpose: Google Maps scraping or API (ToS, takedown risk, cost). Add the paid Places API later if cash flow allows.

Counts (build of 2026-11-02, v2): 57,537 places = 20,235 café + 36,818 restaurant + 56 co-working + 428 library.
Names that only describe a category ("Entrance", "ร้านอาหาร" = "restaurant") are dropped like unnamed ones; Latin-letter matching merges OSM/Overture twins.
Only 535 carry a Wi-Fi tag and ~1,500 carry opening hours; the crowd scores are what fills the gap.

## Great Good Place metrics (v2) — `scripts/build-places.py`
Six per-place deciles (`metrics` string `ASCFWN`) plus a 0-100 index (mean of the A/S/C/F percentiles):
| | Metric | Computed from | Grounding |
|---|---|---|---|
| ↦ A | Access | walk distance to nearest OSM rail station | Jeffres et al. 2009 (accessibility → community QoL) |
| ⁘ S | Scene | third places within 250 m | Adelfio et al. 2020 (third places as clusters) |
| ◇ C | Character | not a chain: no brand tag, name seen < 3× | Mehta & Bosson 2010 (personalization) |
| ◎ F | Footprint | datasets + channels that know it (OSM, Meta, Foursquare, AllThePlaces, Microsoft, web, social, phone) | Adelfio et al. 2020 (cross-validate sources) — popularity proxy |
| ≋ W | Work | co-working/library, Wi-Fi tag, hours; visitor scores add live | BKK Co. |
| ✦ N | Notable | Wikidata/Wikipedia/heritage tag on the venue | prestige; only 15 places — shown, kept out of the index |
Sorts in the UI: Great (index), Near, Popular (F), Notable (N), Work (W + visitor scores).

## Neighbourhoods (v2) — `scripts/build-hoods.py`
Ari (BTS Ari), Sam Yan (MRT Sam Yan), Charoen Krung (TCDC node), Thong Lo (BTS Thong Lo). Each = 800 m around a real OSM anchor, never a drawn polygon.
Stories with sources live in the script. Stats, station rank (of 200 merged OSM stations), and "Plub's walk" (co-working/libraries first, then Wi-Fi, then index) are computed.

## Passport (v2) — `public/passport.js`
IndexedDB on the device only: visits, 1-5 stars, feeling words, note, up to 4 photos shrunk to 1280 px JPEG. Export/import JSON is the backup. No server copy (PDPA-simple). Sync is an app-stage feature.

## Nong Plub (v2) — `public/plub.js`
Hand-drawn chibi SVG with a crayon displacement filter, six poses (wave, point, sketch, stamp, map, cheer). Not AI-generated; based on the SCITI drawings' hair, cheeks and plaid dress.

## Runtime
- Cloudflare Worker `bkk-co` (static assets + `/api/scores`), account `74ad6bf8dfaaccf82de6f0847f7d2d54`.
- D1 `bkk-co` (id in `wrangler.toml`), table `ratings`. Secret `IP_SALT` (salted IP hash only, PDPA; no raw IPs, no accounts).
- Limits: 1 rating per place per IP per day, 20 per IP per day. Writes fail closed (503) without the salt.
- Front end: no bundler. `public/app.js`, `hours.js`, `style.css`. MapLibre 4.7.1 + OpenFreeMap positron.

## Checks
`node test/check.mjs` (catalogue conservation law, validator, hours) · `node test/check.mjs https://co.nonarkara.org` (live API, read-only) · add `--write` only against `wrangler dev`.

## Design
Civic daylight register, MSH (`~/Projects/_reference/MSH.md`). Jost + Prompt, ink/muted/rule, one amber = co-working.
Zero radius, no shadows, sizes 20/14/11. Map ≥60% on load; phone sheet opens only on tap and keeps the pin in view.
