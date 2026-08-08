---
title: Roadmap
description: Planned features and milestones
---

High-level priorities. Full backlog: [GitHub Issues](https://github.com/9paradox/quester-studio/issues) and [ROADMAP.md](https://github.com/9paradox/quester-studio/blob/main/ROADMAP.md).

## Current — v0.6.x polish

Work follows the repo roadmap on the **current minor line** (no version jumps). Priorities:

1. **Stability** — correctness and trust gaps from the audit (delay cancel, path ids, cookies, CLI parity, template trust mode, docs).
2. **Performance** — desktop canvas, large JSON, engine/IPC.
3. **Desktop UX** — JSON viewers, run UX, canvas nodes, logs viewer.
4. **Web + docs** — site/guide/Try alignment with the product.
5. **Framed `try` / `foreach`** — real exception-boundary containers (see ROADMAP §6 Control).
6. Later tracks: auth/HTTP nodes, data helpers, forms, `code` node, AI options, MCP.

Source of truth: [ROADMAP.md](https://github.com/9paradox/quester-studio/blob/main/ROADMAP.md). Plan files: `.cursor/plans/` in the repo.

## Shipped — v0.5–v0.6 thin slice

- Flow nodes: `note`, `delay` / `wait`, `switch`, `foreach`, soft-check `try`, `subflow`, `log`, `inspect` / `preview`
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
