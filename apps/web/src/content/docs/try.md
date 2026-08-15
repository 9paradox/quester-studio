---
title: Try Quester Studio
description: Download the desktop app or CLI and smoke-test a workspace
---

**Quester Studio** is a local-first visual API flow tool. This page is for **external testers** — download a build, open a workspace, run a flow, and file feedback.

Also see [Download](../../download/), [Guide](../../guide/), and [UI reference](../ui/).

> **Status:** Public preview **[v0.6.2](https://github.com/9paradox/quester-studio/releases/tag/v0.6.2)** — unsigned Windows/Linux/macOS desktop on GitHub Releases, and `@quester-studio/*` on npm. Verify checksum files when the release attaches them; not every release publishes checksums.

## Desktop (preview)

1. Prefer the product [Download](https://9paradox.com/quester-studio/download/) page, or open the latest [GitHub Release](https://github.com/9paradox/quester-studio/releases) (current: [v0.6.2](https://github.com/9paradox/quester-studio/releases/tag/v0.6.2)).
2. Download a desktop artifact for your OS:
   - **Windows:** `Quester-*-win-x64-setup.exe` (NSIS installer) or `Quester-*-win-x64-portable.zip` (extract, run `Quester\bin\launcher.exe`). Older builds used `stable-win-x64-Quester-Setup.zip`.
   - **Linux:** `stable-linux-x64-Quester-Setup.tar.gz` (or the matching `.tar.zst` / update JSON for your arch).
   - **macOS:** unsigned `.app` / setup artifact from the release (Electrobun build).
3. Builds are **unsigned development builds**. See [SECURITY.md](https://github.com/9paradox/quester-studio/blob/main/SECURITY.md) for the trust model and how to run unsigned apps safely on your OS.
4. Launch Quester Studio. On first open you see a welcome screen: **Open workspace**, **Create workspace**, or **Open sample**. Closing a workspace returns here.
5. Select a flow (prefer `login-and-profile` from the sample for a real auth chain, `demo-main-nodes` to learn nodes, or `search-pick-cart` / `forms-showcase` for mid-flow forms) → pick env `local` → run. Connection rules and wire vs templates: [How flows work](../concepts/).

### What to try

- Edit a node in the inspector and save the flow back to disk
- Run with env vars / secrets from the sample workspace
- Change workspace or flow HTTP settings (timeout, headers) and confirm they apply on run
- Confirm you can tell apart: Run panel fields (`{{input.productId}}`), the `input` node, and JMESPath on the wire after HTTP (`body.title`, not a template)
- Run `search-pick-cart` or `forms-showcase` — submit each form step in the desktop UI (or pass `--forms` on CLI)
- Open `nested-frames` to see nested `foreach` → `try` framed containers on the canvas

### Known limits (preview)

- Unsigned desktop artifacts only (Windows + Linux + macOS)
- Secrets are not encrypted at rest (`*.secrets.json` is gitignored)

## CLI

After cloning the [sample workspace](https://github.com/9paradox/quester-studio/tree/main/examples/sample-workspace) (or using **Open sample** in the desktop app):

```bash
bunx @quester-studio/cli validate ./examples/sample-workspace
bunx @quester-studio/cli run ./examples/sample-workspace/flows/login-and-profile.flow.json \
  --workspace ./examples/sample-workspace \
  --env local \
  --input '{"username":"emilys","password":"emilyspass"}'
```

Import a Postman collection into a workspace:

```bash
bunx @quester-studio/cli import-collection ./collection.json --workspace ./my-workspace
```

Or clone the repo and follow [Getting started](../getting-started/).

## Feedback

- Bugs: [open an issue](https://github.com/9paradox/quester-studio/issues/new) with `type:bug` (or note findings in a PR discussion)
- Include OS, app/CLI version (release tag), and steps to reproduce
