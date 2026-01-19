import { CopilotClient } from "@github/copilot-sdk";
import {
  DatadogConnector,
  DatadogMonitor,
  DatadogHost,
  DatadogIncident,
  DatadogServiceLevelObjective,
  MonitorState,
} from "../../../shared/connectors/datadog/client.js";
import {
  ConnectorResult,
  success,
  failure,
} from "../../../shared/connectors/types.js";

// ============================================================================
// Types
// ============================================================================

export interface MonitorSummary {
  id: number;
  name: string;
  type: string;
  state: MonitorState;
  priority: number | null;
  tags: string[];
  message: string;
  lastModified: string;
}

export interface HostSummary {
  id: number;
  name: string;
  platform: string;
  cpuCores: number;
  cpuUsage: number;
  load: number;
  isMuted: boolean;
  apps: string[];
  tags: string[];
  uptime: string;
}

export interface SLOSummary {
  id: string;
  name: string;
  type: string;
  targetThreshold: number;
  currentSLI: number;
  errorBudgetRemaining: number;
  status: string;
  timeframe: string;
}

export interface IncidentSummary {
  id: string;
  title: string;
  severity: string;
  state: string;
  created: string;
  customerImpacted: boolean;
  timeToDetect: number | null;
  timeToRepair: number | null;
  rootCause: string | null;
}

export interface MonitoringOverview {
  totalMonitors: number;
  alertingMonitors: number;
  warningMonitors: number;
  okMonitors: number;
  noDataMonitors: number;
  monitors: MonitorSummary[];
}

export interface HostHealthReport {
  totalHosts: number;
  healthyHosts: number;
  unhealthyHosts: number;
  mutedHosts: number;
  highCpuHosts: HostSummary[];
  hosts: HostSummary[];
}

export interface SLOComplianceReport {
  totalSLOs: number;
  compliantSLOs: number;
  breachedSLOs: number;
  warningSLOs: number;
  slos: SLOSummary[];
}

export interface IncidentReport {
  totalIncidents: number;
  activeIncidents: number;
  resolvedIncidents: number;
  bySeverity: Map<string, number>;
  incidents: IncidentSummary[];
}

export interface MonitoringServiceConfig {
  connector: DatadogConnector;
  client?: CopilotClient;
  cpuThreshold?: number;
}

// ============================================================================
// Monitoring Service Implementation
// ============================================================================

export class MonitoringService {
  private connector: DatadogConnector;
  private client?: CopilotClient;
  private cpuThreshold: number;

  constructor(config: MonitoringServiceConfig) {
    this.connector = config.connector;
    this.client = config.client;
    this.cpuThreshold = config.cpuThreshold ?? 70;
  }

  /**
   * Get overview of all monitors and their states
   */
  async getMonitoringOverview(): Promise<ConnectorResult<MonitoringOverview>> {
    const result = await this.connector.listMonitors();

    if (!result.success) {
      return failure(result.error!);
    }

    const monitors = result.data!.monitors;
    const summaries = monitors.map((m) => this.toMonitorSummary(m));

    const overview: MonitoringOverview = {
      totalMonitors: monitors.length,
      alertingMonitors: monitors.filter((m) => m.overallState === "Alert")
        .length,
      warningMonitors: monitors.filter((m) => m.overallState === "Warn").length,
      okMonitors: monitors.filter((m) => m.overallState === "OK").length,
      noDataMonitors: monitors.filter((m) => m.overallState === "No Data")
        .length,
      monitors: summaries,
    };

    return success(overview);
  }

  /**
   * Get monitors in alerting or warning state
   */
  async getAlertingMonitors(): Promise<ConnectorResult<MonitorSummary[]>> {
    const result = await this.connector.listMonitors({
      groupStates: ["Alert", "Warn"],
    });

    if (!result.success) {
      return failure(result.error!);
    }

    return success(result.data!.monitors.map((m) => this.toMonitorSummary(m)));
  }

  /**
   * Get monitors with no data (potentially broken)
   */
  async getNoDataMonitors(): Promise<ConnectorResult<MonitorSummary[]>> {
    const result = await this.connector.listMonitors({
      groupStates: ["No Data"],
    });

    if (!result.success) {
      return failure(result.error!);
    }

    return success(result.data!.monitors.map((m) => this.toMonitorSummary(m)));
  }

  /**
   * Get health report for all hosts
   */
  async getHostHealthReport(): Promise<ConnectorResult<HostHealthReport>> {
    const result = await this.connector.listHosts();

    if (!result.success) {
      return failure(result.error!);
    }

    const hosts = result.data!.hosts;
    const summaries = hosts.map((h) => this.toHostSummary(h));
    const highCpuHosts = summaries.filter(
      (h) => h.cpuUsage >= this.cpuThreshold,
    );

    const report: HostHealthReport = {
      totalHosts: hosts.length,
      healthyHosts: summaries.filter(
        (h) => h.cpuUsage < this.cpuThreshold && !h.isMuted,
      ).length,
      unhealthyHosts: highCpuHosts.length,
      mutedHosts: summaries.filter((h) => h.isMuted).length,
      highCpuHosts,
      hosts: summaries,
    };

    return success(report);
  }

  /**
   * Get hosts with high CPU usage
   */
  async getHighCpuHosts(): Promise<ConnectorResult<HostSummary[]>> {
    const result = await this.connector.listHosts();

    if (!result.success) {
      return failure(result.error!);
    }

    const summaries = result
      .data!.hosts.map((h) => this.toHostSummary(h))
      .filter((h) => h.cpuUsage >= this.cpuThreshold)
      .sort((a, b) => b.cpuUsage - a.cpuUsage);

    return success(summaries);
  }

  /**
   * Get SLO compliance report
   */
  async getSLOComplianceReport(): Promise<
    ConnectorResult<SLOComplianceReport>
  > {
    const result = await this.connector.listSLOs();

    if (!result.success) {
      return failure(result.error!);
    }

    const slos = result.data!.slos;
    const summaries = slos.map((s) => this.toSLOSummary(s));

    const report: SLOComplianceReport = {
      totalSLOs: slos.length,
      compliantSLOs: summaries.filter((s) => s.status === "OK").length,
      breachedSLOs: summaries.filter((s) => s.status === "Breached").length,
      warningSLOs: summaries.filter((s) => s.status === "Warning").length,
      slos: summaries,
    };

    return success(report);
  }

  /**
   * Get breached SLOs that need attention
   */
  async getBreachedSLOs(): Promise<ConnectorResult<SLOSummary[]>> {
    const result = await this.connector.listSLOs();

    if (!result.success) {
      return failure(result.error!);
    }

    const breached = result
      .data!.slos.map((s) => this.toSLOSummary(s))
      .filter((s) => s.status === "Breached" || s.errorBudgetRemaining < 0);

    return success(breached);
  }

  /**
   * Get incident report
   */
  async getIncidentReport(): Promise<ConnectorResult<IncidentReport>> {
    const result = await this.connector.listIncidents();

    if (!result.success) {
      return failure(result.error!);
    }

    const incidents = result.data!.incidents;
    const summaries = incidents.map((i) => this.toIncidentSummary(i));

    const bySeverity = new Map<string, number>();
    for (const incident of incidents) {
      const severity = incident.severity;
      bySeverity.set(severity, (bySeverity.get(severity) || 0) + 1);
    }

    const report: IncidentReport = {
      totalIncidents: incidents.length,
      activeIncidents: incidents.filter((i) => i.state === "active").length,
      resolvedIncidents: incidents.filter((i) => i.state === "resolved").length,
      bySeverity,
      incidents: summaries,
    };

    return success(report);
  }

  /**
   * Get active incidents
   */
  async getActiveIncidents(): Promise<ConnectorResult<IncidentSummary[]>> {
    const result = await this.connector.listIncidents();

    if (!result.success) {
      return failure(result.error!);
    }

    const active = result
      .data!.incidents.filter(
        (i) => i.state === "active" || i.state === "stable",
      )
      .map((i) => this.toIncidentSummary(i));

    return success(active);
  }

  /**
   * Create a new monitor
   */
  async createMonitor(input: {
    name: string;
    query: string;
    message: string;
    type?: "metric alert" | "query alert";
    tags?: string[];
    priority?: number;
    thresholds?: { critical?: number; warning?: number };
  }): Promise<ConnectorResult<MonitorSummary>> {
    const result = await this.connector.createMonitor({
      name: input.name,
      type: input.type || "metric alert",
      query: input.query,
      message: input.message,
      tags: input.tags,
      priority: input.priority,
      thresholds: input.thresholds,
    });

    if (!result.success) {
      return failure(result.error!);
    }

    return success(this.toMonitorSummary(result.data!));
  }

  /**
   * Mute a host (suppress alerts)
   */
  async muteHost(
    hostname: string,
    options?: { message?: string; durationMinutes?: number },
  ): Promise<ConnectorResult<void>> {
    const endTimestamp = options?.durationMinutes
      ? Date.now() + options.durationMinutes * 60 * 1000
      : undefined;

    return this.connector.muteHost(hostname, {
      message: options?.message,
      endTimestamp,
    });
  }

  /**
   * Unmute a host
   */
  async unmuteHost(hostname: string): Promise<ConnectorResult<void>> {
    return this.connector.unmuteHost(hostname);
  }

  /**
   * Get a specific monitor by ID
   */
  async getMonitor(
    monitorId: number,
  ): Promise<ConnectorResult<MonitorSummary>> {
    const result = await this.connector.getMonitor(monitorId);

    if (!result.success) {
      return failure(result.error!);
    }

    return success(this.toMonitorSummary(result.data!));
  }

  /**
   * Mute a monitor (suppress alerts)
   */
  async muteMonitor(
    monitorId: number,
    options?: { scope?: string; durationMinutes?: number },
  ): Promise<ConnectorResult<MonitorSummary>> {
    const endTimestamp = options?.durationMinutes
      ? Date.now() + options.durationMinutes * 60 * 1000
      : undefined;

    const result = await this.connector.muteMonitor(monitorId, {
      scope: options?.scope,
      endTimestamp,
    });

    if (!result.success) {
      return failure(result.error!);
    }

    return success(this.toMonitorSummary(result.data!));
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private toMonitorSummary(monitor: DatadogMonitor): MonitorSummary {
    return {
      id: monitor.id,
      name: monitor.name,
      type: monitor.type,
      state: monitor.overallState,
      priority: monitor.priority,
      tags: monitor.tags,
      message: monitor.message,
      lastModified: monitor.modified,
    };
  }

  private toHostSummary(host: DatadogHost): HostSummary {
    const upSinceDate = new Date(host.upSince * 1000);
    const now = new Date();
    const uptimeMs = now.getTime() - upSinceDate.getTime();
    const uptimeHours = Math.floor(uptimeMs / (1000 * 60 * 60));
    const uptimeDays = Math.floor(uptimeHours / 24);
    const remainingHours = uptimeHours % 24;

    let uptime: string;
    if (uptimeDays > 0) {
      uptime =
        remainingHours > 0
          ? `${uptimeDays}d ${remainingHours}h`
          : `${uptimeDays}d`;
    } else {
      uptime = `${uptimeHours}h`;
    }

    return {
      id: host.id,
      name: host.name,
      platform: host.meta.platform,
      cpuCores: host.meta.cpuCores,
      cpuUsage: host.metrics.cpu,
      load: host.metrics.load,
      isMuted: host.isMuted,
      apps: host.apps,
      tags: host.tags,
      uptime,
    };
  }

  private toSLOSummary(slo: DatadogServiceLevelObjective): SLOSummary {
    const latestStatus = slo.overallStatus[0] || {
      sliValue: 0,
      errorBudgetRemaining: 0,
      status: "No Data",
    };

    return {
      id: slo.id,
      name: slo.name,
      type: slo.type,
      targetThreshold: slo.targetThreshold,
      currentSLI: latestStatus.sliValue,
      errorBudgetRemaining: latestStatus.errorBudgetRemaining,
      status: latestStatus.status,
      timeframe: slo.timeframe,
    };
  }

  private toIncidentSummary(incident: DatadogIncident): IncidentSummary {
    return {
      id: incident.id,
      title: incident.title,
      severity: incident.severity,
      state: incident.state,
      created: incident.created,
      customerImpacted: incident.customerImpacted,
      timeToDetect: incident.timeToDetect,
      timeToRepair: incident.timeToRepair,
      rootCause: incident.fields.root_cause || null,
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createMonitoringService(
  connector: DatadogConnector,
  options?: Partial<Omit<MonitoringServiceConfig, "connector">>,
): MonitoringService {
  return new MonitoringService({
    connector,
    ...options,
  });
}
