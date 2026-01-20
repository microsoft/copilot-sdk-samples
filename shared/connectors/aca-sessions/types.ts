import { BaseConnectorConfig } from "../types.js";

/** Execution type for code execution */
export type ExecutionType = "synchronous";

/** Session state */
export type SessionState = "running" | "stopped" | "failed";

/** Code execution request properties */
export interface CodeExecutionProperties {
  code: string;
  executionType: ExecutionType;
}

/** Code execution request body */
export interface CodeExecutionRequest {
  properties: CodeExecutionProperties;
}

/** Code execution result */
export interface CodeExecutionResult {
  stdout: string;
  stderr: string;
  result: string | null;
  executionTimeInMs: number;
}

/** Session metadata */
export interface ACASession {
  id: string;
  identifier: string;
  state: SessionState;
  createdAt: string;
  lastAccessedAt: string;
}

/** Session variable */
export interface SessionVariable {
  name: string;
  value: string;
  type: string;
}

/** Session file metadata */
export interface SessionFile {
  name: string;
  size: number;
  lastModified: string;
}

/** Configuration for ACA Sessions connector */
export interface ACASessionsConnectorConfig extends BaseConnectorConfig {
  /** Pool management endpoint URL */
  poolManagementEndpoint?: string;
  /** Azure credential or token for authentication */
  credential?: string;
}

/** Options for creating a session */
export interface CreateSessionOptions {
  identifier?: string;
}

/** Options for executing code */
export interface ExecuteCodeOptions {
  sessionId: string;
  code: string;
  executionType?: ExecutionType;
}

/** Options for setting a variable */
export interface SetVariableOptions {
  sessionId: string;
  name: string;
  value: string;
}

/** Options for getting a variable */
export interface GetVariableOptions {
  sessionId: string;
  name: string;
}

/** Options for uploading a file */
export interface UploadFileOptions {
  sessionId: string;
  fileName: string;
  content: string;
}

/** Options for downloading a file */
export interface DownloadFileOptions {
  sessionId: string;
  fileName: string;
}

/** Options for listing files */
export interface ListFilesOptions {
  sessionId: string;
}
