---
title: Try Quester Studio
description: Download the desktop app or CLI and smoke-test a workspace
---

**Quester Studio** is a local-first visual API flow tool. This page is for **external testers** — download a build, open a workspace, run a flow, and file feedback.

Also see [Download](../../download/), [Guide](../../guide/), and [UI reference](../ui/).

> **Status:** Public preview **[v0.5.0](https://github.com/9paradox/quester-studio/releases/tag/v0.5.0)** — unsigned Windows/Linux/macOS desktop on GitHub Releases, and `@quester-studio/*` on npm. Prefer verifying published checksums when available.

## Desktop (preview)

1. Prefer the product [Download](https://9paradox.com/quester-studio/download/) page, or open the latest [GitHub Release](https://github.com/9paradox/quester-studio/releases) (current: [v0.5.0](https://github.com/9paradox/quester-studio/releases/tag/v0.5.0)).
2. Download a desktop artifact for your OS:
   - **Windows:** `Quester-*-win-x64-setup.exe` (NSIS installer) or `Quester-*-win-x64-portable.zip` (extract, run `Quester\bin\launcher.exe`). Older builds used `stable-win-x64-Quester-Setup.zip`.
   - **Linux:** `stable-linux-x64-Quester-Setup.tar.gz` (or the matching `.tar.zst` / update JSON for your arch).
   - **macOS:** unsigned `.app` / setup artifact from the release (Electrobun build).
3. Builds are **unsigned development builds**. See [SECURITY.md](https://github.com/9paradox/quester-studio/blob/main/SECURITY.md) for the trust model and how to run unsigned apps safely on your OS.
4. Launch Quester Studio. On first open you see a welcome screen: **Open workspace**, **Create workspace**, or **Open sample**. Closing a workspace returns here.
5. Select a flow (e.g. `demo-main-nodes` from the sample, or `hello` from create) → pick env `local` → run. Connection rules and wire vs templates: [How flows work](../concepts/).

### What to try

- Edit a node in the inspector and save the flow back to disk
- Run with env vars / secrets from the sample workspace
- Change workspace or flow HTTP settings (timeout, headers) and confirm they apply on run
- Confirm you can tell apart: Run panel fields (`{{input.productId}}`), the `input` node, and JMESPath on the wire after HTTP (`body.title`, not a template)

### Known limits (preview)

- Unsigned desktop artifacts only (Windows + Linux + macOS)
- Secrets are not encrypted at rest (`*.secrets.json` is gitignored)

## CLI

```bash
bunx @quester-studio/cli validate ./my-workspace
bunx @quester-studio/cli run ./my-workspace/flows/example.flow.json \
  --workspace ./my-workspace \
  --env local \
  --input '{}'
```

Or clone the repo and follow [Getting started](../getting-started/).

## Feedback

- Bugs: [open an issue](https://github.com/9paradox/quester-studio/issues/new) with `type:bug` (or note findings in a PR discussion)
- Include OS, app/CLI version (release tag), and steps to reproduce
