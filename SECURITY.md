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

## Loops, composition, and resource caps

These limits reduce accidental or malicious resource exhaustion from flow graphs. They are not a sandbox.

- **`foreach`**: `maxItems` defaults to `100` and must be ≤ `10000`. `concurrency` (when set) must be ≤ `32`. Abort/Stop cancels in-flight item work when an `AbortSignal` is provided.
- **`subflow`**: maximum call depth is `5`. Cycles in the call stack (A → B → A) are rejected.
- There is **no** separate per-foreach wall-clock timeout; cancel a run with Stop / `AbortSignal` instead.
- Cookie jars persist under `.quester/` in the workspace; treat that directory as workspace-local state (may hold session cookies).

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

## Supported versions

| Version | Supported |
|---------|-----------|
| latest release | Yes |
| older releases | Best effort |

Security fixes are released via semver patch versions using Changesets.
