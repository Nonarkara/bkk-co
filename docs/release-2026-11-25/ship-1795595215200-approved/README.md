# Next release verification

Cloudflare candidate version `d9232609-4362-4c4a-8608-878634e1802e`
was uploaded from runtime commit `5330574`. The comparison version
is `5a8d511d-f8cb-4214-93bd-09977e25dc08`.

The baseline is five cold runs per live host and one warm run each.
The Chromium profile used 390×844, 120 ms latency, 200,000 bytes/s down,
93,750 bytes/s up and 4× CPU slowdown. Median cold results follow.

| Host | Bytes to useful map | Map | Named search | Place sheet |
| --- | ---: | ---: | ---: | ---: |
| PL;UB | 3,111,659 | 20.48 s | 21.92 s | 22.74 s |
| CL;UB | 2,194,262 | 15.26 s | 16.55 s | 19.17 s |

Candidate browser checks with captured upstream Positron style and TileJSON
confirmed Food is off the startup path, an injected 503 can be retried by
keyboard, and the existing direct link to Baba Shuk resolves. Candidate
CL;UB loaded 329 listings and requested no Bangkok work, food, branch or
retained footprint files. These are behavioral checks. The fixture and the
saturated local test host make wall-clock comparisons unsuitable.

GitHub refused to start the main check job with an account billing or
spending-limit error. The local CI suite steps, notebook boundary tests,
catalogue verification, asset stamp check, bundling and failure-class
fixture for the release verifier ran during the approved scope.

The candidate was promoted to 100% of production traffic. The live catalogue
and API probe passed, the day and Bridge pages returned 200, an unknown route
returned 404, and the legacy hostname returned its expected 301. The new
proofs compare against the preceding release on each host. PL;UB matched
412 assets. CL;UB matched 411 assets plus the expected metadata rewrite.
Both reported zero mismatches, missing assets, known orphans, HTTP failures,
or transport errors.

The normal local MSH run passed all six map layouts, standalone tap targets,
the enlarged-text check and the remaining preserved flows. The Manga handoff
timed out during that run. It passed in the planted run and passed a focused
retest on the final candidate in 2.063 seconds. The planted run caught its
geometry, Escape, tap-target, and ungrouped-list defects. Its Bridge place
load timed out under load. The final candidate passed the same Bridge
reading checks and rejected the same planted fault in a focused browser run.
The combined evidence covers those checks. Neither full run was recorded
as a clean pass.

An independent reviewer exercised the three journeys at 390, 1024, and 1440
px and at 260 px with 24 px root text. The final enlarged Drive recheck
recorded a 44 px Directions button ending at y840.53 of an 844 px screen.
There was no horizontal scrolling or JavaScript error. The start, route and
keyboard focus survived opening a place and using Back.

Five cold production runs per host after deployment used the same throttled
profile. Median time to the first useful map fell from 20.48 to 14.08 s for
PL;UB and from 15.26 to 7.07 s for CL;UB. Median bytes dropped from 3,111,659
to 1,759,727 for PL;UB (43.4%) and from 2,194,262 to 938,108 for CL;UB (57.2%).
Median named search and first place details also improved on both hosts.
All measured sessions completed without JavaScript errors.
