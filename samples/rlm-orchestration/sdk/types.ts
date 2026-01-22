/**
 * RLM Orchestration Types
 *
 * Based on the Recursive LLM (RLM) paper: https://alexzhang13.github.io/blog/2025/rlm/
 * Adapts recursive LLM patterns for use with GitHub Copilot SDK and cloud execution environments.
 */

/** Supported REPL languages */
export type REPLLanguage = "python" | "nodejs";

/** Result of code execution in the REPL environment */
export interface REPLResult {
  /** Whether execution succeeded */
  success: boolean;
  /** Standard output from execution */
  stdout: string;
  /** Standard error from execution */
  stderr: string;
  /** Return value (if any) - JSON serializable */
  returnValue?: unknown;
  /** Execution duration in milliseconds */
  durationMs: number;
  /** Variables defined in the execution context */
  variables?: Record<string, unknown>;
  /** Error information if execution failed */
  error?: REPLError;
}

/** Error from REPL execution */
export interface REPLError {
  /** Error type/class name */
  type: string;
  /** Error message */
  message: string;
  /** Stack trace if available */
  stack?: string;
  /** Line number where error occurred */
  line?: number;
}

/** Represents a single iteration of the RLM loop */
export interface RLMIteration {
  /** Unique iteration ID */
  id: string;
  /** Iteration number (0-indexed) */
  number: number;
  /** Input to the LLM for this iteration */
  input: string;
  /** Raw LLM response */
  llmResponse: string;
  /** Extracted code from LLM response (if any) */
  extractedCode?: string;
  /** REPL execution result (if code was executed) */
  replResult?: REPLResult;
  /** Nested LLM queries made during this iteration */
  nestedQueries: RLMIteration[];
  /** Whether this iteration produced a final answer */
  isFinal: boolean;
  /** The final answer if isFinal is true */
  finalAnswer?: string;
  /** Timestamp when iteration started */
  startedAt: string;
  /** Timestamp when iteration completed */
  completedAt?: string;
  /** Parent iteration ID (for nested queries) */
  parentId?: string;
  /** Recursion depth level */
  depth: number;
}

/** Overall RLM execution state */
export interface RLMExecution {
  /** Unique execution ID */
  id: string;
  /** Original query */
  query: string;
  /** Initial context provided */
  context: string;
  /** All top-level iterations in this execution */
  iterations: RLMIteration[];
  /** Current status */
  status: "pending" | "running" | "completed" | "failed" | "timeout";
  /** Final answer (if completed) */
  finalAnswer?: string;
  /** Error message (if failed) */
  error?: string;
  /** Maximum iterations allowed */
  maxIterations: number;
  /** Current recursion depth */
  currentDepth: number;
  /** Maximum recursion depth allowed */
  maxDepth: number;
  /** Execution started at */
  startedAt: string;
  /** Execution completed at */
  completedAt?: string;
  /** Environment type used */
  environmentType: "github-actions" | "aca-sessions" | "local";
  /** Language used for REPL */
  language: REPLLanguage;
  /** Total LLM calls made */
  totalLLMCalls: number;
  /** Total code executions */
  totalCodeExecutions: number;
}

/** Configuration for RLM client */
export interface RLMClientConfig {
  /** Maximum iterations before timeout */
  maxIterations: number;
  /** Maximum recursion depth for nested llm_query calls */
  maxDepth: number;
  /** Timeout per iteration in milliseconds */
  iterationTimeoutMs: number;
  /** Total execution timeout in milliseconds */
  totalTimeoutMs: number;
  /** Enable verbose logging */
  debug: boolean;
  /** Model to use (passed to Copilot SDK) */
  model?: string;
  /** Language for REPL execution */
  language: REPLLanguage;
}

/** Parsed FINAL response from LLM */
export interface FinalResponse {
  /** Type of final response */
  type: "FINAL" | "FINAL_VAR";
  /** Direct answer (for FINAL) */
  answer?: string;
  /** Variable name containing answer (for FINAL_VAR) */
  variableName?: string;
}

/** Context for llm_query injection */
export interface LLMQueryContext {
  /** Parent execution */
  executionId: string;
  /** Parent iteration (for nested calls) */
  parentIterationId?: string;
  /** Current recursion depth */
  depth: number;
  /** Variables available in current scope */
  variables: Record<string, unknown>;
}

/** Event emitted during RLM execution */
export type RLMEvent =
  | { type: "execution_start"; execution: RLMExecution }
  | { type: "execution_complete"; execution: RLMExecution }
  | {
      type: "iteration_start";
      iteration: RLMIteration;
      execution: RLMExecution;
    }
  | {
      type: "iteration_complete";
      iteration: RLMIteration;
      execution: RLMExecution;
    }
  | { type: "code_extracted"; code: string; iteration: RLMIteration }
  | { type: "repl_executing"; code: string; iteration: RLMIteration }
  | { type: "repl_result"; result: REPLResult; iteration: RLMIteration }
  | { type: "llm_query_start"; prompt: string; context: LLMQueryContext }
  | { type: "llm_query_complete"; response: string; context: LLMQueryContext }
  | { type: "final_detected"; response: FinalResponse; iteration: RLMIteration }
  | { type: "error"; error: Error; execution: RLMExecution };

/** Event handler for RLM execution */
export type RLMEventHandler = (event: RLMEvent) => void;

/** Statistics from an RLM execution */
export interface RLMExecutionStats {
  /** Total execution time in milliseconds */
  totalDurationMs: number;
  /** Number of top-level iterations */
  iterationCount: number;
  /** Total nested queries (recursive calls) */
  nestedQueryCount: number;
  /** Total code executions */
  codeExecutionCount: number;
  /** Average iteration time */
  avgIterationMs: number;
  /** Maximum recursion depth reached */
  maxDepthReached: number;
  /** Total tokens used (if available) */
  totalTokens?: number;
}

/**
 * Generate a unique ID for iterations/executions
 */
export function generateId(prefix: string = "rlm"): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `${prefix}_${timestamp}_${random}`;
}

/**
 * Create a new RLM execution object
 */
export function createExecution(
  query: string,
  context: string,
  config: RLMClientConfig,
  environmentType: RLMExecution["environmentType"],
): RLMExecution {
  return {
    id: generateId("exec"),
    query,
    context,
    iterations: [],
    status: "pending",
    maxIterations: config.maxIterations,
    currentDepth: 0,
    maxDepth: config.maxDepth,
    startedAt: new Date().toISOString(),
    environmentType,
    language: config.language,
    totalLLMCalls: 0,
    totalCodeExecutions: 0,
  };
}

/**
 * Create a new RLM iteration object
 */
export function createIteration(
  number: number,
  input: string,
  depth: number = 0,
  parentId?: string,
): RLMIteration {
  return {
    id: generateId("iter"),
    number,
    input,
    llmResponse: "",
    nestedQueries: [],
    isFinal: false,
    startedAt: new Date().toISOString(),
    parentId,
    depth,
  };
}

/**
 * Calculate execution statistics
 */
export function calculateStats(execution: RLMExecution): RLMExecutionStats {
  const countNested = (iterations: RLMIteration[]): number => {
    return iterations.reduce((sum, iter) => {
      return sum + iter.nestedQueries.length + countNested(iter.nestedQueries);
    }, 0);
  };

  const findMaxDepth = (
    iterations: RLMIteration[],
    currentMax: number = 0,
  ): number => {
    return iterations.reduce((max, iter) => {
      const iterMax = Math.max(
        iter.depth,
        findMaxDepth(iter.nestedQueries, max),
      );
      return Math.max(max, iterMax);
    }, currentMax);
  };

  const startTime = new Date(execution.startedAt).getTime();
  const endTime = execution.completedAt
    ? new Date(execution.completedAt).getTime()
    : Date.now();

  const totalDurationMs = endTime - startTime;
  const iterationCount = execution.iterations.length;
  const nestedQueryCount = countNested(execution.iterations);

  return {
    totalDurationMs,
    iterationCount,
    nestedQueryCount,
    codeExecutionCount: execution.totalCodeExecutions,
    avgIterationMs: iterationCount > 0 ? totalDurationMs / iterationCount : 0,
    maxDepthReached: findMaxDepth(execution.iterations),
  };
}
