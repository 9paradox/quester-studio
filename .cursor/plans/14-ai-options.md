# Plan 14 — AI options

**Priority:** 14 (later)  
**Status:** after polish track (01–08 at least)  
**ROADMAP:** §7 AI options  

## Goal

Opt-in AI assist for **JMESPath from natural language**, using a remote provider + user API key.  
Pattern mirrors [json-query-flow](https://github.com/9paradox/json-query-flow): send **JSON Schema (structure only)** + user request → model returns a query expression.

## Out of scope (v1)

- Local / on-device models (slow on typical machines; revisit later)
- Cloudflare Worker / hosted proxy required for core product
- Explain failed run / node error
- Generate or edit full flows from a prompt
- Training on user flows

## Dependencies

- Existing rule-based JMESPath assist (`templates.ts`, `JmesPathField`) — keep as default; AI is additive
- Run / previous-node output available in desktop (for shape source)
- Prefer plan 04 response viewer context when suggesting against a captured response

## Approach (v1)

```
previous node / response JSON
        │
        ▼
  infer JSON Schema locally
  (types + keys only — strip values)
        │
        ▼
  prompt = schema + natural-language request
        │
        ▼
  desktop main → provider API (user key)
        │
        ▼
  JMESPath string → preview / apply into field
```

Same idea as json-query-flow’s `buildJsonataPrompt(schema, naturalQuery)`, but target **JMESPath** and call the provider from **desktop main** (user key stored locally / OS secrets; no mandatory Worker). A Worker proxy remains an optional later alternative if we want “key never leaves a short-lived proxy.”

## Work

### Settings / trust

- [ ] Opt-in AI assist (off by default); core product works with AI disabled  
- [ ] Provider + API key UX (e.g. OpenAI / Google / compatible endpoint)  
- [ ] Document what leaves the machine (schema shape + NL request — **not** raw response values when possible) in docs + `SECURITY.md`  
- [ ] Disable / clear key → no further egress  

### Pipeline

- [ ] Local `json → JSON Schema` helper (structure only; no sample values in the prompt)  
- [ ] JMESPath system prompt (strict: expression only, fields from schema, no invented keys)  
- [ ] Provider client in **main process** (renderer never holds the key long-term / never calls provider directly)  
- [ ] Validate / dry-run suggested JMESPath against the source JSON before apply  

### UI

- [ ] “Suggest with AI” on `JmesPathField` (and equivalent path fields) when AI is enabled + key present  
- [ ] Short prompt dialog → loading → suggested expression → Insert / discard  
- [ ] Keep existing path picker + completions when AI is off  

## Later (not v1)

- Explain failed run / node error  
- Template / flow generate-edit  
- Local model provider (Ollama etc.) behind the same adapter  

## Done when

User can enable AI, enter a provider key, ask for a JMESPath against a response shape (schema-only prompt), insert it into a field, and disable assist with no leftover egress.

## After complete — ask user to confirm

When this plan’s work is done and automated tests/lint pass, **ask the user** to manually verify:

- [ ] **X** — With AI off: JMESPath fields still work via rule-based assist only; core product unchanged.
- [ ] **Y** — Enable AI + key → “Suggest with AI” against a response shape → insert valid JMESPath; prompt sends schema/NL only (not raw values) as documented.
- [ ] **Z** — Disable / clear key → no further provider egress; SECURITY/docs match.

Do not treat the plan as fully closed until the user confirms (or explicitly skips) these checks.

## Skills

`quester-desktop`, `security-review`
