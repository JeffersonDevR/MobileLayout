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
     structural payloads (`packages/bridge/src/inspector.ts`) | done — build PASS (parent
     spot-check re-run), +100/-20 in one file; commit: this slice
T3 | S1 | delegated writer B (parallel) | studio staging typed structural changes + duplicate
     message handler + revert + dock/drawer labels (`App.tsx`, `components/*`) | done — build
     PASS (1612 modules, baseline parity), zero reconciliation changes needed; commit: this slice
T4 | S3 | delegated writer C (parallel) | patcher path sandbox + per-file backup
     (`patcher.ts`, `tests/patcher-safety.test.ts`) | done — RED (3 refusal failures) -> GREEN
     (5/5), suites 7/7 + 6/6 + 5/5, parent spot-check re-run PASS; commit: this slice — Risk:
     item 2 (security)
T5 | S2 | inline after T3+T4 | direct-apply generate→apply chain + undo toast + structural
     prompt-field bounds/sanitization (risk-lens advisory) + Revert-All preview cleanup
     (`App.tsx`, `ReactiveChangesDock.tsx`, `StagingDrawer.tsx`, `prompt.ts`) | commit: pending
T6 | S1,S2 | inline | README/docs + full-suite seam check + close | commit: pending
T7 | follow-up | inline | review-advisory test hardening: pin the stdio MCP schema copy,
     system-prompt structural guideline + renumbered output guideline, reorder fallback
     behavior, and clipboard duplicate/remove branches; correct the L5 pinning overstatement;
     record post-change opencode/mcp suite results in the log | commit: pending

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
L6 (2026-11-19, T1 RDD review evidence): assess over the slice (base-ref 01ac051, committed-only,
untracked excluded): risk high (reason process_boundary on packages/mcp/src/index.ts), 7 paths /
330 lines, review_due true. Preflight STATUS -> START (lineage review-c0f5770559673fc9, lenses
review-risk + review-reliability, correction budget 165). The user GRANTED the consent envelope
(relayed losslessly; choice "Review this change"). Two reviewer Task relays were refused by the
OpenCode review transport (`opencode_review_transport_relay_refused (reason: provider_failed)`);
the bound STATUS reoffered the slots, one relaunch was refused identically, and both slots were
then declared unachievable via `review capture-unachievable` (reason relay_provider_failed). The
lifecycle stopped terminally with `unachievable_lens_slot`. NO review PASS was synthesized; the
review record is unavailable-on-this-runtime, consistent with the prior feature's recorded
OpenCode transport ineligibility (odd/tasks/mcp-generate-patch.md). T1 verification therefore
stands on its own observed checks (L5). Delivery remains human-owned under ordinary repository
policy. Human options left open (not decided by the agent): leave RDD on (assessments for future
high-risk commits will stop at the same transport wall), disable clone-locally
(`gentle-ai review mode disable --scope clone`), or run review sessions from a runtime with
supported review transport (claude-code/codex).
L7 (2026-11-19, T2 evidence, delegated writer A): bridge duplicate op implemented in
packages/bridge/src/inspector.ts only (+100/-20): ⧉ toolbar button clones the selected element
(all attributes + children), inserts after the original, preview-marked byte-identically to
palette-insert sites (data-mobile-layout-preview, data-preview-id, dashed outline, preview
title), registered in insertedPreviews, posts MOBILE_LAYOUT_ELEMENT_DUPLICATED {tagName,
selector?, selectorPath?, previewId?} then ELEMENT_SELECTED for the clone. Both REORDERED sites
(drag + move buttons) enriched with selector/selectorPath/relativeToSelector; delete-button
REMOVED payload enriched with selectorPath. Shared helpers extracted (buildHierarchy /
buildSelectorPath / buildElementSelector) and reused by extractElementDetails + runScreenAudit.
TDD exception: no DOM harness exists for the bridge; structural readback + build are the
functional checks. Writer verification: npm.cmd run build --workspace=@mobile-layout/bridge PASS
(39.6kb, 10ms). Parent spot-check: same build re-run PASS. Reconciliations: (1) undo channel is
the EXISTING MOBILE_LAYOUT_REMOVE_INSERTED {previewId} (bridge :1772, Studio App.tsx:487/:525) —
the frozen fallback name is dead; writer B was corrected mid-run. (2) drag-reorder direction
normalized to the frozen 'up'|'down' domain (drop-after -> 'down', drop-before -> 'up'); the old
'after'/'before' would have rendered inverted instructions in the server prompt — latent bug
fixed at the source. (3) relativeToSelector is message-only; T3 maps relativeToSelector ||
relativeTo into UIChangeItem.relativeTo. Risk: item 3 — the shared-helper extraction touches
code paths existing behavior also uses (ELEMENT_SELECTED extraction, screen audit); verified
behavior-preserving by writer readback (identical selectorPath join; getSelector delegation
preserves all call-site outputs) and the parent build spot-check.
L8 (2026-11-19, T3 evidence, delegated writer B): studio side implemented in App.tsx,
ReactiveChangesDock.tsx, StagingDrawer.tsx: reorder retyped `style` -> `reorder` with the
structured payload (selector, selectorPath, relativeToSelector||relativeTo, direction —
App.tsx:218-226); new MOBILE_LAYOUT_ELEMENT_DUPLICATED case (App.tsx:232-239); remove staging
enriched with selectorPath (App.tsx:210); revert: duplicate removes the canvas clone via the
EXISTING MOBILE_LAYOUT_REMOVE_INSERTED channel (App.tsx:527, insert precedent :505) and reorder
is unstage-only BY DESIGN (bridge moveElement echoes a fresh REORDERED per move, so an inverse
move would restage the change it removed — documented in an App.tsx comment; the toast honestly
says the canvas keeps its preview position); dock/drawer render reorder/duplicate with icon chips.
Reconciliation update required ZERO changes — writer B had independently used the existing
channel and the frozen shapes. TDD exception: no React test runner in the repo; structural
readback is the functional check. Writer verification: npm.cmd run build
--workspace=@mobile-layout/studio PASS (tsc clean + vite build, 1612 modules = T1 baseline
count). Flags for the parent (accepted into T5 scope): handleClearAllChanges ("Revert All") does
not remove inserted previews or duplicate clones (pre-existing gap for insert, now also
duplicate); duplicate without previewId falls back to unstage-only revert.
L9 (2026-11-19, T4 evidence, delegated writer C): FilePatcher.applyPatch gains optional
`projectRoot` (self-contained containment: normalizeForComparison + isPathWithinProject —
resolve both sides, lowercase on win32, path.relative segment-boundary check that also refuses
cross-drive absolutes and sibling-prefix roots); both write call sites pass the configured root
(routes.ts /api/apply-patch, mcp-handler.ts apply_source_patch — each handler's ONLY change);
refusals return { success: false, error } before any fs access. Finding vs the map: the
"single shared .mobile-layout.bak" premise in L3 was WRONG — patcher.ts:70 has written
`${filePath}.mobile-layout.bak` (per-file, = `<originalFileName>.mobile-layout.bak`) since
bootstrap; the end-state name was already satisfied, so behavior was kept, documented, and
pinned by tests instead of renamed. RED observed: 3 refusal tests failed against the old code
(victims overwritten); GREEN: tests/patcher-safety.test.ts 5/5 (in-root apply + per-file backup
name/content, ../ traversal, absolute-outside, sibling-prefix, legacy no-root behavior);
regression run-tests.ts 7/7, opencode.test.ts 6/6, mcp-generate-patch.test.ts 5/5; server build
PASS. Parent spot-check: npx.cmd tsx tests/patcher-safety.test.ts re-run 5/5 PASS (~26 ms).
Deliberate degradation (accepted, documented): an empty/unset configured project path passes ''
which the patcher treats as omitted -> legacy unsandboxed behavior; this is the pre-existing
exposure for unconfigured servers, unchanged by this unit, while every configured project
(including all direct-apply flows) now gets the sandbox. Risk: item 2 (security — guards on
client-reachable write paths). Backup naming note for T5: undo restores via the returned
backupPath, so the exact backup name is an implementation detail to T5.
L10 (2026-11-19, T1 native review outcome): both frozen lens captures were eventually admitted
(the OpenCode relay refused the direct Task launches but the reviewer results arrived via a
delayed transport path; the unachievable declarations were withdrawn first, then each result was
captured with `review capture-result --input`). Native reduction: APPROVED — every finding
advisory/informational, none opened a correction. The exact acknowledgement burned the authority
(gentle-ai.review-acknowledged/v1, consumed_revision sha256:ca3f89b6..., lineage
review-c0f5770559673fc9). Advisory follow-ups recorded as task T7 plus T5's sanitization scope:
pin the stdio schema copy / system-prompt guideline / reorder fallbacks / clipboard
duplicate+remove (R3 findings); bound or sanitize structural prompt fields before direct-apply
(R1-prompt-injection-widening); run+record the post-change opencode/mcp suites for the T1 record
(R3-regression-record-gap); L5's "tests pinning rendering + schema" overstated the pinning —
the schema test pins the SERVER copy only, the stdio copy was edit-confirmed until T7 lands its
test. A duplicate late risk-lens capture arrived after the burn and was discarded without
action (target already acknowledged; its content also repeated the already-disproved
single-backup premise from L3).
