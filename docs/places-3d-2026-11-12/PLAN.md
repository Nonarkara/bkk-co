# Places sidebar and 3D entry

Baseline is deployed main fabc80f. The original checkout has pre-existing edits, including four public assets whose bytes differ from production. This branch uses a clean worktree so that work remains available in the original checkout. No open PRs were found.

Column grid. The map is the visual entry. Its edge gives the work finder first action priority, then the 3D entry, then category counts and a few nearby examples. Sort and filters belong to the same disclosure. Group expansion preserves place access.

The live 3D action fails before its first frame because the renderer reads street IDs from index metadata. Load the existing area payload, use its source geometry and exact heights, open with a visible oblique view, and keep street-level movement one action away. Expose all 12 areas in a compact selector. Handle failed, cancelled and superseded loads with a route back to the map.

Review actual pixels at 390, 1024, 1440 and a wide working viewport, including enlarged text, keyboard, reduced motion and loading/error/empty states. Prove the ungrouped list and wrong street-ID lookup fail their checks. Obtain independent review before merge. Deploy from the clean merged tree, verify public assets and exercise both entry paths on the public site.
