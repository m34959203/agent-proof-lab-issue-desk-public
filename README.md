# Issue Desk

Review a small local support inbox using prior resolved cases. Inspect the original case and resolution, then record your own decision. No ticket is closed, merged or replied to.

## Run

Requires Node.js 22 or later. No package install or build step.

```sh
node server.mjs
```

Open http://127.0.0.1:4317 (use this exact address, not localhost). Run one server per state directory. `npm test` runs the native test suite without model access. No hosted service or account isolation is provided.

The first run creates `.state/state.json` with clearly fictional tickets. State persists across restarts. `PORT` and `ISSUE_DESK_STATE_DIR` optionally change port and storage location. Keep state private. For a clean run, use a new state directory. A corrupt state fails startup and is not overwritten; stop the app and restore a known valid copy of state.json. Back up that file with the server stopped. Export review JSON is a portable report of the current dataset/history; the import UI accepts ticket bundles only and clears prior reviews after confirmation, not a restore of exported review history.

## Repeat the example

Select T-101 → Find word matches → inspect R-201's original issue and recorded resolution → Use this case in my review → write what you checked → Save review decision. Reload to see the saved history. A link is a review decision, not proof of a shared cause. The word ranking may suggest a superficially related issue.

To use your own data, create JSON with `schemaVersion: 1` and `tickets`: each has a unique `id`, `title`, `body`, `status` (`open` or `resolved`) and `resolution` (empty for open, nonempty for resolved). Max 200 tickets/1 MiB; detailed limits in BRIEF.md. Use only data you have permission to process. This local pilot has no attachments, automatic sync or outbound messaging.

## Optional local AI

Existing Ollama at http://127.0.0.1:11434 with bge-m3:latest digest `7907646426070047a77226ac3e684fbbe8410524f7b4a74d02837e43f2146bab` enables Find with local AI. The app checks the digest and sends ticket text locally for embeddings, CPU requested. It never downloads a model. Having Node or this source does not mean the optional model is installed. No API key is required. If unavailable, use word matches and manual review. Similarity is not probability or a duplicate verdict. No model accuracy claim is made.

## Scope and evidence

Author tests are not independent acceptance. This is a single-operator local prototype, not a production-ready helpdesk. Corrected source f0059b07b5571162ec4b4441cac2636b8e98e096 received independent technical delta acceptance (9 native and 10 browser checks), plus a separate clean viewer functional PASS. Those reviews do not approve this successor package or a final film. English synthetic software issues; no actual customer information. Model outputs may vary; no guaranteed reproduction of scores. See METHODOLOGY.md, ACCEPTANCE.md, CHANGELOG.md and PROMPTS.md.

## Companion version 2 — 2026-09-30

Application bytes and lockfile are unchanged from the accepted corrected commit.
This successor adds the actual correction prompt/history, an included fictional
import sample, a viewer recipe and optional browser verification. Start with
[VIEWER-RECIPE.md](VIEWER-RECIPE.md). See [CORRECTION-WORKFLOW.md](CORRECTION-WORKFLOW.md)
for the historical recording commands and repeatable checks. The original build
was not recorded; source explanations are post-build. No public destination or
final film approval is claimed. See TOOLS-AND-COSTS.md and source-integrity.json.
