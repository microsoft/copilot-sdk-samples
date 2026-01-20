import { CopilotClient } from "@github/copilot-sdk";
import {
  PagerDutyConnector,
  PagerDutyIncident,
  PagerDutyUser,
  IncidentStatus,
  IncidentUrgency,
} from "../../../shared/connectors/pagerduty/client.js";
import {
  ConnectorResult,
  success,
  failure,
} from "../../../shared/connectors/types.js";

export interface IncidentSummary {
  id: string;
  incidentNumber: number;
  title: string;
  status: IncidentStatus;
  urgency: IncidentUrgency;
  service: string;
  assignees: string[];
  ageMinutes: number;
  priority: string | null;
}

export interface ServiceHealth {
  serviceId: string;
  serviceName: string;
  status: string;
  activeIncidents: number;
  triggeredIncidents: number;
  acknowledgedIncidents: number;
  onCallUsers: string[];
}

export interface OnCallSummary {
  policyId: string;
  policyName: string;
  currentOnCall: PagerDutyUser[];
  nextEscalation: PagerDutyUser[];
}

export interface IncidentAnalysis {
  totalActive: number;
  triggered: number;
  acknowledged: number;
  highUrgency: number;
  lowUrgency: number;
  byService: Map<string, number>;
  oldestUnacknowledged: IncidentSummary | null;
  incidents: IncidentSummary[];
}

export interface IncidentManagementServiceConfig {
  connector: PagerDutyConnector;
  client?: CopilotClient;
}

export class IncidentManagementService {
  private connector: PagerDutyConnector;
  private client?: CopilotClient;

  constructor(config: IncidentManagementServiceConfig) {
    this.connector = config.connector;
    this.client = config.client;
  }

  async getActiveIncidents(): Promise<ConnectorResult<IncidentAnalysis>> {
    const result = await this.connector.listIncidents({
      statuses: ["triggered", "acknowledged"],
    });

    if (!result.success) {
      return failure(result.error!);
    }

    const incidents = result.data!.incidents;
    const summaries = incidents.map((i) => this.toIncidentSummary(i));

    const byService = new Map<string, number>();
    for (const incident of incidents) {
      const serviceName = incident.service.name;
      byService.set(serviceName, (byService.get(serviceName) || 0) + 1);
    }

    const triggeredUnacknowledged = summaries
      .filter((s) => s.status === "triggered")
      .sort((a, b) => b.ageMinutes - a.ageMinutes);

    const analysis: IncidentAnalysis = {
      totalActive: incidents.length,
      triggered: incidents.filter((i) => i.status === "triggered").length,
      acknowledged: incidents.filter((i) => i.status === "acknowledged").length,
      highUrgency: incidents.filter((i) => i.urgency === "high").length,
      lowUrgency: incidents.filter((i) => i.urgency === "low").length,
      byService,
      oldestUnacknowledged: triggeredUnacknowledged[0] || null,
      incidents: summaries,
    };

    return success(analysis);
  }

  async getTriggeredIncidents(): Promise<ConnectorResult<IncidentSummary[]>> {
    const result = await this.connector.listIncidents({
      statuses: ["triggered"],
    });

    if (!result.success) {
      return failure(result.error!);
    }

    return success(
      result.data!.incidents.map((i) => this.toIncidentSummary(i)),
    );
  }

  async getHighUrgencyIncidents(): Promise<ConnectorResult<IncidentSummary[]>> {
    const result = await this.connector.listIncidents({
      statuses: ["triggered", "acknowledged"],
      urgencies: ["high"],
    });

    if (!result.success) {
      return failure(result.error!);
    }

    return success(
      result.data!.incidents.map((i) => this.toIncidentSummary(i)),
    );
  }

  async acknowledgeIncident(
    incidentId: string,
  ): Promise<ConnectorResult<IncidentSummary>> {
    const result = await this.connector.acknowledgeIncident(incidentId);

    if (!result.success) {
      return failure(result.error!);
    }

    return success(this.toIncidentSummary(result.data!));
  }

  async resolveIncident(
    incidentId: string,
    resolution?: string,
  ): Promise<ConnectorResult<IncidentSummary>> {
    const result = await this.connector.resolveIncident(incidentId, resolution);

    if (!result.success) {
      return failure(result.error!);
    }

    return success(this.toIncidentSummary(result.data!));
  }

  async getServiceHealth(): Promise<ConnectorResult<ServiceHealth[]>> {
    const servicesResult = await this.connector.listServices();
    if (!servicesResult.success) {
      return failure(servicesResult.error!);
    }

    const incidentsResult = await this.connector.listIncidents({
      statuses: ["triggered", "acknowledged"],
    });
    if (!incidentsResult.success) {
      return failure(incidentsResult.error!);
    }

    const healthReports: ServiceHealth[] = [];

    for (const service of servicesResult.data!.services) {
      const serviceIncidents = incidentsResult.data!.incidents.filter(
        (i) => i.service.id === service.id,
      );

      const onCallResult = await this.connector.getCurrentOnCall(
        service.escalationPolicy.id,
      );
      const onCallUsers = onCallResult.success
        ? onCallResult.data!.map((u) => u.name)
        : [];

      healthReports.push({
        serviceId: service.id,
        serviceName: service.name,
        status: service.status,
        activeIncidents: serviceIncidents.length,
        triggeredIncidents: serviceIncidents.filter(
          (i) => i.status === "triggered",
        ).length,
        acknowledgedIncidents: serviceIncidents.filter(
          (i) => i.status === "acknowledged",
        ).length,
        onCallUsers,
      });
    }

    return success(healthReports);
  }

  async getOnCallSummary(): Promise<ConnectorResult<OnCallSummary[]>> {
    const policiesResult = await this.connector.listEscalationPolicies();
    if (!policiesResult.success) {
      return failure(policiesResult.error!);
    }

    const summaries: OnCallSummary[] = [];

    for (const policy of policiesResult.data!.escalationPolicies) {
      const currentOnCall: PagerDutyUser[] = [];
      const nextEscalation: PagerDutyUser[] = [];

      if (policy.escalationRules.length > 0) {
        const onCallResult = await this.connector.getCurrentOnCall(policy.id);
        if (onCallResult.success) {
          currentOnCall.push(...onCallResult.data!);
        }

        if (policy.escalationRules.length > 1) {
          const secondRule = policy.escalationRules[1];
          for (const target of secondRule.targets) {
            if (target.type === "user" || target.type === "user_reference") {
              const userResult = await this.connector.getUser(target.id);
              if (userResult.success) {
                nextEscalation.push(userResult.data!);
              }
            }
          }
        }
      }

      summaries.push({
        policyId: policy.id,
        policyName: policy.name,
        currentOnCall,
        nextEscalation,
      });
    }

    return success(summaries);
  }

  async getIncidentTimeline(incidentId: string): Promise<
    ConnectorResult<{
      incident: IncidentSummary;
      alerts: { id: string; severity: string; createdAt: string }[];
      timeline: {
        type: string;
        createdAt: string;
        agent: string;
        note: string | null;
      }[];
    }>
  > {
    const incidentResult = await this.connector.getIncident(incidentId);
    if (!incidentResult.success) {
      return failure(incidentResult.error!);
    }

    const alertsResult = await this.connector.getIncidentAlerts(incidentId);
    const timelineResult = await this.connector.getIncidentTimeline(incidentId);

    const alerts = alertsResult.success
      ? alertsResult.data!.map((a) => ({
          id: a.id,
          severity: a.severity,
          createdAt: a.createdAt,
        }))
      : [];

    const timeline = timelineResult.success
      ? timelineResult.data!.map((l) => ({
          type: l.type,
          createdAt: l.createdAt,
          agent: l.agent.name,
          note: l.note,
        }))
      : [];

    return success({
      incident: this.toIncidentSummary(incidentResult.data!),
      alerts,
      timeline,
    });
  }

  async createIncident(input: {
    title: string;
    serviceId: string;
    urgency?: IncidentUrgency;
    body?: string;
  }): Promise<ConnectorResult<IncidentSummary>> {
    const result = await this.connector.createIncident(input);

    if (!result.success) {
      return failure(result.error!);
    }

    return success(this.toIncidentSummary(result.data!));
  }

  private toIncidentSummary(incident: PagerDutyIncident): IncidentSummary {
    const createdAt = new Date(incident.createdAt);
    const now = new Date();
    const ageMinutes = Math.floor(
      (now.getTime() - createdAt.getTime()) / (1000 * 60),
    );

    return {
      id: incident.id,
      incidentNumber: incident.incidentNumber,
      title: incident.title,
      status: incident.status,
      urgency: incident.urgency,
      service: incident.service.name,
      assignees: incident.assignees.map((a) => a.name),
      ageMinutes,
      priority: incident.priority?.name || null,
    };
  }
}

export function createIncidentManagementService(
  connector: PagerDutyConnector,
  options?: Partial<Omit<IncidentManagementServiceConfig, "connector">>,
): IncidentManagementService {
  return new IncidentManagementService({
    connector,
    ...options,
  });
}
