# Quester Studio

Local-first, privacy-first visual API flows. **Quester Studio** is the desktop app and platform monorepo.

- **Desktop app** — visual flow builder (React Flow + Electrobun)
- **CLI** — `quester validate`, `quester run`
- **Schema** — git-friendly `*.flow.json` workspace format

Legacy [apitester](https://github.com/9paradox/apitester) remains separate.

## Docs

- [Contributing](./CONTRIBUTING.md)
- [Security](./SECURITY.md)
- [Roadmap](./ROADMAP.md)
- [Changelog](./CHANGELOG.md)
- [Product site & docs](https://9paradox.com/quester-studio/) — download, guide, UI + CLI docs

## Structure

```
apps/desktop   Quester Studio desktop app
apps/web       Product site + docs (https://9paradox.com/quester-studio/)
apps/docs      Legacy Starlight package (content mirrored in apps/web)
packages/schema   @quester-studio/schema
packages/engine   @quester-studio/engine
packages/nodes    @quester-studio/nodes
packages/cli      quester CLI
schemas/       JSON Schema emitted from @quester-studio/schema
```

## Requirements

- [Bun](https://bun.sh) 1.3.14 (see `packageManager` in root `package.json`)

## Quick start

```bash
bun install
bun run build
bun run test
bunx --bun quester validate examples/sample-workspace
bunx --bun quester run examples/sample-workspace/flows/login-and-profile.flow.json --workspace examples/sample-workspace --env local --input "{\"username\":\"emilys\",\"password\":\"emilyspass\"}"
```

## Monorepo tooling

- **Turborepo** (`turbo.json`) defines task graph and CI-friendly caching.
- Root `build` / `test` orchestrate packages via Bun workspaces (`bun run --filter …`) because Turborepo 2.10 does not yet enumerate Bun workspaces on this setup.

## License

MIT — Copyright (c) 2026 Akshay Gaonkar. See [LICENSE](./LICENSE).