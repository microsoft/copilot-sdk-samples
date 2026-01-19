import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createJiraConnector,
  JiraConnector,
} from "../../shared/connectors/jira/index.js";
import { ErrorCodes } from "../../shared/connectors/types.js";
import { expectSuccess, expectFailure } from "../helpers/index.js";

describe("shared/connectors/jira", () => {
  describe("MockJiraConnector", () => {
    let connector: JiraConnector;

    beforeEach(async () => {
      connector = createJiraConnector({ mode: "mock" });
    });

    afterEach(async () => {
      await connector.dispose();
    });

    describe("initialization", () => {
      it("should create a mock connector", () => {
        expect(connector.name).toBe("jira");
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

    describe("listProjects", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded mock projects", async () => {
        const result = await connector.listProjects();

        expectSuccess(result);
        expect(result.data?.length).toBeGreaterThan(0);
        expect(result.data?.some((p) => p.key === "DEMO")).toBe(true);
      });

      it("should fail if not initialized", async () => {
        await connector.dispose();
        const result = await connector.listProjects();

        expectFailure(result, ErrorCodes.NOT_INITIALIZED);
      });
    });

    describe("listIssues", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded mock issues", async () => {
        const result = await connector.listIssues();

        expectSuccess(result);
        expect(result.data?.issues.length).toBeGreaterThan(0);
        expect(result.data?.total).toBeGreaterThan(0);
      });

      it("should filter by project key", async () => {
        const result = await connector.listIssues({ projectKey: "DEMO" });

        expectSuccess(result);
        expect(result.data?.issues.every((i) => i.project.key === "DEMO")).toBe(
          true,
        );
      });

      it("should filter by status", async () => {
        const result = await connector.listIssues({ status: "In Progress" });

        expectSuccess(result);
        expect(
          result.data?.issues.every((i) => i.status.name === "In Progress"),
        ).toBe(true);
      });

      it("should filter by labels", async () => {
        const result = await connector.listIssues({
          labels: ["authentication"],
        });

        expectSuccess(result);
        expect(
          result.data?.issues.every((i) => i.labels.includes("authentication")),
        ).toBe(true);
      });

      it("should paginate results", async () => {
        const result = await connector.listIssues({
          maxResults: 2,
          startAt: 0,
        });

        expectSuccess(result);
        expect(result.data?.issues.length).toBeLessThanOrEqual(2);
        expect(result.data?.maxResults).toBe(2);
        expect(result.data?.startAt).toBe(0);
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
        const result = await connector.getIssue("DEMO-1");

        expectSuccess(result);
        expect(result.data?.key).toBe("DEMO-1");
        expect(result.data?.summary).toBeTruthy();
      });

      it("should fail for non-existent issue", async () => {
        const result = await connector.getIssue("NONEXISTENT-9999");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should include issue details", async () => {
        const result = await connector.getIssue("DEMO-1");

        expectSuccess(result);
        expect(result.data).toHaveProperty("status");
        expect(result.data).toHaveProperty("priority");
        expect(result.data).toHaveProperty("issueType");
        expect(result.data).toHaveProperty("project");
      });
    });

    describe("createIssue", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should create a new issue", async () => {
        const result = await connector.createIssue({
          projectKey: "DEMO",
          summary: "New Test Issue",
          description: "Test description",
          issueType: "Task",
          priority: "High",
          labels: ["test-label"],
        });

        expectSuccess(result);
        expect(result.data?.summary).toBe("New Test Issue");
        expect(result.data?.description).toBe("Test description");
        expect(result.data?.project.key).toBe("DEMO");
        expect(result.data?.status.name).toBe("To Do");
      });

      it("should create issue without optional fields", async () => {
        const result = await connector.createIssue({
          projectKey: "DEMO",
          summary: "Minimal Issue",
          issueType: "Task",
        });

        expectSuccess(result);
        expect(result.data?.summary).toBe("Minimal Issue");
        expect(result.data?.description).toBeNull();
        expect(result.data?.labels).toEqual([]);
      });

      it("should fail for non-existent project", async () => {
        const result = await connector.createIssue({
          projectKey: "NONEXISTENT",
          summary: "Test",
          issueType: "Task",
        });

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("updateIssue", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should update issue summary", async () => {
        const result = await connector.updateIssue("DEMO-1", {
          summary: "Updated Summary",
        });

        expectSuccess(result);
        expect(result.data?.summary).toBe("Updated Summary");
      });

      it("should update issue priority", async () => {
        const result = await connector.updateIssue("DEMO-1", {
          priority: "Low",
        });

        expectSuccess(result);
        expect(result.data?.priority.name).toBe("Low");
      });

      it("should update issue labels", async () => {
        const result = await connector.updateIssue("DEMO-1", {
          labels: ["new-label-1", "new-label-2"],
        });

        expectSuccess(result);
        expect(result.data?.labels).toEqual(["new-label-1", "new-label-2"]);
      });

      it("should fail for non-existent issue", async () => {
        const result = await connector.updateIssue("NONEXISTENT-9999", {
          summary: "X",
        });

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("transitionIssue", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should transition to In Progress", async () => {
        const result = await connector.transitionIssue(
          "DEMO-2",
          "Start Progress",
        );

        expectSuccess(result);
        expect(result.data?.status.name).toBe("In Progress");
        expect(result.data?.status.category).toBe("in_progress");
      });

      it("should transition to Done", async () => {
        const result = await connector.transitionIssue("DEMO-1", "Done");

        expectSuccess(result);
        expect(result.data?.status.name).toBe("Done");
        expect(result.data?.status.category).toBe("done");
        expect(result.data?.resolution).toBeTruthy();
      });

      it("should fail for invalid transition", async () => {
        const result = await connector.transitionIssue(
          "DEMO-1",
          "Invalid Transition",
        );

        expectFailure(result, ErrorCodes.VALIDATION_ERROR);
      });

      it("should fail for non-existent issue", async () => {
        const result = await connector.transitionIssue(
          "NONEXISTENT-9999",
          "Done",
        );

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("addComment", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should add a comment to an issue", async () => {
        const result = await connector.addComment(
          "DEMO-1",
          "This is a test comment",
        );

        expectSuccess(result);
        expect(result.data?.body).toBe("This is a test comment");
        expect(result.data?.author).toBeTruthy();
      });

      it("should fail for non-existent issue", async () => {
        const result = await connector.addComment("NONEXISTENT-9999", "Test");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("searchIssues (JQL)", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should search by project", async () => {
        const result = await connector.searchIssues('project = "DEMO"');

        expectSuccess(result);
        expect(result.data?.issues.every((i) => i.project.key === "DEMO")).toBe(
          true,
        );
      });

      it("should search by status", async () => {
        const result = await connector.searchIssues('status = "In Progress"');

        expectSuccess(result);
        expect(
          result.data?.issues.every((i) => i.status.name.includes("Progress")),
        ).toBe(true);
      });

      it("should search by priority", async () => {
        const result = await connector.searchIssues('priority = "High"');

        expectSuccess(result);
        expect(
          result.data?.issues.every(
            (i) => i.priority.name.toLowerCase() === "high",
          ),
        ).toBe(true);
      });

      it("should search with labels", async () => {
        const result = await connector.searchIssues(
          'labels in ("authentication", "security")',
        );

        expectSuccess(result);
        expect(result.data?.issues.length).toBeGreaterThan(0);
      });

      it("should handle ORDER BY", async () => {
        const result = await connector.searchIssues(
          'project = "DEMO" ORDER BY created DESC',
        );

        expectSuccess(result);
        expect(result.data?.issues.length).toBeGreaterThan(0);
      });
    });

    describe("listBoards", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded boards", async () => {
        const result = await connector.listBoards();

        expectSuccess(result);
        expect(result.data?.length).toBeGreaterThan(0);
      });

      it("should filter by project key", async () => {
        const result = await connector.listBoards({ projectKey: "DEMO" });

        expectSuccess(result);
        expect(result.data?.every((b) => b.projectKey === "DEMO")).toBe(true);
      });

      it("should filter by type", async () => {
        const result = await connector.listBoards({ type: "scrum" });

        expectSuccess(result);
        expect(result.data?.every((b) => b.type === "scrum")).toBe(true);
      });
    });

    describe("getSprintIssues", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return issues for a sprint", async () => {
        const result = await connector.getSprintIssues(2);

        expectSuccess(result);
        expect(result.data?.every((i) => i.sprint?.id === 2)).toBe(true);
      });

      it("should fail for non-existent sprint", async () => {
        const result = await connector.getSprintIssues(9999);

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });
  });

  describe("LiveJiraConnector", () => {
    it("should require credentials for initialization", async () => {
      const connector = createJiraConnector({ mode: "live" });
      const result = await connector.initialize();

      expectFailure(result, ErrorCodes.AUTH_REQUIRED);
    });

    it("should initialize with credentials", async () => {
      const connector = createJiraConnector({
        mode: "live",
        siteUrl: "https://test.atlassian.net",
        apiToken: "test-token",
        userEmail: "test@example.com",
      });
      const result = await connector.initialize();

      expectSuccess(result);
      expect(connector.isInitialized).toBe(true);
    });

    it("should return NOT_IMPLEMENTED for operations", async () => {
      const connector = createJiraConnector({
        mode: "live",
        siteUrl: "https://test.atlassian.net",
        apiToken: "test-token",
        userEmail: "test@example.com",
      });
      await connector.initialize();

      const result = await connector.listIssues();
      expectFailure(result, ErrorCodes.NOT_IMPLEMENTED);
    });
  });
});
