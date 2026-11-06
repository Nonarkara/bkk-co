# Independent Palette footprint review · 7 Nov 2026

Reviewer: Codex / GPT-6. Parent owns implementation, local server and release. No runtime edits, production writes or commits by reviewer.

Named grid: column. Entry: real map. Exit: edge instruments and place sheet. Original defect falsifier: baseline had manga off on all three widths; default now manga true with Palette fills on actual Polygon footprints.

## Source truth

Actual Chromium querySourceFeatures at 100.5303,13.7366 z17 shows MVT building features have numeric feature.id and render_height/render_min_height, sometimes colour/hide_3d. No building-use category/id property. Feature29398250 contains2420 disconnected Polygon components. A feature-id tint would incorrectly color unrelated buildings. New model splits each component, strict point containment, holes/boundaries excluded, no nearest inference. Unknown neutral. Mixed categories use masks and striped pattern. Evidence source-schema-summary.json and probe.json.

## MSH / preservation

Actual390x844,1024x900,1440x900: map89%,65%,75%; hierarchy15.39x,2.05x,3.33x; no horizontal bleed, inflated box, orphan column or major void. Normal MSH PASS. Search9 hits, Escape dismissal, Food chip action,5-stop hop, shared-hop empty state, notebook, pins and manga->GPS->manga restoration pass. Zero API writes and runtime errors. Independent gate planted430px empty overlay correctly flags obstruction57%phone/48%tablet+desktop, and weak1024hierarchy. Evidence msh-final/msh-report.json and msh/msh-report-planted.json.

Default screenshots visually inspected at390 and1024; map dominates, linework/neutral buildings preserved, category symbols and color key survive. Enlarged text390 no document bleed; chips horizontally scroll as established behavior. Mixed-category roof visibly striped.

## Street sketch / Low view

Phone Char.Krung source lane opens at pitch72, step20m pauses at junction distance18.24/19.63m, ArrowLeft turns,3source branches offered/clickable. Escape restores pitch0 and manga default. Directions use actual venue coordinates with walking provider URLs. Reduced motion disables Play and no autoplay. Colored actual polygons, neutral outlines retained. Evidence low.json / low390.png.

## Resolved finding and final verdict

Original confirmed defect: after pan to100.5303,13.7366z17, wait7s:0colored polygons despite149MVT features/235strict containing components; manual FootprintPalette.sync() produces235. Actual sourcedata event lacks sourceDataType, so sourceDataType==='content' filter drops final loaded event. SourceId-specific debounced sync without requiring that field should repair. Evidence pan.cjs.


Final independent verdict: PASS on local runtime after pan fix. Re-run pans populate235strictly matched Polygon components before any filter/toggle; independent model yields235 too. Grouped native ID29398250 colors only94of2420components. Allthree widths pass asserted pan-before-filter, GPS palette hide and exactcamera preservation, Foodon446polygons/mask8present then Foodoffmask8absent. No page errors. Final-flow.json records masks1/2/3/4/5/7 and3291nativecomponents left neutral. Model unknown/hole/boundary behavior reviewed separately.

Key Enter keyboard opens legend. Actual30pxbody at390 supports search and44pxmangatoggle without documentbleed. Grayscale screenshot inspected: category/key glyphs remain explicit, neutral vsassigned geometry and screentone remain visible; hue is not the only category signal. Dark glyph contrast on plate colors:6.66pink/12.95yellow/4.47green/8.64blue, all exceed3:1nontextsymbol minimum.

Retest evidence: final-flow.cjs (asserted reusablethreewidth regression), final-flow.json; pan.cjs; msh-final/msh-report.json; low.json; actual30px390.png; grayscale390.png; final-default/footprints/enlarged390/1024/1440.png. The scripts use machine-local Playwright module path and Chrome binary; parent should adapt loader when adopting into repository.

Limit: reviewer validated localhost only. Parent retains commit/push/deploy/live byte proof and public browser verification. No unresolved local UI blocker.

Final isolated-Key refinement retested at390/1024/1440:44pxheightatallwidths,EnteropensManga buildingcolorslegend,precisionhidesKey,mangarestoresKeyand359sourcePolygonfootprints,pinsretained. Screenshots final-key-390/1024/1440.png; final-key.json. Targeted reviewerChromiumclosednormally; parent43827untouched. Verdict remainsPASS.
