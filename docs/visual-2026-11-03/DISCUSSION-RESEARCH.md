---
updated: 2026-11-03
drafted_by: codex/gpt-6
reviewed: false
---

# Public-discussion café discovery cohort

50 distinct named café entities, found in four public r/Bangkok discussions. This is a convenience sample for discovery, not Bangkok’s “top 50”, a measure of café quality, or evidence of a current trend. Some entries name a multi-branch brand rather than a single shop.

Only names, source links, dates, counts and conservative catalogue candidates are stored in `data/discussion-candidates.json`. No usernames, votes, likes, photos, review text, personal details, or Google/Wongnai records are retained. Google Maps links visible in comments were not followed. No authenticated scraping was used.

## Sources and date semantics

The primary Reddit pages were opened publicly using the web tool on 3 November 2026. Absolute publication dates below come from the search provider’s dated result for the same primary thread; the opened pages show relative dates. These are **thread publication dates**, not individual mention/comment dates. Later comments may postdate the thread. No continuous monitoring or current opening-status verification occurred.

| Source | Thread publication date | Selected entities mentioned |
|---|---|---:|
| [Coffee spots recommendations?](https://www.reddit.com/r/Bangkok/comments/1vmd4tk/coffee_spots_recommendations/) | 2026-08-12 | 12 |
| [Great, less popular, Coffee Spot recommendations](https://www.reddit.com/r/Bangkok/comments/1sbb075/great_less_popular_coffee_spot_recommendations/) | 2026-04-03 | 32 |
| [Specialty Coffee recommendations Bangkok](https://www.reddit.com/r/Bangkok/comments/1vs2j95/specialty_coffee_recommendations_bangkok/) | 2026-08-18 | 12 |
| [Best Coffee Bangkok - Sour?](https://www.reddit.com/r/Bangkok/comments/1rsloga/best_coffee_bangkok_sour/) | 2026-03-13 | 11 |

## Counting and identity method

One named entity gets one count per distinct sampled thread, whether named in the post or visible comments. Multiple comments, positive and negative reactions, repeated authors and reply echoes within that thread do not add counts. “Mentioned” does not mean “recommended”: some discussions question a café’s quality. Counts say nothing about independent visitors or endorsement.

Manual normalization merges clear case/spelling variations such as PAGA/paga and y‘est/Y’EST WORKS. Brand mentions are grouped at brand level; explicit area hints are preserved separately and must not make all that brand’s mentions look branch-specific. Nana’s Ari hint is supported by the August 12 and April 3 discussions, while other Nana mentions are brand-level. Gallery Drip’s BACC hint is explicit in the April 3 and August 18 discussions. Ministry’s Sukhumvit 101 hint is explicit in August 18.

Terroir.bkk at Song Wat is not automatically merged with March’s “Terroir Laboratory”, because identity is not proved. August 12’s “Roastr8dry” spelling is not counted as Roast8ry without further verification; Roast8ry BKK is directly named in March. Unnamed shops, joke-only Starbucks mentions, references that require following a map link to discover a name, and cafés only appearing in Reddit’s unrelated-post suggestions are excluded.

The 50 were selected manually from these discussions for identifiable café names; no score decides admission and the order is not rank. No claim is made that these are all names present in the threads. The source query was `site:reddit.com/r/Bangkok coffee cafes recommendations 2025 2026` plus `site:reddit.com Bangkok best coffee shop list Nana Mother roaster`.

29 entries have a possible existing catalogue identity based on name and any area given in the thread. These are **candidates requiring identity review**, not approved map links. 21 remain unresolved due to missing catalogue matches, ambiguous names, or unspecified branches. Every `place_id` is deliberately null; candidate IDs never authorize a pin, relocation, merge or branch assignment. The catalogue may itself contain duplicate branches. Existing pins and ratings are unchanged.

## Auditable entity list

The table order matches the JSON, not popularity. Source dates and URLs are repeated per entry in the JSON so an exported record stays traceable. Dates below identify threads, not comments.

| Café/entity | Distinct sampled threads | Thread dates | Catalogue state |
|---|---:|---|---|
| NANA Coffee Roasters | 4 | 2026-08-12, 2026-04-03, 2026-08-18, 2026-03-13 | Candidate only |
| Gallery Drip Coffee | 3 | 2026-08-12, 2026-04-03, 2026-08-18 | Candidate only |
| PAGA Microroastery | 3 | 2026-04-03, 2026-08-18, 2026-03-13 | Candidate only |
| Single Lane Specialty Coffee | 2 | 2026-04-03, 2026-03-13 | Candidate only |
| Sarnies | 2 | 2026-08-12, 2026-04-03 | Unresolved |
| Rough & Round | 2 | 2026-08-12, 2026-03-13 | Candidate only |
| Terroir.bkk | 1 | 2026-08-12 | Candidate only |
| Roast8ry BKK | 1 | 2026-03-13 | Candidate only |
| UNO Coffee | 3 | 2026-08-12, 2026-08-18, 2026-03-13 | Unresolved |
| Greydient & Them | 2 | 2026-08-18, 2026-03-13 | Candidate only |
| Y’EST WORKS | 2 | 2026-08-18, 2026-03-13 | Unresolved |
| Rolling Roasters | 2 | 2026-08-18, 2026-03-13 | Unresolved |
| y.ours specialty coffee home roaster | 2 | 2026-08-18, 2026-03-13 | Candidate only |
| Ministry of Roasters | 2 | 2026-08-18, 2026-03-13 | Candidate only |
| Feast Monday | 1 | 2026-04-03 | Candidate only |
| Anonymous Coffee | 1 | 2026-04-03 | Candidate only |
| Aribica Specialty Coffee X Amplify Coffee Roasters | 1 | 2026-04-03 | Candidate only |
| Coffee number 9 | 1 | 2026-04-03 | Unresolved |
| Slow Jam | 1 | 2026-04-03 | Candidate only |
| Dots Coffee | 1 | 2026-04-03 | Candidate only |
| MWHandbrew | 1 | 2026-04-03 | Unresolved |
| Pobnar | 1 | 2026-04-03 | Candidate only |
| Born to Bean | 1 | 2026-04-03 | Candidate only |
| Clix | 1 | 2026-04-03 | Unresolved |
| Coffee Horizon | 1 | 2026-04-03 | Unresolved |
| Hands and Heart | 1 | 2026-04-03 | Unresolved |
| Knowhere | 1 | 2026-04-03 | Candidate only |
| Citylight Coffee | 1 | 2026-04-03 | Candidate only |
| RAWR Café | 1 | 2026-04-03 | Unresolved |
| Chalet roaster | 1 | 2026-04-03 | Unresolved |
| Viva Cafe | 1 | 2026-04-03 | Candidate only |
| Black Specialty Coffee | 1 | 2026-04-03 | Candidate only |
| Playroom Ari | 1 | 2026-04-03 | Unresolved |
| WonderRoom | 1 | 2026-04-03 | Candidate only |
| Sometimes I Feel | 1 | 2026-04-03 | Candidate only |
| Unfinished | 1 | 2026-04-03 | Candidate only |
| Figure Ground | 1 | 2026-04-03 | Unresolved |
| Sound Pop Coffee | 1 | 2026-04-03 | Candidate only |
| Anytime | 1 | 2026-04-03 | Candidate only |
| Everyday Handcraft Coffee | 1 | 2026-04-03 | Candidate only |
| Kurasu | 1 | 2026-04-03 | Unresolved |
| Factory Coffee | 1 | 2026-08-12 | Unresolved |
| Rise Coffee | 1 | 2026-08-12 | Unresolved |
| Roots | 1 | 2026-08-12 | Unresolved |
| The Summer Coffee Company | 1 | 2026-08-12 | Unresolved |
| Go Cafe | 1 | 2026-08-12 | Unresolved |
| Pacamara | 1 | 2026-08-12 | Unresolved |
| Beans Coffee Roaster | 1 | 2026-08-18 | Unresolved |
| Halo Koffee | 1 | 2026-08-18 | Candidate only |
| B89 Caffè | 1 | 2026-08-18 | Candidate only |

## Checks and limits

Verified 50 unique entity names, four unique source URLs, no duplicate source within an entry, counts equal source-array lengths, all dates no later than research date, and all 29 candidate IDs exist in the current café catalogue. JSON has no coordinates, ratings or engagement fields. Dataset is a manually audited observation snapshot; it does not establish current availability, ownership, business identity or rights to rehost Reddit content. Broader sampling and repeated equal-window measurements would be needed before claiming a trend.
