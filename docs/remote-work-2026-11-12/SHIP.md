# Bangkok day planner

[Planner](https://co.nonarkara.org/day) · [Thai planner](https://co.nonarkara.org/day?lang=th) · [Customer journeys and source register](JOURNEYS.md) · [PR #20](https://github.com/Nonarkara/bkk-co/pull/20)

The three planner actions open a comparison for two of twelve mapped area anchors, a café hop or map view from a chosen area, and the existing finder with the selected task, mode and time. Compare measures fixed 800 m circles and nearest eligible same-bank station points. It does not estimate a walk, rent or suitability for a particular home. The work finder displays branch-specific opening hours, pass conditions and ID qualifications with citations. Eight existing catalogue places now have reviewed operator or editorial work evidence from 14 registered sources. The signed place catalogue is conserved.

The stamp panel reads the same four stamp areas as the notebook. It reads unique private visit IDs on the device without loading photos. Saving a visit is sufficient to earn an eligible stamp. Publication follows the separate notebook preview and consent flow.

Independent review verified all 27 normal and enlarged planner profiles, keyboard navigation, retry from an HTTP 503, and handoffs to the map, a five-stop café hop and the Thai work finder. Disposable local visit fixtures advanced stamps from 0 to 1 to 2, while duplicate visits left the count unchanged and no request wrote to the network. Grouped-list chrome measures 112px at 390 and 110px at 1024, 1440 and 1720. The map toolbar stays 48px. At 390px and 30px Thai body text, the work and home-comparison actions require vertical scrolling.

The new MSH check opens all three planner modes in Thai at each audit width and requires their first actions to fit. Its planted fixture displaces the work action below the fold. The existing map, curated page, grouped list and 3D checks still run in the same job.

PR CI passed normal and planted MSH. A separate local planted repeat recorded a timeout loading the pre-existing Bridge place sheet at 1440; the planner measurement itself passed and rejected its fixture at all widths. Production's Thai reading request carried four hours and the exact Sam Yan anchor into the finder, and the comparison picked Saphan Taksin for Charoen Krung. Production requests stayed read-only. Worker `73b834fb-c9b0-4d08-bc5e-6906d81e84e0` serves commit `684046d91e419446d92b7849dcb6fefcf2a60c85` at 100%. [PR CI](https://github.com/Nonarkara/bkk-co/actions/runs/43229639942)

All 27 production planner profiles rendered without horizontal overflow or browser errors. All 399 public assets matched the deployed source, with zero missing files, mismatches or stale assets.
