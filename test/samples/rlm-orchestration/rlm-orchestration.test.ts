import { describe, it, expect, beforeEach, vi } from "vitest";
import { expectSuccess, expectFailure } from "../../helpers/index.js";
import {
  RLMClient,
  createRLMClient,
  DEFAULT_RLM_CONFIG,
} from "../../../samples/rlm-orchestration/sdk/rlm-client.js";
import {
  generateId,
  createExecution,
  createIteration,
  calculateStats,
  RLMClientConfig,
  RLMExecution,
  RLMIteration,
  RLMEvent,
  RLMEventHandler,
} from "../../../samples/rlm-orchestration/sdk/types.js";
import {
  buildSystemPrompt,
  buildInitialUserMessage,
  buildNestedQueryPrompt,
  buildErrorRecoveryPrompt,
  buildIterationWarningPrompt,
  extractCodeBlock,
  parseFinalResponse,
  hasCodeBlock,
  hasFinalResponse,
  PYTHON_SYSTEM_PROMPT,
  NODEJS_SYSTEM_PROMPT,
} from "../../../samples/rlm-orchestration/sdk/prompts.js";
import { success, failure } from "../../../shared/connectors/types.js";

interface MockSession {
  on: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  destroy: ReturnType<typeof vi.fn>;
}

interface MockCopilotClient {
  createSession: ReturnType<typeof vi.fn>;
  mockSession: MockSession;
}

function createMockCopilotClient(): MockCopilotClient {
  const mockSession: MockSession = {
    on: vi.fn(),
    send: vi.fn().mockResolvedValue(undefined),
    destroy: vi.fn().mockResolvedValue(undefined),
  };

  return {
    createSession: vi.fn().mockResolvedValue(mockSession),
    mockSession,
  };
}

interface MockEnvironment {
  name: string;
  type: "github-actions" | "aca-sessions" | "local";
  isInitialized: boolean;
  sessionId: string | undefined;
  language: "python" | "nodejs";
  initialize: ReturnType<typeof vi.fn>;
  dispose: ReturnType<typeof vi.fn>;
  execute: ReturnType<typeof vi.fn>;
  setVariable: ReturnType<typeof vi.fn>;
  getVariable: ReturnType<typeof vi.fn>;
  getVariables: ReturnType<typeof vi.fn>;
  clearContext: ReturnType<typeof vi.fn>;
  healthCheck: ReturnType<typeof vi.fn>;
  registerLLMQueryCallback: ReturnType<typeof vi.fn>;
  registerLLMQueryBatchedCallback: ReturnType<typeof vi.fn>;
}

function createMockEnvironment(
  type: "github-actions" | "aca-sessions" | "local" = "local",
): MockEnvironment {
  return {
    name: "mock-environment",
    type,
    isInitialized: true,
    sessionId: "mock-session-id",
    language: "python",
    initialize: vi.fn().mockResolvedValue(success(undefined)),
    dispose: vi.fn().mockResolvedValue(undefined),
    execute: vi.fn().mockResolvedValue(
      success({
        success: true,
        stdout: "test output",
        stderr: "",
        durationMs: 100,
      }),
    ),
    setVariable: vi.fn().mockResolvedValue(success(undefined)),
    getVariable: vi.fn().mockResolvedValue(success("test value")),
    getVariables: vi.fn().mockResolvedValue(success({})),
    clearContext: vi.fn().mockResolvedValue(success(undefined)),
    healthCheck: vi.fn().mockResolvedValue(success({ healthy: true })),
    registerLLMQueryCallback: vi.fn(),
    registerLLMQueryBatchedCallback: vi.fn(),
  };
}

describe("rlm-orchestration sample", () => {
  describe("types.ts utilities", () => {
    describe("generateId", () => {
      it("should generate a unique ID with default prefix", () => {
        const id = generateId();
        expect(id).toMatch(/^rlm_[a-z0-9]+_[a-z0-9]+$/);
      });

      it("should generate a unique ID with custom prefix", () => {
        const id = generateId("exec");
        expect(id).toMatch(/^exec_[a-z0-9]+_[a-z0-9]+$/);
      });

      it("should generate different IDs on each call", () => {
        const id1 = generateId();
        const id2 = generateId();
        expect(id1).not.toBe(id2);
      });

      it("should include timestamp component that is decodable from base36", () => {
        const id = generateId("test");
        const parts = id.split("_");
        expect(parts.length).toBe(3);
        const timestamp = parseInt(parts[1], 36);
        expect(timestamp).toBeGreaterThan(0);
      });
    });

    describe("createExecution", () => {
      it("should create an execution with correct initial state", () => {
        const config: RLMClientConfig = {
          maxIterations: 10,
          maxDepth: 3,
          iterationTimeoutMs: 30000,
          totalTimeoutMs: 300000,
          debug: false,
          language: "python",
        };

        const execution = createExecution(
          "test query",
          "test context",
          config,
          "local",
        );

        expect(execution.id).toMatch(/^exec_/);
        expect(execution.query).toBe("test query");
        expect(execution.context).toBe("test context");
        expect(execution.iterations).toEqual([]);
        expect(execution.status).toBe("pending");
        expect(execution.maxIterations).toBe(10);
        expect(execution.maxDepth).toBe(3);
        expect(execution.currentDepth).toBe(0);
        expect(execution.environmentType).toBe("local");
        expect(execution.language).toBe("python");
        expect(execution.totalLLMCalls).toBe(0);
        expect(execution.totalCodeExecutions).toBe(0);
        expect(execution.startedAt).toBeDefined();
      });

      it("should use config values for execution limits", () => {
        const config: RLMClientConfig = {
          maxIterations: 5,
          maxDepth: 2,
          iterationTimeoutMs: 15000,
          totalTimeoutMs: 150000,
          debug: true,
          language: "nodejs",
        };

        const execution = createExecution(
          "query",
          "context",
          config,
          "github-actions",
        );

        expect(execution.maxIterations).toBe(5);
        expect(execution.maxDepth).toBe(2);
        expect(execution.environmentType).toBe("github-actions");
        expect(execution.language).toBe("nodejs");
      });

      it("should create execution with aca-sessions environment type", () => {
        const config: RLMClientConfig = {
          maxIterations: 10,
          maxDepth: 3,
          iterationTimeoutMs: 30000,
          totalTimeoutMs: 300000,
          debug: false,
          language: "python",
        };

        const execution = createExecution(
          "query",
          "context",
          config,
          "aca-sessions",
        );

        expect(execution.environmentType).toBe("aca-sessions");
      });
    });

    describe("createIteration", () => {
      it("should create an iteration with default values", () => {
        const iteration = createIteration(0, "test input");

        expect(iteration.id).toMatch(/^iter_/);
        expect(iteration.number).toBe(0);
        expect(iteration.input).toBe("test input");
        expect(iteration.llmResponse).toBe("");
        expect(iteration.nestedQueries).toEqual([]);
        expect(iteration.isFinal).toBe(false);
        expect(iteration.depth).toBe(0);
        expect(iteration.parentId).toBeUndefined();
        expect(iteration.startedAt).toBeDefined();
      });

      it("should create an iteration with depth and parent", () => {
        const iteration = createIteration(1, "nested input", 2, "parent_123");

        expect(iteration.number).toBe(1);
        expect(iteration.depth).toBe(2);
        expect(iteration.parentId).toBe("parent_123");
      });

      it("should generate unique IDs for each iteration", () => {
        const iter1 = createIteration(0, "input 1");
        const iter2 = createIteration(1, "input 2");
        expect(iter1.id).not.toBe(iter2.id);
      });
    });

    describe("calculateStats", () => {
      it("should calculate stats for empty execution", () => {
        const execution: RLMExecution = {
          id: "exec_test",
          query: "test",
          context: "context",
          iterations: [],
          status: "completed",
          maxIterations: 10,
          currentDepth: 0,
          maxDepth: 3,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          environmentType: "local",
          language: "python",
          totalLLMCalls: 0,
          totalCodeExecutions: 0,
        };

        const stats = calculateStats(execution);

        expect(stats.iterationCount).toBe(0);
        expect(stats.nestedQueryCount).toBe(0);
        expect(stats.codeExecutionCount).toBe(0);
        expect(stats.avgIterationMs).toBe(0);
        expect(stats.maxDepthReached).toBe(0);
      });

      it("should calculate stats for execution with iterations", () => {
        const startTime = Date.now() - 5000;
        const execution: RLMExecution = {
          id: "exec_test",
          query: "test",
          context: "context",
          iterations: [
            {
              id: "iter_1",
              number: 0,
              input: "input",
              llmResponse: "response",
              nestedQueries: [],
              isFinal: false,
              startedAt: new Date(startTime).toISOString(),
              depth: 0,
            },
            {
              id: "iter_2",
              number: 1,
              input: "input 2",
              llmResponse: "response 2",
              nestedQueries: [],
              isFinal: true,
              startedAt: new Date(startTime + 1000).toISOString(),
              depth: 0,
            },
          ],
          status: "completed",
          maxIterations: 10,
          currentDepth: 0,
          maxDepth: 3,
          startedAt: new Date(startTime).toISOString(),
          completedAt: new Date().toISOString(),
          environmentType: "local",
          language: "python",
          totalLLMCalls: 2,
          totalCodeExecutions: 1,
        };

        const stats = calculateStats(execution);

        expect(stats.iterationCount).toBe(2);
        expect(stats.codeExecutionCount).toBe(1);
        expect(stats.totalDurationMs).toBeGreaterThanOrEqual(0);
        expect(stats.avgIterationMs).toBeGreaterThan(0);
      });

      it("should count nested queries recursively", () => {
        const nestedIteration: RLMIteration = {
          id: "nested_1",
          number: 0,
          input: "nested input",
          llmResponse: "nested response",
          nestedQueries: [],
          isFinal: false,
          startedAt: new Date().toISOString(),
          depth: 1,
        };

        const execution: RLMExecution = {
          id: "exec_test",
          query: "test",
          context: "context",
          iterations: [
            {
              id: "iter_1",
              number: 0,
              input: "input",
              llmResponse: "response",
              nestedQueries: [nestedIteration],
              isFinal: false,
              startedAt: new Date().toISOString(),
              depth: 0,
            },
          ],
          status: "completed",
          maxIterations: 10,
          currentDepth: 0,
          maxDepth: 3,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          environmentType: "local",
          language: "python",
          totalLLMCalls: 2,
          totalCodeExecutions: 0,
        };

        const stats = calculateStats(execution);

        expect(stats.nestedQueryCount).toBe(1);
      });

      it("should find max depth reached", () => {
        const deepNested: RLMIteration = {
          id: "deep_1",
          number: 0,
          input: "deep",
          llmResponse: "deep response",
          nestedQueries: [],
          isFinal: false,
          startedAt: new Date().toISOString(),
          depth: 3,
        };

        const nestedIteration: RLMIteration = {
          id: "nested_1",
          number: 0,
          input: "nested",
          llmResponse: "nested response",
          nestedQueries: [deepNested],
          isFinal: false,
          startedAt: new Date().toISOString(),
          depth: 2,
        };

        const execution: RLMExecution = {
          id: "exec_test",
          query: "test",
          context: "context",
          iterations: [
            {
              id: "iter_1",
              number: 0,
              input: "input",
              llmResponse: "response",
              nestedQueries: [nestedIteration],
              isFinal: false,
              startedAt: new Date().toISOString(),
              depth: 1,
            },
          ],
          status: "completed",
          maxIterations: 10,
          currentDepth: 0,
          maxDepth: 5,
          startedAt: new Date().toISOString(),
          completedAt: new Date().toISOString(),
          environmentType: "local",
          language: "python",
          totalLLMCalls: 3,
          totalCodeExecutions: 0,
        };

        const stats = calculateStats(execution);

        expect(stats.maxDepthReached).toBe(3);
      });
    });
  });

  describe("prompts.ts utilities", () => {
    describe("buildSystemPrompt", () => {
      it("should return Python system prompt by default", () => {
        const prompt = buildSystemPrompt();
        expect(prompt).toContain("Python REPL");
        expect(prompt).not.toContain("Node.js REPL");
      });

      it("should return Python system prompt when language is python", () => {
        const prompt = buildSystemPrompt({ language: "python" });
        expect(prompt).toContain("Python REPL");
        expect(prompt).toContain("```python");
      });

      it("should return Node.js system prompt when language is nodejs", () => {
        const prompt = buildSystemPrompt({ language: "nodejs" });
        expect(prompt).toContain("Node.js REPL");
        expect(prompt).toContain("```javascript");
      });

      it("should include max iterations in limits section", () => {
        const prompt = buildSystemPrompt({ maxIterations: 15 });
        expect(prompt).toContain("## Limits");
        expect(prompt).toContain("Maximum iterations: 15");
      });

      it("should include max depth in limits section", () => {
        const prompt = buildSystemPrompt({ maxDepth: 5 });
        expect(prompt).toContain("## Limits");
        expect(prompt).toContain("Maximum recursion depth for llm_query: 5");
      });

      it("should include both limits when provided", () => {
        const prompt = buildSystemPrompt({ maxIterations: 10, maxDepth: 3 });
        expect(prompt).toContain("Maximum iterations: 10");
        expect(prompt).toContain("Maximum recursion depth for llm_query: 3");
      });

      it("should include custom instructions", () => {
        const prompt = buildSystemPrompt({
          customInstructions: "Always use type hints in Python code.",
        });
        expect(prompt).toContain("## Additional Instructions");
        expect(prompt).toContain("Always use type hints in Python code.");
      });

      it("should combine language, limits, and custom instructions", () => {
        const prompt = buildSystemPrompt({
          language: "nodejs",
          maxIterations: 8,
          maxDepth: 2,
          customInstructions: "Use async/await everywhere",
        });
        expect(prompt).toContain("Node.js REPL");
        expect(prompt).toContain("Maximum iterations: 8");
        expect(prompt).toContain("Maximum recursion depth for llm_query: 2");
        expect(prompt).toContain("Use async/await everywhere");
      });
    });

    describe("buildInitialUserMessage", () => {
      it("should include query in the message", () => {
        const message = buildInitialUserMessage("Find all bugs", 1000);
        expect(message).toContain("Task: Find all bugs");
      });

      it("should include context length", () => {
        const message = buildInitialUserMessage("Analyze code", 5000);
        expect(message).toContain("(5000 characters)");
      });

      it("should mention context_0 variable", () => {
        const message = buildInitialUserMessage("test", 100);
        expect(message).toContain("`context_0`");
      });

      it("should mention available functions", () => {
        const message = buildInitialUserMessage("test", 100);
        expect(message).toContain("peek");
        expect(message).toContain("grep");
        expect(message).toContain("llm_query");
        expect(message).toContain("llm_query_batched");
      });

      it("should mention FINAL output format", () => {
        const message = buildInitialUserMessage("test", 100);
        expect(message).toContain("FINAL(your answer)");
        expect(message).toContain("FINAL_VAR(variable_name)");
      });
    });

    describe("buildNestedQueryPrompt", () => {
      it("should include the prompt in the output", () => {
        const result = buildNestedQueryPrompt("What is the meaning of life?");
        expect(result).toContain("Question: What is the meaning of life?");
      });

      it("should contain instructions for sub-questions", () => {
        const result = buildNestedQueryPrompt("test question");
        expect(result).toContain("sub-question");
        expect(result).toContain("concise and direct");
      });

      it("should instruct not to use FINAL", () => {
        const result = buildNestedQueryPrompt("test");
        expect(result).toContain("Do not use FINAL()");
      });
    });

    describe("buildErrorRecoveryPrompt", () => {
      it("should include the error message", () => {
        const result = buildErrorRecoveryPrompt(
          "NameError: undefined variable",
          "print(x)",
        );
        expect(result).toContain("Error: NameError: undefined variable");
      });

      it("should include the failed code", () => {
        const result = buildErrorRecoveryPrompt("SyntaxError", "def foo(");
        expect(result).toContain("def foo(");
        expect(result).toContain("Code that failed:");
      });

      it("should ask for corrected code", () => {
        const result = buildErrorRecoveryPrompt("error", "code");
        expect(result).toContain("corrected code");
      });
    });

    describe("buildIterationWarningPrompt", () => {
      it("should include current and max iterations", () => {
        const result = buildIterationWarningPrompt(8, 10);
        expect(result).toContain("8 of 10");
      });

      it("should mention working towards final answer", () => {
        const result = buildIterationWarningPrompt(5, 10);
        expect(result).toContain("final answer");
      });

      it("should mention both FINAL formats", () => {
        const result = buildIterationWarningPrompt(7, 10);
        expect(result).toContain("FINAL(your answer)");
        expect(result).toContain("FINAL_VAR(variable_name)");
      });
    });

    describe("extractCodeBlock", () => {
      it("should extract Python code block", () => {
        const response = `Here's my code:
\`\`\`python
x = 10
print(x)
\`\`\``;
        const code = extractCodeBlock(response);
        expect(code).toBe("x = 10\nprint(x)");
      });

      it("should extract JavaScript code block", () => {
        const response = `\`\`\`javascript
const x = 10;
console.log(x);
\`\`\``;
        const code = extractCodeBlock(response);
        expect(code).toBe("const x = 10;\nconsole.log(x);");
      });

      it("should extract js code block", () => {
        const response = `\`\`\`js
let y = 20;
\`\`\``;
        const code = extractCodeBlock(response);
        expect(code).toBe("let y = 20;");
      });

      it("should extract node code block", () => {
        const response = `\`\`\`node
const fs = require('fs');
\`\`\``;
        const code = extractCodeBlock(response);
        expect(code).toBe("const fs = require('fs');");
      });

      it("should extract unmarked code block", () => {
        const response = `\`\`\`
some code here
\`\`\``;
        const code = extractCodeBlock(response);
        expect(code).toBe("some code here");
      });

      it("should return null for response without code block", () => {
        const response = "This is just text without any code.";
        const code = extractCodeBlock(response);
        expect(code).toBeNull();
      });

      it("should extract first code block when multiple exist", () => {
        const response = `\`\`\`python
first = 1
\`\`\`

\`\`\`python
second = 2
\`\`\``;
        const code = extractCodeBlock(response);
        expect(code).toBe("first = 1");
      });

      it("should handle code block with leading/trailing whitespace", () => {
        const response = `\`\`\`python

  x = 10

\`\`\``;
        const code = extractCodeBlock(response);
        expect(code).toBe("x = 10");
      });
    });

    describe("parseFinalResponse", () => {
      it("should parse FINAL with simple answer", () => {
        const result = parseFinalResponse("FINAL(42)");
        expect(result).toEqual({ type: "FINAL", answer: "42" });
      });

      it("should parse FINAL with text answer", () => {
        const result = parseFinalResponse("FINAL(The answer is yes)");
        expect(result).toEqual({ type: "FINAL", answer: "The answer is yes" });
      });

      it("should parse FINAL_VAR with variable name", () => {
        const result = parseFinalResponse("FINAL_VAR(result_data)");
        expect(result).toEqual({
          type: "FINAL_VAR",
          variableName: "result_data",
        });
      });

      it("should handle FINAL in context", () => {
        const result = parseFinalResponse(
          "After analysis, I found FINAL(the bug is in line 42) as the answer.",
        );
        expect(result).toEqual({
          type: "FINAL",
          answer: "the bug is in line 42",
        });
      });

      it("should return null for no final response", () => {
        const result = parseFinalResponse("Still analyzing the data...");
        expect(result).toBeNull();
      });

      it("should handle FINAL with nested parentheses", () => {
        const result = parseFinalResponse("FINAL(sum(a, b) returns 10)");
        expect(result).toEqual({
          type: "FINAL",
          answer: "sum(a, b",
        });
      });

      it("should prefer FINAL over FINAL_VAR when both present", () => {
        const result = parseFinalResponse("FINAL(answer) FINAL_VAR(var)");
        expect(result?.type).toBe("FINAL");
      });
    });

    describe("hasCodeBlock", () => {
      it("should return true for Python code block", () => {
        expect(hasCodeBlock("```python\ncode\n```")).toBe(true);
      });

      it("should return true for JavaScript code block", () => {
        expect(hasCodeBlock("```javascript\ncode\n```")).toBe(true);
      });

      it("should return true for js code block", () => {
        expect(hasCodeBlock("```js\ncode\n```")).toBe(true);
      });

      it("should return true for node code block", () => {
        expect(hasCodeBlock("```node\ncode\n```")).toBe(true);
      });

      it("should return true for unmarked code block", () => {
        expect(hasCodeBlock("```\ncode\n```")).toBe(true);
      });

      it("should return false for text without code block", () => {
        expect(hasCodeBlock("Just some text")).toBe(false);
      });

      it("should return false for inline code", () => {
        expect(hasCodeBlock("Use `code` here")).toBe(false);
      });
    });

    describe("hasFinalResponse", () => {
      it("should return true for FINAL response", () => {
        expect(hasFinalResponse("FINAL(answer)")).toBe(true);
      });

      it("should return true for FINAL_VAR response", () => {
        expect(hasFinalResponse("FINAL_VAR(result)")).toBe(true);
      });

      it("should return false for no final response", () => {
        expect(hasFinalResponse("Still working...")).toBe(false);
      });

      it("should return false for partial match", () => {
        expect(hasFinalResponse("This is FINAL")).toBe(false);
      });
    });
  });

  describe("RLMClient", () => {
    let mockClient: MockCopilotClient;
    let mockEnvironment: MockEnvironment;

    beforeEach(() => {
      mockClient = createMockCopilotClient();
      mockEnvironment = createMockEnvironment();
    });

    describe("constructor and createRLMClient", () => {
      it("should create client with default config", () => {
        const rlmClient = createRLMClient(
          mockClient as unknown as Parameters<typeof createRLMClient>[0],
          mockEnvironment as unknown as Parameters<typeof createRLMClient>[1],
        );
        expect(rlmClient).toBeInstanceOf(RLMClient);
      });

      it("should create client with custom config", () => {
        const customConfig: Partial<RLMClientConfig> = {
          maxIterations: 20,
          maxDepth: 5,
          debug: true,
        };
        const rlmClient = createRLMClient(
          mockClient as unknown as Parameters<typeof createRLMClient>[0],
          mockEnvironment as unknown as Parameters<typeof createRLMClient>[1],
          customConfig,
        );
        expect(rlmClient).toBeInstanceOf(RLMClient);
      });

      it("should merge custom config with defaults", () => {
        const customConfig: Partial<RLMClientConfig> = {
          maxIterations: 20,
        };
        const rlmClient = new RLMClient(
          mockClient as unknown as Parameters<typeof createRLMClient>[0],
          mockEnvironment as unknown as Parameters<typeof createRLMClient>[1],
          customConfig,
        );
        expect(rlmClient).toBeDefined();
      });
    });

    describe("event handlers (on/off)", () => {
      it("should register event handler with on()", () => {
        const rlmClient = createRLMClient(
          mockClient as unknown as Parameters<typeof createRLMClient>[0],
          mockEnvironment as unknown as Parameters<typeof createRLMClient>[1],
        );
        const handler: RLMEventHandler = vi.fn();

        rlmClient.on(handler);
        expect(true).toBe(true);
      });

      it("should unregister event handler with off()", () => {
        const rlmClient = createRLMClient(
          mockClient as unknown as Parameters<typeof createRLMClient>[0],
          mockEnvironment as unknown as Parameters<typeof createRLMClient>[1],
        );
        const handler: RLMEventHandler = vi.fn();

        rlmClient.on(handler);
        rlmClient.off(handler);
        expect(true).toBe(true);
      });

      it("should allow multiple handlers", () => {
        const rlmClient = createRLMClient(
          mockClient as unknown as Parameters<typeof createRLMClient>[0],
          mockEnvironment as unknown as Parameters<typeof createRLMClient>[1],
        );
        const handler1: RLMEventHandler = vi.fn();
        const handler2: RLMEventHandler = vi.fn();

        rlmClient.on(handler1);
        rlmClient.on(handler2);
        expect(true).toBe(true);
      });

      it("should safely remove non-existent handler", () => {
        const rlmClient = createRLMClient(
          mockClient as unknown as Parameters<typeof createRLMClient>[0],
          mockEnvironment as unknown as Parameters<typeof createRLMClient>[1],
        );
        const handler: RLMEventHandler = vi.fn();

        rlmClient.off(handler);
        expect(true).toBe(true);
      });
    });

    describe("getCurrentExecution", () => {
      it("should return null when no execution is running", () => {
        const rlmClient = createRLMClient(
          mockClient as unknown as Parameters<typeof createRLMClient>[0],
          mockEnvironment as unknown as Parameters<typeof createRLMClient>[1],
        );
        expect(rlmClient.getCurrentExecution()).toBeNull();
      });
    });

    describe("stop", () => {
      it("should not throw when called with no execution", () => {
        const rlmClient = createRLMClient(
          mockClient as unknown as Parameters<typeof createRLMClient>[0],
          mockEnvironment as unknown as Parameters<typeof createRLMClient>[1],
        );
        rlmClient.stop();
        expect(true).toBe(true);
      });
    });

    describe("execute - initialization failures", () => {
      it("should fail when environment initialization fails", async () => {
        mockEnvironment.initialize.mockResolvedValue(
          failure({
            code: "INIT_ERROR",
            message: "Environment initialization failed",
          }),
        );

        const rlmClient = createRLMClient(
          mockClient as unknown as Parameters<typeof createRLMClient>[0],
          mockEnvironment as unknown as Parameters<typeof createRLMClient>[1],
        );

        const result = await rlmClient.execute("test query", "test context");

        expectFailure(result);
        expect(result.error?.message).toBe("Environment initialization failed");
      });

      it("should fail when setting initial context fails", async () => {
        mockEnvironment.setVariable.mockResolvedValue(
          failure({ code: "SET_VAR_ERROR", message: "Failed to set variable" }),
        );

        const rlmClient = createRLMClient(
          mockClient as unknown as Parameters<typeof createRLMClient>[0],
          mockEnvironment as unknown as Parameters<typeof createRLMClient>[1],
        );

        const result = await rlmClient.execute("test query", "test context");

        expectFailure(result);
        expect(result.error?.message).toContain(
          "Failed to set initial context",
        );
      });
    });

    describe("execute - with LLM responses", () => {
      it("should complete execution when FINAL response is received", async () => {
        mockClient.mockSession.on.mockImplementation(
          (
            callback: (event: {
              type: string;
              data?: { content?: string; message?: string };
            }) => void,
          ) => {
            setTimeout(() => {
              callback({
                type: "assistant.message",
                data: { content: "FINAL(the answer is 42)" },
              });
              callback({ type: "session.idle" });
            }, 10);
          },
        );

        const rlmClient = createRLMClient(
          mockClient as unknown as Parameters<typeof createRLMClient>[0],
          mockEnvironment as unknown as Parameters<typeof createRLMClient>[1],
        );

        const events: RLMEvent[] = [];
        rlmClient.on((event) => events.push(event));

        const result = await rlmClient.execute(
          "What is the answer?",
          "context data",
        );

        expectSuccess(result);
        expect(result.data.status).toBe("completed");
        expect(result.data.finalAnswer).toBe("the answer is 42");

        expect(events.some((e) => e.type === "execution_start")).toBe(true);
        expect(events.some((e) => e.type === "execution_complete")).toBe(true);
      });

      it("should emit events during execution", async () => {
        mockClient.mockSession.on.mockImplementation(
          (
            callback: (event: {
              type: string;
              data?: { content?: string; message?: string };
            }) => void,
          ) => {
            setTimeout(() => {
              callback({
                type: "assistant.message",
                data: { content: "FINAL(done)" },
              });
              callback({ type: "session.idle" });
            }, 10);
          },
        );

        const rlmClient = createRLMClient(
          mockClient as unknown as Parameters<typeof createRLMClient>[0],
          mockEnvironment as unknown as Parameters<typeof createRLMClient>[1],
        );

        const events: RLMEvent[] = [];
        rlmClient.on((event) => events.push(event));

        await rlmClient.execute("query", "context");

        const eventTypes = events.map((e) => e.type);
        expect(eventTypes).toContain("execution_start");
        expect(eventTypes).toContain("iteration_start");
      });

      it("should execute code when code block is present", async () => {
        const codeResponse = `Let me analyze this:
\`\`\`python
result = 10 + 32
print(result)
\`\`\``;

        mockClient.mockSession.on.mockImplementation(
          (
            callback: (event: {
              type: string;
              data?: { content?: string; message?: string };
            }) => void,
          ) => {
            setTimeout(() => {
              callback({
                type: "assistant.message",
                data: { content: codeResponse },
              });
              callback({ type: "session.idle" });
            }, 10);
          },
        );

        mockEnvironment.execute.mockResolvedValue(
          success({
            success: true,
            stdout: "FINAL(42)",
            stderr: "",
            durationMs: 50,
          }),
        );

        const rlmClient = createRLMClient(
          mockClient as unknown as Parameters<typeof createRLMClient>[0],
          mockEnvironment as unknown as Parameters<typeof createRLMClient>[1],
        );

        const events: RLMEvent[] = [];
        rlmClient.on((event) => events.push(event));

        const result = await rlmClient.execute("calculate 10 + 32", "");

        expectSuccess(result);
        expect(result.data.finalAnswer).toBe("42");

        expect(events.some((e) => e.type === "code_extracted")).toBe(true);
        expect(events.some((e) => e.type === "repl_executing")).toBe(true);
        expect(events.some((e) => e.type === "repl_result")).toBe(true);
      });

      it("should handle LLM errors", async () => {
        mockClient.mockSession.on.mockImplementation(
          (
            callback: (event: {
              type: string;
              data?: { content?: string; message?: string };
            }) => void,
          ) => {
            setTimeout(() => {
              callback({
                type: "session.error",
                data: { message: "Rate limit exceeded" },
              });
            }, 10);
          },
        );

        const rlmClient = createRLMClient(
          mockClient as unknown as Parameters<typeof createRLMClient>[0],
          mockEnvironment as unknown as Parameters<typeof createRLMClient>[1],
        );

        const result = await rlmClient.execute("query", "context");

        expectFailure(result);
      });

      it("should call dispose on environment after execution", async () => {
        mockClient.mockSession.on.mockImplementation(
          (
            callback: (event: {
              type: string;
              data?: { content?: string; message?: string };
            }) => void,
          ) => {
            setTimeout(() => {
              callback({
                type: "assistant.message",
                data: { content: "FINAL(done)" },
              });
              callback({ type: "session.idle" });
            }, 10);
          },
        );

        const rlmClient = createRLMClient(
          mockClient as unknown as Parameters<typeof createRLMClient>[0],
          mockEnvironment as unknown as Parameters<typeof createRLMClient>[1],
        );

        await rlmClient.execute("query", "context");

        expect(mockEnvironment.dispose).toHaveBeenCalled();
      });
    });

    describe("execute - with options", () => {
      it("should set initial variables when provided", async () => {
        mockClient.mockSession.on.mockImplementation(
          (
            callback: (event: {
              type: string;
              data?: { content?: string; message?: string };
            }) => void,
          ) => {
            setTimeout(() => {
              callback({
                type: "assistant.message",
                data: { content: "FINAL(done)" },
              });
              callback({ type: "session.idle" });
            }, 10);
          },
        );

        const rlmClient = createRLMClient(
          mockClient as unknown as Parameters<typeof createRLMClient>[0],
          mockEnvironment as unknown as Parameters<typeof createRLMClient>[1],
        );

        await rlmClient.execute("query", "context", {
          initialVariables: { myVar: "value", count: 42 },
        });

        expect(mockEnvironment.setVariable).toHaveBeenCalledWith(
          "myVar",
          "value",
        );
        expect(mockEnvironment.setVariable).toHaveBeenCalledWith("count", 42);
      });

      it("should register LLM query callback", async () => {
        mockClient.mockSession.on.mockImplementation(
          (
            callback: (event: {
              type: string;
              data?: { content?: string; message?: string };
            }) => void,
          ) => {
            setTimeout(() => {
              callback({
                type: "assistant.message",
                data: { content: "FINAL(done)" },
              });
              callback({ type: "session.idle" });
            }, 10);
          },
        );

        const rlmClient = createRLMClient(
          mockClient as unknown as Parameters<typeof createRLMClient>[0],
          mockEnvironment as unknown as Parameters<typeof createRLMClient>[1],
        );

        await rlmClient.execute("query", "context");

        expect(mockEnvironment.registerLLMQueryCallback).toHaveBeenCalled();
      });
    });

    describe("execute - FINAL_VAR resolution", () => {
      it("should resolve FINAL_VAR from environment variable", async () => {
        mockClient.mockSession.on.mockImplementation(
          (
            callback: (event: {
              type: string;
              data?: { content?: string; message?: string };
            }) => void,
          ) => {
            setTimeout(() => {
              callback({
                type: "assistant.message",
                data: { content: "FINAL_VAR(result)" },
              });
              callback({ type: "session.idle" });
            }, 10);
          },
        );

        mockEnvironment.getVariable.mockResolvedValue(
          success("resolved value"),
        );

        const rlmClient = createRLMClient(
          mockClient as unknown as Parameters<typeof createRLMClient>[0],
          mockEnvironment as unknown as Parameters<typeof createRLMClient>[1],
        );

        const result = await rlmClient.execute("query", "context");

        expectSuccess(result);
        expect(result.data.finalAnswer).toBe("resolved value");
        expect(mockEnvironment.getVariable).toHaveBeenCalledWith("result");
      });

      it("should handle FINAL_VAR with object value", async () => {
        mockClient.mockSession.on.mockImplementation(
          (
            callback: (event: {
              type: string;
              data?: { content?: string; message?: string };
            }) => void,
          ) => {
            setTimeout(() => {
              callback({
                type: "assistant.message",
                data: { content: "FINAL_VAR(data)" },
              });
              callback({ type: "session.idle" });
            }, 10);
          },
        );

        mockEnvironment.getVariable.mockResolvedValue(
          success({ key: "value", num: 123 }),
        );

        const rlmClient = createRLMClient(
          mockClient as unknown as Parameters<typeof createRLMClient>[0],
          mockEnvironment as unknown as Parameters<typeof createRLMClient>[1],
        );

        const result = await rlmClient.execute("query", "context");

        expectSuccess(result);
        expect(result.data.finalAnswer).toBe('{"key":"value","num":123}');
      });
    });
  });

  describe("DEFAULT_RLM_CONFIG", () => {
    it("should have expected default values", () => {
      expect(DEFAULT_RLM_CONFIG.maxIterations).toBe(10);
      expect(DEFAULT_RLM_CONFIG.maxDepth).toBe(3);
      expect(DEFAULT_RLM_CONFIG.iterationTimeoutMs).toBe(30000);
      expect(DEFAULT_RLM_CONFIG.totalTimeoutMs).toBe(300000);
      expect(DEFAULT_RLM_CONFIG.debug).toBe(false);
      expect(DEFAULT_RLM_CONFIG.language).toBe("python");
    });
  });

  describe("exported prompt constants", () => {
    it("PYTHON_SYSTEM_PROMPT should contain Python-specific content", () => {
      expect(PYTHON_SYSTEM_PROMPT).toContain("Python REPL");
      expect(PYTHON_SYSTEM_PROMPT).toContain("llm_query");
      expect(PYTHON_SYSTEM_PROMPT).toContain("FINAL(");
      expect(PYTHON_SYSTEM_PROMPT).toContain("FINAL_VAR(");
    });

    it("NODEJS_SYSTEM_PROMPT should contain Node.js-specific content", () => {
      expect(NODEJS_SYSTEM_PROMPT).toContain("Node.js REPL");
      expect(NODEJS_SYSTEM_PROMPT).toContain("Promise");
      expect(NODEJS_SYSTEM_PROMPT).toContain("async/await");
    });
  });
});
