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
// Jira Types
// ============================================================================

export interface JiraIssue {
  id: string;
  key: string;
  summary: string;
  description: string | null;
  status: JiraStatus;
  priority: JiraPriority;
  issueType: JiraIssueType;
  assignee: JiraUser | null;
  reporter: JiraUser;
  labels: string[];
  components: JiraComponent[];
  project: JiraProject;
  createdAt: string;
  updatedAt: string;
  resolution: JiraResolution | null;
  dueDate: string | null;
  storyPoints: number | null;
  sprint: JiraSprint | null;
  parentKey: string | null;
  subtasks: JiraIssueLink[];
  linkedIssues: JiraIssueLink[];
  comments: JiraComment[];
}

export interface JiraStatus {
  id: string;
  name: string;
  category: "todo" | "in_progress" | "done";
}

export interface JiraPriority {
  id: string;
  name: string;
  iconUrl: string;
}

export interface JiraIssueType {
  id: string;
  name: string;
  subtask: boolean;
  iconUrl: string;
}

export interface JiraUser {
  accountId: string;
  displayName: string;
  emailAddress: string;
  avatarUrl: string;
  active: boolean;
}

export interface JiraComponent {
  id: string;
  name: string;
  description: string | null;
}

export interface JiraProject {
  id: string;
  key: string;
  name: string;
  projectTypeKey: "software" | "service_desk" | "business";
}

export interface JiraResolution {
  id: string;
  name: string;
  description: string;
}

export interface JiraSprint {
  id: number;
  name: string;
  state: "active" | "closed" | "future";
  startDate: string | null;
  endDate: string | null;
}

export interface JiraIssueLink {
  id: string;
  key: string;
  summary: string;
  type: string;
  direction: "inward" | "outward";
}

export interface JiraComment {
  id: string;
  body: string;
  author: JiraUser;
  createdAt: string;
  updatedAt: string;
}

export interface JiraBoard {
  id: number;
  name: string;
  type: "scrum" | "kanban";
  projectKey: string;
}

export interface JiraSearchResult {
  issues: JiraIssue[];
  total: number;
  startAt: number;
  maxResults: number;
}

// ============================================================================
// Connector Configuration
// ============================================================================

export interface JiraConnectorConfig extends BaseConnectorConfig {
  /** Jira site URL (e.g., https://your-domain.atlassian.net) */
  siteUrl?: string;
  /** API token for authentication */
  apiToken?: string;
  /** User email for authentication */
  userEmail?: string;
  /** Default project key */
  projectKey?: string;
}

// ============================================================================
// Connector Interface
// ============================================================================

export interface JiraConnector extends BaseConnector {
  // Issue operations
  listIssues(options?: {
    projectKey?: string;
    status?: string;
    assignee?: string;
    labels?: string[];
    maxResults?: number;
    startAt?: number;
  }): Promise<ConnectorResult<JiraSearchResult>>;

  getIssue(issueKey: string): Promise<ConnectorResult<JiraIssue>>;

  createIssue(input: {
    projectKey: string;
    summary: string;
    description?: string;
    issueType: string;
    priority?: string;
    labels?: string[];
    components?: string[];
    assignee?: string;
    parentKey?: string;
    storyPoints?: number;
  }): Promise<ConnectorResult<JiraIssue>>;

  updateIssue(
    issueKey: string,
    input: {
      summary?: string;
      description?: string;
      status?: string;
      priority?: string;
      labels?: string[];
      assignee?: string;
      storyPoints?: number;
    },
  ): Promise<ConnectorResult<JiraIssue>>;

  transitionIssue(
    issueKey: string,
    transitionName: string,
  ): Promise<ConnectorResult<JiraIssue>>;

  addComment(
    issueKey: string,
    body: string,
  ): Promise<ConnectorResult<JiraComment>>;

  // Search
  searchIssues(
    jql: string,
    options?: {
      maxResults?: number;
      startAt?: number;
    },
  ): Promise<ConnectorResult<JiraSearchResult>>;

  // Board operations
  listBoards(options?: {
    projectKey?: string;
    type?: "scrum" | "kanban";
  }): Promise<ConnectorResult<JiraBoard[]>>;

  getSprintIssues(sprintId: number): Promise<ConnectorResult<JiraIssue[]>>;

  // Project operations
  listProjects(): Promise<ConnectorResult<JiraProject[]>>;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createJiraConnector(
  config: JiraConnectorConfig,
): JiraConnector {
  if (config.mode === "mock") {
    return new MockJiraConnector(config);
  }
  return new LiveJiraConnector(config);
}

// ============================================================================
// Mock Implementation
// ============================================================================

class MockJiraConnector implements JiraConnector {
  readonly name = "jira";
  readonly mode = "mock" as const;
  private _isInitialized = false;

  private issues: JiraIssue[] = [];
  private projects: JiraProject[] = [];
  private boards: JiraBoard[] = [];
  private sprints: JiraSprint[] = [];
  private nextIssueNum = 1;
  private nextCommentId = 1;

  constructor(private config: JiraConnectorConfig) {
    this.seedMockData();
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  private seedMockData(): void {
    const now = new Date().toISOString();
    const weekAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();
    const twoWeeksFromNow = new Date(
      Date.now() + 14 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const mockUser: JiraUser = {
      accountId: "user-001",
      displayName: "Alice Developer",
      emailAddress: "alice@example.com",
      avatarUrl: "https://avatar.example.com/alice.png",
      active: true,
    };

    const mockUser2: JiraUser = {
      accountId: "user-002",
      displayName: "Bob Engineer",
      emailAddress: "bob@example.com",
      avatarUrl: "https://avatar.example.com/bob.png",
      active: true,
    };

    this.projects = [
      {
        id: "10001",
        key: "DEMO",
        name: "Demo Project",
        projectTypeKey: "software",
      },
      {
        id: "10002",
        key: "SDK",
        name: "SDK Development",
        projectTypeKey: "software",
      },
      {
        id: "10003",
        key: "SUP",
        name: "Support",
        projectTypeKey: "service_desk",
      },
    ];

    this.boards = [
      { id: 1, name: "DEMO Board", type: "scrum", projectKey: "DEMO" },
      { id: 2, name: "SDK Kanban", type: "kanban", projectKey: "SDK" },
    ];

    this.sprints = [
      {
        id: 1,
        name: "Sprint 1",
        state: "closed",
        startDate: weekAgo,
        endDate: now,
      },
      {
        id: 2,
        name: "Sprint 2",
        state: "active",
        startDate: now,
        endDate: twoWeeksFromNow,
      },
      {
        id: 3,
        name: "Sprint 3",
        state: "future",
        startDate: null,
        endDate: null,
      },
    ];

    const statuses: Record<string, JiraStatus> = {
      todo: { id: "1", name: "To Do", category: "todo" },
      inProgress: { id: "2", name: "In Progress", category: "in_progress" },
      review: { id: "3", name: "In Review", category: "in_progress" },
      done: { id: "4", name: "Done", category: "done" },
    };

    const priorities: Record<string, JiraPriority> = {
      highest: {
        id: "1",
        name: "Highest",
        iconUrl: "https://jira.example.com/highest.svg",
      },
      high: {
        id: "2",
        name: "High",
        iconUrl: "https://jira.example.com/high.svg",
      },
      medium: {
        id: "3",
        name: "Medium",
        iconUrl: "https://jira.example.com/medium.svg",
      },
      low: {
        id: "4",
        name: "Low",
        iconUrl: "https://jira.example.com/low.svg",
      },
    };

    const issueTypes: Record<string, JiraIssueType> = {
      story: {
        id: "10001",
        name: "Story",
        subtask: false,
        iconUrl: "https://jira.example.com/story.svg",
      },
      bug: {
        id: "10002",
        name: "Bug",
        subtask: false,
        iconUrl: "https://jira.example.com/bug.svg",
      },
      task: {
        id: "10003",
        name: "Task",
        subtask: false,
        iconUrl: "https://jira.example.com/task.svg",
      },
      epic: {
        id: "10004",
        name: "Epic",
        subtask: false,
        iconUrl: "https://jira.example.com/epic.svg",
      },
      subtask: {
        id: "10005",
        name: "Sub-task",
        subtask: true,
        iconUrl: "https://jira.example.com/subtask.svg",
      },
    };

    this.issues = [
      {
        id: "10001",
        key: "DEMO-1",
        summary: "Implement user authentication",
        description:
          "Add OAuth2 authentication flow with GitHub and Google providers.",
        status: statuses.inProgress,
        priority: priorities.high,
        issueType: issueTypes.story,
        assignee: mockUser,
        reporter: mockUser2,
        labels: ["authentication", "security"],
        components: [
          { id: "1", name: "Backend", description: "Backend services" },
        ],
        project: this.projects[0],
        createdAt: weekAgo,
        updatedAt: now,
        resolution: null,
        dueDate: twoWeeksFromNow,
        storyPoints: 8,
        sprint: this.sprints[1],
        parentKey: null,
        subtasks: [
          {
            id: "10004",
            key: "DEMO-4",
            summary: "Setup OAuth providers",
            type: "subtask",
            direction: "outward",
          },
        ],
        linkedIssues: [],
        comments: [
          {
            id: "1",
            body: "Started working on the OAuth flow. Will have a draft PR by EOD.",
            author: mockUser,
            createdAt: now,
            updatedAt: now,
          },
        ],
      },
      {
        id: "10002",
        key: "DEMO-2",
        summary: "Fix memory leak in data processor",
        description:
          "Memory usage keeps growing when processing large datasets. Need to investigate and fix.",
        status: statuses.todo,
        priority: priorities.highest,
        issueType: issueTypes.bug,
        assignee: mockUser2,
        reporter: mockUser,
        labels: ["bug", "performance"],
        components: [
          {
            id: "2",
            name: "Data Processing",
            description: "Data processing pipeline",
          },
        ],
        project: this.projects[0],
        createdAt: weekAgo,
        updatedAt: weekAgo,
        resolution: null,
        dueDate: now,
        storyPoints: 5,
        sprint: this.sprints[1],
        parentKey: null,
        subtasks: [],
        linkedIssues: [],
        comments: [],
      },
      {
        id: "10003",
        key: "DEMO-3",
        summary: "Update documentation for API v2",
        description:
          "Document all new endpoints and breaking changes in API v2.",
        status: statuses.done,
        priority: priorities.medium,
        issueType: issueTypes.task,
        assignee: mockUser,
        reporter: mockUser,
        labels: ["documentation"],
        components: [],
        project: this.projects[0],
        createdAt: weekAgo,
        updatedAt: now,
        resolution: {
          id: "1",
          name: "Done",
          description: "Work has been completed",
        },
        dueDate: null,
        storyPoints: 3,
        sprint: this.sprints[0],
        parentKey: null,
        subtasks: [],
        linkedIssues: [],
        comments: [],
      },
      {
        id: "10004",
        key: "DEMO-4",
        summary: "Setup OAuth providers",
        description: "Configure GitHub and Google OAuth apps.",
        status: statuses.review,
        priority: priorities.high,
        issueType: issueTypes.subtask,
        assignee: mockUser,
        reporter: mockUser,
        labels: [],
        components: [],
        project: this.projects[0],
        createdAt: now,
        updatedAt: now,
        resolution: null,
        dueDate: null,
        storyPoints: null,
        sprint: this.sprints[1],
        parentKey: "DEMO-1",
        subtasks: [],
        linkedIssues: [],
        comments: [],
      },
      {
        id: "10005",
        key: "SDK-1",
        summary: "Add TypeScript type definitions",
        description: "Create comprehensive TypeScript types for the SDK.",
        status: statuses.inProgress,
        priority: priorities.high,
        issueType: issueTypes.story,
        assignee: mockUser2,
        reporter: mockUser,
        labels: ["typescript", "dx"],
        components: [],
        project: this.projects[1],
        createdAt: weekAgo,
        updatedAt: now,
        resolution: null,
        dueDate: twoWeeksFromNow,
        storyPoints: 5,
        sprint: null,
        parentKey: null,
        subtasks: [],
        linkedIssues: [
          {
            id: "10001",
            key: "DEMO-1",
            summary: "Implement user authentication",
            type: "blocks",
            direction: "outward",
          },
        ],
        comments: [],
      },
    ];

    this.nextIssueNum = 6;
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
        issueCount: this.issues.length,
        projectCount: this.projects.length,
      },
    });
  }

  async listIssues(options?: {
    projectKey?: string;
    status?: string;
    assignee?: string;
    labels?: string[];
    maxResults?: number;
    startAt?: number;
  }): Promise<ConnectorResult<JiraSearchResult>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    let filtered = [...this.issues];

    if (options?.projectKey) {
      filtered = filtered.filter((i) => i.project.key === options.projectKey);
    }
    if (options?.status) {
      filtered = filtered.filter(
        (i) => i.status.name.toLowerCase() === options.status!.toLowerCase(),
      );
    }
    if (options?.assignee) {
      filtered = filtered.filter(
        (i) =>
          i.assignee?.accountId === options.assignee ||
          i.assignee?.displayName === options.assignee,
      );
    }
    if (options?.labels?.length) {
      filtered = filtered.filter((i) =>
        options.labels!.some((l) => i.labels.includes(l)),
      );
    }

    const startAt = options?.startAt ?? 0;
    const maxResults = options?.maxResults ?? 50;
    const paged = filtered.slice(startAt, startAt + maxResults);

    return success({
      issues: paged,
      total: filtered.length,
      startAt,
      maxResults,
    });
  }

  async getIssue(issueKey: string): Promise<ConnectorResult<JiraIssue>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const issue = this.issues.find((i) => i.key === issueKey);
    if (!issue) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Issue ${issueKey} not found`,
      });
    }

    return success(issue);
  }

  async createIssue(input: {
    projectKey: string;
    summary: string;
    description?: string;
    issueType: string;
    priority?: string;
    labels?: string[];
    components?: string[];
    assignee?: string;
    parentKey?: string;
    storyPoints?: number;
  }): Promise<ConnectorResult<JiraIssue>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const project = this.projects.find((p) => p.key === input.projectKey);
    if (!project) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Project ${input.projectKey} not found`,
      });
    }

    const now = new Date().toISOString();
    const mockUser: JiraUser = {
      accountId: "user-001",
      displayName: "Alice Developer",
      emailAddress: "alice@example.com",
      avatarUrl: "https://avatar.example.com/alice.png",
      active: true,
    };

    const issueKey = `${input.projectKey}-${this.nextIssueNum}`;
    const newIssue: JiraIssue = {
      id: `1000${this.nextIssueNum}`,
      key: issueKey,
      summary: input.summary,
      description: input.description ?? null,
      status: { id: "1", name: "To Do", category: "todo" },
      priority: {
        id: "3",
        name: input.priority ?? "Medium",
        iconUrl: "https://jira.example.com/medium.svg",
      },
      issueType: {
        id: "10003",
        name: input.issueType,
        subtask: input.issueType === "Sub-task",
        iconUrl: "https://jira.example.com/task.svg",
      },
      assignee: input.assignee
        ? { ...mockUser, displayName: input.assignee }
        : null,
      reporter: mockUser,
      labels: input.labels ?? [],
      components: (input.components ?? []).map((name, idx) => ({
        id: String(100 + idx),
        name,
        description: null,
      })),
      project,
      createdAt: now,
      updatedAt: now,
      resolution: null,
      dueDate: null,
      storyPoints: input.storyPoints ?? null,
      sprint: null,
      parentKey: input.parentKey ?? null,
      subtasks: [],
      linkedIssues: [],
      comments: [],
    };

    this.issues.push(newIssue);
    this.nextIssueNum++;

    return success(newIssue);
  }

  async updateIssue(
    issueKey: string,
    input: {
      summary?: string;
      description?: string;
      status?: string;
      priority?: string;
      labels?: string[];
      assignee?: string;
      storyPoints?: number;
    },
  ): Promise<ConnectorResult<JiraIssue>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const issue = this.issues.find((i) => i.key === issueKey);
    if (!issue) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Issue ${issueKey} not found`,
      });
    }

    if (input.summary !== undefined) issue.summary = input.summary;
    if (input.description !== undefined) issue.description = input.description;
    if (input.status !== undefined) {
      const category = input.status.toLowerCase().includes("done")
        ? "done"
        : input.status.toLowerCase().includes("progress")
          ? "in_progress"
          : "todo";
      issue.status = { id: "1", name: input.status, category };
    }
    if (input.priority !== undefined) {
      issue.priority = {
        id: "1",
        name: input.priority,
        iconUrl: "https://jira.example.com/priority.svg",
      };
    }
    if (input.labels !== undefined) issue.labels = input.labels;
    if (input.assignee !== undefined) {
      issue.assignee = input.assignee
        ? {
            accountId: "user-new",
            displayName: input.assignee,
            emailAddress: `${input.assignee.toLowerCase().replace(" ", ".")}@example.com`,
            avatarUrl: "https://avatar.example.com/user.png",
            active: true,
          }
        : null;
    }
    if (input.storyPoints !== undefined) issue.storyPoints = input.storyPoints;
    issue.updatedAt = new Date().toISOString();

    return success(issue);
  }

  async transitionIssue(
    issueKey: string,
    transitionName: string,
  ): Promise<ConnectorResult<JiraIssue>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const issue = this.issues.find((i) => i.key === issueKey);
    if (!issue) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Issue ${issueKey} not found`,
      });
    }

    const transitionMap: Record<string, JiraStatus> = {
      "start progress": {
        id: "2",
        name: "In Progress",
        category: "in_progress",
      },
      "in progress": { id: "2", name: "In Progress", category: "in_progress" },
      "submit for review": {
        id: "3",
        name: "In Review",
        category: "in_progress",
      },
      "in review": { id: "3", name: "In Review", category: "in_progress" },
      done: { id: "4", name: "Done", category: "done" },
      complete: { id: "4", name: "Done", category: "done" },
      reopen: { id: "1", name: "To Do", category: "todo" },
      "to do": { id: "1", name: "To Do", category: "todo" },
    };

    const newStatus = transitionMap[transitionName.toLowerCase()];
    if (!newStatus) {
      return failure({
        code: ErrorCodes.VALIDATION_ERROR,
        message: `Invalid transition: ${transitionName}`,
      });
    }

    issue.status = newStatus;
    if (newStatus.category === "done") {
      issue.resolution = {
        id: "1",
        name: "Done",
        description: "Work has been completed",
      };
    } else {
      issue.resolution = null;
    }
    issue.updatedAt = new Date().toISOString();

    return success(issue);
  }

  async addComment(
    issueKey: string,
    body: string,
  ): Promise<ConnectorResult<JiraComment>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const issue = this.issues.find((i) => i.key === issueKey);
    if (!issue) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Issue ${issueKey} not found`,
      });
    }

    const now = new Date().toISOString();
    const mockUser: JiraUser = {
      accountId: "user-001",
      displayName: "Alice Developer",
      emailAddress: "alice@example.com",
      avatarUrl: "https://avatar.example.com/alice.png",
      active: true,
    };

    const comment: JiraComment = {
      id: String(this.nextCommentId++),
      body,
      author: mockUser,
      createdAt: now,
      updatedAt: now,
    };

    issue.comments.push(comment);
    issue.updatedAt = now;

    return success(comment);
  }

  async searchIssues(
    jql: string,
    options?: {
      maxResults?: number;
      startAt?: number;
    },
  ): Promise<ConnectorResult<JiraSearchResult>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    // Simple JQL parsing for mock - supports basic conditions
    let filtered = [...this.issues];
    const jqlLower = jql.toLowerCase();

    // Parse project = "XXX"
    const projectMatch = jqlLower.match(/project\s*=\s*["']?(\w+)["']?/);
    if (projectMatch) {
      const projectKey = projectMatch[1].toUpperCase();
      filtered = filtered.filter((i) => i.project.key === projectKey);
    }

    // Parse status = "XXX"
    const statusMatch = jqlLower.match(/status\s*=\s*["']?([^"']+)["']?/);
    if (statusMatch) {
      const status = statusMatch[1].toLowerCase();
      filtered = filtered.filter((i) =>
        i.status.name.toLowerCase().includes(status),
      );
    }

    // Parse assignee = "XXX"
    const assigneeMatch = jqlLower.match(/assignee\s*=\s*["']?([^"']+)["']?/);
    if (assigneeMatch) {
      const assignee = assigneeMatch[1].toLowerCase();
      if (assignee === "currentuser()") {
        filtered = filtered.filter((i) => i.assignee !== null);
      } else {
        filtered = filtered.filter((i) =>
          i.assignee?.displayName.toLowerCase().includes(assignee),
        );
      }
    }

    // Parse labels in (xxx, yyy)
    const labelsMatch = jqlLower.match(/labels\s+in\s*\(([^)]+)\)/);
    if (labelsMatch) {
      const labels = labelsMatch[1]
        .split(",")
        .map((l) => l.trim().replace(/["']/g, ""));
      filtered = filtered.filter((i) =>
        labels.some((l) => i.labels.includes(l)),
      );
    }

    // Parse priority = "XXX"
    const priorityMatch = jqlLower.match(/priority\s*=\s*["']?(\w+)["']?/);
    if (priorityMatch) {
      const priority = priorityMatch[1].toLowerCase();
      filtered = filtered.filter(
        (i) => i.priority.name.toLowerCase() === priority,
      );
    }

    // Parse ORDER BY
    const orderMatch = jqlLower.match(/order\s+by\s+(\w+)\s*(asc|desc)?/);
    if (orderMatch) {
      const field = orderMatch[1];
      const direction = orderMatch[2] === "asc" ? 1 : -1;
      filtered.sort((a, b) => {
        if (field === "created" || field === "createdat") {
          return (
            direction *
            (new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime())
          );
        }
        if (field === "updated" || field === "updatedat") {
          return (
            direction *
            (new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime())
          );
        }
        if (field === "priority") {
          const priorityOrder: Record<string, number> = {
            highest: 1,
            high: 2,
            medium: 3,
            low: 4,
          };
          return (
            direction *
            ((priorityOrder[a.priority.name.toLowerCase()] ?? 5) -
              (priorityOrder[b.priority.name.toLowerCase()] ?? 5))
          );
        }
        return 0;
      });
    }

    const startAt = options?.startAt ?? 0;
    const maxResults = options?.maxResults ?? 50;
    const paged = filtered.slice(startAt, startAt + maxResults);

    return success({
      issues: paged,
      total: filtered.length,
      startAt,
      maxResults,
    });
  }

  async listBoards(options?: {
    projectKey?: string;
    type?: "scrum" | "kanban";
  }): Promise<ConnectorResult<JiraBoard[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    let filtered = [...this.boards];
    if (options?.projectKey) {
      filtered = filtered.filter((b) => b.projectKey === options.projectKey);
    }
    if (options?.type) {
      filtered = filtered.filter((b) => b.type === options.type);
    }

    return success(filtered);
  }

  async getSprintIssues(
    sprintId: number,
  ): Promise<ConnectorResult<JiraIssue[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const sprint = this.sprints.find((s) => s.id === sprintId);
    if (!sprint) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Sprint ${sprintId} not found`,
      });
    }

    const issues = this.issues.filter((i) => i.sprint?.id === sprintId);
    return success(issues);
  }

  async listProjects(): Promise<ConnectorResult<JiraProject[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    return success([...this.projects]);
  }
}

// ============================================================================
// Live Implementation (Stub)
// ============================================================================

class LiveJiraConnector implements JiraConnector {
  readonly name = "jira";
  readonly mode = "live" as const;
  private _isInitialized = false;

  constructor(private config: JiraConnectorConfig) {}

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async initialize(): Promise<ConnectorResult<void>> {
    if (
      !this.config.siteUrl ||
      !this.config.apiToken ||
      !this.config.userEmail
    ) {
      return failure({
        code: ErrorCodes.AUTH_REQUIRED,
        message:
          "Jira site URL, API token, and user email are required for live mode",
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
      message: "Live Jira connector not yet implemented",
    });
  }

  async listIssues(): Promise<ConnectorResult<JiraSearchResult>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Jira connector not yet implemented",
    });
  }

  async getIssue(): Promise<ConnectorResult<JiraIssue>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Jira connector not yet implemented",
    });
  }

  async createIssue(): Promise<ConnectorResult<JiraIssue>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Jira connector not yet implemented",
    });
  }

  async updateIssue(): Promise<ConnectorResult<JiraIssue>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Jira connector not yet implemented",
    });
  }

  async transitionIssue(): Promise<ConnectorResult<JiraIssue>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Jira connector not yet implemented",
    });
  }

  async addComment(): Promise<ConnectorResult<JiraComment>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Jira connector not yet implemented",
    });
  }

  async searchIssues(): Promise<ConnectorResult<JiraSearchResult>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Jira connector not yet implemented",
    });
  }

  async listBoards(): Promise<ConnectorResult<JiraBoard[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Jira connector not yet implemented",
    });
  }

  async getSprintIssues(): Promise<ConnectorResult<JiraIssue[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Jira connector not yet implemented",
    });
  }

  async listProjects(): Promise<ConnectorResult<JiraProject[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Jira connector not yet implemented",
    });
  }
}
