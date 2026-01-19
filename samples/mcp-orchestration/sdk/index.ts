import { CopilotClient } from "@github/copilot-sdk";
import { runSample } from "../../../shared/index.js";
import {
  createMCPClient,
  MCPClient,
  CIBuildStatus,
  DeploymentStatus,
  ServiceHealth,
  InfrastructureMetrics,
} from "./mcp.js";

async function main() {
  await runSample(
    {
      name: "MCP Orchestration",
      description: "Query dev infrastructure via Model Context Protocol",
    },
    async (_client: CopilotClient) => {
      const mcpClient = createMCPClient({ mode: "mock" });
      await mcpClient.initialize();

      console.log("=== MCP Orchestration Demo ===\n");
      console.log(
        "This demo shows how to use MCP (Model Context Protocol) to query",
      );
      console.log("dev infrastructure from multiple sources.\n");

      await demonstrateServerDiscovery(mcpClient);
      await demonstrateToolDiscovery(mcpClient);
      await demonstrateCIStatus(mcpClient);
      await demonstrateDeployments(mcpClient);
      await demonstrateServiceHealth(mcpClient);
      await demonstrateInfraMetrics(mcpClient);

      await mcpClient.dispose();
    },
  );
}

async function demonstrateServerDiscovery(mcpClient: MCPClient): Promise<void> {
  console.log("--- Step 1: Discover MCP Servers ---\n");

  const serversResult = await mcpClient.listServers();
  if (!serversResult.success) {
    console.error("Failed to list servers:", serversResult.error?.message);
    return;
  }

  console.log(`Found ${serversResult.data!.length} MCP server(s):\n`);
  for (const server of serversResult.data!) {
    console.log(`  • ${server.name}`);
    console.log(`    Connected: ${server.connected ? "Yes" : "No"}`);
    if (server.tools.length > 0) {
      console.log(`    Tools: ${server.tools.length}`);
    }
  }

  console.log("\nConnecting to all servers...\n");

  for (const server of serversResult.data!) {
    const connectResult = await mcpClient.connectServer(server.name);
    if (connectResult.success) {
      console.log(`  ✓ Connected to ${server.name}`);
    } else {
      console.log(`  ✗ Failed to connect to ${server.name}`);
    }
  }
  console.log();
}

async function demonstrateToolDiscovery(mcpClient: MCPClient): Promise<void> {
  console.log("--- Step 2: Discover Available Tools ---\n");

  const toolsResult = await mcpClient.listTools();
  if (!toolsResult.success) {
    console.error("Failed to list tools:", toolsResult.error?.message);
    return;
  }

  console.log(`Found ${toolsResult.data!.length} tool(s):\n`);
  for (const tool of toolsResult.data!) {
    console.log(`  • ${tool.name}`);
    console.log(`    ${tool.description}`);
  }
  console.log();
}

async function demonstrateCIStatus(mcpClient: MCPClient): Promise<void> {
  console.log("--- Step 3: Query CI/CD Status ---\n");

  const ciResult = await mcpClient.getCIStatus({ limit: 4 });
  if (!ciResult.success) {
    console.error("Failed to get CI status:", ciResult.error?.message);
    return;
  }

  console.log("Recent CI Builds:\n");
  for (const build of ciResult.data!) {
    printBuildStatus(build);
  }
  console.log();
}

async function demonstrateDeployments(mcpClient: MCPClient): Promise<void> {
  console.log("--- Step 4: Query Deployment Status ---\n");

  const deploymentsResult = await mcpClient.getDeployments();
  if (!deploymentsResult.success) {
    console.error(
      "Failed to get deployments:",
      deploymentsResult.error?.message,
    );
    return;
  }

  console.log("Current Deployments:\n");
  for (const deployment of deploymentsResult.data!) {
    printDeploymentStatus(deployment);
  }
  console.log();
}

async function demonstrateServiceHealth(mcpClient: MCPClient): Promise<void> {
  console.log("--- Step 5: Query Service Health ---\n");

  const healthResult = await mcpClient.getServiceHealth();
  if (!healthResult.success) {
    console.error("Failed to get service health:", healthResult.error?.message);
    return;
  }

  console.log("Service Health Status:\n");
  console.log(
    "  Service              Status      Latency   Error Rate   Uptime",
  );
  console.log(
    "  ─────────────────────────────────────────────────────────────────",
  );

  for (const service of healthResult.data!) {
    printServiceHealth(service);
  }
  console.log();
}

async function demonstrateInfraMetrics(mcpClient: MCPClient): Promise<void> {
  console.log("--- Step 6: Query Infrastructure Metrics ---\n");

  const metricsResult = await mcpClient.getInfraMetrics();
  if (!metricsResult.success) {
    console.error("Failed to get metrics:", metricsResult.error?.message);
    return;
  }

  const metrics = metricsResult.data!;
  printInfraMetrics(metrics);
}

function printBuildStatus(build: CIBuildStatus): void {
  const statusEmoji = {
    success: "✓",
    failure: "✗",
    running: "⟳",
    pending: "○",
  }[build.status];

  const statusText = {
    success: "Success",
    failure: "Failed",
    running: "Running",
    pending: "Pending",
  }[build.status];

  console.log(`  ${statusEmoji} ${build.id} (${build.branch}) - ${statusText}`);
  console.log(`    Commit: ${build.commit} by ${build.author}`);
  if (build.duration) {
    console.log(`    Duration: ${build.duration}s`);
  }
}

function printDeploymentStatus(deployment: DeploymentStatus): void {
  const statusEmoji = {
    deployed: "✓",
    deploying: "⟳",
    failed: "✗",
    rolled_back: "↩",
  }[deployment.status];

  console.log(`  ${statusEmoji} ${deployment.environment.toUpperCase()}`);
  console.log(`    Version: ${deployment.version}`);
  console.log(
    `    Replicas: ${deployment.replicas.ready}/${deployment.replicas.desired}`,
  );
  console.log(`    Status: ${deployment.status}`);
}

function printServiceHealth(service: ServiceHealth): void {
  const statusEmoji = {
    healthy: "✓",
    degraded: "!",
    unhealthy: "✗",
  }[service.status];

  const name = service.name.padEnd(20);
  const status = `${statusEmoji} ${service.status}`.padEnd(12);
  const latency = `${service.latency}ms`.padEnd(10);
  const errorRate = `${service.errorRate}%`.padEnd(12);
  const uptime = `${service.uptime}%`;

  console.log(`  ${name} ${status} ${latency} ${errorRate} ${uptime}`);
}

function printInfraMetrics(metrics: InfrastructureMetrics): void {
  console.log("  Infrastructure Overview:\n");
  console.log(
    `    CPU Usage:     ${renderBar(metrics.cpuUsage)} ${metrics.cpuUsage.toFixed(1)}%`,
  );
  console.log(
    `    Memory Usage:  ${renderBar(metrics.memoryUsage)} ${metrics.memoryUsage.toFixed(1)}%`,
  );
  console.log(
    `    Disk Usage:    ${renderBar(metrics.diskUsage)} ${metrics.diskUsage.toFixed(1)}%`,
  );
  console.log(
    `\n    Network I/O:   ↓ ${metrics.networkIn.toFixed(1)} MB/s  ↑ ${metrics.networkOut.toFixed(1)} MB/s`,
  );
  console.log(
    `    Timestamp:     ${new Date(metrics.timestamp).toLocaleString()}`,
  );
  console.log();
}

function renderBar(percentage: number): string {
  const width = 20;
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;
  return `[${"█".repeat(filled)}${"░".repeat(empty)}]`;
}

main().catch(console.error);
