# Release verification — 22 November 2026

The reported fix is already deployed. Cloudflare lists version
`623de445-1832-4889-8511-9969d6e0fbd8` at 100%, created 21 November
18:48 UTC (22 November 02:48 Taipei). Its runtime assets come from
`7cb5e1e`; current main `ac308b9` changes only the earlier byte proof.

Both check and msh jobs succeeded for the fix and current main. See the two
CI records here; main run:
https://github.com/Nonarkara/bkk-co/actions/runs/44937701764

This session did not redeploy identical runtime bytes or change repository
visibility. The GitHub API currently reports the repo as private, correcting
the earlier report's claim that it remains public. PR #26 is a separate
workflow optimization and is not part of the runtime release.

An independent read-only Chromium review passed at 390, 1024, 1440 and
260 px with enlarged text. The Map link measured 44.27 by 44 px; the first
useful action is visible in the first screen. Keyboard Thai-language and
Work-tab navigation worked, with reduced motion and no horizontal bleed.
An injected held/empty-data request disclosed loading/unavailability; Retry
recovered by keyboard. Mobile PL;UB rendered 20,640 active work-place pins;
CL;UB rendered 329 cannabis listings with no category chips. No JavaScript
errors occurred in the exercised flows. Logs are attached.

Read-only production catalogue/API validation and the asset stamp check
passed. The six route probes returned 200 and the legacy bkkco hostname
returned its expected 301 to co.nonarkara.org.

Fresh byte comparisons passed: PL;UB 412 exact matches; CL;UB 411 exact
matches plus its expected metadata-only home-page rewrite. Both comparisons
found zero mismatches, missing files or known orphan assets. All shipped
runtime files therefore match the checked main commit.
