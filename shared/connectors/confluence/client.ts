import {
  BaseConnector,
  BaseConnectorConfig,
  ConnectorResult,
  HealthCheckResponse,
  success,
  failure,
  ErrorCodes,
} from "../types.js";

export interface ConfluencePage {
  id: string;
  title: string;
  spaceKey: string;
  status: "current" | "draft" | "archived";
  body: ConfluenceBody;
  version: ConfluenceVersion;
  ancestors: ConfluencePageAncestor[];
  children: ConfluencePageChild[];
  createdBy: ConfluenceUser;
  createdAt: string;
  lastModifiedBy: ConfluenceUser;
  lastModifiedAt: string;
  labels: ConfluenceLabel[];
  webUrl: string;
}

export interface ConfluenceBody {
  storage: string;
  view?: string;
}

export interface ConfluenceVersion {
  number: number;
  message: string | null;
  createdAt: string;
}

export interface ConfluencePageAncestor {
  id: string;
  title: string;
}

export interface ConfluencePageChild {
  id: string;
  title: string;
  status: "current" | "draft" | "archived";
}

export interface ConfluenceUser {
  accountId: string;
  displayName: string;
  email: string;
  avatarUrl: string;
}

export interface ConfluenceLabel {
  id: string;
  name: string;
  prefix: string;
}

export interface ConfluenceSpace {
  id: string;
  key: string;
  name: string;
  description: string | null;
  type: "global" | "personal";
  status: "current" | "archived";
  homepage: ConfluencePageAncestor | null;
}

export interface ConfluenceSearchResult {
  results: ConfluencePage[];
  total: number;
  start: number;
  limit: number;
}

export interface ConfluenceComment {
  id: string;
  body: ConfluenceBody;
  author: ConfluenceUser;
  createdAt: string;
  updatedAt: string;
  parentCommentId: string | null;
}

export interface ConfluenceAttachment {
  id: string;
  title: string;
  mediaType: string;
  fileSize: number;
  downloadUrl: string;
  createdBy: ConfluenceUser;
  createdAt: string;
}

export interface ConfluenceConnectorConfig extends BaseConnectorConfig {
  siteUrl?: string;
  apiToken?: string;
  userEmail?: string;
  defaultSpaceKey?: string;
}

export interface ConfluenceConnector extends BaseConnector {
  listSpaces(options?: {
    type?: "global" | "personal";
    status?: "current" | "archived";
    limit?: number;
  }): Promise<ConnectorResult<ConfluenceSpace[]>>;

  getSpace(spaceKey: string): Promise<ConnectorResult<ConfluenceSpace>>;

  listPages(options?: {
    spaceKey?: string;
    status?: "current" | "draft" | "archived";
    title?: string;
    limit?: number;
    start?: number;
  }): Promise<ConnectorResult<ConfluenceSearchResult>>;

  getPage(pageId: string): Promise<ConnectorResult<ConfluencePage>>;

  getPageByTitle(
    spaceKey: string,
    title: string,
  ): Promise<ConnectorResult<ConfluencePage>>;

  createPage(input: {
    spaceKey: string;
    title: string;
    body: string;
    parentId?: string;
    status?: "current" | "draft";
  }): Promise<ConnectorResult<ConfluencePage>>;

  updatePage(
    pageId: string,
    input: {
      title?: string;
      body?: string;
      version: number;
      versionMessage?: string;
    },
  ): Promise<ConnectorResult<ConfluencePage>>;

  deletePage(pageId: string): Promise<ConnectorResult<void>>;

  searchPages(
    query: string,
    options?: {
      spaceKey?: string;
      limit?: number;
      start?: number;
    },
  ): Promise<ConnectorResult<ConfluenceSearchResult>>;

  getPageComments(
    pageId: string,
    options?: {
      limit?: number;
      start?: number;
    },
  ): Promise<ConnectorResult<ConfluenceComment[]>>;

  addPageComment(
    pageId: string,
    body: string,
    parentCommentId?: string,
  ): Promise<ConnectorResult<ConfluenceComment>>;

  getPageLabels(pageId: string): Promise<ConnectorResult<ConfluenceLabel[]>>;

  addPageLabel(
    pageId: string,
    labelName: string,
  ): Promise<ConnectorResult<ConfluenceLabel>>;

  removePageLabel(
    pageId: string,
    labelName: string,
  ): Promise<ConnectorResult<void>>;

  listPageAttachments(
    pageId: string,
    options?: {
      limit?: number;
      start?: number;
    },
  ): Promise<ConnectorResult<ConfluenceAttachment[]>>;
}

export function createConfluenceConnector(
  config: ConfluenceConnectorConfig,
): ConfluenceConnector {
  if (config.mode === "mock") {
    return new MockConfluenceConnector(config);
  }
  return new LiveConfluenceConnector(config);
}

class MockConfluenceConnector implements ConfluenceConnector {
  readonly name = "confluence";
  readonly mode = "mock" as const;
  private _isInitialized = false;

  private spaces: ConfluenceSpace[] = [];
  private pages: ConfluencePage[] = [];
  private comments: Map<string, ConfluenceComment[]> = new Map();
  private nextPageId = 1;
  private nextCommentId = 1;

  constructor(private config: ConfluenceConnectorConfig) {
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

    const mockUser: ConfluenceUser = {
      accountId: "user-001",
      displayName: "Alice Developer",
      email: "alice@example.com",
      avatarUrl: "https://avatar.example.com/alice.png",
    };

    const mockUser2: ConfluenceUser = {
      accountId: "user-002",
      displayName: "Bob Engineer",
      email: "bob@example.com",
      avatarUrl: "https://avatar.example.com/bob.png",
    };

    this.spaces = [
      {
        id: "space-001",
        key: "ENG",
        name: "Engineering",
        description: "Engineering team documentation",
        type: "global",
        status: "current",
        homepage: { id: "page-001", title: "Engineering Home" },
      },
      {
        id: "space-002",
        key: "PRODUCT",
        name: "Product",
        description: "Product documentation and specs",
        type: "global",
        status: "current",
        homepage: { id: "page-004", title: "Product Home" },
      },
      {
        id: "space-003",
        key: "~alice",
        name: "Alice's Space",
        description: null,
        type: "personal",
        status: "current",
        homepage: null,
      },
    ];

    this.pages = [
      {
        id: "page-001",
        title: "Engineering Home",
        spaceKey: "ENG",
        status: "current",
        body: {
          storage:
            "<h1>Welcome to Engineering</h1><p>This is the engineering team's documentation hub.</p>",
          view: "Welcome to Engineering\nThis is the engineering team's documentation hub.",
        },
        version: { number: 3, message: "Updated intro", createdAt: now },
        ancestors: [],
        children: [
          { id: "page-002", title: "Architecture Overview", status: "current" },
          {
            id: "page-003",
            title: "Development Guidelines",
            status: "current",
          },
        ],
        createdBy: mockUser,
        createdAt: weekAgo,
        lastModifiedBy: mockUser,
        lastModifiedAt: now,
        labels: [{ id: "label-001", name: "documentation", prefix: "global" }],
        webUrl: "https://example.atlassian.net/wiki/spaces/ENG/pages/page-001",
      },
      {
        id: "page-002",
        title: "Architecture Overview",
        spaceKey: "ENG",
        status: "current",
        body: {
          storage:
            "<h1>System Architecture</h1><p>Our system consists of several microservices...</p><h2>Components</h2><ul><li>API Gateway</li><li>Auth Service</li><li>Data Service</li></ul>",
          view: "System Architecture\nOur system consists of several microservices...\n\nComponents\n- API Gateway\n- Auth Service\n- Data Service",
        },
        version: { number: 5, message: "Added data service", createdAt: now },
        ancestors: [{ id: "page-001", title: "Engineering Home" }],
        children: [],
        createdBy: mockUser2,
        createdAt: weekAgo,
        lastModifiedBy: mockUser,
        lastModifiedAt: now,
        labels: [
          { id: "label-001", name: "documentation", prefix: "global" },
          { id: "label-002", name: "architecture", prefix: "global" },
        ],
        webUrl: "https://example.atlassian.net/wiki/spaces/ENG/pages/page-002",
      },
      {
        id: "page-003",
        title: "Development Guidelines",
        spaceKey: "ENG",
        status: "current",
        body: {
          storage:
            "<h1>Development Guidelines</h1><h2>Code Style</h2><p>Follow ESLint configuration...</p><h2>Testing</h2><p>Write tests for all new features...</p>",
          view: "Development Guidelines\n\nCode Style\nFollow ESLint configuration...\n\nTesting\nWrite tests for all new features...",
        },
        version: { number: 2, message: null, createdAt: weekAgo },
        ancestors: [{ id: "page-001", title: "Engineering Home" }],
        children: [],
        createdBy: mockUser,
        createdAt: weekAgo,
        lastModifiedBy: mockUser,
        lastModifiedAt: weekAgo,
        labels: [{ id: "label-003", name: "guidelines", prefix: "global" }],
        webUrl: "https://example.atlassian.net/wiki/spaces/ENG/pages/page-003",
      },
      {
        id: "page-004",
        title: "Product Home",
        spaceKey: "PRODUCT",
        status: "current",
        body: {
          storage:
            "<h1>Product Documentation</h1><p>Welcome to the product team's space.</p>",
          view: "Product Documentation\nWelcome to the product team's space.",
        },
        version: { number: 1, message: null, createdAt: weekAgo },
        ancestors: [],
        children: [{ id: "page-005", title: "Q1 Roadmap", status: "current" }],
        createdBy: mockUser2,
        createdAt: weekAgo,
        lastModifiedBy: mockUser2,
        lastModifiedAt: weekAgo,
        labels: [],
        webUrl:
          "https://example.atlassian.net/wiki/spaces/PRODUCT/pages/page-004",
      },
      {
        id: "page-005",
        title: "Q1 Roadmap",
        spaceKey: "PRODUCT",
        status: "current",
        body: {
          storage:
            "<h1>Q1 2025 Roadmap</h1><h2>Goals</h2><ul><li>Launch SDK v2</li><li>Add Jira integration</li><li>Improve performance</li></ul>",
          view: "Q1 2025 Roadmap\n\nGoals\n- Launch SDK v2\n- Add Jira integration\n- Improve performance",
        },
        version: { number: 4, message: "Updated goals", createdAt: now },
        ancestors: [{ id: "page-004", title: "Product Home" }],
        children: [],
        createdBy: mockUser2,
        createdAt: weekAgo,
        lastModifiedBy: mockUser2,
        lastModifiedAt: now,
        labels: [
          { id: "label-004", name: "roadmap", prefix: "global" },
          { id: "label-005", name: "q1-2025", prefix: "global" },
        ],
        webUrl:
          "https://example.atlassian.net/wiki/spaces/PRODUCT/pages/page-005",
      },
    ];

    this.comments.set("page-002", [
      {
        id: "comment-001",
        body: {
          storage: "<p>Should we add a diagram here?</p>",
          view: "Should we add a diagram here?",
        },
        author: mockUser2,
        createdAt: now,
        updatedAt: now,
        parentCommentId: null,
      },
      {
        id: "comment-002",
        body: {
          storage: "<p>Good idea! I'll add one tomorrow.</p>",
          view: "Good idea! I'll add one tomorrow.",
        },
        author: mockUser,
        createdAt: now,
        updatedAt: now,
        parentCommentId: "comment-001",
      },
    ]);

    this.nextPageId = 6;
    this.nextCommentId = 3;
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
        pageCount: this.pages.length,
        spaceCount: this.spaces.length,
      },
    });
  }

  async listSpaces(options?: {
    type?: "global" | "personal";
    status?: "current" | "archived";
    limit?: number;
  }): Promise<ConnectorResult<ConfluenceSpace[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    let filtered = [...this.spaces];
    if (options?.type) {
      filtered = filtered.filter((s) => s.type === options.type);
    }
    if (options?.status) {
      filtered = filtered.filter((s) => s.status === options.status);
    }
    if (options?.limit) {
      filtered = filtered.slice(0, options.limit);
    }

    return success(filtered);
  }

  async getSpace(spaceKey: string): Promise<ConnectorResult<ConfluenceSpace>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const space = this.spaces.find((s) => s.key === spaceKey);
    if (!space) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Space ${spaceKey} not found`,
      });
    }

    return success(space);
  }

  async listPages(options?: {
    spaceKey?: string;
    status?: "current" | "draft" | "archived";
    title?: string;
    limit?: number;
    start?: number;
  }): Promise<ConnectorResult<ConfluenceSearchResult>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    let filtered = [...this.pages];
    if (options?.spaceKey) {
      filtered = filtered.filter((p) => p.spaceKey === options.spaceKey);
    }
    if (options?.status) {
      filtered = filtered.filter((p) => p.status === options.status);
    }
    if (options?.title) {
      const titleLower = options.title.toLowerCase();
      filtered = filtered.filter((p) =>
        p.title.toLowerCase().includes(titleLower),
      );
    }

    const start = options?.start ?? 0;
    const limit = options?.limit ?? 25;
    const paged = filtered.slice(start, start + limit);

    return success({
      results: paged,
      total: filtered.length,
      start,
      limit,
    });
  }

  async getPage(pageId: string): Promise<ConnectorResult<ConfluencePage>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const page = this.pages.find((p) => p.id === pageId);
    if (!page) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Page ${pageId} not found`,
      });
    }

    return success(page);
  }

  async getPageByTitle(
    spaceKey: string,
    title: string,
  ): Promise<ConnectorResult<ConfluencePage>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const page = this.pages.find(
      (p) =>
        p.spaceKey === spaceKey &&
        p.title.toLowerCase() === title.toLowerCase(),
    );
    if (!page) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Page "${title}" not found in space ${spaceKey}`,
      });
    }

    return success(page);
  }

  async createPage(input: {
    spaceKey: string;
    title: string;
    body: string;
    parentId?: string;
    status?: "current" | "draft";
  }): Promise<ConnectorResult<ConfluencePage>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const space = this.spaces.find((s) => s.key === input.spaceKey);
    if (!space) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Space ${input.spaceKey} not found`,
      });
    }

    const existingPage = this.pages.find(
      (p) =>
        p.spaceKey === input.spaceKey &&
        p.title.toLowerCase() === input.title.toLowerCase(),
    );
    if (existingPage) {
      return failure({
        code: ErrorCodes.ALREADY_EXISTS,
        message: `Page "${input.title}" already exists in space ${input.spaceKey}`,
      });
    }

    const ancestors: ConfluencePageAncestor[] = [];
    if (input.parentId) {
      const parent = this.pages.find((p) => p.id === input.parentId);
      if (!parent) {
        return failure({
          code: ErrorCodes.NOT_FOUND,
          message: `Parent page ${input.parentId} not found`,
        });
      }
      ancestors.push(...parent.ancestors, {
        id: parent.id,
        title: parent.title,
      });
    }

    const now = new Date().toISOString();
    const mockUser: ConfluenceUser = {
      accountId: "user-001",
      displayName: "Alice Developer",
      email: "alice@example.com",
      avatarUrl: "https://avatar.example.com/alice.png",
    };

    const pageId = `page-${String(this.nextPageId).padStart(3, "0")}`;
    const newPage: ConfluencePage = {
      id: pageId,
      title: input.title,
      spaceKey: input.spaceKey,
      status: input.status ?? "current",
      body: {
        storage: input.body,
        view: input.body.replace(/<[^>]+>/g, "").trim(),
      },
      version: { number: 1, message: null, createdAt: now },
      ancestors,
      children: [],
      createdBy: mockUser,
      createdAt: now,
      lastModifiedBy: mockUser,
      lastModifiedAt: now,
      labels: [],
      webUrl: `https://example.atlassian.net/wiki/spaces/${input.spaceKey}/pages/${pageId}`,
    };

    this.pages.push(newPage);
    this.nextPageId++;

    if (input.parentId) {
      const parent = this.pages.find((p) => p.id === input.parentId);
      if (parent) {
        parent.children.push({
          id: pageId,
          title: input.title,
          status: newPage.status,
        });
      }
    }

    return success(newPage);
  }

  async updatePage(
    pageId: string,
    input: {
      title?: string;
      body?: string;
      version: number;
      versionMessage?: string;
    },
  ): Promise<ConnectorResult<ConfluencePage>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const page = this.pages.find((p) => p.id === pageId);
    if (!page) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Page ${pageId} not found`,
      });
    }

    if (page.version.number !== input.version) {
      return failure({
        code: ErrorCodes.CONFLICT,
        message: `Version conflict: expected ${input.version}, but page is at version ${page.version.number}`,
      });
    }

    const now = new Date().toISOString();
    const mockUser: ConfluenceUser = {
      accountId: "user-001",
      displayName: "Alice Developer",
      email: "alice@example.com",
      avatarUrl: "https://avatar.example.com/alice.png",
    };

    if (input.title !== undefined) page.title = input.title;
    if (input.body !== undefined) {
      page.body = {
        storage: input.body,
        view: input.body.replace(/<[^>]+>/g, "").trim(),
      };
    }
    page.version = {
      number: page.version.number + 1,
      message: input.versionMessage ?? null,
      createdAt: now,
    };
    page.lastModifiedBy = mockUser;
    page.lastModifiedAt = now;

    return success(page);
  }

  async deletePage(pageId: string): Promise<ConnectorResult<void>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const pageIndex = this.pages.findIndex((p) => p.id === pageId);
    if (pageIndex === -1) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Page ${pageId} not found`,
      });
    }

    for (const parentPage of this.pages) {
      parentPage.children = parentPage.children.filter((c) => c.id !== pageId);
    }

    this.pages.splice(pageIndex, 1);
    this.comments.delete(pageId);

    return success(undefined);
  }

  async searchPages(
    query: string,
    options?: {
      spaceKey?: string;
      limit?: number;
      start?: number;
    },
  ): Promise<ConnectorResult<ConfluenceSearchResult>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const queryLower = query.toLowerCase();
    let filtered = this.pages.filter(
      (p) =>
        p.title.toLowerCase().includes(queryLower) ||
        p.body.storage.toLowerCase().includes(queryLower) ||
        p.labels.some((l) => l.name.toLowerCase().includes(queryLower)),
    );

    if (options?.spaceKey) {
      filtered = filtered.filter((p) => p.spaceKey === options.spaceKey);
    }

    const start = options?.start ?? 0;
    const limit = options?.limit ?? 25;
    const paged = filtered.slice(start, start + limit);

    return success({
      results: paged,
      total: filtered.length,
      start,
      limit,
    });
  }

  async getPageComments(
    pageId: string,
    options?: {
      limit?: number;
      start?: number;
    },
  ): Promise<ConnectorResult<ConfluenceComment[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const page = this.pages.find((p) => p.id === pageId);
    if (!page) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Page ${pageId} not found`,
      });
    }

    const comments = this.comments.get(pageId) ?? [];
    const start = options?.start ?? 0;
    const limit = options?.limit ?? 25;
    const paged = comments.slice(start, start + limit);

    return success(paged);
  }

  async addPageComment(
    pageId: string,
    body: string,
    parentCommentId?: string,
  ): Promise<ConnectorResult<ConfluenceComment>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const page = this.pages.find((p) => p.id === pageId);
    if (!page) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Page ${pageId} not found`,
      });
    }

    if (parentCommentId) {
      const existingComments = this.comments.get(pageId) ?? [];
      if (!existingComments.some((c) => c.id === parentCommentId)) {
        return failure({
          code: ErrorCodes.NOT_FOUND,
          message: `Parent comment ${parentCommentId} not found`,
        });
      }
    }

    const now = new Date().toISOString();
    const mockUser: ConfluenceUser = {
      accountId: "user-001",
      displayName: "Alice Developer",
      email: "alice@example.com",
      avatarUrl: "https://avatar.example.com/alice.png",
    };

    const comment: ConfluenceComment = {
      id: `comment-${String(this.nextCommentId).padStart(3, "0")}`,
      body: {
        storage: body,
        view: body.replace(/<[^>]+>/g, "").trim(),
      },
      author: mockUser,
      createdAt: now,
      updatedAt: now,
      parentCommentId: parentCommentId ?? null,
    };

    const comments = this.comments.get(pageId) ?? [];
    comments.push(comment);
    this.comments.set(pageId, comments);
    this.nextCommentId++;

    return success(comment);
  }

  async getPageLabels(
    pageId: string,
  ): Promise<ConnectorResult<ConfluenceLabel[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const page = this.pages.find((p) => p.id === pageId);
    if (!page) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Page ${pageId} not found`,
      });
    }

    return success([...page.labels]);
  }

  async addPageLabel(
    pageId: string,
    labelName: string,
  ): Promise<ConnectorResult<ConfluenceLabel>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const page = this.pages.find((p) => p.id === pageId);
    if (!page) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Page ${pageId} not found`,
      });
    }

    const existing = page.labels.find((l) => l.name === labelName);
    if (existing) {
      return success(existing);
    }

    const label: ConfluenceLabel = {
      id: `label-${Date.now()}`,
      name: labelName,
      prefix: "global",
    };
    page.labels.push(label);

    return success(label);
  }

  async removePageLabel(
    pageId: string,
    labelName: string,
  ): Promise<ConnectorResult<void>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const page = this.pages.find((p) => p.id === pageId);
    if (!page) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Page ${pageId} not found`,
      });
    }

    const labelIndex = page.labels.findIndex((l) => l.name === labelName);
    if (labelIndex === -1) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Label "${labelName}" not found on page ${pageId}`,
      });
    }

    page.labels.splice(labelIndex, 1);
    return success(undefined);
  }

  async listPageAttachments(
    pageId: string,
    _options?: {
      limit?: number;
      start?: number;
    },
  ): Promise<ConnectorResult<ConfluenceAttachment[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Connector not initialized",
      });
    }

    const page = this.pages.find((p) => p.id === pageId);
    if (!page) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Page ${pageId} not found`,
      });
    }

    const mockUser: ConfluenceUser = {
      accountId: "user-001",
      displayName: "Alice Developer",
      email: "alice@example.com",
      avatarUrl: "https://avatar.example.com/alice.png",
    };

    const mockAttachments: ConfluenceAttachment[] =
      pageId === "page-002"
        ? [
            {
              id: "att-001",
              title: "architecture-diagram.png",
              mediaType: "image/png",
              fileSize: 245000,
              downloadUrl: `https://example.atlassian.net/wiki/download/${pageId}/att-001`,
              createdBy: mockUser,
              createdAt: new Date().toISOString(),
            },
          ]
        : [];

    return success(mockAttachments);
  }
}

class LiveConfluenceConnector implements ConfluenceConnector {
  readonly name = "confluence";
  readonly mode = "live" as const;
  private _isInitialized = false;

  constructor(private config: ConfluenceConnectorConfig) {}

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
          "Confluence site URL, API token, and user email are required for live mode",
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
      message: "Live Confluence connector not yet implemented",
    });
  }

  async listSpaces(): Promise<ConnectorResult<ConfluenceSpace[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Confluence connector not yet implemented",
    });
  }

  async getSpace(): Promise<ConnectorResult<ConfluenceSpace>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Confluence connector not yet implemented",
    });
  }

  async listPages(): Promise<ConnectorResult<ConfluenceSearchResult>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Confluence connector not yet implemented",
    });
  }

  async getPage(): Promise<ConnectorResult<ConfluencePage>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Confluence connector not yet implemented",
    });
  }

  async getPageByTitle(): Promise<ConnectorResult<ConfluencePage>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Confluence connector not yet implemented",
    });
  }

  async createPage(): Promise<ConnectorResult<ConfluencePage>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Confluence connector not yet implemented",
    });
  }

  async updatePage(): Promise<ConnectorResult<ConfluencePage>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Confluence connector not yet implemented",
    });
  }

  async deletePage(): Promise<ConnectorResult<void>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Confluence connector not yet implemented",
    });
  }

  async searchPages(): Promise<ConnectorResult<ConfluenceSearchResult>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Confluence connector not yet implemented",
    });
  }

  async getPageComments(): Promise<ConnectorResult<ConfluenceComment[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Confluence connector not yet implemented",
    });
  }

  async addPageComment(): Promise<ConnectorResult<ConfluenceComment>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Confluence connector not yet implemented",
    });
  }

  async getPageLabels(): Promise<ConnectorResult<ConfluenceLabel[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Confluence connector not yet implemented",
    });
  }

  async addPageLabel(): Promise<ConnectorResult<ConfluenceLabel>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Confluence connector not yet implemented",
    });
  }

  async removePageLabel(): Promise<ConnectorResult<void>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Confluence connector not yet implemented",
    });
  }

  async listPageAttachments(): Promise<
    ConnectorResult<ConfluenceAttachment[]>
  > {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Confluence connector not yet implemented",
    });
  }
}
