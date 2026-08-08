# Plan 10 — Nodes: auth + HTTP

**Priority:** 10  
**Status:** after stability wave (01–02)  
**ROADMAP:** §6 Auth + HTTP / API  

## Goal

High-leverage auth and HTTP nodes for real API scenario testing.

## Out of scope

`oauth2` full productization if trust model isn’t ready — can ship bearer/basic/apiKey first.

## Dependencies

Stability wave; security review for auth helpers.

## Work

**Auth**

- [ ] `bearer` / `basicAuth` / `apiKey` helpers  
- [ ] `oauth2` helper (bounded scope; document trust model)  

**HTTP / API**

- [ ] `pagination`  
- [ ] `multipart` / `form`  
- [ ] `graphql`  

Also from §6 Control (after plan 09):

- [ ] `parallel`  
- [ ] `loop` / `while` (caps per SECURITY.md)  

## Done when

Each shipped node: schema + plugin + tests + desktop catalog/inspector + docs page + changeset.

## After complete — ask user to confirm

When this plan’s work is done and automated tests/lint pass, **ask the user** to manually verify:

- [ ] **X** — Auth helpers (`bearer` / `basicAuth` / `apiKey`, and `oauth2` if shipped): wire into HTTP and see headers/auth applied as documented.
- [ ] **Y** — HTTP helpers (`pagination`, `multipart`/`form`, `graphql`): smoke each in desktop + CLI against a known endpoint or sample.
- [ ] **Z** — Any shipped `parallel` / `loop`/`while`: caps/abort behave safely; catalog, inspector, and docs exist for each node.

Do not treat the plan as fully closed until the user confirms (or explicitly skips) these checks.

## Skills

`add-flow-node`, `security-review`
