# Check results — companion v2, 2026-09-30

Producer verification of this successor package:

- Node.js 22.22.1, `node --test`: 9 passed, 0 failed.
- Included portable `tools/browser-regression.mjs`: both import and demo passed
  with existing Playwright 1.61.1 / Chromium on Linux. Each checked latest UI
  revision 2, visible saved note, server revision 2, server note and no browser
  errors. Isolated local state; no model, downloads or external service used.
- Runtime, native tests, package metadata and lockfile match accepted commit
  f0059b07b5571162ec4b4441cac2636b8e98e096 byte for byte.
- Full submitted correction prompt matches its original SHA in PROMPTS.md.

These are author checks of this package, not an independent package PASS.
The already completed independent technical delta (9 native / 10 browser checks)
and separate clean viewer functional PASS apply to that accepted source within
their scopes. They are not claims that this portable harness runs ten browser
scenarios, or that a finished film, Shorts or this new companion is approved.

Original unrecorded implementation, real failed test attempts, optional-model
limits and the exact correction chronology are disclosed in PROMPTS.md. No
native Windows test, human listening or continuous full-film viewing is claimed.
