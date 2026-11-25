# Approved PL;UB and CL;UB release

| Release | Runtime commit | Worker | Hosted gate |
|---|---|---|---|
| Shared link and directory recovery | `e9d9f23` | `67de6c83-ef0c-4130-995e-878b870306f0` | [45632751480](https://github.com/Nonarkara/bkk-co/actions/runs/45632751480) |
| Work planner and directory sources | `cc4ab7e` | `c5087499-313e-4e58-9135-7cfdb846a079` | [45642370574](https://github.com/Nonarkara/bkk-co/actions/runs/45642370574) |
| Sam Yan manga pilot | `e987fbd` | `c3a0a20c-490f-441d-9442-0a4df2410e5b` | [45642405171](https://github.com/Nonarkara/bkk-co/actions/runs/45642405171) |
| Exact work-session hour boundaries | `c284e6a` | `9c849dc3-f670-442e-bc72-0d69f8c652da` | [45644242073](https://github.com/Nonarkara/bkk-co/actions/runs/45644242073) |

The first recovery deployment from `b559837` was rolled back to Worker
`13033777-2391-4710-86a2-3b45785e42b8` after a production check reproduced
a CL;UB named-search Retry failure. Recovery `e9d9f23` fixed the request
transition and added browser assertions for both named-search retry paths.
It passed the normal and planted MSH gates. Production replay passed shared
Work, Food and CL;UB links, search focus and dismissal with a failed basemap.
The production byte verifier reported three transport timeouts for PL;UB.
Independent downloads matched their exact local bytes; see the recheck file.

The planner moved trial actions above the comparison table after the
enlarged-text audit. Thai and English browser reviews covered 390, 1024
and 1440 px and 260 px with 24 px root text. The first version of the
hosted check still queried links in the old table. The corrected check
measures the new action in the same first-screen budget. The flat 3D
preservation test now checks the explicit footprint label.

The isolated notebook API run passed 67 assertions including private
draft storage, photo opt-in, explicit publishing, moderation, ownership and
deletion. The personal preference and café-hop tests passed. Those flows
retain their existing account and consent boundaries and add no analytics.

In the Sam Yan pilot, independent 390 px touch and desktop tests followed
manga geometry, opened the exact ABBA BANGKOK place from its marker, and
returned to the original camera pose. The projected marker accepted touches
20 px outside the centre of the painted label. Simulated WebGL loss opened
the Sam Yan 2D sketch. Procedural trees were omitted in the pilot because
their positions had no source. Production replay confirmed street-level
entry and the exact camera restore. The source audit recalculated 248
explicit heights across 20,650 footprints and found zero shipped heights
missing from the pinned extraction.
## Pilot evidence yield

Screened 15 ranked candidates for each two-hour laptop journey using the
published work catalogue, branch evidence, and mapped rail and river joins.
The replay starts at 10:00 Bangkok time on 25 November 2026. It uses no private
visits, live visitor scores or traffic claims. A complete match has both the
requested facts and a recorded schedule covering the visit window.

| Journey | Complete matches in first 15 | Verified source facts used |
|---|---:|---|
| Ramkhamhaeng drive from the mapped Hair Center | 1 | VichSpace, operator hours, Wi-Fi, outlets and parking |
| BTS Ari, 800 m straight-line proximity | 0 | No candidate had recorded hours plus both requested amenities |
| Siam Square, 800 m straight-line proximity | 1 | TK Park, operator hours and Wi-Fi plus attributed editorial outlet evidence |

The target was three complete options per journey. The finder puts
documented sessions first and labels alternatives that still need checking.
In the Ari–Sam Yan comparison, the raw counts of mapped places appear beside
the much smaller documented laptop pilot counts. Ten reviewed workplace
records and sixteen source entries can be rebuilt from versioned inputs.
Separately sourced claims do not rewrite the signed place catalogue.

## Field verification outstanding

Physical Android and iPhone tests remain open. The browser review used real
rendering and emulated touch. Field work should verify outlets, working access
and schedule at Ari, and check current admission at TK Park. The Sam Yan
scene uses 174 extrusions with explicit mapped heights. Its 3D view and map
sketch describe source geometry; neither establishes street access.

## Phone startup measurement

Five cold runs per host and one warm run used 390×844 Chromium, 120 ms
latency, 200,000 bytes/s down, 93,750 bytes/s up and 4× CPU slowdown.
Each sample checked the loaded app fingerprint. Timing includes the network
and rendering of actual map pins. Transfer is bytes received by the useful-map
checkpoint. This is a throttled-browser result and does not describe a
physical phone.

| Host and build | Median useful map | Slowest useful map | Median named hit | Median place sheet | Median bytes |
|---|---:|---:|---:|---:|---:|
| PL;UB recovery | 18.81 s | 25.14 s | 24.83 s | 25.32 s | 1,692,375 |
| PL;UB including planner and Sam Yan | 19.86 s | 20.55 s | 20.32 s | 20.79 s | 1,693,774 |
| CL;UB recovery | 11.31 s | 14.59 s | 11.49 s | 12.47 s | 901,250 |
| CL;UB including planner and Sam Yan | 11.63 s | 25.17 s | 11.85 s | 12.54 s | 902,418 |

The 10-second useful-map target was missed. PL;UB's median place sheet was
available 4.53 seconds sooner during the second run. The median useful-map
time and the CL;UB slowest useful-map time increased. The runs do not isolate
the effect of changing network conditions. The final hours follow-up
changes the work-session model and its HTML asset fingerprint.

## Final live verification

Both live domains accounted for all 412 files in `c284e6a`. CL;UB had 411
exact matches and its expected index metadata rewrite. PL;UB had 405 exact
matches in the first pass. The seven transport failures were retried and
all seven matched byte for byte. The manifests found zero mismatches, missing
files or known orphan assets. The final browser checks exercised both
languages, CL;UB register labels, the public venue API and direct Sam Yan entry.

The final hours browser test ran the production model with a two-minute
closure, a continuous schedule and an unsupported holiday expression. It
returned excluded, documented and unknown respectively.
