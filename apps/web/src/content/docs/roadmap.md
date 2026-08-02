---
title: Roadmap
description: Planned features and milestones
---

High-level priorities. Full backlog: [GitHub Issues](https://github.com/9paradox/quester-studio/issues) and [ROADMAP.md](https://github.com/9paradox/quester-studio/blob/main/ROADMAP.md).

## Shipped — v0.5–v1 thin slice

- Flow nodes: `note`, `delay` / `wait`, `switch`, `foreach`, `try` / `catch`, `subflow`, `log`, `inspect` / `preview`
- Desktop polish: per-flow runs, Stop, command palette, tab reorder, run summary, JMESPath assist
- Observability: local run history / replay, disk cookie jar
- Stable path: flow format `v1` freeze note, unsigned macOS desktop artifact, thin Postman Collection import

## Next

### v0.7.x — Scenario testing

Positioning for developers, testers, and business analysts; on-disk run logs; suite CLI; continuous integration docs. See repo [ROADMAP.md](https://github.com/9paradox/quester-studio/blob/main/ROADMAP.md).

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
