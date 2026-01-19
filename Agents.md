# AGENTS.md

Demo repository for GitHub Copilot SDK and gh-aw workflow samples (Node.js + TypeScript).

## Essentials

- **Package manager**: pnpm
- **Build**: `pnpm build`
- **Test**: `pnpm test`
- **Typecheck**: `pnpm typecheck`

## Key Conventions

- **Mock-first**: All samples work without credentials using mock connectors
- **ConnectorResult pattern**: All connectors return `{ success, data?, error? }`
- **Test helpers**: Use `expectSuccess()` / `expectFailure()` from `test/helpers/`

## Adding New Work

- For new samples: See `docs/SAMPLES.md`
- For new connectors: See `docs/CONNECTORS.md`
- For TypeScript patterns: See `docs/TYPESCRIPT.md`

## Coordination

Coordinate with **Mario** before starting new demo work to avoid duplication.
