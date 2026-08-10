# Security Policy

## Reporting a vulnerability

Please report security issues **privately** via [GitHub Security Advisories](https://github.com/9paradox/quester-studio/security/advisories/new).

Do not open public issues for undisclosed vulnerabilities.

We aim to acknowledge reports within 7 days and provide a fix or mitigation plan as soon as practical.

## Secrets handling

- Workspace secrets live in `environments/<env>.secrets.json` — **gitignored**.
- Use `*.secrets.json.example` templates for documentation; never commit real values.
- Do not commit `.env`, API tokens, or credentials.

Quester does not encrypt secrets at rest. Protect workspace directories with OS-level permissions.

## Flow execution trust model

- **HTTP nodes** can request any `http:` or `https:` URL after template resolution.
- Quester does **not** sandbox network egress. Users are responsible for URLs their flows call.
- Flows run with the privileges of the user running the CLI or desktop app.
- **Templates:** Ordinary `{{env.*}}` / `{{input.*}}` / `{{nodes.*}}` / `{{vars.*}}` / `{{secrets.*}}` fields are **interpolation only** (no arbitrary JS).
- The **`template` node** defaults to `mode: "eta"`, which runs [Eta](https://eta.js.org/) in-process (`<% %>`, `<%= it.* %>`). That is **in-process JavaScript**, not a sandbox. Prefer `mode: "safe"` for interpolation-only bodies. Treat imported or third-party flows like untrusted code.
- Full isolation for arbitrary user code is a separate future capability (planned `code` node), not claimed here.

## Loops, composition, and resource caps

These limits reduce accidental or malicious resource exhaustion from flow graphs. They are not a sandbox.

- **`foreach`**: `maxItems` defaults to `100` and must be ≤ `10000`. `concurrency` (when set) must be ≤ `32`. Abort/Stop cancels in-flight item work when an `AbortSignal` is provided.
- **`subflow`**: maximum call depth is `5`. Cycles in the call stack (A → B → A) are rejected.
- There is **no** separate per-foreach wall-clock timeout; cancel a run with Stop / `AbortSignal` instead.
- Cookie jars persist under `.quester/` in the workspace; treat that directory as workspace-local state (may hold session cookies).
- MCP tool activity is appended to `.quester/mcp-activity.jsonl` (summaries only — tool name, flow/node ids, ok/error). Do not put secrets in tool argument summaries.

## TLS certificate verification

- By default, HTTPS requests **verify** TLS certificates.
- Precedence (first match wins for “insecure”):
  1. Process env: `QUESTR_INSECURE_TLS=1` or `NODE_TLS_REJECT_UNAUTHORIZED=0`
  2. Workspace / flow `settings.http.verifyTls` when set (`false` disables verify for that run)
  3. Desktop App Preferences → **SSL certificate verification** (machine-local)
- Prefer a workspace `settings.http.caFile` (PEM CA bundle, path relative to the workspace root) over disabling verification.
- Disabling verification exposes you to man-in-the-middle risk.
- If a run fails with a certificate error while verification is on, Quester logs a hint to fix the CA store, set `caFile`, or turn verification off.

## HTTP proxy

- Optional `settings.http.proxyUrl` (workspace or flow) routes HTTPS/HTTP through that proxy for the run.
- Treat proxy endpoints as trusted infrastructure; they can see request metadata and (for HTTPS MITM proxies) content if you also disable TLS verify.

## Desktop downloads

Desktop release artifacts are **unsigned development builds**. Verify checksums published on GitHub Releases before running. See your platform documentation for running unsigned applications safely.

## Local HTTP API (`apps/api`)

`@quester-studio/api` is a **localhost development** surface over workspace-service. It is **not** a multi-tenant or internet-facing product.

- **No authentication** — any client that can reach the server can list/load flows, run them, and read/write secrets.
- **Default bind:** `127.0.0.1` only. Binding beyond loopback (e.g. `0.0.0.0`) is refused unless `QUESTER_API_ALLOW_REMOTE=1` (logs a loud warning).
- **CORS** allows loopback browser origins only (not reflective remote `Origin`).
- When `QUESTER_WORKSPACE_ROOT` is set, request `workspace` / `path` values outside that directory are rejected.
- Do not expose this API on a network, reverse proxy, or tunnel until auth and isolation exist.

## MCP server (`quester mcp serve`)

The MCP server speaks **stdio** to a local agent host (Cursor, VS Code, Claude Desktop). It is workspace-scoped (`--workspace` / `QUESTER_WORKSPACE`).

- Flow ids and run paths are confined to the workspace root (no path escape).
- Tools include read, validate, run, write/patch, and authoring helpers (`suggest_jmespath`, `patch_node`, …).
- **`run_flow` has the same trust class as CLI `quester run`**: it loads secrets and may perform network I/O configured by the flow.
- **Agent-visible privacy:** MCP tools must **not** return secret store values or env/secret file contents. Run/HTTP bodies are returned as **TypeScript types / JSON Schema / path lists** by default. Opt-in `includeValues=true` returns **redacted** samples only (sensitive keys + known secret strings scrubbed).
- Desktop tails `.quester/mcp-activity.jsonl` for the MCP panel; keep that file free of secret values and response bodies.
- Write tools validate against the flow schema before writing under `flowsDir` only.
- Do not expose MCP over an unauthenticated network transport.

## MCP client (flow `mcp` node)

Flows may call **external** MCP servers configured in workspace `settings.mcp.servers` (stdio command or HTTP URL). Treat that like HTTP egress: tool arguments and results may leave the machine, and third-party servers are not sandboxed by Quester.

## Supported versions

| Version | Supported |
|---------|-----------|
| latest release | Yes |
| older releases | Best effort |

Security fixes are released via semver patch versions using Changesets.
