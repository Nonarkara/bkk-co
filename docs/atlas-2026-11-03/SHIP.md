---
updated: 2026-11-03
drafted_by: codex/gpt-6
reviewed: false
---
# Counted café atlas — shipped and verified

Live: https://co.nonarkara.org

Feature1685114 and date-fixture correction0bf2c88 merged through [PR4](https://github.com/Nonarkara/bkk-co/pull/4), merge b01a27ac61f4dfc02d0b840435d8875bb190788b. Final runtime source **fced67285af8c3cf15e8a24536678943d43d58cc** keeps the selected triangle's three-stop count/distance visible after camera movement. The independent auditor reviewed that follow-up without a new concern.

Final Cloudflare Worker version: **c227db3d-cc4a-406e-8ac9-a7ffc9fdb26d**. This supersedes the initial atlas deployment df1df6b3-0513-4ee4-935f-b000d136c5db. No database migration or live-user data change. Both custom domains and the existing daily cleanup trigger remain deployed.

## Evidence

- `live-bytes.json`: **204/204 public files** byte-match the final source checkout. The old domain301 preserves its query. Wrangler's210-entry inventory includes directories; the verifier checks204 actual files.
- `live-browser.json`: public Chrome390×844 and1440×900, all nine exploration views, exact source/list count agreement, rendered clusters, eight map-key meanings, triangle suggestions/settled distance label, no horizontal overflow or page JavaScript errors. `live-city`, `live-key` and `live-triangle` screenshots are actual production captures. All actions are read-only; no public notebook account/post was created.
- `small-phones.json`: extra360/393px local phone captures, body text17/30px, zero horizontal overflow and12px measured dock/header gap after ResizeObserver delivery.
- `REVIEW.md`: independent PASS at390/1024/1440, actual co-location IDs and district140/92 counts. Sparse-mode navigation, enlarged-text overlap and base-map publication sources are fixed. Follow-up triangle-label change independently source-reviewed.
- PR checks passed; final runtime main CI [41592895888](https://github.com/Nonarkara/bkk-co/actions/runs/41592895888) passed. CI first caught a missing AbortSignal browser global in the isolated date-renderer fixture; correction0bf2c88 fixed the fixture and the checks were rerun successfully.
- Original57,538 catalogue records/hashes/coordinates/flags/scores are unchanged. Tests and deliberate rejection fixtures, source contracts and scanner explanation are in `VALIDATION.md`, `DATA.md`, `EVIDENCE.md` and the linked artifacts. The fresh local notebook API suite passed67/67.

## Scope and limits

Default selected kinds include20,720 work places; the Food chip exposes the rest of57,538. Every matching point participates in clustering rather than being hidden by index. Eight marker meanings distinguish kinds, no-chain signal, sparse documentation, verified publication and actual personal4–5/5device visits. Aggregates are distinct hexagons rather than fake venue pins, and co-located lists paginate through real IDs.

Atlas views include20,235 café-density records,13,849 no-chain-signal cafés,2,501 low-footprint cafés,4,468 within300m of mapped park polygons, and2,871 cafés near308sampled real street segments. The sourced discussion/design subsets are intentionally small:3 and5 cafés respectively, backed by25branch-evidence records overall. Three documented shophouses are within that design subset. Districts cover all50Bangkok districts plus28surrounding ones; outer district counts cover only the catalogue window. Independent spotlights are rotating catalogue samples, not quality rankings.

Density is not footfall. Low footprint means less documentation. Unknown park access/entrances remain unknown. Street proximity is not a pedestrian graph. Triangles are straight lines between original points with only the mapped river checked; roads/canals/hours still need external route checking. Publication/discussion coverage is dated and branch-specific. Physical-device/screen-reader use and present-day venue operation are unverified. The notebook, source discovery lists, map stories, privacy consent and intact Nong Plub artwork remain available.

The proof-only closeout commit adds this record and captures; it does not change deployed runtime bytes or require another deployment.
