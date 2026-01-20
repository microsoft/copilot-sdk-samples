import {
  BaseConnector,
  BaseConnectorConfig,
  ConnectorResult,
  HealthCheckResponse,
  success,
  failure,
  ErrorCodes,
} from "../types.js";

// ============================================================================
// Datadog Types
// ============================================================================

export type MetricType = "gauge" | "count" | "rate" | "distribution";
export type MonitorState =
  | "OK"
  | "Alert"
  | "Warn"
  | "No Data"
  | "Unknown"
  | "Skipped";
export type MonitorType =
  | "metric alert"
  | "service check"
  | "event alert"
  | "query alert"
  | "composite"
  | "log alert"
  | "trace-analytics alert"
  | "rum alert"
  | "apm-anomaly";

export interface DatadogMetric {
  name: string;
  type: MetricType;
  description: string;
  unit: string | null;
  tags: string[];
  host: string | null;
}

export interface DatadogMetricPoint {
  timestamp: number;
  value: number;
}

export interface DatadogMetricSeries {
  metric: string;
  tags: string[];
  host: string | null;
  points: DatadogMetricPoint[];
  unit: string | null;
}

export interface DatadogMonitor {
  id: number;
  name: string;
  type: MonitorType;
  query: string;
  message: string;
  tags: string[];
  priority: number | null;
  overallState: MonitorState;
  created: string;
  modified: string;
  creator: DatadogUser;
  options: DatadogMonitorOptions;
  thresholds: DatadogMonitorThresholds | null;
}

export interface DatadogMonitorOptions {
  notifyNoData: boolean;
  noDataTimeframe: number | null;
  notifyAudit: boolean;
  timeoutH: number | null;
  renotifyInterval: number | null;
  escalationMessage: string | null;
  includeTags: boolean;
  requireFullWindow: boolean;
}

export interface DatadogMonitorThresholds {
  critical?: number;
  warning?: number;
  ok?: number;
  criticalRecovery?: number;
  warningRecovery?: number;
}

export interface DatadogUser {
  id: string;
  name: string;
  email: string;
  handle: string;
}

export interface DatadogDashboard {
  id: string;
  title: string;
  description: string | null;
  layoutType: "ordered" | "free";
  isReadOnly: boolean;
  createdAt: string;
  modifiedAt: string;
  author: DatadogUser;
  url: string;
  widgets: DatadogWidget[];
}

export interface DatadogWidget {
  id: number;
  title: string | null;
  type: string;
  definition: Record<string, unknown>;
}

export interface DatadogHost {
  id: number;
  name: string;
  aliases: string[];
  apps: string[];
  isMuted: boolean;
  lastReportedTime: number;
  meta: {
    platform: string;
    cpuCores: number;
    gohai: Record<string, unknown> | null;
  };
  metrics: {
    cpu: number;
    iowait: number;
    load: number;
  };
  sources: string[];
  tags: string[];
  upSince: number;
}

export interface DatadogEvent {
  id: number;
  title: string;
  text: string;
  dateHappened: number;
  host: string | null;
  tags: string[];
  priority: "normal" | "low";
  alertType: "error" | "warning" | "info" | "success" | "user_update";
  source: string;
  url: string;
}

export interface DatadogServiceLevelObjective {
  id: string;
  name: string;
  description: string | null;
  type: "metric" | "monitor" | "time_slice";
  tags: string[];
  targetThreshold: number;
  warningThreshold: number | null;
  timeframe: "7d" | "30d" | "90d" | "custom";
  creator: DatadogUser;
  createdAt: string;
  modifiedAt: string;
  overallStatus: DatadogSLOStatus[];
}

export interface DatadogSLOStatus {
  sliValue: number;
  targetThreshold: number;
  timeframe: string;
  errorBudgetRemaining: number;
  status: "OK" | "Breached" | "Warning" | "No Data";
}

export interface DatadogIncident {
  id: string;
  title: string;
  severity: "SEV-1" | "SEV-2" | "SEV-3" | "SEV-4" | "SEV-5" | "UNKNOWN";
  state: "active" | "stable" | "resolved";
  created: string;
  modified: string;
  resolved: string | null;
  customerImpactScope: string | null;
  customerImpacted: boolean;
  timeToDetect: number | null;
  timeToRepair: number | null;
  commander: DatadogUser | null;
  fields: Record<string, string>;
}

export interface DatadogLogQuery {
  query: string;
  from: string;
  to: string;
  indexes: string[];
}

export interface DatadogLog {
  id: string;
  content: {
    timestamp: string;
    host: string;
    service: string;
    status: "info" | "warn" | "error" | "debug";
    message: string;
    attributes: Record<string, unknown>;
    tags: string[];
  };
}

// ============================================================================
// Connector Configuration
// ============================================================================

export interface DatadogConnectorConfig extends BaseConnectorConfig {
  /** Datadog API key */
  apiKey?: string;
  /** Datadog Application key */
  appKey?: string;
  /** Datadog site (e.g., datadoghq.com, datadoghq.eu) */
  site?: string;
}

// ============================================================================
// Connector Interface
// ============================================================================

export interface DatadogConnector extends BaseConnector {
  // Metric operations
  listMetrics(options?: {
    query?: string;
    from?: number;
  }): Promise<ConnectorResult<DatadogMetric[]>>;

  queryMetrics(options: {
    query: string;
    from: number;
    to: number;
  }): Promise<ConnectorResult<DatadogMetricSeries[]>>;

  submitMetrics(
    series: Array<{
      metric: string;
      type: MetricType;
      points: Array<{ timestamp: number; value: number }>;
      tags?: string[];
      host?: string;
    }>,
  ): Promise<ConnectorResult<void>>;

  // Monitor operations
  listMonitors(options?: {
    groupStates?: MonitorState[];
    name?: string;
    tags?: string[];
    monitorTags?: string[];
    limit?: number;
    page?: number;
  }): Promise<ConnectorResult<{ monitors: DatadogMonitor[]; total: number }>>;

  getMonitor(monitorId: number): Promise<ConnectorResult<DatadogMonitor>>;

  createMonitor(input: {
    name: string;
    type: MonitorType;
    query: string;
    message: string;
    tags?: string[];
    priority?: number;
    options?: Partial<DatadogMonitorOptions>;
    thresholds?: DatadogMonitorThresholds;
  }): Promise<ConnectorResult<DatadogMonitor>>;

  updateMonitor(
    monitorId: number,
    input: {
      name?: string;
      query?: string;
      message?: string;
      tags?: string[];
      priority?: number;
      options?: Partial<DatadogMonitorOptions>;
      thresholds?: DatadogMonitorThresholds;
    },
  ): Promise<ConnectorResult<DatadogMonitor>>;

  deleteMonitor(monitorId: number): Promise<ConnectorResult<void>>;

  muteMonitor(
    monitorId: number,
    options?: { scope?: string; endTimestamp?: number },
  ): Promise<ConnectorResult<DatadogMonitor>>;

  unmuteMonitor(
    monitorId: number,
    options?: { scope?: string },
  ): Promise<ConnectorResult<DatadogMonitor>>;

  // Dashboard operations
  listDashboards(options?: {
    filterShared?: boolean;
    filterDeleted?: boolean;
    limit?: number;
    page?: number;
  }): Promise<
    ConnectorResult<{ dashboards: DatadogDashboard[]; total: number }>
  >;

  getDashboard(dashboardId: string): Promise<ConnectorResult<DatadogDashboard>>;

  // Host operations
  listHosts(options?: {
    filter?: string;
    sortField?: string;
    sortDir?: "asc" | "desc";
    from?: number;
    limit?: number;
  }): Promise<ConnectorResult<{ hosts: DatadogHost[]; total: number }>>;

  muteHost(
    hostname: string,
    options?: { message?: string; endTimestamp?: number },
  ): Promise<ConnectorResult<void>>;

  unmuteHost(hostname: string): Promise<ConnectorResult<void>>;

  // Event operations
  listEvents(options: {
    start: number;
    end: number;
    priority?: "normal" | "low";
    tags?: string[];
    sources?: string[];
  }): Promise<ConnectorResult<DatadogEvent[]>>;

  createEvent(input: {
    title: string;
    text: string;
    priority?: "normal" | "low";
    alertType?: "error" | "warning" | "info" | "success";
    tags?: string[];
    host?: string;
  }): Promise<ConnectorResult<DatadogEvent>>;

  // SLO operations
  listSLOs(options?: {
    ids?: string[];
    query?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<
    ConnectorResult<{ slos: DatadogServiceLevelObjective[]; total: number }>
  >;

  getSLO(sloId: string): Promise<ConnectorResult<DatadogServiceLevelObjective>>;

  // Incident operations
  listIncidents(options?: {
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<ConnectorResult<{ incidents: DatadogIncident[]; total: number }>>;

  getIncident(incidentId: string): Promise<ConnectorResult<DatadogIncident>>;

  // Log operations
  queryLogs(
    query: DatadogLogQuery,
  ): Promise<
    ConnectorResult<{ logs: DatadogLog[]; nextCursor: string | null }>
  >;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createDatadogConnector(
  config: DatadogConnectorConfig,
): DatadogConnector {
  if (config.mode === "mock") {
    return new MockDatadogConnector(config);
  }
  return new LiveDatadogConnector(config);
}

// ============================================================================
// Mock Implementation
// ============================================================================

class MockDatadogConnector implements DatadogConnector {
  readonly name = "datadog";
  readonly mode = "mock" as const;
  private _isInitialized = false;

  private metrics: DatadogMetric[] = [];
  private monitors: DatadogMonitor[] = [];
  private dashboards: DatadogDashboard[] = [];
  private hosts: DatadogHost[] = [];
  private events: DatadogEvent[] = [];
  private slos: DatadogServiceLevelObjective[] = [];
  private incidents: DatadogIncident[] = [];
  private logs: DatadogLog[] = [];
  private nextMonitorId = 1;
  private nextEventId = 1;

  constructor(private config: DatadogConnectorConfig) {
    this.seedMockData();
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  private seedMockData(): void {
    const now = Date.now();
    const hourAgo = now - 60 * 60 * 1000;
    const dayAgo = now - 24 * 60 * 60 * 1000;

    const user: DatadogUser = {
      id: "user-001",
      name: "Alice Engineer",
      email: "alice@example.com",
      handle: "alice.engineer",
    };

    // Metrics
    this.metrics = [
      {
        name: "system.cpu.user",
        type: "gauge",
        description: "User CPU utilization",
        unit: "percent",
        tags: ["env:production"],
        host: null,
      },
      {
        name: "system.mem.used",
        type: "gauge",
        description: "Memory usage",
        unit: "byte",
        tags: ["env:production"],
        host: null,
      },
      {
        name: "system.load.1",
        type: "gauge",
        description: "System load (1 minute)",
        unit: null,
        tags: ["env:production"],
        host: null,
      },
      {
        name: "app.request.count",
        type: "count",
        description: "Request count",
        unit: "request",
        tags: ["service:api-gateway"],
        host: null,
      },
      {
        name: "app.request.latency",
        type: "distribution",
        description: "Request latency",
        unit: "millisecond",
        tags: ["service:api-gateway"],
        host: null,
      },
      {
        name: "app.error.rate",
        type: "rate",
        description: "Error rate",
        unit: "error/second",
        tags: ["service:api-gateway"],
        host: null,
      },
    ];

    // Monitors
    this.monitors = [
      {
        id: 1,
        name: "High CPU Usage",
        type: "metric alert",
        query: "avg(last_5m):avg:system.cpu.user{*} > 80",
        message:
          "CPU usage is above 80% on {{host.name}}. @slack-alerts @pagerduty-oncall",
        tags: ["env:production", "team:platform"],
        priority: 1,
        overallState: "Alert",
        created: new Date(dayAgo).toISOString(),
        modified: new Date(hourAgo).toISOString(),
        creator: user,
        options: {
          notifyNoData: true,
          noDataTimeframe: 10,
          notifyAudit: false,
          timeoutH: null,
          renotifyInterval: 30,
          escalationMessage: "Still alerting after 30 minutes",
          includeTags: true,
          requireFullWindow: false,
        },
        thresholds: { critical: 80, warning: 70 },
      },
      {
        id: 2,
        name: "Memory Usage Warning",
        type: "metric alert",
        query:
          "avg(last_5m):avg:system.mem.used{*} / avg:system.mem.total{*} * 100 > 85",
        message: "Memory usage exceeds 85% on {{host.name}}. @slack-alerts",
        tags: ["env:production", "team:platform"],
        priority: 2,
        overallState: "Warn",
        created: new Date(dayAgo).toISOString(),
        modified: new Date(dayAgo).toISOString(),
        creator: user,
        options: {
          notifyNoData: true,
          noDataTimeframe: 10,
          notifyAudit: false,
          timeoutH: null,
          renotifyInterval: 60,
          escalationMessage: null,
          includeTags: true,
          requireFullWindow: false,
        },
        thresholds: { critical: 90, warning: 85 },
      },
      {
        id: 3,
        name: "API Gateway Error Rate",
        type: "metric alert",
        query: "avg(last_5m):sum:app.error.rate{service:api-gateway} > 0.05",
        message:
          "Error rate exceeds 5% for API Gateway. @slack-alerts @pagerduty-oncall",
        tags: ["service:api-gateway", "team:backend"],
        priority: 1,
        overallState: "OK",
        created: new Date(dayAgo).toISOString(),
        modified: new Date(dayAgo).toISOString(),
        creator: user,
        options: {
          notifyNoData: false,
          noDataTimeframe: null,
          notifyAudit: false,
          timeoutH: null,
          renotifyInterval: 15,
          escalationMessage: "Error rate still elevated",
          includeTags: true,
          requireFullWindow: true,
        },
        thresholds: { critical: 0.05, warning: 0.02 },
      },
      {
        id: 4,
        name: "API Latency P99",
        type: "query alert",
        query:
          "percentile(last_5m):p99:app.request.latency{service:api-gateway} > 500",
        message: "P99 latency exceeds 500ms. @slack-alerts",
        tags: ["service:api-gateway", "team:backend"],
        priority: 2,
        overallState: "OK",
        created: new Date(dayAgo).toISOString(),
        modified: new Date(dayAgo).toISOString(),
        creator: user,
        options: {
          notifyNoData: false,
          noDataTimeframe: null,
          notifyAudit: false,
          timeoutH: null,
          renotifyInterval: 30,
          escalationMessage: null,
          includeTags: true,
          requireFullWindow: false,
        },
        thresholds: { critical: 500, warning: 300 },
      },
      {
        id: 5,
        name: "Database Connection Pool",
        type: "metric alert",
        query:
          "avg(last_5m):avg:db.pool.active{*} / avg:db.pool.max{*} * 100 > 80",
        message: "Database connection pool usage high. @slack-alerts",
        tags: ["service:database", "team:platform"],
        priority: 2,
        overallState: "No Data",
        created: new Date(dayAgo).toISOString(),
        modified: new Date(dayAgo).toISOString(),
        creator: user,
        options: {
          notifyNoData: true,
          noDataTimeframe: 5,
          notifyAudit: false,
          timeoutH: null,
          renotifyInterval: null,
          escalationMessage: null,
          includeTags: true,
          requireFullWindow: false,
        },
        thresholds: { critical: 90, warning: 80 },
      },
    ];
    this.nextMonitorId = 6;

    // Dashboards
    this.dashboards = [
      {
        id: "dash-001",
        title: "Infrastructure Overview",
        description: "High-level view of all infrastructure metrics",
        layoutType: "ordered",
        isReadOnly: false,
        createdAt: new Date(dayAgo).toISOString(),
        modifiedAt: new Date(hourAgo).toISOString(),
        author: user,
        url: "https://app.datadoghq.com/dashboard/dash-001",
        widgets: [
          { id: 1, title: "CPU Usage", type: "timeseries", definition: {} },
          { id: 2, title: "Memory Usage", type: "timeseries", definition: {} },
          { id: 3, title: "Network I/O", type: "timeseries", definition: {} },
        ],
      },
      {
        id: "dash-002",
        title: "API Gateway Performance",
        description: "Request metrics and error rates for API Gateway",
        layoutType: "ordered",
        isReadOnly: false,
        createdAt: new Date(dayAgo).toISOString(),
        modifiedAt: new Date(dayAgo).toISOString(),
        author: user,
        url: "https://app.datadoghq.com/dashboard/dash-002",
        widgets: [
          {
            id: 1,
            title: "Request Rate",
            type: "timeseries",
            definition: {},
          },
          { id: 2, title: "Error Rate", type: "timeseries", definition: {} },
          {
            id: 3,
            title: "Latency Distribution",
            type: "distribution",
            definition: {},
          },
        ],
      },
      {
        id: "dash-003",
        title: "Database Metrics",
        description: "PostgreSQL performance and connection metrics",
        layoutType: "ordered",
        isReadOnly: true,
        createdAt: new Date(dayAgo).toISOString(),
        modifiedAt: new Date(dayAgo).toISOString(),
        author: user,
        url: "https://app.datadoghq.com/dashboard/dash-003",
        widgets: [
          {
            id: 1,
            title: "Query Performance",
            type: "timeseries",
            definition: {},
          },
          {
            id: 2,
            title: "Connection Pool",
            type: "timeseries",
            definition: {},
          },
        ],
      },
    ];

    // Hosts
    this.hosts = [
      {
        id: 1,
        name: "api-server-1",
        aliases: ["ip-10-0-1-101"],
        apps: ["nginx", "nodejs"],
        isMuted: false,
        lastReportedTime: now / 1000,
        meta: { platform: "linux", cpuCores: 8, gohai: null },
        metrics: { cpu: 72, iowait: 5, load: 3.2 },
        sources: ["datadog-agent"],
        tags: ["env:production", "role:api", "region:us-east-1"],
        upSince: dayAgo / 1000,
      },
      {
        id: 2,
        name: "api-server-2",
        aliases: ["ip-10-0-1-102"],
        apps: ["nginx", "nodejs"],
        isMuted: false,
        lastReportedTime: now / 1000,
        meta: { platform: "linux", cpuCores: 8, gohai: null },
        metrics: { cpu: 45, iowait: 2, load: 1.8 },
        sources: ["datadog-agent"],
        tags: ["env:production", "role:api", "region:us-east-1"],
        upSince: dayAgo / 1000,
      },
      {
        id: 3,
        name: "db-primary",
        aliases: ["ip-10-0-2-50"],
        apps: ["postgresql"],
        isMuted: false,
        lastReportedTime: now / 1000,
        meta: { platform: "linux", cpuCores: 16, gohai: null },
        metrics: { cpu: 35, iowait: 15, load: 2.1 },
        sources: ["datadog-agent"],
        tags: ["env:production", "role:database", "region:us-east-1"],
        upSince: dayAgo / 1000,
      },
      {
        id: 4,
        name: "worker-1",
        aliases: ["ip-10-0-3-20"],
        apps: ["nodejs"],
        isMuted: true,
        lastReportedTime: hourAgo / 1000,
        meta: { platform: "linux", cpuCores: 4, gohai: null },
        metrics: { cpu: 88, iowait: 1, load: 3.9 },
        sources: ["datadog-agent"],
        tags: ["env:production", "role:worker", "region:us-east-1"],
        upSince: dayAgo / 1000,
      },
    ];

    // Events
    this.events = [
      {
        id: 1,
        title: "Deployment: api-gateway v2.3.0",
        text: "Deployed version 2.3.0 of api-gateway to production",
        dateHappened: hourAgo / 1000,
        host: "api-server-1",
        tags: ["deployment", "service:api-gateway", "env:production"],
        priority: "normal",
        alertType: "info",
        source: "deployment-bot",
        url: "https://app.datadoghq.com/event/1",
      },
      {
        id: 2,
        title: "Alert: High CPU Usage on api-server-1",
        text: "CPU usage exceeded 80% threshold",
        dateHappened: (now - 30 * 60 * 1000) / 1000,
        host: "api-server-1",
        tags: ["alert", "monitor:1", "env:production"],
        priority: "normal",
        alertType: "error",
        source: "monitor",
        url: "https://app.datadoghq.com/event/2",
      },
      {
        id: 3,
        title: "Config change: Updated nginx.conf",
        text: "Modified rate limiting configuration",
        dateHappened: (now - 2 * 60 * 60 * 1000) / 1000,
        host: "api-server-1",
        tags: ["config-change", "service:nginx"],
        priority: "low",
        alertType: "info",
        source: "config-management",
        url: "https://app.datadoghq.com/event/3",
      },
    ];
    this.nextEventId = 4;

    // SLOs
    this.slos = [
      {
        id: "slo-001",
        name: "API Gateway Availability",
        description: "99.9% availability for API Gateway",
        type: "monitor",
        tags: ["service:api-gateway", "team:backend"],
        targetThreshold: 99.9,
        warningThreshold: 99.95,
        timeframe: "30d",
        creator: user,
        createdAt: new Date(dayAgo).toISOString(),
        modifiedAt: new Date(dayAgo).toISOString(),
        overallStatus: [
          {
            sliValue: 99.92,
            targetThreshold: 99.9,
            timeframe: "30d",
            errorBudgetRemaining: 20,
            status: "OK",
          },
        ],
      },
      {
        id: "slo-002",
        name: "API Latency P99 < 500ms",
        description: "99th percentile latency under 500ms",
        type: "metric",
        tags: ["service:api-gateway", "team:backend"],
        targetThreshold: 99.0,
        warningThreshold: 99.5,
        timeframe: "7d",
        creator: user,
        createdAt: new Date(dayAgo).toISOString(),
        modifiedAt: new Date(dayAgo).toISOString(),
        overallStatus: [
          {
            sliValue: 98.5,
            targetThreshold: 99.0,
            timeframe: "7d",
            errorBudgetRemaining: -50,
            status: "Breached",
          },
        ],
      },
    ];

    // Incidents
    this.incidents = [
      {
        id: "inc-001",
        title: "API Gateway 503 errors",
        severity: "SEV-2",
        state: "active",
        created: new Date(hourAgo).toISOString(),
        modified: new Date(now).toISOString(),
        resolved: null,
        customerImpactScope: "5% of users affected",
        customerImpacted: true,
        timeToDetect: 5,
        timeToRepair: null,
        commander: user,
        fields: {
          root_cause: "High CPU on api-server-1",
          mitigation: "Scaling up instances",
        },
      },
      {
        id: "inc-002",
        title: "Elevated database latency",
        severity: "SEV-3",
        state: "resolved",
        created: new Date(dayAgo).toISOString(),
        modified: new Date(dayAgo + 2 * 60 * 60 * 1000).toISOString(),
        resolved: new Date(dayAgo + 2 * 60 * 60 * 1000).toISOString(),
        customerImpactScope: null,
        customerImpacted: false,
        timeToDetect: 3,
        timeToRepair: 120,
        commander: user,
        fields: {
          root_cause: "Connection pool exhaustion",
          mitigation: "Increased pool size",
        },
      },
    ];

    // Logs
    this.logs = [
      {
        id: "log-001",
        content: {
          timestamp: new Date(now - 1000).toISOString(),
          host: "api-server-1",
          service: "api-gateway",
          status: "error",
          message: "Connection refused to upstream service",
          attributes: { upstream: "user-service:8080", retries: 3 },
          tags: ["env:production"],
        },
      },
      {
        id: "log-002",
        content: {
          timestamp: new Date(now - 2000).toISOString(),
          host: "api-server-1",
          service: "api-gateway",
          status: "warn",
          message: "Request timeout exceeded",
          attributes: { endpoint: "/api/v1/users", timeout_ms: 5000 },
          tags: ["env:production"],
        },
      },
      {
        id: "log-003",
        content: {
          timestamp: new Date(now - 3000).toISOString(),
          host: "api-server-2",
          service: "api-gateway",
          status: "info",
          message: "Request processed successfully",
          attributes: { endpoint: "/api/v1/health", status_code: 200 },
          tags: ["env:production"],
        },
      },
    ];
  }

  async initialize(): Promise<ConnectorResult<void>> {
    this._isInitialized = true;
    return success(undefined);
  }

  async dispose(): Promise<void> {
    this._isInitialized = false;
  }

  async healthCheck(): Promise<ConnectorResult<HealthCheckResponse>> {
    return success({
      healthy: true,
      version: "mock-v1",
      details: {
        mode: "mock",
        monitorCount: this.monitors.length,
        hostCount: this.hosts.length,
        dashboardCount: this.dashboards.length,
      },
    });
  }

  // Metric operations
  async listMetrics(options?: {
    query?: string;
    from?: number;
  }): Promise<ConnectorResult<DatadogMetric[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    let filtered = [...this.metrics];
    if (options?.query) {
      const q = options.query.toLowerCase();
      filtered = filtered.filter(
        (m) =>
          m.name.toLowerCase().includes(q) ||
          m.description.toLowerCase().includes(q),
      );
    }

    return success(filtered);
  }

  async queryMetrics(options: {
    query: string;
    from: number;
    to: number;
  }): Promise<ConnectorResult<DatadogMetricSeries[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    // Generate mock time series data
    const numPoints = Math.min(
      100,
      Math.floor((options.to - options.from) / 60000),
    );
    const points: DatadogMetricPoint[] = [];
    for (let i = 0; i < numPoints; i++) {
      points.push({
        timestamp: options.from + i * 60000,
        value: Math.random() * 100,
      });
    }

    return success([
      {
        metric: options.query.split("{")[0] || "system.cpu.user",
        tags: ["env:production"],
        host: "api-server-1",
        points,
        unit: "percent",
      },
    ]);
  }

  async submitMetrics(
    _series: Array<{
      metric: string;
      type: MetricType;
      points: Array<{ timestamp: number; value: number }>;
      tags?: string[];
      host?: string;
    }>,
  ): Promise<ConnectorResult<void>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    // In mock mode, just accept the metrics
    return success(undefined);
  }

  // Monitor operations
  async listMonitors(options?: {
    groupStates?: MonitorState[];
    name?: string;
    tags?: string[];
    monitorTags?: string[];
    limit?: number;
    page?: number;
  }): Promise<ConnectorResult<{ monitors: DatadogMonitor[]; total: number }>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    let filtered = [...this.monitors];

    if (options?.groupStates?.length) {
      filtered = filtered.filter((m) =>
        options.groupStates!.includes(m.overallState),
      );
    }
    if (options?.name) {
      const n = options.name.toLowerCase();
      filtered = filtered.filter((m) => m.name.toLowerCase().includes(n));
    }
    if (options?.tags?.length) {
      filtered = filtered.filter((m) =>
        options.tags!.some((t) => m.tags.includes(t)),
      );
    }

    const page = options?.page ?? 0;
    const limit = options?.limit ?? 100;
    const paged = filtered.slice(page * limit, (page + 1) * limit);

    return success({ monitors: paged, total: filtered.length });
  }

  async getMonitor(
    monitorId: number,
  ): Promise<ConnectorResult<DatadogMonitor>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const monitor = this.monitors.find((m) => m.id === monitorId);
    if (!monitor) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Monitor ${monitorId} not found`,
      });
    }

    return success(monitor);
  }

  async createMonitor(input: {
    name: string;
    type: MonitorType;
    query: string;
    message: string;
    tags?: string[];
    priority?: number;
    options?: Partial<DatadogMonitorOptions>;
    thresholds?: DatadogMonitorThresholds;
  }): Promise<ConnectorResult<DatadogMonitor>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const now = new Date().toISOString();
    const monitor: DatadogMonitor = {
      id: this.nextMonitorId++,
      name: input.name,
      type: input.type,
      query: input.query,
      message: input.message,
      tags: input.tags || [],
      priority: input.priority || null,
      overallState: "No Data",
      created: now,
      modified: now,
      creator: {
        id: "user-001",
        name: "Alice Engineer",
        email: "alice@example.com",
        handle: "alice.engineer",
      },
      options: {
        notifyNoData: input.options?.notifyNoData ?? true,
        noDataTimeframe: input.options?.noDataTimeframe ?? 10,
        notifyAudit: input.options?.notifyAudit ?? false,
        timeoutH: input.options?.timeoutH ?? null,
        renotifyInterval: input.options?.renotifyInterval ?? null,
        escalationMessage: input.options?.escalationMessage ?? null,
        includeTags: input.options?.includeTags ?? true,
        requireFullWindow: input.options?.requireFullWindow ?? false,
      },
      thresholds: input.thresholds || null,
    };

    this.monitors.push(monitor);
    return success(monitor);
  }

  async updateMonitor(
    monitorId: number,
    input: {
      name?: string;
      query?: string;
      message?: string;
      tags?: string[];
      priority?: number;
      options?: Partial<DatadogMonitorOptions>;
      thresholds?: DatadogMonitorThresholds;
    },
  ): Promise<ConnectorResult<DatadogMonitor>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const monitor = this.monitors.find((m) => m.id === monitorId);
    if (!monitor) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Monitor ${monitorId} not found`,
      });
    }

    if (input.name !== undefined) monitor.name = input.name;
    if (input.query !== undefined) monitor.query = input.query;
    if (input.message !== undefined) monitor.message = input.message;
    if (input.tags !== undefined) monitor.tags = input.tags;
    if (input.priority !== undefined) monitor.priority = input.priority;
    if (input.thresholds !== undefined) monitor.thresholds = input.thresholds;
    if (input.options) {
      monitor.options = { ...monitor.options, ...input.options };
    }
    monitor.modified = new Date().toISOString();

    return success(monitor);
  }

  async deleteMonitor(monitorId: number): Promise<ConnectorResult<void>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const index = this.monitors.findIndex((m) => m.id === monitorId);
    if (index === -1) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Monitor ${monitorId} not found`,
      });
    }

    this.monitors.splice(index, 1);
    return success(undefined);
  }

  async muteMonitor(
    monitorId: number,
    _options?: { scope?: string; endTimestamp?: number },
  ): Promise<ConnectorResult<DatadogMonitor>> {
    return this.getMonitor(monitorId);
  }

  async unmuteMonitor(
    monitorId: number,
    _options?: { scope?: string },
  ): Promise<ConnectorResult<DatadogMonitor>> {
    return this.getMonitor(monitorId);
  }

  // Dashboard operations
  async listDashboards(options?: {
    filterShared?: boolean;
    filterDeleted?: boolean;
    limit?: number;
    page?: number;
  }): Promise<
    ConnectorResult<{ dashboards: DatadogDashboard[]; total: number }>
  > {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const page = options?.page ?? 0;
    const limit = options?.limit ?? 100;
    const paged = this.dashboards.slice(page * limit, (page + 1) * limit);

    return success({ dashboards: paged, total: this.dashboards.length });
  }

  async getDashboard(
    dashboardId: string,
  ): Promise<ConnectorResult<DatadogDashboard>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const dashboard = this.dashboards.find((d) => d.id === dashboardId);
    if (!dashboard) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Dashboard ${dashboardId} not found`,
      });
    }

    return success(dashboard);
  }

  // Host operations
  async listHosts(options?: {
    filter?: string;
    sortField?: string;
    sortDir?: "asc" | "desc";
    from?: number;
    limit?: number;
  }): Promise<ConnectorResult<{ hosts: DatadogHost[]; total: number }>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    let filtered = [...this.hosts];
    if (options?.filter) {
      const f = options.filter.toLowerCase();
      filtered = filtered.filter(
        (h) =>
          h.name.toLowerCase().includes(f) ||
          h.tags.some((t) => t.toLowerCase().includes(f)),
      );
    }

    const limit = options?.limit ?? 100;
    const paged = filtered.slice(0, limit);

    return success({ hosts: paged, total: filtered.length });
  }

  async muteHost(
    hostname: string,
    _options?: { message?: string; endTimestamp?: number },
  ): Promise<ConnectorResult<void>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const host = this.hosts.find((h) => h.name === hostname);
    if (!host) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Host ${hostname} not found`,
      });
    }

    host.isMuted = true;
    return success(undefined);
  }

  async unmuteHost(hostname: string): Promise<ConnectorResult<void>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const host = this.hosts.find((h) => h.name === hostname);
    if (!host) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Host ${hostname} not found`,
      });
    }

    host.isMuted = false;
    return success(undefined);
  }

  // Event operations
  async listEvents(options: {
    start: number;
    end: number;
    priority?: "normal" | "low";
    tags?: string[];
    sources?: string[];
  }): Promise<ConnectorResult<DatadogEvent[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    let filtered = this.events.filter(
      (e) =>
        e.dateHappened >= options.start / 1000 &&
        e.dateHappened <= options.end / 1000,
    );

    if (options.priority) {
      filtered = filtered.filter((e) => e.priority === options.priority);
    }
    if (options.tags?.length) {
      filtered = filtered.filter((e) =>
        options.tags!.some((t) => e.tags.includes(t)),
      );
    }
    if (options.sources?.length) {
      filtered = filtered.filter((e) => options.sources!.includes(e.source));
    }

    return success(filtered);
  }

  async createEvent(input: {
    title: string;
    text: string;
    priority?: "normal" | "low";
    alertType?: "error" | "warning" | "info" | "success";
    tags?: string[];
    host?: string;
  }): Promise<ConnectorResult<DatadogEvent>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const event: DatadogEvent = {
      id: this.nextEventId++,
      title: input.title,
      text: input.text,
      dateHappened: Date.now() / 1000,
      host: input.host || null,
      tags: input.tags || [],
      priority: input.priority || "normal",
      alertType: input.alertType || "info",
      source: "api",
      url: `https://app.datadoghq.com/event/${this.nextEventId - 1}`,
    };

    this.events.push(event);
    return success(event);
  }

  // SLO operations
  async listSLOs(options?: {
    ids?: string[];
    query?: string;
    tags?: string[];
    limit?: number;
    offset?: number;
  }): Promise<
    ConnectorResult<{ slos: DatadogServiceLevelObjective[]; total: number }>
  > {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    let filtered = [...this.slos];

    if (options?.ids?.length) {
      filtered = filtered.filter((s) => options.ids!.includes(s.id));
    }
    if (options?.query) {
      const q = options.query.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.description?.toLowerCase().includes(q) ?? false),
      );
    }
    if (options?.tags?.length) {
      filtered = filtered.filter((s) =>
        options.tags!.some((t) => s.tags.includes(t)),
      );
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;
    const paged = filtered.slice(offset, offset + limit);

    return success({ slos: paged, total: filtered.length });
  }

  async getSLO(
    sloId: string,
  ): Promise<ConnectorResult<DatadogServiceLevelObjective>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const slo = this.slos.find((s) => s.id === sloId);
    if (!slo) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `SLO ${sloId} not found`,
      });
    }

    return success(slo);
  }

  // Incident operations
  async listIncidents(options?: {
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<
    ConnectorResult<{ incidents: DatadogIncident[]; total: number }>
  > {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    let filtered = [...this.incidents];

    if (options?.query) {
      const q = options.query.toLowerCase();
      filtered = filtered.filter((i) => i.title.toLowerCase().includes(q));
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 100;
    const paged = filtered.slice(offset, offset + limit);

    return success({ incidents: paged, total: filtered.length });
  }

  async getIncident(
    incidentId: string,
  ): Promise<ConnectorResult<DatadogIncident>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const incident = this.incidents.find((i) => i.id === incidentId);
    if (!incident) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Incident ${incidentId} not found`,
      });
    }

    return success(incident);
  }

  // Log operations
  async queryLogs(
    query: DatadogLogQuery,
  ): Promise<
    ConnectorResult<{ logs: DatadogLog[]; nextCursor: string | null }>
  > {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const from = new Date(query.from).getTime();
    const to = new Date(query.to).getTime();

    let filtered = this.logs.filter((l) => {
      const ts = new Date(l.content.timestamp).getTime();
      return ts >= from && ts <= to;
    });

    if (query.query && query.query !== "*") {
      const q = query.query.toLowerCase();
      filtered = filtered.filter(
        (l) =>
          l.content.message.toLowerCase().includes(q) ||
          l.content.service.toLowerCase().includes(q),
      );
    }

    return success({ logs: filtered, nextCursor: null });
  }
}

// ============================================================================
// Live Implementation (Stub)
// ============================================================================

class LiveDatadogConnector implements DatadogConnector {
  readonly name = "datadog";
  readonly mode = "live" as const;
  private _isInitialized = false;

  constructor(private config: DatadogConnectorConfig) {}

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async initialize(): Promise<ConnectorResult<void>> {
    if (!this.config.apiKey || !this.config.appKey) {
      return failure({
        code: ErrorCodes.AUTH_REQUIRED,
        message: "Datadog API key and App key are required for live mode",
      });
    }
    this._isInitialized = true;
    return success(undefined);
  }

  async dispose(): Promise<void> {
    this._isInitialized = false;
  }

  async healthCheck(): Promise<ConnectorResult<HealthCheckResponse>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Datadog connector not yet implemented",
    });
  }

  async listMetrics(): Promise<ConnectorResult<DatadogMetric[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Datadog connector not yet implemented",
    });
  }

  async queryMetrics(): Promise<ConnectorResult<DatadogMetricSeries[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Datadog connector not yet implemented",
    });
  }

  async submitMetrics(): Promise<ConnectorResult<void>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Datadog connector not yet implemented",
    });
  }

  async listMonitors(): Promise<
    ConnectorResult<{ monitors: DatadogMonitor[]; total: number }>
  > {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Datadog connector not yet implemented",
    });
  }

  async getMonitor(): Promise<ConnectorResult<DatadogMonitor>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Datadog connector not yet implemented",
    });
  }

  async createMonitor(): Promise<ConnectorResult<DatadogMonitor>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Datadog connector not yet implemented",
    });
  }

  async updateMonitor(): Promise<ConnectorResult<DatadogMonitor>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Datadog connector not yet implemented",
    });
  }

  async deleteMonitor(): Promise<ConnectorResult<void>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Datadog connector not yet implemented",
    });
  }

  async muteMonitor(): Promise<ConnectorResult<DatadogMonitor>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Datadog connector not yet implemented",
    });
  }

  async unmuteMonitor(): Promise<ConnectorResult<DatadogMonitor>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Datadog connector not yet implemented",
    });
  }

  async listDashboards(): Promise<
    ConnectorResult<{ dashboards: DatadogDashboard[]; total: number }>
  > {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Datadog connector not yet implemented",
    });
  }

  async getDashboard(): Promise<ConnectorResult<DatadogDashboard>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Datadog connector not yet implemented",
    });
  }

  async listHosts(): Promise<
    ConnectorResult<{ hosts: DatadogHost[]; total: number }>
  > {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Datadog connector not yet implemented",
    });
  }

  async muteHost(): Promise<ConnectorResult<void>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Datadog connector not yet implemented",
    });
  }

  async unmuteHost(): Promise<ConnectorResult<void>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Datadog connector not yet implemented",
    });
  }

  async listEvents(): Promise<ConnectorResult<DatadogEvent[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Datadog connector not yet implemented",
    });
  }

  async createEvent(): Promise<ConnectorResult<DatadogEvent>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Datadog connector not yet implemented",
    });
  }

  async listSLOs(): Promise<
    ConnectorResult<{ slos: DatadogServiceLevelObjective[]; total: number }>
  > {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Datadog connector not yet implemented",
    });
  }

  async getSLO(): Promise<ConnectorResult<DatadogServiceLevelObjective>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Datadog connector not yet implemented",
    });
  }

  async listIncidents(): Promise<
    ConnectorResult<{ incidents: DatadogIncident[]; total: number }>
  > {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Datadog connector not yet implemented",
    });
  }

  async getIncident(): Promise<ConnectorResult<DatadogIncident>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Datadog connector not yet implemented",
    });
  }

  async queryLogs(): Promise<
    ConnectorResult<{ logs: DatadogLog[]; nextCursor: string | null }>
  > {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Datadog connector not yet implemented",
    });
  }
}
