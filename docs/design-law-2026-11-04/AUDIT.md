---
updated: 2026-11-04
drafted_by: opencode/glm-5.3-flash
reviewed: false
---
# Design law wired in, and the audit that followed

Owner's instruction (4 Nov): continue the audit another agent left half-way; improve, fix, perfect, MSH; make the system better, more unique and more informative; wire the three bibles into the codebase "and my entire style".

## What was wired (the durable part)

| Law | Canonical file | Skill (trigger) |
|---|---|---|
| MSH | `~/Projects/_reference/MSH.md` (was already identical) | `Non-Slop/skills/spatial-hallucination/` |
| Glance path | `Non-Slop/GLANCE-PATH-FOR-AI.md`, `_reference/GLANCE-PATH-FOR-AI.md` | `Non-Slop/skills/glance-path/` |
| Kinetic grids | `Non-Slop/KINETIC-GRIDS-FOR-AI.md`, `_reference/KINETIC-GRIDS-FOR-AI.md` | `Non-Slop/skills/kinetic-grid/` |

Pointers added so it fires without being asked: workspace `AGENTS.md` §3 (all three, with the "no name, no rotation" rule), `Non-Slop/AGENTS.md` and `README.md`, this repo's `CLAUDE.md` and `context.md`.

**Enforcement (the amygdala).** `.github/workflows/notebook.yml` now runs
`npx --yes github:Nonarkara/Non-Slop scan public src --fail-on slop` on every push and pull request, so a real design regression cannot pass silently. Run it locally the same way. `public/` currently scans **OK, 0 points**; the rendered layer (spatial/glance evidence) is the reviewer's job, via `non-slop render <url>`.

**`STYLE.md` created** — the file that protects the choices. It records Sao Chingcha (the owner's lettering), Jost + Prompt, the Wada plate 273 interface colours with their jobs, amber's single job, the map-first column/modular layout, the named `modular` stamp board, the voice registers, and a machine-readable `## Allow` list. Without it the scanner read Nong Plub's crayon palette (`#fbf6ea` paper, `#9a6240` hair) as an interface "cream + terracotta" default; that is now an allowed, reasoned exception instead of a phantom finding.

## Audit — what was measured, and what was found

Evidence available to this agent: live geometry via the browser's own DOM measurements, the committed real-browser captures in `docs/visual-2026-11-03` and `docs/journeys-2026-11-03`, and the Non-Slop scanner. **Pixel capture was not available to this agent** (the in-app browser had no visible window to screenshot); anything needing fresh screenshots is marked unverified below rather than claimed.

### Measurements (MSH §C), live at 1000×700

| Measurement | Value | Verdict |
|---|---|---|
| Chrome cost | bar 49 px + chips 53 px = 102 px = **15%** of viewport | PASS — a bar is as tall as its contents |
| Map share (B9) | **64%** of the first screen, panels docked left | PASS (≥60%) |
| Task visibility (B1) | search + filters + result actions all above the fold | PASS |
| Hierarchy (B7) | wordmark → map → dock title → result rows | PASS |
| Box fit (B3) | dock label carries its own white backing; no text-in-void | PASS |

### Findings and repairs

1. **Rotation with no named grid** (kinetic law §2.1, auto-reject row 1). `public/style.css` tilted a stamped cell `rotate(-6deg)` with no grid declared anywhere. Repaired by naming the grid: the stamp board is `modular`, the tilt is the deliberate ink-stamp mark, recorded in `STYLE.md` and a code comment. No pixels changed — the earned stamp gesture is preserved.
2. **Two agentless sentences** (the pack's language law). The scanner flagged four; two are privacy/state statements where the missing actor *is* the message (`The visit date is not published.`, `This device visit was removed.`) and were left alone, as the rule instructs. Two had a knowable actor and benefited: the 409 became `Your cloud notebook is full (100 visits), or you deleted this copy.`, and the privacy page became `The operator can also remove reposts of removed material.`
3. **Tab order vs the eye** (glance §2.4, kinetic §2.7). Measured: the rail sits left and reads first, but the map's canvas and zoom controls are tabbed before the rail's result list. Judged **not a defect on this product**: PLUB is map-first, so the map is the entry and reaching it first matches the glance; the rail is its exit. Recorded here rather than "fixed", because reordering the DOM to please a rail-first reader would push the map later for everyone and risks the map-first law. Reviewed and left.
4. **Nong Plub's crayon palette vs the interface palette** — a scanner false positive, now a reasoned allow (above).

## Verdict (MSH §3.D)

```text
Verdict: PASS in reviewed scope
Auditor (≠ builder): this agent; the previous pass's independent review stands in docs/audit-2026-11-03
URL: https://co.nonarkara.org
Widths checked: measured live; captures read at 390 / 1024 / 1440 / 1280
MSH fails: none confirmed. B1–B14 clear on the evidence above.
Scanner: public/ OK (0 points); repo OK (docs evidence is not shipped)
MoMA / Non-Slop notes: chrome 15%, map 64%, boxes hug content
Kept on purpose: PL;UB wordmark, Sao Chingcha voice lines, the crayon sticker and the vector poses, the stamp tilt, amber's one job, all 57,538 pins
Unverified: fresh pixel captures at 1440/1024/390 by this agent; physical devices; full screen-reader pass; the deployed build of this change's copy edits
```

Builder ≠ auditor: a different agent should walk this at 1440/1024/390 and sign the unverified rows before this is called done.
