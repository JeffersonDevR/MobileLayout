# Feature: OpenCode API Integration (API + diff review)

## Objective
Replace the current OpenAI-compatible `OpenCodeProvider` with a real integration to the
OpenCode V2 HTTP service, using the stateless text-generation endpoint. MobileLayout keeps
its existing flow: prompt -> JSON diff -> Monaco review -> Apply -> HMR. OpenCode only
generates text; it must NOT edit project files itself.

## Problem / Why
The current "OpenCode / Local LLM" option is a generic OpenAI-compatible client
(`openai` SDK -> `{baseURL}/chat/completions`). OpenCode V2 does not expose that endpoint;
its API is a native REST API. Selecting "OpenCode" today cannot talk to a real OpenCode
service. The user chose the "API + diff review" behavior over the agent-edits-files and
embedded-SDK alternatives.

## Scope
- `packages/server/src/llm/opencode.ts` — replace SDK client with HTTP client to OpenCode.
- `packages/server/src/routes.ts` — wire config (server URL, auth, model ref) into the provider.
- `packages/studio/src/components/SettingsModal.tsx` — clarify labels/defaults for OpenCode service.
- `packages/server/package.json` / tests — only if needed for the new client and checks.
- `README.md` — document the new configuration.
- No change to `LLMResponse`, Monaco diff UI, patcher, or HMR behavior.

## Constraints / Decisions
- Endpoint: `POST {baseURL}/api/experimental/generate/text`.
  Body: `{ "prompt": string, "model"?: { "providerID": string, "id": string, "variant"?: string } }`.
  Response: `{ "data": { "text": string } }` (source: OpenCode V2 OpenAPI, 2026-11-17).
- The endpoint is stateless: combine the existing system + user prompts into one `prompt` string.
- `model` may be omitted so OpenCode uses its configured default model. If the user supplies
  `providerID/id`, split on the first `/` and send a Model.Ref.
- `baseURL` now means the OpenCode service root (default `http://localhost:4096`), NOT an
  OpenAI-compatible `/v1` root. Do not append `/v1`.
- `openCodeApiKey`, if present, becomes `Authorization: Bearer <key>`; otherwise no auth header.
- Keep API keys out of `GET /api/status` responses (existing behavior).
- Provider value stays `'opencode'`. No SDD artifacts, no new dependencies unless unavoidable.
- Repository is NOT a git worktree (verified from environment), so work-unit commits are not
  possible. Report this limitation; do not initialize or mutate git.

## Acceptance Criteria
- [x] T1 OpenCodeProvider calls `/api/experimental/generate/text` and parses `data.text`
      into the same `LLMResponse` shape as before (JSON block fallback preserved).
      Errors return `{ success: false, error }` with the upstream message.
- [x] T2 routes.ts builds the config from saved state; model ref parsed as `providerID/id`
      when present; API key sent as Bearer token; no key echoed to browser.
- [x] T3 SettingsModal uses OpenCode-service wording, default `http://localhost:4096`,
      and explains the `providerID/model` format.
- [x] T4 Tests cover success, JSON-fence fallback, empty text, and HTTP error. All applicable
      checks run and actual results recorded.
- [x] T5 README documents how to run OpenCode service and fill the settings.

## Authorized Scope
Read/write only the files listed in Scope. No remote operations, no git initialization,
no edits outside MobileLayout.

## Applicable Checks
- Typecheck/build of the server package (exact command from its package.json).
- Existing test suite (exact command from root/server package.json).
- Structural readback of every changed file.
- TDD mode: off (no explicit project/session TDD configuration found; ordinary functional
  checks apply).

## Route Declaration
Delegated direct. Triggers: 4+ files needed for understanding (mapping), 2+ non-trivial
files to write (single writer), and reading that prepares a write. No SDD.

## Progress
- T1 done
- T2 done
- T3 done
- T4 done
- T5 done

## Verification Evidence
Recorded 2026-11-17 by the implementing writer (all commands run in the foreground from the
repository root). Note: PowerShell execution policy blocks `npm.ps1`/`npx.ps1`; `npm.cmd` and
`npx.cmd` were used instead (equivalent commands).

- `npm.cmd run build --workspace=@mobile-layout/server`: PASS (exit 0, `tsc`, no output/errors).
- `npm.cmd run build --workspace=@mobile-layout/studio`: PASS (exit 0, `tsc && vite build`;
  "✓ 1607 modules transformed", "✓ built in 5.90s").
- `npx.cmd tsx tests/opencode.test.ts`: PASS (6 tests, 6 pass, 0 fail).
- `npx.cmd tsx tests/run-tests.ts`: PASS (7 tests, 7 pass, 0 fail — no regression).
- Structural readback: re-opened all 6 changed files (`opencode.ts`, `routes.ts`,
  `SettingsModal.tsx`, `tests/opencode.test.ts`, `README.md`, this feature doc) and confirmed
  contents match intent.
- Parent spot-check 2026-11-17: `npx.cmd tsx tests/opencode.test.ts` re-run independently:
  PASS (6 tests, 6 pass, 0 fail, ~65 ms). Parent also re-read `opencode.ts` and this document
  and grepped the changed files for the service URL, endpoint path, Bearer header and model-ref
  format; all claims resolved.
- No new npm dependencies added; `openai` remains declared in server package.json but is no
  longer imported by the provider (left in place to preserve unrelated state).

## Next Step
Closed. All five tasks done with observed checks. No live end-to-end run against a real
OpenCode service was performed (tests mock `fetch`); that remains the only unverified item.

## Final-State Note
This document is the single source of truth for task state; update it after each task with
observed outcomes and check results. Checkboxes are not receipts.
