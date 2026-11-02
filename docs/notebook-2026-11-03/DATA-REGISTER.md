# Data register · PLUB pilot, 3 November2026

| What | Purpose / basis | Stored / readers | Retention / removal |
|---|---|---|---|
| Local visits, drafts, photos | User-directed notebook | Browser IndexedDB / sessionStorage, device user | User removes, Clear device, browser clearing; text drafts expire with tab session |
| Account name, recovery hash | Deliver requested cloud notebook | Cloudflare D1, service/operator | Account life; DELETE /api/account removes live rows |
| Session token hash | Authentication | D1, service |30 days; expired rows purged daily or on new login; logout/account delete removes |
| Selected private visits/photos | Explicit cloud backup service | D1, authenticated owner API; operator/provider processing | Until individual or account deletion;100 visits maximum |
| Research choice/version/date | Separate optional research consent | D1, service/operator | Account life; withdrawal immediately excludes account from research query |
| Place visit counts | Optional research, no note/photo/date query | Computed from consenting accounts, public only at5+ accounts | Live recomputed; no stored aggregate history |
| Public recommendations/photos | Explicit user publication | D1, public recent5 per place, owner moderation | Author/cloud/account removal or moderator deletion |
| Report reason / account | Community abuse handling | D1, moderator | Post/reporter account deletion |
| Salted IP hash / rate bucket | Security and abuse control | D1, service/operator | Buckets older than24 hours pruned on writes and daily cron (idle retention about48 hours) |
| Legacy anonymous work ratings | Requested public crowd scores | Existing ratings table, aggregates public | Existing pilot retention; not joined to notebook accounts |

Hosting: existing Cloudflare Worker+D1 (global service; no Thai-only storage claim). Recovery backups may retain deleted data up to30 days per provider policy. Verify region/contract before a wider release; do not claim end-to-end encryption. No server GPS trail is implemented.
