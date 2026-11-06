# MapLibre startup dependency · bounded plan

1. Retrieve exact `maplibre-gl@4.7.1` metadata from the primary npm registry, including official tarball URL, SHA512 SRI and SHA1.
2. Download the pinned tarball outside the repository. Verify its complete bytes against registry SHA512 SRI and SHA1 before extracting any executable asset. Compare the previously used CDN JS/CSS bytes to the verified package assets.
3. Copy only unchanged package `dist/maplibre-gl.js`, `dist/maplibre-gl.css` and `LICENSE.txt` into `public/vendor/maplibre-gl-4.7.1/`. Preserve license and version. No index/root edits, upgrade, API/feed change, minification or source transformation.
4. Record primary provenance, registry integrity, asset SHA256/byte counts, exact CDN comparison and license. Add a bounded static test for vendored integrity/license and a browser reproducibility option with external unpkg blocked; parent owns switching production index references and full integrated review.
