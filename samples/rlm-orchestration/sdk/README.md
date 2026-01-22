# RLM Orchestration (SDK)

[Recursive LLM (RLM)](https://alexzhang13.github.io/blog/2025/rlm/) pattern with iterative reasoning and code execution.

## What This Demonstrates

- Recursive LLM execution with REPL integration
- Event-driven architecture for execution tracking
- NDJSON streaming for GitHub Actions compatibility
- Iteration-based reasoning with code extraction
- Stats calculation and execution metrics

## SDK Usage

```typescript
import {
  runSample,
  createClient,
  DEFAULT_MODEL,
} from "../../../shared/client.js";
import { createRLMClient } from "./rlm-client.js";
import { createGitHubActionsEnvironment } from "./environment.js";

await runSample({ name: "rlm-orchestration" }, async (client) => {
  const rlm = createRLMClient(client);
  rlm.on("iteration_complete", (event) => console.log(event));
  const result = await rlm.execute(query, context, { maxIterations: 5 });
});
```

## Running

```bash
pnpm rlm-orchestration
```

## Key Files

| File             | Purpose                                |
| ---------------- | -------------------------------------- |
| `index.ts`       | Sample entry point with RLM demo       |
| `rlm-client.js`  | RLM execution engine with event system |
| `types.js`       | Event types, execution stats           |
| `environment.js` | GitHub Actions environment setup       |
