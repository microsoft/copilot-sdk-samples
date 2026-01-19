import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createDatadogConnector,
  DatadogConnector,
} from "../../shared/connectors/datadog/index.js";
import { ErrorCodes } from "../../shared/connectors/types.js";
import { expectSuccess, expectFailure } from "../helpers/index.js";

describe("shared/connectors/datadog", () => {
  describe("MockDatadogConnector", () => {
    let connector: DatadogConnector;

    beforeEach(async () => {
      connector = createDatadogConnector({ mode: "mock" });
    });

    afterEach(async () => {
      await connector.dispose();
    });

    describe("initialization", () => {
      it("should create a mock connector", () => {
        expect(connector.name).toBe("datadog");
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

    describe("listMetrics", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded mock metrics", async () => {
        const result = await connector.listMetrics();

        expectSuccess(result);
        expect(result.data?.length).toBeGreaterThan(0);
      });

      it("should filter metrics by query", async () => {
        const result = await connector.listMetrics({ query: "cpu" });

        expectSuccess(result);
        expect(
          result.data?.every(
            (m) =>
              m.name.toLowerCase().includes("cpu") ||
              m.description.toLowerCase().includes("cpu"),
          ),
        ).toBe(true);
      });

      it("should fail when not initialized", async () => {
        await connector.dispose();
        const result = await connector.listMetrics();

        expectFailure(result, ErrorCodes.NOT_INITIALIZED);
      });
    });

    describe("queryMetrics", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return metric series data", async () => {
        const now = Date.now();
        const result = await connector.queryMetrics({
          query: "system.cpu.user{*}",
          from: now - 3600000,
          to: now,
        });

        expectSuccess(result);
        expect(result.data?.length).toBeGreaterThan(0);
        expect(result.data?.[0].points.length).toBeGreaterThan(0);
      });
    });

    describe("listMonitors", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded mock monitors", async () => {
        const result = await connector.listMonitors();

        expectSuccess(result);
        expect(result.data?.monitors.length).toBeGreaterThan(0);
        expect(result.data?.total).toBeGreaterThan(0);
      });

      it("should filter by state", async () => {
        const result = await connector.listMonitors({ groupStates: ["Alert"] });

        expectSuccess(result);
        expect(
          result.data?.monitors.every((m) => m.overallState === "Alert"),
        ).toBe(true);
      });

      it("should filter by multiple states", async () => {
        const result = await connector.listMonitors({
          groupStates: ["Alert", "Warn"],
        });

        expectSuccess(result);
        expect(
          result.data?.monitors.every(
            (m) => m.overallState === "Alert" || m.overallState === "Warn",
          ),
        ).toBe(true);
      });

      it("should filter by name", async () => {
        const result = await connector.listMonitors({ name: "CPU" });

        expectSuccess(result);
        expect(
          result.data?.monitors.every((m) =>
            m.name.toLowerCase().includes("cpu"),
          ),
        ).toBe(true);
      });

      it("should filter by tags", async () => {
        const result = await connector.listMonitors({
          tags: ["service:api-gateway"],
        });

        expectSuccess(result);
        expect(
          result.data?.monitors.every((m) =>
            m.tags.includes("service:api-gateway"),
          ),
        ).toBe(true);
      });
    });

    describe("getMonitor", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return a specific monitor", async () => {
        const result = await connector.getMonitor(1);

        expectSuccess(result);
        expect(result.data?.id).toBe(1);
        expect(result.data?.name).toBeTruthy();
      });

      it("should fail for non-existent monitor", async () => {
        const result = await connector.getMonitor(9999);

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("createMonitor", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should create a new monitor", async () => {
        const result = await connector.createMonitor({
          name: "Test Monitor",
          type: "metric alert",
          query: "avg(last_5m):avg:test.metric{*} > 100",
          message: "Test alert @slack-test",
          tags: ["env:test"],
          thresholds: { critical: 100, warning: 80 },
        });

        expectSuccess(result);
        expect(result.data?.name).toBe("Test Monitor");
        expect(result.data?.overallState).toBe("No Data");
      });
    });

    describe("updateMonitor", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should update a monitor", async () => {
        const result = await connector.updateMonitor(1, {
          name: "Updated Monitor Name",
        });

        expectSuccess(result);
        expect(result.data?.name).toBe("Updated Monitor Name");
      });

      it("should fail for non-existent monitor", async () => {
        const result = await connector.updateMonitor(9999, { name: "Test" });

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("deleteMonitor", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should delete a monitor", async () => {
        const result = await connector.deleteMonitor(1);

        expectSuccess(result);

        const getResult = await connector.getMonitor(1);
        expectFailure(getResult, ErrorCodes.NOT_FOUND);
      });

      it("should fail for non-existent monitor", async () => {
        const result = await connector.deleteMonitor(9999);

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("listDashboards", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded mock dashboards", async () => {
        const result = await connector.listDashboards();

        expectSuccess(result);
        expect(result.data?.dashboards.length).toBeGreaterThan(0);
        expect(result.data?.total).toBeGreaterThan(0);
      });
    });

    describe("getDashboard", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return a specific dashboard", async () => {
        const result = await connector.getDashboard("dash-001");

        expectSuccess(result);
        expect(result.data?.id).toBe("dash-001");
        expect(result.data?.widgets.length).toBeGreaterThan(0);
      });

      it("should fail for non-existent dashboard", async () => {
        const result = await connector.getDashboard("nonexistent");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("listHosts", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded mock hosts", async () => {
        const result = await connector.listHosts();

        expectSuccess(result);
        expect(result.data?.hosts.length).toBeGreaterThan(0);
        expect(result.data?.total).toBeGreaterThan(0);
      });

      it("should filter hosts by name", async () => {
        const result = await connector.listHosts({ filter: "api" });

        expectSuccess(result);
        expect(
          result.data?.hosts.every((h) => h.name.toLowerCase().includes("api")),
        ).toBe(true);
      });
    });

    describe("muteHost/unmuteHost", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should mute a host", async () => {
        const result = await connector.muteHost("api-server-1");

        expectSuccess(result);
      });

      it("should unmute a host", async () => {
        await connector.muteHost("api-server-1");
        const result = await connector.unmuteHost("api-server-1");

        expectSuccess(result);
      });

      it("should fail for non-existent host", async () => {
        const result = await connector.muteHost("nonexistent");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("listEvents", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded mock events", async () => {
        const now = Date.now();
        const result = await connector.listEvents({
          start: now - 86400000,
          end: now,
        });

        expectSuccess(result);
        expect(result.data?.length).toBeGreaterThan(0);
      });
    });

    describe("createEvent", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should create a new event", async () => {
        const result = await connector.createEvent({
          title: "Test Deployment",
          text: "Deployed version 1.0.0",
          priority: "normal",
          alertType: "info",
          tags: ["deployment"],
        });

        expectSuccess(result);
        expect(result.data?.title).toBe("Test Deployment");
      });
    });

    describe("listSLOs", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded mock SLOs", async () => {
        const result = await connector.listSLOs();

        expectSuccess(result);
        expect(result.data?.slos.length).toBeGreaterThan(0);
        expect(result.data?.total).toBeGreaterThan(0);
      });

      it("should filter by tags", async () => {
        const result = await connector.listSLOs({
          tags: ["service:api-gateway"],
        });

        expectSuccess(result);
        expect(
          result.data?.slos.every((s) =>
            s.tags.includes("service:api-gateway"),
          ),
        ).toBe(true);
      });
    });

    describe("getSLO", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return a specific SLO", async () => {
        const result = await connector.getSLO("slo-001");

        expectSuccess(result);
        expect(result.data?.id).toBe("slo-001");
        expect(result.data?.overallStatus.length).toBeGreaterThan(0);
      });

      it("should fail for non-existent SLO", async () => {
        const result = await connector.getSLO("nonexistent");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("listIncidents", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded mock incidents", async () => {
        const result = await connector.listIncidents();

        expectSuccess(result);
        expect(result.data?.incidents.length).toBeGreaterThan(0);
        expect(result.data?.total).toBeGreaterThan(0);
      });

      it("should filter by query", async () => {
        const result = await connector.listIncidents({ query: "503" });

        expectSuccess(result);
        expect(
          result.data?.incidents.every((i) =>
            i.title.toLowerCase().includes("503"),
          ),
        ).toBe(true);
      });
    });

    describe("getIncident", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return a specific incident", async () => {
        const result = await connector.getIncident("inc-001");

        expectSuccess(result);
        expect(result.data?.id).toBe("inc-001");
      });

      it("should fail for non-existent incident", async () => {
        const result = await connector.getIncident("nonexistent");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("queryLogs", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return logs for time range", async () => {
        const now = new Date();
        const hourAgo = new Date(now.getTime() - 3600000);

        const result = await connector.queryLogs({
          query: "*",
          from: hourAgo.toISOString(),
          to: now.toISOString(),
          indexes: ["main"],
        });

        expectSuccess(result);
        expect(result.data?.logs.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  describe("LiveDatadogConnector", () => {
    it("should fail to initialize without credentials", async () => {
      const connector = createDatadogConnector({ mode: "live" });
      const result = await connector.initialize();

      expectFailure(result, ErrorCodes.AUTH_REQUIRED);
    });
  });
});
