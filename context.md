# PLUB · Placemaking Laboratory Urban Bureau — project context

**Live:** https://co.nonarkara.org · **Repo:** github.com/Nonarkara/bkk-co (private) · **Tier:** T1 Pilot
**Name:** PLUB, Placemaking Laboratory Urban Bureau (owner's choice, 2026-11-02). Nong Plub is the bureau's guide. Earlier names, in order: Bangkok IOC (retired), BKK Co. / Bangkok Co(working). Infra ids keep `bkk-co` (Worker, D1, repo, passport file `app` field) so nothing breaks; never show them as the name.
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

Counts (build of 2026-11-02, v2): 57,538 places = 20,235 café + 36,818 restaurant + 57 co-working + 428 library.
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
| ≋ W | Work | co-working/library, Wi-Fi tag, hours; visitor scores add live | PLUB |
| ✦ N | Notable | Wikidata/Wikipedia/heritage tag on the venue | prestige; only 15 places — shown, kept out of the index |
Sorts in the UI: Great (index), Near, Popular (F), Notable (N), Work (W + visitor scores).

## Neighbourhoods (v2) — `scripts/build-hoods.py`
Ari (BTS Ari), Sam Yan (MRT Sam Yan), Charoen Krung (TCDC node), Thong Lo (BTS Thong Lo). Each = 800 m around a real OSM anchor, never a drawn polygon.
Stories with sources live in the script. Stats, station rank (of 200 merged OSM stations), and "Plub's walk" (co-working/libraries first, then Wi-Fi, then index) are computed.

## Passport (v2) — `public/passport.js`
IndexedDB remains the device notebook: visits, optional1–5 stars, feelings, notes and up to4 resized photos. Existing v1 exports/imports and stamps remain supported. The3November increment adds explicit per-visit cloud backup/restore, separate notebook-key accounts and optional public recommendations. Nothing uploads or publishes automatically. There is no passive location log. See the notebook section below.

## Nong Plub (v2) — `public/plub.js`
Hand-drawn chibi SVG with a crayon displacement filter, six poses (wave, point, sketch, stamp, map, cheer). Not AI-generated; based on the SCITI drawings' hair, cheeks and plaid dress.

## Link previews (v2)
`public/og/{default,ari,samyan,charoenkrung,thonglo}.png` (1200×630) carry real numbers, so **regenerate after every `build-hoods.py`**:
run `scripts/og-cards.js` in the browser console on `wrangler dev`, with a local receiver on :8811 that writes POSTed data-URL PNGs to `public/og/`.
The Worker (`withPreview`, HTMLRewriter) sets title / og:description / og:image for `?hood=` and `?p=` links.

## Chain detection (Character)
Chain = brand tag, or name seen ≥3×, or brand key (name minus branch suffix: `(`, `@`, ` - `, `สาขา`, ` at `) seen ≥3×,
or a name starting with a brand key of 6+ letters seen ≥3×, or a `KNOWN_CHAINS` brand (short manual list for chains with few Bangkok branches). 16,487 of 57,538 places flagged (2026-11-02).

## Finding places (v3)
- **Moods** (`MOODS` in app.js): each neighbourhood's "for" line searched citywide. Slow mornings = independent cafés with ⁘ ≤ 6; Past midnight = work spots listed open at 00:30 and not closed at 2 pm, so no night-only bars (30; hours are sparse, and the UI says so); Crossing paths = independent work spots with ⁘ ≥ 8; After work = open 8 pm weekday incl. food. `?mood=` links have their own preview title.
- **Near me now** (views.js `openNow`): your location (or map centre, said so), walk ≈ 800 m or drive ≈ 2 km straight line, same bank of the Chao Phraya only. Needs Wi-Fi / Parking (mapped car park ≤ 150 m) / Calm (visitor quiet ≥ 2.5) / Coffee (independent café or a visit noting good coffee, flag 512) are ranked, not required, each ✓ known or ? unknown, with Google and Apple Maps directions. Never a place listed as closed now.
- **Café hop** (`openHop`, `?hop=<slug|here>`): 5 independent cafés ✦ ≥ 70, 250–800 m apart, never crossing the Chao Phraya (`data/barriers.json`, OSM river line), one Google Maps walking link with waypoints; distances are straight lines, so 'at least'. `?hop=@lat,lng` shares a 'here' hop.
- **Parking**: distance to the nearest OSM `amenity=parking` (not private) or Overture `parking`; `F_PARK` when ≤ 150 m (16,625 places). Car parks inside private lots are often unmapped, so "?" stays common.

## Hand pins — `data/additions.json`
Places no open dataset has yet, added after a real visit: name, kind, location confirmed by the visitor, date, description. Built in like OSM (`src: hand`, flag 128) and labelled "Hand pin · who, when · not on OpenStreetMap yet". First: Maison space, Ram Inthra (owner's visit, 2026-11-02). The lasting fix is an OpenStreetMap note (the "Missing a place?" links).

## Runtime
- Cloudflare Worker `bkk-co` (static assets + `/api/scores` + notebook/community APIs), account `74ad6bf8dfaaccf82de6f0847f7d2d54`.
- D1 `bkk-co` (id in `wrangler.toml`), table `ratings`. Secret `IP_SALT` (salted IP hash only, PDPA; no raw IPs in the ratings table; separate notebook accounts).
- Limits: 1 rating per place per IP per day, 20 per IP per day. Writes fail closed (503) without the salt.
- Front end: no bundler. `public/app.js`, `hours.js`, `style.css`. MapLibre 4.7.1 + OpenFreeMap positron.

## Checks
`node test/check.mjs` (catalogue conservation law, validator, hours) · `node test/check.mjs https://co.nonarkara.org` (live API, read-only) · add `--write` only against `wrangler dev`.

## Design
Civic daylight register, MSH (`~/Projects/_reference/MSH.md`). Jost + Prompt, ink/muted/rule, one amber = co-working.
Zero radius, no shadows, sizes 20/14/11. Map ≥60% on load; phone sheet opens only on tap and keeps the pin in view.


## Notebook release · 3 November2026

Owner chose notebook-key accounts now; Google sign-in later. User task: find a real place, keep a dated note/photo, reopen it tomorrow and optionally recommend it. The invariant is private/device, private/cloud, public and research are four distinct choices. Backups target one authenticated account and expected revision; publishing uses the reviewed snapshot. No default research opt-in, no GPS trail, no sale of private notes.

Schema `db/notebook.sql` adds accounts, hash-only session/recovery credentials, private entries, separate published snapshots, reports and security limits; all ownership relations cascade on deletion. It never drops/changes ratings. Apply additively before Worker deploy. Worker has a daily18:15UTC cleanup for expired sessions/security buckets. Each cloud account supports100 visits; up to4 bounded metadata-stripped JPEGs per visit. Public lists return5 recent recommendations, moderation10 prioritised posts; full private/public exports fetch individual snapshots to bound memory. Active reports cap200/account.

Nong Plub's crayon SVG is preserved as the in-sheet guide (see the logo section below for the 3 November brand art). Wada plate273 (local credited catalogue): Hermosa Pink#f9c1ce guide field; Pansy Purple#7d133a reading ink; Neutral Gray#b6bfc1 structure; These three interface colours are a subset of the four-colour plate (its unused fourth is Sudan Brown#a36752); existing guide artwork keeps its own recognisable colours. White is the reading carrier; wash/muted tokens are derived tints. Existing source map colours and amber co-working category remain unchanged. This named palette update is owner-directed; it supersedes the older monochrome ink value. Sizes are20/14/12 (12px qualifications improve phone reading). Geometry stays sharp, with no decorative shadows or gradients.

Notebook composition: entries and their actions precede guide/stamps/device/moderation tools when populated. First saved action group must end before600px and within the working viewport at390/1024/1440 and1280×720. The older utility-first arrangement must fail. Map-first on-load composition stays intact. Enlarged text can reflow/scroll and must still support editing. See docs/notebook-2026-11-03 for captures and independent closure.

Cloud session:30-day HttpOnly/SameSite=Strict cookie, Secure on HTTPS. Key is generated once and downloadable; lost keys cannot be recovered. No Google OAuth credential is configured or claimed. The authenticated UI must match x-plub-account before private operations; never use a new tab's account silently. Sign-out retains device copies, with explicit Clear device. Deleting a cloud copy removes its public snapshot and unlinks local cloud metadata. Account removal deletes live cloud data; provider recovery backups can remain up to30 days.

Owner moderation: MODERATION_KEY is a Worker secret, saved in macOS Keychain as `co.nonarkara.org · PLUB moderation` (account `nonarkara`). Retrieve through Keychain Access and use Notes → Moderation · owner. Never put the value in Markdown, Git or URLs. Queue shows reported photo copies and can keep visible/clear reports or remove posts. Three distinct reports temporarily hide a post. Operator public contact is nonsmartcity@gmail.com, verified on nonarkara.org.

Research: only opted-in accounts' saved place IDs/counts enter the aggregate; public totals require5 distinct consenting accounts per place. Notes/photos/dates are excluded. Withdrawal excludes the account immediately on the next query. Consent version2026-11-03 is recorded. This is a pilot; names and visits are user assertions, not verified footfall or continuous travel observations.

Web manifest/icons enable home-screen installation. No offline map/sync or Google Play listing is claimed. A future store release still needs packaging, OAuth choices and wider operational testing.

Tests: existing `node test/check.mjs [base]`; `node test/notebook-races.mjs`; `node test/notebook-dates.mjs`; local Worker/D1 `node test/notebook-api.mjs`; sequential local real-browser notebook/edge/draft scripts. Write tests refuse a public URL. Read-only production verification remains separate. Build: `npx wrangler deploy --dry-run`; deploy from this repo only with `npx wrangler deploy`.

## Logo and wordmark · 3 November 2026 (owner-directed)

The wordmark is **PL;UB**: `PL` = Placemaking Laboratory, `UB` = Urban Bureau, and the semicolon is the seam between the two phrases. It is set in **Sao Chingcha**, the owner's own lettering (files in `public/fonts/`, self-hosted woff2, preloaded), ALL CAPS Bold. The semicolon carries Hermosa Pink `#e88ba1`; everything else is Pansy Purple. The teaching line `placemaking laboratory ; urban bureau` sits under the wordmark where there is room (share card). The title tag keeps the plain "PLUB" so OS and browser labels stay clean.

Nong Plub's brand art is the SD crayon sticker approved 2026-11-03 (`public/plub/nong-plub.png` full figure, `nong-plub-head.png` for small sizes, home-screen icons redrawn from her head on the Hermosa Pink field). Source: mflux/Flux schnell on the M5 Max, from the owner's reference drawings (brown wavy bob, rosy cheeks, dark plum-navy plaid dress). **Consistency rule to keep:** the new sticker is the badge and the large brand figure (header button, guide hero, share card, icons); the established `plub.js` vector poses stay for the in-sheet guide speech (`plub-say`), where each pose carries meaning (map, stamp, point). Do not mix the two in one block. Unifying them needs a generated pose set and is a later pass; the owner's stated next step is a more masterful logo than pure text.

## Third-party review sites — Wongnai (policy · 3 November 2026)

Owner asked to scrape Wongnai for venue info and photos with credit and a link back. Checked before building: Wongnai's Terms of Service (§2(3), updated 5 September 2024) forbid collecting venue data, addresses, reviews and images "for any purpose whatsoever, unless permitted by the company", and §5 states the site's data, images and database are their sole IP. robots.txt allows crawling except `/users/`, but robots is not the contract. This is the same exposure the project already refuses for Google Maps (see the data table above).

**Policy:** PLUB does not scrape or re-host Wongnai content. What ships instead is a lawful handoff — place sheets for cafés and restaurants link out to Wongnai search for the venue name (`rel="noopener nofollow"`, labelled "Photos & reviews ↗ Wongnai"). A hyperlink is not collection, and it sends them the traffic the owner wanted. The route to actually displaying their facts and photos is permission: a partnership or API agreement. Draft outreach is in `docs/WONGNAI.md`; the rights-clean alternative for PLUB's own photography is visitor photos (already in the notebook) plus credited CC sources.

## Café evidence and usability audit · 3 November2026

Pinned CC0AllThePlaces Amazon contact enrichment fills352phones/10addresses across357existingplaces;984mutuallyunique same-brand cafés≤30m. No new/moved pins, hours or ranking changes. Every field has sourceID/ref/run/date/distance, visible dated source disclosure;data/atp-cafe-amazon.json andpublic/data/enrichment.json hold the contract/audit. Basebuilder invokesenrichment automatically;separate script is idempotent. Amazon feed contains nohours;Starbucks output unavailable/empty, so hours remainunknown. See docs/audit-2026-11-03/DATA.md.

Hours, future mood clocks and café-hop11am use Bangkok irrespectiveof device timezone; invalidclockstrings areunknown. Primary logaction now besideplaceidentity, beforeindex. Selectedphotos preview before save; fullprivate/public/moderation photos open in keyboardaccessible dialog. Retired BlobURLs reclaimed; controls wrap/grow at30pxtext. Deviceexports offer individually downloadable parts underimport limits;stablebackupidentity preserves multiplesame-dayvisits andidempotentrestore without importingcloudownership. Direct API suite stillstateful; preferredrepeatable runner node scripts/test-notebook-isolated.mjs creates itsownfreshD1 ratherthan deleting sharedstate. Independentreview and4viewport evidence in docs/audit-2026-11-03.
