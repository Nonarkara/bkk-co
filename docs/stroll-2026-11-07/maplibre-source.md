# MapLibre4.7.1 · same-origin runtime bytes

The map runtime and stylesheet are unchanged `maplibre-gl@4.7.1` assets from the primary npm package. This removes the observed unpkg startup failure without upgrading the library or changing maps, feeds, styles or APIs.

Primary metadata: https://registry.npmjs.org/maplibre-gl/4.7.1

Primary package: https://registry.npmjs.org/maplibre-gl/-/maplibre-gl-4.7.1.tgz

Before extraction the complete7,989,733-byte tarball was verified against both registry values:

- SHA512 SRI: `sha512-lgL7XpIwsgICiL82ITplfS7IGwrB1OJIw/pCvprDp2dhmSSEBgmPzYRvwYYYvJGJD7fxUv1Tvpih4nZ6VrLuaA==`
- SHA1: `06a524438ee2aafbe8bcd91002a4e01468ea5486`
- Independently recorded SHA256: `7e8a778cff03abad64ae19674977058616e1cf7c3712cabd1c35461ae465f923`

Only exact package `dist/maplibre-gl.js`, `dist/maplibre-gl.css` and `LICENSE.txt` were copied to `public/vendor/maplibre-gl-4.7.1/`. No transformations. The JS and CSS also match the previously downloaded unpkg bytes exactly. Source maps are optional developer diagnostics and are not included; runtime worker code is already embedded in the unchanged browser bundle. The CSS has no external URL/import dependency.

| Asset | Bytes | SHA256 |
|---|---:|---|
| maplibre-gl.js |803,086|`be9633c4d870e26fb37f1cfe5c5a77181667114003ea16207ac7850d8da8add1`|
| maplibre-gl.css |65,534|`576b085fdd9487a65a19215328c1e086c07ce5bf6da09b666b3806d3d008dae9`|
| LICENSE.txt |5,984|`ee5fc05a0677eaf69601d2c7db0d9ecd6cc27c3abc1d0733bc9ed34707cf8ef2`|

Total874,604bytes. `maplibre-source.json` records package integrity, registry metadata SHA256, individual SHA256/SHA384 SRI, byte counts and CDN comparisons.

License: package BSD-3-Clause. The complete unmodified LICENSE.txt retains MapLibre and inherited Mapbox notices, glfx.js MIT terms and d3-color BSD terms. Existing map/data attribution remains unchanged.

Verification: `node test/maplibre-vendor.mjs`; `PLUB_VENDOR_INDEX=1 node test/maplibre-vendor.mjs` also checks parent-integrated local references. `PLUB_URL=http://localhost:43828 node test/maplibre-vendor-browser.mjs` blocks all unpkg traffic and requires the exact runtime version, real map, retained footprint colors and zero page errors. Its negative control demonstrates that the former CDN script fails to define MapLibre when that CDN is blocked. Browser evidence lives in `maplibre/`. `PLUB_VENDOR_PREVIEW=1` is an optional test-only document rewrite for a preview before parent index integration; final integrated verification does not use it.

No index/root file was edited by this subtask. Parent owns integration, CI, deployment and live byte verification.
