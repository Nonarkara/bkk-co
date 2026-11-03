# Journey facilities · 3 November 2026

Six existing catalogue venues now have branch-specific operator work/access evidence, supplemented by two explicitly attributed editorial sources for outlets and Wi-Fi. No pins, coordinates, base flags or visitor scores were changed. The data is a deliberately small verified supplement; missing facilities remain unknown. Evidence reflects the operator's published claim on the check date, not a measurement of speed, available parking spaces, seat availability or current admission capacity.

## Useful confirmed facts

| Existing venue | Area | Explicit facts retained |
|---|---|---|
| VichSpace | Hua Mak / Ramkhamhaeng | Second-floor work area free to use; free Wi-Fi; outlets; parking in the building; daily 07–20 |
| Davin Cafe | Ram Inthra / Khlong Lam Chiak | Wi-Fi; outlets; on-site parking; work permitted; daily 08:30–midnight; additional order recommended after 3h |
| C ASEAN Samyan CO-OP | Sam Yan / Chula | Free24/7 co-learning; Focus and Collaborate zones; registration and identity verification; editorial outlet/Wi-Fi evidence |
| TK Park centralwOrld | Ratchaprasong | Visitor pass; Wi-Fi access code; editorial outlet evidence; Tuesday–Sunday 10–20; Monday closed; price not stated by checked source |
| The Hive Thonglor | Sukhumvit49 | Wi-Fi; hot desks; phone booths;393 THB day pass before 7% VAT,09–18 access; days not stated |
| True Space Asoke | Sukhumvit21 / Phetchaburi |Operator Wi-Fi/outlets;250 THB day pass;100 THB/3h entry; daily 08–20except special festivals |

Ram Inthra is a separate area from Ramkhamhaeng. Davin must never be represented as nearby to a Ramkhamhaeng origin unless actual distance supports that. VichSpace is the verified local drive/parking/laptop example. No parking price, free-parking claim, duration limit or validation condition is invented for either café.

TK Park's September 2026 operator notice states20:00 closing, which conflicts with the older 22:00 catalogue value. The supplement explicitly records the newer published hours without rewriting the open-data catalogue. Hive day-pass access09–18must not inherit the24/7 access offered to full-time members. The Hive source does not state day-pass weekdays, so no seven-day hours string is invented. True Space's amenities warning says availability varies by branch. Its FAQ explicitly identifies Asoke and separately states free Wi-Fi, sockets and extension leads; those FAQ facts were attached only to Asoke, with no propagation to Siam or other branches.

## Sources and branch identity

Every accepted record contains the publisher address and identity reasoning. VichSpace joins exact6/4HuaMak and phone to its operator website. Davin joins exact108KhlongLamChiak and phone to its operator website. Samyan joins the exact named building and branch-specific registration domain. TK Park joins its operator domain and named centralwOrld location, excluding the True Digital Park branch. Hive uses its branch-specific domain, which resolves to the Thonglor address; the catalogue has no street address. True Space Asoke joins an explicit branch name, locality and operator domain; its malformed catalogue phone was deliberately not used. These latter two are supported branch-domain identities, not exact catalogue house-number matches.

- `vichspace` · [VichSpace](https://vichspace.co/) · published not shown · checked 2026-11-03.
- `davin-faq` · [Davin Cafe](https://www.davincafe.com/faq/) · published not shown · checked 2026-11-03.
- `davin-work` · [Davin Cafe](https://www.davincafe.com/davin-cafe-working-space-bangkok-en/) · published not shown · checked 2026-11-03.
- `samyan-about` · [Samyan Mitrtown](https://www.samyan-mitrtown.com/home/about/) · published not shown · checked 2026-11-03.
- `samyan-terms` · [C ASEAN Samyan CO-OP](https://caseansamyancoop.samyan-mitrtown.com/terms) · published not shown · checked 2026-11-03.
- `tk-access` · [TK Park](https://mytk.tkpark.or.th/News/NewsInformation?id=355) · published 2026-09-15 · checked 2026-11-03.
- `hive-membership` · [The Hive Thonglor](https://thehive.co.th/membership/) · published not shown · checked 2026-11-03.
- `true-asoke` · [True Space](https://www.truespaceth.com/en/true-space-asoke/) · published not shown · checked 2026-11-03.
- `true-faq` · [True Space](https://www.truespaceth.com/faqs/) · published not shown · checked 2026-11-03.

Publication dates are null when the page did not expose one; copyright years and search crawl times are not substituted. TK Park's news date is15 September 2026. Operator facts were checked against public first-party pages. Two dated editorial publications explicitly support a small additional set of outlet/Wi-Fi facts. No Google/Wongnai content or third-party review text was used. No photos were downloaded or reproduced.

Raw fetched responses and hashes were archived before local extraction outside the repo at `../source-cache/journeys-2026-11-03/`. HTML filenames use the first 12 characters of the source URL's SHA-256; corresponding JSON records hold URL, status, fetch date and full content hash. Robots responses were also retained; retrieved applicable rules did not prohibit these venue paths. Missing/403robots responses were not treated as a contractual licence. The Hive direct HTTP request returned403; it was not bypassed. Its successfully returned public web-tool response is retained separately as `hive-web-response.json`, and the data labels this archive distinction. The public runtime omits archive paths/hashes and exposes only useful source provenance.

## Unresolved candidates

TrueSpace Siam Square Soi2 has a useful operator page with an exact address and short-pass prices. The existing nearby catalogue row is named as a telecom shop and lacks street details; it was not assumed to be the coworking venue. This is documented for a future lawful catalogue correction, with no invented pin. NapLab's catalogue address conflicts with contemporary descriptions and lacks a verified first-party identity in this pass. DoubleDot and RoastLine have operator pages but no confidently identified existing catalogue row. HUB24/ThinkHub/SpaceBar were not promoted from unverified suggestions.

## Prior art checked

[OSM Open](https://github.com/hauke96/osm-open) is an existing map implementation that starts with an area, an intended date/time and a tag filter. Its separate unknown-hours state is the relevant method to reuse: a work journey should collect a person's time and required facilities before ranking candidates, while preserving unknown facts. No code or dependency was imported.

[opening_hours.js](https://github.com/opening-hours/opening_hours.js) parses OSM time expressions and exposes unknown/comment cases. The useful lesson is to evaluate the complete intended work interval in the place's timezone and distinguish known closure from missing data. Existing project hours handling remains in charge; this evidence builder only validates and compiles reviewed facts.

The smallest implementation is a data supplement keyed by existing IDs, with per-fact source links. A journey can rank proven matches and explain what remains unknown without introducing another venue database or applying a brand-level amenity assertion to every branch.

## Build and checks

Run `node scripts/build-journey-evidence.mjs`. It validates existing catalogue IDs/names, explicit branch proof, source references, dates, archive metadata, boolean fact types and bounded nonnegative THB prices. It writes `public/data/journey-evidence.json` deterministically. Prices may be null when the source does not state one; zero is reserved for an explicit free service. Unknown facts are omitted rather than converted to false.

The build passed with six existing IDs and eleven attributed sources: nine operator sources and two editorial sources. Five positively asserted power records also have explicit Wi-Fi evidence; four are within the catalogue's 800 m rail-distance threshold (the three follow-up branches plus VichSpace). The only positive parking records are operator-stated parking at the two cafés. Catalogue conservation and coordinate exclusion were checked separately. No UI files, catalogue files, dependency manifests or deploy configuration were changed in this research subtask.

## Rail laptop follow-up

Three existing branches now have both explicit Wi-Fi and outlet evidence: True Space Asoke, Samyan CO-OP and TK Park centralwOrld. They satisfy the existing catalogue's rail-distance threshold without adding or moving pins. This is a facility-evidence claim, not a promise of an empty desk or functioning socket at every seat.

- [True Space FAQ](https://www.truespaceth.com/faqs/) identifies Asoke in its general information, then explicitly lists free Wi-Fi, electrical sockets and extension leads. The saved raw HTML contains this text; the initial web text search had omitted it. Only the Asoke branch receives these facts.
- [KTC's workspace article](https://www.ktc.co.th/article/knowledge/salary-man/co-working-space-bangkok), updated 21 February 2026, names the second-floor Samyan Mitrtown CO-OP and explicitly states outlets and internet service. Outlet evidence is attached to that exact branch. [TVBS Super Taste's 4 January 2025 article](https://supertaste.tvbs.com.tw/amp/travel/352798) explicitly reports Wi-Fi and electrical sockets at the same second-floor CO-OP. The Wi-Fi note retains this dated editorial attribution rather than claiming recent operator confirmation.
- The same KTC article explicitly reports Wi-Fi and outlets for TK Park centralwOrld. Only its outlet fact is added: newer operator evidence already supplies Wi-Fi/access and hours. The article inconsistently lists floor 8 in its prose and floor 7 in its address. The operator's current floor 8 identity governs; no KTC floor, price or hours were imported.

Both editorial pages were fetched and archived before local extraction, with URL/status/date/content hashes and robots responses retained outside the repo. Factual facility indicators are paraphrased and linked; no images, review prose or protected database content was copied. The builder now permits the explicit `editorial` tier alongside `first_party`, preserving `published_at` separately from `updated_at`. KTC's original publication date remains null rather than being fabricated from its update date.

The follow-up recomputed five Wi-Fi-plus-outlet records, including the three newly supported branches within 800 m of mapped rail anchors; VichSpace also falls within the catalogue threshold. All eleven raw response hashes match; all six original catalogue IDs remain unchanged. Operator permission/access notes continue to apply. Samyan's dated Wi-Fi evidence should be reconfirmed if a live connection is essential.
