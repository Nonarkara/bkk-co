# Talk media

Checked 4 November 2026 (ICT). `public/data/talk-media.json` is an enrichment sidecar. It is not the place catalogue.

The file is the pilot deliverable (schema v1): 157 entries, 102 with at least one video, 361 YouTube videos, 0 TikTok videos. It was copied in place. It does not add coordinates, and it does not rewrite `places-work.json` or `places-food.json`.

## What the sheet does

- A place sheet shows **Watch / talk** only when an entry's own `place_id` is that catalogue row and `location_status` is `catalogue_seed`.
- `candidate_only` entries keep `place_id: null`. They appear in the Watch / talk list as **Unmatched · discovery**. They do not become pins. `catalogue_name_candidates` are name hints, not verified matches.
- YouTube plays from the sidecar's `embed_url` on `youtube-nocookie.com`, with the video title and channel. If that embed is missing or blocked, the title link still opens YouTube and the player is not forced.
- TikTok is a search link (`tiktok_search_url`) only. Nothing from TikTok is embedded.
- **Kamaboko Coffee Camp** (`hidden-kamabokocoffeecamp`) was reported closed in May 2022. The list flags the videos as historical and does not present the venue as open. It has no catalogue pin.

## What this is not

No Wongnai scrape (link-out only; see [WONGNAI.md](WONGNAI.md)). No downloaded or re-hosted video. No new latitude or longitude. A catalogue rebuild keeps this sidecar registered and does not rewrite its bytes.

`node test/talk-media.mjs` checks the sidecar, the closed-venue flag, the place-sheet markup, and the unchanged catalogue hashes.
