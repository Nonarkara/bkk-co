# Hop audit, 5 November 2026

Audited baseline HEAD4d496db; no production writes.

Confirmed baseline findings reproduced with fresh node:sqlite in backend-audit.mjs:
- 101 owned hops PUT returned200; storage101 but contribution export100. Fixed atomic100account bound in src/notebook.js.
- Stored owned hop report absent from contribution export. Fixed separate hopReports array.
- Public notebook export/moderation ignore hop payloads. Parent owns UI integration.

Passing baseline security checks: aliases canonicalize; old/current duplicate rejected; alias place feed works; public feed omits account ids and private visit dates; deletion removes owned hops and both directions of reports while preserving other accounts.

After backend fixes:
- node test/hop-logs.mjs PASS: full atomic quota and interleaved final-slot contenders, full update, hidden/foreign rejection, slot reclaim, 100rows export, reporter export/isolation, original publishing/moderation/deletion checks.
- node test/notebook-races.mjs PASS (expected caught error log).
- node test/notebook-dates.mjs PASS.
- node test/aliases.mjs PASS10coldWorker cases.
- git diff --check PASS.

Only src/notebook.js and test/hop-logs.mjs edited by this auditor.
backend-audit.mjs records baseline defects and intentionally fails once the quota fix exists.

- Postfix node scripts/test-notebook-isolated.mjs PASS67checks, fresh localD1 /var/folders/4h/tw90t1j92mq90w5j_d9fy7rh0000gn/T/plub-api-cgZACd, immutable source /var/folders/4h/tw90t1j92mq90w5j_d9fy7rh0000gn/T/plub-api-source-SL07VD. One preceding attempt failed with known Wrangler restart text mid-request; clean sequential retry passed.
