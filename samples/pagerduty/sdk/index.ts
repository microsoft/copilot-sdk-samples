import { CopilotClient } from "@github/copilot-sdk";
import { runSample } from "../../../shared/index.js";
import { createPagerDutyConnector } from "../../../shared/connectors/pagerduty/client.js";
import {
  createIncidentManagementService,
  IncidentAnalysis,
  IncidentSummary,
  ServiceHealth,
  OnCallSummary,
} from "./incidents.js";

async function main() {
  await runSample(
    {
      name: "PagerDuty Incident Management",
      description:
        "Manage incidents, view on-call schedules, and monitor service health",
    },
    async (_client: CopilotClient) => {
      const pagerdutyConnector = createPagerDutyConnector({ mode: "mock" });
      await pagerdutyConnector.initialize();

      const incidentService =
        createIncidentManagementService(pagerdutyConnector);

      console.log("=== PagerDuty Incident Management Demo ===\n");

      console.log("1. Analyzing Active Incidents...\n");
      const analysisResult = await incidentService.getActiveIncidents();

      if (!analysisResult.success) {
        console.error(
          "Failed to analyze incidents:",
          analysisResult.error?.message,
        );
        await pagerdutyConnector.dispose();
        return;
      }

      printIncidentAnalysis(analysisResult.data!);

      console.log("\n2. Service Health Overview...\n");
      const healthResult = await incidentService.getServiceHealth();

      if (healthResult.success) {
        printServiceHealth(healthResult.data!);
      }

      console.log("\n3. On-Call Summary...\n");
      const onCallResult = await incidentService.getOnCallSummary();

      if (onCallResult.success) {
        printOnCallSummary(onCallResult.data!);
      }

      console.log("\n4. High Urgency Incidents...\n");
      const highUrgencyResult = await incidentService.getHighUrgencyIncidents();

      if (highUrgencyResult.success && highUrgencyResult.data!.length > 0) {
        for (const incident of highUrgencyResult.data!) {
          printIncidentSummary(incident);
        }
      } else {
        console.log("  No high urgency incidents currently active.\n");
      }

      console.log("\n5. Incident Timeline (INC001)...\n");
      const timelineResult =
        await incidentService.getIncidentTimeline("INC001");

      if (timelineResult.success) {
        const { incident, alerts, timeline } = timelineResult.data!;
        console.log(`  Incident: ${incident.title}`);
        console.log(`  Status: ${incident.status.toUpperCase()}`);
        console.log(`  Age: ${formatAge(incident.ageMinutes)}`);
        console.log(`  Alerts: ${alerts.length}`);
        console.log(`  Timeline Events: ${timeline.length}`);
        if (timeline.length > 0) {
          console.log("  Recent Activity:");
          for (const entry of timeline.slice(0, 3)) {
            console.log(
              `    - ${entry.type}: ${entry.agent}${entry.note ? ` - "${entry.note}"` : ""}`,
            );
          }
        }
      }

      console.log("\n6. Acknowledging Incident INC001...\n");
      const ackResult = await incidentService.acknowledgeIncident("INC001");

      if (ackResult.success) {
        console.log(`  ✓ Incident ${ackResult.data!.id} acknowledged`);
        console.log(`    New Status: ${ackResult.data!.status}`);
      }

      console.log("\n7. Creating a Test Incident...\n");
      const createResult = await incidentService.createIncident({
        title: "Test Alert: CPU Usage Spike",
        serviceId: "SVC003",
        urgency: "low",
        body: "CPU usage exceeded 80% on payment-worker-01",
      });

      if (createResult.success) {
        console.log(`  ✓ Created incident: ${createResult.data!.title}`);
        console.log(`    ID: ${createResult.data!.id}`);
        console.log(`    Service: ${createResult.data!.service}`);
        console.log(`    Urgency: ${createResult.data!.urgency}`);
      }

      await pagerdutyConnector.dispose();
      console.log("\n=== Demo Complete ===\n");
    },
  );
}

function printIncidentAnalysis(analysis: IncidentAnalysis): void {
  console.log("  === Incident Analysis ===");
  console.log(`  Total Active: ${analysis.totalActive}`);
  console.log(`    Triggered: ${analysis.triggered}`);
  console.log(`    Acknowledged: ${analysis.acknowledged}`);
  console.log(`  By Urgency:`);
  console.log(`    High: ${analysis.highUrgency}`);
  console.log(`    Low: ${analysis.lowUrgency}`);

  if (analysis.byService.size > 0) {
    console.log("  By Service:");
    for (const [service, count] of analysis.byService) {
      console.log(`    ${service}: ${count}`);
    }
  }

  if (analysis.oldestUnacknowledged) {
    const oldest = analysis.oldestUnacknowledged;
    console.log(`  Oldest Unacknowledged: ${oldest.title}`);
    console.log(`    Age: ${formatAge(oldest.ageMinutes)}`);
  }
}

function printServiceHealth(healthReports: ServiceHealth[]): void {
  for (const health of healthReports) {
    const statusIcon = getStatusIcon(health.status);
    console.log(`  ${statusIcon} ${health.serviceName}`);
    console.log(`    Status: ${health.status}`);
    console.log(
      `    Active Incidents: ${health.activeIncidents} (${health.triggeredIncidents} triggered, ${health.acknowledgedIncidents} ack'd)`,
    );
    if (health.onCallUsers.length > 0) {
      console.log(`    On-Call: ${health.onCallUsers.join(", ")}`);
    }
    console.log();
  }
}

function printOnCallSummary(summaries: OnCallSummary[]): void {
  for (const summary of summaries) {
    console.log(`  ${summary.policyName}`);
    if (summary.currentOnCall.length > 0) {
      console.log(
        `    Primary: ${summary.currentOnCall.map((u) => u.name).join(", ")}`,
      );
    }
    if (summary.nextEscalation.length > 0) {
      console.log(
        `    Next Escalation: ${summary.nextEscalation.map((u) => u.name).join(", ")}`,
      );
    }
    console.log();
  }
}

function printIncidentSummary(incident: IncidentSummary): void {
  const urgencyIcon = incident.urgency === "high" ? "🔴" : "🟡";
  console.log(
    `  ${urgencyIcon} [${incident.status.toUpperCase()}] ${incident.title}`,
  );
  console.log(`    Service: ${incident.service}`);
  console.log(`    Age: ${formatAge(incident.ageMinutes)}`);
  if (incident.assignees.length > 0) {
    console.log(`    Assignees: ${incident.assignees.join(", ")}`);
  }
  if (incident.priority) {
    console.log(`    Priority: ${incident.priority}`);
  }
  console.log();
}

function formatAge(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`;
  }
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours < 24) {
    return remainingMinutes > 0
      ? `${hours}h ${remainingMinutes}m`
      : `${hours}h`;
  }
  const days = Math.floor(hours / 24);
  const remainingHours = hours % 24;
  return remainingHours > 0 ? `${days}d ${remainingHours}h` : `${days}d`;
}

function getStatusIcon(status: string): string {
  switch (status) {
    case "active":
      return "✅";
    case "warning":
      return "⚠️";
    case "critical":
      return "🔴";
    case "maintenance":
      return "🔧";
    case "disabled":
      return "⏸️";
    default:
      return "❓";
  }
}

main().catch(console.error);
