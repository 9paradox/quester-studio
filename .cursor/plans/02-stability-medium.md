# Plan 02 — Stability (medium)

**Priority:** 2  
**Status:** code complete (awaiting user X/Y/Z confirm)  
**ROADMAP:** §1 Stability — Medium + Ongoing  
**BUGS:** B9–B15, B17  

## Goal

Close remaining correctness / trust gaps from the 2026-08-08 audit.

## Out of scope

Framed `try`/`foreach` implementation (plan 09 closes B13 for real). B17 site rewrite lands with plan 16 (last).

## Dependencies

Prefer B4 fixed before deep engine cookie work (optional). B13 docs-only until plan 09.

## Work

- [x] **B9** — Abortable `delay` + cap `ms` (`nodes`, `schema`)  
- [x] **B10** — Safe flow / env / secrets path ids (`workspace-service`, `schema`)  
- [x] **B11** — Cookie jar final URL + Secure / Path (`nodes`)  
- [x] **B12** — CLI `environmentsDir` + shared cookie jar (`cli`, `engine`)  
- [x] **B13** — Until plan 09: clearer docs / UX that `try` is not exception catch  
- [x] **B14** — Exclude `*.secrets.json` from desktop sample sync (`apps/desktop/scripts`)  
- [x] **B15** — Template trust: **A + C** (document + `mode` flag) — see below  
- [x] **B17** — Web roadmap / Try / Guide drift (or fold into plan 16)  
- [ ] Ongoing — harden foreach/subflow/abort tests; save/reload reliability; suite CI smoke green  

### B15 detail — A (docs) + C (`mode`)

**Decision:** Keep Eta power for authors; add an explicit safe path; document both in `SECURITY.md`. Do **not** claim sandboxing. Full isolation stays plan 13 (`code` node).

| Layer | Work |
| --- | --- |
| **A — Document** | `SECURITY.md` trust model: `template` with `mode: "eta"` is in-process JS (`<% %>`, `<%= it.* %>`); ordinary `{{…}}` fields are interpolation only; treat imported flows like untrusted code. Node catalog / inspector help should say the same. |
| **C — Mode** | Schema: optional `mode: "eta" \| "safe"` on `template` node data. Default **`"eta"`** (back-compat for existing `<%= it.* %>` samples/tests). `"safe"` = `resolveTemplate` / `{{…}}` only — reject Eta tags with a clear execute error. |

**Implementation sketch**

1. `packages/schema` — extend `templateNodeDataSchema` with `mode` (default `eta`); rebuild schemas.
2. `packages/nodes` — `template.ts`: branch on mode; tests for `eta` happy path + `safe` reject of `<%` / `<%=`.
3. Desktop (light) — inspector mode control; `safe` → `{{…}}` completions only; `eta` → keep `template+eta`.
4. Import coerce/warn → `safe` can be a follow-up; not required to close B15.
5. Changeset (user-facing).

**Out of scope for B15:** stripping tags without a mode; replacing Eta; VM/worker sandbox (→ plan 13).

## Done when

Each bug has a fix PR or an explicit “wontfix / superseded by plan 09” note in BUGS.md. B15: SECURITY documents eta-as-code; `mode: "safe"` works + tested; default remains `eta`.

## After complete — ask user to confirm

When this plan’s work is done and automated tests/lint pass, **ask the user** to manually verify:

- [ ] **X** — `delay` aborts on Stop/cancel and rejects absurd `ms`; unsafe flow/env/secrets path ids are rejected.
- [ ] **Y** — Cookie jar respects final URL + Secure/Path; CLI uses `environmentsDir` + shared jar like desktop; sample sync excludes `*.secrets.json`.
- [ ] **Z** — Template `mode: "safe"` rejects Eta tags; default `eta` still works; SECURITY / docs match; B13 wording is clear until plan 09 (or noted superseded).

Do not treat the plan as fully closed until the user confirms (or explicitly skips) these checks.

## Skills

`quester-studio`, `security-review` (B10/B14/B15)
