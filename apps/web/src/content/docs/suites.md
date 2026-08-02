---
title: Suites
description: Run multiple flows as a regression suite with the Quester CLI
---

A **suite** lists flows to run in order against one environment. Suites continue after a failure and exit non-zero if any flow failed — useful for testers and continuous integration.

## File format

Place suites under `suites/*.suite.json`:

```json
{
  "id": "smoke",
  "version": "v1",
  "name": "Smoke",
  "env": "local",
  "flows": [
    { "id": "demo-main-nodes" },
    {
      "id": "login-and-profile",
      "input": { "username": "emilys", "password": "emilyspass" }
    }
  ]
}
```

## Run

```bash
bunx quester suite smoke --workspace examples/sample-workspace
# or
bunx quester suite examples/sample-workspace/suites/smoke.suite.json \
  --workspace examples/sample-workspace \
  --report suite-report.json
```

When [run logs](../run-logs/) are enabled (`--runs-dir` or `quester.json` `runs.enabled`), each suite member writes its own timestamped folder.

## Sample

The sample workspace ships `suites/smoke.suite.json` with `demo-main-nodes` and `login-and-profile` (not `kitchen-sink` — too heavy for a smoke pass).

Live DummyJSON calls may fail on restricted continuous integration runners; prefer validating workspaces offline and running suites where network is allowed, or against your own environments.
