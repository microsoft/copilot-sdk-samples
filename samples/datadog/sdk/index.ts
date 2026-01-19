import { CopilotClient } from "@github/copilot-sdk";
import { runSample } from "../../../shared/index.js";
import { createDatadogConnector } from "../../../shared/connectors/datadog/client.js";
import {
  createMonitoringService,
  MonitoringOverview,
  HostHealthReport,
  SLOComplianceReport,
  IncidentReport,
  MonitorSummary,
  HostSummary,
  SLOSummary,
  IncidentSummary,
} from "./monitoring.js";

async function main() {
  await runSample(
    {
      name: "Datadog Monitoring",
      description:
        "Monitor infrastructure health, track SLOs, and manage incidents",
    },
    async (_client: CopilotClient) => {
      const datadogConnector = createDatadogConnector({ mode: "mock" });
      await datadogConnector.initialize();

      const monitoringService = createMonitoringService(datadogConnector);

      console.log("=== Datadog Monitoring Demo ===\n");

      console.log("1. Monitoring Overview...\n");
      const overviewResult = await monitoringService.getMonitoringOverview();

      if (!overviewResult.success) {
        console.error(
          "Failed to get monitoring overview:",
          overviewResult.error?.message,
        );
        await datadogConnector.dispose();
        return;
      }

      printMonitoringOverview(overviewResult.data!);

      console.log("\n2. Alerting Monitors...\n");
      const alertingResult = await monitoringService.getAlertingMonitors();

      if (alertingResult.success && alertingResult.data!.length > 0) {
        for (const monitor of alertingResult.data!) {
          printMonitorSummary(monitor);
        }
      } else {
        console.log("  No monitors currently alerting.\n");
      }

      console.log("\n3. Host Health Report...\n");
      const hostHealthResult = await monitoringService.getHostHealthReport();

      if (hostHealthResult.success) {
        printHostHealthReport(hostHealthResult.data!);
      }

      console.log("\n4. High CPU Hosts...\n");
      const highCpuResult = await monitoringService.getHighCpuHosts();

      if (highCpuResult.success && highCpuResult.data!.length > 0) {
        for (const host of highCpuResult.data!) {
          printHostSummary(host);
        }
      } else {
        console.log("  No hosts with high CPU usage.\n");
      }

      console.log("\n5. SLO Compliance Report...\n");
      const sloResult = await monitoringService.getSLOComplianceReport();

      if (sloResult.success) {
        printSLOComplianceReport(sloResult.data!);
      }

      console.log("\n6. Breached SLOs...\n");
      const breachedResult = await monitoringService.getBreachedSLOs();

      if (breachedResult.success && breachedResult.data!.length > 0) {
        for (const slo of breachedResult.data!) {
          printSLOSummary(slo);
        }
      } else {
        console.log("  No SLOs currently breached.\n");
      }

      console.log("\n7. Incident Report...\n");
      const incidentResult = await monitoringService.getIncidentReport();

      if (incidentResult.success) {
        printIncidentReport(incidentResult.data!);
      }

      console.log("\n8. Active Incidents...\n");
      const activeIncidentsResult =
        await monitoringService.getActiveIncidents();

      if (
        activeIncidentsResult.success &&
        activeIncidentsResult.data!.length > 0
      ) {
        for (const incident of activeIncidentsResult.data!) {
          printIncidentSummary(incident);
        }
      } else {
        console.log("  No active incidents.\n");
      }

      console.log("\n9. Muting High-CPU Host...\n");
      const muteResult = await monitoringService.muteHost("worker-1", {
        message: "Investigating high CPU",
        durationMinutes: 60,
      });

      if (muteResult.success) {
        console.log("  ✓ Host worker-1 muted for 60 minutes");
      }

      console.log("\n10. Creating New Monitor...\n");
      const createResult = await monitoringService.createMonitor({
        name: "Disk Usage Alert",
        query:
          "avg(last_5m):avg:system.disk.used{*} / avg:system.disk.total{*} * 100 > 85",
        message: "Disk usage exceeds 85%. @slack-alerts",
        type: "metric alert",
        tags: ["env:production", "team:platform"],
        thresholds: { critical: 90, warning: 85 },
      });

      if (createResult.success) {
        console.log(`  ✓ Created monitor: ${createResult.data!.name}`);
        console.log(`    ID: ${createResult.data!.id}`);
        console.log(`    Type: ${createResult.data!.type}`);
        console.log(`    State: ${createResult.data!.state}`);
      }

      await datadogConnector.dispose();
      console.log("\n=== Demo Complete ===\n");
    },
  );
}

function printMonitoringOverview(overview: MonitoringOverview): void {
  console.log("  === Monitor Status ===");
  console.log(`  Total Monitors: ${overview.totalMonitors}`);
  console.log(`    ✅ OK: ${overview.okMonitors}`);
  console.log(`    ⚠️  Warning: ${overview.warningMonitors}`);
  console.log(`    🔴 Alerting: ${overview.alertingMonitors}`);
  console.log(`    ❓ No Data: ${overview.noDataMonitors}`);
}

function printMonitorSummary(monitor: MonitorSummary): void {
  const stateIcon = getMonitorStateIcon(monitor.state);
  console.log(`  ${stateIcon} ${monitor.name}`);
  console.log(`    Type: ${monitor.type}`);
  console.log(`    State: ${monitor.state}`);
  if (monitor.priority) {
    console.log(`    Priority: P${monitor.priority}`);
  }
  if (monitor.tags.length > 0) {
    console.log(`    Tags: ${monitor.tags.join(", ")}`);
  }
  console.log();
}

function printHostHealthReport(report: HostHealthReport): void {
  console.log("  === Host Health ===");
  console.log(`  Total Hosts: ${report.totalHosts}`);
  console.log(`    ✅ Healthy: ${report.healthyHosts}`);
  console.log(`    🔴 Unhealthy: ${report.unhealthyHosts}`);
  console.log(`    🔇 Muted: ${report.mutedHosts}`);
}

function printHostSummary(host: HostSummary): void {
  const cpuIcon =
    host.cpuUsage >= 80 ? "🔴" : host.cpuUsage >= 70 ? "⚠️" : "✅";
  console.log(`  ${cpuIcon} ${host.name}`);
  console.log(`    Platform: ${host.platform} (${host.cpuCores} cores)`);
  console.log(`    CPU: ${host.cpuUsage}%`);
  console.log(`    Load: ${host.load}`);
  console.log(`    Uptime: ${host.uptime}`);
  console.log(`    Muted: ${host.isMuted ? "Yes" : "No"}`);
  if (host.apps.length > 0) {
    console.log(`    Apps: ${host.apps.join(", ")}`);
  }
  console.log();
}

function printSLOComplianceReport(report: SLOComplianceReport): void {
  console.log("  === SLO Compliance ===");
  console.log(`  Total SLOs: ${report.totalSLOs}`);
  console.log(`    ✅ Compliant: ${report.compliantSLOs}`);
  console.log(`    ⚠️  Warning: ${report.warningSLOs}`);
  console.log(`    🔴 Breached: ${report.breachedSLOs}`);
}

function printSLOSummary(slo: SLOSummary): void {
  const statusIcon = getSLOStatusIcon(slo.status);
  console.log(`  ${statusIcon} ${slo.name}`);
  console.log(`    Type: ${slo.type}`);
  console.log(`    Target: ${slo.targetThreshold}%`);
  console.log(`    Current SLI: ${slo.currentSLI.toFixed(2)}%`);
  console.log(`    Error Budget Remaining: ${slo.errorBudgetRemaining}%`);
  console.log(`    Timeframe: ${slo.timeframe}`);
  console.log();
}

function printIncidentReport(report: IncidentReport): void {
  console.log("  === Incident Report ===");
  console.log(`  Total Incidents: ${report.totalIncidents}`);
  console.log(`    🔴 Active: ${report.activeIncidents}`);
  console.log(`    ✅ Resolved: ${report.resolvedIncidents}`);
  if (report.bySeverity.size > 0) {
    console.log("  By Severity:");
    for (const [severity, count] of report.bySeverity) {
      console.log(`    ${severity}: ${count}`);
    }
  }
}

function printIncidentSummary(incident: IncidentSummary): void {
  const severityIcon = getSeverityIcon(incident.severity);
  const stateIcon =
    incident.state === "active"
      ? "🔴"
      : incident.state === "stable"
        ? "⚠️"
        : "✅";
  console.log(`  ${severityIcon} [${stateIcon}] ${incident.title}`);
  console.log(`    Severity: ${incident.severity}`);
  console.log(`    State: ${incident.state}`);
  console.log(
    `    Customer Impacted: ${incident.customerImpacted ? "Yes" : "No"}`,
  );
  if (incident.timeToDetect !== null) {
    console.log(`    Time to Detect: ${incident.timeToDetect}min`);
  }
  if (incident.timeToRepair !== null) {
    console.log(`    Time to Repair: ${incident.timeToRepair}min`);
  }
  if (incident.rootCause) {
    console.log(`    Root Cause: ${incident.rootCause}`);
  }
  console.log();
}

function getMonitorStateIcon(state: string): string {
  switch (state) {
    case "OK":
      return "✅";
    case "Warn":
      return "⚠️";
    case "Alert":
      return "🔴";
    case "No Data":
      return "❓";
    default:
      return "❔";
  }
}

function getSLOStatusIcon(status: string): string {
  switch (status) {
    case "OK":
      return "✅";
    case "Warning":
      return "⚠️";
    case "Breached":
      return "🔴";
    case "No Data":
      return "❓";
    default:
      return "❔";
  }
}

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case "SEV-1":
      return "🚨";
    case "SEV-2":
      return "🔴";
    case "SEV-3":
      return "⚠️";
    case "SEV-4":
      return "🟡";
    case "SEV-5":
      return "🔵";
    default:
      return "❔";
  }
}

main().catch(console.error);
