import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createGitHubConnector,
  GitHubConnector,
} from "../../../shared/connectors/github/index.js";
import { expectSuccess, expectFailure } from "../../helpers/index.js";
import {
  createSecurityAlertService,
  SecurityAlertService,
} from "../../../samples/security-alerts/sdk/alerts.js";

describe("security-alerts sample", () => {
  let connector: GitHubConnector;
  let alertService: SecurityAlertService;

  beforeEach(async () => {
    connector = createGitHubConnector({ mode: "mock" });
    await connector.initialize();
    alertService = createSecurityAlertService(connector);
  });

  afterEach(async () => {
    await connector.dispose();
  });

  describe("SecurityAlertService", () => {
    describe("analyzeAlerts", () => {
      it("should return security analysis with all counts", async () => {
        const result = await alertService.analyzeAlerts();
        expectSuccess(result);
        expect(result.data.totalAlerts).toBeGreaterThan(0);
        expect(typeof result.data.criticalCount).toBe("number");
        expect(typeof result.data.highCount).toBe("number");
        expect(typeof result.data.mediumCount).toBe("number");
        expect(typeof result.data.lowCount).toBe("number");
      });

      it("should include prioritized alerts", async () => {
        const result = await alertService.analyzeAlerts();
        expectSuccess(result);
        expect(Array.isArray(result.data.prioritizedAlerts)).toBe(true);
        expect(result.data.prioritizedAlerts.length).toBeGreaterThan(0);
      });

      it("should generate summary text", async () => {
        const result = await alertService.analyzeAlerts();
        expectSuccess(result);
        expect(typeof result.data.summary).toBe("string");
        expect(result.data.summary.length).toBeGreaterThan(0);
      });

      it("should sort alerts by priority score descending", async () => {
        const result = await alertService.analyzeAlerts();
        expectSuccess(result);
        const scores = result.data.prioritizedAlerts.map(
          (p) => p.priorityScore,
        );
        for (let i = 1; i < scores.length; i++) {
          expect(scores[i - 1]).toBeGreaterThanOrEqual(scores[i]);
        }
      });

      it("should assign priority ranks starting from 1", async () => {
        const result = await alertService.analyzeAlerts();
        expectSuccess(result);
        const ranks = result.data.prioritizedAlerts.map((p) => p.priorityRank);
        expect(ranks[0]).toBe(1);
        for (let i = 1; i < ranks.length; i++) {
          expect(ranks[i]).toBe(i + 1);
        }
      });
    });

    describe("getAlertsBySeverity", () => {
      it("should filter by critical severity", async () => {
        const result = await alertService.getAlertsBySeverity("critical");
        expectSuccess(result);
        for (const prioritized of result.data) {
          expect(prioritized.alert.severity).toBe("critical");
        }
      });

      it("should filter by high severity", async () => {
        const result = await alertService.getAlertsBySeverity("high");
        expectSuccess(result);
        for (const prioritized of result.data) {
          expect(prioritized.alert.severity).toBe("high");
        }
      });

      it("should return empty array when no alerts match severity", async () => {
        const result = await alertService.getAlertsBySeverity("low");
        expectSuccess(result);
        expect(Array.isArray(result.data)).toBe(true);
      });
    });

    describe("getCriticalAlerts", () => {
      it("should return only critical alerts", async () => {
        const result = await alertService.getCriticalAlerts();
        expectSuccess(result);
        for (const prioritized of result.data) {
          expect(prioritized.alert.severity).toBe("critical");
        }
      });

      it("should include recommendations", async () => {
        const result = await alertService.getCriticalAlerts();
        expectSuccess(result);
        if (result.data.length > 0) {
          expect(typeof result.data[0].recommendation).toBe("string");
          expect(result.data[0].recommendation).toContain("URGENT");
        }
      });
    });

    describe("getActionableAlerts", () => {
      it("should return alerts with available patches", async () => {
        const result = await alertService.getActionableAlerts();
        expectSuccess(result);
        for (const prioritized of result.data) {
          expect(prioritized.alert.patchedVersions).not.toBeNull();
        }
      });

      it("should respect limit parameter", async () => {
        const result = await alertService.getActionableAlerts(1);
        expectSuccess(result);
        expect(result.data.length).toBeLessThanOrEqual(1);
      });

      it("should include remediation steps", async () => {
        const result = await alertService.getActionableAlerts();
        expectSuccess(result);
        if (result.data.length > 0) {
          expect(Array.isArray(result.data[0].remediationSteps)).toBe(true);
          expect(result.data[0].remediationSteps.length).toBeGreaterThan(0);
        }
      });
    });

    describe("prioritization logic", () => {
      it("should score critical alerts higher than high", async () => {
        const criticalResult =
          await alertService.getAlertsBySeverity("critical");
        const highResult = await alertService.getAlertsBySeverity("high");
        expectSuccess(criticalResult);
        expectSuccess(highResult);

        if (criticalResult.data.length > 0 && highResult.data.length > 0) {
          expect(criticalResult.data[0].priorityScore).toBeGreaterThan(
            highResult.data[0].priorityScore,
          );
        }
      });

      it("should include effort estimation", async () => {
        const result = await alertService.analyzeAlerts();
        expectSuccess(result);
        for (const prioritized of result.data.prioritizedAlerts) {
          expect(["low", "medium", "high"]).toContain(
            prioritized.estimatedEffort,
          );
        }
      });

      it("should assign low effort for simple patches", async () => {
        const result = await alertService.getActionableAlerts();
        expectSuccess(result);
        const withPatch = result.data.find(
          (p) =>
            p.alert.patchedVersions &&
            p.alert.vulnerableVersionRange.includes("<") &&
            !p.alert.vulnerableVersionRange.includes("||"),
        );
        if (withPatch) {
          expect(withPatch.estimatedEffort).toBe("low");
        }
      });
    });

    describe("remediation steps", () => {
      it("should include npm commands for npm packages", async () => {
        const result = await alertService.analyzeAlerts();
        expectSuccess(result);
        const npmAlert = result.data.prioritizedAlerts.find(
          (p) => p.alert.package.ecosystem === "npm" && p.alert.patchedVersions,
        );
        if (npmAlert) {
          const hasNpmCommand = npmAlert.remediationSteps.some(
            (step) =>
              step.includes("npm update") || step.includes("npm install"),
          );
          expect(hasNpmCommand).toBe(true);
        }
      });

      it("should recommend testing after update", async () => {
        const result = await alertService.getActionableAlerts();
        expectSuccess(result);
        if (result.data.length > 0) {
          const hasTestStep = result.data[0].remediationSteps.some((step) =>
            step.toLowerCase().includes("test"),
          );
          expect(hasTestStep).toBe(true);
        }
      });

      it("should suggest alternatives for unpatchable alerts", async () => {
        const serviceWithFixed = createSecurityAlertService(connector, {
          includeFixedAlerts: true,
        });
        const result = await serviceWithFixed.analyzeAlerts();
        expectSuccess(result);
        const unpatched = result.data.prioritizedAlerts.find(
          (p) => !p.alert.patchedVersions,
        );
        if (unpatched) {
          const hasAltStep = unpatched.remediationSteps.some(
            (step) =>
              step.toLowerCase().includes("alternative") ||
              step.toLowerCase().includes("check"),
          );
          expect(hasAltStep).toBe(true);
        }
      });
    });

    describe("recommendations", () => {
      it("should generate urgent recommendation for critical alerts", async () => {
        const result = await alertService.getCriticalAlerts();
        expectSuccess(result);
        if (result.data.length > 0) {
          expect(result.data[0].recommendation).toMatch(/urgent/i);
        }
      });

      it("should mention version in recommendation when patch exists for non-critical", async () => {
        const result = await alertService.getAlertsBySeverity("high");
        expectSuccess(result);
        const withPatch = result.data.find((p) => p.alert.patchedVersions);
        if (withPatch) {
          expect(withPatch.recommendation).toContain(
            withPatch.alert.patchedVersions!,
          );
        }
      });
    });

    describe("summary generation", () => {
      it("should mention critical count when present", async () => {
        const result = await alertService.analyzeAlerts();
        expectSuccess(result);
        if (result.data.criticalCount > 0) {
          expect(result.data.summary).toMatch(/critical/i);
        }
      });

      it("should mention actionable count when patches available", async () => {
        const result = await alertService.analyzeAlerts();
        expectSuccess(result);
        const actionable = result.data.prioritizedAlerts.filter(
          (p) => p.alert.patchedVersions !== null,
        ).length;
        if (actionable > 0) {
          expect(result.data.summary).toMatch(/patch/i);
        }
      });
    });

    describe("custom configuration", () => {
      it("should use custom severity weights", async () => {
        const serviceWithCustomWeights = createSecurityAlertService(connector, {
          severityWeights: { critical: 200, high: 150, medium: 100, low: 50 },
        });
        const result = await serviceWithCustomWeights.analyzeAlerts();
        expectSuccess(result);
        const criticalAlert = result.data.prioritizedAlerts.find(
          (p) => p.alert.severity === "critical",
        );
        if (criticalAlert) {
          expect(criticalAlert.priorityScore).toBeGreaterThanOrEqual(200);
        }
      });

      it("should include fixed alerts when configured", async () => {
        const serviceWithFixed = createSecurityAlertService(connector, {
          includeFixedAlerts: true,
        });
        const result = await serviceWithFixed.analyzeAlerts();
        expectSuccess(result);
        expect(result.data.totalAlerts).toBeGreaterThanOrEqual(3);
      });

      it("should exclude fixed alerts by default", async () => {
        const defaultService = createSecurityAlertService(connector);
        const result = await defaultService.analyzeAlerts();
        expectSuccess(result);
        for (const prioritized of result.data.prioritizedAlerts) {
          expect(prioritized.alert.state).toBe("open");
        }
      });
    });
  });

  describe("error handling", () => {
    it("should handle uninitialized connector", async () => {
      const uninitConnector = createGitHubConnector({ mode: "mock" });
      const uninitService = createSecurityAlertService(uninitConnector);

      const result = await uninitService.analyzeAlerts();
      expectFailure(result);
      expect(result.error?.code).toBe("NOT_INITIALIZED");
    });

    it("should propagate connector errors", async () => {
      const uninitConnector = createGitHubConnector({ mode: "mock" });
      const uninitService = createSecurityAlertService(uninitConnector);

      const severityResult =
        await uninitService.getAlertsBySeverity("critical");
      expectFailure(severityResult);
    });
  });
});
