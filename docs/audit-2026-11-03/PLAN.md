---
updated: 2026-11-03
drafted_by: codex/gpt-6
reviewed: false
---
# Café records and usability audit

Task: find a real café, read source-backed facts, and record a private visit/photo without losing work.

Scope authorized by the owner's audit/fix/improve/ship request. Preserve PL;UB/Sao Chingcha, sticker and meaningful vector poses, all 57,538 pins/IDs/coordinates/rankings, private/cloud/public/research boundaries and existing maps/features. No new schema or restricted review-site scraping.

Changes planned:
- Add pinned CC0 AllThePlaces Café Amazon address/phone snapshot and conservative enrich-only adapter: recognized brand, ≤30m, one-to-one unambiguous matching, missing fields only, source ID/URL/date/distance per field. No inferred hours, ratings, photos, parking or locations. Hook into catalogue rebuild and test conservation/rejection cases.
- Correct opening-hours evaluation to Bangkok time irrespective of visitor timezone, reject invalid clocks/unsupported syntax, keep unknown honest. Check mood clock construction too.
- Exercise real notebook photo/draft/save flows, long labels and layout at390×844,1024×900,1440×900,1280×720; fix reproduced failures within these files and preserve first-screen task budgets.
- Add an isolated local API runner so reruns do not inherit rate-limit state; do not erase shared .wrangler/state.
- Independent adversarial review, tests/dry-run, commit/push/deploy, live bytes and real browser read checks.

First-party evidence: alltheplaces.xyz (CC0 downloads); github.com/alltheplaces/alltheplaces/API.md and locations/spiders/cafe_amazon.py. Run2026-10-24-13-32-37 contains4495Amazon records and zero hours fields. Starbucks latest lookup403; pinned output empty; do not claim hours enrichment.
