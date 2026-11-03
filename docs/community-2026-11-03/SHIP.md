# Shipped and verified · 3 November 2026

Public: https://co.nonarkara.org · meet's space https://co.nonarkara.org/?p=o825832f94e7f

- PR6 merged: https://github.com/Nonarkara/bkk-co/pull/6
- Feature48883a3, independent retry proof8741a8f, rail-distance honesty6f26bb1; merged runtime source **583f5409bc5b60df9f307eaf839608e7bbedd23a**.
- Worker **22427c9f-79c4-48fe-b7e9-94e0298c74de**. `npx wrangler deploy` succeeded,19changedfiles uploaded/192unchanged. No DB migration or secret change.
- Main runtime CI success: https://github.com/Nonarkara/bkk-co/actions/runs/41673098616 . Final branch runtime checks41672765137/41672775099 also pass.
- **211/211 public resources byte-match** checkout, hashes in live-bytes.json. Legacy hostname keeps301andquery. `node test/check.mjs https://co.nonarkara.org` read-onlyAPI passes.

## What reached the public site

Meet's space original open-source point is restored with reviewed classification/provenance and Non's dated visit. No inferred equipment/parking/star. All57538previous catalogue rows and allpreviousgeojoins retain exact values; total57539/cafés20236. Full fresh ingestion reproduces the workSHA0bb9a767b51606ee5a785bf441daefe387ea50b377ff847dcd747e18296ebc30. MotherRoasterTalatNoi/HongSiengKong source features added; stale Patina match rejected.

Map symbols retained; consistent type silhouettes now also label list/search/filter chrome. Search accepts curlyapostrophes, Latinaccents, tokenorder and the placeNAME in a fullGoogleMapsplaceURL without fetchingGoogle. Featured gives verified branch+source+date+directions, ordered nearest mapcentre. Both50entryresearch lists remain.

Directions and visit fit one row; notes/photos, recommendations and sharing are next to them. Private device save→optional contextual account/key→preview→explicit publish. Photo inclusion remainsunchecked; navigation duringbackup cannot publish or replace newer UI. Short confirmations fitcontent and keeprelatedvenues beneath;44pxchangedcontrols, no horizontalbleed. Direct place entry can show small knownfacilityevidence without waiting forlargegeo. RailAccess shows recordedstraight-line metres rather than inventedminutes.

## Public browser gate

`PLUB_URL=https://co.nonarkara.org READ_ONLY=1 node test/community-browser.mjs` passes360/390/1024/1440/1280: actual live missingplace lookup (including suppliedMapslinkname), categorysymbols, sourcefeaturedbranches, exactdirectioncoordinates, manualsharefallback, communityread/private-device-save,28pxtext, compactaction/confirmationgeometry. **Zero APIwrites and zero pageerrors at all5widths.** Actual clock used. `live-browser.json` and live*.png.

The first existing journey-gate attempt assumed VichSpace would currentlybeopen. At23:22Bangkok it isclosed; its legitimate absence caused that test to wait. Separate actual-clockpubliccheck confirms hours07–20, openNowfalse, noVichSpace result, zeroerrors/writes: live-actual-clock.json/png. This is expectedbusinessbehavior, not a reason to weakenhoursfiltering.

For reproducible daytime travel paths: `PLUB_URL=https://co.nonarkara.org PHASE=live FIXED_BANGKOK_TIME=1 node test/journeys-browser.mjs` passes all3journeys at360/390/1024/1440. Its browser clock is **explicitly simulated10:00Bangkok**, labelled perrecord; provider/backend/server time isunchanged. Exactbarberorigin, BTS/walking/motorcyclehandoff, SiamGPSfixture, strictfacilities/hours, first-screenDirections and mapcontrolclearance pass. Evidence live-journey-regression/. No productionpost/rating/accountwrite.

Actual backend publishing tested only onfreshlocalD1: originalnotebook at4widths/photo+backup+restore+cloudtimeout and newcommunity at5widths allpass in immutableWorker;67/67APIassertions; model/source/conservationchecks; independentMSHreview andfaultfalsifiersPASS. See VALIDATION.md and REVIEW.md. Historical release evidence directories restored unchanged after reruns.

## Limits

No live traffic/capacity/equipment guarantee; external Google route checks stay explicit. Rail/park/parking distances are sourcepoints/geometry, not entrance access or walktime. RealGPSaccuracy/physicalphones/assistive-device userstudy notclaimed. No OAuth/GooglePlay/nationalcoverage/schemachange. Privatefirstdata/explicitresearchconsent/moderation preserved. Documentation/test-only proof commits after583f540 require no redeploy when public/src remain identical.
