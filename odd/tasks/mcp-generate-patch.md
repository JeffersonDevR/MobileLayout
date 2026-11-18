# Feature: MCP generate-patch bridge to OpenCode

## Objective
Expose the existing OpenCode generation pipeline as an MCP tool named
`mobile_layout_generate_patch`, so an MCP client (for example an OpenCode session) can send a
natural-language UI intent and receive an HTML/SCSS diff for review. The tool must NOT write to
disk: writing stays with the existing `mobile_layout_apply_source_patch` tool, preserving the
Studio's review-then-apply flow.

## Problem / Why
MobileLayout Studio already generates code through OpenCode V2
(`POST /api/generate-patch` -> `OpenCodeProvider.generateCodeChanges`), but that capability is
only reachable from the Studio web UI. The `/mcp` endpoint exposes 11 inspection/edit/audit
tools and none of them can trigger generation, so an agent connected over MCP cannot ask
MobileLayout to send a prompt to OpenCode.

## Scope
- (T4, authorized by the user after the end-to-end 401) `packages/server/src/llm/opencode.ts` —
  authentication scheme only.
- `packages/server/src/mcp-handler.ts` — add tool definition and handler case (real implementation).
- `packages/mcp/src/index.ts` — add the matching tool definition; forwarding to `/mcp` is generic.
- `tests/mcp-generate-patch.test.ts` — new tests for the tool handler.
- `README.md` — document the new MCP tool in the tool list / workflow.
- No change to `prompt.ts`, `opencode.ts`, `routes.ts`, the Studio UI, or the patcher.

## Constraints / Decisions
- Reuse `OpenCodeProvider` and `PromptBuilder` with the server's existing `state` config
  (`llmProvider`, `openCodeBaseUrl`, `openCodeApiKey`, `openCodeModel`, `projectPath`).
  Do not reimplement the HTTP call or duplicate prompt construction.
- Tool input: `userIntent` (required string), plus optional `htmlFilePath`, `scssFilePath`,
  `matchedSnippet`, `fullHtmlContent`, `fullScssContent`, and `visualChanges`
  (array of `{ type, name, value, previousValue? }`).
- When `fullHtmlContent` / `fullScssContent` are omitted, read them from disk using
  `state.projectPath` + the supplied relative path. Resolve the path and refuse anything that
  escapes the configured project root. Never expose absolute paths or secrets in the response.
- Response shape: `{ explanation, updatedHtmlContent?, updatedScssContent?, error? }` plus a
  textual MCP content payload. On success the diff is returned only; no file is modified.
- Log each call through `llmLogger` with provider/model/duration/status, consistent with
  `/api/generate-patch`.
- Keep the same `LLMResponse` parsing (strict JSON, `{...}` fallback).
- No new npm dependencies. No SDD artifacts. No remote operations. No edits outside MobileLayout.
- The repository has extensive pre-existing uncommitted work on `main`; do not stage, reset,
  checkout, clean, or overwrite any file outside this task's Scope.

## Acceptance Criteria
- [ ] T1 `mobile_layout_generate_patch` is defined and handled on both MCP surfaces; it builds a
      `PromptContext`, calls the configured provider, and returns the diff without writing files.
- [ ] T2 Tests cover success, JSON-fence fallback, provider error, and path-escape refusal.
      README documents the tool. All applicable checks run with actual results recorded.
- [ ] T3 One work-unit commit on a feature branch contains T1+T2 with their tests and docs;
      structural readback and the Delegated Verification Gate are recorded.

## Authorized Scope
Read/write only the files listed in Scope, plus this feature document. No remote operations,
no git initialization, no destructive git commands, no edits to the pre-existing uncommitted
files outside Scope.

## Applicable Checks
- `npm.cmd run build --workspace=@mobile-layout/server` (PowerShell blocks `npm.ps1`).
- `npx.cmd tsx tests/mcp-generate-patch.test.ts`.
- `npx.cmd tsx tests/run-tests.ts` (regression suite).
- Structural readback of every changed file; parent spot-check of one reported command.
- TDD mode: off (no explicit project/session TDD configuration found; ordinary functional
  checks apply).
- RDD is on globally; run the native post-commit assessment and follow its transition.

## Route Declaration
Delegated direct. Triggers: 2+ non-trivial files to write (single writer) and reading that
prepares a write. No SDD.

## Progress
- [x] T1 done — tool defined and handled on both MCP surfaces; reuses provider + prompt builder,
      reads missing content under the project root, returns diff without writing files.
- [x] T2 done — 5 tests added (success, JSON-fence fallback, upstream error, path-escape refusal,
      declaration check), README updated, all checks run.
- [x] T3 done — one work-unit commit on feature branch `feature/mcp-generate-patch`.
- [ ] T4 pending — scope expansion authorized by the user after the end-to-end 401: switch
      `OpenCodeProvider` from Bearer to HTTP Basic auth for the local OpenCode serve. The user
      supplied the local serve password; it is stored only in the gitignored
      `packages/mobile-layout-settings.json` and must never appear in a document, log, or commit.

## Verification Evidence
Recorded 2026-11-18. Commands run from the MobileLayout repository root; `npm.cmd`/`npx.cmd`
used because PowerShell blocks `npm.ps1`/`npx.ps1`.

- `npm.cmd run build --workspace=@mobile-layout/server`: PASS (tsc exit 0, no diagnostics).
- `npx.cmd tsx tests/mcp-generate-patch.test.ts`: PASS (5 tests, 5 pass, 0 fail).
- `npx.cmd tsx tests/run-tests.ts`: PASS (7 tests, 7 pass, 0 fail — no regression).
- Parent spot-check: `npx.cmd tsx tests/mcp-generate-patch.test.ts` re-run independently:
  PASS (5/5, ~66 ms). Structural readback confirmed 12 tool definitions and 12 handler cases
  in the server, 12 definitions in the standalone MCP package, and no disk-write call in the
  new handler case.
- Work-unit commit: `6db63e7 feat(mcp): add generate-patch tool backed by OpenCode`
  (branch `feature/mcp-generate-patch`, based on `b3b226f`). Five files committed: handler,
  MCP definitions, new tests, README, this document. Pre-existing unrelated uncommitted work
  was left untouched; `packages/mcp/{README.md,package.json,tsconfig.json}` remained untracked.
- RDD post-commit assessment (`gentle-ai review assess --cwd . --agent opencode --base-ref
  b3b226f --committed-only --json`): typed result `gentle-ai.review-assessment/v1`,
  `risk: high`, `review_due: true`, `review_due_reason: high_risk`, but detail states the active
  runtime is not eligible for immutable receipt review (supported: claude-code, codex).
  OpenCode V2 review transport is unavailable by contract, so NO native review was started and
  no PASS was synthesized. This is an unavailable verifier, not a clean review.

## End-to-End Smoke Test (blocked by environment credential)

The running Studio had already reloaded the source, so the live `/mcp` tool list now contains
12 tools including `mobile_layout_generate_patch` (verified with `tools/list`). A real
`tools/call` with an inline template and a UI intent reached the provider but returned
`isError: true` with `OpenCode API returned 401: Authentication required`.

Diagnostics (values hidden; only status codes recorded):
- `http://0.0.0.0:4096` is unreachable from this host (`No es posible conectar con el servidor
  remoto`); `http://localhost:4096` responds. The configured base URL should be `localhost`.
- The `openCodeApiKey` persisted in `mobile-layout-settings.json` is rejected by the live
  service as `Bearer` and also as HTTP Basic password (`opencode:<key>`) — both 401.
- The password in `~/.config/opencode/service.json` belongs to the managed service on port
  49198 and is also rejected on 4096 (Basic and Bearer, both 401).
- OpenCode v2.2.5 is running. Official docs state the serve API uses HTTP Basic auth with
  username `opencode` and the server password, while `OpenCodeProvider` currently sends
  `Authorization: Bearer <apiKey>`. Because no valid credential was available, the smoke test
  cannot distinguish a wrong scheme from a stale credential; both need checking once a valid
  password/token is supplied.

This is an environment/credential blocker, not a failing unit test. No source change was made
outside the authorized Scope: fixing `packages/server/src/llm/opencode.ts` auth would require
explicit scope expansion.

## Next Step
Obtain a valid credential for the OpenCode service on port 4096, set `openCodeBaseUrl` to
`http://localhost:4096`, and confirm whether Basic or Bearer is accepted; if Basic is required,
authorize a follow-up fix to `OpenCodeProvider`. Then re-run the end-to-end `tools/call`.
Native review remains unavailable on this runtime; a human may review commit `6db63e7` under
ordinary repository policy.
