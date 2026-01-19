import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { expectSuccess, expectFailure } from "../../helpers/index.js";
import {
  createMCPClient,
  MCPClient,
} from "../../../samples/mcp-orchestration/sdk/mcp.js";

describe("mcp-orchestration sample", () => {
  let mcpClient: MCPClient;

  beforeEach(async () => {
    mcpClient = createMCPClient({ mode: "mock" });
    await mcpClient.initialize();
  });

  afterEach(async () => {
    await mcpClient.dispose();
  });

  describe("MCPClient", () => {
    describe("initialization", () => {
      it("should initialize successfully in mock mode", async () => {
        const client = createMCPClient({ mode: "mock" });
        expect(client.isInitialized).toBe(false);
        await client.initialize();
        expect(client.isInitialized).toBe(true);
        await client.dispose();
      });

      it("should fail to initialize in live mode (not implemented)", async () => {
        const client = createMCPClient({ mode: "live" });
        const result = await client.initialize();
        expectFailure(result);
        expect(result.error?.code).toBe("NOT_IMPLEMENTED");
      });

      it("should reset state after dispose", async () => {
        expect(mcpClient.isInitialized).toBe(true);
        await mcpClient.dispose();
        expect(mcpClient.isInitialized).toBe(false);
      });
    });

    describe("listServers", () => {
      it("should return available MCP servers", async () => {
        const result = await mcpClient.listServers();
        expectSuccess(result);
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBeGreaterThan(0);
      });

      it("should include server metadata", async () => {
        const result = await mcpClient.listServers();
        expectSuccess(result);
        const server = result.data[0];
        expect(server.name).toBeDefined();
        expect(typeof server.connected).toBe("boolean");
      });

      it("should show servers as disconnected initially", async () => {
        const result = await mcpClient.listServers();
        expectSuccess(result);
        for (const server of result.data) {
          expect(server.connected).toBe(false);
        }
      });

      it("should fail when not initialized", async () => {
        const uninitClient = createMCPClient({ mode: "mock" });
        const result = await uninitClient.listServers();
        expectFailure(result);
        expect(result.error?.code).toBe("NOT_INITIALIZED");
      });
    });

    describe("connectServer", () => {
      it("should connect to a server successfully", async () => {
        const serversResult = await mcpClient.listServers();
        expectSuccess(serversResult);
        const serverName = serversResult.data[0].name;

        const connectResult = await mcpClient.connectServer(serverName);
        expectSuccess(connectResult);
        expect(connectResult.data.connected).toBe(true);
      });

      it("should show tools after connecting", async () => {
        const serversResult = await mcpClient.listServers();
        expectSuccess(serversResult);
        const serverName = serversResult.data[0].name;

        const connectResult = await mcpClient.connectServer(serverName);
        expectSuccess(connectResult);
        expect(connectResult.data.tools.length).toBeGreaterThan(0);
      });

      it("should fail for non-existent server", async () => {
        const result = await mcpClient.connectServer("non-existent-server");
        expectFailure(result);
        expect(result.error?.code).toBe("NOT_FOUND");
      });

      it("should update server list after connecting", async () => {
        const serversResult = await mcpClient.listServers();
        expectSuccess(serversResult);
        const serverName = serversResult.data[0].name;

        await mcpClient.connectServer(serverName);

        const updatedResult = await mcpClient.listServers();
        expectSuccess(updatedResult);
        const connectedServer = updatedResult.data.find(
          (s) => s.name === serverName,
        );
        expect(connectedServer?.connected).toBe(true);
      });
    });

    describe("disconnectServer", () => {
      it("should disconnect a connected server", async () => {
        const serversResult = await mcpClient.listServers();
        expectSuccess(serversResult);
        const serverName = serversResult.data[0].name;

        await mcpClient.connectServer(serverName);
        const disconnectResult = await mcpClient.disconnectServer(serverName);
        expectSuccess(disconnectResult);

        const updatedResult = await mcpClient.listServers();
        expectSuccess(updatedResult);
        const server = updatedResult.data.find((s) => s.name === serverName);
        expect(server?.connected).toBe(false);
      });
    });

    describe("listTools", () => {
      it("should return empty array when no servers connected", async () => {
        const result = await mcpClient.listTools();
        expectSuccess(result);
        expect(result.data).toEqual([]);
      });

      it("should return tools from connected servers", async () => {
        const serversResult = await mcpClient.listServers();
        expectSuccess(serversResult);

        await mcpClient.connectServer(serversResult.data[0].name);

        const toolsResult = await mcpClient.listTools();
        expectSuccess(toolsResult);
        expect(toolsResult.data.length).toBeGreaterThan(0);
      });

      it("should return tools for specific server", async () => {
        const serversResult = await mcpClient.listServers();
        expectSuccess(serversResult);
        const serverName = serversResult.data[0].name;

        await mcpClient.connectServer(serverName);

        const toolsResult = await mcpClient.listTools(serverName);
        expectSuccess(toolsResult);
        expect(toolsResult.data.length).toBeGreaterThan(0);
      });

      it("should fail for non-connected server", async () => {
        const serversResult = await mcpClient.listServers();
        expectSuccess(serversResult);
        const serverName = serversResult.data[0].name;

        const result = await mcpClient.listTools(serverName);
        expectFailure(result);
        expect(result.error?.code).toBe("NOT_FOUND");
      });

      it("should include tool metadata", async () => {
        const serversResult = await mcpClient.listServers();
        expectSuccess(serversResult);

        await mcpClient.connectServer(serversResult.data[0].name);

        const toolsResult = await mcpClient.listTools();
        expectSuccess(toolsResult);
        const tool = toolsResult.data[0];
        expect(tool.name).toBeDefined();
        expect(tool.description).toBeDefined();
        expect(tool.inputSchema).toBeDefined();
      });
    });

    describe("listResources", () => {
      it("should return empty array when no servers connected", async () => {
        const result = await mcpClient.listResources();
        expectSuccess(result);
        expect(result.data).toEqual([]);
      });

      it("should return resources from connected servers", async () => {
        const serversResult = await mcpClient.listServers();
        expectSuccess(serversResult);

        await mcpClient.connectServer(serversResult.data[0].name);

        const resourcesResult = await mcpClient.listResources();
        expectSuccess(resourcesResult);
        expect(resourcesResult.data.length).toBeGreaterThan(0);
      });

      it("should include resource metadata", async () => {
        const serversResult = await mcpClient.listServers();
        expectSuccess(serversResult);

        await mcpClient.connectServer(serversResult.data[0].name);

        const resourcesResult = await mcpClient.listResources();
        expectSuccess(resourcesResult);
        const resource = resourcesResult.data[0];
        expect(resource.uri).toBeDefined();
        expect(resource.name).toBeDefined();
      });
    });

    describe("callTool", () => {
      it("should execute a tool and return result", async () => {
        const result = await mcpClient.callTool("get_builds", {});
        expectSuccess(result);
        expect(result.data.toolName).toBe("get_builds");
        expect(result.data.result).toBeDefined();
        expect(result.data.duration).toBeGreaterThanOrEqual(0);
      });

      it("should pass arguments to tool", async () => {
        const result = await mcpClient.callTool("get_builds", {
          branch: "main",
        });
        expectSuccess(result);
        expect(result.data.result).toBeDefined();
      });

      it("should handle unknown tools gracefully", async () => {
        const result = await mcpClient.callTool("unknown_tool", {});
        expectSuccess(result);
        expect(result.data.toolName).toBe("unknown_tool");
      });

      it("should fail when not initialized", async () => {
        const uninitClient = createMCPClient({ mode: "mock" });
        const result = await uninitClient.callTool("get_builds", {});
        expectFailure(result);
        expect(result.error?.code).toBe("NOT_INITIALIZED");
      });
    });
  });

  describe("Infrastructure queries", () => {
    describe("getCIStatus", () => {
      it("should return CI build status", async () => {
        const result = await mcpClient.getCIStatus();
        expectSuccess(result);
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBeGreaterThan(0);
      });

      it("should include build metadata", async () => {
        const result = await mcpClient.getCIStatus();
        expectSuccess(result);
        const build = result.data[0];
        expect(build.id).toBeDefined();
        expect(build.branch).toBeDefined();
        expect(build.status).toBeDefined();
        expect(build.commit).toBeDefined();
        expect(build.author).toBeDefined();
        expect(build.startedAt).toBeDefined();
      });

      it("should filter by branch", async () => {
        const result = await mcpClient.getCIStatus({ branch: "main" });
        expectSuccess(result);
        for (const build of result.data) {
          expect(build.branch).toBe("main");
        }
      });

      it("should respect limit option", async () => {
        const result = await mcpClient.getCIStatus({ limit: 2 });
        expectSuccess(result);
        expect(result.data.length).toBeLessThanOrEqual(2);
      });

      it("should have valid status values", async () => {
        const result = await mcpClient.getCIStatus();
        expectSuccess(result);
        const validStatuses = ["success", "failure", "running", "pending"];
        for (const build of result.data) {
          expect(validStatuses).toContain(build.status);
        }
      });
    });

    describe("getDeployments", () => {
      it("should return deployment status", async () => {
        const result = await mcpClient.getDeployments();
        expectSuccess(result);
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBeGreaterThan(0);
      });

      it("should include deployment metadata", async () => {
        const result = await mcpClient.getDeployments();
        expectSuccess(result);
        const deployment = result.data[0];
        expect(deployment.id).toBeDefined();
        expect(deployment.environment).toBeDefined();
        expect(deployment.version).toBeDefined();
        expect(deployment.status).toBeDefined();
        expect(deployment.replicas).toBeDefined();
        expect(deployment.replicas.ready).toBeDefined();
        expect(deployment.replicas.desired).toBeDefined();
      });

      it("should filter by environment", async () => {
        const result = await mcpClient.getDeployments({
          environment: "production",
        });
        expectSuccess(result);
        for (const deployment of result.data) {
          expect(deployment.environment).toBe("production");
        }
      });

      it("should have valid environment values", async () => {
        const result = await mcpClient.getDeployments();
        expectSuccess(result);
        const validEnvironments = ["development", "staging", "production"];
        for (const deployment of result.data) {
          expect(validEnvironments).toContain(deployment.environment);
        }
      });

      it("should have valid status values", async () => {
        const result = await mcpClient.getDeployments();
        expectSuccess(result);
        const validStatuses = [
          "deployed",
          "deploying",
          "failed",
          "rolled_back",
        ];
        for (const deployment of result.data) {
          expect(validStatuses).toContain(deployment.status);
        }
      });
    });

    describe("getServiceHealth", () => {
      it("should return service health status", async () => {
        const result = await mcpClient.getServiceHealth();
        expectSuccess(result);
        expect(Array.isArray(result.data)).toBe(true);
        expect(result.data.length).toBeGreaterThan(0);
      });

      it("should include health metadata", async () => {
        const result = await mcpClient.getServiceHealth();
        expectSuccess(result);
        const service = result.data[0];
        expect(service.name).toBeDefined();
        expect(service.status).toBeDefined();
        expect(typeof service.latency).toBe("number");
        expect(typeof service.errorRate).toBe("number");
        expect(typeof service.uptime).toBe("number");
      });

      it("should have valid status values", async () => {
        const result = await mcpClient.getServiceHealth();
        expectSuccess(result);
        const validStatuses = ["healthy", "degraded", "unhealthy"];
        for (const service of result.data) {
          expect(validStatuses).toContain(service.status);
        }
      });

      it("should have reasonable metric ranges", async () => {
        const result = await mcpClient.getServiceHealth();
        expectSuccess(result);
        for (const service of result.data) {
          expect(service.latency).toBeGreaterThanOrEqual(0);
          expect(service.errorRate).toBeGreaterThanOrEqual(0);
          expect(service.uptime).toBeGreaterThanOrEqual(0);
          expect(service.uptime).toBeLessThanOrEqual(100);
        }
      });
    });

    describe("getInfraMetrics", () => {
      it("should return infrastructure metrics", async () => {
        const result = await mcpClient.getInfraMetrics();
        expectSuccess(result);
        expect(result.data).toBeDefined();
      });

      it("should include all metric fields", async () => {
        const result = await mcpClient.getInfraMetrics();
        expectSuccess(result);
        const metrics = result.data;
        expect(typeof metrics.cpuUsage).toBe("number");
        expect(typeof metrics.memoryUsage).toBe("number");
        expect(typeof metrics.diskUsage).toBe("number");
        expect(typeof metrics.networkIn).toBe("number");
        expect(typeof metrics.networkOut).toBe("number");
        expect(metrics.timestamp).toBeDefined();
      });

      it("should have usage percentages in valid range", async () => {
        const result = await mcpClient.getInfraMetrics();
        expectSuccess(result);
        const metrics = result.data;
        expect(metrics.cpuUsage).toBeGreaterThanOrEqual(0);
        expect(metrics.cpuUsage).toBeLessThanOrEqual(100);
        expect(metrics.memoryUsage).toBeGreaterThanOrEqual(0);
        expect(metrics.memoryUsage).toBeLessThanOrEqual(100);
        expect(metrics.diskUsage).toBeGreaterThanOrEqual(0);
        expect(metrics.diskUsage).toBeLessThanOrEqual(100);
      });

      it("should have valid timestamp", async () => {
        const result = await mcpClient.getInfraMetrics();
        expectSuccess(result);
        const timestamp = new Date(result.data.timestamp);
        expect(timestamp.getTime()).not.toBeNaN();
      });
    });
  });

  describe("error handling", () => {
    it("should handle uninitialized client for getCIStatus", async () => {
      const uninitClient = createMCPClient({ mode: "mock" });
      const result = await uninitClient.getCIStatus();
      expectFailure(result);
      expect(result.error?.code).toBe("NOT_INITIALIZED");
    });

    it("should handle uninitialized client for getDeployments", async () => {
      const uninitClient = createMCPClient({ mode: "mock" });
      const result = await uninitClient.getDeployments();
      expectFailure(result);
      expect(result.error?.code).toBe("NOT_INITIALIZED");
    });

    it("should handle uninitialized client for getServiceHealth", async () => {
      const uninitClient = createMCPClient({ mode: "mock" });
      const result = await uninitClient.getServiceHealth();
      expectFailure(result);
      expect(result.error?.code).toBe("NOT_INITIALIZED");
    });

    it("should handle uninitialized client for getInfraMetrics", async () => {
      const uninitClient = createMCPClient({ mode: "mock" });
      const result = await uninitClient.getInfraMetrics();
      expectFailure(result);
      expect(result.error?.code).toBe("NOT_INITIALIZED");
    });
  });
});
