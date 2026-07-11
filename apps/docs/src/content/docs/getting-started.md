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
bunx quester run examples/sample-workspace/flows/login-and-profile.flow.json --env local --input '{"username":"demo","email":"demo@example.com"}'
```
