import { Octokit } from "@octokit/rest";
import {
  ConnectorResult,
  HealthCheckResponse,
  success,
  failure,
  ErrorCodes,
} from "../types.js";
import {
  GitHubActionsConnector,
  GitHubActionsConnectorConfig,
  Workflow,
  WorkflowRun,
  WorkflowArtifact,
  WorkflowDispatchInput,
  REPLExecutionInput,
  REPLExecutionResult,
  WaitForWorkflowRunOptions,
} from "./types.js";

export function createGitHubActionsConnector(
  config: GitHubActionsConnectorConfig,
): GitHubActionsConnector {
  if (config.mode === "mock") {
    return new MockGitHubActionsConnector(config);
  }
  return new LiveGitHubActionsConnector(config);
}

class MockGitHubActionsConnector implements GitHubActionsConnector {
  readonly name = "github-actions";
  readonly mode = "mock" as const;
  private _isInitialized = false;

  private workflows: Workflow[] = [];
  private runs: WorkflowRun[] = [];
  private artifacts: Map<number, WorkflowArtifact[]> = new Map();
  private artifactContents: Map<number, string> = new Map();
  private nextWorkflowId = 1;
  private nextRunId = 1;
  private nextArtifactId = 1;

  constructor(private config: GitHubActionsConnectorConfig) {
    this.seedMockData();
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  private seedMockData(): void {
    const now = new Date().toISOString();

    this.workflows = [
      {
        id: 1,
        name: "CI",
        path: ".github/workflows/ci.yml",
        state: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 2,
        name: "REPL Executor",
        path: ".github/workflows/repl.yml",
        state: "active",
        createdAt: now,
        updatedAt: now,
      },
      {
        id: 3,
        name: "Deploy",
        path: ".github/workflows/deploy.yml",
        state: "disabled_manually",
        createdAt: now,
        updatedAt: now,
      },
    ];
    this.nextWorkflowId = 4;

    this.runs = [
      {
        id: 100,
        workflowId: 1,
        name: "CI",
        headBranch: "main",
        headSha: "abc123",
        status: "completed",
        conclusion: "success",
        runNumber: 42,
        runAttempt: 1,
        createdAt: now,
        updatedAt: now,
        htmlUrl: "https://github.com/owner/repo/actions/runs/100",
      },
      {
        id: 101,
        workflowId: 2,
        name: "REPL Executor",
        headBranch: "main",
        headSha: "def456",
        status: "in_progress",
        conclusion: null,
        runNumber: 15,
        runAttempt: 1,
        createdAt: now,
        updatedAt: now,
        htmlUrl: "https://github.com/owner/repo/actions/runs/101",
      },
    ];
    this.nextRunId = 102;

    this.artifacts.set(100, [
      {
        id: 1000,
        name: "test-results",
        sizeInBytes: 1024,
        expired: false,
        createdAt: now,
        expiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
      {
        id: 1001,
        name: "coverage-report",
        sizeInBytes: 2048,
        expired: false,
        createdAt: now,
        expiresAt: new Date(
          Date.now() + 30 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      },
    ]);

    this.artifactContents.set(
      1000,
      JSON.stringify({ tests: 42, passed: 42, failed: 0 }),
    );
    this.artifactContents.set(1001, JSON.stringify({ coverage: 85.5 }));
    this.nextArtifactId = 1002;
  }

  async initialize(): Promise<ConnectorResult<void>> {
    this._isInitialized = true;
    return success(undefined);
  }

  async dispose(): Promise<void> {
    this._isInitialized = false;
  }

  async healthCheck(): Promise<ConnectorResult<HealthCheckResponse>> {
    return success({
      healthy: true,
      version: "mock-v1",
      details: { mode: "mock", workflowCount: this.workflows.length },
    });
  }

  async listWorkflows(options?: {
    state?: "active" | "disabled_manually" | "disabled_inactivity";
    limit?: number;
  }): Promise<ConnectorResult<Workflow[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    let filtered = [...this.workflows];

    if (options?.state) {
      filtered = filtered.filter((w) => w.state === options.state);
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return success(filtered);
  }

  async dispatchWorkflow(
    input: WorkflowDispatchInput,
  ): Promise<ConnectorResult<{ runId: number }>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const workflowId =
      typeof input.workflowId === "string"
        ? parseInt(input.workflowId, 10)
        : input.workflowId;

    const workflow = this.workflows.find((w) => w.id === workflowId);
    if (!workflow) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Workflow ${input.workflowId} not found`,
      });
    }

    if (workflow.state !== "active") {
      return failure({
        code: ErrorCodes.VALIDATION_ERROR,
        message: `Workflow ${workflow.name} is not active`,
      });
    }

    const now = new Date().toISOString();
    const newRun: WorkflowRun = {
      id: this.nextRunId++,
      workflowId: workflow.id,
      name: workflow.name,
      headBranch: input.ref,
      headSha: `sha-${Date.now()}`,
      status: "queued",
      conclusion: null,
      runNumber:
        this.runs.filter((r) => r.workflowId === workflow.id).length + 1,
      runAttempt: 1,
      createdAt: now,
      updatedAt: now,
      htmlUrl: `https://github.com/owner/repo/actions/runs/${this.nextRunId - 1}`,
    };

    this.runs.push(newRun);

    return success({ runId: newRun.id });
  }

  async getWorkflowRun(runId: number): Promise<ConnectorResult<WorkflowRun>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const run = this.runs.find((r) => r.id === runId);
    if (!run) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Workflow run ${runId} not found`,
      });
    }

    return success(run);
  }

  async waitForWorkflowRun(
    runId: number,
    options?: WaitForWorkflowRunOptions,
  ): Promise<ConnectorResult<WorkflowRun>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const pollIntervalMs = options?.pollIntervalMs ?? 1000;
    const timeoutMs = options?.timeoutMs ?? 300000;
    const startTime = Date.now();

    const run = this.runs.find((r) => r.id === runId);
    if (!run) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Workflow run ${runId} not found`,
      });
    }

    while (run.status !== "completed") {
      if (Date.now() - startTime > timeoutMs) {
        return failure({
          code: ErrorCodes.TIMEOUT,
          message: `Workflow run ${runId} did not complete within ${timeoutMs}ms`,
          retryable: true,
        });
      }

      await this.simulateProgress(run);
      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    return success(run);
  }

  private async simulateProgress(run: WorkflowRun): Promise<void> {
    if (run.status === "queued") {
      run.status = "in_progress";
      run.updatedAt = new Date().toISOString();
    } else if (run.status === "in_progress") {
      run.status = "completed";
      run.conclusion = "success";
      run.updatedAt = new Date().toISOString();

      const now = new Date().toISOString();
      const artifactId = this.nextArtifactId++;
      this.artifacts.set(run.id, [
        {
          id: artifactId,
          name: "repl-output",
          sizeInBytes: 256,
          expired: false,
          createdAt: now,
          expiresAt: new Date(
            Date.now() + 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        },
      ]);
      this.artifactContents.set(
        artifactId,
        JSON.stringify({ output: "Hello, World!", exitCode: 0 }),
      );
    }
  }

  async listArtifacts(
    runId: number,
  ): Promise<ConnectorResult<WorkflowArtifact[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const run = this.runs.find((r) => r.id === runId);
    if (!run) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Workflow run ${runId} not found`,
      });
    }

    const artifacts = this.artifacts.get(runId) ?? [];
    return success(artifacts);
  }

  async downloadArtifact(artifactId: number): Promise<ConnectorResult<string>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const content = this.artifactContents.get(artifactId);
    if (content === undefined) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Artifact ${artifactId} not found`,
      });
    }

    return success(content);
  }

  async executeREPL(
    input: REPLExecutionInput,
  ): Promise<ConnectorResult<REPLExecutionResult>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const workflowId = input.workflowId ?? 2;
    const ref = input.ref ?? "main";
    const startTime = Date.now();

    const dispatchResult = await this.dispatchWorkflow({
      workflowId,
      ref,
      inputs: {
        code: input.code,
        language: input.language,
      },
    });

    if (!dispatchResult.success) {
      return failure(dispatchResult.error!);
    }

    const runId = dispatchResult.data!.runId;

    const waitResult = await this.waitForWorkflowRun(runId, {
      pollIntervalMs: 100,
      timeoutMs: input.timeout ?? 60000,
    });

    if (!waitResult.success) {
      return failure(waitResult.error!);
    }

    const run = waitResult.data!;
    const artifactsResult = await this.listArtifacts(runId);
    const artifacts = artifactsResult.success ? artifactsResult.data! : [];

    let output: string | null = null;
    let error: string | null = null;

    const outputArtifact = artifacts.find((a) => a.name === "repl-output");
    if (outputArtifact) {
      const downloadResult = await this.downloadArtifact(outputArtifact.id);
      if (downloadResult.success) {
        try {
          const parsed = JSON.parse(downloadResult.data!);
          output = parsed.output ?? null;
          error = parsed.error ?? null;
        } catch {
          output = downloadResult.data!;
        }
      }
    }

    return success({
      runId,
      status: run.status,
      conclusion: run.conclusion,
      output,
      error,
      executionTimeMs: Date.now() - startTime,
      artifacts,
    });
  }
}

class LiveGitHubActionsConnector implements GitHubActionsConnector {
  readonly name = "github-actions";
  readonly mode = "live" as const;
  private _isInitialized = false;
  private octokit: Octokit | null = null;
  private owner: string;
  private repo: string;

  constructor(private config: GitHubActionsConnectorConfig) {
    this.owner = config.owner ?? "";
    this.repo = config.repo ?? "";
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async initialize(): Promise<ConnectorResult<void>> {
    if (!this.config.token) {
      return failure({
        code: ErrorCodes.AUTH_REQUIRED,
        message: "GitHub token is required for live mode",
      });
    }
    if (!this.owner || !this.repo) {
      return failure({
        code: ErrorCodes.VALIDATION_ERROR,
        message: "owner and repo are required for live mode",
      });
    }
    this.octokit = new Octokit({ auth: this.config.token });
    this._isInitialized = true;
    return success(undefined);
  }

  async dispose(): Promise<void> {
    this._isInitialized = false;
    this.octokit = null;
  }

  async healthCheck(): Promise<ConnectorResult<HealthCheckResponse>> {
    if (!this.octokit) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }
    try {
      const { data } = await this.octokit.repos.get({
        owner: this.owner,
        repo: this.repo,
      });
      return success({
        healthy: true,
        version: "live-v1",
        details: { repo: data.full_name, private: data.private },
      });
    } catch (err) {
      return failure({
        code: ErrorCodes.NETWORK_ERROR,
        message: `Health check failed: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  async listWorkflows(options?: {
    state?: "active" | "disabled_manually" | "disabled_inactivity";
    limit?: number;
  }): Promise<ConnectorResult<Workflow[]>> {
    if (!this.octokit) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }
    try {
      const { data } = await this.octokit.actions.listRepoWorkflows({
        owner: this.owner,
        repo: this.repo,
        per_page: options?.limit ?? 100,
      });

      let workflows: Workflow[] = data.workflows.map((w) => ({
        id: w.id,
        name: w.name,
        path: w.path,
        state: w.state as Workflow["state"],
        createdAt: w.created_at,
        updatedAt: w.updated_at,
      }));

      if (options?.state) {
        workflows = workflows.filter((w) => w.state === options.state);
      }

      return success(workflows);
    } catch (err) {
      return failure({
        code: ErrorCodes.NETWORK_ERROR,
        message: `Failed to list workflows: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  async dispatchWorkflow(
    input: WorkflowDispatchInput,
  ): Promise<ConnectorResult<{ runId: number }>> {
    if (!this.octokit) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }
    try {
      const beforeRuns = await this.octokit.actions.listWorkflowRuns({
        owner: this.owner,
        repo: this.repo,
        workflow_id: input.workflowId,
        per_page: 1,
      });
      const latestRunIdBefore = beforeRuns.data.workflow_runs[0]?.id ?? 0;

      await this.octokit.actions.createWorkflowDispatch({
        owner: this.owner,
        repo: this.repo,
        workflow_id: input.workflowId,
        ref: input.ref,
        inputs: input.inputs,
      });

      let runId = 0;
      for (let attempt = 0; attempt < 10; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        const afterRuns = await this.octokit.actions.listWorkflowRuns({
          owner: this.owner,
          repo: this.repo,
          workflow_id: input.workflowId,
          per_page: 5,
        });
        const newRun = afterRuns.data.workflow_runs.find(
          (r) => r.id > latestRunIdBefore,
        );
        if (newRun) {
          runId = newRun.id;
          break;
        }
      }

      if (runId === 0) {
        return failure({
          code: ErrorCodes.NETWORK_ERROR,
          message: "Workflow dispatched but could not find the new run",
        });
      }

      return success({ runId });
    } catch (err) {
      return failure({
        code: ErrorCodes.NETWORK_ERROR,
        message: `Failed to dispatch workflow: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  async getWorkflowRun(runId: number): Promise<ConnectorResult<WorkflowRun>> {
    if (!this.octokit) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }
    try {
      const { data } = await this.octokit.actions.getWorkflowRun({
        owner: this.owner,
        repo: this.repo,
        run_id: runId,
      });

      return success({
        id: data.id,
        workflowId: data.workflow_id,
        name: data.name ?? "",
        headBranch: data.head_branch ?? "",
        headSha: data.head_sha,
        status: data.status as WorkflowRun["status"],
        conclusion: data.conclusion as WorkflowRun["conclusion"],
        runNumber: data.run_number,
        runAttempt: data.run_attempt ?? 1,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
        htmlUrl: data.html_url,
      });
    } catch (err) {
      return failure({
        code: ErrorCodes.NETWORK_ERROR,
        message: `Failed to get workflow run: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  async waitForWorkflowRun(
    runId: number,
    options?: WaitForWorkflowRunOptions,
  ): Promise<ConnectorResult<WorkflowRun>> {
    const pollIntervalMs = options?.pollIntervalMs ?? 3000;
    const timeoutMs = options?.timeoutMs ?? 300000;
    const startTime = Date.now();

    while (true) {
      if (Date.now() - startTime > timeoutMs) {
        return failure({
          code: ErrorCodes.TIMEOUT,
          message: `Workflow run ${runId} did not complete within ${timeoutMs}ms`,
          retryable: true,
        });
      }

      const result = await this.getWorkflowRun(runId);
      if (!result.success) return result;

      if (result.data!.status === "completed") {
        return result;
      }

      await new Promise((resolve) => setTimeout(resolve, pollIntervalMs));
    }
  }

  async listArtifacts(
    runId: number,
  ): Promise<ConnectorResult<WorkflowArtifact[]>> {
    if (!this.octokit) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }
    try {
      const { data } = await this.octokit.actions.listWorkflowRunArtifacts({
        owner: this.owner,
        repo: this.repo,
        run_id: runId,
      });

      return success(
        data.artifacts.map((a) => ({
          id: a.id,
          name: a.name,
          sizeInBytes: a.size_in_bytes,
          expired: a.expired,
          createdAt: a.created_at ?? "",
          expiresAt: a.expires_at ?? "",
        })),
      );
    } catch (err) {
      return failure({
        code: ErrorCodes.NETWORK_ERROR,
        message: `Failed to list artifacts: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  async downloadArtifact(artifactId: number): Promise<ConnectorResult<string>> {
    if (!this.octokit) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }
    try {
      const { data } = await this.octokit.actions.downloadArtifact({
        owner: this.owner,
        repo: this.repo,
        artifact_id: artifactId,
        archive_format: "zip",
      });

      return success(typeof data === "string" ? data : JSON.stringify(data));
    } catch (err) {
      return failure({
        code: ErrorCodes.NETWORK_ERROR,
        message: `Failed to download artifact: ${err instanceof Error ? err.message : String(err)}`,
      });
    }
  }

  async executeREPL(
    input: REPLExecutionInput,
  ): Promise<ConnectorResult<REPLExecutionResult>> {
    const workflowId = input.workflowId ?? "rlm-repl.yml";
    const ref = input.ref ?? "main";
    const startTime = Date.now();

    const dispatchResult = await this.dispatchWorkflow({
      workflowId,
      ref,
      inputs: {
        code: input.code,
        language: input.language,
        timeout: String(input.timeout ?? 60000),
      },
    });

    if (!dispatchResult.success) {
      return failure(dispatchResult.error!);
    }

    const runId = dispatchResult.data!.runId;

    const waitResult = await this.waitForWorkflowRun(runId, {
      pollIntervalMs: 3000,
      timeoutMs: input.timeout ?? 300000,
    });

    if (!waitResult.success) {
      return failure(waitResult.error!);
    }

    const run = waitResult.data!;
    const artifactsResult = await this.listArtifacts(runId);
    const artifacts = artifactsResult.success ? artifactsResult.data! : [];

    let output: string | null = null;
    let error: string | null = null;

    const outputArtifact = artifacts.find((a) => a.name === "repl-output");
    if (outputArtifact) {
      const downloadResult = await this.downloadArtifact(outputArtifact.id);
      if (downloadResult.success) {
        try {
          const parsed = JSON.parse(downloadResult.data!);
          output = parsed.output ?? null;
          error = parsed.error ?? null;
        } catch {
          output = downloadResult.data!;
        }
      }
    }

    return success({
      runId,
      status: run.status,
      conclusion: run.conclusion,
      output,
      error,
      executionTimeMs: Date.now() - startTime,
      artifacts,
    });
  }
}
