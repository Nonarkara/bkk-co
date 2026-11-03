# PLUB · Placemaking Laboratory Urban Bureau

Where to work in Bangkok, on one map: **[co.nonarkara.org](https://co.nonarkara.org)**

57,538 cafés, co-working spaces, libraries and restaurants from OpenStreetMap and Overture Maps, each scored as a Great Good Place (Oldenburg) from open data.
Four neighbourhoods with stories and live numbers, Nong Plub as guide, and a passport of visits and photos kept on your phone.
Visitors rate Wi-Fi, outlets, quiet and laptop-friendliness. Places nobody has rated show as not rated.

Places © OpenStreetMap contributors (ODbL) · © Overture Maps Foundation (CDLA-Permissive-2.0).
See `context.md` for sources, rebuild and deploy.

Notebook API checks can be rerun safely with `node scripts/test-notebook-isolated.mjs`: each run owns a fresh local D1 and leaves shared state untouched.

Café contact enrichment uses a pinned CC0 AllThePlaces snapshot. Run `python3 scripts/enrich-places.py` after the base catalogue; the main builder does this automatically. It fills missing addresses/phones only, with source IDs and dates, and never adds or moves pins. See [the data contract](docs/audit-2026-11-03/DATA.md).

Explore **50 + 50 cafés** from the guide or search: publisher/institution entries and a separately labelled public-discussion cohort. All sources and dates are linked; these lists do not invent a Bangkok-wide rank or pin. Rebuild with `python3 scripts/build-discovery.py`. Regenerate all brand icons/previews with `node scripts/build-brand-assets.mjs` against the local Worker.
