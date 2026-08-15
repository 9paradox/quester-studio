# Plan 10 — Nodes: auth helpers

**Priority:** 10  
**Status:** **Complete** (user confirmed X/Y/Z)  
**ROADMAP:** §6 Auth  
**Follow-ups:** [10b](./10b-nodes-http-helpers.md) HTTP/API helpers; [10c](./10c-nodes-control.md) `parallel` / `while`

## Goal

High-leverage auth helpers so HTTP requests can send bearer, basic, and API-key credentials without hand-rolled headers every time.

## Out of scope

- `oauth2` — bounded helper + trust-model docs; ship only after this plan if the model is ready, otherwise a later slice
- HTTP/API nodes (`pagination`, `multipart` / HTTP form, `graphql`) — plan 10b
- Control (`parallel`, `loop` / `while`) — plan 10c
- Do not auto-merge previous-node `headers` (HTTP responses also have `headers`)

## Dependencies

Stability wave; security review for auth helpers.

## Work

- [x] `bearer` helper
- [x] `basicAuth` helper
- [x] `apiKey` helper (header or query)
- [x] HTTP node applies in-run auth vars (`httpAuthHeaders` / `httpAuthQuery`); node headers win
- [x] Schema + plugin + tests + desktop catalog/inspector/help + docs pages + changeset
- [x] SECURITY.md: tokens via `{{secrets.*}}`; no secret echo in node output; no oauth2 claim

## Done when

`bearer` / `basicAuth` / `apiKey` each have schema, plugin, tests, catalog/inspector, docs, and changeset; HTTP inherits auth as documented.

## After complete — ask user to confirm

When this plan’s work is done and automated tests/lint pass, **ask the user** to manually verify:

- [x] **X** — `bearer`: token from secrets/env appears as `Authorization: Bearer …` on the following HTTP request (inspector / run request snapshot).
- [x] **Y** — `basicAuth`: Basic header is applied; password is not shown in node output.
- [x] **Z** — `apiKey` header and query modes both reach the request; an HTTP header on the node still overrides inherited auth.

Do not treat the plan as fully closed until the user confirms (or explicitly skips) these checks.

## Skills

`add-flow-node`, `security-review`
