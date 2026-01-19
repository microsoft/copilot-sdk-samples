import { CopilotClient } from "@github/copilot-sdk";
import { runSample } from "../../../shared/index.js";
import { createSnykConnector } from "../../../shared/connectors/snyk/client.js";
import {
  createScanningService,
  VulnerabilityOverview,
  ProjectVulnerabilityReport,
  IssueSummary,
  FixSummary,
  PrioritizedIssue,
} from "./scanning.js";

async function main() {
  await runSample(
    {
      name: "Snyk Security Scanning",
      description:
        "Scan projects for vulnerabilities, prioritize issues, and get fix suggestions",
    },
    async (_client: CopilotClient) => {
      const snykConnector = createSnykConnector({ mode: "mock" });
      await snykConnector.initialize();

      const scanningService = createScanningService(snykConnector);

      console.log("=== Snyk Security Scanning Demo ===\n");

      console.log("1. Vulnerability Overview...\n");
      const overviewResult = await scanningService.getVulnerabilityOverview();

      if (!overviewResult.success) {
        console.error(
          "Failed to get vulnerability overview:",
          overviewResult.error?.message,
        );
        await snykConnector.dispose();
        return;
      }

      printVulnerabilityOverview(overviewResult.data!);

      console.log("\n2. Critical Vulnerabilities...\n");
      const criticalResult = await scanningService.getCriticalVulnerabilities();

      if (criticalResult.success && criticalResult.data!.length > 0) {
        for (const vuln of criticalResult.data!.slice(0, 5)) {
          printIssueSummary(vuln);
        }
      } else {
        console.log("  No critical vulnerabilities found.\n");
      }

      console.log("\n3. Prioritized Issues (Top 10)...\n");
      const prioritizedResult = await scanningService.getPrioritizedIssues({
        limit: 10,
      });

      if (prioritizedResult.success && prioritizedResult.data!.length > 0) {
        for (const issue of prioritizedResult.data!) {
          printPrioritizedIssue(issue);
        }
      }

      console.log("\n4. Project Vulnerability Report (frontend-app)...\n");
      const reportResult =
        await scanningService.getProjectVulnerabilityReport("proj-001");

      if (reportResult.success) {
        printProjectReport(reportResult.data!);
      }

      console.log("\n5. Fix Suggestions for Frontend App...\n");
      const fixesResult = await scanningService.getFixableIssues("proj-001");

      if (fixesResult.success && fixesResult.data!.fixes.length > 0) {
        console.log(
          `  Found ${fixesResult.data!.issues.length} fixable issues:\n`,
        );
        for (const fix of fixesResult.data!.fixes.slice(0, 5)) {
          printFixSummary(fix);
        }
      }

      console.log("\n6. Upgrade Commands...\n");
      const commandsResult =
        await scanningService.getUpgradeCommands("proj-001");

      if (commandsResult.success && commandsResult.data!.length > 0) {
        console.log("  Run these commands to fix vulnerabilities:\n");
        for (const cmd of commandsResult.data!) {
          console.log(`    $ ${cmd}`);
        }
      }

      console.log("\n\n7. Testing Project...\n");
      const testResult = await scanningService.testProject("proj-001");

      if (testResult.success) {
        const icon = testResult.data!.ok ? "✅" : "⚠️";
        console.log(`  ${icon} ${testResult.data!.summary}`);
      }

      console.log("\n8. License Compliance Check...\n");
      const licenseResult = await scanningService.getLicenseIssues("proj-001");

      if (licenseResult.success && licenseResult.data!.length > 0) {
        for (const license of licenseResult.data!) {
          const icon = license.severity === "high" ? "🔴" : "⚠️";
          console.log(`  ${icon} ${license.license}`);
          console.log(`    Severity: ${license.severity}`);
          console.log(`    Affects: ${license.dependencies.join(", ")}`);
          console.log(`    Note: ${license.instructions}\n`);
        }
      } else {
        console.log("  No license compliance issues found.\n");
      }

      console.log("9. Ignoring a False Positive...\n");
      const ignoreResult = await scanningService.ignoreIssue(
        "proj-001",
        "SNYK-JS-DICER-2311764",
        {
          reason: "Not exploitable in our usage context",
          reasonType: "not-vulnerable",
        },
      );

      if (ignoreResult.success) {
        console.log(`  ✓ Ignored issue: ${ignoreResult.data!.issueId}`);
        console.log(`    Reason: ${ignoreResult.data!.reason}`);
      }

      await snykConnector.dispose();
      console.log("\n=== Demo Complete ===\n");
    },
  );
}

function printVulnerabilityOverview(overview: VulnerabilityOverview): void {
  console.log("  === Project Summary ===");
  console.log(`  Total Projects: ${overview.totalProjects}`);
  console.log(`    📊 Monitored: ${overview.monitoredProjects}`);
  console.log(`    🔇 Unmonitored: ${overview.unmonitoredProjects}`);
  console.log("\n  === Vulnerability Counts ===");
  console.log(`  Total Issues: ${overview.totalIssues}`);
  console.log(`    🚨 Critical: ${overview.criticalCount}`);
  console.log(`    🔴 High: ${overview.highCount}`);
  console.log(`    🟡 Medium: ${overview.mediumCount}`);
  console.log(`    🔵 Low: ${overview.lowCount}`);
  console.log(`    🔧 Fixable: ~${overview.fixableCount}`);
}

function printIssueSummary(issue: IssueSummary): void {
  const severityIcon = getSeverityIcon(issue.severity);
  console.log(`  ${severityIcon} ${issue.title}`);
  console.log(`    Package: ${issue.pkgName}@${issue.pkgVersion}`);
  if (issue.cve) {
    console.log(`    CVE: ${issue.cve}`);
  }
  if (issue.cvssScore) {
    console.log(`    CVSS: ${issue.cvssScore}`);
  }
  console.log(`    Exploit: ${issue.exploitMaturity}`);
  console.log(`    Fixable: ${issue.isFixable ? "Yes" : "No"}`);
  console.log(`    Priority Score: ${issue.priorityScore}\n`);
}

function printPrioritizedIssue(issue: PrioritizedIssue): void {
  const severityIcon = getSeverityIcon(issue.severity);
  console.log(
    `  ${severityIcon} [Score: ${issue.urgencyScore}] ${issue.title}`,
  );
  console.log(`    Project: ${issue.projectName}`);
  console.log(`    Package: ${issue.pkgName}@${issue.pkgVersion}`);
  console.log(`    Reason: ${issue.urgencyReason}\n`);
}

function printProjectReport(report: ProjectVulnerabilityReport): void {
  console.log(`  === ${report.project.name} ===`);
  console.log(`  Type: ${report.project.type}`);
  console.log(`  Branch: ${report.project.branch || "N/A"}`);
  console.log(`  Monitored: ${report.project.isMonitored ? "Yes" : "No"}`);
  console.log(`\n  Issues: ${report.summary.totalIssues}`);
  console.log(`  Fixable: ${report.summary.fixableIssues}`);
  console.log("\n  By Severity:");
  for (const [severity, count] of report.summary.bySeverity) {
    const icon = getSeverityIcon(severity);
    console.log(`    ${icon} ${severity}: ${count}`);
  }
}

function printFixSummary(fix: FixSummary): void {
  const effortIcon =
    fix.effort === "low" ? "🟢" : fix.effort === "medium" ? "🟡" : "🔴";
  console.log(`  ${effortIcon} ${fix.packageName}`);
  console.log(`    Current: ${fix.currentVersion}`);
  console.log(`    Fixed: ${fix.fixedVersion || "N/A"}`);
  console.log(`    Type: ${fix.fixType}`);
  console.log(`    Effort: ${fix.effort}`);
  console.log(`    Breaking: ${fix.isBreaking ? "Yes" : "No"}`);
  if (fix.command) {
    console.log(`    Command: ${fix.command}`);
  }
  console.log();
}

function getSeverityIcon(severity: string): string {
  switch (severity) {
    case "critical":
      return "🚨";
    case "high":
      return "🔴";
    case "medium":
      return "🟡";
    case "low":
      return "🔵";
    default:
      return "❔";
  }
}

main().catch(console.error);
