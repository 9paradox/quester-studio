# @quester-studio/workspace-service

## 0.6.5

### Patch Changes

- Updated dependencies [2bd3365]
- Updated dependencies [2bd3365]
- Updated dependencies [9a29517]
  - @quester-studio/schema@0.6.5
  - @quester-studio/engine@0.6.5
  - @quester-studio/api-contract@0.4.9

## 0.6.2

### Patch Changes

- b091c84: Desktop Runs browser: tree navigation, delete file/run folders with confirm, and fix cancel leaving run meta stuck as "running".
- e74aeba: Stability: fan-in join semantics, long desktop runs, secret redaction in RPC logs, hero sample `{{input.*}}` credentials, and localhost-only API guardrails.
- f4ddc5e: Stability: cookie jar uses final response URL and honors Secure/Path; CLI shares jar with subflows and loads secrets from `environmentsDir`.
- f4ddc5e: Stability: abortable capped `delay`, reject unsafe flow/env/secrets path ids, and exclude secrets/runs from desktop sample sync.
- Updated dependencies [b091c84]
- Updated dependencies [d597645]
- Updated dependencies [f2c407e]
- Updated dependencies [cbf5369]
- Updated dependencies [205ff52]
- Updated dependencies [bdb408f]
- Updated dependencies [bba12dc]
- Updated dependencies [e74aeba]
- Updated dependencies [f4ddc5e]
- Updated dependencies [f4ddc5e]
- Updated dependencies [f4ddc5e]
  - @quester-studio/api-contract@0.4.8
  - @quester-studio/engine@0.6.2
  - @quester-studio/schema@0.6.2

## 0.6.0

### Patch Changes

- f90b614: Scenario testing focus: site and docs for developers, testers, and business analysts; on-disk per-step run logs; `quester suite` and `--report` JSON; sample smoke suite and continuous integration validate step.
- Updated dependencies [02ea008]
- Updated dependencies [f90b614]
  - @quester-studio/engine@0.6.0
  - @quester-studio/schema@0.6.0
  - @quester-studio/api-contract@0.4.7

## 0.5.0

### Minor Changes

- f6aa29b: v1.0 thin slice: Postman Collection v2.1 import (`quester import-collection` + desktop Collections **Import**), unsigned macOS desktop artifact in release CI, flow format `v1` freeze note. Desktop polish: bundled sample workspace, installer icon/shortcuts, per-flow runs with stop/toasts, command palette, shortcuts table, run summary, JMESPath assist. New nodes: delay, switch, foreach, try, subflow, log, inspect; AbortSignal cancel; disk cookie jar.

### Patch Changes

- Updated dependencies [3ed1209]
- Updated dependencies [f6aa29b]
  - @quester-studio/schema@0.5.0
  - @quester-studio/engine@0.5.0
  - @quester-studio/api-contract@0.4.6
