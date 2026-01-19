import {
  ConnectorResult,
  success,
  failure,
  ErrorCodes,
} from "../../../shared/connectors/types.js";

/**
 * MCP (Model Context Protocol) types and client wrapper.
 *
 * MCP is an open protocol that enables LLMs to connect to external tools,
 * data sources, and infrastructure. This module provides a simplified
 * abstraction for connecting to MCP servers and executing tool calls.
 *
 * In production, you would use the official MCP SDK (@modelcontextprotocol/sdk).
 * This demo provides a mock implementation for demonstration purposes.
 */

export interface MCPServerConfig {
  name: string;
  description: string;
  transport: "stdio" | "http";
  endpoint?: string;
  command?: string;
  args?: string[];
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, unknown>;
}

export interface MCPResource {
  uri: string;
  name: string;
  description?: string;
  mimeType?: string;
}

export interface MCPToolCallResult {
  toolName: string;
  result: unknown;
  duration: number;
}

export interface MCPServerStatus {
  name: string;
  connected: boolean;
  tools: MCPTool[];
  resources: MCPResource[];
  lastPing?: number;
}

export interface CIBuildStatus {
  id: string;
  branch: string;
  status: "success" | "failure" | "running" | "pending";
  commit: string;
  author: string;
  duration?: number;
  startedAt: string;
  finishedAt?: string;
}

export interface DeploymentStatus {
  id: string;
  environment: "development" | "staging" | "production";
  version: string;
  status: "deployed" | "deploying" | "failed" | "rolled_back";
  replicas: { ready: number; desired: number };
  lastDeployedAt: string;
}

export interface ServiceHealth {
  name: string;
  status: "healthy" | "degraded" | "unhealthy";
  latency: number;
  errorRate: number;
  uptime: number;
}

export interface InfrastructureMetrics {
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIn: number;
  networkOut: number;
  timestamp: string;
}

export interface MCPClientConfig {
  mode: "mock" | "live";
  servers?: MCPServerConfig[];
}

export interface MCPClient {
  readonly mode: "mock" | "live";
  readonly isInitialized: boolean;

  initialize(): Promise<ConnectorResult<void>>;
  dispose(): Promise<void>;

  listServers(): Promise<ConnectorResult<MCPServerStatus[]>>;
  connectServer(name: string): Promise<ConnectorResult<MCPServerStatus>>;
  disconnectServer(name: string): Promise<ConnectorResult<void>>;

  listTools(serverName?: string): Promise<ConnectorResult<MCPTool[]>>;
  listResources(serverName?: string): Promise<ConnectorResult<MCPResource[]>>;

  callTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<ConnectorResult<MCPToolCallResult>>;

  getCIStatus(options?: {
    branch?: string;
    limit?: number;
  }): Promise<ConnectorResult<CIBuildStatus[]>>;

  getDeployments(options?: {
    environment?: string;
  }): Promise<ConnectorResult<DeploymentStatus[]>>;

  getServiceHealth(): Promise<ConnectorResult<ServiceHealth[]>>;
  getInfraMetrics(): Promise<ConnectorResult<InfrastructureMetrics>>;
}

export function createMCPClient(config: MCPClientConfig): MCPClient {
  if (config.mode === "mock") {
    return new MockMCPClient(config);
  }
  return new LiveMCPClient(config);
}

class MockMCPClient implements MCPClient {
  readonly mode = "mock" as const;
  private _isInitialized = false;
  private connectedServers: Set<string> = new Set();

  private mockServers: MCPServerConfig[] = [
    {
      name: "ci-server",
      description: "CI/CD pipeline server (GitHub Actions, Jenkins, etc.)",
      transport: "stdio",
      command: "mcp-ci-server",
    },
    {
      name: "k8s-server",
      description: "Kubernetes cluster management",
      transport: "stdio",
      command: "mcp-k8s-server",
    },
    {
      name: "metrics-server",
      description: "Infrastructure metrics and monitoring",
      transport: "http",
      endpoint: "http://localhost:3001/mcp",
    },
  ];

  private mockTools: Record<string, MCPTool[]> = {
    "ci-server": [
      {
        name: "get_builds",
        description: "Get CI build status",
        inputSchema: {
          type: "object",
          properties: {
            branch: { type: "string" },
            limit: { type: "number" },
          },
        },
      },
      {
        name: "trigger_build",
        description: "Trigger a new CI build",
        inputSchema: {
          type: "object",
          properties: {
            branch: { type: "string" },
            commit: { type: "string" },
          },
          required: ["branch"],
        },
      },
    ],
    "k8s-server": [
      {
        name: "get_deployments",
        description: "Get deployment status across environments",
        inputSchema: {
          type: "object",
          properties: {
            environment: { type: "string" },
            namespace: { type: "string" },
          },
        },
      },
      {
        name: "scale_deployment",
        description: "Scale a deployment",
        inputSchema: {
          type: "object",
          properties: {
            name: { type: "string" },
            replicas: { type: "number" },
          },
          required: ["name", "replicas"],
        },
      },
      {
        name: "get_service_health",
        description: "Get health status of services",
        inputSchema: {
          type: "object",
          properties: {
            namespace: { type: "string" },
          },
        },
      },
    ],
    "metrics-server": [
      {
        name: "get_metrics",
        description: "Get infrastructure metrics",
        inputSchema: {
          type: "object",
          properties: {
            timeRange: { type: "string" },
          },
        },
      },
      {
        name: "get_alerts",
        description: "Get active alerts",
        inputSchema: {
          type: "object",
          properties: {
            severity: { type: "string" },
          },
        },
      },
    ],
  };

  private mockResources: Record<string, MCPResource[]> = {
    "ci-server": [
      {
        uri: "ci://builds/recent",
        name: "Recent Builds",
        description: "List of recent CI builds",
      },
      {
        uri: "ci://config/pipelines",
        name: "Pipeline Configs",
        description: "CI pipeline configurations",
      },
    ],
    "k8s-server": [
      {
        uri: "k8s://clusters/default",
        name: "Default Cluster",
        description: "Default Kubernetes cluster",
      },
      {
        uri: "k8s://namespaces",
        name: "Namespaces",
        description: "All namespaces",
      },
    ],
    "metrics-server": [
      {
        uri: "metrics://dashboard",
        name: "Main Dashboard",
        description: "Infrastructure dashboard",
      },
    ],
  };

  constructor(_config: MCPClientConfig) {}

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async initialize(): Promise<ConnectorResult<void>> {
    this._isInitialized = true;
    return success(undefined);
  }

  async dispose(): Promise<void> {
    this.connectedServers.clear();
    this._isInitialized = false;
  }

  async listServers(): Promise<ConnectorResult<MCPServerStatus[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "MCP client not initialized",
      });
    }

    const statuses: MCPServerStatus[] = this.mockServers.map((server) => ({
      name: server.name,
      connected: this.connectedServers.has(server.name),
      tools: this.connectedServers.has(server.name)
        ? this.mockTools[server.name] || []
        : [],
      resources: this.connectedServers.has(server.name)
        ? this.mockResources[server.name] || []
        : [],
      lastPing: this.connectedServers.has(server.name) ? Date.now() : undefined,
    }));

    return success(statuses);
  }

  async connectServer(name: string): Promise<ConnectorResult<MCPServerStatus>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "MCP client not initialized",
      });
    }

    const server = this.mockServers.find((s) => s.name === name);
    if (!server) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `MCP server '${name}' not found`,
      });
    }

    this.connectedServers.add(name);

    return success({
      name: server.name,
      connected: true,
      tools: this.mockTools[name] || [],
      resources: this.mockResources[name] || [],
      lastPing: Date.now(),
    });
  }

  async disconnectServer(name: string): Promise<ConnectorResult<void>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "MCP client not initialized",
      });
    }

    this.connectedServers.delete(name);
    return success(undefined);
  }

  async listTools(serverName?: string): Promise<ConnectorResult<MCPTool[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "MCP client not initialized",
      });
    }

    if (serverName) {
      if (!this.connectedServers.has(serverName)) {
        return failure({
          code: ErrorCodes.NOT_FOUND,
          message: `Server '${serverName}' not connected`,
        });
      }
      return success(this.mockTools[serverName] || []);
    }

    const allTools: MCPTool[] = [];
    for (const name of this.connectedServers) {
      allTools.push(...(this.mockTools[name] || []));
    }
    return success(allTools);
  }

  async listResources(
    serverName?: string,
  ): Promise<ConnectorResult<MCPResource[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "MCP client not initialized",
      });
    }

    if (serverName) {
      if (!this.connectedServers.has(serverName)) {
        return failure({
          code: ErrorCodes.NOT_FOUND,
          message: `Server '${serverName}' not connected`,
        });
      }
      return success(this.mockResources[serverName] || []);
    }

    const allResources: MCPResource[] = [];
    for (const name of this.connectedServers) {
      allResources.push(...(this.mockResources[name] || []));
    }
    return success(allResources);
  }

  async callTool(
    toolName: string,
    args: Record<string, unknown>,
  ): Promise<ConnectorResult<MCPToolCallResult>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "MCP client not initialized",
      });
    }

    const start = Date.now();

    await new Promise((resolve) => setTimeout(resolve, 10));

    let result: unknown;

    switch (toolName) {
      case "get_builds":
        result = this.generateMockBuilds(args.branch as string | undefined);
        break;
      case "get_deployments":
        result = this.generateMockDeployments(
          args.environment as string | undefined,
        );
        break;
      case "get_service_health":
        result = this.generateMockServiceHealth();
        break;
      case "get_metrics":
        result = this.generateMockMetrics();
        break;
      default:
        result = { message: `Tool '${toolName}' executed successfully`, args };
    }

    return success({
      toolName,
      result,
      duration: Date.now() - start,
    });
  }

  async getCIStatus(options?: {
    branch?: string;
    limit?: number;
  }): Promise<ConnectorResult<CIBuildStatus[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "MCP client not initialized",
      });
    }

    let builds = this.generateMockBuilds(options?.branch);
    if (options?.limit) {
      builds = builds.slice(0, options.limit);
    }
    return success(builds);
  }

  async getDeployments(options?: {
    environment?: string;
  }): Promise<ConnectorResult<DeploymentStatus[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "MCP client not initialized",
      });
    }

    return success(this.generateMockDeployments(options?.environment));
  }

  async getServiceHealth(): Promise<ConnectorResult<ServiceHealth[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "MCP client not initialized",
      });
    }

    return success(this.generateMockServiceHealth());
  }

  async getInfraMetrics(): Promise<ConnectorResult<InfrastructureMetrics>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "MCP client not initialized",
      });
    }

    return success(this.generateMockMetrics());
  }

  private generateMockBuilds(branch?: string): CIBuildStatus[] {
    const now = new Date();
    const builds: CIBuildStatus[] = [
      {
        id: "build-001",
        branch: "main",
        status: "success",
        commit: "a1b2c3d",
        author: "developer-1",
        duration: 245,
        startedAt: new Date(now.getTime() - 300000).toISOString(),
        finishedAt: new Date(now.getTime() - 55000).toISOString(),
      },
      {
        id: "build-002",
        branch: "feature/new-api",
        status: "running",
        commit: "e4f5g6h",
        author: "developer-2",
        startedAt: new Date(now.getTime() - 120000).toISOString(),
      },
      {
        id: "build-003",
        branch: "main",
        status: "failure",
        commit: "i7j8k9l",
        author: "developer-3",
        duration: 89,
        startedAt: new Date(now.getTime() - 600000).toISOString(),
        finishedAt: new Date(now.getTime() - 511000).toISOString(),
      },
      {
        id: "build-004",
        branch: "hotfix/critical-bug",
        status: "success",
        commit: "m0n1o2p",
        author: "developer-1",
        duration: 198,
        startedAt: new Date(now.getTime() - 900000).toISOString(),
        finishedAt: new Date(now.getTime() - 702000).toISOString(),
      },
    ];

    if (branch) {
      return builds.filter((b) => b.branch === branch);
    }
    return builds;
  }

  private generateMockDeployments(environment?: string): DeploymentStatus[] {
    const now = new Date();
    const deployments: DeploymentStatus[] = [
      {
        id: "deploy-001",
        environment: "production",
        version: "v2.3.1",
        status: "deployed",
        replicas: { ready: 3, desired: 3 },
        lastDeployedAt: new Date(now.getTime() - 86400000).toISOString(),
      },
      {
        id: "deploy-002",
        environment: "staging",
        version: "v2.4.0-rc1",
        status: "deployed",
        replicas: { ready: 2, desired: 2 },
        lastDeployedAt: new Date(now.getTime() - 3600000).toISOString(),
      },
      {
        id: "deploy-003",
        environment: "development",
        version: "v2.4.0-dev",
        status: "deploying",
        replicas: { ready: 1, desired: 2 },
        lastDeployedAt: new Date(now.getTime() - 300000).toISOString(),
      },
    ];

    if (environment) {
      return deployments.filter((d) => d.environment === environment);
    }
    return deployments;
  }

  private generateMockServiceHealth(): ServiceHealth[] {
    return [
      {
        name: "api-gateway",
        status: "healthy",
        latency: 45,
        errorRate: 0.1,
        uptime: 99.95,
      },
      {
        name: "auth-service",
        status: "healthy",
        latency: 23,
        errorRate: 0.05,
        uptime: 99.99,
      },
      {
        name: "user-service",
        status: "degraded",
        latency: 156,
        errorRate: 2.3,
        uptime: 98.5,
      },
      {
        name: "notification-service",
        status: "healthy",
        latency: 78,
        errorRate: 0.3,
        uptime: 99.8,
      },
      {
        name: "database",
        status: "healthy",
        latency: 12,
        errorRate: 0.01,
        uptime: 99.999,
      },
    ];
  }

  private generateMockMetrics(): InfrastructureMetrics {
    return {
      cpuUsage: 45.2,
      memoryUsage: 68.7,
      diskUsage: 52.1,
      networkIn: 1250.5,
      networkOut: 890.3,
      timestamp: new Date().toISOString(),
    };
  }
}

class LiveMCPClient implements MCPClient {
  readonly mode = "live" as const;
  private _isInitialized = false;

  constructor(_config: MCPClientConfig) {}

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async initialize(): Promise<ConnectorResult<void>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message:
        "Live MCP client not yet implemented. Use mock mode for demonstration.",
    });
  }

  async dispose(): Promise<void> {
    this._isInitialized = false;
  }

  async listServers(): Promise<ConnectorResult<MCPServerStatus[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live MCP client not yet implemented",
    });
  }

  async connectServer(): Promise<ConnectorResult<MCPServerStatus>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live MCP client not yet implemented",
    });
  }

  async disconnectServer(): Promise<ConnectorResult<void>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live MCP client not yet implemented",
    });
  }

  async listTools(): Promise<ConnectorResult<MCPTool[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live MCP client not yet implemented",
    });
  }

  async listResources(): Promise<ConnectorResult<MCPResource[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live MCP client not yet implemented",
    });
  }

  async callTool(): Promise<ConnectorResult<MCPToolCallResult>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live MCP client not yet implemented",
    });
  }

  async getCIStatus(): Promise<ConnectorResult<CIBuildStatus[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live MCP client not yet implemented",
    });
  }

  async getDeployments(): Promise<ConnectorResult<DeploymentStatus[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live MCP client not yet implemented",
    });
  }

  async getServiceHealth(): Promise<ConnectorResult<ServiceHealth[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live MCP client not yet implemented",
    });
  }

  async getInfraMetrics(): Promise<ConnectorResult<InfrastructureMetrics>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live MCP client not yet implemented",
    });
  }
}
