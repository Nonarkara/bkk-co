---
updated: 2026-11-07
drafted_by: codex/gpt-6.1
reviewed: false
---

# Photograph review

120 distinct source photographs; 120 distinct self-hosted WebP files. Ari15, Sam Yan22, Charoen Krung/Talat Noi29, Thong Lo/Ekkamai21, Ramkhamhaeng18; Benjakitti, Lumphini, Chatuchak, Santiphap and Bang Kho Laem3 each.

Viewed every accepted photograph in the four contact sheets, plus individual replacements at output resolution. These show actual street/rail/canal scenes, shops and markets, public buildings, neighborhood architecture, temple exteriors and parks. No generated images, diagrams, maps, museum artifacts or portrait-only images were accepted. Source descriptions/categories support neighborhood membership; source coordinates remain exactly as supplied or null. This is visual/source review, not independent field verification of every photographer's location claim.

Rejected near-identical skyline/tower/canal frames, a post-office book/door detail, a restaurant sign-only image and a legacy Unsplash image still marked for license review. Replaced park wildlife/tree close-ups with wider lake/garden context. IDs and reasons are in `validation.json`. Accepted captures are dated; dates describe when the source photograph was made, never current venue conditions.

30 CC0;90 attribution/share-alike photos. Original per-file license versions remain on their derivatives, including the74 CC BY-SA images. Source page, original URL, creator, title, license URL, change notice, original SHA-1 and derivative SHA-256 are retained. All source responses for the final selection are preserved unparsed in `raw/`; their request records retain fetch time, URL and response headers.

Verified offline manifest rebuild and `node test/neighborhood-photos.mjs`: count, unique IDs/source SHA-1/derivative SHA-256, complete credit/license/date/source evidence, Bangkok-range source coordinates, all five core areas, actualVenue=false, aiGenerated=false, file existence, valid WebP headers/dimensions/bytes/hashes. Total6,865,980 image bytes; maximum79,570 bytes; dimensions within640×640. Frontend integration, live serving and deployment belong to the parent task and were not tested by this data review.
