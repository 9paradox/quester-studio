---
title: Who it’s for
description: Where Quester Studio fits — local debug, mid-flow forms, mixed teams, and CLI in CI
---

Quester Studio is a local desktop app (and CLI) for **multi-step API journeys**. Flows are JSON files in a workspace folder. This page is about where that is useful, not a pitch.

## Local debug

Reproduce a failing chain on your machine: login, then the next call with the token, then an [assert](../nodes/assert/). Environments and gitignored secrets stay in the workspace. The same `*.flow.json` files run from the desktop app or the CLI while you debug.

## Mid-flow forms

Some journeys need a human choice after a response comes back. Example: search products, pick one from the list, then add it to a cart.

A [`form`](../nodes/form/) node pauses the run until you submit in the desktop UI (or pass `--forms` on the CLI). Select options can be filled from a previous HTTP body. The sample workspace includes `search-pick-cart` and `forms-showcase`.

This is different from the [`input`](../nodes/input/) node, which is the payload at the **start** of a run.

## Mixed team, one folder

One workspace with `quester.json`, environments, flows, collections, and forms.

- Developers wire extracts and templates between HTTP steps.
- Testers add asserts and run suites from the CLI in continuous integration.
- People who are not writing scripts can follow the path on the canvas. Optional [`note`](../nodes/note/) stickies document intent and are not executed.

## Continuous integration

`quester validate` and `quester run` / suites use the same files as the app. Optional [on-disk run logs](../run-logs/) keep per-step input and output for review.

## From a collection to a journey

Import a request collection into the workspace, then chain what used to be separate requests into one flow the team keeps in git.

See the [Guide](../../guide/) for a first successful run of `login-and-profile`, then `search-pick-cart` for forms. CLI: [Getting started](../getting-started/).
