# Independent community / place audit

Verdict: **PASS for the reviewed local runtime**. Public deployment verification remains the release owner's separate gate.

Auditor: `/root/community_audit` (independent of the builder). Date: 3 November 2026. URL: `http://localhost:43827`. Viewports:390×844,1024×900,1440×900; actual body text30px. No production account, recommendation or rating writes.

## Findings closed

1. **B4/B5, inflated confirmation rail:** initially a short “Visit saved privately” confirmation inherited the notebook's full-height desktop rail; at1024 content ended near211px while panel continued to900px. Builder gave recommendation/community surfaces their own content-height rule and restored related catalogue rows beneath them. Final confirmation height133.94px atall3widths. Independent rendered falsifier restores the old fullheight/hide-list rules and observes>600px; the same<300px compact-confirmation budget rejects it.
2. **B13, new key controls:** initial save/show/continue actions were plain~20px text targets. Final new controls and Keep private have44px targets; continue is the primary action. Screenshot `audit-new-key-390.png` inspected after repair.
3. **Publish ownership/navigation race:** initial handler read the photo checkbox after awaiting backup, allowing a reused sheet to change/remove that choice. Builder captures the explicit choice at click and aborts publishing when navigation generation changes. Independent held-PUT test navigates to the finder before completion: no publishPOST occurs and finder survives. The failure catch is also generation-guarded.
4. **Late clipboard completion:** shared sheet could receive status from an earlier place. Builder's heading witness suppresses notices after content replacement. Independent held-clipboard test confirms no status enters the newer finder. With both native share and clipboard absent, manual-copy input contains the exact place link and does not claim it was copied.
5. **Thai normalization:** combining marks were initially converted into separators. Final normalizer preserves Thai marks while folding Latin accents/apostrophes. Search finds the reviewed café for `meets space cafe`; it retains original display spelling.
6. **Feature focus:** replacing the loading heading lost keyboard focus. Builder now focuses the final feature heading after its guarded render.
7. **Reviewed source trace:** new café provenance was initially data-only. Final place source disclosure exposes exact Overture identity/release and the reason/source for reviewing its category; no facility claim follows from the owner's visit.

## Geometry and hierarchy

All values are rendered pixels from `independent-browser.json`, captured after fonts/map movement/tiles settled. No page or sheet horizontal bleed, no pageerrors. Initial hierarchy: map, work-finder action, catalogue tools. Place hierarchy: identity, visit+directions, contribution actions, facility/source evidence, computed index. Feature hierarchy: mapped branch identity and source, then its place/facility and direction actions.

| Width | Combined header/chips | Initial map | Place Directions bottom | Place social bottom | First feature directions bottom | Saved confirmation height |
|---|---:|---|---:|---:|---:|---:|
|390|102|390×742|495.08|540.08|643.47|133.94|
|1024|102|664×900|240.59|329.59|388.98|133.94|
|1440|102|1080×900|240.59|329.59|388.98|133.94|

Initial map occupies87.9% ofphone screen and64.8%/75% ofdesktop screen area. Place/action and feature/action pairs fit first screen. At30px body text, first feature directions still end731.47px onphone and557.98px ondesktop; long content earns scrolling without horizontal clipping. The long notebook retains its established fullheight reading surface; only short recommendation/community states reclaim their empty space. Category silhouettes remain distinguishable (cup, desk/laptop, open book, plate/cutlery), with existing badges explained in Key. Logos remain unboxed and visible. No new first-load modal/hero/grid.

## Functional and source checks

- Search opens `o825832f94e7f`, original rounded source point13.76998,100.61656. Search/list/filter chrome uses type glyphs; existing map category and source/personal badges remain.
- Independent parsed-array comparison: all20,720original work rows,36,818food rows,57,538atlas joins and20,720journey joins unchanged. Only one reviewed café is added. Source category/confidence exception is explicit; no global threshold lowered.
- Meet's facility badges remain unknown. No visitor star/rating is fabricated from Non's visit or a publication. Google URL is not the coordinate source.
- New Mother Roaster institutional identity independently checked against TAT1172TalatNoi/061-216-2277. Hong Sieng Kong independently checked against BK9June2021/Soi2/095-998-9895; the six-building reuse description supports architecture. Both URLs are retained, publication age visible, no current-operation or popularity claim inferred. See [TAT](https://www.thailandtravel.or.jp/mother-roaster/) and [BK](https://www.bkmagazine.com/restaurant/hong-sieng-kong/).
- Both added branch IDs appear in Featured; rows link directly to existing original pins and source pages. Nearest-to-map-centre ordering is stated; no citywide popularity ranking is claimed. Both50entry source lists remain accessible.
- Place→Notes & photos→Add recommendation→private device save works. Guest account creation keeps the selected note: create→key-save gate→preview; no notebook upload occurs before the explicit publish button. The final click issues exactly privatePUT then publishPOST, photos defaultfalse/confirmtrue. Device copy survives. Independent mocks avoid polluting even the shared local DB.
- Explicit publish and privacy/photo consent remain existing server boundaries. New flows reuse them; no auth/schema/rate-limit changes.

Evidence/scripts: `independent-audit.mjs`, `independent-browser.json`, `independent-races.mjs/json`, `independent-account.mjs/json`, `audit-*.png`. Tests use the actual app DOM and click/type/save paths; mocks are limited to deliberately observable account/network failure/race cases.

## Scanner disposition

`scanner.txt`: **REVIEW**,3points; noSLOP. The cream/terracotta hit is the retained unused vector archive in`public/plub.js`, not visible approved sticker styling. Heavy images are audit evidence PNGs under`docs/`, outside deployed`public/`. Six passive-language reviews concern privacy/status/error outcomes (including “nothing has been published”); their meaning is deliberate and they do not obscure the responsible user/operator action. No rewrite is needed to clear a style heuristic.

## Kept / unverified

All map layers, catalogue content, notebook storage/key model, photos, existing moderation and explicit publication consent remain. Real traffic, entrance routing, equipment availability, actual parking access/spaces, physical-device GPS and assistive-technology hardware are not independently certified by this browser audit. Source checkdate is not a current opening guarantee. Local PASS is not a claim that deployment bytes reached edge users; the parent must verify the public release.
