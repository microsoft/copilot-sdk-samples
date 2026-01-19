import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createPagerDutyConnector,
  PagerDutyConnector,
} from "../../../shared/connectors/pagerduty/index.js";
import {
  createIncidentManagementService,
  IncidentManagementService,
} from "../../../samples/pagerduty/sdk/incidents.js";
import { expectSuccess, expectFailure } from "../../helpers/index.js";
import { ErrorCodes } from "../../../shared/connectors/types.js";

describe("samples/pagerduty/incidents", () => {
  let connector: PagerDutyConnector;
  let service: IncidentManagementService;

  beforeEach(async () => {
    connector = createPagerDutyConnector({ mode: "mock" });
    await connector.initialize();
    service = createIncidentManagementService(connector);
  });

  afterEach(async () => {
    await connector.dispose();
  });

  describe("getActiveIncidents", () => {
    it("should return incident analysis", async () => {
      const result = await service.getActiveIncidents();

      expectSuccess(result);
      expect(result.data?.totalActive).toBeGreaterThan(0);
      expect(result.data?.incidents.length).toBeGreaterThan(0);
    });

    it("should count triggered and acknowledged separately", async () => {
      const result = await service.getActiveIncidents();

      expectSuccess(result);
      expect(result.data?.triggered).toBeDefined();
      expect(result.data?.acknowledged).toBeDefined();
      expect(result.data?.triggered + result.data?.acknowledged).toBe(
        result.data?.totalActive,
      );
    });

    it("should group incidents by service", async () => {
      const result = await service.getActiveIncidents();

      expectSuccess(result);
      expect(result.data?.byService).toBeInstanceOf(Map);
      expect(result.data?.byService.size).toBeGreaterThan(0);
    });

    it("should identify oldest unacknowledged incident", async () => {
      const result = await service.getActiveIncidents();

      expectSuccess(result);
      if (result.data?.triggered > 0) {
        expect(result.data?.oldestUnacknowledged).toBeTruthy();
        expect(result.data?.oldestUnacknowledged?.status).toBe("triggered");
      }
    });

    it("should include incident summaries", async () => {
      const result = await service.getActiveIncidents();

      expectSuccess(result);
      const incident = result.data?.incidents[0];
      expect(incident).toHaveProperty("id");
      expect(incident).toHaveProperty("title");
      expect(incident).toHaveProperty("status");
      expect(incident).toHaveProperty("urgency");
      expect(incident).toHaveProperty("service");
      expect(incident).toHaveProperty("ageMinutes");
    });
  });

  describe("getTriggeredIncidents", () => {
    it("should return only triggered incidents", async () => {
      const result = await service.getTriggeredIncidents();

      expectSuccess(result);
      expect(result.data?.every((i) => i.status === "triggered")).toBe(true);
    });
  });

  describe("getHighUrgencyIncidents", () => {
    it("should return only high urgency incidents", async () => {
      const result = await service.getHighUrgencyIncidents();

      expectSuccess(result);
      expect(result.data?.every((i) => i.urgency === "high")).toBe(true);
    });

    it("should only include active incidents", async () => {
      const result = await service.getHighUrgencyIncidents();

      expectSuccess(result);
      expect(
        result.data?.every(
          (i) => i.status === "triggered" || i.status === "acknowledged",
        ),
      ).toBe(true);
    });
  });

  describe("acknowledgeIncident", () => {
    it("should acknowledge an incident", async () => {
      const result = await service.acknowledgeIncident("INC001");

      expectSuccess(result);
      expect(result.data?.status).toBe("acknowledged");
    });

    it("should return updated incident summary", async () => {
      const result = await service.acknowledgeIncident("INC001");

      expectSuccess(result);
      expect(result.data?.id).toBe("INC001");
      expect(result.data).toHaveProperty("title");
      expect(result.data).toHaveProperty("service");
    });

    it("should fail for non-existent incident", async () => {
      const result = await service.acknowledgeIncident("NONEXISTENT");

      expectFailure(result, ErrorCodes.NOT_FOUND);
    });
  });

  describe("resolveIncident", () => {
    it("should resolve an incident", async () => {
      const result = await service.resolveIncident("INC001");

      expectSuccess(result);
      expect(result.data?.status).toBe("resolved");
    });

    it("should resolve with resolution message", async () => {
      const result = await service.resolveIncident(
        "INC002",
        "Fixed by scaling up pods",
      );

      expectSuccess(result);
      expect(result.data?.status).toBe("resolved");
    });

    it("should fail for non-existent incident", async () => {
      const result = await service.resolveIncident("NONEXISTENT");

      expectFailure(result, ErrorCodes.NOT_FOUND);
    });
  });

  describe("getServiceHealth", () => {
    it("should return health for all services", async () => {
      const result = await service.getServiceHealth();

      expectSuccess(result);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it("should include incident counts per service", async () => {
      const result = await service.getServiceHealth();

      expectSuccess(result);
      const health = result.data?.[0];
      expect(health).toHaveProperty("activeIncidents");
      expect(health).toHaveProperty("triggeredIncidents");
      expect(health).toHaveProperty("acknowledgedIncidents");
    });

    it("should include service status", async () => {
      const result = await service.getServiceHealth();

      expectSuccess(result);
      const health = result.data?.[0];
      expect(health?.status).toMatch(
        /^(active|warning|critical|maintenance|disabled)$/,
      );
    });

    it("should include on-call users", async () => {
      const result = await service.getServiceHealth();

      expectSuccess(result);
      const health = result.data?.[0];
      expect(Array.isArray(health?.onCallUsers)).toBe(true);
    });
  });

  describe("getOnCallSummary", () => {
    it("should return on-call summary for all policies", async () => {
      const result = await service.getOnCallSummary();

      expectSuccess(result);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it("should include policy details", async () => {
      const result = await service.getOnCallSummary();

      expectSuccess(result);
      const summary = result.data?.[0];
      expect(summary).toHaveProperty("policyId");
      expect(summary).toHaveProperty("policyName");
    });

    it("should include current on-call users", async () => {
      const result = await service.getOnCallSummary();

      expectSuccess(result);
      const summary = result.data?.[0];
      expect(Array.isArray(summary?.currentOnCall)).toBe(true);
    });

    it("should include next escalation users", async () => {
      const result = await service.getOnCallSummary();

      expectSuccess(result);
      const summary = result.data?.[0];
      expect(Array.isArray(summary?.nextEscalation)).toBe(true);
    });
  });

  describe("getIncidentTimeline", () => {
    it("should return incident with timeline", async () => {
      const result = await service.getIncidentTimeline("INC001");

      expectSuccess(result);
      expect(result.data?.incident).toBeTruthy();
      expect(result.data?.incident.id).toBe("INC001");
    });

    it("should include alerts", async () => {
      const result = await service.getIncidentTimeline("INC001");

      expectSuccess(result);
      expect(Array.isArray(result.data?.alerts)).toBe(true);
    });

    it("should include timeline entries", async () => {
      const result = await service.getIncidentTimeline("INC001");

      expectSuccess(result);
      expect(Array.isArray(result.data?.timeline)).toBe(true);
    });

    it("should fail for non-existent incident", async () => {
      const result = await service.getIncidentTimeline("NONEXISTENT");

      expectFailure(result, ErrorCodes.NOT_FOUND);
    });
  });

  describe("createIncident", () => {
    it("should create a new incident", async () => {
      const result = await service.createIncident({
        title: "Test Incident",
        serviceId: "SVC001",
        urgency: "high",
        body: "Test description",
      });

      expectSuccess(result);
      expect(result.data?.title).toBe("Test Incident");
      expect(result.data?.status).toBe("triggered");
    });

    it("should return incident summary", async () => {
      const result = await service.createIncident({
        title: "Test Incident",
        serviceId: "SVC001",
      });

      expectSuccess(result);
      expect(result.data).toHaveProperty("id");
      expect(result.data).toHaveProperty("incidentNumber");
      expect(result.data).toHaveProperty("service");
      expect(result.data).toHaveProperty("ageMinutes");
    });

    it("should fail for non-existent service", async () => {
      const result = await service.createIncident({
        title: "Test Incident",
        serviceId: "NONEXISTENT",
      });

      expectFailure(result, ErrorCodes.NOT_FOUND);
    });
  });

  describe("incident age calculation", () => {
    it("should calculate age in minutes correctly", async () => {
      const result = await service.getActiveIncidents();

      expectSuccess(result);
      const incident = result.data?.incidents[0];
      expect(incident?.ageMinutes).toBeGreaterThanOrEqual(0);
    });
  });
});
