---
updated: 2026-11-07
drafted_by: codex/gpt-6.1
reviewed: false
---

# Independent caption review addendum

**PASS.** Actual Chrome preview checked at390×844,1024×900 and1440×900, each with normal text and30px body text. All six fresh contexts loaded `neighborhood-photos.js?v=stroll-20261107c`; its SHA-256 stayed stable during the test. No product files were edited by this auditor.

In the Charoen Krung gallery, photo `commons-133238424` now shows the compact photographer name “Supanut Arunoprayote” beside its visible CC BY4.0 and Source links. The607-character original artist notice is absent from the default caption and preserved in the expandable source/date/change details. The full-image modal also keeps the author/license/source visible and puts the same complete notice beneath its own collapsed summary. Expanding it made the complete notice reachable; the resulting screenshot was actually viewed.

The real default fallback for selected library `n735122008` deterministically chooses another affected photo, `commons-134534345`. Its placeholder likewise shows the compact author, retains “Bangkok reference—not this venue or neighborhood”, and keeps the full notice reachable through Photo changes & credits. At all six viewport/text combinations, first Directions stayed above the reference image and inside the visible detail sheet. The sheet had no horizontal overflow; the actual reference caption pixels were inspected after scrolling to the image, separately from the first-action screenshot.

`node test/neighborhood-photos.mjs` passes the120-image catalogue, including the builder's five exact short-name/full-notice preservation checks. No image rights or attribution links were removed. Gallery, modal and placeholder details each retained the complete normalized607-character notice in the browser. There were no page errors in any successful test context.

Evidence: `captions.json`, `captions.mjs`, and `caption-{gallery,notice,placeholder,placeholder-credit}-{width}-{14|30}.png`. This is local preview verification; deployment of the follow-up remains the parent task. The local Worker was restarted on43828 for the audit and remains available for the parent's reruns.
