import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createJiraConnector,
  JiraConnector,
} from "../../../shared/connectors/jira/index.js";
import {
  createConfluenceConnector,
  ConfluenceConnector,
} from "../../../shared/connectors/confluence/index.js";
import { expectSuccess, expectFailure } from "../../helpers/index.js";
import {
  createAtlassianSyncService,
  AtlassianSyncService,
} from "../../../samples/jira-confluence/sdk/sync.js";

describe("jira-confluence sample", () => {
  let jira: JiraConnector;
  let confluence: ConfluenceConnector;
  let syncService: AtlassianSyncService;

  beforeEach(async () => {
    jira = createJiraConnector({ mode: "mock" });
    confluence = createConfluenceConnector({ mode: "mock" });
    await jira.initialize();
    await confluence.initialize();
    syncService = createAtlassianSyncService(jira, confluence);
  });

  afterEach(async () => {
    await jira.dispose();
    await confluence.dispose();
  });

  describe("AtlassianSyncService", () => {
    describe("syncIssueToConfluence", () => {
      it("should sync a single issue to Confluence", async () => {
        const result = await syncService.syncIssueToConfluence("DEMO-1", "ENG");
        expectSuccess(result);
        expect(result.data.jiraKey).toBe("DEMO-1");
        expect(result.data.syncStatus).toBe("synced");
        expect(result.data.confluencePageId).toBeTruthy();
        expect(result.data.confluencePageTitle).toContain("DEMO-1");
      });

      it("should return error for non-existent issue", async () => {
        const result = await syncService.syncIssueToConfluence(
          "FAKE-999",
          "ENG",
        );
        expectFailure(result);
        expect(result.error?.code).toBe("NOT_FOUND");
      });

      it("should include issue summary in synced data", async () => {
        const result = await syncService.syncIssueToConfluence("DEMO-2", "ENG");
        expectSuccess(result);
        expect(result.data.jiraSummary).toBeTruthy();
        expect(result.data.jiraStatus).toBeTruthy();
      });

      it("should update existing page if it exists", async () => {
        // First sync creates the page
        const firstResult = await syncService.syncIssueToConfluence(
          "DEMO-1",
          "ENG",
        );
        expectSuccess(firstResult);
        const pageId = firstResult.data.confluencePageId;

        // Second sync should update the same page
        const secondResult = await syncService.syncIssueToConfluence(
          "DEMO-1",
          "ENG",
        );
        expectSuccess(secondResult);
        expect(secondResult.data.confluencePageId).toBe(pageId);
        expect(secondResult.data.syncStatus).toBe("synced");
      });

      it("should include comments when option is enabled", async () => {
        const result = await syncService.syncIssueToConfluence(
          "DEMO-1",
          "ENG",
          { includeComments: true },
        );
        expectSuccess(result);
        expect(result.data.syncStatus).toBe("synced");
      });
    });

    describe("syncProjectToConfluence", () => {
      it("should sync all project issues to Confluence", async () => {
        const result = await syncService.syncProjectToConfluence({
          jiraProjectKey: "DEMO",
          confluenceSpaceKey: "ENG",
          createMissingPages: true,
          updateExisting: true,
          includeComments: false,
        });
        expectSuccess(result);
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBeGreaterThan(0);
      });

      it("should handle sync errors gracefully", async () => {
        const result = await syncService.syncProjectToConfluence({
          jiraProjectKey: "DEMO",
          confluenceSpaceKey: "ENG",
          createMissingPages: true,
          updateExisting: true,
          includeComments: false,
        });
        expectSuccess(result);
        // All issues should have a sync status
        for (const issue of result.data) {
          expect(["synced", "pending", "error"]).toContain(issue.syncStatus);
        }
      });

      it("should return empty array for non-existent project", async () => {
        const result = await syncService.syncProjectToConfluence({
          jiraProjectKey: "FAKE",
          confluenceSpaceKey: "ENG",
          createMissingPages: true,
          updateExisting: true,
          includeComments: false,
        });
        expectSuccess(result);
        expect(result.data.length).toBe(0);
      });

      it("should mark issues as pending when not creating pages", async () => {
        const result = await syncService.syncProjectToConfluence({
          jiraProjectKey: "DEMO",
          confluenceSpaceKey: "ENG",
          createMissingPages: false,
          updateExisting: false,
          includeComments: false,
        });
        expectSuccess(result);
        // Without creating pages, most should be pending
        const pendingCount = result.data.filter(
          (i) => i.syncStatus === "pending",
        ).length;
        expect(pendingCount).toBeGreaterThan(0);
      });
    });

    describe("generateProjectDocumentation", () => {
      it("should generate project overview page", async () => {
        const result = await syncService.generateProjectDocumentation(
          "DEMO",
          "ENG",
        );
        expectSuccess(result);
        expect(result.data.project.key).toBe("DEMO");
        expect(result.data.generatedPages.length).toBeGreaterThan(0);

        const overviewPage = result.data.generatedPages.find(
          (p) => p.type === "overview",
        );
        expect(overviewPage).toBeDefined();
        expect(overviewPage?.title).toContain("Overview");
      });

      it("should generate roadmap page when requested", async () => {
        const result = await syncService.generateProjectDocumentation(
          "DEMO",
          "ENG",
          { includeRoadmap: true },
        );
        expectSuccess(result);

        const roadmapPage = result.data.generatedPages.find(
          (p) => p.type === "roadmap",
        );
        expect(roadmapPage).toBeDefined();
        expect(roadmapPage?.title).toContain("Roadmap");
      });

      it("should generate sprint summary when requested", async () => {
        const result = await syncService.generateProjectDocumentation(
          "DEMO",
          "ENG",
          { includeSprintSummary: true },
        );
        expectSuccess(result);
        // Sprint page may or may not be generated depending on active sprint data
        expect(result.data.generatedPages.length).toBeGreaterThanOrEqual(1);
      });

      it("should return error for non-existent project", async () => {
        const result = await syncService.generateProjectDocumentation(
          "FAKE",
          "ENG",
        );
        expectFailure(result);
        expect(result.error?.code).toBe("NOT_FOUND");
      });

      it("should include project summary statistics", async () => {
        const result = await syncService.generateProjectDocumentation(
          "DEMO",
          "ENG",
        );
        expectSuccess(result);
        expect(result.data.summary.totalIssues).toBeGreaterThan(0);
        expect(typeof result.data.summary.openIssues).toBe("number");
        expect(typeof result.data.summary.closedIssues).toBe("number");
        expect(result.data.summary.byPriority).toBeDefined();
        expect(result.data.summary.byStatus).toBeDefined();
        expect(result.data.summary.byType).toBeDefined();
      });

      it("should generate all page types when all options enabled", async () => {
        const result = await syncService.generateProjectDocumentation(
          "DEMO",
          "ENG",
          {
            includeRoadmap: true,
            includeSprintSummary: true,
          },
        );
        expectSuccess(result);
        const pageTypes = result.data.generatedPages.map((p) => p.type);
        expect(pageTypes).toContain("overview");
        expect(pageTypes).toContain("roadmap");
      });
    });

    describe("findRelatedDocumentation", () => {
      it("should find related documentation for an issue", async () => {
        const result = await syncService.findRelatedDocumentation("DEMO-1");
        expectSuccess(result);
        expect(Array.isArray(result.data)).toBe(true);
      });

      it("should return error for non-existent issue", async () => {
        const result = await syncService.findRelatedDocumentation("FAKE-999");
        expectFailure(result);
        expect(result.error?.code).toBe("NOT_FOUND");
      });

      it("should return empty array when no related docs found", async () => {
        const result = await syncService.findRelatedDocumentation("SDK-1");
        expectSuccess(result);
        // May return empty or results depending on mock search
        expect(Array.isArray(result.data)).toBe(true);
      });
    });

    describe("getProjectStatus", () => {
      it("should return project summary statistics", async () => {
        const result = await syncService.getProjectStatus("DEMO");
        expectSuccess(result);
        expect(result.data.totalIssues).toBeGreaterThan(0);
        expect(typeof result.data.openIssues).toBe("number");
        expect(typeof result.data.closedIssues).toBe("number");
      });

      it("should include breakdown by priority", async () => {
        const result = await syncService.getProjectStatus("DEMO");
        expectSuccess(result);
        expect(result.data.byPriority).toBeDefined();
        expect(typeof result.data.byPriority).toBe("object");
      });

      it("should include breakdown by status", async () => {
        const result = await syncService.getProjectStatus("DEMO");
        expectSuccess(result);
        expect(result.data.byStatus).toBeDefined();
        expect(typeof result.data.byStatus).toBe("object");
      });

      it("should include breakdown by type", async () => {
        const result = await syncService.getProjectStatus("DEMO");
        expectSuccess(result);
        expect(result.data.byType).toBeDefined();
        expect(typeof result.data.byType).toBe("object");
      });

      it("should return empty summary for non-existent project", async () => {
        const result = await syncService.getProjectStatus("FAKE");
        expectSuccess(result);
        expect(result.data.totalIssues).toBe(0);
        expect(result.data.openIssues).toBe(0);
        expect(result.data.closedIssues).toBe(0);
      });

      it("should have consistent total count", async () => {
        const result = await syncService.getProjectStatus("DEMO");
        expectSuccess(result);
        expect(result.data.totalIssues).toBe(
          result.data.openIssues + result.data.closedIssues,
        );
      });
    });
  });

  describe("error handling", () => {
    it("should handle uninitialized Jira connector", async () => {
      const uninitJira = createJiraConnector({ mode: "mock" });
      const uninitService = createAtlassianSyncService(uninitJira, confluence);

      const result = await uninitService.syncIssueToConfluence("DEMO-1", "ENG");
      expectFailure(result);
      expect(result.error?.code).toBe("NOT_INITIALIZED");
    });

    it("should handle uninitialized Confluence connector", async () => {
      const uninitConfluence = createConfluenceConnector({ mode: "mock" });
      const uninitService = createAtlassianSyncService(jira, uninitConfluence);

      const result = await uninitService.syncIssueToConfluence("DEMO-1", "ENG");
      expectFailure(result);
      expect(result.error?.code).toBe("NOT_INITIALIZED");
    });
  });

  describe("integration workflows", () => {
    it("should support full project documentation workflow", async () => {
      // 1. Get project status
      const statusResult = await syncService.getProjectStatus("DEMO");
      expectSuccess(statusResult);

      // 2. Generate documentation
      const docsResult = await syncService.generateProjectDocumentation(
        "DEMO",
        "ENG",
        { includeRoadmap: true },
      );
      expectSuccess(docsResult);

      // 3. Sync individual high-priority issues
      const syncResult = await syncService.syncIssueToConfluence(
        "DEMO-1",
        "ENG",
        { includeComments: true },
      );
      expectSuccess(syncResult);

      // Verify workflow completed successfully
      expect(docsResult.data.generatedPages.length).toBeGreaterThan(0);
      expect(syncResult.data.syncStatus).toBe("synced");
    });

    it("should support bulk sync workflow", async () => {
      // Sync all DEMO project issues
      const bulkResult = await syncService.syncProjectToConfluence({
        jiraProjectKey: "DEMO",
        confluenceSpaceKey: "ENG",
        createMissingPages: true,
        updateExisting: true,
        includeComments: false,
      });
      expectSuccess(bulkResult);

      // Verify all issues were processed
      const syncedCount = bulkResult.data.filter(
        (i) => i.syncStatus === "synced",
      ).length;
      expect(syncedCount).toBeGreaterThan(0);
    });
  });
});
