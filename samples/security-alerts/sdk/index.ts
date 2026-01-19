import { CopilotClient } from "@github/copilot-sdk";
import { runSample } from "../../../shared/index.js";
import { createGitHubConnector } from "../../../shared/connectors/github/index.js";
import {
  createSecurityAlertService,
  PrioritizedAlert,
  SecurityAnalysis,
} from "./alerts.js";

async function main() {
  await runSample(
    {
      name: "Security Alerts",
      description: "Prioritize and remediate security vulnerabilities",
    },
    async (_client: CopilotClient) => {
      const githubConnector = createGitHubConnector({ mode: "mock" });
      await githubConnector.initialize();

      const alertService = createSecurityAlertService(githubConnector);

      console.log("Analyzing security alerts...\n");

      const analysisResult = await alertService.analyzeAlerts();

      if (!analysisResult.success) {
        console.error(
          "Failed to analyze security alerts:",
          analysisResult.error?.message,
        );
        await githubConnector.dispose();
        return;
      }

      const analysis = analysisResult.data!;
      printAnalysisSummary(analysis);

      console.log("\nPrioritized Alerts:\n");
      for (const prioritized of analysis.prioritizedAlerts) {
        printPrioritizedAlert(prioritized);
      }

      console.log("\nFetching actionable alerts (with patches available)...\n");

      const actionableResult = await alertService.getActionableAlerts(3);
      if (actionableResult.success && actionableResult.data!.length > 0) {
        console.log(
          `Top ${actionableResult.data!.length} actionable alert(s):\n`,
        );
        for (const alert of actionableResult.data!) {
          console.log(`  #${alert.priorityRank}: ${alert.alert.package.name}`);
          console.log(`    Remediation steps:`);
          for (const step of alert.remediationSteps) {
            console.log(`      - ${step}`);
          }
          console.log();
        }
      } else {
        console.log("No actionable alerts found.\n");
      }

      await githubConnector.dispose();
    },
  );
}

function printAnalysisSummary(analysis: SecurityAnalysis): void {
  console.log("=== Security Analysis Summary ===");
  console.log(`Total Alerts: ${analysis.totalAlerts}`);
  console.log(`  Critical: ${analysis.criticalCount}`);
  console.log(`  High: ${analysis.highCount}`);
  console.log(`  Medium: ${analysis.mediumCount}`);
  console.log(`  Low: ${analysis.lowCount}`);
  console.log(`\nSummary: ${analysis.summary}`);
}

function printPrioritizedAlert(prioritized: PrioritizedAlert): void {
  const alert = prioritized.alert;
  console.log(`#${prioritized.priorityRank} - ${alert.package.name}`);
  console.log(`  Severity: ${alert.severity.toUpperCase()}`);
  console.log(`  Priority Score: ${prioritized.priorityScore}`);
  console.log(`  Estimated Effort: ${prioritized.estimatedEffort}`);
  console.log(`  State: ${alert.state}`);
  console.log(`  Vulnerable Range: ${alert.vulnerableVersionRange}`);
  if (alert.patchedVersions) {
    console.log(`  Patched Version: ${alert.patchedVersions}`);
  }
  console.log(`  Recommendation: ${prioritized.recommendation}`);
  console.log();
}

main().catch(console.error);
