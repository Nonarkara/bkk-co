# PLUB · Placemaking Laboratory Urban Bureau — project context

**Live:** https://co.nonarkara.org · **Repo:** github.com/Nonarkara/bkk-co (private) · **Tier:** T1 Pilot
**Name:** PLUB, Placemaking Laboratory Urban Bureau (owner's choice, 2026-11-02). Nong Plub is the bureau's guide. Earlier names, in order: Bangkok IOC (retired), BKK Co. / Bangkok Co(working). Infra ids keep `bkk-co` (Worker, D1, repo, passport file `app` field) so nothing breaks; never show them as the name.
**Home folder:** `~/Projects/bangkok-ioc/bkk-co` (folder name is historical). Sibling checkouts there are other projects with their own deploys — never deploy them from here.
**Domain history:** co.nonarkara.org is primary (owner's choice). bkkco.nonarkara.org, used briefly on 2026-11-02, 301-redirects to it.

## Agent continuation — 5 November 2026

MiniMax/other adopted work in ee26572/ba6be14/4d496db is preserved. Manga lens lifecycle, failure/retry, residential tone and route-number contrast repaired. Backend hop logs completed with compact explicit public UI, exact stop ordering/preview, opt-in photos, complete own export/report data, account quota100 and both moderation queues. Existing notebook/privacy/source/catalogue behavior retained. New tests: manga-motion (CI), manga-browser (local), hop-logs and isolated hop-browser. Evidence, independent review and final source/Worker proof: docs/continuation-2026-11-05/. Previous dated release reports below remain historical.

## Integration — 4 November 2026

57,379 cleaned places; 86 retired-ID aliases remain authoritative. Compact list tools are 83px on phone and 81px on desktop; default sort is distance from map centre. Explore and Filters disclose secondary choices. Five optional source-backed Street sketch areas use actual OSM street nodes and explicit building heights only; unknowns stay flat. PR7 media and PR8 density are adapted against current main, with source uncertainty and exact count tests. See docs/reconciliation-2026-11-04/{PR-LEDGER,WORLD-REVIEW,VALIDATION,DATA,SHIP}.md for provenance, release evidence and limitations. Global and repo AGENTS.md persist MSH, attention hierarchy and interruptible motion. Historical counts and reports below retain their dates.

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

## Nong Plub
`public/plub.js` retains the six original hand-drawn vector poses as an archive. The visible interface now uses `guideArt()` and the intact `public/plub/nong-plub.png` sticker everywhere. The owner rejected mixing the vector and sticker styles on3November. Preserve the archive; do not restore mixed visible styles.

## Brand and link-preview assets
Run `PLUB_URL=http://localhost:43827 node scripts/build-brand-assets.mjs` against the local Worker. It renders the192/512icons and all five1200×630preview cards from the intact sticker, Sao Chingcha PL;UB wordmark and current catalogue/neighbourhood data. The old browser receiver helper remains compatibility tooling, not the primary build path. Preview URLs and manifest icon URLs carry the release version. Regenerate after changing neighbourhood counts; never publish old vector cards beside sticker branding.

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

Three laws govern every screen, in this order: **MSH** (boxes fit content, compact first, no void), then **glance path** (`_reference/GLANCE-PATH-FOR-AI.md`: the map is the entry on load; a place or notebook sheet puts its headline, key number and action on the exit of whatever is heaviest; Tab order equals eye order), then **kinetic grids** (`_reference/KINETIC-GRIDS-FOR-AI.md`: this is a map-first product, so the governed grids are `column` and `modular` — no rotation, no diagonal, no overlap without a named grid in the brief). Canonical scanner and skills: `~/Projects/Non-Slop/`.
Zero radius, no shadows, sizes 20/14/11. Map ≥60% on load; phone sheet opens only on tap and keeps the pin in view.


## Notebook release · 3 November2026

Owner chose notebook-key accounts now; Google sign-in later. User task: find a real place, keep a dated note/photo, reopen it tomorrow and optionally recommend it. The invariant is private/device, private/cloud, public and research are four distinct choices. Backups target one authenticated account and expected revision; publishing uses the reviewed snapshot. No default research opt-in, no GPS trail, no sale of private notes.

Schema `db/notebook.sql` adds accounts, hash-only session/recovery credentials, private entries, separate published snapshots, reports and security limits; all ownership relations cascade on deletion. It never drops/changes ratings. Apply additively before Worker deploy. Worker has a daily18:15UTC cleanup for expired sessions/security buckets. Each cloud account supports100 visits; up to4 bounded metadata-stripped JPEGs per visit. Public lists return5 recent recommendations, moderation10 prioritised posts; full private/public exports fetch individual snapshots to bound memory. Active reports cap200/account.

Nong Plub's vector source is archived; all visible guide surfaces use the same intact sticker, following the owner's3November consistency correction. Wada plate273 (local credited catalogue): Hermosa Pink#f9c1ce guide field; Pansy Purple#7d133a reading ink; Neutral Gray#b6bfc1 structure; These three interface colours are a subset of the four-colour plate (its unused fourth is Sudan Brown#a36752); existing guide artwork keeps its own recognisable colours. White is the reading carrier; wash/muted tokens are derived tints. Existing source map colours and amber co-working category remain unchanged. This named palette update is owner-directed; it supersedes the older monochrome ink value. Sizes are20/14/12 (12px qualifications improve phone reading). Geometry stays sharp, with no decorative shadows or gradients.

Notebook composition: entries and their actions precede guide/stamps/device/moderation tools when populated. First saved action group must end before600px and within the working viewport at390/1024/1440 and1280×720. The older utility-first arrangement must fail. Map-first on-load composition stays intact. Enlarged text can reflow/scroll and must still support editing. See docs/notebook-2026-11-03 for captures and independent closure.

Cloud session:30-day HttpOnly/SameSite=Strict cookie, Secure on HTTPS. Key is generated once and downloadable; lost keys cannot be recovered. No Google OAuth credential is configured or claimed. The authenticated UI must match x-plub-account before private operations; never use a new tab's account silently. Sign-out retains device copies, with explicit Clear device. Deleting a cloud copy removes its public snapshot and unlinks local cloud metadata. Account removal deletes live cloud data; provider recovery backups can remain up to30 days.

Owner moderation: MODERATION_KEY is a Worker secret, saved in macOS Keychain as `co.nonarkara.org · PLUB moderation` (account `nonarkara`). Retrieve through Keychain Access and use Notes → Moderation · owner. Never put the value in Markdown, Git or URLs. Queue shows reported photo copies and can keep visible/clear reports or remove posts. Three distinct reports temporarily hide a post. Operator public contact is nonsmartcity@gmail.com, verified on nonarkara.org.

Research: only opted-in accounts' saved place IDs/counts enter the aggregate; public totals require5 distinct consenting accounts per place. Notes/photos/dates are excluded. Withdrawal excludes the account immediately on the next query. Consent version2026-11-03 is recorded. This is a pilot; names and visits are user assertions, not verified footfall or continuous travel observations.

Web manifest/icons enable home-screen installation. No offline map/sync or Google Play listing is claimed. A future store release still needs packaging, OAuth choices and wider operational testing.

Tests: existing `node test/check.mjs [base]`; `node test/notebook-races.mjs`; `node test/notebook-dates.mjs`; local Worker/D1 `node test/notebook-api.mjs`; sequential local real-browser notebook/edge/draft scripts. Write tests refuse a public URL. Read-only production verification remains separate. Build: `npx wrangler deploy --dry-run`; deploy from this repo only with `npx wrangler deploy`.

## Logo and wordmark · 3 November 2026 (owner-directed)

The wordmark is **PL;UB**: `PL` = Placemaking Laboratory, `UB` = Urban Bureau, and the semicolon is the seam between the two phrases. It is set in **Sao Chingcha**, the owner's own lettering (files in `public/fonts/`, self-hosted woff2, preloaded), ALL CAPS Bold. The semicolon carries Hermosa Pink `#e88ba1`; everything else is Pansy Purple. The teaching line `placemaking laboratory ; urban bureau` sits under the wordmark where there is room (share card). The title tag keeps the plain "PLUB" so OS and browser labels stay clean.

Nong Plub's brand art is the approved SD sticker in `public/plub/nong-plub.png`, generated locally from the owner's reference drawings. It is the only visible character source: header portrait, full guide figures, install icons and all preview/stamp cards. The old head PNG cuts through the lower face and must not be used. The header takes its portrait from the intact full image; larger figures preserve natural aspect ratio at104px height. Original vector poses remain archived, not rendered beside the sticker. This owner correction supersedes the earlier rule that allowed different styles in different blocks.


## Third-party review sites — Wongnai (policy · 3 November 2026)

Owner asked to scrape Wongnai for venue info and photos with credit and a link back. Checked before building: Wongnai's Terms of Service (§2(3), updated 5 September 2024) forbid collecting venue data, addresses, reviews and images "for any purpose whatsoever, unless permitted by the company", and §5 states the site's data, images and database are their sole IP. robots.txt allows crawling except `/users/`, but robots is not the contract. This is the same exposure the project already refuses for Google Maps (see the data table above).

**Policy:** PLUB does not scrape or re-host Wongnai content. What ships instead is a lawful handoff — place sheets for cafés and restaurants link out to Wongnai search for the venue name (`rel="noopener nofollow"`, labelled "Photos & reviews ↗ Wongnai"). A hyperlink is not collection, and it sends them the traffic the owner wanted. The route to actually displaying their facts and photos is permission: a partnership or API agreement. Draft outreach is in `docs/WONGNAI.md`; the rights-clean alternative for PLUB's own photography is visitor photos (already in the notebook) plus credited CC sources.

## Café evidence and usability audit · 3 November2026

Pinned CC0AllThePlaces Amazon contact enrichment fills352phones/10addresses across357existingplaces;984mutuallyunique same-brand cafés≤30m. No new/moved pins, hours or ranking changes. Every field has sourceID/ref/run/date/distance, visible dated source disclosure;data/atp-cafe-amazon.json andpublic/data/enrichment.json hold the contract/audit. Basebuilder invokesenrichment automatically;separate script is idempotent. Amazon feed contains nohours;Starbucks output unavailable/empty, so hours remainunknown. See docs/audit-2026-11-03/DATA.md.

Hours, future mood clocks and café-hop11am use Bangkok irrespectiveof device timezone; invalidclockstrings areunknown. Primary logaction now besideplaceidentity, beforeindex. Selectedphotos preview before save; fullprivate/public/moderation photos open in keyboardaccessible dialog. Retired BlobURLs reclaimed; controls wrap/grow at30pxtext. Deviceexports offer individually downloadable parts underimport limits;stablebackupidentity preserves multiplesame-dayvisits andidempotentrestore without importingcloudownership. Direct API suite stillstateful; preferredrepeatable runner node scripts/test-notebook-isolated.mjs creates itsownfreshD1 ratherthan deleting sharedstate. Independentreview and4viewport evidence in docs/audit-2026-11-03.

## Whole-interface visual and café-discovery release · 3 November2026

The owner's Ari screenshot exposed failures outside the earlier notebook-only audit. Neighbourhood title/mood/action groups now fit content; statistics are comparison rows rather than equal-height blocks. Generic hop coaching follows the route inside a labelled disclosure, keeping stops and directions together. Discovery-source links use compact dates with full accessible titles.

`public/data/discovery.json`, built by `scripts/build-discovery.py`, holds50 publisher/institution entries and50 public-discussion entities. The former includes20 Time Out article-scoped ranks plus features/directories; the latter counts distinct mentions in four sampled March–August2026threads. These are neither a citywide league table nor current trends/endorsements. Every source and publication date remains accessible. All new `place_id` assignments are null: candidate names/brands offer deliberate branch search, never guessed pins. Existing57,538catalogue rows and rankings remain unchanged.

Route layers and numbers render above catalogue pins and retain exact source IDs for clicks. Latest route intent waits for map readiness; cancellation wins. Selection survives late style load, and startup does not replace an open notebook. Neighbourhood/route layers initialise once whether the map style or view module arrives first. Deterministic delayed-style/module tests cover these races.

Evidence: docs/visual-2026-11-03. Capture after map movement, tiles, fonts and images settle. Main regression tests: visual-composition, visual-falsifiers, route-order, map-readiness, map-module-readiness, discovery/discovery-browser, branding. Public write APIs and notebook privacy/consent boundaries are unchanged.

## Counted café atlas · 3 November 2026

The city/street index cutoffs were hiding most places. The active source now clusters every matching original point; category glyphs replace black dots and co-located clusters expose their actual IDs. Actual device 4–5/5 visits produce personal stars; only 25 branch-verified publication/discussion records can produce source evidence, with direct links even before geographic data loads. Scores/indexes never become stars.

Explore offers catalogue-density hotspots, no-chain-signal cafés, low-footprint cafés, ≤300 m straight-line mapped-park proximity, sampled branch discussions, documented architecture/shophouses, 308 real named street segments and three-café straight-line triangles. The latter require loaded river geometry and make no road/canal/access/hours claim. The joins use original UTM 47N geometries; only display polygons/lines are simplified. All 57,538 source IDs/coordinates/flags/scores remain byte-identical. The 78 districts include all 50 in Bangkok; surrounding district counts cover only the catalogue boundary. Sources/methods/licences/asof/hashes: docs/atlas-2026-11-03/DATA.md and EVIDENCE.md.

Compact map tools follow the measured phone header height, including enlarged text. Sparse evidence modes fit actual matches; panning to an empty area offers Show matches. Six independent district spotlights rotate by Bangkok date, not quality ranking or owner affiliation. New data is lazy except the small publication badge feed; failures preserve the base map/notebook and river failure refuses triangle suggestions. Validation/review/release proof lives in docs/atlas-2026-11-03.

Atlas shipped through PR4, final runtime source fced672, Worker c227db3d-cc4a-406e-8ac9-a7ffc9fdb26d.204/204livefiles match; public390/1440all-nine-mode checks pass. Final runtime CI41592895888 passes. Proof/limits: docs/atlas-2026-11-03/SHIP.md.

## Task-first work journeys · 3 November 2026

Find a work spot is now the primary compact on-map action. Drive+park, BTS/rail and two-hours-nearby searches share Laptop/Online/Reading needs. All model answers carry operator/editorial/visitor/OSM basis; unknown is not positive. Visitor scores use1=None/No,2–3positive, intermediate averagesunknown. Nearby parking with unknown/private/customer access does not become usable venue parking. First-party branch hours take precedence in displayed hours/open filters without changing source catalogue rows.

New OSM snapshots:226 raw station nodes (225eligible),63explicitBTS,286point-only named barber origins,20720workplacejoins; restricted Chitlada remains metadata and never contributes a public rail match. Public source evidence covers6existingbranches/11sources, including VichSpaceRamkhamhaeng equipment/buildingparking and TKPark/TrueSpace/Samyan work facts. Source tables in docs/journeys-2026-11-03/GEO.md/EVIDENCE.md. No geocoder dependency, new traffic API or backend schema. GPS is click-only/in-memory. Directions carry actual chosen origin/destination; Rail does not inherit an invisible old barber origin. Last-mile distances are station-point straight lines, not entrance/walking routes.

A small sheetGeneration guard makes Notebook loading immediate and prevents delayed device reads from replacing a newer finder. Existing notebook tools/photos/moderation, map routes/atlas/discovery and branding stay available. Tests/review/live proof: docs/journeys-2026-11-03.

Journeys shipped via PR5; final runtime3f67c4c, Worker d38e376b-9d22-4107-9434-5cb048050aeb.210/210publicfiles match; live360/390/1024/1440journey flows and marker-control clearance pass; CI41599704870 passes. Full verification/source limits: docs/journeys-2026-11-03/SHIP.md.

## Everyday places and community paths · 3 November 2026

Meet's space Cafe is now o825832f94e7f at its original Overture POINT (rounded13.76998,100.61656). Its halal_restaurant classification caused the0.775496 record to miss restaurant0.8; operator/phone/address evidence supports one exact-ID café override passing the existing0.6 café threshold. No floor lowered. All57538previous catalogue rows/coordinates/metrics and all previous atlas/journey joins retain exact values. Total57539/cafés20236; work SHA0bb9a767b51606ee5a785bf441daefe387ea50b377ff847dcd747e18296ebc30. Base ingestion applies the reviewed exception; geo/street builders derive manifest counts. Full fresh ingestion and all3geographic builders reproduce it. No facility/star/ranking boost from Non's visit. Mother RoasterTalatNoi/HongSiengKong source evidence added; stale Patina branch match rejected.

PlaceTools supplies category SVGs for filter/list/search, token/apostrophe/Latinaccent search preserving Thai marks, fullGoogleMapsplace-link NAME extraction without network access, and native-share/clipboard/manualcopy with late-result suppression. Existing category map sprites/badges/Key remain. Search/Explore opens mapped publisher features, with branch/source/date and adjacent place/directions;50+50research lists remain separate. A global .send grid-column rule had forced the two place actions into separate rows; scoped auto-column restores one row while the visit form spans the full group.

Place-level Notes&photos and Addrecommendation expose the existing backend. Compose→private device save→optional contextual account/key→preview→explicit publish. Photos unchecked by default. Never auto-upload from saving/preview. Short recommendation/community states fit content and restore related catalogue rows beneath ondesktop; long notebook keeps its established fullheight.44px changed targets and original styles/brand/maps retained. Source evidence loads on direct place entry without waiting for largegeo feeds. New async guards prevent late details/auth/backup/clipboard/errors replacing newer intent or borrowing another preview's photo choice.

Independent MSH reviewer /root/community_audit PASS; geometry at390/1024/1440 and30pxbody; original fullheight and fullspan faults falsified. Local actual browser flows at360/390/1024/1440/1280; original journeys/discovery and67/67API assertions pass. Fresh immutable browser runner avoids active-dev Worker restart corrupting streamed JSON/POSTs. Detailed final release proof: docs/community-2026-11-03/SHIP.md. No backend schema/privacy/OAuth/traffic API change.

## Improve pass (2026-11-03, persona walkthrough by an independent agent)
- Search rows no longer show the list position as a score (`top.map(p => row(p))`).
- Neighbourhood sheets: Plub's walk sits under the intro; numbers, traits and story fold into "Numbers and story".
- Phone: the floating "Find a work spot / Explore / Key" row is gone; those live in the List panel (`data-proxy` buttons press the atlas controls). Only an active view's status and "Clear map view ×" float.
- Search finds neighbourhoods by Thai/English aliases (`HOOD_ALIASES`; Siam/สยาม → Sam Yan, labelled "near").
- Work finder: a start that is off-screen (or "Map centre") follows the map when the finder opens.
- Non's handwriting (`Non Architecture`, Latin only) for voice lines: Plub's speech, neighbourhood purpose, Non's visit notes. Never data, numbers or Thai.
- Data clean and branch names: done 2026-11-04, see "Catalogue clean" below.

## Catalogue clean (2026-11-04) — `scripts/clean-catalogue.py`, `scripts/build-branches.py`
**Build order** (each step reads the published catalogue the previous one wrote):
1. `python3 scripts/build-places.py` (runs enrichment and `include-reviewed-place.py --catalogue-only`; that guard pins the *pre-clean* catalogue, so it still holds)
2. `python3 scripts/clean-catalogue.py` (`--dry-run` first: prints every decision)
3. `python3 scripts/build-atlas.py && python3 scripts/build-cafe-streets.py && python3 scripts/build-journey-geo.py && python3 scripts/build-hoods.py`
4. `python3 scripts/build-branches.py`, then regenerate preview cards (`build-brand-assets.mjs`).
Do not run `include-reviewed-place.py` in full mode after step 2: Meet's space is already in the catalogue.

**Result:** 57,539 → 57,379 places. 74 dropped: 3 names saying "closed", 4 placeholders (`food_shop`, `library_entrance`), and non-venue businesses filed as cafés/libraries/restaurants (salons, barbers, clinics, car washes, laundries, insurers, condos, a used-car lot). Restaurants only on an unambiguous list, never when the name holds a food word. 86 twins merged (same kind, ≤ 8 m): the same number in both names (numbers after a place word such as Terminal 21 / Rama 9 / ซอย are ignored), every word of one name in the other (one a real name word, not "cafe"/"shabu"/"baan"), or an identical name. A shared phone line is not evidence (food courts share one). Survivors keep their published metrics. Every decision with its reason: `public/data/cleanup.json`.

**Old ids keep working:** `public/data/aliases.json` (retired → survivor). The app's `state.byId` resolves aliases (size unchanged), saved visits and `?p=` links canonicalise; the Worker rewrites `place` to the survivor before validating ratings and notebook entries (`src/aliases.js`). Production held 0 ratings / 0 notebook entries / 0 posts at clean time.

**Re-signed guards:** `test/atlas.mjs`, `journeys.mjs`, `place-tools.mjs` and the browser tests now pin the cleaned catalogue (hashes and 57,379 / 20,640 / 20,160), each with a comment pointing here.

**Independent review (2026-11-04):** reversed 2 drops (Thai Legal Consulting = OSM-tagged teahouse; Good nails & cafe) and 1 merge (LukKaiThong Siam Paragon vs Siam Center) via `KEEP` in clean-catalogue.py; a kept id never drops or merges either way.

**Branch labels:** 10,674 places that share an exact name with another get `public/data/branches.json` = their own published address (tidied, ≤ 34 chars: no house/unit/floor/stall codes, Plus Codes, quotes, zero-width chars or dangling 'ถนน'/'Soi'), or their OSM district when the address is unreadable or names a different district than the pin. Name+label collisions get the district appended. Shown after the name in search, lists, the place sheet and the work finder. Loaded after the map; catalogue rows untouched.
