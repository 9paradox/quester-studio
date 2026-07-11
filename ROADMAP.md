# Quester Studio Roadmap

> Living document. Trackable work lives in [GitHub Issues](https://github.com/9paradox/quester-studio/issues).  
> Last updated: 2026-07-11

## Now (v0.2.0 — Desktop MVP)

- [x] Electrobun IPC — expose main-process RPCs to renderer
- [x] Workspace folder picker — open real `quester.json` workspace
- [x] Flow list + loader — canvas loads selected `*.flow.json`
- [x] Run panel — env selector, JSON input, `executeFlowRpc`, output display

## Next (v0.3.0 — Builder UX)

- [ ] Custom React Flow `nodeTypes` per builtin (`http`, `input`, `if`, …)
- [ ] If-node dual handles (`true` / `false` branches)
- [ ] Node inspector — edit `data` fields inline
- [ ] Save flow back to disk (git-friendly JSON)

## Later (v0.4.0 — Platform)

- [ ] New node types (e.g. `delay`, `json-parse`)
- [ ] CLI `quester init` — scaffold workspace
- [ ] Renderer smoke tests
- [ ] Per-node reference pages in docs (from emitted schemas)

## Ideas (backlog)

- OAuth / auth helper nodes
- Flow run history and replay
- Workspace secret encryption at rest
- VS Code extension for flow editing

## Shipped

### v0.1.0 (in progress)

- Governance foundation: CI, docs, security, release tooling
- CLI `validate` / `run`, schema validation, sample workspace
- Desktop main-process stubs and static React Flow view

## Milestones

| Milestone | Theme |
|-----------|-------|
| v0.1.0 | Foundation — CI, docs, security, first release |
| v0.2.0 | Desktop MVP — IPC, workspace, run panel |
| v0.3.0 | Builder UX — custom nodes, inspector, save |
| v0.4.0 | Platform — new nodes, `quester init`, docs |
| v1.0.0 | Stable — flow format v1 freeze, polished desktop |
