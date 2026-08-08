# Bug tracker

Living list of known bugs and correctness issues. Prefer a GitHub Issue with `type:bug` when work starts; keep this file for quick triage.

| Severity | Meaning |
| --- | --- |
| **critical** | Wrong or unsafe execution; block release / fix ASAP |
| **high** | Major broken UX or data; next milestone |
| **medium** | Incorrect behavior with workaround |
| **low** | Polish, edge cases |

Source: full codebase audit 2026-08-08 (schema/nodes/engine, desktop, CLI/API, web/docs/samples).

---

## Open

### B4 — Engine fan-in race (diamond DAG)

| | |
| --- | --- |
| **Severity** | critical |
| **Area** | engine |
| **Status** | fixed |

After fan-out (`A→B`, `A→C`, then `B/C→D`), `D` can run when the first parent finishes. Input is only `incoming[0]`, not a join. Wrong inputs / incomplete `merge` on multi-in graphs.

**Example:** Graph `start→A→B`, `A→C`, `B→D`, `C→D`. If `B` finishes first, `D` may run with only `B`’s output; `C`’s result never joins. A `merge` at `D` can therefore miss half the diamond.

**Where:** `packages/engine/src/execute.ts`, `packages/engine/src/graph.ts` (`selectNextEdges`).

**Fix direction:** Run a node only when all relevant predecessors have completed (or forbid multi-in except documented join). Add diamond-graph tests in `execute.test.ts`.

---

### B5 — Desktop run RPC hard-timeout at 30s

| | |
| --- | --- |
| **Severity** | high |
| **Area** | desktop |
| **Status** | fixed |

`maxRequestTime: 30_000` on Electrobun RPC (`apps/desktop/src/main/index.ts`, `apps/desktop/src/renderer/lib/electrobun.ts`). Flows longer than ~30s fail in the UI while main may keep running; Stop becomes unreliable.

**Example:** Flow with `delay` 45s or a slow HTTP poll. At ~30s the renderer shows RPC timeout / failed run; main may still be executing. Stop often does nothing useful because UI and main disagree on run state.

**Fix direction:** Raise / redesign timeout for `executeFlowRpc`, or stream progress and complete when done; align cancel/orphan cleanup.

---

### B6 — Hero sample credentials mismatch (Try path)

| | |
| --- | --- |
| **Severity** | high |
| **Area** | examples, docs, web |
| **Status** | fixed |

`login-and-profile.flow.json` posts `{{secrets.username}}` / `{{secrets.password}}`, while sticky note, Guide, Try, README, and CLI `--input` examples imply Run panel / `{{input.*}}` credentials. Fresh Open sample has no secrets file → login fails. `kitchen-sink` and Download’s `demo-main-nodes` are correct.

**Example:** User opens sample, pastes `demo`/`demo` into Run input (as Guide/`--input` say). HTTP body still resolves `{{secrets.username}}` → empty → login 401. Same credentials work on `kitchen-sink` / `demo-main-nodes` because those use `{{input.*}}`.

**Where:** sample flow + smoke suite; `apps/web` try/guide; root/desktop READMEs.

**Fix direction:** Switch hero HTTP body to `{{input.*}}` (match kitchen-sink), **or** document secrets-first and stop advertising `--input` for that flow. Prefer demo-main-nodes as cold-start first flow in Guide.

---

### B7 — Secrets appear in UI / RPC run logs

| | |
| --- | --- |
| **Severity** | high |
| **Area** | workspace-service, desktop, engine |
| **Status** | fixed |

Disk run files redact via `collectSecretValues` / `redactForRunLog`. Live `node:after` / `node:error` and renderer console / `runHistory` keep resolved values (incl. `{{secrets.*}}`). Cookie headers not scrubbed on disk redaction either.

**Example:** Flow sets `Authorization: Bearer {{secrets.apiToken}}`. On-disk run JSON shows `Bearer ***`. Panel / live RPC / `runHistory` still show the real token. `Set-Cookie` / `Cookie` headers can also remain plaintext on disk.

**Where:** `packages/workspace-service/src/service.ts`; `apps/desktop` store / Panel / `runHistory.ts`; `packages/engine/src/run-log.ts`.

**Fix direction:** Apply the same redaction path to RPC logs, UI history, and Cookie headers.

---

### B8 — Double-run / Stop race (Mod+Enter)

| | |
| --- | --- |
| **Severity** | high |
| **Area** | desktop |
| **Status** | fixed |

`selectCanRun` ignores `isRunning`; Mod+Enter can start overlapping runs. `finally` clears `isRunning` without matching `activeRunId`. Workspace switch/close does not cancel in-flight runs.

**Example:** Hit Mod+Enter twice quickly → two `executeFlowRpc` calls race; Response/Logs interleave. Or: start a long run, switch workspace → old run keeps going; its `finally` can clear `isRunning` for the new context. Stop may target the wrong run.

**Where:** `apps/desktop/src/renderer/stores/selectors.ts`, `commands.ts`, `quester-store.ts`.

**Fix direction:** Gate run on `!isRunning`; scope `finally` to `runId`; cancel on workspace close/switch.

---

### B9 — `delay` ignores AbortSignal; unbounded `ms`

| | |
| --- | --- |
| **Severity** | medium |
| **Area** | nodes, schema |
| **Status** | open |

Plain `setTimeout` in `packages/nodes/src/builtin/delay.ts`; schema `ms` unbounded. Stop during delay waits until sleep ends.

**Example:** Node `delay` with `ms: 60000`. User hits Stop at 1s → UI waits ~59s more until the timer fires. Schema also accepts extreme values (e.g. days of ms) with no cap.

**Fix direction:** Honor `ctx.signal`; cap `ms` in schema.

---

### B10 — Unsafe flow / env ids on disk write

| | |
| --- | --- |
| **Severity** | medium |
| **Area** | workspace-service, schema |
| **Status** | open |

`saveFlow` / env / secrets writers join filenames from ids without forbidding `..` / separators. Collections harden `..`; flows/envs do not. Malicious shared workspace can write outside `flowsDir`.

**Example:** Workspace `…/my-ws/` with `flowsDir: "flows"`. Flow id `"../outside"` → `join(root, "flows", "../outside.flow.json")` → `…/my-ws/outside.flow.json` (outside `flows/`). Same pattern for env/secrets writers.

**Where:** `packages/workspace-service/src/service.ts` (`saveFlow`, env/secrets writers); contrast `createCollection` which rejects `..`.

**Fix direction:** Reject unsafe relative ids (`..`, `/`, `\`) before join/write.

---

### B11 — Cookie jar uses request URL; weak Secure / Domain

| | |
| --- | --- |
| **Severity** | medium |
| **Area** | nodes |
| **Status** | open |

`storeFromSetCookie(url, …)` uses pre-redirect request URL after `fetch` follows redirects. `Secure` / `Domain` / `Path` not fully honored.

**Example:** Request `http://a.example/login` → 302 → `https://b.example/session` sets `Set-Cookie: sid=1; Secure`. Jar keys the cookie to `a.example` (request URL), may store `Secure` over http, and can send `sid` on later http calls to the wrong host/path.

**Where:** `packages/nodes/src/builtin/http.ts`, `cookie-jar.ts`.

**Fix direction:** Attribute with `Response.url`; honor `Secure` (and Path); add redirect tests.

---

### B12 — CLI secrets / cookie parity vs desktop

| | |
| --- | --- |
| **Severity** | medium |
| **Area** | cli, engine |
| **Status** | open |

CLI `loadSecrets(wsPath, env)` omits `manifest.environmentsDir`. CLI does not share one `cookieJar` across root + `createExecuteSubflow` (each subflow can get its own jar).

**Example:** Manifest sets `environmentsDir: "envs"` and secrets live under `envs/local.secrets.json`. Desktop loads them; `quester run` may miss them and resolve `{{secrets.*}}` empty. Login flow + subflow: root HTTP sets a session cookie; subflow HTTP gets a fresh jar → unauthenticated.

**Where:** `packages/cli/src/cli.ts`.

**Fix direction:** Pass `environmentsDir`; share jar like desktop.

---

### B13 — `try` does not catch thrown errors

| | |
| --- | --- |
| **Severity** | medium |
| **Area** | nodes, docs |
| **Status** | open |

`try` branches on condition/checks only. HTTP/`assert` throws still abort the flow as `FlowExecutionError`. Easy to misread as exception handling.

**Example:** `try` wrap around HTTP that 500s (or `assert` that fails). User expects catch branch; instead the whole run fails with `FlowExecutionError`. Catch only runs when soft condition/checks say so — not on thrown errors.

**Fix direction:** Either catch execute throws into catch branch, or document clearly as soft-check only and rename UX copy.

---

### B14 — Sample sync can bake maintainer secrets

| | |
| --- | --- |
| **Severity** | medium |
| **Area** | desktop |
| **Status** | open |

`apps/desktop/scripts/sync-sample-workspace.mjs` does not exclude `*.secrets.json`. Local maintainer builds with secrets present can ship them in `Resources/sample-workspace`. CI clean checkouts are usually fine.

**Example:** Maintainer has `examples/sample-workspace/environments/local.secrets.json` with a real API token. Local desktop build copies the whole sample tree → token lands in the installed `Resources/sample-workspace` bundle.

**Fix direction:** Exclude `*.secrets.json` (and ideally `runs/`); optionally seed from `.example` on Open sample.

---

### B15 — Template node = unsandboxed Eta JS

| | |
| --- | --- |
| **Severity** | medium |
| **Area** | nodes, SECURITY |
| **Status** | open |

`new Eta({ autoEscape: false })` + `renderString` allows `<% %>` code in flows. Local trust model allows powerful flows, but this is process JS, not mere `{{…}}` interpolation. Under-documented in `SECURITY.md`.

**Example:** Template body `<%= Bun.spawnSync(["whoami"]).stdout.toString() %>` (or other process JS) runs in-process when the node executes — far beyond `{{vars.name}}` substitution. Imported “untrusted” flows get the same power.

**Fix direction (decided: A + C):** Document eta-as-code in `SECURITY.md`. Add `mode: "eta" | "safe"` on the template node (default `"eta"` for back-compat); `"safe"` = `{{…}}` interpolation only and reject Eta tags. Import → force/warn `safe` is optional follow-up. No sandbox claim — isolation is plan 13. See `.cursor/plans/02-stability-medium.md`.

---

### B16 — `apps/api` unsafe for networked / multi-user use

| | |
| --- | --- |
| **Severity** | high (if exposed); OK as localhost-dev |
| **Area** | api, SECURITY |
| **Status** | fixed |

No auth; client-chosen workspace paths; full secrets over HTTP; reflective CORS + credentials; silent in `SECURITY.md`. Default bind `127.0.0.1` only.

**Example:** Bind/expose beyond loopback (or tunnel). Attacker POSTs `{ "workspace": "/home/you/.quester/…" }` and reads secrets over HTTP with no token. Browser origin reflection + credentials worsens CSRF-style abuse if ever non-localhost.

**Fix direction:** Document localhost-dev only; warn/refuse non-loopback without auth; jail under `QUESTER_WORKSPACE_ROOT`; lock CORS; update `SECURITY.md`. Do not treat as multi-tenant until auth + isolation exist.

---

### B17 — Web / docs Try path drift

| | |
| --- | --- |
| **Severity** | medium |
| **Area** | web, docs |
| **Status** | open |

Related to B6. Site roadmap still points at “v0.7 scenario testing”; Guide omits macOS; Try CLI snippet uses non-existent `example.flow.json`; checksum guidance without published files; Postman import undocumentated; UI screenshots incomplete.

**Example:** New user copies Try’s `quester run example.flow.json` → file not in repo. Guide never mentions macOS download. Site says “v0.7 scenario testing” while `ROADMAP.md` is on a different track.

**Fix direction:** Align web roadmap with repo `ROADMAP.md`; fix Try/Guide first-flow story; document `import-collection`; refresh download/OS notes.

---

## Fixed

### B1 — Windows installer shortcuts / DisplayIcon have no Quester icon

| | |
| --- | --- |
| **Severity** | medium |
| **Area** | desktop (NSIS) |
| **Status** | fixed |
| **Issue** | #87 |

NSIS installs `app.ico` and passes it to Desktop/Start Menu shortcuts and Apps & Features `DisplayIcon`. Electrobun also copies `assets/icon.ico` to `Resources/app.ico`.

### B2 — “Open sample” ENOENT on fresh install

| | |
| --- | --- |
| **Severity** | high |
| **Area** | desktop, workspace-service |
| **Status** | fixed |
| **Issue** | #88 |

Sample is synced into the desktop bundle (`Resources/sample-workspace`). Open sample copies to a writable user dir (`%APPDATA%/Quester/sample-workspace` on Windows).

### B3 — Run Response/Logs leak across flow tabs; no success toast

| | |
| --- | --- |
| **Severity** | high |
| **Area** | desktop |
| **Status** | fixed |
| **Issue** | #89 |

Run state is keyed by `flowId` (`runByFlowId`). Response/Logs use the active flow’s slot. Success uses `toast.success`; errors keep `toast.error`.

### BUG-001 — Dedicated `start` node; multi-root flows rejected

| | |
| --- | --- |
| **Severity** | critical |
| **Area** | schema, nodes, engine, desktop, docs |
| **Status** | fixed |

- Builtin `start` node (output only, emits `{}`)
- Exactly one `start`; ≤1 outgoing edge; no incoming edges
- Reachability and execution begin at `start`
- Desktop: scaffold `start → input`, block second start child / delete start / delete start / duplicate start
- Docs updated
