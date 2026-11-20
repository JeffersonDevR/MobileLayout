# Draft occurrence comment for Gentleman-Programming/gentle-ai#5769

Status: NOT POSTED — the GitHub CLI is not installed on this machine, so no
authorized write route exists. Preserved here so it can be posted manually with
your GitHub account. Privacy-scrubbed; observed behavior only; no root cause
asserted.

---

## Consented occurrence on 4.6.0 stable (Windows x64, OpenCode)

Same observable as this tracker, adding a 4.6.0 stable data point.

### Environment and contract
- Installed build: gentle-ai 4.6.0, release channel stable (capabilities protocol v2.6).
- Runtime: OpenCode host relay (agent identity `opencode`), Windows x64.
- Contract: `gentle-ai.review-integration/v2`, high-risk committed-only review, two lenses (risk, reliability), correction budget 200.

### Operation shape and bounded outcomes
1. Both reviewer-lens results were admitted via `review capture-result --input` (2/2 `admission_decision: completed`).
2. Bound STATUS returned `collect / provider_refuter_required` with capture operation `external.run_provider_role`, provider agent `review-refuter`, runtime `opencode`. (The delivered refuter result carried a `refuter_request_hash`, so the hash gap reported in #5415 appears resolved in this build.)
3. The refuter role ran through the host relay and returned a schema-valid result (two findings corroborated) — but no submission path admits it:
   - `review capture-refuter --agent=opencode --input <file>` → preflight `invalid_request`, cause: `review capture-refuter provider runtime "opencode" has no Go-owned role capture contract`.
   - `review capture-refuter --input <file>` (no --agent) → `review capture-refuter requires --agent naming the host-relay runtime`.
   - `review capture-refuter --agent=opencode --execute` → identical `no Go-owned role capture contract` refusal.
4. All refusals: `mutation_outcome: not_started`, `retry_safe: true`. The lineage remains `reviewing / collect / provider_refuter_required`.

### Follow-up per the documented handoff
The exact candidate-scoped decline invocation from the captured consent envelope was executed once and validated (`action: declined`, `consent: declined_this_candidate`, matching target). Re-entering the bound STATUS still returned the original lineage in `reviewing / provider_refuter_required` — recorded as an observable, consistent with the prior occurrence comment on this tracker. The corroborated findings were fixed as ordinary follow-up commits outside the bounded-correction mechanism, since no correction binding could be produced without the refuter capture.

### Safe opaque identifiers
lineage `review-feb77e2c1ccf8b7b`; refuter request `sha256:c6b2b1b423780556162752ebdbdbf5f08827239ffed05742cb0919dbdec45622`; target `sha256:6e28dd81ecbb786922f8d58f4a14a60aefc5193a0d968656af847d21a802064c`.

### Preserved state and privacy
No store reset, repair, forced acknowledgement, label, or issue-state change. Final privacy scan excluded raw argv, absolute paths, private project names, usernames, hostnames, credentials, source contents, diffs, and environment values.
