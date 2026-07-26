---
title: Getting started
description: Run and validate flows with the Quester CLI
---

Prefer a downloadable desktop build? See [Try Quester](/try/).

## Install (from source)

```bash
bun install
bun run build
```

After **v0.4.0** npm publish, you can also run the CLI without cloning:

```bash
bunx @quester/cli --help
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
  --input '{"username":"emilys","password":"emilyspass"}'
```

For a longer walkthrough that hits every builtin node and most HTTP methods against [DummyJSON](https://dummyjson.com/docs):

```bash
bunx quester run examples/sample-workspace/flows/kitchen-sink.flow.json \
  --workspace examples/sample-workspace \
  --env local \
  --input '{"username":"emilys","password":"emilyspass","productTitle":"Quester Pencil","searchQuery":"phone"}'
```

## Learn more

- [Try Quester](/try/) — download desktop preview and tester checklist
- [Workspace files](/workspace/) — `quester.json`, flows, layout
- [Environments & secrets](/workspace-secrets/) — `{{env.*}}` and `{{secrets.*}}`
- [Collections & requests](/collections/) — standalone `*.request.json`
- [Template syntax](/templates/) — `{{input.*}}` vs previous / `{{nodes.*}}`
- [Nodes](/nodes/) — every builtin type with input/output examples
- [extract](/nodes/extract/) — JMESPath on the previous node only
