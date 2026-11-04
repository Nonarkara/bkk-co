---
updated: 2026-11-04
drafted_by: codex/gpt-6
reviewed: false
---
# Integrated validation

Independent finished-UI review: **PASS**, see WORLD-REVIEW.md. Initial defects and failed runner attempts are retained there; the final screenshots and source-obstruction falsifier supersede intermediate views.

- Actual 390/1024/1440 browser rail: tools before first result 83/81/81px, below the content-specific 96px budget. Baseline 195/213.8/213.8px. Reopening the formerly expanded tool groups costs 415.39px and fails the same gate. Native sort, keyboard exact-place selection, all three work journeys, filter badge and 30px body text pass.
- Street browser at 390/1024/1440/1280: one canvas, exact source steps/junctions, low perspective and explicit-height fallback, pause on manual input/hidden/reduced motion/task change, resize, Escape, exact resume, first Directions and retired-ID notebook history pass with zero API writes. Independent source-volume obstruction falsifier widens the view without changing building heights.
- Three original journey flows at four widths pass: exact Google directions, task/rail/parking/hour constraints and compact actions. Notebook and community regression suites pass using disposable local state, not live mutations. API assertions: 67/67. Cold alias module graphs: 10 cases, atomic concurrent initialization, strict validation and retry after source failure.
- PR7/8 browser at three widths: independently recounted tile memberships, map pan/zoom, exact keyboard and pointer lists, qualified media and explicit external-player consent pass. Zero API writes or browser errors.
- Catalogue 57,379, place tools, discovery, atlas, journeys, model, motion, media, hat geometry, notebook race/date checks and pinned raw-source geometry equality pass. CI additionally checks syntax, enrichment and timezone behavior. Worker dry-run succeeds. Design scanner: OK, zero points; one informational passive-voice review left intact.

Browser tests use desktop Chrome device-sized viewports. No physical-phone, screen-reader user study, surveyed eye height, current entrance/access, live traffic or venue-operating-condition claim is made. Street coverage is five source-backed areas, not all of Bangkok. Public deployment and byte proof are recorded separately in SHIP.md.
