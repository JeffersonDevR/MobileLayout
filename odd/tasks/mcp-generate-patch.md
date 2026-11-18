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
- T1 pending
- T2 pending
- T3 pending

## Verification Evidence
(pending)

## Next Step
Implement T1+T2 in one bounded writer, verify, commit as one work-unit, then close T3.
