---
updated: 2026-11-03
drafted_by: codex/gpt-6
reviewed: false
---

# Café editorial research · 3 November 2026

78 named article/directory records across eight pages and five publishers. These are discovery candidates, not Bangkok’s ranked top 50. Candidate names preserve source spelling. A venue appearing under two spellings or branches remains a separate research record until reconciliation. No coordinates were inferred and no pins were added or moved.

## Source registry

| ID | Publisher and page | Published/updated | Evidence | Records |
|---|---|---|---|---|
| timeout-2025 | Time Out Bangkok · [Bangkok’s best new cafes of 2025](https://www.timeout.com/bangkok/restaurants/bangkoks-best-new-cafes-of-2025) | 2025-08-11 | editorial selection | 28 |
| timeout-2026 | Time Out Bangkok · [Bangkok’s 20 best new cafes of 2026](https://www.timeout.com/bangkok/restaurants/bangkok-best-new-cafes-of-2026) | 2026-03-06 | editorial selection | 20 |
| thaiger-2025 | The Thaiger · [New cafes to check out in Bangkok [2025 edition]](https://thethaiger.com/guides/best-of/food/new-cafes-to-check-out-in-bangkok-2024-edition) | 2025-07-31 | editorial selection | 10 |
| tat-talatnoi | Tourism Authority of Thailand · [1 day in Talat Noi](https://www.tourismthailand.org/Articles/1-day-in-talat-noi) | 2025-01-30 | institutional feature | 4 |
| tat-workshops | Tourism Authority of Thailand · [Workshop around Bangkok](https://www.tourismthailand.org/Articles/workshop-around-bangkok) | 2025-01-09 | institutional feature | 1 |
| bacc-gallery | Bangkok Art and Culture Centre · [Gallery Drip Coffee](https://www.bacc.or.th/en/directories/62255) | Not shown | institutional directory | 1 |
| bacc-mini | Bangkok Art and Culture Centre · [Mini ミニ oriental speedbar](https://www.bacc.or.th/en/directories/62674) | Not shown | institutional directory | 1 |
| roadbook-2026 | Roadbook · [Coffee shops in Bangkok that are masters of their craft](https://roadbook.com/bangkok/city-guide/best-coffee-shops-bangkok-thailand/) | 2026-04-30 | editorial selection | 13 |

All eight pages were checked 2026-11-03. Roadbook’s date is explicitly its last-update date. BACC directory pages did not expose a publication date. Every JSON record links to a registry ID; its `name` is the article heading or explicit named café and `area` is the source’s area tag or stated branch locality. No review prose, photographs, star ratings or prices are reproduced.

## Ranking and cohort limits

Time Out 2026 explicitly describes a ranked list of twenty new cafés. Its `publisher_rank` is that article’s rank only. Time Out 2025 numbered entries are preserved as `article_order`, without interpreting them as a citywide rank. The other sources supply editorial mentions, institutional features or institutional directory presence. Directory presence alone is not an award, endorsement or quality judgment. A dated article is evidence of coverage, not confirmation of present opening status.

The award organiser’s [Thailand voting 2026 page](https://theworlds100bestcoffeeshops.com/asia-pacific-100-best-coffee-shops/thailand/) was checked but deliberately not used as an award-winner list: the page says Voting. Nominees must not be shown as ranked winners. Google/Wongnai content was not collected.

## Matching and unresolved evidence

All `place_id` fields are null on purpose. Existing rows were searched with normalized names plus a small, explicit alias pass. `candidate_place_ids` / `catalogue_leads` are review leads only, including catalogue coordinates for branch checking; they do not authorize attaching evidence to a pin. In particular:

- The generic Piccolo record in Roadbook concerns Wang Burapha; its generic exact-name catalogue match is elsewhere. Leads now point to the Wang Burapha branch, still requiring review.
- Time Out spells a Sukhumvit 67 record “Hand and Hearts”; Roadbook spells it “Hands and Heart”. Treat them as a likely duplicate, not two votes for different cafés.
- Double Slash’s Rama II branch must not be matched to the catalogue’s differently located Double Slash Coffee Space.
- Sarnies, Nana, Gallery Drip, Dusha, Mini and Two Hands produce multiple or differently worded catalogue leads. Resolve the actual branch before attaching evidence.
- So Heng Tai is explicitly described as converted into a café but is also a historic mansion; keep that institutional feature separate from its front café record.
- CULT Thailand is a hybrid wellness/coffee business. The source includes it among cafés, but this does not establish workspace suitability.

Records without a catalogue lead remain valid research candidates. A lack of a pin is not permission to invent coordinates. None of this coverage establishes Wi-Fi, plugs, laptop rules, a visitor score or measured current popularity.

## Verification

The JSON was parsed successfully; every referenced source ID exists; there are at least fifty distinct normalized source names. No catalogue files were changed. Candidate inclusion was checked against publisher headings, with TAT café mentions and BACC venue pages read directly. Source registry includes factual evidence scope and uncertainty instead of unsupported “top” labels.
