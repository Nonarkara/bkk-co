# Places people actually use · 3 November 2026

## Decisions / authorized scope
Owner asks for meet's space, meaningful symbols, MSH, featured places and convenient discovery/contribution/sharing. Standing instruction authorizes execution and shipping. Preserve all existing map layers, routes, notebook keys, photos, privacy consent, ratings, moderation and exact original catalogue rows. No schema/auth changes or Google scraping. The supplied Google URL is an outbound destination only.

## Findings
Meet's space exists in the pinned Overture extract but its halal_restaurant classification and 0.775496 confidence miss the restaurant0.8 threshold. Operator/public branch evidence supports a narrowly reviewed café override. No threshold will be lowered globally. Existing map symbols are present; dots persist in search/list/filter chrome. Publisher candidates still require manual branch search despite 25 existing verified branch matches. Community recommendations work but are buried below the score/index and notebook tools. Clipboard failures currently claim success if the API is absent.

## Surgical changes
- New reviewed-source script/data plus one café row/cell/manifest and joins as supported; original57538rows retain all values. Exact source geometry, evidence and override recorded. No inferred facilities.
- public/place-tools.js (new): shared category SVGs, accent/apostrophe-insensitive token search and robust native-share/clipboard/manual-copy fallback. Hook search, chips, listing and primary place actions in app.js/index.html; no lost atlas or route layers.
- public/discovery.js/css: separate compact mapped publisher feature entry with exact catalogue links/source/date/directions; preserve both50entry lists. Entry through search/Explore, no new first-load overlay.
- public/notebook.js/views.js/css: place-level Notes & photos and Add recommendation. Reuse private visit composer, existing explicit publish/photo confirmation/account API. Sign-in returns to saved contribution; never auto-publish. Prevent async completion replacing newer navigation.
- Regression tests and docs: missing-source identity, original row conservation, type symbols, source-backed feature identity, failure/retry/share, guest/signed-in private-save→preview→publish paths, MSH budgets at390/1024/1440 and text enlargement. Independent agent reviews actual UI before release. Commit/push/deploy and content+browser verification on public URL.

## Preservation and risks
The map is the initial focal surface; compact actions fit beside their own evidence. Added feature claims are publication coverage, not live trend/quality scores. New catalogue count/hashes deliberately change once; all pre-existing rows must compare equal. No production synthetic posts. API writes tested only on isolated local DB. Unknown equipment and availability stay unknown. Physical visit/parking availability cannot be verified from desk research.
