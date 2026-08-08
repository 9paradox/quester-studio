# Plan 13 — Code node

**Priority:** 13  
**Status:** after 04 + SECURITY discipline; do not rush  
**ROADMAP:** §6 Forms & custom code — `code` node  
**Related:** B15 (Eta `mode` + SECURITY honesty — does **not** sandbox `template`); SECURITY.md  

## Goal

Secure, isolated custom function node (JS first) with Monaco-class editing and canvas DnD. B15 only documents / gates the template node; real sandboxing lives here.

## Out of scope

Arbitrary language pack until isolation story is proven for JS. Ambient FS/network unless explicitly gated.

## Dependencies

Plan 04 editor; plan 06 DnD; security review required before merge.

## Work

- [ ] Secure isolated runtime — no ambient FS/network unless gated; timeouts + memory caps  
- [ ] Document trust model in SECURITY.md  
- [ ] Clear I/O contract (input → return value / error)  
- [ ] Monaco-class editor (inspector and/or tab)  
- [ ] Drag from palette / snippets onto canvas  
- [ ] Tests for sandbox escapes + timeout  
- [ ] Docs + sample  

## Done when

Hostile snippet cannot read workspace secrets from disk or open raw sockets outside the gate; happy-path transform works; SECURITY documents the model.

## After complete — ask user to confirm

When this plan’s work is done and automated tests/lint pass, **ask the user** to manually verify:

- [ ] **X** — Happy path: small transform code runs; return value flows to the next node; Monaco editor usable.
- [ ] **Y** — Hostility check: snippet cannot read workspace secrets from disk or open raw sockets outside the gate; timeout/memory caps trip as documented.
- [ ] **Z** — Drag from palette works; SECURITY.md trust model matches observed behavior; sample + docs clear.

Do not treat the plan as fully closed until the user confirms (or explicitly skips) these checks.

## Skills

`add-flow-node`, `security-review`, `quester-desktop`
