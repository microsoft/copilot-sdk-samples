import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createPagerDutyConnector,
  type PagerDutyConnector,
  type PagerDutyIncident,
  type PagerDutyService,
  type IncidentStatus,
  type IncidentUrgency,
  type IncidentSeverity,
} from "../../shared/connectors/pagerduty/index.js";
import { ErrorCodes } from "../../shared/connectors/types.js";
import { expectSuccess, expectFailure } from "../helpers/index.js";

describe("shared/connectors/pagerduty", () => {
  describe("module exports", () => {
    it("should export createPagerDutyConnector factory function", () => {
      expect(typeof createPagerDutyConnector).toBe("function");
    });

    it("should export IncidentStatus/IncidentUrgency/IncidentSeverity types usable for annotations", () => {
      const status: IncidentStatus = "triggered";
      const urgency: IncidentUrgency = "high";
      const severity: IncidentSeverity = "critical";

      expect(status).toBe("triggered");
      expect(urgency).toBe("high");
      expect(severity).toBe("critical");
    });

    it("should export PagerDutyIncident interface usable for type annotations", async () => {
      const connector = createPagerDutyConnector({ mode: "mock" });
      await connector.initialize();

      const result = await connector.listIncidents();
      expectSuccess(result);

      const incidents: PagerDutyIncident[] = result.data?.incidents ?? [];
      expect(Array.isArray(incidents)).toBe(true);

      if (incidents.length > 0) {
        const incident: PagerDutyIncident = incidents[0];
        expect(incident.id).toBeTruthy();
        expect(incident.status).toBeTruthy();
      }

      await connector.dispose();
    });
  });

  describe("MockPagerDutyConnector", () => {
    let connector: PagerDutyConnector;

    beforeEach(async () => {
      connector = createPagerDutyConnector({ mode: "mock" });
    });

    afterEach(async () => {
      await connector.dispose();
    });

    describe("initialization", () => {
      it("should create a mock connector", () => {
        expect(connector.name).toBe("pagerduty");
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

      it("should filter by status", async () => {
        const result = await connector.listIncidents({
          statuses: ["triggered"],
        });

        expectSuccess(result);
        expect(
          result.data?.incidents.every((i) => i.status === "triggered"),
        ).toBe(true);
      });

      it("should filter by multiple statuses", async () => {
        const result = await connector.listIncidents({
          statuses: ["triggered", "acknowledged"],
        });

        expectSuccess(result);
        expect(
          result.data?.incidents.every(
            (i) => i.status === "triggered" || i.status === "acknowledged",
          ),
        ).toBe(true);
      });

      it("should filter by urgency", async () => {
        const result = await connector.listIncidents({ urgencies: ["high"] });

        expectSuccess(result);
        expect(result.data?.incidents.every((i) => i.urgency === "high")).toBe(
          true,
        );
      });

      it("should filter by service ID", async () => {
        const result = await connector.listIncidents({
          serviceIds: ["SVC001"],
        });

        expectSuccess(result);
        expect(
          result.data?.incidents.every((i) => i.service.id === "SVC001"),
        ).toBe(true);
      });

      it("should paginate results", async () => {
        const result = await connector.listIncidents({ limit: 2, offset: 0 });

        expectSuccess(result);
        expect(result.data?.incidents.length).toBeLessThanOrEqual(2);
      });

      it("should fail if not initialized", async () => {
        await connector.dispose();
        const result = await connector.listIncidents();

        expectFailure(result, ErrorCodes.NOT_INITIALIZED);
      });
    });

    describe("getIncident", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return an existing incident", async () => {
        const result = await connector.getIncident("INC001");

        expectSuccess(result);
        expect(result.data?.id).toBe("INC001");
        expect(result.data?.title).toBeTruthy();
      });

      it("should fail for non-existent incident", async () => {
        const result = await connector.getIncident("NONEXISTENT");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should include incident details", async () => {
        const result = await connector.getIncident("INC001");

        expectSuccess(result);
        expect(result.data).toHaveProperty("status");
        expect(result.data).toHaveProperty("urgency");
        expect(result.data).toHaveProperty("service");
        expect(result.data).toHaveProperty("escalationPolicy");
      });
    });

    describe("createIncident", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should create a new incident", async () => {
        const result = await connector.createIncident({
          title: "New Test Incident",
          serviceId: "SVC001",
          urgency: "high",
          body: "Test description",
        });

        expectSuccess(result);
        expect(result.data?.title).toBe("New Test Incident");
        expect(result.data?.status).toBe("triggered");
        expect(result.data?.urgency).toBe("high");
      });

      it("should create incident with minimal fields", async () => {
        const result = await connector.createIncident({
          title: "Minimal Incident",
          serviceId: "SVC001",
        });

        expectSuccess(result);
        expect(result.data?.title).toBe("Minimal Incident");
        expect(result.data?.urgency).toBe("high");
      });

      it("should fail for non-existent service", async () => {
        const result = await connector.createIncident({
          title: "Test",
          serviceId: "NONEXISTENT",
        });

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("updateIncident", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should update incident status", async () => {
        const result = await connector.updateIncident("INC001", {
          status: "acknowledged",
        });

        expectSuccess(result);
        expect(result.data?.status).toBe("acknowledged");
      });

      it("should update incident title", async () => {
        const result = await connector.updateIncident("INC001", {
          title: "Updated Title",
        });

        expectSuccess(result);
        expect(result.data?.title).toBe("Updated Title");
      });

      it("should update incident urgency", async () => {
        const result = await connector.updateIncident("INC001", {
          urgency: "low",
        });

        expectSuccess(result);
        expect(result.data?.urgency).toBe("low");
      });

      it("should fail for non-existent incident", async () => {
        const result = await connector.updateIncident("NONEXISTENT", {
          status: "acknowledged",
        });

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("acknowledgeIncident", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should acknowledge an incident", async () => {
        const result = await connector.acknowledgeIncident("INC001");

        expectSuccess(result);
        expect(result.data?.status).toBe("acknowledged");
        expect(result.data?.acknowledgedAt).toBeTruthy();
      });

      it("should fail for non-existent incident", async () => {
        const result = await connector.acknowledgeIncident("NONEXISTENT");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("resolveIncident", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should resolve an incident", async () => {
        const result = await connector.resolveIncident("INC001");

        expectSuccess(result);
        expect(result.data?.status).toBe("resolved");
        expect(result.data?.resolvedAt).toBeTruthy();
      });

      it("should resolve with resolution message", async () => {
        const result = await connector.resolveIncident(
          "INC002",
          "Fixed by restarting the service",
        );

        expectSuccess(result);
        expect(result.data?.status).toBe("resolved");
      });

      it("should fail for non-existent incident", async () => {
        const result = await connector.resolveIncident("NONEXISTENT");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("addIncidentNote", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should add a note to an incident", async () => {
        const result = await connector.addIncidentNote(
          "INC001",
          "This is a test note",
        );

        expectSuccess(result);
        expect(result.data?.content).toBe("This is a test note");
        expect(result.data?.id).toBeTruthy();
      });

      it("should fail for non-existent incident", async () => {
        const result = await connector.addIncidentNote("NONEXISTENT", "Test");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("getIncidentAlerts", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return alerts for an incident", async () => {
        const result = await connector.getIncidentAlerts("INC001");

        expectSuccess(result);
        expect(Array.isArray(result.data)).toBe(true);
      });

      it("should fail for non-existent incident", async () => {
        const result = await connector.getIncidentAlerts("NONEXISTENT");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("getIncidentTimeline", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return timeline for an incident", async () => {
        const result = await connector.getIncidentTimeline("INC001");

        expectSuccess(result);
        expect(Array.isArray(result.data)).toBe(true);
      });

      it("should fail for non-existent incident", async () => {
        const result = await connector.getIncidentTimeline("NONEXISTENT");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("listServices", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded services", async () => {
        const result = await connector.listServices();

        expectSuccess(result);
        expect(result.data?.services.length).toBeGreaterThan(0);
        expect(result.data?.total).toBeGreaterThan(0);
      });

      it("should filter by query", async () => {
        const result = await connector.listServices({ query: "API" });

        expectSuccess(result);
        expect(
          result.data?.services.every(
            (s) =>
              s.name.toLowerCase().includes("api") ||
              (s.description?.toLowerCase().includes("api") ?? false),
          ),
        ).toBe(true);
      });

      it("should paginate results", async () => {
        const result = await connector.listServices({ limit: 2 });

        expectSuccess(result);
        expect(result.data?.services.length).toBeLessThanOrEqual(2);
      });
    });

    describe("getService", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return an existing service", async () => {
        const result = await connector.getService("SVC001");

        expectSuccess(result);
        expect(result.data?.id).toBe("SVC001");
        expect(result.data?.name).toBeTruthy();
      });

      it("should fail for non-existent service", async () => {
        const result = await connector.getService("NONEXISTENT");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("listTeams", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded teams", async () => {
        const result = await connector.listTeams();

        expectSuccess(result);
        expect(result.data?.teams.length).toBeGreaterThan(0);
      });

      it("should filter by query", async () => {
        const result = await connector.listTeams({ query: "Platform" });

        expectSuccess(result);
        expect(
          result.data?.teams.every((t) => t.name.includes("Platform")),
        ).toBe(true);
      });
    });

    describe("listUsers", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded users", async () => {
        const result = await connector.listUsers();

        expectSuccess(result);
        expect(result.data?.users.length).toBeGreaterThan(0);
      });

      it("should filter by query", async () => {
        const result = await connector.listUsers({ query: "Alice" });

        expectSuccess(result);
        expect(
          result.data?.users.every(
            (u) => u.name.includes("Alice") || u.email.includes("alice"),
          ),
        ).toBe(true);
      });
    });

    describe("getUser", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return an existing user", async () => {
        const result = await connector.getUser("USER001");

        expectSuccess(result);
        expect(result.data?.id).toBe("USER001");
        expect(result.data?.name).toBeTruthy();
      });

      it("should fail for non-existent user", async () => {
        const result = await connector.getUser("NONEXISTENT");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("listEscalationPolicies", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded policies", async () => {
        const result = await connector.listEscalationPolicies();

        expectSuccess(result);
        expect(result.data?.escalationPolicies.length).toBeGreaterThan(0);
      });

      it("should filter by query", async () => {
        const result = await connector.listEscalationPolicies({
          query: "Platform",
        });

        expectSuccess(result);
        expect(
          result.data?.escalationPolicies.every((p) =>
            p.name.includes("Platform"),
          ),
        ).toBe(true);
      });
    });

    describe("getEscalationPolicy", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return an existing policy", async () => {
        const result = await connector.getEscalationPolicy("EP001");

        expectSuccess(result);
        expect(result.data?.id).toBe("EP001");
        expect(result.data?.escalationRules.length).toBeGreaterThan(0);
      });

      it("should fail for non-existent policy", async () => {
        const result = await connector.getEscalationPolicy("NONEXISTENT");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("listOnCalls", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return on-call entries", async () => {
        const result = await connector.listOnCalls();

        expectSuccess(result);
        expect(Array.isArray(result.data)).toBe(true);
      });

      it("should filter by escalation policy", async () => {
        const result = await connector.listOnCalls({
          escalationPolicyIds: ["EP001"],
        });

        expectSuccess(result);
        expect(
          result.data?.every((oc) => oc.escalationPolicy.id === "EP001"),
        ).toBe(true);
      });
    });

    describe("getCurrentOnCall", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return current on-call users", async () => {
        const result = await connector.getCurrentOnCall("EP001");

        expectSuccess(result);
        expect(Array.isArray(result.data)).toBe(true);
      });

      it("should fail for non-existent policy", async () => {
        const result = await connector.getCurrentOnCall("NONEXISTENT");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("listSchedules", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded schedules", async () => {
        const result = await connector.listSchedules();

        expectSuccess(result);
        expect(result.data?.schedules.length).toBeGreaterThan(0);
      });

      it("should filter by query", async () => {
        const result = await connector.listSchedules({ query: "Platform" });

        expectSuccess(result);
        expect(
          result.data?.schedules.every((s) => s.name.includes("Platform")),
        ).toBe(true);
      });
    });

    describe("getSchedule", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return an existing schedule", async () => {
        const result = await connector.getSchedule("SCHED001");

        expectSuccess(result);
        expect(result.data?.id).toBe("SCHED001");
        expect(result.data?.finalSchedule).toBeTruthy();
      });

      it("should fail for non-existent schedule", async () => {
        const result = await connector.getSchedule("NONEXISTENT");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("listPriorities", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded priorities", async () => {
        const result = await connector.listPriorities();

        expectSuccess(result);
        expect(result.data?.length).toBeGreaterThan(0);
        expect(result.data?.some((p) => p.name === "P1")).toBe(true);
      });
    });
  });

  describe("LivePagerDutyConnector", () => {
    it("should require credentials for initialization", async () => {
      const connector = createPagerDutyConnector({ mode: "live" });
      const result = await connector.initialize();

      expectFailure(result, ErrorCodes.AUTH_REQUIRED);
    });

    it("should initialize with credentials", async () => {
      const connector = createPagerDutyConnector({
        mode: "live",
        apiToken: "test-token",
      });
      const result = await connector.initialize();

      expectSuccess(result);
      expect(connector.isInitialized).toBe(true);
    });

    it("should return NOT_IMPLEMENTED for operations", async () => {
      const connector = createPagerDutyConnector({
        mode: "live",
        apiToken: "test-token",
      });
      await connector.initialize();

      const result = await connector.listIncidents();
      expectFailure(result, ErrorCodes.NOT_IMPLEMENTED);
    });
  });
});
