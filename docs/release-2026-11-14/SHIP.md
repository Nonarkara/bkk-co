# PLUB — release 2026-11-14

A day of auditing other agents' work. Four defects found in code that had
already been committed, pushed and declared done.

---

## 1. A colour that does not exist, presented as credited

Another agent added a fifth data role — a dispensary kind for CL;UB — and gave
it `#b39ddb "Wisteria"`, writing it into `STYLE.md` as *"credited digital
catalogue conversion"*.

**It is not in the catalogue.** The proved palette
(`docs/stroll-2026-11-07/zoom-mood-provenance.json`, the Sanzo Wada catalogue the
repo already ships) holds 33 colours. `#b39ddb` is not one of them. The
catalogue's yellows are Cream Yellow `#fdbf68`, Lemon Yellow `#f8ed43`, Naples
Yellow `#fbe6a0`, Pale Lemon Yellow `#ffefae`, Yellow Orange `#f99d1b`, Sulpher
Yellow `#f5ecc2`.

Worse, the key then showed **five** swatches while its own source sentence named
**four**, and attributed them to a plate that holds four.

Fixed, and now locked by `test/data-role-palette.mjs`:

- every colour that marks a place must be a colour the catalogue owns;
- the legend's source sentence must name exactly what the key shows;
- no two data roles may wear the same colour;
- an ink step must be a *proven blend* of the ink toward white (`--ink-80` is
  exactly the ink at 20 % white), not a new hue;
- the accent has one job.

## 2. The accent was not a catalogue colour either

`--amber: #f59e0b` was the interface's one accent. It appears nowhere in the
catalogue, and it wore three jobs: the co-working dot, the pressed state of the
primary action, and the pressed state of a mood chip.

Now: `--accent: #dd4027` — **Red Orange**, plate 241, and the only colour in the
catalogue that no neighbourhood ground and no data role already wears. Its job
is the co-working category mark and nothing else; the two pressed states moved
to the ink, and the chart marks moved to the ink.

**The palette is exhausted.** The twelve neighbourhood grounds, the four data
roles and the ink family take 32 of the catalogue's 33 colours. A fifth data
role cannot be given a colour without re-planning the grounds first. That is
now written in `STYLE.md` rather than solved by typing a hex.

## 3. Dead code that could still print a platform rating

A Google Maps list extraction had been removed from the repository, but the
code that could still render *"PLUB Endorsed · Google ★4.5 (312 reviews)"* stayed:
the 3D world's pin label, its place card, its minimap colour, and a stylesheet
class for it.

A rule that only removes data leaves the door open. `test/no-platform-scraping.mjs`
now checks that no shipped file carries a platform extraction, that no shipped
script reads a platform field (`googleRating`, `googleReviews`, `endorsed`, …),
that no stylesheet keeps a class for a platform label, that neither the browser
code nor the Worker calls a platform API, and that the catalogue carries no
platform field.

## 4. The strongest honesty check in the repository was dead

`test/street-world-source.py` compares the shipped geometry against the pinned
OpenStreetMap snapshot byte for byte — every footprint, every street node run,
every junction, every 40 m café association. A per-area split on 2026-11-07
changed the file format; the test crashed with `KeyError: 'buildings'` and
stopped running. It was not in CI because it needs the 329 MB local snapshot —
so every report that said "all suites green" was true of a suite nobody ran.

It runs again, across all twelve neighbourhoods.

## 5. The manifest named the wrong source extraction

`public/data/street-world.json` carried a `cacheKey` pointing at a **five-area**
OpenStreetMap extraction cache while its geometry had been built from the
**twelve-area** one. The index writer inherited the key from the previous
manifest instead of computing it, so it went stale the moment the area list
changed — and the system's own statement of where its geometry came from was
wrong. The key is now recomputed from the area list and its bounds, and the
raw-source test asserts the named cache holds all twelve neighbourhoods' source
files.

## 6. The research page counted less than the place sheet

The research section counted documented working facts from map tags alone,
while the place sheet and the API read map tags, visitor ratings and named
on-site reports. Its headline understated what is documented: **589 → 591**
places, **59 → 61** clearing the coverage floor.

## 7. Height enrichment, answered by measurement

Joining the pinned snapshot by OSM id: **320** buildings carry an explicit
height in the twelve extraction boxes; **248** fall inside the 800 m radius that
ships and **all 248 are already drawn**. Zero lost, zero invented. A further
6,163 state how many floors they have — a floor count is not a height, so they
stay flat. The snapshot is exhausted; the 3D world's sparsity is a property of
OpenStreetMap in Bangkok, not a gap in PLUB.

## 8. One command that proves the ship

`scripts/ship.mjs` reads its test list out of `.github/workflows/notebook.yml`,
so the local gate and CI cannot fall out of step. It runs every CI test in CI's
order, the MSH gate, the planted gate (which must fail), the raw-source equality
check, and with `--deploy` it deploys, byte-verifies and exercises the live URL.
A step that cannot run is marked SKIP, never PASS.

## 9. What is still honestly unfinished

- **The palette is exhausted** — 32 of 33 colours are spoken for. The next
  category needs the grounds re-planned, not a new hex.
- **The catalogue holds no dispensaries**, so no colour wears that role. The
  kind stays in the model and lights up when a rebuild brings it.
- **Only 590 of 20,640 places** carry any documented working fact and only 60
  clear the coverage floor. This is the thing most worth fixing, and it is
  fixed by people reporting, not by code.
