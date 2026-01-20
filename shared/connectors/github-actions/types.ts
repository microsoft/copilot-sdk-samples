/**
 * Types for the GitHub Actions connector.
 */

import {
  BaseConnectorConfig,
  BaseConnector,
  ConnectorResult,
} from "../types.js";

/** Status of a workflow run */
export type WorkflowRunStatus =
  | "queued"
  | "in_progress"
  | "completed"
  | "waiting"
  | "requested"
  | "pending";

/** Conclusion of a completed workflow run */
export type WorkflowRunConclusion =
  | "success"
  | "failure"
  | "neutral"
  | "cancelled"
  | "skipped"
  | "timed_out"
  | "action_required"
  | null;

/** GitHub Actions workflow definition */
export interface Workflow {
  id: number;
  name: string;
  path: string;
  state: "active" | "disabled_manually" | "disabled_inactivity";
  createdAt: string;
  updatedAt: string;
}

/** GitHub Actions workflow run */
export interface WorkflowRun {
  id: number;
  workflowId: number;
  name: string;
  headBranch: string;
  headSha: string;
  status: WorkflowRunStatus;
  conclusion: WorkflowRunConclusion;
  runNumber: number;
  runAttempt: number;
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
}

/** Artifact from a workflow run */
export interface WorkflowArtifact {
  id: number;
  name: string;
  sizeInBytes: number;
  expired: boolean;
  createdAt: string;
  expiresAt: string;
}

/** Input for dispatching a workflow */
export interface WorkflowDispatchInput {
  workflowId: number | string;
  ref: string;
  inputs?: Record<string, string>;
}

/** Input for REPL execution via workflow */
export interface REPLExecutionInput {
  code: string;
  language: string;
  timeout?: number;
  workflowId?: number | string;
  ref?: string;
}

/** Result of REPL execution */
export interface REPLExecutionResult {
  runId: number;
  status: WorkflowRunStatus;
  conclusion: WorkflowRunConclusion;
  output: string | null;
  error: string | null;
  executionTimeMs: number;
  artifacts: WorkflowArtifact[];
}

/** Options for waiting on a workflow run */
export interface WaitForWorkflowRunOptions {
  pollIntervalMs?: number;
  timeoutMs?: number;
}

/** Configuration for the GitHub Actions connector */
export interface GitHubActionsConnectorConfig extends BaseConnectorConfig {
  token?: string;
  owner?: string;
  repo?: string;
}

/** GitHub Actions connector interface */
export interface GitHubActionsConnector extends BaseConnector {
  /** List available workflows in the repository */
  listWorkflows(options?: {
    state?: "active" | "disabled_manually" | "disabled_inactivity";
    limit?: number;
  }): Promise<ConnectorResult<Workflow[]>>;

  /** Trigger a workflow_dispatch event */
  dispatchWorkflow(
    input: WorkflowDispatchInput,
  ): Promise<ConnectorResult<{ runId: number }>>;

  /** Get the status of a workflow run */
  getWorkflowRun(runId: number): Promise<ConnectorResult<WorkflowRun>>;

  /** Poll until a workflow run completes */
  waitForWorkflowRun(
    runId: number,
    options?: WaitForWorkflowRunOptions,
  ): Promise<ConnectorResult<WorkflowRun>>;

  /** List artifacts from a completed workflow run */
  listArtifacts(runId: number): Promise<ConnectorResult<WorkflowArtifact[]>>;

  /** Download artifact content */
  downloadArtifact(artifactId: number): Promise<ConnectorResult<string>>;

  /** High-level method to dispatch a workflow and wait for REPL result */
  executeREPL(
    input: REPLExecutionInput,
  ): Promise<ConnectorResult<REPLExecutionResult>>;
}
