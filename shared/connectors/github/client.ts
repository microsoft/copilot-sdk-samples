import {
  BaseConnector,
  BaseConnectorConfig,
  ConnectorResult,
  HealthCheckResponse,
  success,
  failure,
  ErrorCodes,
} from "../types.js";

export interface GitHubIssue {
  id: number;
  number: number;
  title: string;
  body: string | null;
  state: "open" | "closed";
  labels: GitHubLabel[];
  assignees: GitHubUser[];
  createdAt: string;
  updatedAt: string;
  author: GitHubUser;
}

export interface GitHubLabel {
  id: number;
  name: string;
  color: string;
  description: string | null;
}

export interface GitHubUser {
  id: number;
  login: string;
  avatarUrl: string;
}

export interface GitHubRepository {
  id: number;
  name: string;
  fullName: string;
  description: string | null;
  private: boolean;
  owner: GitHubUser;
}

export interface GitHubSecurityAlert {
  id: number;
  state: "open" | "dismissed" | "fixed";
  severity: "critical" | "high" | "medium" | "low";
  package: {
    name: string;
    ecosystem: string;
  };
  vulnerableVersionRange: string;
  patchedVersions: string | null;
  createdAt: string;
}

export interface GitHubConnectorConfig extends BaseConnectorConfig {
  token?: string;
  owner?: string;
  repo?: string;
}

export interface GitHubConnector extends BaseConnector {
  listIssues(options?: {
    state?: "open" | "closed" | "all";
    labels?: string[];
    limit?: number;
  }): Promise<ConnectorResult<GitHubIssue[]>>;

  getIssue(issueNumber: number): Promise<ConnectorResult<GitHubIssue>>;

  createIssue(input: {
    title: string;
    body?: string;
    labels?: string[];
    assignees?: string[];
  }): Promise<ConnectorResult<GitHubIssue>>;

  updateIssue(
    issueNumber: number,
    input: {
      title?: string;
      body?: string;
      state?: "open" | "closed";
      labels?: string[];
      assignees?: string[];
    },
  ): Promise<ConnectorResult<GitHubIssue>>;

  addLabels(
    issueNumber: number,
    labels: string[],
  ): Promise<ConnectorResult<GitHubLabel[]>>;

  listSecurityAlerts(options?: {
    state?: "open" | "dismissed" | "fixed";
    severity?: "critical" | "high" | "medium" | "low";
    limit?: number;
  }): Promise<ConnectorResult<GitHubSecurityAlert[]>>;
}

export function createGitHubConnector(
  config: GitHubConnectorConfig,
): GitHubConnector {
  if (config.mode === "mock") {
    return new MockGitHubConnector(config);
  }
  return new LiveGitHubConnector(config);
}

class MockGitHubConnector implements GitHubConnector {
  readonly name = "github";
  readonly mode = "mock" as const;
  private _isInitialized = false;

  private issues: GitHubIssue[] = [];
  private alerts: GitHubSecurityAlert[] = [];
  private nextIssueId = 1;

  constructor(private config: GitHubConnectorConfig) {
    this.seedMockData();
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  private seedMockData(): void {
    const now = new Date().toISOString();
    const mockUser: GitHubUser = {
      id: 1,
      login: "mock-user",
      avatarUrl: "https://github.com/identicons/mock-user.png",
    };

    this.issues = [
      {
        id: 1,
        number: 1,
        title: "[Bug] Application crashes on startup",
        body: "The application crashes when I try to start it.",
        state: "open",
        labels: [
          {
            id: 1,
            name: "bug",
            color: "d73a4a",
            description: "Something isn't working",
          },
        ],
        assignees: [],
        createdAt: now,
        updatedAt: now,
        author: mockUser,
      },
      {
        id: 2,
        number: 2,
        title: "[Feature] Add dark mode support",
        body: "It would be great to have a dark mode option.",
        state: "open",
        labels: [
          {
            id: 2,
            name: "enhancement",
            color: "a2eeef",
            description: "New feature or request",
          },
        ],
        assignees: [mockUser],
        createdAt: now,
        updatedAt: now,
        author: mockUser,
      },
      {
        id: 3,
        number: 3,
        title: "Update dependencies",
        body: null,
        state: "closed",
        labels: [
          { id: 3, name: "dependencies", color: "0366d6", description: null },
        ],
        assignees: [],
        createdAt: now,
        updatedAt: now,
        author: mockUser,
      },
    ];
    this.nextIssueId = 4;

    this.alerts = [
      {
        id: 1,
        state: "open",
        severity: "critical",
        package: { name: "lodash", ecosystem: "npm" },
        vulnerableVersionRange: "< 4.17.21",
        patchedVersions: "4.17.21",
        createdAt: now,
      },
      {
        id: 2,
        state: "open",
        severity: "high",
        package: { name: "axios", ecosystem: "npm" },
        vulnerableVersionRange: "< 1.6.0",
        patchedVersions: "1.6.0",
        createdAt: now,
      },
      {
        id: 3,
        state: "dismissed",
        severity: "medium",
        package: { name: "express", ecosystem: "npm" },
        vulnerableVersionRange: "< 4.18.0",
        patchedVersions: "4.18.0",
        createdAt: now,
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
      details: { mode: "mock", issueCount: this.issues.length },
    });
  }

  async listIssues(options?: {
    state?: "open" | "closed" | "all";
    labels?: string[];
    limit?: number;
  }): Promise<ConnectorResult<GitHubIssue[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    let filtered = [...this.issues];

    if (options?.state && options.state !== "all") {
      filtered = filtered.filter((i) => i.state === options.state);
    }

    if (options?.labels?.length) {
      filtered = filtered.filter((i) =>
        i.labels.some((l) => options.labels!.includes(l.name)),
      );
    }

    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return success(filtered);
  }

  async getIssue(issueNumber: number): Promise<ConnectorResult<GitHubIssue>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const issue = this.issues.find((i) => i.number === issueNumber);
    if (!issue) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Issue #${issueNumber} not found`,
      });
    }
    return success(issue);
  }

  async createIssue(input: {
    title: string;
    body?: string;
    labels?: string[];
    assignees?: string[];
  }): Promise<ConnectorResult<GitHubIssue>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const now = new Date().toISOString();
    const mockUser: GitHubUser = { id: 1, login: "mock-user", avatarUrl: "" };

    const newIssue: GitHubIssue = {
      id: this.nextIssueId,
      number: this.nextIssueId,
      title: input.title,
      body: input.body ?? null,
      state: "open",
      labels: (input.labels ?? []).map((name, idx) => ({
        id: 100 + idx,
        name,
        color: "ededed",
        description: null,
      })),
      assignees: (input.assignees ?? []).map((login, idx) => ({
        id: 200 + idx,
        login,
        avatarUrl: "",
      })),
      createdAt: now,
      updatedAt: now,
      author: mockUser,
    };

    this.issues.push(newIssue);
    this.nextIssueId++;

    return success(newIssue);
  }

  async updateIssue(
    issueNumber: number,
    input: {
      title?: string;
      body?: string;
      state?: "open" | "closed";
      labels?: string[];
      assignees?: string[];
    },
  ): Promise<ConnectorResult<GitHubIssue>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const issue = this.issues.find((i) => i.number === issueNumber);
    if (!issue) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Issue #${issueNumber} not found`,
      });
    }

    if (input.title !== undefined) issue.title = input.title;
    if (input.body !== undefined) issue.body = input.body;
    if (input.state !== undefined) issue.state = input.state;
    if (input.labels !== undefined) {
      issue.labels = input.labels.map((name, idx) => ({
        id: 100 + idx,
        name,
        color: "ededed",
        description: null,
      }));
    }
    if (input.assignees !== undefined) {
      issue.assignees = input.assignees.map((login, idx) => ({
        id: 200 + idx,
        login,
        avatarUrl: "",
      }));
    }
    issue.updatedAt = new Date().toISOString();

    return success(issue);
  }

  async addLabels(
    issueNumber: number,
    labels: string[],
  ): Promise<ConnectorResult<GitHubLabel[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const issue = this.issues.find((i) => i.number === issueNumber);
    if (!issue) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Issue #${issueNumber} not found`,
      });
    }

    const existingNames = new Set(issue.labels.map((l) => l.name));
    const newLabels: GitHubLabel[] = labels
      .filter((name) => !existingNames.has(name))
      .map((name, idx) => ({
        id: 300 + idx,
        name,
        color: "ededed",
        description: null,
      }));

    issue.labels.push(...newLabels);
    issue.updatedAt = new Date().toISOString();

    return success(issue.labels);
  }

  async listSecurityAlerts(options?: {
    state?: "open" | "dismissed" | "fixed";
    severity?: "critical" | "high" | "medium" | "low";
    limit?: number;
  }): Promise<ConnectorResult<GitHubSecurityAlert[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    let filtered = [...this.alerts];

    if (options?.state) {
      filtered = filtered.filter((a) => a.state === options.state);
    }
    if (options?.severity) {
      filtered = filtered.filter((a) => a.severity === options.severity);
    }
    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return success(filtered);
  }
}

class LiveGitHubConnector implements GitHubConnector {
  readonly name = "github";
  readonly mode = "live" as const;
  private _isInitialized = false;

  constructor(private config: GitHubConnectorConfig) {}

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async initialize(): Promise<ConnectorResult<void>> {
    if (!this.config.token) {
      return failure({
        code: ErrorCodes.AUTH_REQUIRED,
        message: "GitHub token is required for live mode",
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
      message: "Live GitHub connector not yet implemented",
    });
  }

  async listIssues(): Promise<ConnectorResult<GitHubIssue[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live GitHub connector not yet implemented",
    });
  }

  async getIssue(): Promise<ConnectorResult<GitHubIssue>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live GitHub connector not yet implemented",
    });
  }

  async createIssue(): Promise<ConnectorResult<GitHubIssue>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live GitHub connector not yet implemented",
    });
  }

  async updateIssue(): Promise<ConnectorResult<GitHubIssue>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live GitHub connector not yet implemented",
    });
  }

  async addLabels(): Promise<ConnectorResult<GitHubLabel[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live GitHub connector not yet implemented",
    });
  }

  async listSecurityAlerts(): Promise<ConnectorResult<GitHubSecurityAlert[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live GitHub connector not yet implemented",
    });
  }
}
