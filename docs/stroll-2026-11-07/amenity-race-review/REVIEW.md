---
updated: 2026-11-07
drafted_by: codex/gpt-6.1
reviewed: false
---

# Independent amenity hydration race review

**PASS.** Tested the fixed preview at http://localhost:43828 using fresh Chrome contexts at390×844,1024×900 and1440×900. Each loaded `journeys.js?v=stroll-20261107c`; the source SHA-256 was unchanged throughout the audit. This is preview verification, not verification of the follow-up deployment.

The test deliberately held `journey-places.json`, selected real catalogue venue `n735122008`, then awaited `WorkFinder.warmEvidence()`. At each width, the original amenity element was confirmed detached while the full join was still unloaded and visible air conditioning was unknown. Releasing the join updated the current visible owned element to “✓ Air conditioning · documented”. The resulting screenshots were opened and visually inspected.

A browser-only negative control replaced the fixed warmPlace function with the original captured-slot function. Under the same held-join/replaced-element sequence, full data loaded but visible air conditioning remained unknown. The control correctly detected the original failure. No product source file was changed by this control.

Four additional phone scenarios released the held join after changing task to notebook, selecting a different place, closing the sheet, or opening the visit-edit form. The later completion preserved the new task/place, kept the sheet closed, and left the form unchanged respectively. No page errors or API writes occurred in any of the eight scenarios.

Evidence: `audit.json` includes the observed old-slot detachment, initial/final values, script version, source hash and every guard result. `audit.mjs` is the reproducible independent probe; `hydrate-{390,1024,1440}.png`, the negative-control screenshot and four guard screenshots preserve actual pixels. No existing product or prior review files were edited.

A separate existing photo-caption concern was reported to the builder: five Commons Artist fields contain a607-character reuse notice as well as the photographer name. It is independent of the amenity race and has not been edited in this read-only audit.
