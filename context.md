# BKK Co. · Bangkok Co(working) — project context

**Live:** https://bkkco.nonarkara.org · **Repo:** github.com/Nonarkara/bkk-co (private) · **Tier:** T1 Pilot
**Name:** Bangkok Co(working), short form BKK Co. It replaces the old "Bangkok IOC" identity of this folder; do not use that name for this system.
**Home folder:** `~/Projects/bangkok-ioc/bkk-co` (folder name is historical). Sibling checkouts there are other projects with their own deploys — never deploy them from here.
**Domain history:** briefly served at co.nonarkara.org on 2026-11-02, moved to bkkco.nonarkara.org the same day.

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

Counts (build of 2026-11-02): 57,819 places = 20,372 café + 36,961 restaurant + 57 co-working + 429 library.
Only 535 carry a Wi-Fi tag and ~1,500 carry opening hours; the crowd scores are what fills the gap.

## Runtime
- Cloudflare Worker `bkk-co` (static assets + `/api/scores`), account `74ad6bf8dfaaccf82de6f0847f7d2d54`.
- D1 `bkk-co` (id in `wrangler.toml`), table `ratings`. Secret `IP_SALT` (salted IP hash only, PDPA; no raw IPs, no accounts).
- Limits: 1 rating per place per IP per day, 20 per IP per day. Writes fail closed (503) without the salt.
- Front end: no bundler. `public/app.js`, `hours.js`, `style.css`. MapLibre 4.7.1 + OpenFreeMap positron.

## Checks
`node test/check.mjs` (catalogue conservation law, validator, hours) · `node test/check.mjs https://bkkco.nonarkara.org` (also live API; writes one real rating).

## Design
Civic daylight register, MSH (`~/Projects/_reference/MSH.md`). Jost + Prompt, ink/muted/rule, one amber = co-working.
Zero radius, no shadows, sizes 20/14/11. Map ≥60% on load; phone sheet opens only on tap and keeps the pin in view.
