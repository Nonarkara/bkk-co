---
updated: 2026-11-04
drafted_by: codex/gpt-6
reviewed: false
---
# Release proof

Live: https://co.nonarkara.org

- Previous main: ea78b74; previous Worker d3b6cfce-2bc9-48a1-b6ca-2ef2ba27e6eb.
- Integration PR9 merged as **db66844bcf04f0b1b6b45552b5fbe51c1ba6adac**. Feature push/PR CI41846613357/41846624441 PASS; merged-main CI41846884065 PASS. Original PR7/8 closed as superseded by reviewed adaptations, not merged from stale branches.
- Deployed Worker **3936a891-39ee-4aaa-b0de-78b46880e0d3**, including unchanged existing D1 binding and daily privacy cleanup. No database migration or production test write.
- Byte proof observed 2026-11-04T14:23:12.164Z: **227/227 public files match this release checkout** via ordinary public URLs. Full per-file SHA256, sizes, runtime source commit and Worker version in live-bytes.json. Old domain301 preserves query strings. Wrangler reports234 filesystem entries and227 uploaded/reused assets; the byte verifier enumerates227 public non-dot files.

Local independent review and original-defect falsifiers: WORLD-REVIEW.md. Data/source boundaries: DATA.md. Regression details: VALIDATION.md. Final public browser results and captured actual pixels are stored beside this file.

Browser device-sized checks are not a physical-handset or screen-reader user study. Street sketches cover five areas. Source geometry does not establish current entrances, safe crossings, actual travel times, current venue operation or surveyed eye height. Unknown building heights remain flat. Media is source-qualified and optional; density tiles count catalogue records, never live popularity.

## Public browser clearance

All final public checks pass with zero API writes:

- `live-street.txt` / `live-street-browser.json`: four widths, actual source positions, Low view, interrupted playback, reduced motion, task suspend/resume, resizing, Escape, enlarged actions and device-only alias history.
- `live-rail.txt` / `live-rail-after.json`: three widths,83/81/81px tools, first native keyboard-selected place, all five sorts, filters, three journeys, enlarged text and the rejected415.39px expanded-tools falsifier. Settled live phone pixel: live-phone-settled.png (20 actual rendered symbols/clusters; tools83px). Earlier automated rail capture caught symbol fading before the settled frame; geometry assertions were unaffected.
- `live-prs.txt` / `live-pr-browser.json`: three widths, actual-count tiles on pan/zoom and exact lists, no external player until explicit choice.
- `live-journeys.txt` / `live-journeys-captures/live-browser.json`: three original journeys at four widths. Opening-hours fixture explicitly simulates Bangkok10:00 on3November; it does not claim that daytime-only results are open at the actual evening release time.
- `live-catalogue.txt`:57,379 catalogue rows and read-only API check pass on the public URL. API67mutation/privacy assertions ran only against disposable local D1, not production.

The final proof commit changes documentation/evidence only. `public/` and `src/` remain byte-identical to deployed runtime db66844.
