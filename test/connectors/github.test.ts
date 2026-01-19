import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createGitHubConnector,
  GitHubConnector,
} from "../../shared/connectors/github/index.js";
import { ErrorCodes } from "../../shared/connectors/types.js";
import { expectSuccess, expectFailure } from "../helpers/index.js";

describe("shared/connectors/github", () => {
  describe("MockGitHubConnector", () => {
    let connector: GitHubConnector;

    beforeEach(async () => {
      connector = createGitHubConnector({ mode: "mock" });
    });

    afterEach(async () => {
      await connector.dispose();
    });

    describe("initialization", () => {
      it("should create a mock connector", () => {
        expect(connector.name).toBe("github");
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

    describe("listIssues", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded mock issues", async () => {
        const result = await connector.listIssues();

        expectSuccess(result);
        expect(result.data?.length).toBeGreaterThan(0);
      });

      it("should filter by state", async () => {
        const result = await connector.listIssues({ state: "open" });

        expectSuccess(result);
        expect(result.data?.every((i) => i.state === "open")).toBe(true);
      });

      it("should filter by labels", async () => {
        const result = await connector.listIssues({ labels: ["bug"] });

        expectSuccess(result);
        expect(
          result.data?.every((i) => i.labels.some((l) => l.name === "bug")),
        ).toBe(true);
      });

      it("should limit results", async () => {
        const result = await connector.listIssues({ limit: 1 });

        expectSuccess(result);
        expect(result.data?.length).toBe(1);
      });

      it("should fail if not initialized", async () => {
        await connector.dispose();
        const result = await connector.listIssues();

        expectFailure(result, ErrorCodes.NOT_INITIALIZED);
      });
    });

    describe("getIssue", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return an existing issue", async () => {
        const result = await connector.getIssue(1);

        expectSuccess(result);
        expect(result.data?.number).toBe(1);
      });

      it("should fail for non-existent issue", async () => {
        const result = await connector.getIssue(9999);

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("createIssue", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should create a new issue", async () => {
        const result = await connector.createIssue({
          title: "New Test Issue",
          body: "Test body",
          labels: ["test"],
        });

        expectSuccess(result);
        expect(result.data?.title).toBe("New Test Issue");
        expect(result.data?.body).toBe("Test body");
        expect(result.data?.labels.some((l) => l.name === "test")).toBe(true);
        expect(result.data?.state).toBe("open");
      });

      it("should create issue without optional fields", async () => {
        const result = await connector.createIssue({
          title: "Minimal Issue",
        });

        expectSuccess(result);
        expect(result.data?.title).toBe("Minimal Issue");
        expect(result.data?.body).toBeNull();
        expect(result.data?.labels).toEqual([]);
      });
    });

    describe("updateIssue", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should update issue title", async () => {
        const result = await connector.updateIssue(1, {
          title: "Updated Title",
        });

        expectSuccess(result);
        expect(result.data?.title).toBe("Updated Title");
      });

      it("should close an issue", async () => {
        const result = await connector.updateIssue(1, { state: "closed" });

        expectSuccess(result);
        expect(result.data?.state).toBe("closed");
      });

      it("should fail for non-existent issue", async () => {
        const result = await connector.updateIssue(9999, { title: "X" });

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("addLabels", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should add new labels to an issue", async () => {
        const result = await connector.addLabels(1, [
          "priority:high",
          "needs-review",
        ]);

        expectSuccess(result);
        expect(result.data?.some((l) => l.name === "priority:high")).toBe(true);
        expect(result.data?.some((l) => l.name === "needs-review")).toBe(true);
      });

      it("should not duplicate existing labels", async () => {
        const before = await connector.getIssue(1);
        expectSuccess(before);
        const existingLabel = before.data!.labels[0]?.name;

        if (existingLabel) {
          const result = await connector.addLabels(1, [existingLabel]);
          expectSuccess(result);
          const duplicates = result.data!.filter(
            (l) => l.name === existingLabel,
          );
          expect(duplicates.length).toBe(1);
        }
      });
    });

    describe("listSecurityAlerts", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded security alerts", async () => {
        const result = await connector.listSecurityAlerts();

        expectSuccess(result);
        expect(result.data?.length).toBeGreaterThan(0);
      });

      it("should filter by severity", async () => {
        const result = await connector.listSecurityAlerts({
          severity: "critical",
        });

        expectSuccess(result);
        expect(result.data?.every((a) => a.severity === "critical")).toBe(true);
      });

      it("should filter by state", async () => {
        const result = await connector.listSecurityAlerts({ state: "open" });

        expectSuccess(result);
        expect(result.data?.every((a) => a.state === "open")).toBe(true);
      });
    });
  });

  describe("LiveGitHubConnector", () => {
    it("should require token for initialization", async () => {
      const connector = createGitHubConnector({ mode: "live" });
      const result = await connector.initialize();

      expectFailure(result, ErrorCodes.AUTH_REQUIRED);
    });

    it("should initialize with token", async () => {
      const connector = createGitHubConnector({
        mode: "live",
        token: "test-token",
      });
      const result = await connector.initialize();

      expectSuccess(result);
      expect(connector.isInitialized).toBe(true);
    });

    it("should return NOT_IMPLEMENTED for operations", async () => {
      const connector = createGitHubConnector({
        mode: "live",
        token: "test-token",
      });
      await connector.initialize();

      const result = await connector.listIssues();
      expectFailure(result, ErrorCodes.NOT_IMPLEMENTED);
    });
  });
});
