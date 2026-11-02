# PLUB: a useful notebook before a social platform

3 November 2026. Owner approved notebook-key login now and Google sign-in later.

The existing PLUB map, 57,538 sourced places, finder, café hops, moods, neighbourhoods, visitor work ratings and local passport remain. This release adds a working cloud notebook and an explicit path from private visit to public recommendation.

## What you can use

- Log a dated visit, private note, feelings, optional stars and up to four photos. Existing device data/exports stay intact. Edit/search notes and keep text drafts through navigation.
- Create a cloud notebook, save its private sign-in key, back up chosen visits, restore on another device and export cloud data. Cloud/device copies are explicit; no automatic upload or silent profile merge.
- Publish the reviewed note/stars/feelings with your chosen public name. Photos default off. Your visit date stays private. Your public post is separate from the device/cloud source.
- Read recent community recommendations and photos, report problems, remove your own post, or moderate reported photo copies with the owner's separate key. Three distinct reports temporarily hide a post; the owner can keep it visible or remove it.
- Choose whether saved visits contribute to research. The default is off. Public per-place totals require five consenting accounts; notes/photos/dates never enter the query. Withdrawal takes effect on the next query. This is voluntary recorded activity, not verified footfall or a GPS trail.
- Install the web app from the browser menu. Manifest and two Nong Plub icons are supplied. Google sign-in, offline maps and a Google Play listing are not claimed.

See [the short owner guide](OWNER.md) for tomorrow's use and moderator access.

## Design and task geometry

A warm field notebook with a useful map on its cover. The interface uses Hermosa Pink, Pansy Purple and Neutral Gray from the locally credited Wada plate273 catalogue. White carries reading; wash/muted tokens are derived tints. The fourth plate colour, Sudan Brown, is not needed in the interface. Existing crayon guide art and source cartography keep their own colours. Pink gives the guide its bounded field; purple carries ink and controls. No decorative cards, gradients, shadows or rounded filler were added.

Pansy Purple/white contrast is10.36:1; Pansy Purple/Hermosa Pink6.69:1. Form boundaries use ink. Colour does not carry a choice alone: labels, filled/outlined buttons, symbols, focus and pressed/checked states remain. Jost/Prompt remain; secondary text is12px.

Independent review caught the first new notebook's utility-band chain: cloud/device/moderation/stamps displaced a saved visit's actions. Moving the guide and secondary tools below entries puts first-action bottoms at493px on390×844 and469px at1024×900,1440×900 and1280×720. The600px/working-viewport gate is unchanged; a DOM restoration of the old chain fails at743–792px. Empty notebook's Log a visit action also stays visible. At30px body text the actual entry edit/save path works without document bleed. The normal header+filters are90px. The working notebook sheet is an explicitly requested view; map-first load still dominates normal browsing.

`before-*`, `after-*`, `preserved-*` captures and browser-results.json hold real browser evidence. `REVIEW.md` closes all independent findings. Geometry budgets prove the declared cases, not every possible device/content. Existing route qualifications and limitations on roads/canals remain.

## Verification

- Existing catalogue conservation/validator/hours checks pass, including read-only local API checks.
- Real Worker/local D1:67 assertions pass for account isolation, exact origin/body bounds, session revocation, revision races, stale delete/publish, account switching, private/public photo selection, venue correction, ownership export, reporting/moderation, research withdrawal and deletion. The suite is stateful: a rerun inside the hour trips the real rate limits (create/publish 20 per IP per hour) and fails on 429 — that is the limiter working, not a regression. Reset first: stop `wrangler dev`, `rm -rf .wrangler/state`, restart, and confirm `/api/account` answers JSON before rerunning.
- Deterministic held-auth deletion test proves no orphan entry/post survives account removal. Foreign keys cascade. JPEG metadata before/after scans is stripped; impossible dates and trailing/unsupported photo data reject. Daily expired-session/security-bucket cleanup is tested. Registration allows20 accounts/hour from shared Wi-Fi before rejecting excess requests; the allowance and cap are tested.
- A New York browser context still renders both legacy Bangkok instants and pure visit dates as3November; zero stars says Not rated yet.
- Real Chrome four-width notebook flows pass: create/sign in, local edit, private backup/photo, search, immutable share preview, fresh-device note/photo restore, and bounded cloud timeout with device privacy controls available.
- Photo moderation/keep/remove, cloud-delete then rebackup, cloud-data download, atomic local deletion, finder/hop/mood preservation and late-catalogue draft/save tests pass. No browser page errors in declared flows.
- Worker dry-run build passes. GitHub CI runs pure boundary/date/catalogue tests, syntax and bundling.

The local race test deliberately causes a failed write after deletion; its expected503 is not a failed suite. Earlier build/selector/form failures were repaired and the final sequential checks were rerun; they are not counted as passes.

## Boundaries

This remains a T1 pilot. Notebook keys cannot be recovered if lost. Public names/visits are user assertions, not verified identities or access guarantees. Cloud storage is not end-to-end encrypted. New tables are additive; legacy ratings are separate. Photo storage is bounded in D1 for this pilot, not an unlimited photo-hosting service. Large-scale media storage/operations and Play Store packaging remain future work.

Private lists strip photo payloads; export fetches one owned snapshot at a time and builds Blob parts. Public recent lists cap at5 and moderator lists at10 to bound photo memory. Rate buckets and expired sessions have daily cleanup. The registered notice/data rights are in privacy.html and DATA-REGISTER.md. Source evidence for provider recovery retention: [Cloudflare D1 limits](https://developers.cloudflare.com/d1/platform/limits/). Source app installation requirements: [MDN installable web apps](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable).

Deployment and public verification are recorded in SHIP.md after release.
