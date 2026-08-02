---
title: Getting started
description: Run and validate flows with the Quester CLI
---

Prefer a downloadable desktop build? See [Try Quester Studio](../try/), [Download](../../download/), or the [Guide](../../guide/).

## Install (from source)

```bash
bun install
bun run build
```

Or install from npm (v0.4.0+):

```bash
bunx @quester-studio/cli --help
```

## Scaffold a workspace

```bash
bunx --bun quester init ./my-workspace
bunx --bun quester validate ./my-workspace
```

Creates `quester.json`, `flows/hello.flow.json` (`start` → `input`), `environments/local.json`, a secrets example, and `.gitignore` for `*.secrets.json` and `runs/`.

## Validate a workspace

```bash
bunx quester validate examples/sample-workspace
```

## Run a scenario

Start with the hero auth chain:

```bash
bunx quester run examples/sample-workspace/flows/login-and-profile.flow.json \
  --workspace examples/sample-workspace \
  --env local \
  --input '{"username":"emilys","password":"emilyspass"}'
```

Short pedagogical sample:

```bash
bunx quester run examples/sample-workspace/flows/demo-main-nodes.flow.json \
  --workspace examples/sample-workspace \
  --env local
```

Longer walkthrough that hits every builtin (including delay, switch, try, foreach, subflow, log, inspect, and a disconnected [`note`](../nodes/note/)) and most HTTP methods:

```bash
bunx quester run examples/sample-workspace/flows/kitchen-sink.flow.json \
  --workspace examples/sample-workspace \
  --env local \
  --input '{"username":"emilys","password":"emilyspass","productTitle":"Quester Pencil","searchQuery":"phone"}'
```

### Run logs and reports

```bash
bunx quester run login-and-profile \
  --workspace examples/sample-workspace \
  --env local \
  --runs-dir runs \
  --report report.json
```

See [Run logs on disk](../run-logs/) and [Suites](../suites/).

## Continuous integration

Offline-safe validation in GitHub Actions:

```yaml
- name: Validate sample workspace
  run: bunx --bun quester validate examples/sample-workspace
```

Optional suite (needs network for DummyJSON):

```yaml
- name: Smoke suite
  run: bunx --bun quester suite smoke --workspace examples/sample-workspace --report suite-report.json
  continue-on-error: true
- uses: actions/upload-artifact@v4
  if: always()
  with:
    name: quester-runs
    path: examples/sample-workspace/runs/
    if-no-files-found: ignore
```

## Learn more

- [Who it’s for](../use-cases/) — developers, testers, and business analysts
- [How flows work](../concepts/) — connections, ports, wire vs `{{input.*}}` / `{{nodes.*}}`
- [Try Quester Studio](../try/) — download desktop preview and tester checklist
- [Workspace files](../workspace/) — `quester.json`, flows, layout
- [Environments & secrets](../workspace-secrets/) — `{{env.*}}` and `{{secrets.*}}`
- [Collections & requests](../collections/) — standalone `*.request.json`
- [Template syntax](../templates/) — scopes and JMESPath
- [Nodes](../nodes/) — every builtin type with ports
- [note](../nodes/note/) — canvas sticky (not executed)
- [extract](../nodes/extract/) — JMESPath on the wire (`body.id`, `products[0]`)
