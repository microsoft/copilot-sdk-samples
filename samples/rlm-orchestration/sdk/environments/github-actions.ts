/**
 * GitHub Actions Environment Adapter
 *
 * Bridges BaseEnvironment to GitHubActionsConnector for executing REPL code
 * in GitHub Actions workflows. Since GitHub Actions is stateless, variables
 * are tracked locally and injected with each execution.
 */

import {
  ConnectorResult,
  success,
  failure,
  ErrorCodes,
} from "../../../../shared/connectors/types.js";
import {
  createGitHubActionsConnector,
  GitHubActionsConnector,
  GitHubActionsConnectorConfig,
} from "../../../../shared/connectors/github-actions/index.js";
import { REPLResult, REPLLanguage } from "../types.js";
import {
  AbstractEnvironment,
  EnvironmentConfig,
  EnvironmentHealthStatus,
  REPLHelpers,
} from "./base.js";

export interface GitHubActionsEnvironmentConfig extends EnvironmentConfig {
  owner?: string;
  repo?: string;
  token?: string;
  workflowId?: number | string;
  ref?: string;
}

export class GitHubActionsEnvironment extends AbstractEnvironment {
  readonly name = "github-actions";
  readonly type = "github-actions" as const;
  readonly language: REPLLanguage;

  private connector: GitHubActionsConnector;
  private workflowId: number | string;
  private ref: string;

  constructor(config: GitHubActionsEnvironmentConfig) {
    super(config);
    this.language = config.language;
    this.workflowId = config.workflowId ?? 2;
    this.ref = config.ref ?? "main";

    const connectorConfig: GitHubActionsConnectorConfig = {
      mode: config.mode,
      debug: config.debug,
      owner: config.owner,
      repo: config.repo,
      token: config.token,
    };

    this.connector = createGitHubActionsConnector(connectorConfig);
  }

  async initialize(): Promise<ConnectorResult<void>> {
    const result = await this.connector.initialize();
    if (result.success) {
      this._isInitialized = true;
      this._sessionId = `gha-${Date.now()}`;
    }
    return result;
  }

  async dispose(): Promise<void> {
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
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Environment not initialized",
      });
    }

    const mergedVariables = { ...this._variables, ...variables };
    const contextValue = this.getContextValue(mergedVariables);
    const helpersCode = this.getHelpersCode(contextValue);
    const fullCode =
      helpersCode + "\n" + this.wrapVariables(mergedVariables) + "\n" + code;

    const startTime = Date.now();

    const result = await this.connector.executeREPL({
      code: fullCode,
      language: this.language,
      timeout: timeout ?? this.config.timeoutMs,
      workflowId: this.workflowId,
      ref: this.ref,
    });

    if (!result.success) {
      return failure(result.error!);
    }

    const executionResult = result.data!;
    const durationMs = Date.now() - startTime;

    const replResult: REPLResult = {
      success: executionResult.conclusion === "success",
      stdout: executionResult.output ?? "",
      stderr: executionResult.error ?? "",
      durationMs,
      variables: mergedVariables,
    };

    if (executionResult.error) {
      replResult.error = {
        type: "ExecutionError",
        message: executionResult.error,
      };
    }

    return success(replResult);
  }

  async setVariable(
    name: string,
    value: unknown,
  ): Promise<ConnectorResult<void>> {
    this._variables[name] = value;
    return success(undefined);
  }

  async getVariable(name: string): Promise<ConnectorResult<unknown>> {
    if (!(name in this._variables)) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Variable '${name}' not found`,
      });
    }
    return success(this._variables[name]);
  }

  async getVariables(): Promise<ConnectorResult<Record<string, unknown>>> {
    return success({ ...this._variables });
  }

  async clearContext(): Promise<ConnectorResult<void>> {
    this._variables = {};
    return success(undefined);
  }

  async healthCheck(): Promise<ConnectorResult<EnvironmentHealthStatus>> {
    const connectorHealth = await this.connector.healthCheck();

    if (!connectorHealth.success) {
      return success({
        healthy: false,
        sessionActive: this._isInitialized,
        diagnostics: [
          connectorHealth.error?.message ?? "Connector health check failed",
        ],
      });
    }

    return success({
      healthy: connectorHealth.data!.healthy,
      sessionActive: this._isInitialized,
      lastActivityAt: new Date().toISOString(),
      diagnostics: [],
    });
  }

  private getContextValue(variables: Record<string, unknown>): string {
    const context = variables["context_0"];
    if (typeof context === "string") {
      return context;
    }
    return "";
  }

  private getHelpersCode(contextValue: string): string {
    if (this.language === "python") {
      return REPLHelpers.getPythonHelpers(contextValue);
    }
    return REPLHelpers.getNodeHelpers(contextValue);
  }

  private wrapVariables(variables: Record<string, unknown>): string {
    const entries = Object.entries(variables).filter(
      ([key]) => key !== "context_0",
    );

    if (entries.length === 0) {
      return "";
    }

    if (this.language === "python") {
      return entries
        .map(([key, value]) => `${key} = ${JSON.stringify(value)}`)
        .join("\n");
    }

    return entries
      .map(([key, value]) => `const ${key} = ${JSON.stringify(value)};`)
      .join("\n");
  }
}

export function createGitHubActionsEnvironment(
  config: GitHubActionsEnvironmentConfig,
): GitHubActionsEnvironment {
  return new GitHubActionsEnvironment(config);
}
