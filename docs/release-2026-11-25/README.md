# Standalone-page release

Cloudflare Worker `5a8d511d-f8cb-4214-93bd-09977e25dc08` serves commit
`cd67034`. Previous verified Worker `623de445-1832-4889-8511-9969d6e0fbd8`
is the rollback target for this deployment.

Both production sites matched the build. PL;UB matched all 412 files.
CL;UB matched 411 files and the remaining home page matched apart from its
expected metadata. The manifest checks found zero missing or orphaned files.

The [main CI run](https://github.com/Nonarkara/bkk-co/actions/runs/45312193107)
passed. Independent Chromium checks measured the 404 links at 44 px high
and at least 86.9 px wide at 390, 1024, 1440 and 260 px with enlarged text.
The missing URL returned HTTP 404 and keyboard activation returned to the map.
Both phone maps and the day planner loaded without browser errors in the review.
