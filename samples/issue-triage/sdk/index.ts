import { CopilotClient } from "@github/copilot-sdk";
import { runSample } from "../../../shared/index.js";
import { createGitHubConnector } from "../../../shared/connectors/github/index.js";
import { createTriageService, TriageResult } from "./triage.js";

async function main() {
  await runSample(
    {
      name: "Issue Triage",
      description: "Auto-label and triage GitHub issues using AI",
    },
    async (_client: CopilotClient) => {
      const githubConnector = createGitHubConnector({ mode: "mock" });
      await githubConnector.initialize();

      const triageService = createTriageService(githubConnector, {
        autoApplyLabels: true,
        priorityPrefix: "priority:",
      });

      console.log("Fetching and triaging open issues...\n");

      const result = await triageService.triageIssues({ state: "open" });

      if (!result.success) {
        console.error("Failed to triage issues:", result.error?.message);
        await githubConnector.dispose();
        return;
      }

      const triaged = result.data!;
      console.log(`Triaged ${triaged.length} issues:\n`);

      for (const item of triaged) {
        printTriageResult(item);
      }

      console.log("\nNow let's classify a specific issue...\n");

      const singleResult = await triageService.classifyIssue(1);
      if (singleResult.success && singleResult.data) {
        printTriageResult(singleResult.data);
      }

      await githubConnector.dispose();
    },
  );
}

function printTriageResult(item: TriageResult): void {
  console.log(`Issue #${item.issueNumber}:`);
  console.log(`  Category: ${item.category}`);
  console.log(`  Priority: ${item.priority}`);
  console.log(`  Confidence: ${(item.confidence * 100).toFixed(0)}%`);
  console.log(`  Labels: ${item.suggestedLabels.join(", ")}`);
  console.log(`  Reasoning: ${item.reasoning}\n`);
}

main().catch(console.error);
