---
title: Who it’s for
description: Scenario API testing for developers, testers, and business analysts sharing one workspace
---

Quester Studio is for **mixed teams** that need more than a request collection: real API journeys with chaining, branching, asserts, and continuous integration — as readable flow files in git.

## Developers

- Reproduce multi-step bugs locally (auth → call → assert)
- Wire extracts and templates between HTTP steps
- Run the same `*.flow.json` from desktop or CLI while debugging

## Testers

- Author regression scenarios as graphs with [assert](../nodes/assert/) checkpoints
- Run single flows or suites from the CLI in continuous integration
- Review optional [on-disk run logs](../run-logs/) with per-step input and output

## Business analysts

- Follow the business path on the canvas (login → profile → next action)
- Use [note](../nodes/note/) stickies to document intent without affecting execution
- Share the same workspace folder developers and testers already use

## Shared workspace

One folder with `quester.json`, environments, and flows. Developers edit wiring, testers strengthen asserts, business analysts keep the story readable — all without forking into separate scripts or siloed collections.

See the [Guide](../../guide/) for a first successful run of `login-and-profile`, or [Getting started](../getting-started/) for the CLI.
