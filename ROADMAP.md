# Quester Studio Roadmap

> Living document. Trackable work lives in [GitHub Issues](https://github.com/9paradox/quester-studio/issues).  
> Last updated: 2026-07-26

## Now (v0.4.0 — Platform)

- [x] Collections — standalone `*.request.json` + Request editor tab
- [x] New node types (`assert`, `transform`, `merge`, `json`)
- [ ] CLI `quester init` — scaffold workspace
- [ ] Renderer smoke tests
- [x] Per-node reference pages in docs (hand-written; emit-from-schema optional follow-up)

### Details, settings & preferences

Layers: **Details** (identity) → git files; **Settings** (runtime) → git files; **Preferences** (editor UX) → machine-local. Inheritance for HTTP: workspace → flow → node.

- [ ] Edit flow name & description — #49
- [ ] Workspace description in `quester.json` + editor — #50
- [ ] App / Workspace settings as editor tabs (move theme into App Preferences) — #51
- [ ] Workspace HTTP defaults (headers, timeout) + engine merge — #52
- [ ] TLS verification preference (app/workspace) + SECURITY.md — #53
- Later: flow-level HTTP overrides, max response size, cookie jar, proxy, certificates, shortcuts

## Done recently

### v0.3.0 — Builder UX

- [x] Custom React Flow `nodeTypes` per builtin (`http`, `input`, `if`, …)
- [x] If-node dual handles (`true` / `false` branches)
- [x] Node inspector — edit `data` fields, Help dialog, per-node Response view
- [x] Save flow back to disk (git-friendly JSON)
- [x] Live node run status on canvas (idle / running / success / error / skipped) — #31
- [x] Context-aware autocomplete for templates and output paths — #40
- [x] Settings activity view — theme (light / dark / system)
- [x] Node palette drag-and-drop onto canvas

### v0.2.0 — Desktop MVP

- [x] Electrobun IPC — expose main-process RPCs to renderer
- [x] Workspace folder picker — open real `quester.json` workspace
- [x] Flow list + loader — canvas loads selected `*.flow.json`
- [x] Run panel — env selector, JSON input, `executeFlowRpc`, output display

## Known bugs (desktop)

- [x] Hardcoded req/resp placeholders in UI — #32
- [x] Canvas zoom not persisted — #33
- [x] Assert node UI layout incorrect — #34
- [x] Node accents use red/error-like colors (conflicts with fail status) — #35
- [x] Assert node input box broken — #36
- [x] Canvas nodes don’t match palette icons — #37

## Ideas (backlog)

### Product

- Flow run history and replay
- Workspace secret encryption at rest
- VS Code extension for flow editing
- API collection import

### New node types (priority)

Canvas-only nodes should not affect CLI runs. Loops need max-iteration / timeout limits (see SECURITY.md).

1. **`note`** — markdown/text sticky on canvas; no execute (or passthrough)
2. **`switch`** — multi-branch on expression / status / JMESPath (extends `if` + `sourceHandle`)
3. **`delay` / `wait`** — sleep N ms (optional jitter) for rate limits and polling
4. **`foreach`** — iterate array; run steps per item (max items + optional concurrency)
5. **`chart`** — line / bar / pie from JSON path (display node; engine passes series data)
6. **`try` / `catch`** (or `onError`) — soft-fail / fallback branch on node or subgraph error
7. **`subflow` / `call`** — run another `*.flow.json` with inputs; return its output
8. Auth helpers — `oauth2`, `bearer` / `basicAuth`, `apiKey` (from secrets into headers/vars)

### New node types (later)

**Control flow**

- `loop` / `while` — repeat until condition or max iterations (poll job status)
- `parallel` — fan-out N requests, then join
- `group` / `frame` — visual-only container for large canvases
- `gate` / `breakpoint` — pause for human confirm in desktop runs

**Data & payloads**

- `pick` / `omit` — shape objects without a full `transform` script
- Richer query (`jq` or power-user JMESPath) if `extract` stays simple
- `csv` / `table` — CSV ↔ JSON rows for fixtures and bulk cases
- `uuid` / `timestamp` / `random` — generate IDs and dates for bodies
- `hash` / `sign` — HMAC, SHA, base64 for webhook signatures
- `diff` — compare two node outputs (regression / contract)
- `schema` — validate payload against JSON Schema

**HTTP / API**

- `graphql` — query + variables
- `multipart` / `form` — file + fields upload helper
- `cookieJar` — persist cookies across hops in one run
- `pagination` — cursor / page / link-header loop (or specialize `foreach`)
- `mock` — fixed status/body without network (offline / CI)
- `websocket` — connect, send, collect N messages (harder; post-v1)

**Observability / DX**

- `log` — message + resolved template to run log (passthrough)
- `inspect` / `preview` — pinned pretty JSON on canvas
- `metric` — capture duration / status into run summary

## Shipped

### v0.3.0

- Custom per-builtin canvas nodes, if true/false handles, save-to-disk, live run status
- Inspector, template autocomplete, theme settings, palette DnD

### v0.2.0

- Electrobun IPC, workspace picker, flow list/loader, run panel

### v0.1.0

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
