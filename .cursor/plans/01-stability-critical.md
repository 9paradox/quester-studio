# Plan 01 — Stability (critical / high)

**Priority:** 1 — open first  
**Status:** done  
**ROADMAP:** §1 Stability — Critical / high  
**BUGS:** B4, B5, B6, B7, B8, B16  

## Goal

Make daily desktop + sample + run paths trustworthy before UI feature work.

## Out of scope

Medium bugs (plan 02), performance polish (03), new nodes.

## Dependencies

None. Blocks plans 05, 09 (partially).

## Work

- [x] **B4** — Engine fan-in join semantics (diamond DAG) + `execute.test.ts` regression  
  - Packages: `packages/engine`
- [x] **B5** — Desktop `executeFlowRpc` 30s timeout  
  - Packages: `apps/desktop` (main + renderer Electrobun client)
- [x] **B6** — Hero sample + Try credentials (`login-and-profile` vs `input` / secrets)  
  - Packages: `examples/`, docs as needed; align with plan 08 if site copy changes
- [x] **B7** — Redact secrets in UI / RPC logs (parity with disk run logs)  
  - Packages: `workspace-service`, `engine` redact helpers, `apps/desktop`
- [x] **B8** — Gate Mod+Enter double-run; scope Stop / `isRunning`; cancel on workspace close  
  - Packages: `apps/desktop` store / commands
- [x] **B16** — `apps/api` localhost-dev only — document + guardrails  
  - Packages: `apps/api`, `SECURITY.md`

## Done when

- Diamond flow test green; long run (>30s) works from desktop; Open sample → hero path works cold; no raw secrets in UI logs for a secrets-backed run; double Mod+Enter does not stack runs; SECURITY/API warn on non-loopback or document clearly.

## After complete — ask user to confirm

When this plan’s work is done and automated tests/lint pass, **ask the user** to manually verify:

- [ ] **X** — Diamond / fan-in sample: both branches join correctly (no premature or skipped join).
- [ ] **Y** — Desktop: long run (>30s) finishes; Mod+Enter does not stack double runs; Stop / workspace close cancels cleanly.
- [ ] **Z** — Open sample → hero `login-and-profile` works cold; secrets stay redacted in UI/RPC; `apps/api` docs/guards match localhost-dev expectation.

Do not treat the plan as fully closed until the user confirms (or explicitly skips) these checks.

## Skills

`quester-studio`, `quester-desktop`, `security-review` (B7/B16)
