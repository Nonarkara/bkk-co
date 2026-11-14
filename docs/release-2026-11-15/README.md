# PL;UB and CL;UB separation

PL;UB Worker deployment: `754d3a1e-59e4-41f4-88fb-e30cefdef1a0` from `3dae6ef629cea9dfdbf9c88e240b72742df45333`. See [live bytes](live-bytes.json): 403 matches, zero mismatches, missing files or old assets still served. The prior CL;UB catalogue returns 404 on PL;UB. The 57,379-place catalogue and live read-only API passed.

The original mixed build remains preserved on the private `club-source` branch. The **separate** public [CL;UB repository](https://github.com/Nonarkara/club) publishes only its static directory and open-data extract. It is [live on GitHub Pages](https://nonarkara.github.io/club/). Source review excluded weak matches and stopped labeling named dispensaries as clinics. The `custom-domain` branch stages the CNAME; the DNS-only record `club → nonarkara.github.io` remains needed before activating that change.

The independent browser review passed Thai headings at 390, 1024 and 1440 px and checked keyboard dismissal and 150% text. Known issues at 150%: search and category chrome can clip, and the first neighbourhood comparison link may fall below the fold on mobile. GitHub did not start PL;UB CI jobs due to account billing; local model/API tests and bundle dry run passed. The full MSH capture could not complete because screenshot capture timed out.
