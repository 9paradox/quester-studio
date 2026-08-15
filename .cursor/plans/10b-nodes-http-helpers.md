# Plan 10b — Nodes: HTTP / API helpers

**Priority:** 10b (after plan 10)  
**Status:** after plan 10  
**ROADMAP:** §6 HTTP / API  
**Depends on:** [plan 10](./10-nodes-auth-http.md) auth helpers (can overlap only if PRs stay additive)

## Goal

Nodes that make common API shapes easier: pagination, multipart / URL-encoded bodies, GraphQL.

## Out of scope

- Workspace `form` node (plan 12, already shipped) — HTTP form-urlencoded / multipart must use **new** types, not reuse `form`
- `oauth2` (plan 10 leftover / later)
- `parallel` / `while` (plan 10c)

## Dependencies

Plan 10 preferred first so auth + HTTP helpers compose in samples. Security review for any new fetch / body encoding.

## Work

- [ ] `pagination`
- [ ] `multipart` / HTTP form-urlencoded (distinct from workspace `form`)
- [ ] `graphql`

## Done when

Each shipped node: schema + plugin + tests + desktop catalog/inspector + docs page + changeset.

## After complete — ask user to confirm

When this plan’s work is done and automated tests/lint pass, **ask the user** to manually verify:

- [ ] **X** — `pagination`: follows next page / cursor as documented; caps / abort behave safely.
- [ ] **Y** — `multipart` / HTTP form: body and Content-Type match a known endpoint or sample (desktop + CLI).
- [ ] **Z** — `graphql`: query + variables send as documented; response shows in the HTTP/run viewer.

Do not treat the plan as fully closed until the user confirms (or explicitly skips) these checks.

## Skills

`add-flow-node`, `security-review`, `quester-desktop`
