# Quester Studio

Local-first, privacy-first visual API flows. **Quester** is the desktop product; **Quester Studio** is the platform monorepo.

- **Desktop app** — visual flow builder (React Flow + Electrobun)
- **CLI** — `quester validate`, `quester run`
- **Schema** — git-friendly `*.flow.json` workspace format

Legacy [apitester](https://github.com/9paradox/apitester) remains separate.

## Docs

- [Contributing](./CONTRIBUTING.md)
- [Security](./SECURITY.md)
- [Roadmap](./ROADMAP.md)
- [Changelog](./CHANGELOG.md)
- [Documentation site](https://9paradox.github.io/quester-studio/) (GitHub Pages)

## Structure

```
apps/desktop   Quester desktop app
apps/web       Marketing site (quester.9paradox.com)
apps/docs      Documentation (docs.quester.9paradox.com)
packages/schema   @quester/schema
packages/engine   @quester/engine
packages/nodes    @quester/nodes
packages/cli      quester CLI
schemas/       JSON Schema emitted from @quester/schema
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