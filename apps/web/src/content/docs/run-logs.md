---
title: Run logs on disk
description: Timestamped per-step run folders for developers and testers
---

When enabled, each flow run writes a **new folder** under the workspace `runs/` directory (configurable) with one JSON file per executed step.

## Layout

<figure class="qs-filetree" aria-label="On-disk run log layout">
<pre class="qs-filetree__pre"><code><span class="qs-ft-dir">runs/</span>
  <span class="qs-ft-dir">login-and-profile/</span>
    <span class="qs-ft-dir">2026-08-02T14-30-05Z/</span>
      <span class="qs-ft-file">meta.json</span>
      <span class="qs-ft-file">001-start.json</span>
      <span class="qs-ft-file">002-input.json</span>
      <span class="qs-ft-file">003-login.json</span>
      <span class="qs-ft-file">…</span></code></pre>
</figure>

Each step file includes:

| Field | Meaning |
| --- | --- |
| `input` | Wire input to the node |
| `processedInput` | Template-resolved config (for `http`, the request snapshot) |
| `output` | Node output (or partial on failure) |
| `error` | Failure message, if any |

Authorization headers and workspace secret string values are redacted as `***`. Run folders may still contain sensitive business data — keep `runs/` gitignored (scaffolded by `quester init`).

## Enable

In `quester.json`:

```json
{
  "runs": { "enabled": true, "dir": "runs" }
}
```

Or per CLI invocation:

```bash
bunx quester run login-and-profile \
  --workspace ./my-workspace \
  --env local \
  --runs-dir runs
```

Desktop honors `runs.enabled` in **Workspace settings → Runs**. After a run, the Response panel shows the folder path with **Open folder**.

## Continuous integration

Upload the `runs/` directory as a job artifact when investigating suite failures. See [Suites](../suites/) and [Getting started](../getting-started/).
