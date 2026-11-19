# Feature: Structural canvas edits + direct-apply generation

## Header

Objective: close the fidelity gap ("ui changes are still far from i want them") by (a) staging
structural canvas edits (reorder/duplicate/remove) as typed changes rendered as explicit LLM
instructions, and (b) adding a direct-apply generation mode with sandboxed writes, keeping the
existing review-then-apply path available.
Branch: `feature/structural-edits-direct-apply` (from `main` @ `01ac051`).
Delivery strategy: ask-on-risk (default); forecast ~700-900 authored changed lines across ~6 tasks.
Test runner: standalone `npx.cmd tsx tests/<file>.test.ts` (node:test + node:assert) plus
`npx.cmd tsx tests/run-tests.ts` as the regression suite. PowerShell blocks npm.ps1/npx.ps1:
always use the `.cmd` variants.

## Specs

S1 — Structural visual edits. User-endorsed option text (verbatim): "Expand what you can modify
on the canvas before sending anything: drag-reorder, duplicate/delete elements, more
component-level controls."
  Scope: reorder already exists on canvas (drag `inspector.ts:335-392`, move buttons
  `inspector.ts:1600-1632`, delete `inspector.ts:304-316,1576-1598`) but is staged as a lossy
  prose `style` change (`App.tsx:216-224`) and rendered as `"prev" -> "value"` (`prompt.ts:69-71`);
  `duplicate` does not exist anywhere; `remove` is staged with a selector but rendered
  generically.
  Acceptance: new `reorder`/`duplicate` types in all four `UIChangeItem` copies (studio
  `types.ts`, server `prompt.ts`, `mcp-handler.ts` schema, `packages/mcp` stdio copy); bridge
  gains a duplicate op and posts structural payloads with `selectorPath` + `relativeTo`;
  `buildUserPrompt` and `buildClipboardPrompt` render reorder/duplicate/remove as explicit
  imperative instructions; revert handling covers the new types; existing suites stay green; new
  standalone tests cover rendering and the schema enum.
S2 — Direct-apply mode. User-endorsed option text (verbatim): "A more agent-like mode where the
LLM applies your requested changes with less manual diff review. Note: you previously chose
review-then-apply over agent-edits-files."
  Scope: additive "generate & apply directly" flow that writes the generated content without
  opening the Monaco review; the existing DiffModal review path remains the default; an undo
  affordance restores from backup.
S3 — Write-safety precondition for S2 (engineering constraint, not a new feature):
  `/api/apply-patch` (`routes.ts:428-465`) and MCP `apply_source_patch` (`mcp-handler.ts:516-541`)
  pass client-supplied paths to `FilePatcher` unvalidated; only MCP reads are sandboxed
  (`resolveWithinProject`, `mcp-handler.ts:41-48`); the backup is a single `.mobile-layout.bak`
  overwritten each apply (`patcher.ts:70-71`). `FilePatcher` must resolve paths and refuse
  anything outside the configured project root, and keep a per-file backup. High-risk item 2
  (security: guards on writes reachable from client input).
S4 — Fidelity rationale (user, verbatim): "the ui changes are still far from i want them or far
from the goal that i send to the llm". The LLM prompt must identify structural targets
unambiguously (selector/selectorPath + relativeTo) and the system prompt must instruct exact
structural execution while preserving Angular bindings (existing guideline 1 keeps its
"unless requested" carve-out).

## Tasks

T1 | S1,S4 | inline | structural change contract + prompt rendering: all four UIChangeItem copies,
     `buildUserPrompt`/`buildClipboardPrompt`/system prompt, MCP schemas,
     `tests/structural-changes.test.ts` | done — RED (5 fail/1 pass) -> GREEN (6/6); commit: this slice
T2 | S1 | delegated writer A (parallel) | bridge duplicate op + selectorPath/relativeTo in
     structural payloads (`packages/bridge/src/inspector.ts`) | commit: pending
T3 | S1 | delegated writer B (parallel) | studio staging typed structural changes + duplicate
     message handler + revert + dock/drawer labels (`App.tsx`, `components/*`) | commit: pending
T4 | S3 | delegated writer C (parallel) | patcher path sandbox + per-file backup
     (`patcher.ts`, `tests/patcher-safety.test.ts`) | commit: pending — Risk: item 2
T5 | S2 | inline after T3+T4 | direct-apply generate→apply chain + undo toast (`App.tsx`,
     `ReactiveChangesDock.tsx`, `StagingDrawer.tsx`) | commit: pending
T6 | S1,S2 | inline | README/docs + full-suite seam check + close | commit: pending

Route declaration: T1 inline (one understood change across contract copies; no writer reason).
T2/T3/T4 parallel writers (three independent units with disjoint edit surfaces launched together
in one turn; bridge vs studio vs server-patcher files are disjoint; the shared UIChangeItem
contract is frozen by T1 first; `tests/run-tests.ts` stays parent-owned — writers create
standalone test files only). T5 inline (depends on T3's `App.tsx` and T4's patcher; no writer
reason). T6 inline (docs + seam).

## Applicable Checks

- Per unit: `npm.cmd run build --workspace=@mobile-layout/<pkg>` (server, studio, bridge as
  touched) plus its standalone `npx.cmd tsx tests/<file>.test.ts`.
- Regression: `npx.cmd tsx tests/run-tests.ts` (7 tests), `npx.cmd tsx tests/opencode.test.ts`
  (6), `npx.cmd tsx tests/mcp-generate-patch.test.ts` (5).
- Structural readback of every changed file; parent spot-checks one reported command per unit.
- Environment note (2026-11-19): repo runs on a new machine; `node_modules` was absent and
  `npx tsx tests/run-tests.ts` failed with `Cannot find module 'fast-glob'` before any change.
  Baseline restored with `npm.cmd ci`; pre-change suite results are recorded after that.
- Test-first: observe RED for the new rendering/schema rules, then implement GREEN. The
  existing `run-tests.ts` suite proves no regression in untouched behavior.
- RDD: on (global). After each work-unit commit run
  `gentle-ai review assess --cwd . --agent opencode --base-ref <last reviewed boundary> --committed-only --json`
  and follow its transition. Initial reviewed boundary: `01ac051` (branch point).

## Log

L1 (2026-11-19, user, verbatim): "i want to do some improvements to this app, the main goal is to
being able to modify the target app and being able to send the changes to an model or llm and
the llm do the specific changes that i require."
L2 (2026-11-19, user, verbatim): "a mix between 3 and 4, due that in the current app, the ui
changes are still far from i want them or far from the goal that i send to the llm" — where
option 3 = "A more agent-like mode where the LLM applies your requested changes with less manual
diff review. Note: you previously chose review-then-apply over agent-edits-files." and
option 4 = "Expand what you can modify on the canvas before sending anything: drag-reorder,
duplicate/delete elements, more component-level controls."
L3 (2026-11-19, explorer map, read-only): structural canvas ops partially exist (drag
`inspector.ts:335-392`, move `inspector.ts:1600-1632`, delete `inspector.ts:304-316,1576-1598`)
but reorder is staged as `style` with a prose value (`App.tsx:216-224`), no duplicate op exists
anywhere, the prompt renders all changes as `"prev" -> "value"` (`prompt.ts:69-71`),
`UIChangeItem` has 4 drifting copies (`studio types.ts:112-120`, `prompt.ts:1-6`,
`mcp-handler.ts:361-374`, `packages/mcp/src/index.ts`), `FilePatcher` writes are unsandboxed
(`patcher.ts:24-100`) while MCP reads are sandboxed (`mcp-handler.ts:41-48`), the backup is a
single overwritten `.mobile-layout.bak` (`patcher.ts:70-71`), and scanner matching is
property-score based (`scanner.ts:82-171`) so structural targeting relies on selector strings.
Parent spot-check confirmed `App.tsx:216-224` and `prompt.ts:69-71` as described.
L4 (2026-11-19, environment): fresh machine checkout — `node_modules` absent; `npm.cmd ci`
started at the repo root to restore the lockfile environment before any change; pre-change suite
results to be recorded after install completes.
L5 (2026-11-19, T1 evidence, inline): `npm.cmd ci` REFUSED — `@mobile-layout/mcp@1.0.0` missing
from the committed lockfile (pre-existing sync defect; the mcp workspace predates the lockfile).
Environment restored with `npm.cmd install` (289 packages; lockfile diff = 16-line mcp workspace
entry only, committed as its own chore). Pre-change baseline: run-tests.ts 7/7, opencode.test.ts
6/6, mcp-generate-patch.test.ts 5/5. RED observed on tests/structural-changes.test.ts before
implementation: 5 fail / 1 pass (only the generic-format regression guard passed). Implemented
the shared contract: UIChangeItem gains 'reorder'/'duplicate' types plus optional
selector/selectorPath/relativeTo/direction in studio types.ts and server prompt.ts;
PromptBuilder.formatChangeLine/structuralInstruction render reorder as "move this exact element
BEFORE/AFTER its sibling <relativeTo>", duplicate as "insert an exact copy...", remove as "delete
this exact element..." in both buildUserPrompt and buildClipboardPrompt; system prompt gains
structural guideline 4 (output guideline renumbered to 5); MCP generate_patch visualChanges
schema extended on both surfaces (mcp-handler.ts, packages/mcp/src/index.ts). GREEN:
structural-changes.test.ts 6/6. Regression: run-tests.ts 7/7 (same as baseline). Builds PASS:
server (tsc), mcp (tsc), studio (tsc && vite build, 1612 modules). Structural readback of
prompt.ts confirmed. Risk: item 3 — shared UIChangeItem contract consumed by four surfaces; the
change is additive (new types/fields, no removal), and all four copies were updated in lockstep
with tests pinning rendering + schema.
