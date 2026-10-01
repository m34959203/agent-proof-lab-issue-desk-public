# Run and verify Issue Desk

This recipe is newly authored for corrected source
`f0059b07b5571162ec4b4441cac2636b8e98e096`. It is not an original submitted prompt.
The old `09dec806` baseline exhibited the stale-response defect; the included
runtime contains the accepted correction. An independent reviewer already ran
the clean functional journey on that source. This successor package needs its
own review; these instructions do not constitute a new independent PASS.

## Start without a model

Unpack the companion and open a terminal in its root. Use existing Node.js 22+
(`node --version`). No install or build is required. Run `node --test`, then
`node server.mjs`. Open http://127.0.0.1:4317 (not localhost). Keep one server
per state directory. The default `.state` folder is created on first startup.

For a fresh isolated state, in Bash use:

```sh
ISSUE_DESK_STATE_DIR="$PWD/.viewer-state" node server.mjs
```

In Windows Terminal with PowerShell use:

```powershell
$env:ISSUE_DESK_STATE_DIR = Join-Path (Get-Location) '.viewer-state'
node server.mjs
```

PowerShell commands are a documented viewer alternative; this production was
recorded on Linux/Bash and did not test native Windows capture.

## Make a deliberate decision

1. Select T-101, choose Find word matches, inspect R-201's original body and
   resolution. Compare R-202's superficially similar row-duplication case.
2. Choose Use this case in my review. Write what evidence you inspected and
   Save review decision. A similar ticket is not proof of the same cause.
3. Use Reload queue, then refresh the browser. Check that the note survives.
   Stop the server with Ctrl+C and restart with the same command/state folder.
   Reopen the app and check the same note and revision.
4. Export review JSON before and after restarting. Compare the complete JSON
   locally. It is a report, not a review-history import/restore format. For a
   backup, stop the server and copy its state.json file privately.
5. Export anything you need, then select the included example-bundle.json and
   confirm Replace queue. This deliberately clears old reviews. The imported
   label changes to Imported local data. Link VIEW-PRIOR from VIEW-OPEN and save
   a note. The sample is fictional; limits are 200 tickets and 1 MiB.
6. Try importing a local JSON file containing `{"schemaVersion":1,"tickets":[]}`.
   It must reject without changing the saved valid queue or revision. Do not
   submit real customer information to this lesson.

## Reproduce the stale-response verification

`node --test test/import-response.test.mjs` runs the included two native cases.
Each uses the actual UI source in a small simulated DOM plus the real disk store.
It delays response delivery after an import commits, reloads, saves at revision 2,
then releases revision 1. Both import and demo paths must keep the note and UI
revision 2. This is controlled simulation, not a real-browser run. For actual
HTTP/Chromium verification with existing optional equipment, follow
CORRECTION-WORKFLOW.md. Do not deliberately change your working app to reproduce
an old bug; the recorded baseline failures are historical evidence.

## Optional local embeddings

The useful manual/word path requires no model. If you already run Ollama at
http://127.0.0.1:11434 with bge-m3:latest and the exact README digest, you may try
Find with local AI. Use `ollama list` to inspect your existing installation.
Set OLLAMA_URL explicitly when using it; the default address is the one above.
No install, model pull or paid fallback is part of this recipe. A missing or
mismatched model produces an unavailable message; continue with word matches.
No accuracy, identical score or duplicate-certainty claim follows from a result.

The independent failure/fallback check used an isolated injected HTTP 503 stub;
it did not shut down shared Ollama or observe a spontaneous outage. That private
harness is not included. Do not disrupt services to recreate the demonstration.
