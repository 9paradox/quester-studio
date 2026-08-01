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

Or install from npm (v0.4.0+) with Bun or npm:

```bash
bunx @quester-studio/cli --help
npx @quester-studio/cli --help
```

## Scaffold a workspace

```bash
bunx --bun quester init ./my-workspace
bunx --bun quester validate ./my-workspace
```

Creates `quester.json`, `flows/hello.flow.json` (`start` → `input`), `environments/local.json`, a secrets example, and `.gitignore` for `*.secrets.json`.

## Validate a workspace

```bash
bunx quester validate examples/sample-workspace
```

## Run a flow

Start with the short pedagogical sample:

```bash
bunx quester run examples/sample-workspace/flows/demo-main-nodes.flow.json \
  --workspace examples/sample-workspace \
  --env local
```

Auth + profile against [DummyJSON](https://dummyjson.com/docs):

```bash
bunx quester run examples/sample-workspace/flows/login-and-profile.flow.json \
  --workspace examples/sample-workspace \
  --env local \
  --input '{"username":"emilys","password":"emilyspass"}'
```

Longer walkthrough that hits every builtin (including a disconnected [`note`](../nodes/note/)) and most HTTP methods:

```bash
bunx quester run examples/sample-workspace/flows/kitchen-sink.flow.json \
  --workspace examples/sample-workspace \
  --env local \
  --input '{"username":"emilys","password":"emilyspass","productTitle":"Quester Pencil","searchQuery":"phone"}'
```

## Learn more

- [Try Quester Studio](../try/) — download desktop preview and tester checklist
- [Workspace files](../workspace/) — `quester.json`, flows, layout
- [Environments & secrets](../workspace-secrets/) — `{{env.*}}` and `{{secrets.*}}`
- [Collections & requests](../collections/) — standalone `*.request.json`
- [Template syntax](../templates/) — `{{input.*}}` vs previous / `{{nodes.*}}`
- [Nodes](../nodes/) — every builtin type with input/output examples
- [note](../nodes/note/) — canvas sticky (not executed)
- [extract](../nodes/extract/) — JMESPath on the previous node only
