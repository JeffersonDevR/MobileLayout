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
     (`App.tsx`, `ReactiveChangesDock.tsx`, `StagingDrawer.tsx`, `prompt.ts`, `patcher.ts`,
     `routes.ts`) | done — RED (3+3) -> GREEN (17/17 + 9/9), all suites green, builds PASS;
     commit: this slice
T6 | S1,S2 | inline | README/docs + full-suite seam check + close | done — 4 README sections
     updated, all 5 suites green in the seam check; commit: this slice
T7 | follow-up | inline | review-advisory test hardening: pin the stdio MCP schema copy,
     system-prompt structural guideline + renumbered output guideline, reorder fallback
     behavior, and clipboard duplicate/remove branches; correct the L5 pinning overstatement;
     record post-change opencode/mcp suite results in the log | done — 4 pin tests GREEN
     (13/13); stdio definitions extracted to packages/mcp/src/tools.ts (import-safe); the
     T1-record gap was closed in L12; commit: this slice
T8 | follow-up | inline | refuter-corroborated regression fixes (ordinary commits; the native
     correction binding was unreachable — see L15): single-file lastApply recording, (none)
     marker + per-field caps (value 2000 / target 1000), Unicode/C1 sanitizer extension,
     best-effort backup unlink, README sandbox scope | done — RED (5+1) -> GREEN (17/17 +
     18/18), all suites green; commit: this slice

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
L11 (2026-11-19, T4 independent verification + review state): gentle-ai-verify over
629da52..deec6d2 returned NO blockers: surface conformity (exactly the 4 declared paths),
all unit checks re-run PASS, 14/14 adversarial containment probes PASS (mixed separators,
uppercase root + trailing sep, drive-root same/cross-drive, ..-segments resolving inside,
dotdot-prefixed filenames, refusal-before-fs on nonexistent outside targets, no stray .bak on
refusal, root-itself EISDIR-safe, relative-cwd escape, ''-root legacy), fixture byte-identical
before/after, git status unchanged. Advisories recorded (not blocking): lexical-only containment
(symlinks/junctions unresolved — requires pre-existing fs write access to exploit; future
hardening candidate), ''-root pinning gap (NOW pinned by the appended probe), and the
pre-existing client-settable project root via POST /api/project (narrowed, not introduced, by
T4). The verifier's 9 durable probes were appended verbatim to tests/patcher-safety.test.ts and
pass GREEN against current code; the verifier's scratch dir was removed by the parent. T4
native review: consent GRANTED (user); the risk-lens relay was refused instantly (delayed-path
pattern) and remains pending; the reliability lens arrived via the delayed path and was
CAPTURED (admission completed) — 3 WARNING + 4 SUGGESTION, none blocking (lexical symlink,
caller-wiring unproven at route level, empty-root fail-open [now pinned by probe], cross-drive
[now pinned by probe], fixture-precondition, shared-fixture-mutation, refusal-no-bak [now
pinned by probe]). Reduction awaits the risk lens.
L12 (2026-11-19, T5 evidence, inline): RED observed (tests/patcher-safety.test.ts: 3
restoreBackup failures — function absent; tests/structural-changes.test.ts: 3 sanitization
failures — raw \r and uncapped length passed through; runs recorded). Implemented:
(a) FilePatcher.restoreBackup (RestoreRequest/RestoreResult) — same projectRoot containment,
restores <file>.mobile-layout.bak over the target and deletes the backup, fails cleanly when
absent; (b) routes.ts POST /api/undo-apply — html/scss restore through FilePatcher with the
configured project path (sandboxed like apply-patch); (c) prompt.ts sanitizePromptText —
strips C0/DEL control chars (newline-injection neutralized) and caps fields at 200 chars,
applied in formatChangeLine, structuralInstruction, and the clipboard map; (d) App.tsx —
directApplyMode (default false) + lastApply state; applyToDisk refactor shared by the reviewed
DiffModal flow and the new direct branch of handleGenerateWithLLM (falls back to the diff review
with a toast when the generation returns no file content); handleUndoApply posts /api/undo-apply
and mirrors the apply post-steps; handleClearAllChanges now removes staged preview clones
(MOBILE_LAYOUT_REMOVE_INSERTED per previewId for insert/duplicate) before resetting styles;
(e) StagingDrawer — "Direct apply (skip diff review)" toggle + "Undo Last Apply" button +
mode-aware generate label; ReactiveChangesDock — compact "Direct" toggle + "Undo" button +
mode-aware label, and the dock stays mounted while canUndoApply so undo remains reachable after
staged changes are cleared. GREEN: tests/patcher-safety.test.ts 17/17 (5 original + 9
adversarial probes + 3 restore), tests/structural-changes.test.ts 9/9 (6 original + 3
sanitization), server build PASS, studio build PASS (1612 modules, baseline parity),
regressions run-tests.ts 7/7, opencode.test.ts 6/6, mcp-generate-patch.test.ts 5/5 (this also
closes the T1 regression-record-gap advisory: the touched MCP handler surface is now evidenced
post-change). TDD exception: studio UI has no React test runner — structural readback of all
changed handlers and render wiring (grep + region reads recorded). Risk: item 2 — the new
/api/undo-apply is a client-reachable write path; it routes through the same FilePatcher
containment (projectRoot from server state) and its refusal behavior is pinned by the restore
tests; everything else in the unit reuses sandboxed primitives.
L13 (2026-11-19, T4 review outcome + slice assess): the T4 risk lens arrived via the delayed
path — 2 WARNINGs, both explicitly pre-existing (lexical link-indirection containment;
optional-root fallback) — and was captured; native reduction APPROVED (9 advisory findings
total, none blocking, no correction); the exact acknowledgement burned the authority
(gentle-ai.review-acknowledged/v1, lineage review-26e7585b640eacc3). Open-slice assess after
the T5 commit (base-ref d317be1, committed-only): risk medium (executable_change on
packages/bridge/src/inspector.ts), 11 paths / 1221 lines, review_due false (under_budget) —
the slice T2+T3+T5 stays pending below the review budget with T4's range individually
acknowledged.
L14 (2026-11-19, T7 + T6 evidence, inline): T7 — the stdio MCP_TOOLS_DEFINITIONS moved
verbatim into a new side-effect-free module packages/mcp/src/tools.ts (index.ts imports it;
the readline loop stays in the binary entry), enabling a real import-based pin; 4 pin tests
added to tests/structural-changes.test.ts (stdio schema enum + 4 targeting fields + direction
domain; system-prompt structural guideline + renumbered output guideline 5; reorder fallback
semantics — absent direction -> BEFORE, absent relativeTo -> value as sibling, total absence ->
'the adjacent element'; clipboard duplicate/remove branches). GREEN: structural-changes.test.ts
13/13; mcp build PASS (tsc). The L5 pinning overstatement is corrected by these pins, and the
T1 regression-record gap (post-change opencode/mcp suites) was closed in L12. T6 — README
updated in 4 places (new Structural Canvas Edits feature bullet; direct-apply + sandbox notes
on the Monaco bullet; direct-apply step in the workflow; MCP visualChanges structural-types
note); full-suite seam check: run-tests.ts 7/7, opencode.test.ts 6/6,
mcp-generate-patch.test.ts 5/5, patcher-safety.test.ts 17/17, structural-changes.test.ts
13/13 — all green in one pass.
L15 (2026-11-19, final-slice review + provider defect + T8): the final consolidated review
(lineage review-feb77e2c1ccf8b7b, consent GRANTED) captured both lenses (risk: 4 WARNING + 2
SUGGESTION; reliability: 2 CRITICAL + 5 WARNING/SUGGESTION). The reduction demanded a provider
refuter; the refuter RAN via the delayed transport and CORROBORATED both CRITICALs (R3-1:
single-file applies record both matched paths in lastApply so undo 500s wholesale against a
backup that never existed; R3-2: the sanitized generic line dropped the baseline '(none)'
previousValue marker and hard-caps values at 200 chars). Every capture-refuter submission path
refused the opencode runtime with the typed envelope `review capture-refuter provider runtime
"opencode" has no Go-owned role capture contract` (--input with --agent, --input without
--agent, and --execute). Per the mandatory Provider Defect Handoff the user consented to
"Report the defect and continue"; the definitive open+closed lookup found the canonical
tracker Gentleman-Programming/gentle-ai#5769 (OpenCode refuter role capture refused; ten
consented occurrences across 4.3.1-4.5.1, all with no verifiable published fix — this
occurrence adds the 4.6.0 stable data point). The occurrence comment could NOT be posted: gh
is not installed on this machine and extracting the stored HTTPS credential is prohibited; the
privacy-scrubbed draft is preserved at odd/provider-defect-5769-occurrence-comment.md for
manual posting. The exact captured decline invocation was then executed once and validated
(action declined, consent declined_this_candidate, target match; no receipt created; future
reviews stay enabled); the bound STATUS still reports the lineage frozen at
provider_refuter_required — consumer state preserved, recorded as an observable consistent
with the tracker's prior occurrences. T8 then fixed the corroborated findings as ordinary
follow-up commits (the documented precedent on the tracker): (R3-1) applyToDisk records
lastApply keyed by content presence — single-file generations no longer register the
untouched path, for both the direct and DiffModal flows; (R3-2) the generic line restores the
baseline "(none)" marker and uses per-field caps (previousValue/value 2000, targeting
selectorPath/selector/sibling 1000, name 200); (R3-9) sanitizePromptText also strips C1
controls, Unicode line/paragraph separators, zero-width/bidi characters, and BOM; (R3-10)
restoreBackup's backup unlink is best-effort — a locked file no longer turns a successful
restore into an error (pinned by a mocked-unlink test); (R3-7) the README sandbox claim is
scoped to configured project roots. TDD: RED observed (5 failures in structural-changes, 1 in
patcher-safety) then GREEN (17/17 + 18/18); the studio build caught and fixed a type error in
the lastApply state widening; final sweep 7/7 + 6/6 + 5/5 + 18/18 + 17/17 = 53/53, studio
build 1612 modules baseline parity. Remaining advisories NOT acted on (recorded for future
work): undo lacks a staleness snapshot of post-apply manual edits (risk lens; a redo backup
before overwrite is the candidate fix), duplicate clones share the original's DOM id so
canvas-side targeting cannot distinguish them (R3-4; candidate fix: suffix the clone's id),
route-level undo/apply wiring is untested (R3-6), and the bridge emission contract has no
automated coverage (R3-5).
