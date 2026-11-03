---
updated: 2026-11-03
drafted_by: codex/gpt-6
reviewed: false
---
# Café contact data contract

AllThePlaces publishes its downloads under CC0: https://www.alltheplaces.xyz/ . API: https://github.com/alltheplaces/alltheplaces/blob/master/API.md . Extractor: https://github.com/alltheplaces/alltheplaces/blob/master/locations/spiders/cafe_amazon.py . These first-party sources were checked3November2026.

Pinned run2026-10-24-13-32-37, completed31October; source last-modified31October13:38:40GMT. Download: https://alltheplaces-data.openaddresses.io/runs/2026-10-24-13-32-37/output/cafe_amazon.geojson . HTTP200,5,849,467bytes. SHA256`6f847b3e5688b6f90c57e20fd4e8b0ccf32a7220da604c26b5af798e4491e9e6`. No authentication or paid key. Server varies Origin, supplies no general CORS guarantee or rate-limit headers. Browsers never request this feed: a pinned offline subset is shipped through same-origin static assets.

4,495 source features;1,434 inside the existing Bangkok bounds. Reviewed subset in data/atp-cafe-amazon.json retains coordinates, featureID, store ref, branch, address and phone. Source extraction endpoint is https://www.cafe-amazon.com/api/store-list . Snapshot date describes publication, not a field visit or current verification. Addresses/phone numbers may change.

Rules: existing café, recognized Café Amazon name, maximum30m, exactly one candidate in each direction. No nearest-only guesses, unrelated cafés, hand pins, new pins, changed coordinates, changed hours, changed scores or changed ranking. Existing facts always win. Each added field has sourceID/ref/branch/URL/run/date/licence/matching distance in the detail cell. The visible sheet identifies fields, source and snapshot, with a disclosure linking the exact downloadable source. public/data/enrichment.json is the machine-readable audit.

984 unambiguous matches yielded352 missing phone numbers and10 missing addresses. All57,538 original rows and their hours/index/flags are byte-identical. No hours exist in this Amazon feed. Starbucks Thailand's latest-spider endpoint returned403 and this pinned run's output was empty; no Starbucks data or fabricated hours were imported. Other unverified spider names were rejected, not retried aggressively.

Rebuild: python3 scripts/build-places.py invokes scripts/enrich-places.py after the base catalogue. Enrichment can also run alone; it is deterministic and idempotent. Verification: python3 test/enrichment.py tests ambiguity, wrong brand/kind, hand pins, distance, original-fact preservation and byte-identical row assets.

Wongnai content remains linked out under the existing policy; no reviews/images were scraped. Visitor photographs remain the best direct record: entrance/name, posted hours, menu/prices, and the work area/outlets. A photo is evidence to review, not automatic verification of everything in the venue. Existing notebook photos are private unless the visitor explicitly shares them; no OCR, EXIF-based location inference or automatic catalogue edits were added.
