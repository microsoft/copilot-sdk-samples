import {
  BaseConnector,
  ConnectorResult,
  HealthCheckResponse,
  success,
  failure,
  ErrorCodes,
} from "../types.js";
import {
  ACASessionsConnectorConfig,
  ACASession,
  CodeExecutionResult,
  SessionVariable,
  SessionFile,
  CreateSessionOptions,
  ExecuteCodeOptions,
  SetVariableOptions,
  GetVariableOptions,
  UploadFileOptions,
  DownloadFileOptions,
  ListFilesOptions,
} from "./types.js";

/** Azure Container Apps Dynamic Sessions connector interface */
export interface ACASessionsConnector extends BaseConnector {
  createSession(
    options?: CreateSessionOptions,
  ): Promise<ConnectorResult<ACASession>>;

  getSession(sessionId: string): Promise<ConnectorResult<ACASession>>;

  deleteSession(sessionId: string): Promise<ConnectorResult<void>>;

  executeCode(
    options: ExecuteCodeOptions,
  ): Promise<ConnectorResult<CodeExecutionResult>>;

  setVariable(options: SetVariableOptions): Promise<ConnectorResult<void>>;

  getVariable(
    options: GetVariableOptions,
  ): Promise<ConnectorResult<SessionVariable>>;

  listVariables(sessionId: string): Promise<ConnectorResult<SessionVariable[]>>;

  uploadFile(options: UploadFileOptions): Promise<ConnectorResult<SessionFile>>;

  downloadFile(options: DownloadFileOptions): Promise<ConnectorResult<string>>;

  listFiles(options: ListFilesOptions): Promise<ConnectorResult<SessionFile[]>>;
}

export function createACASessionsConnector(
  config: ACASessionsConnectorConfig,
): ACASessionsConnector {
  if (config.mode === "mock") {
    return new MockACASessionsConnector(config);
  }
  return new LiveACASessionsConnector(config);
}

class MockACASessionsConnector implements ACASessionsConnector {
  readonly name = "aca-sessions";
  readonly mode = "mock" as const;
  private _isInitialized = false;

  private sessions: Map<string, ACASession> = new Map();
  private variables: Map<string, Map<string, SessionVariable>> = new Map();
  private files: Map<
    string,
    Map<string, { meta: SessionFile; content: string }>
  > = new Map();
  private nextSessionId = 1;

  constructor(private config: ACASessionsConnectorConfig) {}

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async initialize(): Promise<ConnectorResult<void>> {
    this._isInitialized = true;
    return success(undefined);
  }

  async dispose(): Promise<void> {
    this._isInitialized = false;
    this.sessions.clear();
    this.variables.clear();
    this.files.clear();
  }

  async healthCheck(): Promise<ConnectorResult<HealthCheckResponse>> {
    return success({
      healthy: true,
      version: "mock-v1",
      details: { mode: "mock", sessionCount: this.sessions.size },
    });
  }

  async createSession(
    options?: CreateSessionOptions,
  ): Promise<ConnectorResult<ACASession>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const now = new Date().toISOString();
    const sessionId = `session-${this.nextSessionId++}`;
    const identifier = options?.identifier ?? sessionId;

    const session: ACASession = {
      id: sessionId,
      identifier,
      state: "running",
      createdAt: now,
      lastAccessedAt: now,
    };

    this.sessions.set(sessionId, session);
    this.variables.set(sessionId, new Map());
    this.files.set(sessionId, new Map());

    return success(session);
  }

  async getSession(sessionId: string): Promise<ConnectorResult<ACASession>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Session ${sessionId} not found`,
      });
    }

    session.lastAccessedAt = new Date().toISOString();
    return success(session);
  }

  async deleteSession(sessionId: string): Promise<ConnectorResult<void>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    if (!this.sessions.has(sessionId)) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Session ${sessionId} not found`,
      });
    }

    this.sessions.delete(sessionId);
    this.variables.delete(sessionId);
    this.files.delete(sessionId);

    return success(undefined);
  }

  async executeCode(
    options: ExecuteCodeOptions,
  ): Promise<ConnectorResult<CodeExecutionResult>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const session = this.sessions.get(options.sessionId);
    if (!session) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Session ${options.sessionId} not found`,
      });
    }

    session.lastAccessedAt = new Date().toISOString();

    const startTime = Date.now();
    const { stdout, stderr, result } = this.simulateCodeExecution(options.code);
    const executionTimeInMs = Date.now() - startTime;

    return success({
      stdout,
      stderr,
      result,
      executionTimeInMs,
    });
  }

  private simulateCodeExecution(code: string): {
    stdout: string;
    stderr: string;
    result: string | null;
  } {
    if (code.includes("print(")) {
      const match = code.match(/print\(["'](.+?)["']\)/);
      if (match) {
        return { stdout: match[1] + "\n", stderr: "", result: null };
      }
      const exprMatch = code.match(/print\((.+?)\)/);
      if (exprMatch) {
        return { stdout: `${exprMatch[1]}\n`, stderr: "", result: null };
      }
    }

    if (code.includes("raise") || code.includes("Error")) {
      return {
        stdout: "",
        stderr:
          "Traceback (most recent call last):\n  SimulatedError: mock error\n",
        result: null,
      };
    }

    const assignMatch = code.match(/(\w+)\s*=\s*(.+)/);
    if (assignMatch) {
      return { stdout: "", stderr: "", result: assignMatch[2] };
    }

    const simpleExpr = code.trim();
    if (/^\d+\s*[+\-*/]\s*\d+$/.test(simpleExpr)) {
      try {
        const evalResult = Function(`"use strict"; return (${simpleExpr})`)();
        return { stdout: "", stderr: "", result: String(evalResult) };
      } catch {
        return { stdout: "", stderr: "", result: simpleExpr };
      }
    }

    return { stdout: "", stderr: "", result: null };
  }

  async setVariable(
    options: SetVariableOptions,
  ): Promise<ConnectorResult<void>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const session = this.sessions.get(options.sessionId);
    if (!session) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Session ${options.sessionId} not found`,
      });
    }

    session.lastAccessedAt = new Date().toISOString();

    const sessionVars = this.variables.get(options.sessionId)!;
    sessionVars.set(options.name, {
      name: options.name,
      value: options.value,
      type: typeof options.value,
    });

    return success(undefined);
  }

  async getVariable(
    options: GetVariableOptions,
  ): Promise<ConnectorResult<SessionVariable>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const session = this.sessions.get(options.sessionId);
    if (!session) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Session ${options.sessionId} not found`,
      });
    }

    const sessionVars = this.variables.get(options.sessionId)!;
    const variable = sessionVars.get(options.name);
    if (!variable) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Variable ${options.name} not found in session ${options.sessionId}`,
      });
    }

    session.lastAccessedAt = new Date().toISOString();
    return success(variable);
  }

  async listVariables(
    sessionId: string,
  ): Promise<ConnectorResult<SessionVariable[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const session = this.sessions.get(sessionId);
    if (!session) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Session ${sessionId} not found`,
      });
    }

    session.lastAccessedAt = new Date().toISOString();
    const sessionVars = this.variables.get(sessionId)!;
    return success(Array.from(sessionVars.values()));
  }

  async uploadFile(
    options: UploadFileOptions,
  ): Promise<ConnectorResult<SessionFile>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const session = this.sessions.get(options.sessionId);
    if (!session) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Session ${options.sessionId} not found`,
      });
    }

    session.lastAccessedAt = new Date().toISOString();

    const fileMeta: SessionFile = {
      name: options.fileName,
      size: options.content.length,
      lastModified: new Date().toISOString(),
    };

    const sessionFiles = this.files.get(options.sessionId)!;
    sessionFiles.set(options.fileName, {
      meta: fileMeta,
      content: options.content,
    });

    return success(fileMeta);
  }

  async downloadFile(
    options: DownloadFileOptions,
  ): Promise<ConnectorResult<string>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const session = this.sessions.get(options.sessionId);
    if (!session) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Session ${options.sessionId} not found`,
      });
    }

    const sessionFiles = this.files.get(options.sessionId)!;
    const file = sessionFiles.get(options.fileName);
    if (!file) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `File ${options.fileName} not found in session ${options.sessionId}`,
      });
    }

    session.lastAccessedAt = new Date().toISOString();
    return success(file.content);
  }

  async listFiles(
    options: ListFilesOptions,
  ): Promise<ConnectorResult<SessionFile[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const session = this.sessions.get(options.sessionId);
    if (!session) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Session ${options.sessionId} not found`,
      });
    }

    session.lastAccessedAt = new Date().toISOString();
    const sessionFiles = this.files.get(options.sessionId)!;
    return success(Array.from(sessionFiles.values()).map((f) => f.meta));
  }
}

class LiveACASessionsConnector implements ACASessionsConnector {
  readonly name = "aca-sessions";
  readonly mode = "live" as const;
  private _isInitialized = false;

  constructor(private config: ACASessionsConnectorConfig) {}

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async initialize(): Promise<ConnectorResult<void>> {
    if (!this.config.poolManagementEndpoint) {
      return failure({
        code: ErrorCodes.AUTH_REQUIRED,
        message: "Pool management endpoint is required for live mode",
      });
    }
    if (!this.config.credential) {
      return failure({
        code: ErrorCodes.AUTH_REQUIRED,
        message: "Credential is required for live mode",
      });
    }
    this._isInitialized = true;
    return success(undefined);
  }

  async dispose(): Promise<void> {
    this._isInitialized = false;
  }

  async healthCheck(): Promise<ConnectorResult<HealthCheckResponse>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live ACA Sessions connector not yet implemented",
    });
  }

  async createSession(): Promise<ConnectorResult<ACASession>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live ACA Sessions connector not yet implemented",
    });
  }

  async getSession(): Promise<ConnectorResult<ACASession>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live ACA Sessions connector not yet implemented",
    });
  }

  async deleteSession(): Promise<ConnectorResult<void>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live ACA Sessions connector not yet implemented",
    });
  }

  async executeCode(): Promise<ConnectorResult<CodeExecutionResult>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live ACA Sessions connector not yet implemented",
    });
  }

  async setVariable(): Promise<ConnectorResult<void>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live ACA Sessions connector not yet implemented",
    });
  }

  async getVariable(): Promise<ConnectorResult<SessionVariable>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live ACA Sessions connector not yet implemented",
    });
  }

  async listVariables(): Promise<ConnectorResult<SessionVariable[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live ACA Sessions connector not yet implemented",
    });
  }

  async uploadFile(): Promise<ConnectorResult<SessionFile>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live ACA Sessions connector not yet implemented",
    });
  }

  async downloadFile(): Promise<ConnectorResult<string>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live ACA Sessions connector not yet implemented",
    });
  }

  async listFiles(): Promise<ConnectorResult<SessionFile[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live ACA Sessions connector not yet implemented",
    });
  }
}
