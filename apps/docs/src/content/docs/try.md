---
title: Try Quester
description: Download the desktop app or CLI and smoke-test a workspace
---

Quester is a local-first visual API flow tool. This page is for **external testers** — download a build, open a workspace, run a flow, and file feedback.

> **Status:** The first public preview is planned as **v0.4.0**. Until that GitHub Release exists, build from source (see [Getting started](/getting-started/)) or watch [Releases](https://github.com/9paradox/quester-studio/releases).

## Desktop (preview)

1. Open the latest [GitHub Release](https://github.com/9paradox/quester-studio/releases).
2. Download the **Windows** or **Linux** desktop artifact (macOS is not published yet).
3. Builds are **unsigned development builds**. Prefer verifying published checksums when available. See [SECURITY.md](https://github.com/9paradox/quester-studio/blob/main/SECURITY.md) for the trust model and how to run unsigned apps safely on your OS.
4. Launch the app → open a workspace folder that contains `quester.json` (use the repo’s `examples/sample-workspace`, or after v0.4.0 run `quester init`).
5. Select a flow (e.g. `login-and-profile`) → pick env `local` → run.

### What to try

- Edit a node in the inspector and save the flow back to disk
- Run with env vars / secrets from the sample workspace
- Change workspace or flow HTTP settings (timeout, headers) and confirm they apply on run

### Known limits (preview)

- Unsigned desktop artifacts only (Windows + Linux)
- Secrets are not encrypted at rest (`*.secrets.json` is gitignored)
- No macOS release artifact yet

## CLI

After packages are published to npm (v0.4.0+):

```bash
bunx @quester/cli validate ./my-workspace
bunx @quester/cli run ./my-workspace/flows/example.flow.json \
  --workspace ./my-workspace \
  --env local \
  --input '{}'
```

Until then, clone the repo and follow [Getting started](/getting-started/).

## Feedback

- Bugs: [open an issue](https://github.com/9paradox/quester-studio/issues/new) with `type:bug` (or note findings in a PR discussion)
- Include OS, app/CLI version (release tag), and steps to reproduce
