/**
 * Base Environment Interface for RLM Execution
 *
 * Environments provide a sandboxed REPL where the LLM can execute code
 * and access special functions like llm_query() for recursive self-calls.
 */

import { ConnectorResult } from "../../../../shared/connectors/types.js";
import { REPLResult, RLMIteration, REPLLanguage } from "../types.js";

/** Environment type identifiers */
export type EnvironmentType = "github-actions" | "aca-sessions" | "local";

/**
 * Configuration for environment creation
 */
export interface EnvironmentConfig {
  /** Connector mode - mock for testing, live for real execution */
  mode: "mock" | "live";
  /** Runtime language for code execution */
  language: REPLLanguage;
  /** Enable debug logging */
  debug?: boolean;
  /** Custom timeout for operations in milliseconds */
  timeoutMs?: number;
}

/**
 * Callback type for handling llm_query calls from the REPL
 */
export type LLMQueryCallback = (
  prompt: string,
  iteration: RLMIteration,
) => Promise<string>;

/**
 * Callback type for handling llm_query_batched calls from the REPL
 */
export type LLMQueryBatchedCallback = (
  prompts: string[],
  iteration: RLMIteration,
) => Promise<string[]>;

/**
 * Base interface for all RLM execution environments.
 *
 * Environments provide a sandboxed REPL where the LLM can execute code
 * and access special functions like llm_query() for recursive self-calls.
 */
export interface BaseEnvironment {
  /** Environment name identifier */
  readonly name: string;

  /** Environment type */
  readonly type: EnvironmentType;

  /** Whether the environment is initialized */
  readonly isInitialized: boolean;

  /** Current session ID (if applicable) */
  readonly sessionId: string | undefined;

  /** Language configured for this environment */
  readonly language: REPLLanguage;

  /**
   * Initialize the environment.
   * Creates session, sets up context, etc.
   */
  initialize(): Promise<ConnectorResult<void>>;

  /**
   * Clean up resources.
   */
  dispose(): Promise<void>;

  /**
   * Execute code in the environment.
   *
   * The environment should have access to:
   * - context_0: The initial context variable
   * - llm_query(prompt): Function to recursively query the LLM
   * - llm_query_batched(prompts): Batch version for parallel queries
   * - peek(start, end): View a slice of context_0
   * - grep(pattern): Search context_0 using regex
   *
   * @param code - The code to execute (Python or Node.js)
   * @param variables - Variables to inject into the execution context
   * @param timeout - Execution timeout in milliseconds
   */
  execute(
    code: string,
    variables?: Record<string, unknown>,
    timeout?: number,
  ): Promise<ConnectorResult<REPLResult>>;

  /**
   * Set a variable in the execution context.
   * Used to inject context_0 and other variables.
   */
  setVariable(name: string, value: unknown): Promise<ConnectorResult<void>>;

  /**
   * Get a variable from the execution context.
   */
  getVariable(name: string): Promise<ConnectorResult<unknown>>;

  /**
   * Get all variables in the current context.
   */
  getVariables(): Promise<ConnectorResult<Record<string, unknown>>>;

  /**
   * Clear the execution context (reset all variables).
   */
  clearContext(): Promise<ConnectorResult<void>>;

  /**
   * Register the llm_query callback.
   * This is called when code in the REPL invokes llm_query().
   */
  registerLLMQueryCallback(callback: LLMQueryCallback): void;

  /**
   * Register the llm_query_batched callback.
   * This is called when code in the REPL invokes llm_query_batched().
   */
  registerLLMQueryBatchedCallback(callback: LLMQueryBatchedCallback): void;

  /**
   * Health check - verify the environment is operational.
   */
  healthCheck(): Promise<ConnectorResult<EnvironmentHealthStatus>>;
}

/**
 * Health status for an environment
 */
export interface EnvironmentHealthStatus {
  /** Whether the environment is healthy */
  healthy: boolean;
  /** Session status if applicable */
  sessionActive?: boolean;
  /** Last successful operation timestamp */
  lastActivityAt?: string;
  /** Any diagnostic messages */
  diagnostics?: string[];
}

/**
 * Factory function type for creating environments
 */
export type EnvironmentFactory = (config: EnvironmentConfig) => BaseEnvironment;

/**
 * Abstract base class providing common functionality for environments
 */
export abstract class AbstractEnvironment implements BaseEnvironment {
  abstract readonly name: string;
  abstract readonly type: EnvironmentType;
  abstract readonly language: REPLLanguage;

  protected _isInitialized: boolean = false;
  protected _sessionId: string | undefined;
  protected _llmQueryCallback: LLMQueryCallback | undefined;
  protected _llmQueryBatchedCallback: LLMQueryBatchedCallback | undefined;
  protected _variables: Record<string, unknown> = {};
  protected config: EnvironmentConfig;

  constructor(config: EnvironmentConfig) {
    this.config = config;
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  get sessionId(): string | undefined {
    return this._sessionId;
  }

  registerLLMQueryCallback(callback: LLMQueryCallback): void {
    this._llmQueryCallback = callback;
  }

  registerLLMQueryBatchedCallback(callback: LLMQueryBatchedCallback): void {
    this._llmQueryBatchedCallback = callback;
  }

  abstract initialize(): Promise<ConnectorResult<void>>;
  abstract dispose(): Promise<void>;
  abstract execute(
    code: string,
    variables?: Record<string, unknown>,
    timeout?: number,
  ): Promise<ConnectorResult<REPLResult>>;
  abstract setVariable(
    name: string,
    value: unknown,
  ): Promise<ConnectorResult<void>>;
  abstract getVariable(name: string): Promise<ConnectorResult<unknown>>;
  abstract getVariables(): Promise<ConnectorResult<Record<string, unknown>>>;
  abstract clearContext(): Promise<ConnectorResult<void>>;
  abstract healthCheck(): Promise<ConnectorResult<EnvironmentHealthStatus>>;

  /**
   * Helper to invoke the llm_query callback safely
   */
  protected async invokeLLMQuery(
    prompt: string,
    iteration: RLMIteration,
  ): Promise<string> {
    if (!this._llmQueryCallback) {
      throw new Error("llm_query callback not registered");
    }
    return this._llmQueryCallback(prompt, iteration);
  }

  /**
   * Helper to invoke the llm_query_batched callback safely
   */
  protected async invokeLLMQueryBatched(
    prompts: string[],
    iteration: RLMIteration,
  ): Promise<string[]> {
    if (!this._llmQueryBatchedCallback) {
      // Fall back to sequential calls if batched not registered
      if (this._llmQueryCallback) {
        return Promise.all(
          prompts.map((p) => this._llmQueryCallback!(p, iteration)),
        );
      }
      throw new Error("llm_query callback not registered");
    }
    return this._llmQueryBatchedCallback(prompts, iteration);
  }
}

/**
 * Helper functions for working with REPL code
 */
export const REPLHelpers = {
  /**
   * Generate the helper functions code to inject into Python REPL
   */
  getPythonHelpers(contextValue: string): string {
    return `
# RLM Helper Functions
context_0 = """${contextValue.replace(/"/g, '\\"')}"""

def peek(start: int, end: int) -> str:
    """View a slice of context_0[start:end]."""
    return context_0[start:end]

def grep(pattern: str) -> list:
    """Search context_0 using regex pattern. Returns matching lines."""
    import re
    lines = context_0.split('\\n')
    return [line for line in lines if re.search(pattern, line)]

# llm_query and llm_query_batched are injected by the environment
`;
  },

  /**
   * Generate the helper functions code to inject into Node.js REPL
   */
  getNodeHelpers(contextValue: string): string {
    return `
// RLM Helper Functions
const context_0 = \`${contextValue.replace(/`/g, "\\`")}\`;

function peek(start, end) {
  return context_0.slice(start, end);
}

function grep(pattern) {
  const regex = new RegExp(pattern);
  return context_0.split('\\n').filter(line => regex.test(line));
}

// llm_query and llm_query_batched are injected by the environment
`;
  },
};
