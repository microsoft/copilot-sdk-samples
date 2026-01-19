import { CopilotClient } from "@github/copilot-sdk";
import { runSample } from "../../../shared/index.js";
import { createJiraConnector } from "../../../shared/connectors/jira/index.js";
import { createConfluenceConnector } from "../../../shared/connectors/confluence/index.js";
import {
  createAtlassianSyncService,
  SyncedIssue,
  ProjectDocumentation,
} from "./sync.js";

async function main() {
  await runSample(
    {
      name: "Jira + Confluence Integration",
      description: "Sync Jira issues to Confluence documentation",
    },
    async (_client: CopilotClient) => {
      const jiraConnector = createJiraConnector({ mode: "mock" });
      const confluenceConnector = createConfluenceConnector({ mode: "mock" });

      await jiraConnector.initialize();
      await confluenceConnector.initialize();

      const syncService = createAtlassianSyncService(
        jiraConnector,
        confluenceConnector,
      );

      console.log("=".repeat(60));
      console.log("Demo 1: Get Project Status");
      console.log("=".repeat(60));

      const statusResult = await syncService.getProjectStatus("DEMO");
      if (statusResult.success) {
        const status = statusResult.data!;
        console.log(`\nProject DEMO Status:`);
        console.log(`  Total Issues: ${status.totalIssues}`);
        console.log(`  Open: ${status.openIssues}`);
        console.log(`  Closed: ${status.closedIssues}`);
        console.log(`  By Priority:`);
        for (const [priority, count] of Object.entries(status.byPriority)) {
          console.log(`    ${priority}: ${count}`);
        }
        console.log(`  By Status:`);
        for (const [st, count] of Object.entries(status.byStatus)) {
          console.log(`    ${st}: ${count}`);
        }
      }

      console.log("\n" + "=".repeat(60));
      console.log("Demo 2: Sync Single Issue to Confluence");
      console.log("=".repeat(60));

      const singleSyncResult = await syncService.syncIssueToConfluence(
        "DEMO-1",
        "ENG",
        { includeComments: true },
      );

      if (singleSyncResult.success) {
        printSyncedIssue(singleSyncResult.data!);
      } else {
        console.log(`Failed to sync: ${singleSyncResult.error?.message}`);
      }

      console.log("\n" + "=".repeat(60));
      console.log("Demo 3: Generate Project Documentation");
      console.log("=".repeat(60));

      const docsResult = await syncService.generateProjectDocumentation(
        "DEMO",
        "ENG",
        {
          includeRoadmap: true,
          includeSprintSummary: true,
        },
      );

      if (docsResult.success) {
        printProjectDocumentation(docsResult.data!);
      } else {
        console.log(`Failed to generate docs: ${docsResult.error?.message}`);
      }

      console.log("\n" + "=".repeat(60));
      console.log("Demo 4: Find Related Documentation");
      console.log("=".repeat(60));

      const relatedResult =
        await syncService.findRelatedDocumentation("DEMO-2");
      if (relatedResult.success) {
        const pages = relatedResult.data!;
        console.log(`\nFound ${pages.length} related pages for DEMO-2:`);
        for (const page of pages) {
          console.log(`  - ${page.title} (${page.spaceKey})`);
        }
      }

      console.log("\n" + "=".repeat(60));
      console.log("Demo 5: Sync All Project Issues");
      console.log("=".repeat(60));

      const bulkSyncResult = await syncService.syncProjectToConfluence({
        jiraProjectKey: "SDK",
        confluenceSpaceKey: "ENG",
        createMissingPages: true,
        updateExisting: true,
        includeComments: false,
      });

      if (bulkSyncResult.success) {
        const synced = bulkSyncResult.data!;
        console.log(`\nSynced ${synced.length} issues from SDK project:`);
        for (const issue of synced) {
          const status = issue.syncStatus === "synced" ? "✓" : "✗";
          console.log(`  ${status} ${issue.jiraKey}: ${issue.jiraSummary}`);
        }
      }

      await jiraConnector.dispose();
      await confluenceConnector.dispose();

      console.log("\n" + "=".repeat(60));
      console.log("Demo Complete!");
      console.log("=".repeat(60));
    },
  );
}

function printSyncedIssue(issue: SyncedIssue): void {
  console.log(`\nSynced Issue:`);
  console.log(`  Jira Key: ${issue.jiraKey}`);
  console.log(`  Summary: ${issue.jiraSummary}`);
  console.log(`  Status: ${issue.jiraStatus}`);
  console.log(`  Confluence Page: ${issue.confluencePageTitle ?? "N/A"}`);
  console.log(`  Sync Status: ${issue.syncStatus}`);
  console.log(`  Last Synced: ${issue.lastSyncedAt ?? "Never"}`);
}

function printProjectDocumentation(docs: ProjectDocumentation): void {
  console.log(`\nGenerated Documentation for ${docs.project.name}:`);
  console.log(`  Space: ${docs.confluenceSpaceKey}`);
  console.log(`  Pages Created: ${docs.generatedPages.length}`);
  for (const page of docs.generatedPages) {
    console.log(`    - [${page.type}] ${page.title}`);
  }
  console.log(`\n  Project Summary:`);
  console.log(`    Total Issues: ${docs.summary.totalIssues}`);
  console.log(
    `    Completion: ${((docs.summary.closedIssues / docs.summary.totalIssues) * 100).toFixed(1)}%`,
  );
}

main().catch(console.error);
