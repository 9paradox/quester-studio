# Quester Studio Roadmap

> Living document. Trackable work lives in [GitHub Issues](https://github.com/9paradox/quester-studio/issues).  
> Known bugs: [BUGS.md](BUGS.md).  
> Last updated: 2026-08-02

## Now (v0.5.0 — Flow nodes)

Canvas-only nodes must not break CLI runs.

- [x] `note` — markdown/text sticky on canvas; no execute (or passthrough) — #66
- [x] `delay` / `wait` — sleep N ms (optional jitter)
- [x] `switch` — multi-branch on expression / status / JMESPath (extends `if` + `sourceHandle`)

### v0.5.x — Desktop polish

Parallel to v0.5 nodes (separate PRs). Release hotfixes first, then IDE-feel polish. Epic: #86. Bugs: [BUGS.md](BUGS.md) B1–B3. TLS verify stays On by default (not a code change).

**Release hotfixes**

- [x] B2 — Sample workspace in release + Open sample writable copy — #88
- [x] B1 — NSIS Desktop/Start Menu shortcut + DisplayIcon use installed `icon.ico` — #87
- [x] B3 — Per-flow run state + success/error toasts — #89

**Builder / IDE polish** (after B3 where noted)

- [x] Stop run — `AbortSignal` in engine + HTTP fetch; desktop Stop UI (needs B3)
- [x] Workspace chip in TopBar (name ▾ | tabs…)
- [x] Command registry + Ctrl/Cmd+Shift+P palette
- [x] More fixed shortcuts + Preferences Shortcuts table
- [x] Run summary in Response when no node selected (needs B3)
- [x] JMESPath assist v1 — snippets + path picker + inspector help

## v1.0.0 — Stable thin slice

- [x] Flow format freeze — `version: "v1"` in `*.flow.json` is frozen for the 1.0 line; only additive optional fields
- [x] macOS desktop release artifact (unsigned; CI `macos-latest` + Electrobun build)
- [x] Thin API collection import — `quester import-collection` (Postman v2.1) + desktop Collections **Import**

### v0.5.x — Desktop polish

Parallel to v0.5 nodes (separate PRs). Release hotfixes first, then IDE-feel polish. Epic: #86. Bugs: [BUGS.md](BUGS.md) B1–B3. TLS verify stays On by default (not a code change).

**Release hotfixes**

- [ ] B2 — Sample workspace in release + Open sample writable copy — #88
- [ ] B1 — NSIS Desktop/Start Menu shortcut + DisplayIcon use installed `icon.ico` — #87
- [ ] B3 — Per-flow run state + success/error toasts — #89

**Builder / IDE polish** (after B3 where noted)

- [ ] Stop run — `AbortSignal` in engine + HTTP fetch; desktop Stop UI (needs B3)
- [ ] Workspace chip in TopBar (name ▾ | tabs…)
- [ ] Command registry + Ctrl/Cmd+Shift+P palette
- [ ] More fixed shortcuts + Preferences Shortcuts table
- [ ] Run summary in Response when no node selected (needs B3)
- [ ] JMESPath assist v1 — snippets + path picker + inspector help

## Next

### v0.6.0 — Control & composition

Loops need max-iteration / timeout limits (see [SECURITY.md](SECURITY.md)).

- [x] `foreach` — iterate array; max items (+ optional concurrency)
- [x] `try` / `catch` (or `onError`) — soft-fail / fallback branch
- [x] `subflow` / `call` — run another `*.flow.json` with inputs; return output

### v0.7.0 — Runs & observability

- [x] Flow run history and replay
- [x] `log` — message + resolved template to run log (passthrough)
- [x] `inspect` / `preview` — pinned pretty JSON on canvas
- [x] Disk-persisted cookie jar

### v0.7.x — Scenario testing (developers, testers, business analysts)

Parallel to completed v0.7.0 observability. Messaging and sample polish ship first; product items as separate PRs.

- [x] Site / README / guide positioning toward scenario API testing
- [x] Hero sample path — `login-and-profile` (+ use-cases doc)
- [x] File run logging — timestamped `runs/` folders with per-step input / processedInput / output
- [x] Suite CLI — `quester suite` + sample smoke suite
- [x] Structured CLI failure reports (`--report json`)
- [x] Continuous integration docs + `quester validate` sample workspace in CI

## Later / backlog

Unscheduled. Do not expand the current milestone without updating this file and opening an issue.

### Product

- Workspace secret encryption at rest
- VS Code extension for flow editing
- Client certificates (mTLS)
- Remappable shortcuts

### Platform / SaaS (post-v1 track)

Separate from the local desktop product. Browser SPA + HTTP API; **no** live desktop bridge.

- [x] Shared `@quester-studio/api-contract` + `HttpQuesterClient` (HTTP JSON + SSE)
- [x] `@quester-studio/workspace-service` (FS workspace + execute; used by desktop + API)
- [x] `apps/api` Bun server (`QUESTER_WORKSPACE_ROOT`) + desktop `dev:web` against API
- [ ] Extract `apps/studio-web` / `packages/studio-ui` as the browser product shell
- [ ] Self-host packaging (single-node Linux VPS; static SPA + API)
- [ ] Hosted multi-tenant: auth/login, tenant isolation, cloud storage backend
- [ ] SECURITY.md updates for server-side execution and secrets

See [DEBUGGING.md](DEBUGGING.md) for setup / develop / debug per mode (desktop, API-only, UI+API).

### New node types

**Control flow:** `loop` / `while`, `parallel`, `group` / `frame`, `gate` / `breakpoint`  
**Data:** `pick` / `omit`, richer query, `csv` / `table`, `uuid` / `timestamp` / `random`, `hash` / `sign`, `diff`, `schema`  
**HTTP / API:** `graphql`, `multipart` / `form`, `pagination`, `mock`, `websocket` (post-v1)  
**Observability:** `metric`, `chart`  
**Auth helpers:** `oauth2`, `bearer` / `basicAuth`, `apiKey`

## Done

### v0.4.0 — Platform closeout + public preview

- Collections — standalone `*.request.json` + Request editor tab
- New node types (`assert`, `transform`, `merge`, `json`)
- Richer `if` / `assert` condition operators — #56
- Per-node reference pages in docs
- Details / Settings / Preferences layers; HTTP inheritance workspace → flow → node (#49–#53, #60)
- Flow HTTP settings UI, max response size, in-run cookie jar, proxy, `caFile`, scoped TLS, shortcuts prefs
- CLI `quester init` — scaffold workspace — #63
- Desktop workspace welcome / empty state — #69
- Renderer smoke tests — #64
- First public test release — npm `@quester-studio/*` + unsigned Windows/Linux desktop + [Try Quester](apps/web/src/content/docs/try.md) — #65

### v0.3.0 — Builder UX

- Custom React Flow `nodeTypes`, if true/false handles, save-to-disk, live run status
- Inspector, template autocomplete, theme settings, palette DnD

### v0.2.0 — Desktop MVP

- Electrobun IPC, workspace picker, flow list/loader, run panel

### v0.1.0 — Foundation

- CI, docs, security, release tooling
- CLI `validate` / `run`, schema validation, sample workspace
- Desktop stubs and static React Flow view

## Milestones

| Milestone | Theme |
|-----------|-------|
| v0.1.0 | Foundation — CI, docs, security, first tooling |
| v0.2.0 | Desktop MVP — IPC, workspace, run panel |
| v0.3.0 | Builder UX — custom nodes, inspector, save |
| v0.4.0 | Platform closeout + **public preview** — `quester init`, smoke tests, first GitHub/npm release |
| v0.5.0 | Flow nodes — `note`, `delay`, `switch` |
| v0.5.x | Desktop polish — install/sample hotfixes, runs/commands/workspace UX |
| v0.6.0 | Control & composition — `foreach`, `try`/`catch`, `subflow` |
| v0.7.0 | Runs & observability — history/replay, `log`/`inspect`, disk cookies |
| v0.7.x | Scenario testing — positioning, file run logs, suite CLI, CI docs |
| v1.0.0 | Stable — flow format v1 freeze, polished desktop, collection import, macOS artifact |
