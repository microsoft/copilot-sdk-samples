import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createSnykConnector,
  SnykConnector,
} from "../../../shared/connectors/snyk/index.js";
import {
  createScanningService,
  ScanningService,
} from "../../../samples/snyk/sdk/scanning.js";
import { expectSuccess, expectFailure } from "../../helpers/index.js";
import { ErrorCodes } from "../../../shared/connectors/types.js";

describe("samples/snyk/scanning", () => {
  let connector: SnykConnector;
  let service: ScanningService;

  beforeEach(async () => {
    connector = createSnykConnector({ mode: "mock" });
    await connector.initialize();
    service = createScanningService(connector);
  });

  afterEach(async () => {
    await connector.dispose();
  });

  describe("getVulnerabilityOverview", () => {
    it("should return vulnerability overview", async () => {
      const result = await service.getVulnerabilityOverview();

      expectSuccess(result);
      expect(result.data?.totalProjects).toBeGreaterThan(0);
      expect(result.data?.projects.length).toBeGreaterThan(0);
    });

    it("should count projects by monitoring status", async () => {
      const result = await service.getVulnerabilityOverview();

      expectSuccess(result);
      expect(result.data?.monitoredProjects).toBeDefined();
      expect(result.data?.unmonitoredProjects).toBeDefined();
      const total =
        result.data!.monitoredProjects + result.data!.unmonitoredProjects;
      expect(total).toBe(result.data!.totalProjects);
    });

    it("should count issues by severity", async () => {
      const result = await service.getVulnerabilityOverview();

      expectSuccess(result);
      expect(result.data?.criticalCount).toBeDefined();
      expect(result.data?.highCount).toBeDefined();
      expect(result.data?.mediumCount).toBeDefined();
      expect(result.data?.lowCount).toBeDefined();
    });

    it("should include project summaries", async () => {
      const result = await service.getVulnerabilityOverview();

      expectSuccess(result);
      const project = result.data?.projects[0];
      expect(project).toHaveProperty("id");
      expect(project).toHaveProperty("name");
      expect(project).toHaveProperty("type");
      expect(project).toHaveProperty("totalIssues");
    });
  });

  describe("getCriticalVulnerabilities", () => {
    it("should return only critical vulnerabilities", async () => {
      const result = await service.getCriticalVulnerabilities();

      expectSuccess(result);
      expect(result.data?.every((i) => i.severity === "critical")).toBe(true);
    });

    it("should sort by priority score descending", async () => {
      const result = await service.getCriticalVulnerabilities();

      expectSuccess(result);
      const scores = result.data?.map((i) => i.priorityScore) || [];
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
      }
    });

    it("should include issue details", async () => {
      const result = await service.getCriticalVulnerabilities();

      expectSuccess(result);
      if (result.data && result.data.length > 0) {
        const issue = result.data[0];
        expect(issue).toHaveProperty("id");
        expect(issue).toHaveProperty("title");
        expect(issue).toHaveProperty("pkgName");
        expect(issue).toHaveProperty("pkgVersion");
        expect(issue).toHaveProperty("cvssScore");
      }
    });
  });

  describe("getFixableIssues", () => {
    it("should return fixable issues and suggestions", async () => {
      const result = await service.getFixableIssues("proj-001");

      expectSuccess(result);
      expect(result.data?.issues.length).toBeGreaterThan(0);
      expect(result.data?.fixes.length).toBeGreaterThan(0);
    });

    it("should return only fixable issues", async () => {
      const result = await service.getFixableIssues("proj-001");

      expectSuccess(result);
      expect(result.data?.issues.every((i) => i.isFixable)).toBe(true);
    });

    it("should fail for non-existent project", async () => {
      const result = await service.getFixableIssues("non-existent");

      expectFailure(result, ErrorCodes.NOT_FOUND);
    });
  });

  describe("getFixSuggestions", () => {
    it("should return fix suggestions", async () => {
      const result = await service.getFixSuggestions("proj-001");

      expectSuccess(result);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it("should include fix details", async () => {
      const result = await service.getFixSuggestions("proj-001");

      expectSuccess(result);
      const fix = result.data?.[0];
      expect(fix).toHaveProperty("issueId");
      expect(fix).toHaveProperty("fixType");
      expect(fix).toHaveProperty("packageName");
      expect(fix).toHaveProperty("effort");
    });

    it("should filter by issue IDs", async () => {
      const result = await service.getFixSuggestions("proj-001", [
        "SNYK-JS-LODASH-1018905",
      ]);

      expectSuccess(result);
      expect(
        result.data?.every((f) => f.issueId === "SNYK-JS-LODASH-1018905"),
      ).toBe(true);
    });
  });

  describe("getPrioritizedIssues", () => {
    it("should return prioritized issues", async () => {
      const result = await service.getPrioritizedIssues();

      expectSuccess(result);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it("should sort by urgency score descending", async () => {
      const result = await service.getPrioritizedIssues();

      expectSuccess(result);
      const scores = result.data?.map((i) => i.urgencyScore) || [];
      for (let i = 1; i < scores.length; i++) {
        expect(scores[i]).toBeLessThanOrEqual(scores[i - 1]);
      }
    });

    it("should include project context", async () => {
      const result = await service.getPrioritizedIssues();

      expectSuccess(result);
      const issue = result.data?.[0];
      expect(issue).toHaveProperty("projectId");
      expect(issue).toHaveProperty("projectName");
      expect(issue).toHaveProperty("urgencyScore");
      expect(issue).toHaveProperty("urgencyReason");
    });

    it("should respect limit option", async () => {
      const result = await service.getPrioritizedIssues({ limit: 5 });

      expectSuccess(result);
      expect(result.data?.length).toBeLessThanOrEqual(5);
    });

    it("should filter by severity", async () => {
      const result = await service.getPrioritizedIssues({
        severity: ["critical", "high"],
      });

      expectSuccess(result);
      expect(
        result.data?.every(
          (i) => i.severity === "critical" || i.severity === "high",
        ),
      ).toBe(true);
    });
  });

  describe("getProjectVulnerabilityReport", () => {
    it("should return complete project report", async () => {
      const result = await service.getProjectVulnerabilityReport("proj-001");

      expectSuccess(result);
      expect(result.data?.project).toBeDefined();
      expect(result.data?.issues).toBeDefined();
      expect(result.data?.fixSuggestions).toBeDefined();
      expect(result.data?.summary).toBeDefined();
    });

    it("should include project details", async () => {
      const result = await service.getProjectVulnerabilityReport("proj-001");

      expectSuccess(result);
      expect(result.data?.project.id).toBe("proj-001");
      expect(result.data?.project.name).toBeDefined();
      expect(result.data?.project.type).toBeDefined();
    });

    it("should include summary statistics", async () => {
      const result = await service.getProjectVulnerabilityReport("proj-001");

      expectSuccess(result);
      expect(result.data?.summary.totalIssues).toBeGreaterThan(0);
      expect(result.data?.summary.fixableIssues).toBeDefined();
      expect(result.data?.summary.bySeverity).toBeInstanceOf(Map);
    });

    it("should fail for non-existent project", async () => {
      const result =
        await service.getProjectVulnerabilityReport("non-existent");

      expectFailure(result, ErrorCodes.NOT_FOUND);
    });
  });

  describe("testProject", () => {
    it("should return test results", async () => {
      const result = await service.testProject("proj-001");

      expectSuccess(result);
      expect(result.data?.ok).toBe(false);
      expect(result.data?.issuesCount).toBeGreaterThan(0);
      expect(result.data?.summary).toBeDefined();
      expect(result.data?.vulnerabilities.length).toBeGreaterThan(0);
    });

    it("should return ok=true for clean project", async () => {
      const result = await service.testProject("proj-004");

      expectSuccess(result);
      expect(result.data?.ok).toBe(true);
      expect(result.data?.issuesCount).toBe(0);
    });

    it("should fail for non-existent project", async () => {
      const result = await service.testProject("non-existent");

      expectFailure(result, ErrorCodes.NOT_FOUND);
    });
  });

  describe("ignoreIssue", () => {
    it("should create an ignore rule", async () => {
      const result = await service.ignoreIssue(
        "proj-001",
        "SNYK-JS-LODASH-1018905",
        {
          reason: "False positive in our context",
          reasonType: "not-vulnerable",
        },
      );

      expectSuccess(result);
      expect(result.data?.id).toBeDefined();
      expect(result.data?.issueId).toBe("SNYK-JS-LODASH-1018905");
      expect(result.data?.reason).toBe("False positive in our context");
    });

    it("should fail for non-existent project", async () => {
      const result = await service.ignoreIssue(
        "non-existent",
        "SNYK-JS-LODASH-1018905",
        {
          reason: "Test",
          reasonType: "temporary-ignore",
        },
      );

      expectFailure(result, ErrorCodes.NOT_FOUND);
    });
  });

  describe("getUpgradeCommands", () => {
    it("should return upgrade commands", async () => {
      const result = await service.getUpgradeCommands("proj-001");

      expectSuccess(result);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it("should return npm commands for npm project", async () => {
      const result = await service.getUpgradeCommands("proj-001");

      expectSuccess(result);
      const npmCommands = result.data?.filter((c) => c.startsWith("npm"));
      expect(npmCommands?.length).toBeGreaterThan(0);
    });

    it("should return pip commands for python project", async () => {
      const result = await service.getUpgradeCommands("proj-002");

      expectSuccess(result);
      const pipCommands = result.data?.filter((c) => c.startsWith("pip"));
      expect(pipCommands?.length).toBeGreaterThan(0);
    });

    it("should fail for non-existent project", async () => {
      const result = await service.getUpgradeCommands("non-existent");

      expectFailure(result, ErrorCodes.NOT_FOUND);
    });
  });

  describe("getProjectsByType", () => {
    it("should filter projects by type", async () => {
      const result = await service.getProjectsByType("npm");

      expectSuccess(result);
      expect(result.data?.every((p) => p.type === "npm")).toBe(true);
    });

    it("should return pip projects", async () => {
      const result = await service.getProjectsByType("pip");

      expectSuccess(result);
      expect(result.data?.every((p) => p.type === "pip")).toBe(true);
    });
  });

  describe("getLicenseIssues", () => {
    it("should return license issues", async () => {
      const result = await service.getLicenseIssues("proj-001");

      expectSuccess(result);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it("should include license details", async () => {
      const result = await service.getLicenseIssues("proj-001");

      expectSuccess(result);
      const license = result.data?.[0];
      expect(license).toHaveProperty("license");
      expect(license).toHaveProperty("severity");
      expect(license).toHaveProperty("dependencies");
      expect(license).toHaveProperty("instructions");
    });

    it("should fail for non-existent project", async () => {
      const result = await service.getLicenseIssues("non-existent");

      expectFailure(result, ErrorCodes.NOT_FOUND);
    });
  });

  describe("getProjectSbom", () => {
    it("should return SBOM data", async () => {
      const result = await service.getProjectSbom("proj-001");

      expectSuccess(result);
      expect(result.data).toHaveProperty("bomFormat");
      expect(result.data).toHaveProperty("components");
    });

    it("should fail for non-existent project", async () => {
      const result = await service.getProjectSbom("non-existent");

      expectFailure(result, ErrorCodes.NOT_FOUND);
    });
  });
});
