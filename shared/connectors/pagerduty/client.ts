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
// PagerDuty Types
// ============================================================================

export type IncidentStatus = "triggered" | "acknowledged" | "resolved";
export type IncidentUrgency = "high" | "low";
export type IncidentSeverity = "critical" | "error" | "warning" | "info";

export interface PagerDutyIncident {
  id: string;
  incidentNumber: number;
  title: string;
  description: string | null;
  status: IncidentStatus;
  urgency: IncidentUrgency;
  severity: IncidentSeverity | null;
  service: PagerDutyService;
  assignees: PagerDutyUser[];
  escalationPolicy: PagerDutyEscalationPolicy;
  teams: PagerDutyTeam[];
  priority: PagerDutyPriority | null;
  createdAt: string;
  updatedAt: string;
  resolvedAt: string | null;
  acknowledgedAt: string | null;
  lastStatusChangeAt: string;
  alertCounts: {
    triggered: number;
    acknowledged: number;
    resolved: number;
    all: number;
  };
  incidentKey: string | null;
  htmlUrl: string;
}

export interface PagerDutyService {
  id: string;
  name: string;
  description: string | null;
  status: "active" | "warning" | "critical" | "maintenance" | "disabled";
  escalationPolicy: PagerDutyEscalationPolicy;
  teams: PagerDutyTeam[];
  integrationKeys: string[];
  createdAt: string;
  updatedAt: string;
  htmlUrl: string;
}

export interface PagerDutyUser {
  id: string;
  name: string;
  email: string;
  role: "admin" | "user" | "limited_user" | "observer" | "owner";
  avatarUrl: string | null;
  timeZone: string;
  contactMethods: PagerDutyContactMethod[];
  notificationRules: PagerDutyNotificationRule[];
}

export interface PagerDutyContactMethod {
  id: string;
  type: "email" | "phone" | "sms" | "push_notification";
  address: string;
  label: string | null;
}

export interface PagerDutyNotificationRule {
  id: string;
  startDelayInMinutes: number;
  urgency: IncidentUrgency;
  contactMethod: PagerDutyContactMethod;
}

export interface PagerDutyTeam {
  id: string;
  name: string;
  description: string | null;
  htmlUrl: string;
}

export interface PagerDutyEscalationPolicy {
  id: string;
  name: string;
  description: string | null;
  numLoops: number;
  escalationRules: PagerDutyEscalationRule[];
  teams: PagerDutyTeam[];
  services: { id: string; name: string }[];
}

export interface PagerDutyEscalationRule {
  id: string;
  escalationDelayInMinutes: number;
  targets: PagerDutyEscalationTarget[];
}

export interface PagerDutyEscalationTarget {
  id: string;
  type: "user" | "schedule" | "user_reference" | "schedule_reference";
  name: string;
}

export interface PagerDutySchedule {
  id: string;
  name: string;
  description: string | null;
  timeZone: string;
  finalSchedule: PagerDutyScheduleLayer;
  overrides: PagerDutyOverride[];
  escalationPolicies: { id: string; name: string }[];
  users: PagerDutyUser[];
}

export interface PagerDutyScheduleLayer {
  name: string;
  renderedScheduleEntries: PagerDutyScheduleEntry[];
  renderedCoveragePercentage: number | null;
}

export interface PagerDutyScheduleEntry {
  user: PagerDutyUser;
  start: string;
  end: string;
}

export interface PagerDutyOverride {
  id: string;
  user: PagerDutyUser;
  start: string;
  end: string;
}

export interface PagerDutyOnCall {
  user: PagerDutyUser;
  schedule: { id: string; name: string } | null;
  escalationPolicy: { id: string; name: string };
  escalationLevel: number;
  start: string;
  end: string;
}

export interface PagerDutyPriority {
  id: string;
  name: string;
  description: string | null;
  order: number;
  color: string;
}

export interface PagerDutyAlert {
  id: string;
  type: string;
  status: "triggered" | "acknowledged" | "resolved";
  alertKey: string;
  service: { id: string; name: string };
  incident: { id: string; incidentNumber: number };
  createdAt: string;
  severity: IncidentSeverity;
  body: {
    type: string;
    details: Record<string, unknown>;
  } | null;
}

export interface PagerDutyLogEntry {
  id: string;
  type: string;
  createdAt: string;
  agent: {
    type: "user" | "service" | "integration";
    id: string;
    name: string;
  };
  channel: {
    type: string;
    details?: Record<string, unknown>;
  };
  incident: { id: string; incidentNumber: number };
  note: string | null;
}

// ============================================================================
// Connector Configuration
// ============================================================================

export interface PagerDutyConnectorConfig extends BaseConnectorConfig {
  /** PagerDuty API token */
  apiToken?: string;
  /** Default service ID for operations */
  defaultServiceId?: string;
  /** API base URL (for testing/enterprise) */
  baseUrl?: string;
}

// ============================================================================
// Connector Interface
// ============================================================================

export interface PagerDutyConnector extends BaseConnector {
  // Incident operations
  listIncidents(options?: {
    statuses?: IncidentStatus[];
    urgencies?: IncidentUrgency[];
    serviceIds?: string[];
    teamIds?: string[];
    since?: string;
    until?: string;
    limit?: number;
    offset?: number;
  }): Promise<
    ConnectorResult<{ incidents: PagerDutyIncident[]; total: number }>
  >;

  getIncident(incidentId: string): Promise<ConnectorResult<PagerDutyIncident>>;

  createIncident(input: {
    title: string;
    serviceId: string;
    urgency?: IncidentUrgency;
    body?: string;
    escalationPolicyId?: string;
    priority?: string;
    assignees?: string[];
  }): Promise<ConnectorResult<PagerDutyIncident>>;

  updateIncident(
    incidentId: string,
    input: {
      status?: IncidentStatus;
      title?: string;
      urgency?: IncidentUrgency;
      escalationLevel?: number;
      assignees?: string[];
      resolution?: string;
    },
  ): Promise<ConnectorResult<PagerDutyIncident>>;

  acknowledgeIncident(
    incidentId: string,
  ): Promise<ConnectorResult<PagerDutyIncident>>;

  resolveIncident(
    incidentId: string,
    resolution?: string,
  ): Promise<ConnectorResult<PagerDutyIncident>>;

  addIncidentNote(
    incidentId: string,
    note: string,
  ): Promise<
    ConnectorResult<{ id: string; content: string; createdAt: string }>
  >;

  getIncidentAlerts(
    incidentId: string,
  ): Promise<ConnectorResult<PagerDutyAlert[]>>;

  getIncidentTimeline(
    incidentId: string,
  ): Promise<ConnectorResult<PagerDutyLogEntry[]>>;

  // Service operations
  listServices(options?: {
    teamIds?: string[];
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<ConnectorResult<{ services: PagerDutyService[]; total: number }>>;

  getService(serviceId: string): Promise<ConnectorResult<PagerDutyService>>;

  // Team operations
  listTeams(options?: {
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<ConnectorResult<{ teams: PagerDutyTeam[]; total: number }>>;

  // User operations
  listUsers(options?: {
    teamIds?: string[];
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<ConnectorResult<{ users: PagerDutyUser[]; total: number }>>;

  getUser(userId: string): Promise<ConnectorResult<PagerDutyUser>>;

  // Escalation policy operations
  listEscalationPolicies(options?: {
    teamIds?: string[];
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<
    ConnectorResult<{
      escalationPolicies: PagerDutyEscalationPolicy[];
      total: number;
    }>
  >;

  getEscalationPolicy(
    policyId: string,
  ): Promise<ConnectorResult<PagerDutyEscalationPolicy>>;

  // On-call operations
  listOnCalls(options?: {
    scheduleIds?: string[];
    escalationPolicyIds?: string[];
    userIds?: string[];
    since?: string;
    until?: string;
  }): Promise<ConnectorResult<PagerDutyOnCall[]>>;

  getCurrentOnCall(
    escalationPolicyId: string,
  ): Promise<ConnectorResult<PagerDutyUser[]>>;

  // Schedule operations
  listSchedules(options?: {
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<
    ConnectorResult<{ schedules: PagerDutySchedule[]; total: number }>
  >;

  getSchedule(
    scheduleId: string,
    options?: { since?: string; until?: string },
  ): Promise<ConnectorResult<PagerDutySchedule>>;

  // Priority operations
  listPriorities(): Promise<ConnectorResult<PagerDutyPriority[]>>;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createPagerDutyConnector(
  config: PagerDutyConnectorConfig,
): PagerDutyConnector {
  if (config.mode === "mock") {
    return new MockPagerDutyConnector(config);
  }
  return new LivePagerDutyConnector(config);
}

// ============================================================================
// Mock Implementation
// ============================================================================

class MockPagerDutyConnector implements PagerDutyConnector {
  readonly name = "pagerduty";
  readonly mode = "mock" as const;
  private _isInitialized = false;

  private incidents: PagerDutyIncident[] = [];
  private services: PagerDutyService[] = [];
  private teams: PagerDutyTeam[] = [];
  private users: PagerDutyUser[] = [];
  private escalationPolicies: PagerDutyEscalationPolicy[] = [];
  private schedules: PagerDutySchedule[] = [];
  private priorities: PagerDutyPriority[] = [];
  private alerts: PagerDutyAlert[] = [];
  private logEntries: PagerDutyLogEntry[] = [];
  private notes: Map<
    string,
    { id: string; content: string; createdAt: string }[]
  > = new Map();
  private nextIncidentNum = 1;
  private nextNoteId = 1;

  constructor(private config: PagerDutyConnectorConfig) {
    this.seedMockData();
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  private seedMockData(): void {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);

    // Teams
    this.teams = [
      {
        id: "TEAM001",
        name: "Platform Engineering",
        description: "Core platform and infrastructure",
        htmlUrl: "https://example.pagerduty.com/teams/TEAM001",
      },
      {
        id: "TEAM002",
        name: "Application Development",
        description: "Product development team",
        htmlUrl: "https://example.pagerduty.com/teams/TEAM002",
      },
      {
        id: "TEAM003",
        name: "SRE",
        description: "Site Reliability Engineering",
        htmlUrl: "https://example.pagerduty.com/teams/TEAM003",
      },
    ];

    // Users
    this.users = [
      {
        id: "USER001",
        name: "Alice Engineer",
        email: "alice@example.com",
        role: "user",
        avatarUrl: "https://avatar.example.com/alice.png",
        timeZone: "America/Los_Angeles",
        contactMethods: [
          {
            id: "CM001",
            type: "email",
            address: "alice@example.com",
            label: "Work",
          },
          {
            id: "CM002",
            type: "phone",
            address: "+1-555-0101",
            label: "Mobile",
          },
        ],
        notificationRules: [
          {
            id: "NR001",
            startDelayInMinutes: 0,
            urgency: "high",
            contactMethod: {
              id: "CM001",
              type: "email",
              address: "alice@example.com",
              label: "Work",
            },
          },
        ],
      },
      {
        id: "USER002",
        name: "Bob DevOps",
        email: "bob@example.com",
        role: "admin",
        avatarUrl: "https://avatar.example.com/bob.png",
        timeZone: "America/New_York",
        contactMethods: [
          {
            id: "CM003",
            type: "email",
            address: "bob@example.com",
            label: "Work",
          },
          { id: "CM004", type: "sms", address: "+1-555-0102", label: "Mobile" },
        ],
        notificationRules: [
          {
            id: "NR002",
            startDelayInMinutes: 0,
            urgency: "high",
            contactMethod: {
              id: "CM003",
              type: "email",
              address: "bob@example.com",
              label: "Work",
            },
          },
        ],
      },
      {
        id: "USER003",
        name: "Carol SRE",
        email: "carol@example.com",
        role: "user",
        avatarUrl: "https://avatar.example.com/carol.png",
        timeZone: "Europe/London",
        contactMethods: [
          {
            id: "CM005",
            type: "email",
            address: "carol@example.com",
            label: "Work",
          },
        ],
        notificationRules: [
          {
            id: "NR003",
            startDelayInMinutes: 0,
            urgency: "high",
            contactMethod: {
              id: "CM005",
              type: "email",
              address: "carol@example.com",
              label: "Work",
            },
          },
        ],
      },
    ];

    // Priorities
    this.priorities = [
      {
        id: "PRI001",
        name: "P1",
        description: "Critical - Immediate response required",
        order: 1,
        color: "#ff0000",
      },
      {
        id: "PRI002",
        name: "P2",
        description: "High - Response within 1 hour",
        order: 2,
        color: "#ff6600",
      },
      {
        id: "PRI003",
        name: "P3",
        description: "Medium - Response within 4 hours",
        order: 3,
        color: "#ffcc00",
      },
      {
        id: "PRI004",
        name: "P4",
        description: "Low - Response within 24 hours",
        order: 4,
        color: "#00cc00",
      },
    ];

    // Escalation Policies
    this.escalationPolicies = [
      {
        id: "EP001",
        name: "Platform On-Call",
        description: "Escalation for platform services",
        numLoops: 2,
        escalationRules: [
          {
            id: "ER001",
            escalationDelayInMinutes: 15,
            targets: [{ id: "USER001", type: "user", name: "Alice Engineer" }],
          },
          {
            id: "ER002",
            escalationDelayInMinutes: 30,
            targets: [{ id: "USER002", type: "user", name: "Bob DevOps" }],
          },
        ],
        teams: [this.teams[0]],
        services: [{ id: "SVC001", name: "API Gateway" }],
      },
      {
        id: "EP002",
        name: "Application On-Call",
        description: "Escalation for application services",
        numLoops: 3,
        escalationRules: [
          {
            id: "ER003",
            escalationDelayInMinutes: 10,
            targets: [{ id: "USER003", type: "user", name: "Carol SRE" }],
          },
          {
            id: "ER004",
            escalationDelayInMinutes: 20,
            targets: [
              { id: "USER001", type: "user", name: "Alice Engineer" },
              { id: "USER002", type: "user", name: "Bob DevOps" },
            ],
          },
        ],
        teams: [this.teams[1]],
        services: [{ id: "SVC002", name: "User Service" }],
      },
    ];

    // Services
    this.services = [
      {
        id: "SVC001",
        name: "API Gateway",
        description: "Main API gateway service handling all external traffic",
        status: "critical",
        escalationPolicy: this.escalationPolicies[0],
        teams: [this.teams[0]],
        integrationKeys: ["int-key-001"],
        createdAt: weekAgo.toISOString(),
        updatedAt: now.toISOString(),
        htmlUrl: "https://example.pagerduty.com/services/SVC001",
      },
      {
        id: "SVC002",
        name: "User Service",
        description: "User authentication and profile service",
        status: "warning",
        escalationPolicy: this.escalationPolicies[1],
        teams: [this.teams[1]],
        integrationKeys: ["int-key-002"],
        createdAt: weekAgo.toISOString(),
        updatedAt: dayAgo.toISOString(),
        htmlUrl: "https://example.pagerduty.com/services/SVC002",
      },
      {
        id: "SVC003",
        name: "Payment Service",
        description: "Payment processing and billing",
        status: "active",
        escalationPolicy: this.escalationPolicies[0],
        teams: [this.teams[0], this.teams[2]],
        integrationKeys: ["int-key-003"],
        createdAt: weekAgo.toISOString(),
        updatedAt: weekAgo.toISOString(),
        htmlUrl: "https://example.pagerduty.com/services/SVC003",
      },
      {
        id: "SVC004",
        name: "Database Cluster",
        description: "Primary PostgreSQL cluster",
        status: "active",
        escalationPolicy: this.escalationPolicies[0],
        teams: [this.teams[2]],
        integrationKeys: ["int-key-004"],
        createdAt: weekAgo.toISOString(),
        updatedAt: weekAgo.toISOString(),
        htmlUrl: "https://example.pagerduty.com/services/SVC004",
      },
    ];

    // Schedules
    const scheduleStart = new Date(now);
    scheduleStart.setHours(9, 0, 0, 0);
    const scheduleEnd = new Date(scheduleStart);
    scheduleEnd.setDate(scheduleEnd.getDate() + 7);

    this.schedules = [
      {
        id: "SCHED001",
        name: "Platform Primary On-Call",
        description: "Primary on-call rotation for platform team",
        timeZone: "America/Los_Angeles",
        finalSchedule: {
          name: "Final Schedule",
          renderedScheduleEntries: [
            {
              user: this.users[0],
              start: now.toISOString(),
              end: new Date(
                now.getTime() + 7 * 24 * 60 * 60 * 1000,
              ).toISOString(),
            },
          ],
          renderedCoveragePercentage: 100,
        },
        overrides: [],
        escalationPolicies: [{ id: "EP001", name: "Platform On-Call" }],
        users: [this.users[0], this.users[1]],
      },
      {
        id: "SCHED002",
        name: "Application On-Call Rotation",
        description: "Weekly rotation for app team",
        timeZone: "America/New_York",
        finalSchedule: {
          name: "Final Schedule",
          renderedScheduleEntries: [
            {
              user: this.users[2],
              start: now.toISOString(),
              end: new Date(
                now.getTime() + 7 * 24 * 60 * 60 * 1000,
              ).toISOString(),
            },
          ],
          renderedCoveragePercentage: 100,
        },
        overrides: [],
        escalationPolicies: [{ id: "EP002", name: "Application On-Call" }],
        users: [this.users[2], this.users[0]],
      },
    ];

    // Incidents
    this.incidents = [
      {
        id: "INC001",
        incidentNumber: 1,
        title: "API Gateway returning 503 errors",
        description:
          "Multiple users reporting 503 Service Unavailable errors when accessing the API",
        status: "triggered",
        urgency: "high",
        severity: "critical",
        service: this.services[0],
        assignees: [this.users[0]],
        escalationPolicy: this.escalationPolicies[0],
        teams: [this.teams[0]],
        priority: this.priorities[0],
        createdAt: hourAgo.toISOString(),
        updatedAt: hourAgo.toISOString(),
        resolvedAt: null,
        acknowledgedAt: null,
        lastStatusChangeAt: hourAgo.toISOString(),
        alertCounts: { triggered: 5, acknowledged: 0, resolved: 0, all: 5 },
        incidentKey: "api-gateway-503",
        htmlUrl: "https://example.pagerduty.com/incidents/INC001",
      },
      {
        id: "INC002",
        incidentNumber: 2,
        title: "High memory usage on User Service",
        description: "Memory usage exceeded 90% threshold",
        status: "acknowledged",
        urgency: "high",
        severity: "warning",
        service: this.services[1],
        assignees: [this.users[2]],
        escalationPolicy: this.escalationPolicies[1],
        teams: [this.teams[1]],
        priority: this.priorities[1],
        createdAt: dayAgo.toISOString(),
        updatedAt: hourAgo.toISOString(),
        resolvedAt: null,
        acknowledgedAt: hourAgo.toISOString(),
        lastStatusChangeAt: hourAgo.toISOString(),
        alertCounts: { triggered: 0, acknowledged: 2, resolved: 0, all: 2 },
        incidentKey: "user-service-memory",
        htmlUrl: "https://example.pagerduty.com/incidents/INC002",
      },
      {
        id: "INC003",
        incidentNumber: 3,
        title: "Database connection pool exhausted",
        description: "PostgreSQL connection pool reached maximum capacity",
        status: "resolved",
        urgency: "high",
        severity: "error",
        service: this.services[3],
        assignees: [this.users[1]],
        escalationPolicy: this.escalationPolicies[0],
        teams: [this.teams[2]],
        priority: this.priorities[1],
        createdAt: dayAgo.toISOString(),
        updatedAt: dayAgo.toISOString(),
        resolvedAt: dayAgo.toISOString(),
        acknowledgedAt: dayAgo.toISOString(),
        lastStatusChangeAt: dayAgo.toISOString(),
        alertCounts: { triggered: 0, acknowledged: 0, resolved: 3, all: 3 },
        incidentKey: "db-pool-exhausted",
        htmlUrl: "https://example.pagerduty.com/incidents/INC003",
      },
      {
        id: "INC004",
        incidentNumber: 4,
        title: "Elevated error rate in Payment Service",
        description: "Error rate increased from 0.1% to 2.5%",
        status: "triggered",
        urgency: "low",
        severity: "warning",
        service: this.services[2],
        assignees: [],
        escalationPolicy: this.escalationPolicies[0],
        teams: [this.teams[0], this.teams[2]],
        priority: this.priorities[2],
        createdAt: now.toISOString(),
        updatedAt: now.toISOString(),
        resolvedAt: null,
        acknowledgedAt: null,
        lastStatusChangeAt: now.toISOString(),
        alertCounts: { triggered: 1, acknowledged: 0, resolved: 0, all: 1 },
        incidentKey: "payment-error-rate",
        htmlUrl: "https://example.pagerduty.com/incidents/INC004",
      },
    ];

    this.nextIncidentNum = 5;

    // Alerts
    this.alerts = [
      {
        id: "ALERT001",
        type: "alert",
        status: "triggered",
        alertKey: "api-503-alert-1",
        service: { id: "SVC001", name: "API Gateway" },
        incident: { id: "INC001", incidentNumber: 1 },
        createdAt: hourAgo.toISOString(),
        severity: "critical",
        body: {
          type: "alert_body",
          details: { error_count: 150, endpoint: "/api/v1/users" },
        },
      },
      {
        id: "ALERT002",
        type: "alert",
        status: "acknowledged",
        alertKey: "memory-alert-1",
        service: { id: "SVC002", name: "User Service" },
        incident: { id: "INC002", incidentNumber: 2 },
        createdAt: dayAgo.toISOString(),
        severity: "warning",
        body: {
          type: "alert_body",
          details: { memory_usage: "92%", threshold: "90%" },
        },
      },
    ];

    // Log entries
    this.logEntries = [
      {
        id: "LOG001",
        type: "trigger_log_entry",
        createdAt: hourAgo.toISOString(),
        agent: {
          type: "integration",
          id: "INT001",
          name: "Datadog Integration",
        },
        channel: { type: "monitoring_tool", details: { source: "datadog" } },
        incident: { id: "INC001", incidentNumber: 1 },
        note: null,
      },
      {
        id: "LOG002",
        type: "notify_log_entry",
        createdAt: new Date(hourAgo.getTime() + 1000).toISOString(),
        agent: { type: "service", id: "SVC001", name: "API Gateway" },
        channel: { type: "auto_escalation" },
        incident: { id: "INC001", incidentNumber: 1 },
        note: null,
      },
      {
        id: "LOG003",
        type: "acknowledge_log_entry",
        createdAt: hourAgo.toISOString(),
        agent: { type: "user", id: "USER003", name: "Carol SRE" },
        channel: { type: "web_app" },
        incident: { id: "INC002", incidentNumber: 2 },
        note: "Looking into this now",
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
        incidentCount: this.incidents.length,
        serviceCount: this.services.length,
        userCount: this.users.length,
      },
    });
  }

  // Incident operations
  async listIncidents(options?: {
    statuses?: IncidentStatus[];
    urgencies?: IncidentUrgency[];
    serviceIds?: string[];
    teamIds?: string[];
    since?: string;
    until?: string;
    limit?: number;
    offset?: number;
  }): Promise<
    ConnectorResult<{ incidents: PagerDutyIncident[]; total: number }>
  > {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    let filtered = [...this.incidents];

    if (options?.statuses?.length) {
      filtered = filtered.filter((i) => options.statuses!.includes(i.status));
    }
    if (options?.urgencies?.length) {
      filtered = filtered.filter((i) => options.urgencies!.includes(i.urgency));
    }
    if (options?.serviceIds?.length) {
      filtered = filtered.filter((i) =>
        options.serviceIds!.includes(i.service.id),
      );
    }
    if (options?.teamIds?.length) {
      filtered = filtered.filter((i) =>
        i.teams.some((t) => options.teamIds!.includes(t.id)),
      );
    }
    if (options?.since) {
      const since = new Date(options.since);
      filtered = filtered.filter((i) => new Date(i.createdAt) >= since);
    }
    if (options?.until) {
      const until = new Date(options.until);
      filtered = filtered.filter((i) => new Date(i.createdAt) <= until);
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 25;
    const paged = filtered.slice(offset, offset + limit);

    return success({ incidents: paged, total: filtered.length });
  }

  async getIncident(
    incidentId: string,
  ): Promise<ConnectorResult<PagerDutyIncident>> {
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

  async createIncident(input: {
    title: string;
    serviceId: string;
    urgency?: IncidentUrgency;
    body?: string;
    escalationPolicyId?: string;
    priority?: string;
    assignees?: string[];
  }): Promise<ConnectorResult<PagerDutyIncident>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const service = this.services.find((s) => s.id === input.serviceId);
    if (!service) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Service ${input.serviceId} not found`,
      });
    }

    const escalationPolicy =
      this.escalationPolicies.find(
        (ep) => ep.id === input.escalationPolicyId,
      ) || service.escalationPolicy;

    const priority = input.priority
      ? this.priorities.find(
          (p) => p.id === input.priority || p.name === input.priority,
        ) || null
      : null;

    const assignees = input.assignees
      ? this.users.filter((u) => input.assignees!.includes(u.id))
      : [];

    const now = new Date().toISOString();
    const incident: PagerDutyIncident = {
      id: `INC${String(this.nextIncidentNum).padStart(3, "0")}`,
      incidentNumber: this.nextIncidentNum,
      title: input.title,
      description: input.body || null,
      status: "triggered",
      urgency: input.urgency || "high",
      severity: null,
      service,
      assignees,
      escalationPolicy,
      teams: service.teams,
      priority,
      createdAt: now,
      updatedAt: now,
      resolvedAt: null,
      acknowledgedAt: null,
      lastStatusChangeAt: now,
      alertCounts: { triggered: 0, acknowledged: 0, resolved: 0, all: 0 },
      incidentKey: null,
      htmlUrl: `https://example.pagerduty.com/incidents/INC${String(this.nextIncidentNum).padStart(3, "0")}`,
    };

    this.incidents.push(incident);
    this.nextIncidentNum++;

    return success(incident);
  }

  async updateIncident(
    incidentId: string,
    input: {
      status?: IncidentStatus;
      title?: string;
      urgency?: IncidentUrgency;
      escalationLevel?: number;
      assignees?: string[];
      resolution?: string;
    },
  ): Promise<ConnectorResult<PagerDutyIncident>> {
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

    const now = new Date().toISOString();

    if (input.status !== undefined) {
      incident.status = input.status;
      incident.lastStatusChangeAt = now;
      if (input.status === "acknowledged" && !incident.acknowledgedAt) {
        incident.acknowledgedAt = now;
      }
      if (input.status === "resolved" && !incident.resolvedAt) {
        incident.resolvedAt = now;
      }
    }
    if (input.title !== undefined) {
      incident.title = input.title;
    }
    if (input.urgency !== undefined) {
      incident.urgency = input.urgency;
    }
    if (input.assignees !== undefined) {
      incident.assignees = this.users.filter((u) =>
        input.assignees!.includes(u.id),
      );
    }
    incident.updatedAt = now;

    return success(incident);
  }

  async acknowledgeIncident(
    incidentId: string,
  ): Promise<ConnectorResult<PagerDutyIncident>> {
    return this.updateIncident(incidentId, { status: "acknowledged" });
  }

  async resolveIncident(
    incidentId: string,
    resolution?: string,
  ): Promise<ConnectorResult<PagerDutyIncident>> {
    const result = await this.updateIncident(incidentId, {
      status: "resolved",
      resolution,
    });
    if (result.success && resolution) {
      await this.addIncidentNote(incidentId, `Resolution: ${resolution}`);
    }
    return result;
  }

  async addIncidentNote(
    incidentId: string,
    note: string,
  ): Promise<
    ConnectorResult<{ id: string; content: string; createdAt: string }>
  > {
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

    const noteObj = {
      id: `NOTE${String(this.nextNoteId++).padStart(3, "0")}`,
      content: note,
      createdAt: new Date().toISOString(),
    };

    if (!this.notes.has(incidentId)) {
      this.notes.set(incidentId, []);
    }
    this.notes.get(incidentId)!.push(noteObj);

    return success(noteObj);
  }

  async getIncidentAlerts(
    incidentId: string,
  ): Promise<ConnectorResult<PagerDutyAlert[]>> {
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

    const alerts = this.alerts.filter((a) => a.incident.id === incidentId);
    return success(alerts);
  }

  async getIncidentTimeline(
    incidentId: string,
  ): Promise<ConnectorResult<PagerDutyLogEntry[]>> {
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

    const entries = this.logEntries.filter((l) => l.incident.id === incidentId);
    return success(entries);
  }

  // Service operations
  async listServices(options?: {
    teamIds?: string[];
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<
    ConnectorResult<{ services: PagerDutyService[]; total: number }>
  > {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    let filtered = [...this.services];

    if (options?.teamIds?.length) {
      filtered = filtered.filter((s) =>
        s.teams.some((t) => options.teamIds!.includes(t.id)),
      );
    }
    if (options?.query) {
      const q = options.query.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.description?.toLowerCase().includes(q) ?? false),
      );
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 25;
    const paged = filtered.slice(offset, offset + limit);

    return success({ services: paged, total: filtered.length });
  }

  async getService(
    serviceId: string,
  ): Promise<ConnectorResult<PagerDutyService>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const service = this.services.find((s) => s.id === serviceId);
    if (!service) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Service ${serviceId} not found`,
      });
    }

    return success(service);
  }

  // Team operations
  async listTeams(options?: {
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<ConnectorResult<{ teams: PagerDutyTeam[]; total: number }>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    let filtered = [...this.teams];

    if (options?.query) {
      const q = options.query.toLowerCase();
      filtered = filtered.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          (t.description?.toLowerCase().includes(q) ?? false),
      );
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 25;
    const paged = filtered.slice(offset, offset + limit);

    return success({ teams: paged, total: filtered.length });
  }

  // User operations
  async listUsers(options?: {
    teamIds?: string[];
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<ConnectorResult<{ users: PagerDutyUser[]; total: number }>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    let filtered = [...this.users];

    if (options?.query) {
      const q = options.query.toLowerCase();
      filtered = filtered.filter(
        (u) =>
          u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q),
      );
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 25;
    const paged = filtered.slice(offset, offset + limit);

    return success({ users: paged, total: filtered.length });
  }

  async getUser(userId: string): Promise<ConnectorResult<PagerDutyUser>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const user = this.users.find((u) => u.id === userId);
    if (!user) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `User ${userId} not found`,
      });
    }

    return success(user);
  }

  // Escalation policy operations
  async listEscalationPolicies(options?: {
    teamIds?: string[];
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<
    ConnectorResult<{
      escalationPolicies: PagerDutyEscalationPolicy[];
      total: number;
    }>
  > {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    let filtered = [...this.escalationPolicies];

    if (options?.teamIds?.length) {
      filtered = filtered.filter((ep) =>
        ep.teams.some((t) => options.teamIds!.includes(t.id)),
      );
    }
    if (options?.query) {
      const q = options.query.toLowerCase();
      filtered = filtered.filter(
        (ep) =>
          ep.name.toLowerCase().includes(q) ||
          (ep.description?.toLowerCase().includes(q) ?? false),
      );
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 25;
    const paged = filtered.slice(offset, offset + limit);

    return success({ escalationPolicies: paged, total: filtered.length });
  }

  async getEscalationPolicy(
    policyId: string,
  ): Promise<ConnectorResult<PagerDutyEscalationPolicy>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const policy = this.escalationPolicies.find((ep) => ep.id === policyId);
    if (!policy) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Escalation policy ${policyId} not found`,
      });
    }

    return success(policy);
  }

  // On-call operations
  async listOnCalls(options?: {
    scheduleIds?: string[];
    escalationPolicyIds?: string[];
    userIds?: string[];
    since?: string;
    until?: string;
  }): Promise<ConnectorResult<PagerDutyOnCall[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    // Generate on-call entries from schedules
    const onCalls: PagerDutyOnCall[] = [];

    for (const schedule of this.schedules) {
      if (
        options?.scheduleIds?.length &&
        !options.scheduleIds.includes(schedule.id)
      ) {
        continue;
      }

      for (const entry of schedule.finalSchedule.renderedScheduleEntries) {
        if (
          options?.userIds?.length &&
          !options.userIds.includes(entry.user.id)
        ) {
          continue;
        }

        for (const epRef of schedule.escalationPolicies) {
          if (
            options?.escalationPolicyIds?.length &&
            !options.escalationPolicyIds.includes(epRef.id)
          ) {
            continue;
          }

          onCalls.push({
            user: entry.user,
            schedule: { id: schedule.id, name: schedule.name },
            escalationPolicy: epRef,
            escalationLevel: 1,
            start: entry.start,
            end: entry.end,
          });
        }
      }
    }

    return success(onCalls);
  }

  async getCurrentOnCall(
    escalationPolicyId: string,
  ): Promise<ConnectorResult<PagerDutyUser[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const policy = this.escalationPolicies.find(
      (ep) => ep.id === escalationPolicyId,
    );
    if (!policy) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Escalation policy ${escalationPolicyId} not found`,
      });
    }

    // Get first level targets
    const firstRule = policy.escalationRules[0];
    if (!firstRule) {
      return success([]);
    }

    const userIds = firstRule.targets
      .filter((t) => t.type === "user" || t.type === "user_reference")
      .map((t) => t.id);

    const users = this.users.filter((u) => userIds.includes(u.id));
    return success(users);
  }

  // Schedule operations
  async listSchedules(options?: {
    query?: string;
    limit?: number;
    offset?: number;
  }): Promise<
    ConnectorResult<{ schedules: PagerDutySchedule[]; total: number }>
  > {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    let filtered = [...this.schedules];

    if (options?.query) {
      const q = options.query.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.name.toLowerCase().includes(q) ||
          (s.description?.toLowerCase().includes(q) ?? false),
      );
    }

    const offset = options?.offset ?? 0;
    const limit = options?.limit ?? 25;
    const paged = filtered.slice(offset, offset + limit);

    return success({ schedules: paged, total: filtered.length });
  }

  async getSchedule(
    scheduleId: string,
    _options?: { since?: string; until?: string },
  ): Promise<ConnectorResult<PagerDutySchedule>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const schedule = this.schedules.find((s) => s.id === scheduleId);
    if (!schedule) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Schedule ${scheduleId} not found`,
      });
    }

    return success(schedule);
  }

  // Priority operations
  async listPriorities(): Promise<ConnectorResult<PagerDutyPriority[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    return success([...this.priorities]);
  }
}

// ============================================================================
// Live Implementation (Stub)
// ============================================================================

class LivePagerDutyConnector implements PagerDutyConnector {
  readonly name = "pagerduty";
  readonly mode = "live" as const;
  private _isInitialized = false;

  constructor(private config: PagerDutyConnectorConfig) {}

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async initialize(): Promise<ConnectorResult<void>> {
    if (!this.config.apiToken) {
      return failure({
        code: ErrorCodes.AUTH_REQUIRED,
        message: "PagerDuty API token is required for live mode",
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
      message: "Live PagerDuty connector not yet implemented",
    });
  }

  async listIncidents(): Promise<
    ConnectorResult<{ incidents: PagerDutyIncident[]; total: number }>
  > {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live PagerDuty connector not yet implemented",
    });
  }

  async getIncident(): Promise<ConnectorResult<PagerDutyIncident>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live PagerDuty connector not yet implemented",
    });
  }

  async createIncident(): Promise<ConnectorResult<PagerDutyIncident>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live PagerDuty connector not yet implemented",
    });
  }

  async updateIncident(): Promise<ConnectorResult<PagerDutyIncident>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live PagerDuty connector not yet implemented",
    });
  }

  async acknowledgeIncident(): Promise<ConnectorResult<PagerDutyIncident>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live PagerDuty connector not yet implemented",
    });
  }

  async resolveIncident(): Promise<ConnectorResult<PagerDutyIncident>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live PagerDuty connector not yet implemented",
    });
  }

  async addIncidentNote(): Promise<
    ConnectorResult<{ id: string; content: string; createdAt: string }>
  > {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live PagerDuty connector not yet implemented",
    });
  }

  async getIncidentAlerts(): Promise<ConnectorResult<PagerDutyAlert[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live PagerDuty connector not yet implemented",
    });
  }

  async getIncidentTimeline(): Promise<ConnectorResult<PagerDutyLogEntry[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live PagerDuty connector not yet implemented",
    });
  }

  async listServices(): Promise<
    ConnectorResult<{ services: PagerDutyService[]; total: number }>
  > {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live PagerDuty connector not yet implemented",
    });
  }

  async getService(): Promise<ConnectorResult<PagerDutyService>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live PagerDuty connector not yet implemented",
    });
  }

  async listTeams(): Promise<
    ConnectorResult<{ teams: PagerDutyTeam[]; total: number }>
  > {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live PagerDuty connector not yet implemented",
    });
  }

  async listUsers(): Promise<
    ConnectorResult<{ users: PagerDutyUser[]; total: number }>
  > {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live PagerDuty connector not yet implemented",
    });
  }

  async getUser(): Promise<ConnectorResult<PagerDutyUser>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live PagerDuty connector not yet implemented",
    });
  }

  async listEscalationPolicies(): Promise<
    ConnectorResult<{
      escalationPolicies: PagerDutyEscalationPolicy[];
      total: number;
    }>
  > {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live PagerDuty connector not yet implemented",
    });
  }

  async getEscalationPolicy(): Promise<
    ConnectorResult<PagerDutyEscalationPolicy>
  > {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live PagerDuty connector not yet implemented",
    });
  }

  async listOnCalls(): Promise<ConnectorResult<PagerDutyOnCall[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live PagerDuty connector not yet implemented",
    });
  }

  async getCurrentOnCall(): Promise<ConnectorResult<PagerDutyUser[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live PagerDuty connector not yet implemented",
    });
  }

  async listSchedules(): Promise<
    ConnectorResult<{ schedules: PagerDutySchedule[]; total: number }>
  > {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live PagerDuty connector not yet implemented",
    });
  }

  async getSchedule(): Promise<ConnectorResult<PagerDutySchedule>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live PagerDuty connector not yet implemented",
    });
  }

  async listPriorities(): Promise<ConnectorResult<PagerDutyPriority[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live PagerDuty connector not yet implemented",
    });
  }
}
