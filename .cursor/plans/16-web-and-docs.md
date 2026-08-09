# Plan 16 — Web + docs

**Priority:** 16  
**Status:** Later — after plans 09–15; absorb landed product changes into site/docs in one pass (before plan 17 perf)  
**ROADMAP:** §4 Web UI/UX + §5 Docs  
**BUGS:** B6 (copy), B17  

## Goal

Site and docs match shipped 0.6.x (including features from plans 09–15); Try path works for new users.

## Out of scope

`studio-web` product extract (Later / SaaS). Heavy marketing redesign.

## Dependencies

- Run **last** so Guide / node reference / SECURITY can document auth, forms, code node, framed try/foreach, etc. after they ship.
- B6 sample behavior should be decided/fixed (plan 01) before finalizing Try copy.

## Work

**Web**

- [ ] Align site roadmap with repo ROADMAP (0.6.x polish, not “v0.7 scenario testing”)  
- [ ] Guide + Download first-flow story + macOS; correct Linux artifact names  
- [ ] Capture remaining UI screenshots  
- [ ] Mobile / nav / search polish as needed  
- [ ] Brand token consistency where shared  

**Docs**

- [ ] Try path — credentials, `hello.flow.json` CLI snippet, first-flow choice  
- [ ] Per-node reference sync (incl. honest `try` / framed containers after plan 09)  
- [ ] Document `quester import-collection`  
- [ ] Scenario guides match sample  
- [ ] Concepts — templates, env, runs, cookies, HTTP inheritance  
- [ ] SECURITY — Eta template A+C / `mode` (B15, plan 02), code node (plan 13), API localhost-dev (B16)  
- [ ] Changelog / release notes readable per 0.6.x ship  
- [ ] Fold in any interim web/docs deltas from plans 09–15 so one pass stays current  

## Done when

Cold path (download or CLI init → recommended first flow) succeeds without tribal knowledge; site roadmap matches repo; docs cover features shipped through plan 15.

## After complete — ask user to confirm

When this plan’s work is done and automated tests/lint pass, **ask the user** to manually verify:

- [ ] **X** — Site roadmap / Guide / Download match repo 0.6.x and correct OS artifact names (incl. macOS / Linux).
- [ ] **Y** — Cold Try path: credentials + recommended first flow (or CLI `hello`) works without tribal knowledge.
- [ ] **Z** — Node reference / concepts / SECURITY notes (try honesty, templates, import-collection, post–09–15 features) match shipped behavior.

Do not treat the plan as fully closed until the user confirms (or explicitly skips) these checks.

## Skills

`quester-studio` (docs content under `apps/web`)
