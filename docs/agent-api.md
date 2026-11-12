# The PLUB agent API

**`https://co.nonarkara.org/v1`** · read-only · no account · no writes · the notebook is never exposed.

PLUB holds a lot of evidence about Bangkok's cafés, co-work spaces and libraries, and almost
none of it could be read by another program. This is the shape that lets an agent use it:
one canonical record per venue, many time-stamped evidence records, and an inferred composite
that always states its own coverage.

---

## 1. What was taken, and from where — the credits

The architecture below was **stolen, improved, and credited**. Nothing here is invented; the
sources are named, and where PLUB diverges, the divergence is stated.

| Taken | From | Credit |
|---|---|---|
| Canonical venue record + many time-stamped evidence records, never overwriting a source fact | agent-first architecture brief | [Google Places API overview](https://developers.google.com/maps/documentation/places/web-service/op-overview) · [Foursquare Places API](https://docs.foursquare.com/fsq-developers-places/reference/place-search) |
| Evidence tiers with reliability weights (operator claim, platform field, reviews, social, category-inferred, conflicting) | the same brief, §"Scoring and evidence weighting" | [Google field masks](https://developers.google.com/maps/documentation/places/web-service/choose-fields) · [Foursquare field selection](https://docs.foursquare.com/fsq-developers-places/reference/place-search) |
| The four-way separation — *what a venue claims*, *what a platform reports*, *what communities say*, *what the system infers* | the same brief, §"Agent-first architecture" | — |
| Change detection by content hash, with a material-field diff and a freshness ladder | the same brief, §"Change detection" | — |
| A public, documented, agent-consumable API | the same brief, §"Public agent-facing API" | — |
| Machine-readable feeds over scraped HTML: RSS, sitemaps, JSON-LD, `robots.txt` | the same brief, §"Operator-site monitoring" | — |
| Claim extraction with a verification queue and human review | the same brief, §"Claim extraction schema" | — |
| Agent-first directory monitoring (Twork, aWiFiPlace, Nomadable, Bangkok Got Me, Surf Office, Coworker, Workfrom) | the same brief, §"Directory ingestion" | [Bangkok Got Me](https://bangkokgotme.com/coworking) · [Twork](https://twork-app.com/thailand/bangkok) · [aWiFiPlace](https://awifiplace.com/cities/bangkok) · [Nomadable](https://nomadable.net/thailand-bangkok) |
| Do not scrape Google Maps; use the API and comply with its display and caching rules | the same brief, and PLUB's own law | [Google Maps policies](https://developers.google.com/maps/documentation/places/web-service/policies) |
| The open-map evidence tier and the OSM tag vocabulary for work amenities | OSM tagging | [OpenStreetMap](https://www.openstreetmap.org/copyright) (ODbL-1.0) |
| The Neighbourhood Palette grounds and the "800 m narrative circle, never a district boundary" idea | the owner's Palette canon | Sanzo Wada digital catalogue, `palette/data/colors.json` |
| The line-and-tone manga register as the primary view | the owner's direction, 7 Nov 2026 | STYLE.md · [rokehan study](https://tools.oyasumi-gamedev.com/rokehan/) (studied, not copied — see §6) |

## 2. What PLUB does differently — the improvements

The brief describes a system that ingests from Google, Foursquare, ten directories, five social
platforms and every operator site. PLUB cannot stand behind most of that, and a system that
cannot stand behind its sources should say so rather than blur them.

So the tiers are **published with their absence stated**, rather than quietly filled in.

| Tier | Weight | PLUB holds it | What it would take |
|---|---:|---|---|
| `operator_claim` — what the venue says about itself | 0.90 | **yes** | The operator, brand, website, description and contact links recorded on the venue's own OSM entry |
| `platform_reported` — a commercial platform field | 0.80 | no | A Google Places or Foursquare API key and a licence-compliant field mask. Not scraped. |
| `editorial` — a named publisher's fact | 0.80 | **yes** | The published evidence file, with each publisher, URL and check date |
| `visitor_reported` — what people who went there report | 0.70 | **yes** | The visitor record: Wi-Fi, outlets, quiet, laptop welcome, with its date |
| `onsite_reported` — a named, dated first-hand account | 0.75 | **yes** | `public/data/venue-reports.json`: a named reporter, the visit date, the facts they recorded in their own words, and their photographs. One visit, one day — never merged into the map. |
| `mapped` — what the open map records | 0.55 | **yes** | The OSM snapshot, dated |
| `single_report` — one anonymous detailed review | 0.45 | no | A licence that permits storing review text. PLUB keeps named on-site reports and visitor aggregates, not anonymous individual reviews. |
| `social_mention` — a social post | 0.30 | no | Public-API access. Private groups are never read. |
| `category_only` — inferred from the category | 0.15 | no | Never. PLUB does not infer a facility from a category. |
| `conflicting` — evidence in disagreement | 0.20 | **yes** | Both sides are kept and shown; nothing is averaged away. |

Two further improvements over the brief:

1. **The composite is coverage-annotated.** The brief's weighted sum assumes every dimension is
   known. It never is. PLUB's composite is the weighted mean over the **evidenced** dimensions
   only, is published only when at least half the weight is documented, and always names the
   dimensions it could not score. An unknown dimension is never a zero.
2. **One rule set, two surfaces.** The API's components come from the same module the interface
   uses (`public/work-atmosphere.js`), so an agent and a reader see the same numbers. A test
   asserts they agree.
3. **The on-site report is its own tier, and it is never written back.** A named, dated
   first-hand account (`public/data/venue-reports.json`) is evidence about one visit, not a
   standing fact about a venue. The model reads it through the same dimension functions as
   every other tier; where a report and the open map disagree, both are shown. Curated visit
   evidence is never written into the signed catalogue — the catalogue hash in
   `journey-places.json` would stop matching, and the row would claim an OSM tag that does
   not exist. `test/venue-reports.mjs` locks both rules.

## 3. The endpoints

```http
GET /v1                              the index: what this is, what it is not, the snapshot
GET /v1/venues                       search
GET /v1/venues/{venue_id}            one canonical record
GET /v1/venues/{venue_id}/evidence   every evidence record, with source, tier and date
GET /v1/venues/{venue_id}/history   when each tier of evidence was last checked
GET /v1/neighbourhoods               the twelve street-sketch neighbourhoods
GET /v1/sources                      every source, its licence and its tier
GET /v1/atmosphere                   the model: dimensions, weights, tiers, the rule
GET /v1/changes?since=YYYY-MM-DD     the evidence change feed
GET /v1/openapi.json                 a machine-readable description
```

**Search.** `lat`, `lng`, `radius` (metres, default 1500), `category` (comma separated),
`q` (name or category), `documented` (comma separated dimensions — keep only venues whose Wi-Fi,
power, seating or access is actually documented), `sort` (`distance`, `index` or `work`),
`limit` (default 50, max 500).

`documented` filters on **evidence**, never on the inferred composite. `sort=work` ranks by the
published composite, with the unpublished ones last.

**One venue.**

```json
{
  "venue_id": "n2368064673",
  "name": "Mama Bingsu",
  "category": "cafe",
  "location": { "lat": 13.76756, "lng": 100.59878 },
  "work_readiness": {
    "score": 81,
    "coverage": 0.6,
    "published": true,
    "scored": 5, "total": 7,
    "missing": ["Noise & focus", "Long-stay policy"],
    "not_mapped": ["Meeting rooms", "Phone booths", "Table type", "Download / upload speed"],
    "components": {
      "wifi": { "label": "Wi-Fi", "weight": 0.25, "value": true, "points": 100,
                "basis": "mapped", "state": "documented",
                "note": "The map records internet_access=wlan." }
    }
  },
  "evidence": [
    { "source": "openstreetmap", "tier": "mapped", "claim": "internet_access=wlan",
      "source_id": "n2368064673", "url": "https://www.openstreetmap.org/node/2368064673",
      "retrieved_at": "2026-10-24T20:20:51Z", "state": "documented" }
  ],
  "last_verified": "2026-11-02"
}
```

`state` is `documented`, `absent` or `unknown`. **`unknown` is the honest answer** when the map
is silent, and it is never rendered as a zero.

## 4. The loop

```text
   open map ─┐
  visitors  ─┼→ evidence records → per-venue components → composite (coverage stated)
   publishers ┘         │                                      │
                       │                                      ▼
                       └──────────────→ /v1  ←──────  the public surface
                                                     │
                            another agent reads it   │
                                                     ▼
                              a claim, with its own source and date
                                                     │
                                    ┌────────────────┴────────────────┐
                                    ▼                                 ▼
                        the operator corrects it            it stays a disagreement
                                    │                                 │
                                    ▼                                 ▼
                        the catalogue is rebuilt          both sides remain published
```

The loop's moving parts are all live today:

- **Discovery** is the catalogue rebuild (`scripts/build-places.py`), pinned to an OSM snapshot
  and an Overture release, both dated in every manifest.
- **Enrichment** is the venue tag capture (`scripts/build-journey-geo.py`) — 2,551 venues carry
  their mapped atmosphere evidence and their operator's own claims.
- **The visitor record** is the one part people write into: Wi-Fi, outlets, quiet and laptop
  welcome, aggregated per place and dated.
- **Scoring** is `public/work-atmosphere.js`: one rule set, used by the interface and the API.
- **Publication** is the API and the open catalogue.
- **Verification** is the existing moderation queue for community posts; the API publishes
  disagreements rather than resolving them silently.
- **Refresh** is the catalogue rebuild. `/v1/changes?since=` reports what moved.

## 5. Governance

- **Provenance is mandatory.** Every displayed fact links to its source and its date.
- **No silent inference.** `mapped`, `venue`, `visitor` and `inferred` are distinct, and the
  composite is always `inferred`.
- **Conflicts are retained.** A mapped tag and a visitor report that disagree are both shown.
- **Freshness is labelled.** `retrieved_at` on every evidence record; `last_verified` on every
  venue; `as_of` on every snapshot.
- **Privacy.** The notebook, the accounts, the sessions and the visitor identities are not in
  this API. A test asserts the responses never contain them.
- **Licensing.** The catalogue is OpenStreetMap (ODbL-1.0) and Overture Maps (CDLA-P-2.0);
  editorial facts are credited to their publishers; the Palette grounds are credited to the
  Sanzo Wada digital catalogue.
- **Rate limits.** The API is read-only and unauthenticated, so it is cheap by construction; the
  *write* path (visitor ratings, posts, hop notes) keeps its own limits and account boundaries.

## 6. What is deliberately not built

- **No Google Maps scraping, and no commercial API without a key and a licence.** The brief's
  Google tier is the strongest available source and the one PLUB cannot lawfully hold, so
  `/v1/atmosphere` lists it as absent rather than pretending.
- **No directory crawling.** Twork, aWiFiPlace, Nomadable and the coworking indexes are the
  right *shape* for work attributes — Wi-Fi, sockets, long-stay, quietness — and PLUB's model
  already has those dimensions ready for them. Each directory's licence has to be checked before
  redistribution; that check is a per-source decision, not a one-off.
- **No reading of private groups, and no scraping of Facebook, Instagram or X.** The brief says
  this too, and PLUB's law says it harder.
- **No individual review text.** PLUB keeps aggregates, not one person's words.
- **No public write endpoint.** A submission workflow is the one piece of the brief PLUB has not
  built; the place sheet already carries a correction path, and extending it to the API is the
  next honest step rather than a new public intake.
- **No invented heights, centroids or street connectivity.** A footprint without a sourced
  height stays flat, and a pin is never moved to a centroid.

## 7. Provenance of this document

Written 7 November 2026 from the agent-first architecture brief supplied by the owner, the
canonical MSH law (`~/Projects/_reference/MSH.md`), PLUB's own `AGENTS.md` and `STYLE.md`, and
the live catalogue. The API is implemented in `src/agent-api.js` and locked by
`test/agent-api.mjs`.
