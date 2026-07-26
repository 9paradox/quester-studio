# Quester Studio Roadmap

> Living document. Trackable work lives in [GitHub Issues](https://github.com/9paradox/quester-studio/issues).  
> Known bugs: [BUGS.md](BUGS.md).  
> Last updated: 2026-07-26

## Now (v0.4.0 — Platform closeout + public test release)

Settings / HTTP MVP and related platform work already shipped (#49–#62). Remaining:

- [x] CLI `quester init` — scaffold workspace — #63
- [x] Desktop workspace welcome / empty state (first launch + close) — #69
- [x] Renderer smoke tests — #64
- [ ] First public test release — npm `@quester/*` + unsigned Windows/Linux desktop on GitHub Releases + [Try Quester](apps/docs/src/content/docs/try.md) docs — #65

### Release gate (before cutting v0.4.0)

Mechanical steps: [.cursor/skills/release-workflow/SKILL.md](.cursor/skills/release-workflow/SKILL.md). Workflow: `.github/workflows/release.yml` (`workflow_dispatch`).

- [ ] `main` CI green; `bun run lint && bun run test` locally
- [ ] Changesets version PR merged → package versions `0.4.0`
- [ ] Repo secret `NPM_TOKEN` present
- [ ] Run **Release** workflow with `version: 0.4.0`
- [ ] Verify GitHub Release assets downloadable; smoke-open desktop on Windows
- [ ] Docs “Try Quester” live on GitHub Pages
- [ ] Release notes include: development/unsigned build disclaimer; known limits (no macOS artifact, no code signing, secrets not encrypted at rest)

Desktop artifacts are **unsigned**. Testers should verify checksums when published (see [SECURITY.md](SECURITY.md)).

## Next

### v0.5.0 — Flow nodes

Canvas-only nodes must not break CLI runs.

- [ ] `note` — markdown/text sticky on canvas; no execute (or passthrough) — #66
- [ ] `delay` / `wait` — sleep N ms (optional jitter)
- [ ] `switch` — multi-branch on expression / status / JMESPath (extends `if` + `sourceHandle`)

### v0.6.0 — Control & composition

Loops need max-iteration / timeout limits (see [SECURITY.md](SECURITY.md)).

- [ ] `foreach` — iterate array; max items (+ optional concurrency)
- [ ] `try` / `catch` (or `onError`) — soft-fail / fallback branch
- [ ] `subflow` / `call` — run another `*.flow.json` with inputs; return output

### v0.7.0 — Runs & observability

- [ ] Flow run history and replay
- [ ] `log` — message + resolved template to run log (passthrough)
- [ ] `inspect` / `preview` — pinned pretty JSON on canvas
- [ ] Disk-persisted cookie jar

## Later / backlog

Unscheduled. Do not expand the current milestone without updating this file and opening an issue.

### Product

- Workspace secret encryption at rest
- VS Code extension for flow editing
- API collection import (also targeted for v1.0 thin slice)
- macOS desktop release artifact
- Client certificates (mTLS)
- Remappable shortcuts

### New node types

**Control flow:** `loop` / `while`, `parallel`, `group` / `frame`, `gate` / `breakpoint`  
**Data:** `pick` / `omit`, richer query, `csv` / `table`, `uuid` / `timestamp` / `random`, `hash` / `sign`, `diff`, `schema`  
**HTTP / API:** `graphql`, `multipart` / `form`, `pagination`, `mock`, `websocket` (post-v1)  
**Observability:** `metric`, `chart`  
**Auth helpers:** `oauth2`, `bearer` / `basicAuth`, `apiKey`

## Done

### v0.4.0 (in progress — shipped so far)

- Collections — standalone `*.request.json` + Request editor tab
- New node types (`assert`, `transform`, `merge`, `json`)
- Richer `if` / `assert` condition operators — #56
- Per-node reference pages in docs
- Details / Settings / Preferences layers; HTTP inheritance workspace → flow → node (#49–#53, #60)
- Flow HTTP settings UI, max response size, in-run cookie jar, proxy, `caFile`, scoped TLS, shortcuts prefs

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
| v0.6.0 | Control & composition — `foreach`, `try`/`catch`, `subflow` |
| v0.7.0 | Runs & observability — history/replay, `log`/`inspect`, disk cookies |
| v1.0.0 | Stable — flow format v1 freeze, polished desktop, thin collection import |
