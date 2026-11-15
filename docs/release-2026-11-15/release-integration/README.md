# PL;UB and CL;UB integration

Source `4e1c909` on main, from PRs #24 and #25. Cloudflare Worker version
`4224f651-a631-4988-9f35-33370f745338` serves co.nonarkara.org,
bkkco.nonarkara.org, and club.nonarkara.org.

The premerge test log is attached. Its single failed step checked that the
candidate branch was a clean copy of main before it was merged. All 35 suite
steps, normal and planted MSH, and pinned-source geometry equality passed.
The clean deployed checkout was subsequently identical to origin/main
(0 ahead, 0 behind). The changed Einstein, footprint, CL;UB isolation and
street suites were also run on the candidate containing the fixes.
GitHub's hosted jobs did not start due to the account billing restriction.

An independent browser reviewer checked both bureaus at 390, 1024, 1440 and
260 px with enlarged text. It checked that Einstein tiles preserve active
selections, the map key opens with the keyboard and dismisses with Escape,
and CL;UB recovers from a failed directory request. A separate injected
failure blocked Bangkok work data and confirmed that CL;UB still starts.
The reviewer also exercised the 3D renderer and found that the avatar
obscured the phone street view. The deployed version starts with it off and
keeps the control in Appearance. Building height and road geometry remain
restricted to the source.

Live Chromium checks confirmed both directories keep their pins and draw
Einstein tiles, with no JavaScript or CSP errors in those flows. The live
street check verified the Avatar opt-in, focus restoration and no sideways
overflow at all four widths. The asset audit found 410 byte matches on
PL;UB; on CL;UB it found 409 exact matches plus the expected home-page
title/description rewrite, whose remaining HTML also matched. Neither
origin had a mismatch, missing asset, or known orphan.
