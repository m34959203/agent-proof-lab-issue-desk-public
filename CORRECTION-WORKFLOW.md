# Recorded correction and viewer verification

The included app is already corrected. This document explains the actual take
and supplies equivalent verification without requiring private recording files.
It does not instruct you to rerun an AI edit against the finished source.

## What the recording actually ran

`issue-fix` was a private one-use shell wrapper. It passed the complete contents
of CORRECTION-PROMPT.txt to the existing authenticated Codex CLI on standard input.
The recorder started capture first. It did not use a paid API or change credentials.
The actual CLI configuration is transcribed below with three private locations
replaced by descriptive placeholders. This is historical evidence, not a runnable
viewer setup or a recommendation to copy production sandbox settings:

```text
<existing-codex-cli> exec --ignore-user-config --ephemeral
  --sandbox workspace-write --color always
  -c approval_policy="never" -c forced_login_method="chatgpt"
  -c features.multi_agent=false -c hide_agent_reasoning=true
  -c show_raw_agent_reasoning=false
  -c sandbox_workspace_write.network_access=false
  -c sqlite_home="<private-cli-state>" -c log_dir="<private-logs>"
  - < <submitted-prompt-file>
```

The actual command inputs and relative times are in recorded-commands.json.
The full prompt retains its original recording variable names:

| Binding | Meaning during the real take | Included viewer alternative |
| --- | --- | --- |
| issue-fix | private wrapper submitting the real prompt to Codex | read CORRECTION-PROMPT.txt and the source explanation; no wrapper needed |
| ISSUE_DESK_REGRESSION | frozen external two-mode HTTP/browser regression | tools/browser-regression.mjs, portable successor with identical assertions |
| ISSUE_DESK_CHECKS | isolated private results directory | your own fresh local results directory |
| ISSUE_DESK_COMPAT | private compatibility script for adverse cases | native tests and manual viewer checks; not the external compatibility suite |
| ISSUE_DESK_PROMPT | full submitted correction request | CORRECTION-PROMPT.txt |
| ISSUE_DESK_EXCERPT | pre-fix import handler shown for context | history described in PROMPTS.md; not presented as current code |

The private compatibility harness and recording wrapper are not included. Their
historical passing results are documented evidence, not a claim that this package
ships every production check. The native tests plus optional browser harness
reproduce the central two delayed-response assertions directly.

## Why this change fixes the observed bug

Both Replace queue and Load demo use `/api/import`. The server commits revision 1
before its response reaches the browser. In the counterexample, the UI reloads
revision 1 and saves a note at revision 2 before that old response is released.
Previously it then rendered revision 1 and empty history. The server still had
the note. The corrected handlers check `s.revision < state.revision` and return
before replacing the newer state. See public/app.js and the two native cases
in test/import-response.test.mjs. This is a narrow response-ordering fix; it does
not promise arbitrary network-fault recovery or duplicate accuracy.

## Native verification — no dependencies

From the companion root, run `node --test`. For an optional focused rerun use
`node --test test/import-response.test.mjs`. This is not additional independent
coverage. These tests use real UI code and store with controlled DOM/fetch
fixtures. They are not mislabeled as browser checks.

## Optional real-browser verification — existing tools only

The core app does not need Playwright or Chromium. This optional harness needs
an already installed compatible Playwright module and Chromium binary.
Production used Playwright 1.61.1 and an installed Chromium headless shell. This
package does not download or install either. If absent, skip this route and use
native tests and the manual journey; do not claim browser PASS.

Set PLAYWRIGHT_MODULE to the absolute path of the existing Playwright index.mjs
and BROWSER_EXECUTABLE to the existing Chromium executable in your environment.
Then run from the companion root in Bash or PowerShell:

```sh
node tools/browser-regression.mjs . ./viewer-browser-results
```

Use a new results directory on subsequent runs. The harness launches its own
loopback app on an available port with isolated fictional state. It intercepts
the import response after the real HTTP commit; this is deliberate latency.
It exercises both entry points, saves revision 2, releases revision 1 and checks
latest UI revision, visible note, server revision, server note and browser errors.
Exit 0 means both cases passed; 1 means an assertion failed; 2 means a harness
error. Inspect results.json as well as the exit. Screenshots and local state stay
in your output directory; no uploads or model requests occur. Owned browsers
and servers are closed on completion. Keep local results private if adapting
the sample to your own data.

The portability changes replace private dependency paths with explicit variables
and omit video capture. Assertions are retained from the recorded evaluator.
This successor is not presented as the exact original evaluator bytes.
