import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createDatadogConnector,
  DatadogConnector,
} from "../../../shared/connectors/datadog/index.js";
import {
  createMonitoringService,
  MonitoringService,
} from "../../../samples/datadog/sdk/monitoring.js";
import { expectSuccess, expectFailure } from "../../helpers/index.js";
import { ErrorCodes } from "../../../shared/connectors/types.js";

describe("samples/datadog/monitoring", () => {
  let connector: DatadogConnector;
  let service: MonitoringService;

  beforeEach(async () => {
    connector = createDatadogConnector({ mode: "mock" });
    await connector.initialize();
    service = createMonitoringService(connector);
  });

  afterEach(async () => {
    await connector.dispose();
  });

  describe("getMonitoringOverview", () => {
    it("should return monitoring overview", async () => {
      const result = await service.getMonitoringOverview();

      expectSuccess(result);
      expect(result.data?.totalMonitors).toBeGreaterThan(0);
      expect(result.data?.monitors.length).toBeGreaterThan(0);
    });

    it("should count monitors by state", async () => {
      const result = await service.getMonitoringOverview();

      expectSuccess(result);
      const total =
        result.data!.alertingMonitors +
        result.data!.warningMonitors +
        result.data!.okMonitors +
        result.data!.noDataMonitors;
      expect(total).toBe(result.data!.totalMonitors);
    });

    it("should include monitor summaries", async () => {
      const result = await service.getMonitoringOverview();

      expectSuccess(result);
      const monitor = result.data?.monitors[0];
      expect(monitor).toHaveProperty("id");
      expect(monitor).toHaveProperty("name");
      expect(monitor).toHaveProperty("type");
      expect(monitor).toHaveProperty("state");
      expect(monitor).toHaveProperty("tags");
    });
  });

  describe("getAlertingMonitors", () => {
    it("should return only alerting or warning monitors", async () => {
      const result = await service.getAlertingMonitors();

      expectSuccess(result);
      expect(
        result.data?.every((m) => m.state === "Alert" || m.state === "Warn"),
      ).toBe(true);
    });
  });

  describe("getNoDataMonitors", () => {
    it("should return only no data monitors", async () => {
      const result = await service.getNoDataMonitors();

      expectSuccess(result);
      expect(result.data?.every((m) => m.state === "No Data")).toBe(true);
    });
  });

  describe("getHostHealthReport", () => {
    it("should return host health report", async () => {
      const result = await service.getHostHealthReport();

      expectSuccess(result);
      expect(result.data?.totalHosts).toBeGreaterThan(0);
      expect(result.data?.hosts.length).toBeGreaterThan(0);
    });

    it("should categorize hosts by health", async () => {
      const result = await service.getHostHealthReport();

      expectSuccess(result);
      expect(result.data?.healthyHosts).toBeDefined();
      expect(result.data?.unhealthyHosts).toBeDefined();
      expect(result.data?.mutedHosts).toBeDefined();
    });

    it("should identify high CPU hosts", async () => {
      const result = await service.getHostHealthReport();

      expectSuccess(result);
      expect(Array.isArray(result.data?.highCpuHosts)).toBe(true);
    });

    it("should include host summaries", async () => {
      const result = await service.getHostHealthReport();

      expectSuccess(result);
      const host = result.data?.hosts[0];
      expect(host).toHaveProperty("id");
      expect(host).toHaveProperty("name");
      expect(host).toHaveProperty("cpuUsage");
      expect(host).toHaveProperty("load");
      expect(host).toHaveProperty("uptime");
    });
  });

  describe("getHighCpuHosts", () => {
    it("should return hosts with high CPU", async () => {
      const result = await service.getHighCpuHosts();

      expectSuccess(result);
      expect(result.data?.every((h) => h.cpuUsage >= 70)).toBe(true);
    });

    it("should sort by CPU usage descending", async () => {
      const result = await service.getHighCpuHosts();

      expectSuccess(result);
      if (result.data!.length > 1) {
        for (let i = 1; i < result.data!.length; i++) {
          expect(result.data![i - 1].cpuUsage).toBeGreaterThanOrEqual(
            result.data![i].cpuUsage,
          );
        }
      }
    });
  });

  describe("getSLOComplianceReport", () => {
    it("should return SLO compliance report", async () => {
      const result = await service.getSLOComplianceReport();

      expectSuccess(result);
      expect(result.data?.totalSLOs).toBeGreaterThan(0);
      expect(result.data?.slos.length).toBeGreaterThan(0);
    });

    it("should categorize SLOs by status", async () => {
      const result = await service.getSLOComplianceReport();

      expectSuccess(result);
      const total =
        result.data!.compliantSLOs +
        result.data!.breachedSLOs +
        result.data!.warningSLOs;
      expect(total).toBeLessThanOrEqual(result.data!.totalSLOs);
    });

    it("should include SLO summaries", async () => {
      const result = await service.getSLOComplianceReport();

      expectSuccess(result);
      const slo = result.data?.slos[0];
      expect(slo).toHaveProperty("id");
      expect(slo).toHaveProperty("name");
      expect(slo).toHaveProperty("targetThreshold");
      expect(slo).toHaveProperty("currentSLI");
      expect(slo).toHaveProperty("errorBudgetRemaining");
      expect(slo).toHaveProperty("status");
    });
  });

  describe("getBreachedSLOs", () => {
    it("should return only breached SLOs", async () => {
      const result = await service.getBreachedSLOs();

      expectSuccess(result);
      expect(
        result.data?.every(
          (s) => s.status === "Breached" || s.errorBudgetRemaining < 0,
        ),
      ).toBe(true);
    });
  });

  describe("getIncidentReport", () => {
    it("should return incident report", async () => {
      const result = await service.getIncidentReport();

      expectSuccess(result);
      expect(result.data?.totalIncidents).toBeGreaterThan(0);
      expect(result.data?.incidents.length).toBeGreaterThan(0);
    });

    it("should count incidents by state", async () => {
      const result = await service.getIncidentReport();

      expectSuccess(result);
      expect(result.data?.activeIncidents).toBeDefined();
      expect(result.data?.resolvedIncidents).toBeDefined();
    });

    it("should group incidents by severity", async () => {
      const result = await service.getIncidentReport();

      expectSuccess(result);
      expect(result.data?.bySeverity).toBeInstanceOf(Map);
    });

    it("should include incident summaries", async () => {
      const result = await service.getIncidentReport();

      expectSuccess(result);
      const incident = result.data?.incidents[0];
      expect(incident).toHaveProperty("id");
      expect(incident).toHaveProperty("title");
      expect(incident).toHaveProperty("severity");
      expect(incident).toHaveProperty("state");
      expect(incident).toHaveProperty("customerImpacted");
    });
  });

  describe("getActiveIncidents", () => {
    it("should return only active incidents", async () => {
      const result = await service.getActiveIncidents();

      expectSuccess(result);
      expect(
        result.data?.every((i) => i.state === "active" || i.state === "stable"),
      ).toBe(true);
    });
  });

  describe("createMonitor", () => {
    it("should create a new monitor", async () => {
      const result = await service.createMonitor({
        name: "Test Monitor",
        query: "avg(last_5m):avg:test.metric{*} > 100",
        message: "Test alert",
        type: "metric alert",
        tags: ["env:test"],
      });

      expectSuccess(result);
      expect(result.data?.name).toBe("Test Monitor");
      expect(result.data?.state).toBe("No Data");
    });

    it("should return monitor summary", async () => {
      const result = await service.createMonitor({
        name: "Test Monitor",
        query: "avg(last_5m):avg:test.metric{*} > 100",
        message: "Test alert",
      });

      expectSuccess(result);
      expect(result.data).toHaveProperty("id");
      expect(result.data).toHaveProperty("type");
      expect(result.data).toHaveProperty("tags");
    });
  });

  describe("muteHost", () => {
    it("should mute a host", async () => {
      const result = await service.muteHost("api-server-1");

      expectSuccess(result);
    });

    it("should mute with duration", async () => {
      const result = await service.muteHost("api-server-1", {
        message: "Maintenance",
        durationMinutes: 60,
      });

      expectSuccess(result);
    });
  });

  describe("unmuteHost", () => {
    it("should unmute a host", async () => {
      await service.muteHost("api-server-1");
      const result = await service.unmuteHost("api-server-1");

      expectSuccess(result);
    });
  });

  describe("getMonitor", () => {
    it("should return a specific monitor", async () => {
      const result = await service.getMonitor(1);

      expectSuccess(result);
      expect(result.data?.id).toBe(1);
    });

    it("should fail for non-existent monitor", async () => {
      const result = await service.getMonitor(9999);

      expectFailure(result, ErrorCodes.NOT_FOUND);
    });
  });

  describe("muteMonitor", () => {
    it("should mute a monitor", async () => {
      const result = await service.muteMonitor(1);

      expectSuccess(result);
      expect(result.data?.id).toBe(1);
    });

    it("should mute with options", async () => {
      const result = await service.muteMonitor(1, {
        scope: "host:api-server-1",
        durationMinutes: 30,
      });

      expectSuccess(result);
    });

    it("should fail for non-existent monitor", async () => {
      const result = await service.muteMonitor(9999);

      expectFailure(result, ErrorCodes.NOT_FOUND);
    });
  });

  describe("custom CPU threshold", () => {
    it("should respect custom CPU threshold", async () => {
      const customService = createMonitoringService(connector, {
        cpuThreshold: 90,
      });

      const result = await customService.getHighCpuHosts();

      expectSuccess(result);
      expect(result.data?.every((h) => h.cpuUsage >= 90)).toBe(true);
    });
  });
});
