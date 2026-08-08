# Quester Studio Roadmap

> Living document. Trackable work lives in [GitHub Issues](https://github.com/9paradox/quester-studio/issues).  
> Known bugs: [BUGS.md](BUGS.md).  
> Last updated: 2026-08-08

**Now:** v0.6.0 — stay on **0.6.x** / slow **0.x.x**. No jumps to 0.7 / 0.8 / 0.9 until polished end-to-end (desktop → web → docs).

**Build plans:** open one at a time by priority — [.cursor/plans/](./.cursor/plans/README.md) (starts with `01-stability-critical`).

## Todos (priority order)

### 1. Stability

Burn down [BUGS.md](BUGS.md) before new feature work. Audit 2026-08-08.

**Critical / high**

- [x] B4 — Engine fan-in join semantics (diamond DAG) + regression tests
- [x] B5 — Desktop `executeFlowRpc` 30s timeout (long runs / Stop)
- [x] B6 — Hero sample + Try path credentials (`login-and-profile` vs `input` / secrets)
- [x] B7 — Redact secrets in UI / RPC logs (parity with disk run logs)
- [x] B8 — Gate Mod+Enter double-run; scope Stop / `isRunning`; cancel on workspace close
- [x] B16 — `apps/api` localhost-dev only — document + guardrails (`SECURITY.md`)

**Medium**

- [x] B9 — Abortable `delay` + cap `ms`  
- [x] B10 — Safe flow / env / secrets path ids (no `..` escape)  
- [x] B11 — Cookie jar final URL + Secure / Path  
- [x] B12 — CLI `environmentsDir` + shared cookie jar parity with desktop  
- [x] B13 — `try` catch semantics — docs/UX clarified (soft-check only); full exception boundary → framed containers (§6 / plan 09)  
- [x] B14 — Exclude `*.secrets.json` from desktop sample sync  
- [x] B15 — Template: document eta-as-code + `mode: "eta" \| "safe"` (default eta; safe = `{{…}}` only)  
- [x] B17 — Web roadmap / Try / Guide / checksum / import-collection docs drift  

**Ongoing**

- [ ] Harden `foreach` / `subflow` / abort edges covered by tests  
- [ ] Reliable save / reload / workspace open on desktop  
- [ ] Suite / CI smoke green on sample workspace  

### 2. Performance

- [ ] Profile desktop canvas — large flow pan/zoom/select stays smooth  
- [ ] Defer canvas position commits to drag-end (avoid per-frame full-flow stringify)  
- [ ] Profile inspector / response panel — large JSON and long logs don’t freeze UI  
- [ ] Performant JSON viewer (collections + response) — Monaco-class editor/viewer; virtualize / lazy parse large payloads  
- [ ] Lazy / truncate on-canvas `json` / `inspect` viewers  
- [ ] Engine memory & speed — big responses, long suites, many nodes; default `maxResponseBytes`  
- [ ] Avoid unnecessary re-renders / IPC chatter on run status updates  
- [ ] Fast workspace load (many flows / collections / run history)  
- [ ] CLI suite performance for CI-scale smoke runs  

### 3. Desktop UI/UX

**Builders & viewers**

- [ ] Collections — proper, performant JSON viewer/editor (e.g. `@monaco-editor/react` or equivalent): syntax highlight, fold, search, large-body safe  
- [ ] Forms — first-class workspace section (alongside collections / flows): create & edit in a form builder; store as workspace files; drag onto canvas as a node that can replace / stand in for `input` (structured fields → run payload)  
- [ ] Response viewer — open in a new app tab (full-bleed JSON / pretty / headers; keep current panel for quick peek)  
- [ ] Folder logs viewer — browse `runs/` (and related log folders): JSON raw **or** structured UI; multi-tab for multiple files/runs  
- [ ] Flow drag-and-drop onto canvas — drag a flow from the sidebar/list to open or nest/`subflow` placement (define UX: open tab vs drop as `subflow` node)  
- [ ] Form / code drag-and-drop onto canvas — same sidebar → canvas DnD pattern as flows/collections  
- [ ] Nodes UI enhance — clearer chrome, status, handles, and type identity on canvas; better selected / running / error states  
- [ ] Later: optional Monaco (or shared Monaco-class editor from collections) for large `template` / code-like inspector fields — after JSON viewers; keep CodeMirror for compact fields; pairs with `code` node editor  

**Run UX**

- [ ] Node run animation — subtle in-progress / success / fail motion on canvas nodes while a flow runs (performant; no jank on large graphs)  
- [ ] Run status panel — compact list of **all** nodes for the active run (order, type/name, state, duration); easy scan  
- [ ] Assert visibility — every `assert` / check outcome in that list (pass/fail + message), not only the last error  
- [ ] Final overall status — clear run rollup (success / failed / cancelled) with counts (passed asserts, failed nodes, timing)  

**Canvas & editor**

- [ ] Canvas ergonomics — selection, multi-select, alignment, edge editing feel solid  
- [ ] Inspector depth — clear forms per node; fewer dead ends / empty states  
- [ ] Run / debug clarity — status, errors, stop, replay easy to follow (depends on B5/B8; ties to Run UX above)  
- [ ] Per-flow console lines (global `consoleLines` isolation gap after B3)  
- [ ] Template / JMESPath assist polish beyond v1  
- [ ] Command palette + shortcuts coverage for everyday actions  
- [ ] Preferences / settings discoverability and consistency  
- [ ] Welcome / empty / error states that explain the next action  

### 4. Web UI/UX

- [ ] Marketing / product site — clear positioning, mobile-friendly, fast  
- [ ] Docs app UX — nav, search, readability on desktop and mobile  
- [ ] Align site roadmap + Guide first-flow with shipped 0.6.x (see B6/B17)  
- [ ] macOS download/Guide parity; correct Linux artifact names  
- [ ] Capture remaining UI screenshots (`canvas`, `inspector`, `run-panel`)  
- [ ] Visual consistency with desktop brand/tokens where shared  
- [ ] `dev:web` / API-backed studio path polish (when used for development)  
- [ ] Extract / polish `studio-web` shell only when desktop quality bar isn’t blocked  

### 5. Docs

- [ ] Fix Try path — credentials story, `hello.flow.json` CLI snippet, first-flow choice (B6/B17)  
- [ ] Per-node reference complete and in sync with schema/behavior (incl. `try` semantics)  
- [ ] Document `quester import-collection` in collections / getting-started  
- [ ] Scenario testing guides match sample workspace  
- [ ] Concepts — templates, env, runs, cookies, HTTP inheritance  
- [ ] SECURITY — Eta/template `mode` + docs (B15); `code` node isolation; `apps/api` localhost-dev (B16 done)  
- [ ] Changelog / release notes readable for each 0.6.x ship  

### 6. More & better nodes

**Auth**

- [ ] `bearer` / `basicAuth` / `apiKey` helpers  
- [ ] `oauth2` helper (bounded scope; document trust model)  

**HTTP / API**

- [ ] `pagination`  
- [ ] `multipart` / `form`  
- [ ] `graphql`  

**Control**

- [ ] Framed `try` / `foreach` — subgraph containers (no dual mode; body required)  
  - [ ] Schema — `parentId` (+ optional `extent`) on flow nodes; children only under `try` / `foreach`; forbid edges leaving the frame except via container handles  
  - [ ] Engine — `try` runs body once; throw → `failed`, else `success` (real error boundary; closes B13)  
  - [ ] Engine — `foreach` runs body per item (`item` / `index`); single `complete` exit with collected `results`  
  - [ ] Desktop canvas — resizable frame nodes; drag into / out of parent; handles: try `success`/`failed`, foreach `complete`  
  - [ ] Inspector — container fields only (`items`, caps, label, …); drop soft-guard condition/checks on `try` and map-only empty `foreach`  
  - [ ] Migrate samples + docs; validate errors on legacy soft-`try` / map-only `foreach`; soft branching stays on `if`  
- [ ] `parallel`  
- [ ] `loop` / `while` (max-iteration / timeout limits per SECURITY.md)  

**Data**

- [ ] `pick` / `omit`  
- [ ] `uuid` / `timestamp` / `random`  
- [ ] `schema` validation node  
- [ ] Richer query helpers where JMESPath isn’t enough  

**Forms & custom code**

- [ ] `form` node — references a workspace form; at run time collects / supplies structured input (replacement path for plain `input` where a UI form is preferred)  
- [ ] Form schema + editor — field types, validation, defaults; CLI/`quester run` can still supply JSON that matches the form  
- [ ] `code` node — custom function (JS first; other languages only if isolation story is solid)  
  - [ ] Secure isolated runtime (no ambient FS/network unless explicitly gated); timeouts + memory caps; document in SECURITY.md  
  - [ ] Monaco-class editor with syntax highlighting when editing the node / opened as a tab  
  - [ ] Clear I/O contract (input → return value / error); drag from palette or saved snippets onto canvas  

### 7. AI options

- [ ] Opt-in only; no cloud requirement for core product  
- [ ] Provider + API key UX (remote models; local models later)  
- [ ] Assist: JMESPath from NL — JSON → schema (structure only) + prompt → expression (same pattern as json-query-flow)  
- [ ] Docs + SECURITY notes for AI data leaving the machine  
- [ ] Later: explain failed run / node error  
- [ ] Later: generate or edit a flow from a short prompt  

### 8. MCP integration

- [ ] MCP server — shared tools + CLI `mcp serve` (list / read / validate / run / last-run inspect, scoped)  
- [ ] MCP write/patch flow tools for agent authoring (validate + path scoping)  
- [ ] Desktop discovery/config + “AI following” canvas UX (reload on file edits)  
- [ ] MCP client — call MCP tools from a flow (or dedicated node)  
- [ ] Auth / trust boundaries documented (local-first)  
- [ ] Sample + docs for agent + Quester workflows (Cursor / VS Code / Claude)  

## Later

- Workspace secret encryption at rest  
- VS Code extension for flow editing  
- Client certificates (mTLS)  
- Remappable shortcuts  
- Platform / SaaS — `studio-web` extract, self-host packaging, multi-tenant, SECURITY.md for server-side  
- Node candidates — generic `group`/`frame` (beyond `try`/`foreach` containers), `gate`/`breakpoint`, `csv`/`table`, `hash`/`sign`, `diff`, `mock`, `websocket`, `metric`/`chart`  

## Done

### v0.6.0

- `foreach`, `try`/`catch`, `subflow`; run history/replay; `log`; `inspect`; disk cookies  
- Scenario testing — suite CLI, file run logs, CI docs, hero sample  
- Flow format `v1` freeze line; macOS desktop artifact; Postman import  

### Earlier

- **v0.5** — `note`, `delay`, `switch`; desktop polish (B1–B3, stop, palette, JMESPath assist)  
- **v0.4** — collections, assert/transform/merge/json, HTTP settings, `quester init`, public preview  
- **v0.3** — custom nodes, inspector, save, palette DnD  
- **v0.2** — desktop MVP (IPC, workspace, run panel)  
- **v0.1** — foundation (CI, CLI validate/run, schema, sample)  
