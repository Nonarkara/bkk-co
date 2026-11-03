# Café atlas evidence · 3 November 2026

The evidence file attaches 25 manually reviewed café identities to existing catalogue IDs. It changes no catalogue row, coordinate or pin. Five publisher/institutional pages support the joins: two Time Out articles, Roadbook, the Bangkok Art and Culture Centre directory and a Tourism Authority of Thailand feature. Each evidence row carries its exact source URL, publication/update date when shown, check date, source locality, existing catalogue address and the identity reason.

Identity requires an explicit branch plus street, a matching street number/name, or matching venue/street/contact facts. Similar brand names and nearby coordinates are not enough. Existing catalogue coordinates remain the only pin coordinates; this file does not claim publisher-verified survey accuracy. Source check date is not a verified operating-status date.

`editorial_count` counts distinct source pages attached to that specific branch. It includes institutional coverage and directory presence. It does not measure acclaim, rank, quality, footfall or general online attention. `discussion_count` now records only distinct primary Reddit threads containing explicit branch/area/institution text: NANA Ari has three, Gallery Drip BACC has two, and Factory Phaya Thai has two. Generic brand mentions do not count. Editorial coverage counts remain separate from Reddit evidence. One branch has two independently published editorial coverage pages; the rest have one.

Architecture is tagged only when the source explicitly discusses the building form or adaptive reuse. Five records meet that threshold. Three also have an explicit shophouse/conversion statement. Furniture, colours and attractive interiors alone were deliberately insufficient. False means no supported tag was attached, not that the venue lacks architectural qualities. These are factual attribute tags, not copied review prose or a design-quality score.

The compact factual basis for each positive attribute is stored next to its source and identity evidence. There are no photos, review text, visitor ratings or Google/Wongnai-derived facts in the file.

## Rejected or unresolved identities

Twelve rejected cases and their exact reasons are retained in the JSON. They include a different Craftsman branch, a Double Slash location outside the specified Rama II branch, a changed Early location, an Edspaze street-number discrepancy, Kaizen’s different street, unconfirmed Sarnies and Mini branches, unrelated Soul names, and insufficiently precise locations. These exclusions are intentional, even when the candidate name otherwise looks convincing.

## Verification

The JSON parses and contains exactly 25 unique existing catalogue IDs. Names match the catalogue rows; every evidence source exists in the source registry; every attached identity has a catalogue address; source-page counts reconcile; architecture/shophouse flags reconcile with their source-level evidence. No new IDs or coordinates were introduced. All 12 rejected cases remain unassigned.

A future coverage refresh should check the cited publisher page and existing catalogue detail again, especially after relocation. Additional discussion evidence needs exact branch evidence from each thread before incrementing any count.

## Branch-verified discussion follow-up

Five primary Reddit threads were inspected on 2026-11-03. Counts represent a convenience sample from February 2025 to August 2026, with no sentiment weighting or recent-trend claim. A photo-thread comment identifying a venue counts as discussion presence; it is not treated as an endorsement. Each accepted discussion evidence row preserves a brief branch identifier, parent thread URL, optional comment permalink, dated thread source and the existing address identity it joins.

| Existing branch | Sampled threads | Explicit identity text |
|---|---:|---|
| NANA Ari | 3 | Ari stated in the opening post or comment |
| Gallery Drip BACC | 2 | BACC or Bangkok Art and Culture Centre stated |
| Factory Phaya Thai | 2 | Phaya Thai stated; one also identifies the ARL station |

The Nana comment permalink in the 2025 thread timed out, but its explicit Ari mention was read successfully in the full parent thread. It remains linked to that verified parent. Publication dates are thread dates from dated primary Reddit search results, not claims about comment timestamps. Repeated comments in one thread never add another count.

The previous broad candidate counts were not imported. Generic Nana, bare Gallery Drip, PAGA and Kurasu mentions remain unassigned. A W Market/Phra Khanong reference does not resolve the exact Hands and Heart branch. Ministry's Sukhumvit 101 wording and a misspelled Roast8ry Song Wat mention were also excluded rather than repaired by guesswork. These rejection reasons are recorded in `discussion_rejections`.

Verification recomputed counts from unique discussion source URLs, separately from non-discussion editorial pages. Exactly three of the same 25 catalogue IDs have positive discussion counts; seven place-thread joins use five distinct threads. Architecture, shophouse and catalogue identities are unchanged.
