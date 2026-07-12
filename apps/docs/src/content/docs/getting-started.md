---
title: Getting started
description: Run and validate flows with the Quester CLI
---

## Install

```bash
bun install
bun run build
```

## Validate a workspace

```bash
bunx quester validate examples/sample-workspace
```

## Run a flow

```bash
bunx quester run examples/sample-workspace/flows/login-and-profile.flow.json \
  --workspace examples/sample-workspace \
  --env local \
  --input '{"username":"demo","email":"demo@example.com"}'
```

## Learn more

- [Workspace files](/workspace/) — `quester.json`, flows, layout
- [Environments & secrets](/workspace-secrets/) — `{{env.*}}` and `{{secrets.*}}`
- [Collections & requests](/collections/) — standalone `*.request.json`
- [Template syntax](/templates/) — `{{input.*}}` vs previous / `{{nodes.*}}`
- [Nodes](/nodes/) — every builtin type with input/output examples
- [extract](/nodes/extract/) — JMESPath on the previous node only
