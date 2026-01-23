# Copilot SDK Samples

> [!CAUTION]
> **Work in Progress** — This repository is under active development. APIs and samples may change without notice.

Sample applications demonstrating the GitHub Copilot SDK.

## Quick Start

```bash
pnpm install
pnpm dev         # Run backend + frontend together
```

Other commands:

```bash
pnpm test        # Run all tests
pnpm hello-world # Run a sample directly
```

## Prerequisites

- **Node.js 18+**
- **pnpm 9+** (via corepack)

## Samples

| Sample              | Description                                                                                                                                   | Connectors |
| ------------------- | --------------------------------------------------------------------------------------------------------------------------------------------- | ---------- |
| `hello-world`       | Basic SDK setup                                                                                                                               | —          |
| `issue-triage`      | Auto-label GitHub issues                                                                                                                      | GitHub     |
| `security-alerts`   | Prioritize vulnerabilities                                                                                                                    | GitHub     |
| `mcp-orchestration` | Query dev infrastructure                                                                                                                      | —          |
| `skill-testing`     | Test [agent skills](https://devblogs.microsoft.com/all-things-azure/context-driven-development-agent-skills-for-microsoft-foundry-and-azure/) | MS Learn   |
| `rlm-orchestration` | [Recursive LLM](https://alexzhang13.github.io/blog/2025/rlm/) pattern                                                                         | —          |
| `eda-pcb`           | PCB design analysis                                                                                                                           | EDA        |
| `pagerduty`         | Incident management                                                                                                                           | PagerDuty  |
| `datadog`           | Monitoring & observability                                                                                                                    | Datadog    |
| `teams`             | MS Teams collaboration                                                                                                                        | Teams      |

Run any sample: `pnpm <sample-name>` (e.g., `pnpm issue-triage`)

## Connectors

All connectors support **mock mode** (default) — no credentials needed for development.

| Connector | Status |
| --------- | ------ |
| GitHub    | ✅     |
| PagerDuty | ✅     |
| Datadog   | ✅     |
| Teams     | ✅     |
| EDA       | ✅     |
| MS Learn  | ✅     |

## Development

```bash
pnpm test          # Run tests
pnpm test:watch    # TDD mode
pnpm typecheck     # Type check
pnpm lint          # Lint
pnpm build         # Build
```

## Project Structure

```
samples/           # SDK samples
shared/connectors/ # Mock-first connector implementations
test/              # Unit tests
docs/              # Extended documentation
```

## Key Conventions

- **Mock-first**: All samples work without credentials
- **ConnectorResult pattern**: `{ success, data?, error? }`
- **Test helpers**: `expectSuccess()` / `expectFailure()` from `test/helpers/`

## Documentation

- [Adding Samples](docs/SAMPLES.md)
- [Connector Guide](docs/CONNECTORS.md)
- [TypeScript Patterns](docs/TYPESCRIPT.md)

## License

MIT
