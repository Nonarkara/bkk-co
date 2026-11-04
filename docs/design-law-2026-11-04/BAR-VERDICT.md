---
updated: 2026-11-04
drafted_by: opencode/glm-5.3-flash
reviewed: false
---
# The one-strip audit — owner verdict, reproduced and repaired

**Owner's verdict (screenshot, 4 Nov 2026 12:39):** *"MoMA rules violation, AI design slop, spatial hallucination: All observable from one bar."*

He was right, and the point is the standard: a stranger should be able to convict the surface from any 100-px strip, without scrolling. This file reproduces all three charges from that strip alone, with the fixes shipped in the same commit (c922fc0).

## The strip reproduced the charges

| Observable in the strip | Charge | Measured |
|---|---|---|
| Café, Co-work, Library rendered as three solid plum blocks at rest | AI design slop — three identical filled posters; false weight in chrome that out-weighs the map, the product's entry | 3 × `bg #7d133a` 44 px tall, resting state, from `aria-pressed="true"` fill rule |
| Chip boxes far taller than their 14 px words | Spatial hallucination — "do not grow boxes"; the workspace law carves chips out of the 44 px rule | 44 px boxes in a 53 px band for 32 px of content (inflator: `discovery.css` `.chips button{min-height:44px}`) |
| Ink as upholstery on filters | MoMA rule family — colour and fill are emphasis, not upholstery; the dock (`atlas.css`) already proved the correct instrument language | Filled ground on a resting filter row |

## Repairs (same commit, measured after)

1. **Chips back to their words.** Deleted the inflator; the row is the designed 32 px label-plus-padding. Band 53 → 41 px, chrome 102 → 90 px, the map gains the first screen back. Row controls, isolated map controls and dock buttons keep their real 44 px — the dense-group exception is for the chip row only.
2. **Filters read as instruments.** Off = hairline border + muted label; on = ink border + ink label, paper ground, no fill. The atlas dock speaks exactly this language, so one voice now covers both control families. Filled ground stays what it always meant: a primary action inside a sheet.
3. **Search field back to paper.** The washed (plum-tinted) field was the soft-slop default; it is now paper + hairline like every other instrument. Pressed-dot fallback rules built for the fill era removed.

Evidence, before/after: `plub-bar-phone-{before,after}.png`, `plub-bar-desktop-{before,after}.png` (same folder).

## Why the colour stays

The plum ink `#7d133a` is the brand voice (wordmark, guide surfaces, 10.36:1) — the charge was never the hue, it was the *use*: fills as upholstery and boxes as padding. Mechanism note for the next agent: the app-wide ink comes from `notebook.css` retargeting `:root` after `style.css`. Deliberate today, but fragile — if tokens are ever re-scoped, chips' off/on states must not silently change meaning.

## Verification

- audit-browser (4 viewports), community-browser (5 viewports): pass, evidence refreshed in their dated folders.
- non-slop `scan public src`: OK, 0 points. Catalogue: 57,539 places.
- Deployed `5768dd7b`; live 212/212 byte-match. STYLE.md now records the chip register so the fill or the inflation does not get "restored".
- CI: run 41795556381 (design-law gate included).

Builder ≠ auditor: the strip that convicted the old bar came from the owner's own eye. A different agent should now sweep the *other* chrome strips (moods row, flags row) against the same one-strip test — they were not in this screenshot and were left untouched on purpose.
