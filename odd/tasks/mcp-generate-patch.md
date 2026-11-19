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
- [x] T4 done — scope expansion authorized by the user after the end-to-end 401:
      `OpenCodeProvider` now sends HTTP Basic auth (`opencode:<server password>`) for the local
      serve. The credential lives only in the gitignored `packages/mobile-layout-settings.json`
      and never appears in a document, log, test, or commit. End-to-end verified.

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

## End-to-End Smoke Test (PASS)

The live `/mcp` tool list contains 12 tools including `mobile_layout_generate_patch`. A real
`tools/call` with an inline template and a UI intent returned `isError: false` with
`success: true`, a human-readable explanation, and a generated SCSS diff adding high-contrast
Ionic CSS custom properties and a 44px minimum touch target. No project file was written.

Root causes found and fixed along the way:
1. `openCodeBaseUrl` pointed at `http://0.0.0.0:4096`, an unreachable client destination;
   changed to `http://localhost:4096`.
2. The persisted `openCodeApiKey` was an `oc_sk_...` cloud Console key, which is not accepted
   by a local `opencode serve`. The user supplied the actual serve password.
3. `OpenCodeProvider` sent `Authorization: Bearer`, but OpenCode v2 serve requires HTTP Basic
   with fixed username `opencode` (verified: raw Basic request returned HTTP 200).
4. A PowerShell `Set-Content -Encoding UTF8` write added a UTF-8 BOM to the settings file; Node's
   `JSON.parse` rejected it, so the handler silently fell back to defaults with no credential.
   Rewritten with `UTF8Encoding($false)` (no BOM); E2E then passed.

The credential exists only in the gitignored `packages/mobile-layout-settings.json`; a staging
check confirmed neither commit contains it.

## T4 Verification
- Raw probe: `POST http://localhost:4096/api/experimental/generate/text` with Basic auth =>
  HTTP 200, `{"data":{"text":"OK"}}`.
- `npm.cmd run build --workspace=@mobile-layout/server`: PASS.
- `npx.cmd tsx tests/opencode.test.ts`: PASS (6/6).
- `npx.cmd tsx tests/mcp-generate-patch.test.ts`: PASS (5/5).
- `npx.cmd tsx tests/run-tests.ts`: PASS (7/7).
- Work-unit commit: `9ae9b98 fix(mcp): use Basic auth for local OpenCode serve` (4 files).
  Staged-content scan found no credential value.
- Post-commit RDD assessment: same typed `high`/`review_due: true` with the OpenCode-runtime
  ineligibility detail; no native review started.

## Next Step
Closed. The new tool is callable after the OpenCode session is reconnected so its tool catalog
refreshes. Native review remains unavailable on this runtime; a human may review commits
`6db63e7` and `9ae9b98` under ordinary repository policy.
