import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createGitHubConnector,
  GitHubConnector,
} from "../../../shared/connectors/github/index.js";
import { expectSuccess, expectFailure } from "../../helpers/index.js";
import {
  createTriageService,
  TriageService,
} from "../../../samples/issue-triage/sdk/triage.js";

describe("issue-triage sample", () => {
  let connector: GitHubConnector;
  let triageService: TriageService;

  beforeEach(async () => {
    connector = createGitHubConnector({ mode: "mock" });
    await connector.initialize();
    triageService = createTriageService(connector);
  });

  afterEach(async () => {
    await connector.dispose();
  });

  describe("TriageService", () => {
    describe("classifyIssue", () => {
      it("should classify a bug issue correctly", async () => {
        const result = await triageService.classifyIssue(1);
        expectSuccess(result);
        expect(result.data.issueNumber).toBe(1);
        expect(result.data.category).toBe("bug");
        expect(result.data.confidence).toBeGreaterThan(0);
        expect(result.data.suggestedLabels).toContain("bug");
      });

      it("should classify a feature request correctly", async () => {
        const result = await triageService.classifyIssue(2);
        expectSuccess(result);
        expect(result.data.issueNumber).toBe(2);
        expect(result.data.category).toBe("feature");
        expect(result.data.suggestedLabels).toContain("feature");
      });

      it("should return error for non-existent issue", async () => {
        const result = await triageService.classifyIssue(999);
        expectFailure(result);
        expect(result.error?.code).toBe("NOT_FOUND");
      });

      it("should include priority in suggested labels", async () => {
        const result = await triageService.classifyIssue(1);
        expectSuccess(result);
        const priorityLabel = result.data.suggestedLabels.find((l: string) =>
          l.startsWith("priority:"),
        );
        expect(priorityLabel).toBeDefined();
      });

      it("should include reasoning in result", async () => {
        const result = await triageService.classifyIssue(1);
        expectSuccess(result);
        expect(result.data.reasoning).toBeTruthy();
        expect(typeof result.data.reasoning).toBe("string");
      });
    });

    describe("triageIssues", () => {
      it("should triage all open issues", async () => {
        const result = await triageService.triageIssues({ state: "open" });
        expectSuccess(result);
        expect(Array.isArray(result.data)).toBe(true);
      });

      it("should respect limit option", async () => {
        const result = await triageService.triageIssues({
          state: "open",
          limit: 1,
        });
        expectSuccess(result);
        expect(result.data.length).toBeLessThanOrEqual(1);
      });

      it("should skip already-labeled issues on second run", async () => {
        const serviceWithAutoLabel = createTriageService(connector, {
          autoApplyLabels: true,
        });

        const firstResult = await serviceWithAutoLabel.triageIssues({
          state: "open",
        });
        expectSuccess(firstResult);
        const firstCount = firstResult.data.length;

        if (firstCount > 0) {
          const secondResult = await serviceWithAutoLabel.triageIssues({
            state: "open",
          });
          expectSuccess(secondResult);
          expect(secondResult.data.length).toBeLessThan(firstCount);
        }
      });
    });

    describe("applyLabels", () => {
      it("should apply labels to an issue", async () => {
        const result = await triageService.applyLabels(1, ["test-label"]);
        expectSuccess(result);
        expect(Array.isArray(result.data)).toBe(true);
      });

      it("should return error for non-existent issue", async () => {
        const result = await triageService.applyLabels(999, ["test-label"]);
        expectFailure(result);
        expect(result.error?.code).toBe("NOT_FOUND");
      });
    });

    describe("auto-apply labels", () => {
      it("should auto-apply labels when enabled", async () => {
        const serviceWithAutoLabel = createTriageService(connector, {
          autoApplyLabels: true,
        });

        const issueBeforeResult = await connector.getIssue(1);
        expectSuccess(issueBeforeResult);
        const labelCountBefore = issueBeforeResult.data.labels.length;

        await serviceWithAutoLabel.classifyIssue(1);

        const issueAfterResult = await connector.getIssue(1);
        expectSuccess(issueAfterResult);
        expect(issueAfterResult.data.labels.length).toBeGreaterThan(
          labelCountBefore,
        );
      });

      it("should not auto-apply labels when disabled", async () => {
        const serviceWithoutAutoLabel = createTriageService(connector, {
          autoApplyLabels: false,
        });

        const issueBeforeResult = await connector.getIssue(2);
        expectSuccess(issueBeforeResult);
        const labelCountBefore = issueBeforeResult.data.labels.length;

        await serviceWithoutAutoLabel.classifyIssue(2);

        const issueAfterResult = await connector.getIssue(2);
        expectSuccess(issueAfterResult);
        expect(issueAfterResult.data.labels.length).toBe(labelCountBefore);
      });
    });

    describe("custom configuration", () => {
      it("should use custom label mappings", async () => {
        const serviceWithCustomLabels = createTriageService(connector, {
          labelMappings: { bug: "type:bug" },
        });

        const result = await serviceWithCustomLabels.classifyIssue(1);
        expectSuccess(result);
        expect(result.data.suggestedLabels).toContain("type:bug");
      });

      it("should use custom priority prefix", async () => {
        const serviceWithCustomPrefix = createTriageService(connector, {
          priorityPrefix: "p:",
        });

        const result = await serviceWithCustomPrefix.classifyIssue(1);
        expectSuccess(result);
        const priorityLabel = result.data.suggestedLabels.find((l: string) =>
          l.startsWith("p:"),
        );
        expect(priorityLabel).toBeDefined();
      });
    });
  });

  describe("rule-based classification", () => {
    it("should detect bug keywords", async () => {
      const newIssueResult = await connector.createIssue({
        title: "Error when clicking button",
        body: "The app crashes with an error message",
      });
      expectSuccess(newIssueResult);

      const result = await triageService.classifyIssue(
        newIssueResult.data.number,
      );
      expectSuccess(result);
      expect(result.data.category).toBe("bug");
    });

    it("should detect security keywords", async () => {
      const newIssueResult = await connector.createIssue({
        title: "Security vulnerability in auth",
        body: "Found a potential XSS vulnerability",
      });
      expectSuccess(newIssueResult);

      const result = await triageService.classifyIssue(
        newIssueResult.data.number,
      );
      expectSuccess(result);
      expect(result.data.category).toBe("security");
      expect(result.data.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it("should detect performance keywords", async () => {
      const newIssueResult = await connector.createIssue({
        title: "Slow page load",
        body: "Performance is degraded after recent update",
      });
      expectSuccess(newIssueResult);

      const result = await triageService.classifyIssue(
        newIssueResult.data.number,
      );
      expectSuccess(result);
      expect(result.data.category).toBe("performance");
    });

    it("should detect documentation keywords", async () => {
      const newIssueResult = await connector.createIssue({
        title: "Update README",
        body: "The documentation needs a tutorial section",
      });
      expectSuccess(newIssueResult);

      const result = await triageService.classifyIssue(
        newIssueResult.data.number,
      );
      expectSuccess(result);
      expect(result.data.category).toBe("documentation");
    });

    it("should detect critical priority keywords", async () => {
      const newIssueResult = await connector.createIssue({
        title: "Critical bug in production",
        body: "Urgent fix needed ASAP",
      });
      expectSuccess(newIssueResult);

      const result = await triageService.classifyIssue(
        newIssueResult.data.number,
      );
      expectSuccess(result);
      expect(result.data.priority).toBe("critical");
    });

    it("should detect low priority keywords", async () => {
      const newIssueResult = await connector.createIssue({
        title: "Minor typo fix",
        body: "Nice to have when possible",
      });
      expectSuccess(newIssueResult);

      const result = await triageService.classifyIssue(
        newIssueResult.data.number,
      );
      expectSuccess(result);
      expect(result.data.priority).toBe("low");
    });
  });

  describe("error handling", () => {
    it("should handle uninitialized connector", async () => {
      const uninitConnector = createGitHubConnector({ mode: "mock" });
      const uninitService = createTriageService(uninitConnector);

      const result = await uninitService.classifyIssue(1);
      expectFailure(result);
      expect(result.error?.code).toBe("NOT_INITIALIZED");
    });
  });
});
