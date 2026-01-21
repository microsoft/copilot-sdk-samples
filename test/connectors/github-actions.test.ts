import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createGitHubActionsConnector,
  GitHubActionsConnector,
} from "../../shared/connectors/github-actions/index.js";
import { ErrorCodes } from "../../shared/connectors/types.js";
import { expectSuccess, expectFailure } from "../helpers/index.js";

describe("shared/connectors/github-actions", () => {
  describe("MockGitHubActionsConnector", () => {
    let connector: GitHubActionsConnector;

    beforeEach(async () => {
      connector = createGitHubActionsConnector({ mode: "mock" });
    });

    afterEach(async () => {
      await connector.dispose();
    });

    describe("initialization", () => {
      it("should create a mock connector", () => {
        expect(connector.name).toBe("github-actions");
        expect(connector.mode).toBe("mock");
        expect(connector.isInitialized).toBe(false);
      });

      it("should initialize successfully", async () => {
        const result = await connector.initialize();

        expectSuccess(result);
        expect(connector.isInitialized).toBe(true);
      });

      it("should dispose correctly", async () => {
        await connector.initialize();
        await connector.dispose();

        expect(connector.isInitialized).toBe(false);
      });
    });

    describe("healthCheck", () => {
      it("should return healthy status", async () => {
        await connector.initialize();
        const result = await connector.healthCheck();

        expectSuccess(result);
        expect(result.data?.healthy).toBe(true);
        expect(result.data?.version).toBe("mock-v1");
      });
    });

    describe("listWorkflows", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded mock workflows", async () => {
        const result = await connector.listWorkflows();

        expectSuccess(result);
        expect(result.data?.length).toBeGreaterThan(0);
      });

      it("should filter by state", async () => {
        const result = await connector.listWorkflows({ state: "active" });

        expectSuccess(result);
        expect(result.data?.every((w) => w.state === "active")).toBe(true);
      });

      it("should limit results", async () => {
        const result = await connector.listWorkflows({ limit: 1 });

        expectSuccess(result);
        expect(result.data?.length).toBe(1);
      });

      it("should fail if not initialized", async () => {
        await connector.dispose();
        const result = await connector.listWorkflows();

        expectFailure(result, ErrorCodes.NOT_INITIALIZED);
      });
    });

    describe("dispatchWorkflow", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should dispatch a workflow and return run ID", async () => {
        const result = await connector.dispatchWorkflow({
          workflowId: 1,
          ref: "main",
        });

        expectSuccess(result);
        expect(result.data?.runId).toBeDefined();
        expect(typeof result.data?.runId).toBe("number");
      });

      it("should dispatch with inputs", async () => {
        const result = await connector.dispatchWorkflow({
          workflowId: 2,
          ref: "feature-branch",
          inputs: { code: "console.log('test')", language: "javascript" },
        });

        expectSuccess(result);
        expect(result.data?.runId).toBeDefined();
      });

      it("should accept string workflow ID", async () => {
        const result = await connector.dispatchWorkflow({
          workflowId: "1",
          ref: "main",
        });

        expectSuccess(result);
      });

      it("should fail for non-existent workflow", async () => {
        const result = await connector.dispatchWorkflow({
          workflowId: 9999,
          ref: "main",
        });

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should fail for disabled workflow", async () => {
        const result = await connector.dispatchWorkflow({
          workflowId: 3,
          ref: "main",
        });

        expectFailure(result, ErrorCodes.VALIDATION_ERROR);
      });

      it("should fail if not initialized", async () => {
        await connector.dispose();
        const result = await connector.dispatchWorkflow({
          workflowId: 1,
          ref: "main",
        });

        expectFailure(result, ErrorCodes.NOT_INITIALIZED);
      });
    });

    describe("getWorkflowRun", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return an existing workflow run", async () => {
        const result = await connector.getWorkflowRun(100);

        expectSuccess(result);
        expect(result.data?.id).toBe(100);
        expect(result.data?.status).toBe("completed");
        expect(result.data?.conclusion).toBe("success");
      });

      it("should return in-progress run", async () => {
        const result = await connector.getWorkflowRun(101);

        expectSuccess(result);
        expect(result.data?.status).toBe("in_progress");
        expect(result.data?.conclusion).toBeNull();
      });

      it("should fail for non-existent run", async () => {
        const result = await connector.getWorkflowRun(9999);

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should fail if not initialized", async () => {
        await connector.dispose();
        const result = await connector.getWorkflowRun(100);

        expectFailure(result, ErrorCodes.NOT_INITIALIZED);
      });
    });

    describe("waitForWorkflowRun", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should wait for a dispatched workflow to complete", async () => {
        const dispatchResult = await connector.dispatchWorkflow({
          workflowId: 1,
          ref: "main",
        });
        expectSuccess(dispatchResult);

        const result = await connector.waitForWorkflowRun(
          dispatchResult.data!.runId,
          {
            pollIntervalMs: 10,
            timeoutMs: 5000,
          },
        );

        expectSuccess(result);
        expect(result.data?.status).toBe("completed");
        expect(result.data?.conclusion).toBe("success");
      });

      it("should return immediately for completed run", async () => {
        const result = await connector.waitForWorkflowRun(100, {
          pollIntervalMs: 10,
          timeoutMs: 1000,
        });

        expectSuccess(result);
        expect(result.data?.status).toBe("completed");
      });

      it("should fail for non-existent run", async () => {
        const result = await connector.waitForWorkflowRun(9999, {
          pollIntervalMs: 10,
          timeoutMs: 100,
        });

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should fail if not initialized", async () => {
        await connector.dispose();
        const result = await connector.waitForWorkflowRun(100);

        expectFailure(result, ErrorCodes.NOT_INITIALIZED);
      });
    });

    describe("listArtifacts", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return artifacts for a completed run", async () => {
        const result = await connector.listArtifacts(100);

        expectSuccess(result);
        expect(result.data?.length).toBeGreaterThan(0);
        expect(result.data?.[0].name).toBeDefined();
        expect(result.data?.[0].sizeInBytes).toBeDefined();
      });

      it("should return empty array for run without artifacts", async () => {
        const result = await connector.listArtifacts(101);

        expectSuccess(result);
        expect(result.data).toEqual([]);
      });

      it("should fail for non-existent run", async () => {
        const result = await connector.listArtifacts(9999);

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should fail if not initialized", async () => {
        await connector.dispose();
        const result = await connector.listArtifacts(100);

        expectFailure(result, ErrorCodes.NOT_INITIALIZED);
      });
    });

    describe("downloadArtifact", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should download artifact content", async () => {
        const result = await connector.downloadArtifact(1000);

        expectSuccess(result);
        expect(result.data).toBeDefined();
        // Mock connector always returns string
        const parsed = JSON.parse(result.data as string);
        expect(parsed.tests).toBe(42);
      });

      it("should fail for non-existent artifact", async () => {
        const result = await connector.downloadArtifact(9999);

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should fail if not initialized", async () => {
        await connector.dispose();
        const result = await connector.downloadArtifact(1000);

        expectFailure(result, ErrorCodes.NOT_INITIALIZED);
      });
    });

    describe("executeREPL", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should execute REPL and return result", async () => {
        const result = await connector.executeREPL({
          code: "console.log('Hello')",
          language: "javascript",
          timeout: 10000,
        });

        expectSuccess(result);
        expect(result.data?.runId).toBeDefined();
        expect(result.data?.status).toBe("completed");
        expect(result.data?.conclusion).toBe("success");
        expect(result.data?.output).toBe("Hello, World!");
        expect(result.data?.executionTimeMs).toBeGreaterThan(0);
        expect(result.data?.artifacts.length).toBeGreaterThan(0);
      });

      it("should use default workflow and ref", async () => {
        const result = await connector.executeREPL({
          code: "print('test')",
          language: "python",
        });

        expectSuccess(result);
        expect(result.data?.runId).toBeDefined();
      });

      it("should use custom workflow and ref", async () => {
        const result = await connector.executeREPL({
          code: "echo test",
          language: "bash",
          workflowId: 2,
          ref: "dev",
        });

        expectSuccess(result);
      });

      it("should fail for non-existent workflow", async () => {
        const result = await connector.executeREPL({
          code: "test",
          language: "javascript",
          workflowId: 9999,
        });

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should fail if not initialized", async () => {
        await connector.dispose();
        const result = await connector.executeREPL({
          code: "test",
          language: "javascript",
        });

        expectFailure(result, ErrorCodes.NOT_INITIALIZED);
      });
    });
  });

  describe("LiveGitHubActionsConnector", () => {
    it("should require token for initialization", async () => {
      const connector = createGitHubActionsConnector({ mode: "live" });
      const result = await connector.initialize();

      expectFailure(result, ErrorCodes.AUTH_REQUIRED);
    });

    it("should require owner and repo for initialization", async () => {
      const connector = createGitHubActionsConnector({
        mode: "live",
        token: "test-token",
      });
      const result = await connector.initialize();

      expectFailure(result, ErrorCodes.VALIDATION_ERROR);
    });

    it("should initialize with token, owner, and repo", async () => {
      const connector = createGitHubActionsConnector({
        mode: "live",
        token: "test-token",
        owner: "test-owner",
        repo: "test-repo",
      });
      const result = await connector.initialize();

      expectSuccess(result);
      expect(connector.isInitialized).toBe(true);
    });

    it("should return NOT_INITIALIZED when methods called before initialize", async () => {
      const connector = createGitHubActionsConnector({
        mode: "live",
        token: "test-token",
        owner: "test-owner",
        repo: "test-repo",
      });

      const listResult = await connector.listWorkflows();
      expectFailure(listResult, ErrorCodes.NOT_INITIALIZED);

      const dispatchResult = await connector.dispatchWorkflow({
        workflowId: 1,
        ref: "main",
      });
      expectFailure(dispatchResult, ErrorCodes.NOT_INITIALIZED);

      const getRunResult = await connector.getWorkflowRun(1);
      expectFailure(getRunResult, ErrorCodes.NOT_INITIALIZED);

      const waitResult = await connector.waitForWorkflowRun(1);
      expectFailure(waitResult, ErrorCodes.NOT_INITIALIZED);

      const listArtifactsResult = await connector.listArtifacts(1);
      expectFailure(listArtifactsResult, ErrorCodes.NOT_INITIALIZED);

      const downloadResult = await connector.downloadArtifact(1);
      expectFailure(downloadResult, ErrorCodes.NOT_INITIALIZED);

      const replResult = await connector.executeREPL({
        code: "test",
        language: "js",
      });
      expectFailure(replResult, ErrorCodes.NOT_INITIALIZED);
    });
  });
});
