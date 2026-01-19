import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createSnykConnector,
  SnykConnector,
} from "../../shared/connectors/snyk/index.js";
import { ErrorCodes } from "../../shared/connectors/types.js";
import { expectSuccess, expectFailure } from "../helpers/index.js";

describe("shared/connectors/snyk", () => {
  describe("MockSnykConnector", () => {
    let connector: SnykConnector;

    beforeEach(async () => {
      connector = createSnykConnector({ mode: "mock" });
    });

    afterEach(async () => {
      await connector.dispose();
    });

    describe("initialization", () => {
      it("should create a mock connector", () => {
        expect(connector.name).toBe("snyk");
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

    describe("listOrganizations", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded organizations", async () => {
        const result = await connector.listOrganizations();

        expectSuccess(result);
        expect(result.data?.length).toBeGreaterThan(0);
        expect(result.data?.[0]).toHaveProperty("id");
        expect(result.data?.[0]).toHaveProperty("name");
        expect(result.data?.[0]).toHaveProperty("slug");
      });

      it("should fail when not initialized", async () => {
        await connector.dispose();
        const result = await connector.listOrganizations();

        expectFailure(result, ErrorCodes.NOT_INITIALIZED);
      });
    });

    describe("listProjects", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded projects", async () => {
        const result = await connector.listProjects();

        expectSuccess(result);
        expect(result.data?.projects.length).toBeGreaterThan(0);
        expect(result.data?.total).toBeGreaterThan(0);
      });

      it("should filter by type", async () => {
        const result = await connector.listProjects({ type: "npm" });

        expectSuccess(result);
        expect(result.data?.projects.every((p) => p.type === "npm")).toBe(true);
      });

      it("should filter by isMonitored", async () => {
        const result = await connector.listProjects({ isMonitored: true });

        expectSuccess(result);
        expect(result.data?.projects.every((p) => p.isMonitored)).toBe(true);
      });

      it("should support pagination", async () => {
        const result = await connector.listProjects({ limit: 2, offset: 0 });

        expectSuccess(result);
        expect(result.data?.projects.length).toBeLessThanOrEqual(2);
      });

      it("should fail when not initialized", async () => {
        await connector.dispose();
        const result = await connector.listProjects();

        expectFailure(result, ErrorCodes.NOT_INITIALIZED);
      });
    });

    describe("getProject", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return a project by id", async () => {
        const result = await connector.getProject("proj-001");

        expectSuccess(result);
        expect(result.data?.id).toBe("proj-001");
        expect(result.data?.name).toBeDefined();
        expect(result.data?.type).toBeDefined();
      });

      it("should fail for non-existent project", async () => {
        const result = await connector.getProject("non-existent");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should fail when not initialized", async () => {
        await connector.dispose();
        const result = await connector.getProject("proj-001");

        expectFailure(result, ErrorCodes.NOT_INITIALIZED);
      });
    });

    describe("deleteProject", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should delete a project", async () => {
        const result = await connector.deleteProject("proj-004");

        expectSuccess(result);

        const getResult = await connector.getProject("proj-004");
        expectFailure(getResult, ErrorCodes.NOT_FOUND);
      });

      it("should fail for non-existent project", async () => {
        const result = await connector.deleteProject("non-existent");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("listIssues", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return issues for a project", async () => {
        const result = await connector.listIssues("proj-001");

        expectSuccess(result);
        expect(result.data?.issues.length).toBeGreaterThan(0);
        expect(result.data?.total).toBeGreaterThan(0);
      });

      it("should filter by severity", async () => {
        const result = await connector.listIssues("proj-001", {
          severity: ["critical"],
        });

        expectSuccess(result);
        expect(
          result.data?.issues.every((i) => i.severity === "critical"),
        ).toBe(true);
      });

      it("should filter by isFixable", async () => {
        const result = await connector.listIssues("proj-001", {
          isFixable: true,
        });

        expectSuccess(result);
        expect(result.data?.issues.every((i) => i.isFixable)).toBe(true);
      });

      it("should filter by isUpgradable", async () => {
        const result = await connector.listIssues("proj-001", {
          isUpgradable: true,
        });

        expectSuccess(result);
        expect(result.data?.issues.every((i) => i.isUpgradable)).toBe(true);
      });

      it("should fail for non-existent project", async () => {
        const result = await connector.listIssues("non-existent");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should fail when not initialized", async () => {
        await connector.dispose();
        const result = await connector.listIssues("proj-001");

        expectFailure(result, ErrorCodes.NOT_INITIALIZED);
      });
    });

    describe("getIssue", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return a specific issue", async () => {
        const result = await connector.getIssue(
          "proj-001",
          "SNYK-JS-LODASH-1018905",
        );

        expectSuccess(result);
        expect(result.data?.id).toBe("SNYK-JS-LODASH-1018905");
        expect(result.data?.title).toBeDefined();
        expect(result.data?.severity).toBeDefined();
      });

      it("should fail for non-existent issue", async () => {
        const result = await connector.getIssue("proj-001", "non-existent");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should fail for non-existent project", async () => {
        const result = await connector.getIssue(
          "non-existent",
          "SNYK-JS-LODASH-1018905",
        );

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("ignoreIssue", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should create an ignore rule", async () => {
        const result = await connector.ignoreIssue(
          "proj-001",
          "SNYK-JS-LODASH-1018905",
          {
            reason: "False positive",
            reasonType: "not-vulnerable",
          },
        );

        expectSuccess(result);
        expect(result.data?.id).toBeDefined();
        expect(result.data?.issueId).toBe("SNYK-JS-LODASH-1018905");
        expect(result.data?.reason).toBe("False positive");
        expect(result.data?.reasonType).toBe("not-vulnerable");
      });

      it("should fail for non-existent project", async () => {
        const result = await connector.ignoreIssue(
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

    describe("listIgnores", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return empty ignores initially", async () => {
        const result = await connector.listIgnores("proj-001");

        expectSuccess(result);
        expect(result.data?.ignores).toEqual([]);
        expect(result.data?.total).toBe(0);
      });

      it("should return ignores after adding one", async () => {
        await connector.ignoreIssue("proj-001", "SNYK-JS-LODASH-1018905", {
          reason: "Test ignore",
          reasonType: "temporary-ignore",
        });

        const result = await connector.listIgnores("proj-001");

        expectSuccess(result);
        expect(result.data?.ignores.length).toBe(1);
        expect(result.data?.total).toBe(1);
      });

      it("should fail for non-existent project", async () => {
        const result = await connector.listIgnores("non-existent");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("deleteIgnore", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should delete an ignore rule", async () => {
        const ignoreResult = await connector.ignoreIssue(
          "proj-001",
          "SNYK-JS-LODASH-1018905",
          {
            reason: "Test",
            reasonType: "temporary-ignore",
          },
        );
        expectSuccess(ignoreResult);

        const deleteResult = await connector.deleteIgnore(
          "proj-001",
          ignoreResult.data!.id,
        );

        expectSuccess(deleteResult);

        const listResult = await connector.listIgnores("proj-001");
        expectSuccess(listResult);
        expect(listResult.data?.ignores.length).toBe(0);
      });

      it("should fail for non-existent ignore", async () => {
        const result = await connector.deleteIgnore("proj-001", "non-existent");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("testProject", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return test results", async () => {
        const result = await connector.testProject("proj-001");

        expectSuccess(result);
        expect(result.data?.issuesCount).toBeGreaterThan(0);
        expect(result.data?.vulnerabilities.length).toBeGreaterThan(0);
        expect(result.data?.summary).toBeDefined();
        expect(result.data?.ok).toBe(false);
      });

      it("should return ok=true for project with no issues", async () => {
        const result = await connector.testProject("proj-004");

        expectSuccess(result);
        expect(result.data?.ok).toBe(true);
        expect(result.data?.issuesCount).toBe(0);
      });

      it("should fail for non-existent project", async () => {
        const result = await connector.testProject("non-existent");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("getFixSuggestions", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return fix suggestions", async () => {
        const result = await connector.getFixSuggestions("proj-001");

        expectSuccess(result);
        expect(result.data?.length).toBeGreaterThan(0);
        expect(result.data?.[0]).toHaveProperty("id");
        expect(result.data?.[0]).toHaveProperty("fixType");
        expect(result.data?.[0]).toHaveProperty("packageName");
      });

      it("should filter by issueIds", async () => {
        const result = await connector.getFixSuggestions("proj-001", {
          issueIds: ["SNYK-JS-LODASH-1018905"],
        });

        expectSuccess(result);
        expect(
          result.data?.every((f) => f.issueId === "SNYK-JS-LODASH-1018905"),
        ).toBe(true);
      });

      it("should include upgrade commands for upgradable issues", async () => {
        const result = await connector.getFixSuggestions("proj-001");

        expectSuccess(result);
        const withCommand = result.data?.filter((f) => f.command !== null);
        expect(withCommand?.length).toBeGreaterThan(0);
      });

      it("should fail for non-existent project", async () => {
        const result = await connector.getFixSuggestions("non-existent");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("listLicenseIssues", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return license issues", async () => {
        const result = await connector.listLicenseIssues("proj-001");

        expectSuccess(result);
        expect(result.data?.licenses.length).toBeGreaterThan(0);
        expect(result.data?.licenses[0]).toHaveProperty("license");
        expect(result.data?.licenses[0]).toHaveProperty("severity");
        expect(result.data?.licenses[0]).toHaveProperty("dependencies");
      });

      it("should fail for non-existent project", async () => {
        const result = await connector.listLicenseIssues("non-existent");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("getProjectSbom", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return SBOM data", async () => {
        const result = await connector.getProjectSbom("proj-001");

        expectSuccess(result);
        expect(result.data).toHaveProperty("bomFormat");
        expect(result.data).toHaveProperty("components");
      });

      it("should fail for non-existent project", async () => {
        const result = await connector.getProjectSbom("non-existent");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });
  });

  describe("LiveSnykConnector", () => {
    let connector: SnykConnector;

    beforeEach(() => {
      connector = createSnykConnector({ mode: "live" });
    });

    afterEach(async () => {
      await connector.dispose();
    });

    it("should create a live connector", () => {
      expect(connector.name).toBe("snyk");
      expect(connector.mode).toBe("live");
    });

    it("should fail to initialize without API token", async () => {
      const result = await connector.initialize();

      expectFailure(result, ErrorCodes.AUTH_REQUIRED);
    });

    it("should return NOT_IMPLEMENTED for methods", async () => {
      connector = createSnykConnector({
        mode: "live",
        apiToken: "test-token",
      });
      await connector.initialize();

      const result = await connector.listProjects();

      expectFailure(result, ErrorCodes.NOT_IMPLEMENTED);
    });
  });
});
