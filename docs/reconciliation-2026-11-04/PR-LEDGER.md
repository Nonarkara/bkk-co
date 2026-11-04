---
updated: 2026-11-04
drafted_by: codex/gpt-6
reviewed: false
---
# PR and working-tree reconciliation

Audit starting point: main `ea78b74baaaa949a55d4c615566adacb82d8d0b1`, matching origin/main. One worktree (`bkk-co`). No tracked dirty files at audit start. Untracked `public/styles/plub-manga.json` is preserved as incoming work; no runtime file references it. Its modification timestamp alone does not establish authorship.

## Already incorporated

PR1 notebook (`9fae865`), PR2 café evidence (`4e11de9`), PR3 whole visual discovery (`c29cb50`), PR4 atlas (`b01a27a`), PR5 journeys (`e521f9a`), PR6 community paths (`583f540`) are merged. All six corresponding remaining local feature branches have **zero commits absent from main**. They are historical branch pointers, not missing work. Nothing was reset or deleted.

Subsequent main commits add handwriting, customer journey fixes, three design laws, compact chrome, catalogue cleanup and independent corrections. Latest cleanup restores Thai Legal Consulting and Good nails & cafe and separates LukKaiThong Siam Paragon/Siam Center. Current source catalogue is57379places/20160cafés/20640workplaces. Incoming PRs were based on the earlier57539catalogue and must not overwrite these newer records, alias handling or label fixes.

Main CI at audit start: run41828009799 PASS. Read-only Cloudflare history shows latest Worker `d3b6cfce-2bc9-48a1-b6ca-2ef2ba27e6eb`, deployed4Nov12:17:45UTC. Public index, manifest and aliases were fetched and exactly matched current main at that time; this is a **scoped comparison**, not a whole-asset certification.

## PR7 · Talk media

Original: https://github.com/Nonarkara/bkk-co/pull/7 · `109c26d186185c0b439b8617bc2cd286f16bd6b0`, fetched as origin/pr-7. GitHub reports conflicts against current main. Old branch CI passed, but did not execute its new media test.

Preserved:157entry/361video source sidecar, original attribution, YouTube URL allowlist, no copied video, no new coordinates/pins, candidate-only discovery, historical Kamaboko closure label. All33catalogue seed IDs still exist after cleanup,20withvideo; no seed is silently rematched to a name or alias.

Repaired before integration:
- A source seed is not proof of video branch identity. Real incoming counterexamples: Common Ground G Tower seed includes CentralWorld videos; The Cassette Siam Square seed includes SkyBar; PaperPlaneProject includes studio/company material. Name-search associations remain explicitly **branch unverified**.
- Venue sheets expose a compact disclosure and a discovery button; they do not automatically display these unverified videos against the pin.
- Media rows show title/channel/date with uncertainty. No iframe or thumbnail loads automatically. The freshly created frame receives keyboard focus after its explicit load. A separate Load YouTube player action exposes the external contact; title links remain usable.
- Current catalogue hashes/aliases survive. Only a sidecar pointer is added to the current manifest, reproducibly via `scripts/register-talk-media.mjs` rather than restoring the stale PRmanifest/build files.
- Fetch failure has retry and generation checks. New CI executes `test/talk-media.mjs`.

The old PRbody says “Hold for Non. Do not merge.” That is historical external agent prose, not a new instruction from the user. The current user explicitly requests reconciliation/orchestration. Adaptation is prepared locally for independent review; original remote PR status is left unchanged by this subtask.

## PR8 · Einstein hat hotspot tiles

Original: https://github.com/Nonarkara/bkk-co/pull/8 · `ad2c685cb278293521bf3ce1244489ade12765d9`, fetched as origin/pr-8. GitHub reports conflicts. Old branch CI passed, but did not execute its new hat test.

Preserved:13-sided hat substitution, reflected copies, full Craig Kaplan BSD-3notice, paper credit, counts of actual café points, brand palette and pins above density. Its original heatmap remains usable; the adaptation adds an **optional Hotspot tiles** lens rather than replacing the earned default.

Repaired before integration:
- Original code only rebuilt hats on catalogue refresh; map movement only updated dock/list. Pan and zoom left stale or missing density. Actual moveend/resize now rebuilds an outgrown or zoomed patch. A polygon tap or keyboard-accessible Explore→Inspecttiles list opens the exact source-ID members used for the count, including deterministic boundary assignment; stale patch clicks ask to retry rather than show the wrong cell.
- Original tiny stamp considered only first/last ID chars and could collide between different selected sets. The new source-input revision retallies every actual selected-list refresh; no lossy ID cache shortcut.
- An irregular patch's bounding rectangle does not prove complete viewport coverage. The model probes patch coverage before using it; full polygon boundaries count points once, and zero-count tiles stay clear.
- Pure tests exercise900geographicpoints at3pan/zoom configurations, all counted exactly once, retally changedsets, real13-gon topology, and preservation of both heatmap and optional tiles. CI executes the new test.

## Incoming manga style WIP

`public/styles/plub-manga.json` is untracked, not referenced by index/app and not live (public path404). It is a prototype, not a lost deployed feature. Do not blindly activate it: a vector source `url` must resolve TileJSON rather than be a `.pbf` URL template; OpenMapTiles source-layer names and expression filters must match the actual feed. The current file's `road`/`place_label` and `['in','class',['literal',...]]` need verification/replacement, not optimism. The block comment promises hatching and future3D, but no hatch sprite/extrusion layer exists. Parent retains and completes this prototype through the actual mapped source schema.

## Local validation / remaining release gates

Read-only inventory and source inspection completed. Adapted tests `node test/talk-media.mjs`, `node test/einstein-hat.mjs`, `node test/check.mjs` and `node test/atlas.mjs` pass against current cleaned catalogue. Actual browser pan/zoom/count and opt-in-media checks pass at390/1024/1440:20independent point-in-polygon recounts perviewport, zoom/pan redraw, exact tile member counts through pointertap and keyboard path, zeroautomaticiframecontacts, oneexplicitLoadbutton→oneplayer, noAPIwrites/pageerrors/bleed. See pr-browser.json, hats/media screenshots and test/reconciled-prs-browser.mjs. Independent integrated review, merge/deploy and public-byte verification remain release-owner gates. Do not treat original old-green CI as integrated validation.

The current base-builder now runs the media registrar when the payload exists; clean-catalogue mutates the loaded manifest rather than replacing its object, so the sidecar contract survives the established full rebuild sequence. STYLE.md was corrected to preserve the actual NonArchitecture Latin voice separately from the SaoChingcha wordmark, and normal chrome90px rather than its obsolete102px measurement.
