# AGENTS.md

Demo repository for GitHub Copilot SDK and gh-aw workflow samples (Node.js + TypeScript).

## Essentials

- **Package manager**: pnpm
- **Node.js**: 18+

## Terminal Commands

### Core Commands

| Command            | Purpose                                |
| ------------------ | -------------------------------------- |
| `pnpm install`     | Install dependencies                   |
| `pnpm build`       | Build the project (TypeScript compile) |
| `pnpm build:watch` | Build in watch mode                    |
| `pnpm typecheck`   | TypeScript type checking               |
| `pnpm lint`        | Run ESLint                             |
| `pnpm format`      | Format code with Prettier              |

### Testing

| Command              | Purpose                       |
| -------------------- | ----------------------------- |
| `pnpm test`          | Run tests                     |
| `pnpm test:watch`    | TDD mode (continuous testing) |
| `pnpm test:coverage` | Run tests with coverage       |
| `pnpm test:ui`       | Run tests with UI             |

### Development

| Command               | Purpose                         |
| --------------------- | ------------------------------- |
| `pnpm dev`            | Run backend + frontend together |
| `pnpm server`         | Run backend server only         |
| `pnpm frontend`       | Run frontend dev server only    |
| `pnpm frontend:build` | Build frontend                  |

### Running Samples

Run any sample with `pnpm <sample-name>`:

| Command                  | Description                                                                                                                                   |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- |
| `pnpm hello-world`       | Basic SDK setup                                                                                                                               |
| `pnpm issue-triage`      | Auto-label GitHub issues                                                                                                                      |
| `pnpm security-alerts`   | Prioritize vulnerabilities                                                                                                                    |
| `pnpm mcp-orchestration` | Query dev infrastructure                                                                                                                      |
| `pnpm skill-testing`     | Test [agent skills](https://devblogs.microsoft.com/all-things-azure/context-driven-development-agent-skills-for-microsoft-foundry-and-azure/) |
| `pnpm rlm-orchestration` | [Recursive LLM](https://alexzhang13.github.io/blog/2025/rlm/) pattern                                                                         |
| `pnpm eda-pcb`           | PCB design analysis                                                                                                                           |
| `pnpm pagerduty`         | Incident management                                                                                                                           |
| `pnpm datadog`           | Monitoring & observability                                                                                                                    |
| `pnpm teams`             | MS Teams collaboration                                                                                                                        |

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
