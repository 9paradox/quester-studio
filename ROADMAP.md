# Quester Studio Roadmap

> Living document. Trackable work lives in [GitHub Issues](https://github.com/9paradox/quester-studio/issues).  
> Last updated: 2026-07-18

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
- [ ] Live node run status on canvas (idle / running / success / error / skipped) — #31
- [ ] Context-aware autocomplete for templates and output paths — #40
- [x] Settings activity view — theme (light / dark / system)
- [x] Node palette drag-and-drop onto canvas

## Later (v0.4.0 — Platform)

- [x] Collections — standalone `*.request.json` + Request editor tab
- [x] New node types (`assert`, `transform`, `merge`, `json`)
- [ ] CLI `quester init` — scaffold workspace
- [ ] Renderer smoke tests
- [x] Per-node reference pages in docs (hand-written; emit-from-schema optional follow-up)

## Known bugs (desktop)

- [x] Hardcoded req/resp placeholders in UI — #32
- [x] Canvas zoom not persisted — #33
- [x] Assert node UI layout incorrect — #34
- [x] Node accents use red/error-like colors (conflicts with fail status) — #35
- [x] Assert node input box broken — #36
- [x] Canvas nodes don’t match palette icons — #37

## Ideas (backlog)

- Graph/chart display node (parked from sidebar epic)
- OAuth / auth helper nodes
- Flow run history and replay
- Workspace secret encryption at rest
- VS Code extension for flow editing
- Postman/Bruno collection import

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
