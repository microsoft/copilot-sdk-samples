import {
  ConnectorResult,
  success,
  failure,
  ErrorCodes,
} from "../../../../shared/connectors/types.js";
import {
  ACASessionsConnector,
  createACASessionsConnector,
} from "../../../../shared/connectors/aca-sessions/client.js";
import { ACASessionsConnectorConfig } from "../../../../shared/connectors/aca-sessions/types.js";
import {
  REPLResult,
  REPLLanguage,
  RLMIteration,
  createIteration,
} from "../types.js";
import {
  AbstractEnvironment,
  EnvironmentConfig,
  EnvironmentHealthStatus,
  REPLHelpers,
} from "./base.js";

export interface ACASessionsEnvironmentConfig extends EnvironmentConfig {
  poolManagementEndpoint?: string;
  credential?: string;
}

export class ACASessionsEnvironment extends AbstractEnvironment {
  readonly name = "ACA Sessions Environment";
  readonly type = "aca-sessions" as const;
  readonly language: REPLLanguage;

  private connector: ACASessionsConnector;

  constructor(config: ACASessionsEnvironmentConfig) {
    super(config);
    this.language = config.language;

    const connectorConfig: ACASessionsConnectorConfig = {
      mode: config.mode,
      debug: config.debug,
      poolManagementEndpoint: config.poolManagementEndpoint,
      credential: config.credential,
    };

    this.connector = createACASessionsConnector(connectorConfig);
  }

  async initialize(): Promise<ConnectorResult<void>> {
    const initResult = await this.connector.initialize();
    if (!initResult.success) {
      return initResult;
    }

    const sessionResult = await this.connector.createSession();
    if (!sessionResult.success || !sessionResult.data) {
      return failure({
        code: ErrorCodes.INTERNAL_ERROR,
        message: `Failed to create session: ${sessionResult.error?.message}`,
      });
    }

    this._sessionId = sessionResult.data.id;
    this._isInitialized = true;

    return success(undefined);
  }

  async dispose(): Promise<void> {
    if (this._sessionId) {
      await this.connector.deleteSession(this._sessionId);
    }
    await this.connector.dispose();
    this._isInitialized = false;
    this._sessionId = undefined;
    this._variables = {};
  }

  async execute(
    code: string,
    variables?: Record<string, unknown>,
    timeout?: number,
  ): Promise<ConnectorResult<REPLResult>> {
    if (!this._isInitialized || !this._sessionId) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Environment not initialized",
      });
    }

    if (variables) {
      for (const [name, value] of Object.entries(variables)) {
        const setResult = await this.setVariable(name, value);
        if (!setResult.success) {
          return failure({
            code: ErrorCodes.INTERNAL_ERROR,
            message: `Failed to set variable ${name}: ${setResult.error?.message}`,
          });
        }
      }
    }

    const contextValue = (this._variables["context_0"] as string) ?? "";
    const helperCode =
      this.language === "python"
        ? REPLHelpers.getPythonHelpers(contextValue)
        : REPLHelpers.getNodeHelpers(contextValue);

    const fullCode = `${helperCode}\n${code}`;

    const startTime = Date.now();
    const execResult = await this.connector.executeCode({
      sessionId: this._sessionId,
      code: fullCode,
      executionType: "synchronous",
    });

    const durationMs = Date.now() - startTime;

    if (!execResult.success || !execResult.data) {
      return failure({
        code: ErrorCodes.INTERNAL_ERROR,
        message: `Code execution failed: ${execResult.error?.message}`,
      });
    }

    const { stdout, stderr, result } = execResult.data;

    const llmQueryResult = await this.processLLMQueryCalls(stdout, result);

    const replResult: REPLResult = {
      success: stderr === "",
      stdout: llmQueryResult.modifiedStdout,
      stderr,
      returnValue:
        llmQueryResult.modifiedResult ?? (result !== null ? result : undefined),
      durationMs,
      variables: { ...this._variables },
      error: stderr
        ? {
            type: "ExecutionError",
            message: stderr,
          }
        : undefined,
    };

    return success(replResult);
  }

  private async processLLMQueryCalls(
    stdout: string,
    result: string | null,
  ): Promise<{ modifiedStdout: string; modifiedResult: unknown }> {
    let modifiedStdout = stdout;
    let modifiedResult: unknown = result;

    const llmQueryPattern = /LLM_QUERY_CALL:\s*(.+?)(?:\n|$)/g;
    const llmQueryBatchedPattern =
      /LLM_QUERY_BATCHED_CALL:\s*(\[.+?\])(?:\n|$)/g;

    let match: RegExpExecArray | null;

    while ((match = llmQueryPattern.exec(stdout)) !== null) {
      const prompt = match[1].trim();
      if (this._llmQueryCallback) {
        const iteration = createIteration(0, prompt, 1);
        const response = await this._llmQueryCallback(prompt, iteration);
        modifiedStdout = modifiedStdout.replace(
          match[0],
          `LLM_QUERY_RESULT: ${response}\n`,
        );
        modifiedResult = response;
      }
    }

    while ((match = llmQueryBatchedPattern.exec(stdout)) !== null) {
      const promptsStr = match[1].trim();
      try {
        const prompts = JSON.parse(promptsStr) as string[];
        if (this._llmQueryBatchedCallback) {
          const iteration = createIteration(0, prompts.join("; "), 1);
          const responses = await this._llmQueryBatchedCallback(
            prompts,
            iteration,
          );
          modifiedStdout = modifiedStdout.replace(
            match[0],
            `LLM_QUERY_BATCHED_RESULT: ${JSON.stringify(responses)}\n`,
          );
          modifiedResult = responses;
        } else if (this._llmQueryCallback) {
          const iteration = createIteration(0, prompts.join("; "), 1);
          const responses = await Promise.all(
            prompts.map((p) => this._llmQueryCallback!(p, iteration)),
          );
          modifiedStdout = modifiedStdout.replace(
            match[0],
            `LLM_QUERY_BATCHED_RESULT: ${JSON.stringify(responses)}\n`,
          );
          modifiedResult = responses;
        }
      } catch {}
    }

    return { modifiedStdout, modifiedResult };
  }

  async setVariable(
    name: string,
    value: unknown,
  ): Promise<ConnectorResult<void>> {
    if (!this._isInitialized || !this._sessionId) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Environment not initialized",
      });
    }

    const stringValue =
      typeof value === "string" ? value : JSON.stringify(value);

    const result = await this.connector.setVariable({
      sessionId: this._sessionId,
      name,
      value: stringValue,
    });

    if (result.success) {
      this._variables[name] = value;
    }

    return result;
  }

  async getVariable(name: string): Promise<ConnectorResult<unknown>> {
    if (!this._isInitialized || !this._sessionId) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Environment not initialized",
      });
    }

    const result = await this.connector.getVariable({
      sessionId: this._sessionId,
      name,
    });

    if (!result.success || !result.data) {
      return failure({
        code: result.error?.code ?? ErrorCodes.NOT_FOUND,
        message: result.error?.message ?? `Variable ${name} not found`,
      });
    }

    const value = result.data.value;
    try {
      return success(JSON.parse(value));
    } catch {
      return success(value);
    }
  }

  async getVariables(): Promise<ConnectorResult<Record<string, unknown>>> {
    if (!this._isInitialized || !this._sessionId) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Environment not initialized",
      });
    }

    const result = await this.connector.listVariables(this._sessionId);

    if (!result.success || !result.data) {
      return failure({
        code: result.error?.code ?? ErrorCodes.INTERNAL_ERROR,
        message: result.error?.message ?? "Failed to list variables",
      });
    }

    const variables: Record<string, unknown> = {};
    for (const v of result.data) {
      try {
        variables[v.name] = JSON.parse(v.value);
      } catch {
        variables[v.name] = v.value;
      }
    }

    return success(variables);
  }

  async clearContext(): Promise<ConnectorResult<void>> {
    if (!this._isInitialized || !this._sessionId) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Environment not initialized",
      });
    }

    await this.connector.deleteSession(this._sessionId);

    const sessionResult = await this.connector.createSession();
    if (!sessionResult.success || !sessionResult.data) {
      return failure({
        code: ErrorCodes.INTERNAL_ERROR,
        message: `Failed to create new session: ${sessionResult.error?.message}`,
      });
    }

    this._sessionId = sessionResult.data.id;
    this._variables = {};

    return success(undefined);
  }

  async healthCheck(): Promise<ConnectorResult<EnvironmentHealthStatus>> {
    const connectorHealth = await this.connector.healthCheck();

    if (!connectorHealth.success || !connectorHealth.data) {
      return success({
        healthy: false,
        sessionActive: false,
        diagnostics: [
          connectorHealth.error?.message ?? "Connector health check failed",
        ],
      });
    }

    let sessionActive = false;
    if (this._sessionId) {
      const sessionResult = await this.connector.getSession(this._sessionId);
      sessionActive =
        sessionResult.success &&
        sessionResult.data !== undefined &&
        sessionResult.data.state === "running";
    }

    return success({
      healthy: connectorHealth.data.healthy,
      sessionActive,
      lastActivityAt: new Date().toISOString(),
      diagnostics: connectorHealth.data.details
        ? Object.entries(connectorHealth.data.details).map(
            ([k, v]) => `${k}: ${JSON.stringify(v)}`,
          )
        : undefined,
    });
  }
}

export function createACASessionsEnvironment(
  config: ACASessionsEnvironmentConfig,
): ACASessionsEnvironment {
  return new ACASessionsEnvironment(config);
}
