# Changelog

## Companion v2 / accepted correction — 2026-09-30

Corrected application commit f0059b07b5571162ec4b4441cac2636b8e98e096:
Replace queue and Load demo reject a response older than the current UI revision.
Two regression cases preserve revision 2 and the saved note when a revision 1
response arrives late. The durable server record was already safe before the fix.
The genuine recorded correction includes unsuccessful test attempts before the
passing checks. This package changes documentation and adds optional verification;
its runtime, lockfile and native tests match that accepted commit byte for byte.
Independent product and clean viewer checks passed within their stated scopes;
this new companion and final media still require review.


## 0.1.0 — 2026-09-30

First independently authored Issue Desk implementation: own demo data, bounded imports, lexical/optional local semantic retrieval, manual review history, revision conflicts, persistence, export and accessible browser interface.

Initial HTTP Host test failed because fetch did not send the test's overridden Host. Corrected the test to send a real HTTP Host header through node:http; the server then rejected it as intended. This was a test harness correction, not a product vulnerability fix. Preserve initial failed log in private production evidence. No independent acceptance or media approval claimed.

First real browser capture exposed a 390px horizontal overflow: the resolved-case select imposed its longest option's intrinsic width on the grid. Constrained form grid labels/controls to shrink. Failed capture and element geometry retained; repeat capture required on the changed source.

Producer inspection found the static demo badge would mislabel imported data. Badge now derives from exact dataset equality with the synthetic fixture; imported different content is labeled Imported local data. No arbitrary import-provided provenance is trusted.
