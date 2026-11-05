---
updated: 2026-11-05
drafted_by: codex/gpt-6
reviewed: false
---
# Agent reconciliation

The prior release ended6a0c741. Main advanced through ee26572 (manga hop ink), ba6be14 (adopted orphan manga lens and hop backend), and4d496db (refreshed byte report). All are committed and pushed; initial working tree clean. All local branches have zero unique commits absent from main. No open PRs. No discarded or replayed work. Baseline active Worker verified f0993451-9f24-4026-b66f-bbd499ef4e49; baseline public account/hop GETs return200 and hop feed empty. Existing byte report lacked source/Worker identifiers, so this release records new dated proof separately.

Confirmed gaps and repairs:

- Hop backend had no public UI, owner moderation tools or full export integration. Existing planner now leads into optional shared notes; private notebook visits do not upload. Explicit account/key gate, selected/reordered source stops, opt-in photos, publication, own unpublish/export and owner review complete the feature.
- Backend permitted101+ records while export stopped at100. Atomic account quota now matches100-hop export; existing visible records remain editable, deletion reclaims capacity. Own hop reports are exported separately. The authenticated moderator can inspect ordered public stops. Read-only remote aggregate preflight found zero hops and zero over-limit accounts; no historical truncation/migration is needed. No schema change or production mutation.
- Manga normal toggle omitted residential tone; wrong target coverage now has a behavioral guard. Drawing wash was long and uncancelled; bounded240ms and zero-duration settlement on manual input, hidden page, reduced motion and task changes. Style failure is honest, retryable and a prerequisite for street mode. Snapshot reload preserves original base visibility and exact targets.
- Route numerals had1.576:1 contrast on the new plum circles; white gives10.364:1. Same intentional ink route retained.
- Composer labels/actions originally stacked and left an empty right half. Numbered content rows now use a column grid: five actual stops take190px phone/197.19px desktop, below48px per-stop budget. The stacked-grid falsifier fails the same budget. Body30px can grow naturally.
- Independent review caught optional sharing erasing the earned map route and leaking its sheet class. Explicit keepRoute lifetime and canonical selected-order preview preserve it through feed/key/composer, restore plan on cancel and clear on actual exit/new task. Class reset prevents styles leaking into later views.

Protected:57,379 cleaned catalogue rows,86aliases, branch labels, notebooks/photos/auth/research consent, source geometry and unknown-flat heights, existing heatmap/lenses/routes and PL;UB/Wada/handwriting. Source coverage remains five street areas; no invented entrance, connection, current operation or verified pedestrian-route claim.
