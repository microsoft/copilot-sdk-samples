/**
 * RLM Orchestration - TypeScript SDK Sample
 *
 * Demonstrates the Recursive LLM (RLM) pattern using Azure Container Apps
 * Dynamic Sessions for secure code execution.
 *
 * @see https://alexzhang13.github.io/blog/2025/rlm/ - Original RLM paper
 *
 * The RLM pattern enables:
 * - Iterative reasoning through code execution
 * - Nested LLM queries for complex problems
 * - Variable persistence across iterations
 */
import { CopilotClient } from "@github/copilot-sdk";
import { runSample, DEFAULT_MODEL } from "../../../shared/index.js";
import { createRLMClient, RLMClient } from "./rlm-client.js";
import {
  createGitHubActionsEnvironment,
  GitHubActionsEnvironment,
} from "./environments/github-actions.js";
import {
  RLMEvent,
  RLMExecution,
  RLMIteration,
  calculateStats,
} from "./types.js";

// Check if running in GitHub Actions with streaming enabled
const STREAMING_MODE = process.env.RLM_STREAMING === "true";

/**
 * Serialize an RLMEvent to a JSON-safe format for NDJSON streaming.
 * Strips circular references and large payloads.
 */
function serializeEventForStream(event: RLMEvent): Record<string, unknown> {
  const base: Record<string, unknown> = {
    type: event.type,
    timestamp: new Date().toISOString(),
  };

  switch (event.type) {
    case "execution_start":
    case "execution_complete":
      return {
        ...base,
        execution: {
          id: event.execution.id,
          query: event.execution.query,
          status: event.execution.status,
          finalAnswer: event.execution.finalAnswer,
          totalLLMCalls: event.execution.totalLLMCalls,
          totalCodeExecutions: event.execution.totalCodeExecutions,
          iterationCount: event.execution.iterations.length,
        },
      };

    case "iteration_start":
    case "iteration_complete":
      return {
        ...base,
        iteration: serializeIteration(event.iteration),
        executionId: event.execution.id,
      };

    case "code_extracted":
      return {
        ...base,
        code: event.code,
        iterationId: event.iteration.id,
        iterationNumber: event.iteration.number,
      };

    case "repl_executing":
      return {
        ...base,
        code: event.code,
        iterationId: event.iteration.id,
      };

    case "repl_result":
      return {
        ...base,
        result: {
          success: event.result.success,
          stdout: event.result.stdout?.slice(0, 2000), // Truncate large outputs
          stderr: event.result.stderr?.slice(0, 500),
          durationMs: event.result.durationMs,
        },
        iterationId: event.iteration.id,
      };

    case "final_detected":
      return {
        ...base,
        response: event.response,
        iterationId: event.iteration.id,
      };

    case "llm_query_start":
      return {
        ...base,
        prompt: event.prompt.slice(0, 500), // Truncate
        context: { depth: event.context.depth },
      };

    case "llm_query_complete":
      return {
        ...base,
        response: event.response.slice(0, 500), // Truncate
        context: { depth: event.context.depth },
      };

    case "error":
      return {
        ...base,
        error: { message: event.error.message },
        executionId: event.execution.id,
      };

    default:
      return base;
  }
}

/**
 * Serialize an iteration for streaming (without circular refs)
 */
function serializeIteration(iteration: RLMIteration): Record<string, unknown> {
  return {
    id: iteration.id,
    number: iteration.number,
    input: iteration.input.slice(0, 500),
    llmResponse: iteration.llmResponse?.slice(0, 1000),
    extractedCode: iteration.extractedCode,
    replResult: iteration.replResult
      ? {
          success: iteration.replResult.success,
          stdout: iteration.replResult.stdout?.slice(0, 1000),
          stderr: iteration.replResult.stderr?.slice(0, 500),
          durationMs: iteration.replResult.durationMs,
        }
      : undefined,
    isFinal: iteration.isFinal,
    finalAnswer: iteration.finalAnswer,
    startedAt: iteration.startedAt,
    completedAt: iteration.completedAt,
    depth: iteration.depth,
    nestedQueryCount: iteration.nestedQueries.length,
  };
}

/**
 * Write an NDJSON event to stdout for streaming
 */
function emitStreamEvent(event: RLMEvent): void {
  if (STREAMING_MODE) {
    const serialized = serializeEventForStream(event);
    // Use special prefix so we can distinguish from other console output
    console.log(`__RLM_EVENT__${JSON.stringify(serialized)}`);
  }
}

const SAMPLE_CONTEXT = `
# Project Analysis Report

## Repository: acme-web-app
Language: TypeScript
Framework: Next.js 14
Test Coverage: 72%

## Key Metrics
- Total Files: 234
- Lines of Code: 45,892
- Dependencies: 48 (12 dev)
- Open Issues: 23
- Open PRs: 7

## Recent Commits (last 7 days)
1. fix: resolve hydration mismatch in UserProfile component
2. feat: add dark mode support with system preference detection
3. chore: upgrade to Next.js 14.1.0
4. fix: correct API rate limiting logic
5. docs: update README with deployment instructions

## Code Quality Issues
- 3 high-severity security vulnerabilities in dependencies
- 12 ESLint warnings (unused variables, missing types)
- 2 circular dependency warnings

## Performance Metrics
- Lighthouse Score: 89
- First Contentful Paint: 1.2s
- Time to Interactive: 2.8s
- Bundle Size: 312KB (gzipped)

## Test Results
- Unit Tests: 156 passing, 3 failing
- Integration Tests: 42 passing, 1 failing
- E2E Tests: 28 passing

## Failing Tests
1. UserProfile.test.tsx - "should render user avatar"
2. AuthService.test.ts - "should refresh expired tokens"
3. CheckoutFlow.test.ts - "should handle payment errors"
4. api/users.integration.ts - "should paginate large result sets"
`;

async function main() {
  await runSample(
    {
      name: "RLM Orchestration",
      description:
        "Recursive LLM pattern with Copilot SDK and GitHub Actions (could swap with Azure Container Apps Dynamic Sessions)",
    },
    async (client: CopilotClient) => {
      // Use live mode if GITHUB_TOKEN is set, otherwise mock
      const useLiveMode =
        !!process.env.GITHUB_TOKEN && !!process.env.GITHUB_REPOSITORY;
      const [owner, repo] = (
        process.env.GITHUB_REPOSITORY ?? "owner/repo"
      ).split("/");

      const environment = createGitHubActionsEnvironment({
        mode: useLiveMode ? "live" : "mock",
        language: "python",
        debug: true,
        owner,
        repo,
        token: process.env.GITHUB_TOKEN,
        workflowId: "rlm-repl.yml",
        ref: "main",
      });

      console.log(
        `[Environment] Using ${useLiveMode ? "LIVE" : "MOCK"} GitHub Actions`,
      );
      if (!useLiveMode) {
        console.log(
          "[Environment] Set GITHUB_TOKEN and GITHUB_REPOSITORY for live execution\n",
        );
      }

      const rlmClient = createRLMClient(client, environment, {
        maxIterations: 10,
        maxDepth: 3,
        model: DEFAULT_MODEL,
        debug: false,
      });

      console.log("=== RLM Orchestration Demo ===\n");
      console.log(
        "This demo shows how to use the Recursive LLM (RLM) pattern for",
      );
      console.log(
        "complex reasoning tasks with code execution capabilities.\n",
      );

      await demonstrateSummarization(rlmClient, environment);
      await demonstrateCodeAnalysis(rlmClient, environment);
    },
  );
}

async function demonstrateSummarization(
  rlmClient: RLMClient,
  environment: GitHubActionsEnvironment,
): Promise<void> {
  console.log("--- Query 1: Simple Summarization Task ---\n");
  console.log(
    "Query: Summarize the key metrics and issues from this report.\n",
  );

  const eventHandler = createEventLogger("Query 1");
  rlmClient.on(eventHandler);

  const result = await rlmClient.execute(
    "Summarize the key metrics and issues from this report, focusing on actionable items.",
    SAMPLE_CONTEXT,
  );

  rlmClient.off(eventHandler);

  if (result.success && result.data) {
    printExecutionResult(result.data);
  } else {
    console.error("Execution failed:", result.error?.message);
  }

  await environment.clearContext();
  console.log();
}

async function demonstrateCodeAnalysis(
  rlmClient: RLMClient,
  environment: GitHubActionsEnvironment,
): Promise<void> {
  console.log("--- Query 2: Multi-Step Code Analysis Task ---\n");
  console.log(
    "Query: Analyze the failing tests and propose fixes with priorities.\n",
  );

  const eventHandler = createEventLogger("Query 2");
  rlmClient.on(eventHandler);

  const result = await rlmClient.execute(
    "Analyze the failing tests listed in this report. For each failing test, determine the likely cause and propose a fix. Prioritize by severity.",
    SAMPLE_CONTEXT,
    {
      customInstructions:
        "Use Python to parse and analyze the test data. Group findings by component.",
    },
  );

  rlmClient.off(eventHandler);

  if (result.success && result.data) {
    printExecutionResult(result.data);
  } else {
    console.error("Execution failed:", result.error?.message);
  }

  await environment.dispose();
  console.log();
}

function createEventLogger(prefix: string): (event: RLMEvent) => void {
  return (event: RLMEvent) => {
    emitStreamEvent(event);

    switch (event.type) {
      case "execution_start":
        console.log(`  [${prefix}] Execution started`);
        break;

      case "iteration_start":
        console.log(
          `  [${prefix}] Iteration ${event.iteration.number + 1} started`,
        );
        break;

      case "code_extracted":
        console.log(
          `  [${prefix}] Code extracted (${event.code.length} chars)`,
        );
        break;

      case "repl_executing":
        console.log(`  [${prefix}] Executing code in REPL...`);
        break;

      case "repl_result":
        if (event.result.success) {
          console.log(`  [${prefix}] Code executed successfully`);
          if (event.result.stdout) {
            const preview = event.result.stdout.slice(0, 80);
            console.log(`  [${prefix}] Output: ${preview}...`);
          }
        } else {
          console.log(`  [${prefix}] Code execution had errors`);
        }
        break;

      case "final_detected":
        console.log(`  [${prefix}] Final answer detected`);
        break;

      case "iteration_complete":
        console.log(
          `  [${prefix}] Iteration ${event.iteration.number + 1} complete`,
        );
        break;

      case "error":
        console.error(`  [${prefix}] Error: ${event.error.message}`);
        break;

      case "execution_complete":
        console.log(`  [${prefix}] Execution complete`);
        break;
    }
  };
}

function printExecutionResult(execution: RLMExecution): void {
  console.log("\n--- Execution Results ---\n");

  console.log(`Status: ${execution.status}`);
  console.log(`Iterations: ${execution.iterations.length}`);
  console.log(`LLM Calls: ${execution.totalLLMCalls}`);
  console.log(`Code Executions: ${execution.totalCodeExecutions}`);

  const stats = calculateStats(execution);
  console.log(`\nStatistics:`);
  console.log(`  Total Duration: ${stats.totalDurationMs}ms`);
  console.log(`  Avg Iteration: ${stats.avgIterationMs.toFixed(0)}ms`);
  console.log(`  Max Depth Reached: ${stats.maxDepthReached}`);
  console.log(`  Nested Queries: ${stats.nestedQueryCount}`);

  if (execution.finalAnswer) {
    console.log(`\nFinal Answer:`);
    const lines = execution.finalAnswer.split("\n");
    for (const line of lines.slice(0, 10)) {
      console.log(`  ${line}`);
    }
    if (lines.length > 10) {
      console.log(`  ... (${lines.length - 10} more lines)`);
    }
  }

  if (STREAMING_MODE) {
    const fullExecutionData = {
      type: "execution_summary",
      timestamp: new Date().toISOString(),
      execution: {
        id: execution.id,
        query: execution.query,
        status: execution.status,
        finalAnswer: execution.finalAnswer,
        totalLLMCalls: execution.totalLLMCalls,
        totalCodeExecutions: execution.totalCodeExecutions,
        startedAt: execution.startedAt,
        completedAt: execution.completedAt,
        iterations: execution.iterations.map(serializeIteration),
      },
      stats,
    };
    console.log(`__RLM_EVENT__${JSON.stringify(fullExecutionData)}`);
  }
}

main().catch(console.error);
