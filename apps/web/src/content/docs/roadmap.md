---
title: Roadmap
description: Planned features and milestones
---

High-level priorities. Full backlog: [GitHub Issues](https://github.com/9paradox/quester-studio/issues) and [ROADMAP.md](https://github.com/9paradox/quester-studio/blob/main/ROADMAP.md).

## Current — v0.6.x polish

Work follows the repo roadmap on the **current minor line** (no version jumps). Latest public preview: **[v0.6.5](https://github.com/9paradox/quester-studio/releases/tag/v0.6.5)**. Priorities:

1. **Performance** — desktop canvas, large JSON, engine/IPC.
2. **Desktop UX** — remaining polish after viewers / run UX / canvas.
3. **Web + docs** — site/guide/Try stay aligned with the product ([plan 16](https://github.com/9paradox/quester-studio/blob/main/.cursor/plans/16-web-and-docs.md)).
4. Later tracks: auth/HTTP nodes, data helpers, forms, `code` node, AI options, MCP.

Source of truth: [ROADMAP.md](https://github.com/9paradox/quester-studio/blob/main/ROADMAP.md). Plan files: `.cursor/plans/` in the repo.

## Shipped — v0.6.5

- Workspace forms and mid-flow `form` nodes (`{{form.*}}` bindings, CLI `--forms`)
- Desktop UI review: focus/ARIA, form labelling, type-scale tokens, run-status re-render narrowing
- Template / JMESPath assist polish

## Shipped — v0.6.2

- Framed `try` / `foreach` with nesting; `join` + max-one-in; header ports
- Desktop: JSON CodeMirror viewers, run timeline, Runs browser, canvas DnD / subflow drop
- Stability: fan-in, cookies, delay abort, path ids, template `mode`, secret redaction
- Sample: `nested-frames.flow.json`

## Shipped — v0.5–v0.6.0 thin slice

- Flow nodes: `note`, `delay` / `wait`, `switch`, `foreach`, `try`, `subflow`, `log`, `inspect` / `preview`
- Desktop polish: per-flow runs, Stop, command palette, tab reorder, run summary, JMESPath assist
- Observability: local run history / replay, disk cookie jar
- Stable path: flow format `v1` freeze note, unsigned macOS desktop artifact, thin Postman Collection import (`quester import-collection`)

## Platform / SaaS (post-v1)

Browser SPA + HTTP API (no desktop bridge). Shared `api-contract` / `workspace-service` / `apps/api` and desktop `dev:web` are in place — see [Developing the studio](../developing-studio/) and repo [ROADMAP.md](https://github.com/9paradox/quester-studio/blob/main/ROADMAP.md).

## Done — v0.4.0

- Platform closeout + public preview ([v0.4.0](https://github.com/9paradox/quester-studio/releases/tag/v0.4.0))
- `quester init`, welcome empty state, renderer smoke tests
- npm `@quester-studio/*` + unsigned Windows/Linux desktop
- [Try Quester Studio](../try/) for external testers
- [Product site](https://9paradox.com/quester-studio/) for download, guide, and docs

## Releases

See [CHANGELOG.md](https://github.com/9paradox/quester-studio/blob/main/CHANGELOG.md) and [GitHub Releases](https://github.com/9paradox/quester-studio/releases). Desktop builds are unsigned development artifacts — see [SECURITY.md](https://github.com/9paradox/quester-studio/blob/main/SECURITY.md).
