# Public repository and search release

Search keeps the highlighted venue when delayed catalogue results reorder the list. Escape dismisses results and prevents Enter from opening a hidden selection. CL;UB exposes a keyboard-accessible retry for a failed directory request. Basemap startup preserves the recovered search, its highlighted result and focus.

The initial release was built from `534c5ab` and deployed as Worker `6a72d139-0fca-4271-b23c-e701d9c62de6`. Production testing reproduced the remaining basemap race by delaying the style response until after the directory recovered. Browser tests exercised both builds with the same sequence.

The follow-up was built from `14ad55a201a215df5cdd3f67133c31d0d7e6a0fe` as Worker `13033777-2391-4710-86a2-3b45785e42b8`. Independent keyboard and geometry checks covered 390, 1024, 1440 and 260 px with enlarged text across the release. The basemap race was independently checked at 390 and 260 px with enlarged text.

- [Initial hosted run](https://github.com/Nonarkara/bkk-co/actions/runs/45578928909)
- [Follow-up hosted run](https://github.com/Nonarkara/bkk-co/actions/runs/45580827885)

Before making the repository public, a redacted scan of all Git refs flagged nine strings. Review identified eight catalogue IDs and an OpenStreetMap access tag. An unauthenticated GitHub request confirmed public visibility.

The final hosted checks and deliberate layout regression test passed. Production browser tests passed on both domains. The asset verifier found 412 exact matches on PL;UB and 411 on CL;UB, plus CL;UB's expected metadata rewrite. Both origins had zero mismatches, missing assets or orphan files.
