# Feature: Git + .env setup for GitHub delivery

## Objective
Initialize the repository, add safe ignore rules and env templates, align env defaults with the
new OpenCode V2 service, and prepare work-unit commits. The final remote push is gated on
explicit user-provided destination, credential method, and commit author identity.

## Problem / Why
`C:\Users\SENA\Documents\MobileLayout` is not a git worktree, has no `.gitignore`, and has a
`packages/server/.env` that must never be committed. `packages/server/src/index.ts` still uses
pre-integration defaults (`OPENCODE_BASE_URL=http://localhost:11434/v1`,
`OPENCODE_MODEL=deepseek-coder`, `OPENCODE_API_KEY=dummy-key`), which contradict the OpenCode
V2 service integration. No global git author identity exists.

## Scope
- Repository root: `.git` initialization, `.gitignore`, `.env.example`.
- `packages/server/src/index.ts` — env defaults only.
- Local commits on a feature branch, merged to `main`.
- `git remote add` + `git push` — ONLY after explicit user authorization of URL and credential.
- No edits to `.env` values and no reading of `.env` secrets.

## Constraints / Decisions
- `.env` (any directory), `.env.local`, `node_modules/`, `dist/`, `coverage/`, `*.log` are ignored.
- `.env.example` files are tracked; real secrets are never staged.
- The existing `packages/server/.env.example` could not be read (tool permission denied); leave
  it untouched and add a root-level `.env.example` derived from `index.ts` instead.
- OpenCode env defaults become: base URL `http://localhost:4096`, model `''` (omit -> OpenCode
  default), API key `''` (no Bearer header when empty).
- Ambient credentials, SSH agents, ControlMaster sockets, gh auth state and remembered sessions
  must NOT be discovered or reused. The user supplies the credential method explicitly.
- Initial branch `main`; work committed on a feature branch then fast-forward merged to `main`.
- Conventional Commits, no AI attribution or Co-Authored-By lines.

## Acceptance Criteria
- [x] T1 `git init -b main` completed; root `.gitignore` created and verified with
      `git check-ignore -v`.
- [x] T2 Root `.env.example` documents all env vars with updated OpenCode defaults;
      `index.ts` defaults aligned; server build and tests still pass.
- [ ] T3 Work-unit commit(s) with Conventional Commit message on a feature branch, merged to
      `main`; BLOCKED on the user-provided git author name and email (no global git identity
      is configured). Files are staged-ready but intentionally not committed.
- [ ] T4 Remote added and push executed ONLY after the user supplies: repository URL,
      authentication method, and git author name/email. Until then this task stays blocked.

## Authorized Scope
Local git and env files inside MobileLayout only. No remote operation until T4 inputs arrive.
No secret values read, printed, or committed.

## Applicable Checks
- `git status --short`, `git check-ignore -v packages/server/.env`, `git log --oneline -5`.
- `npm.cmd run build --workspace=@mobile-layout/server`
- `npx.cmd tsx tests/run-tests.ts`
- PowerShell blocks `.ps1` scripts: use `.cmd` variants.

## Route Declaration
Delegated direct for the env/code edit (2+ files), inline for mechanical git state commands.
No SDD. TDD off.

## Progress
- T1 pending
- T2 pending
- T3 pending
- T4 BLOCKED — awaiting remote URL, credential method, and author identity

## Verification Evidence
Recorded 2026-11-17 from the repository root (PowerShell; `.cmd` variants used):
- `git init -b main`: PASS — "Initialized empty Git repository in .../MobileLayout/.git/".
- `git check-ignore -v packages/server/.env node_modules packages/server/dist .env.example`:
  `.env` ignored by `.gitignore:12`, `node_modules` by `:3`, `dist` by `:7`, and `.env.example`
  matched only the negation `!.env.example` at `:14` (so it is tracked).
- `npm.cmd run build --workspace=@mobile-layout/server`: PASS (`tsc`, no errors).
- `npx.cmd tsx tests/run-tests.ts`: PASS (7 tests, 7 pass, 0 fail).
- `git status --short`: only source/config files untracked; NO `.env`, `node_modules`, or `dist`.
- No ambient credential, SSH agent, gh auth state, or remembered session was inspected.
- `git config --local credential.helper manager`: PASS — Git Credential Manager is enabled for
  this repo only, so an HTTPS push will open GitHub's interactive login. No `origin` exists yet.

## Next Step
Ask the user once for: (1) git author name and email, (2) GitHub remote URL, (3) push
authentication method. STOP and wait; do not commit or push until all three arrive.
