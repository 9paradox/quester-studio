---
name: security-review
description: Security checklist for PRs touching engine, nodes, desktop IPC, env/secrets, or HTTP execution. Use before merging security-sensitive changes.
---

# Security review checklist

Read [SECURITY.md](../../SECURITY.md).

## Secrets

- [ ] No `*.secrets.json`, `.env`, or tokens in the diff
- [ ] New execution paths call `loadSecrets` and pass `secrets` to `executeFlow`
- [ ] Example templates use `.secrets.json.example` only

## HTTP / network

- [ ] Resolved URLs validated as `http:` or `https:` at execute time
- [ ] No new direct `fetch` from renderer (desktop)
- [ ] User-facing docs mention egress trust model if behavior changes

## Validation

- [ ] Flow/workspace/env input validated via `@quester/schema` before execution
- [ ] Zod `parse` / `safeParse` at plugin boundaries

## Tests

- [ ] Security behavior covered (secrets load, URL rejection, etc.)
- [ ] No secrets in test fixtures committed to repo

## Reporting

Vulnerabilities: GitHub Security Advisories (private), not public issues.
