---
updated: 2026-11-07
drafted_by: codex/gpt-6.1
reviewed: false
---

# Neighborhood photograph collection · 7 November 2026

Real photographs selected from Wikimedia Commons for neighborhood reference. They are **not photographs of a selected café/venue** and do not establish a venue's current appearance, opening, access or entrance. No catalogue pins or geographic geometry were added.

The owner explicitly authorized free photographs with proper credit during this session. Accepted licenses: CC0/public domain, CC BY and CC BY-SA. No NC, ND, unknown-license or AI generated imagery is accepted. Each WebP retains its original photograph's license; credit, original title, source file page, original image URL, license link and conversion notice are stored per image in `public/data/neighborhood-photos.json`. Credit captions must show the title, creator, source and license; conversion information must remain accessible beside the image/details. No endorsement by photographers is implied.

## Provenance and collection

- Source: the public [Commons Action API](https://www.mediawiki.org/wiki/API:Imageinfo), selected file IDs in `selection.json`. Search results were discovery candidates, never automatic acceptance.
- Raw selected API responses and request URL/header/time evidence are retained under `raw/`, written before parsing. Original source SHA-1 and local derivative SHA-256 distinguish provenance from transformed bytes.
- Requests are sequential, identify PLUB and its project URL in User-Agent, and pause between requests. A denial or rate limit fails the collector; no rotated identity or endpoint workaround.
- Openverse returned HTTP401 to an unauthenticated probe and was not pursued. Commons was accessible without authentication. The browser does not call either API: images are self-hosted.
- The collector downloads the provider's public thumbnail, applies orientation, resizes within640×640, strips metadata and encodes WebP at no more than80KB. There are no content edits, fabricated additions or crops.
- Associations use the photographer's Commons description, categories and source coordinates where supplied. The original description and coordinates are retained per image. Null coordinates remain unknown; no coordinates were invented from neighborhood labels. Ramkhamhaeng means the named road corridor, including Hua Mak and Saphan Sung, not an800m circle around one point. Thong Lo includes adjacent Ekkamai, explicitly named in its label.
- Capture dates are retained and must be available in image details. The collection documents urban context at those dates; it is not a claim of present conditions.

## First-party terms checked7November2026

- [Commons reuse guidance](https://commons.wikimedia.org/wiki/Commons:Reusing_content_outside_Wikimedia): download/reuse with the particular file's license and attribution requirements.
- [Wikimedia API access policy](https://www.mediawiki.org/wiki/Wikimedia_APIs/Access_policy): identify the client, observe limits and respect per-file licensing. Response headers are preserved with selected requests. This is an offline ingestion process; browser CORS is not required.
- [CC0](https://creativecommons.org/publicdomain/zero/1.0/), [CC BY4.0](https://creativecommons.org/licenses/by/4.0/), [CC BY-SA4.0](https://creativecommons.org/licenses/by-sa/4.0/): the exact version/URL for every file remains authoritative. BY requires credit/license/change notice; SA adaptations retain the same license. Earlier license versions are linked per image rather than silently upgraded.

## Reproduction and checks

```sh
python3 scripts/collect-neighborhood-photos.py --fetch-metadata
python3 scripts/collect-neighborhood-photos.py --download
python3 scripts/collect-neighborhood-photos.py  # offline from retained metadata/assets
node test/neighborhood-photos.mjs
```

Pillow is needed for image conversion and dimension checks. `--fetch-metadata` saves a new immutable snapshot and does not rewrite prior raw responses. `--download` skips existing derivatives. The manifest changes only after the complete approved selection succeeds; missing files, missing dates and rejected licenses fail loudly.

The contact sheets are review evidence, not product assets. Visual review checks actual photographic content, distinct scenes, neighborhood plausibility and suitability; metadata/coordinates support that check but cannot independently prove a scene's truth. Individual file pages remain the provenance source.
