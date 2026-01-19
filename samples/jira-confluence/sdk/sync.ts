import { CopilotClient } from "@github/copilot-sdk";
import {
  JiraConnector,
  JiraIssue,
  JiraProject,
} from "../../../shared/connectors/jira/index.js";
import {
  ConfluenceConnector,
  ConfluencePage,
} from "../../../shared/connectors/confluence/index.js";
import {
  ConnectorResult,
  success,
  failure,
  ErrorCodes,
} from "../../../shared/connectors/types.js";

export interface SyncedIssue {
  jiraKey: string;
  jiraSummary: string;
  jiraStatus: string;
  confluencePageId: string | null;
  confluencePageTitle: string | null;
  syncStatus: "synced" | "pending" | "error";
  lastSyncedAt: string | null;
}

export interface ProjectDocumentation {
  project: JiraProject;
  confluenceSpaceKey: string;
  generatedPages: GeneratedPage[];
  summary: ProjectSummary;
}

export interface GeneratedPage {
  title: string;
  pageId: string;
  type: "overview" | "sprint" | "issue" | "roadmap";
  webUrl: string;
}

export interface ProjectSummary {
  totalIssues: number;
  openIssues: number;
  closedIssues: number;
  byPriority: Record<string, number>;
  byStatus: Record<string, number>;
  byType: Record<string, number>;
}

export interface IssueSyncConfig {
  jiraProjectKey: string;
  confluenceSpaceKey: string;
  createMissingPages: boolean;
  updateExisting: boolean;
  includeComments: boolean;
  pageTemplate?: string;
}

export interface AtlassianSyncServiceConfig {
  jiraConnector: JiraConnector;
  confluenceConnector: ConfluenceConnector;
  client?: CopilotClient;
}

export class AtlassianSyncService {
  private jira: JiraConnector;
  private confluence: ConfluenceConnector;
  private client?: CopilotClient;

  constructor(config: AtlassianSyncServiceConfig) {
    this.jira = config.jiraConnector;
    this.confluence = config.confluenceConnector;
    this.client = config.client;
  }

  async syncIssueToConfluence(
    issueKey: string,
    spaceKey: string,
    options?: {
      parentPageId?: string;
      includeComments?: boolean;
    },
  ): Promise<ConnectorResult<SyncedIssue>> {
    const issueResult = await this.jira.getIssue(issueKey);
    if (!issueResult.success) {
      return failure(issueResult.error!);
    }

    const issue = issueResult.data!;
    const pageTitle = `[${issue.key}] ${issue.summary}`;

    const existingPage = await this.confluence.getPageByTitle(
      spaceKey,
      pageTitle,
    );

    let pageResult: ConnectorResult<ConfluencePage>;

    if (existingPage.success) {
      pageResult = await this.confluence.updatePage(existingPage.data!.id, {
        body: this.generateIssuePageContent(
          issue,
          options?.includeComments ?? false,
        ),
        version: existingPage.data!.version.number,
        versionMessage: `Synced from Jira at ${new Date().toISOString()}`,
      });
    } else if (existingPage.error?.code === ErrorCodes.NOT_FOUND) {
      pageResult = await this.confluence.createPage({
        spaceKey,
        title: pageTitle,
        body: this.generateIssuePageContent(
          issue,
          options?.includeComments ?? false,
        ),
        parentId: options?.parentPageId,
      });
    } else {
      return failure(existingPage.error!);
    }

    if (!pageResult.success) {
      return failure(pageResult.error!);
    }

    return success({
      jiraKey: issue.key,
      jiraSummary: issue.summary,
      jiraStatus: issue.status.name,
      confluencePageId: pageResult.data!.id,
      confluencePageTitle: pageResult.data!.title,
      syncStatus: "synced",
      lastSyncedAt: new Date().toISOString(),
    });
  }

  async syncProjectToConfluence(
    config: IssueSyncConfig,
  ): Promise<ConnectorResult<SyncedIssue[]>> {
    const issuesResult = await this.jira.listIssues({
      projectKey: config.jiraProjectKey,
      maxResults: 100,
    });

    if (!issuesResult.success) {
      return failure(issuesResult.error!);
    }

    const syncedIssues: SyncedIssue[] = [];

    for (const issue of issuesResult.data!.issues) {
      if (config.createMissingPages || config.updateExisting) {
        const syncResult = await this.syncIssueToConfluence(
          issue.key,
          config.confluenceSpaceKey,
          { includeComments: config.includeComments },
        );

        if (syncResult.success) {
          syncedIssues.push(syncResult.data!);
        } else {
          syncedIssues.push({
            jiraKey: issue.key,
            jiraSummary: issue.summary,
            jiraStatus: issue.status.name,
            confluencePageId: null,
            confluencePageTitle: null,
            syncStatus: "error",
            lastSyncedAt: null,
          });
        }
      } else {
        const pageTitle = `[${issue.key}] ${issue.summary}`;
        const existingPage = await this.confluence.getPageByTitle(
          config.confluenceSpaceKey,
          pageTitle,
        );

        syncedIssues.push({
          jiraKey: issue.key,
          jiraSummary: issue.summary,
          jiraStatus: issue.status.name,
          confluencePageId: existingPage.success ? existingPage.data!.id : null,
          confluencePageTitle: existingPage.success
            ? existingPage.data!.title
            : null,
          syncStatus: existingPage.success ? "synced" : "pending",
          lastSyncedAt: existingPage.success ? new Date().toISOString() : null,
        });
      }
    }

    return success(syncedIssues);
  }

  async generateProjectDocumentation(
    jiraProjectKey: string,
    confluenceSpaceKey: string,
    options?: {
      includeRoadmap?: boolean;
      includeSprintSummary?: boolean;
      parentPageId?: string;
    },
  ): Promise<ConnectorResult<ProjectDocumentation>> {
    const projectsResult = await this.jira.listProjects();
    if (!projectsResult.success) {
      return failure(projectsResult.error!);
    }

    const project = projectsResult.data!.find((p) => p.key === jiraProjectKey);
    if (!project) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Project ${jiraProjectKey} not found`,
      });
    }

    const issuesResult = await this.jira.listIssues({
      projectKey: jiraProjectKey,
      maxResults: 100,
    });

    if (!issuesResult.success) {
      return failure(issuesResult.error!);
    }

    const issues = issuesResult.data!.issues;
    const summary = this.calculateProjectSummary(issues);
    const generatedPages: GeneratedPage[] = [];

    const overviewPage = await this.confluence.createPage({
      spaceKey: confluenceSpaceKey,
      title: `${project.name} - Project Overview`,
      body: this.generateProjectOverviewContent(project, summary, issues),
      parentId: options?.parentPageId,
    });

    if (overviewPage.success) {
      generatedPages.push({
        title: overviewPage.data!.title,
        pageId: overviewPage.data!.id,
        type: "overview",
        webUrl: overviewPage.data!.webUrl,
      });
    }

    if (options?.includeRoadmap) {
      const roadmapPage = await this.confluence.createPage({
        spaceKey: confluenceSpaceKey,
        title: `${project.name} - Roadmap`,
        body: this.generateRoadmapContent(project, issues),
        parentId: overviewPage.success
          ? overviewPage.data!.id
          : options?.parentPageId,
      });

      if (roadmapPage.success) {
        generatedPages.push({
          title: roadmapPage.data!.title,
          pageId: roadmapPage.data!.id,
          type: "roadmap",
          webUrl: roadmapPage.data!.webUrl,
        });
      }
    }

    if (options?.includeSprintSummary) {
      const sprintIssues = issues.filter((i) => i.sprint?.state === "active");
      if (sprintIssues.length > 0) {
        const sprintName = sprintIssues[0].sprint?.name ?? "Current Sprint";
        const sprintPage = await this.confluence.createPage({
          spaceKey: confluenceSpaceKey,
          title: `${project.name} - ${sprintName}`,
          body: this.generateSprintContent(project, sprintName, sprintIssues),
          parentId: overviewPage.success
            ? overviewPage.data!.id
            : options?.parentPageId,
        });

        if (sprintPage.success) {
          generatedPages.push({
            title: sprintPage.data!.title,
            pageId: sprintPage.data!.id,
            type: "sprint",
            webUrl: sprintPage.data!.webUrl,
          });
        }
      }
    }

    return success({
      project,
      confluenceSpaceKey,
      generatedPages,
      summary,
    });
  }

  async findRelatedDocumentation(
    issueKey: string,
  ): Promise<ConnectorResult<ConfluencePage[]>> {
    const issueResult = await this.jira.getIssue(issueKey);
    if (!issueResult.success) {
      return failure(issueResult.error!);
    }

    const issue = issueResult.data!;
    const searchTerms = [
      issue.key,
      issue.summary,
      ...issue.labels,
      ...issue.components.map((c) => c.name),
    ];

    const searchQuery = searchTerms.slice(0, 3).join(" ");
    const searchResult = await this.confluence.searchPages(searchQuery, {
      limit: 10,
    });

    if (!searchResult.success) {
      return failure(searchResult.error!);
    }

    return success(searchResult.data!.results);
  }

  async getProjectStatus(
    jiraProjectKey: string,
  ): Promise<ConnectorResult<ProjectSummary>> {
    const issuesResult = await this.jira.listIssues({
      projectKey: jiraProjectKey,
      maxResults: 100,
    });

    if (!issuesResult.success) {
      return failure(issuesResult.error!);
    }

    return success(this.calculateProjectSummary(issuesResult.data!.issues));
  }

  private calculateProjectSummary(issues: JiraIssue[]): ProjectSummary {
    const byPriority: Record<string, number> = {};
    const byStatus: Record<string, number> = {};
    const byType: Record<string, number> = {};
    let openIssues = 0;
    let closedIssues = 0;

    for (const issue of issues) {
      byPriority[issue.priority.name] =
        (byPriority[issue.priority.name] ?? 0) + 1;
      byStatus[issue.status.name] = (byStatus[issue.status.name] ?? 0) + 1;
      byType[issue.issueType.name] = (byType[issue.issueType.name] ?? 0) + 1;

      if (issue.status.category === "done") {
        closedIssues++;
      } else {
        openIssues++;
      }
    }

    return {
      totalIssues: issues.length,
      openIssues,
      closedIssues,
      byPriority,
      byStatus,
      byType,
    };
  }

  private generateIssuePageContent(
    issue: JiraIssue,
    includeComments: boolean,
  ): string {
    const sections = [
      `<h1>${issue.key}: ${issue.summary}</h1>`,
      `<p><strong>Status:</strong> ${issue.status.name}</p>`,
      `<p><strong>Priority:</strong> ${issue.priority.name}</p>`,
      `<p><strong>Type:</strong> ${issue.issueType.name}</p>`,
      issue.assignee
        ? `<p><strong>Assignee:</strong> ${issue.assignee.displayName}</p>`
        : "",
      issue.dueDate ? `<p><strong>Due Date:</strong> ${issue.dueDate}</p>` : "",
      issue.storyPoints
        ? `<p><strong>Story Points:</strong> ${issue.storyPoints}</p>`
        : "",
      `<h2>Description</h2>`,
      `<p>${issue.description ?? "No description provided."}</p>`,
    ];

    if (issue.labels.length > 0) {
      sections.push(`<h2>Labels</h2>`);
      sections.push(`<p>${issue.labels.join(", ")}</p>`);
    }

    if (issue.linkedIssues.length > 0) {
      sections.push(`<h2>Linked Issues</h2>`);
      sections.push(
        `<ul>${issue.linkedIssues.map((l) => `<li>${l.key}: ${l.summary} (${l.type})</li>`).join("")}</ul>`,
      );
    }

    if (includeComments && issue.comments.length > 0) {
      sections.push(`<h2>Comments</h2>`);
      for (const comment of issue.comments) {
        sections.push(
          `<div><strong>${comment.author.displayName}</strong> (${comment.createdAt}):</div>`,
        );
        sections.push(`<blockquote>${comment.body}</blockquote>`);
      }
    }

    sections.push(
      `<hr/><p><em>Last synced from Jira at ${new Date().toISOString()}</em></p>`,
    );

    return sections.filter(Boolean).join("\n");
  }

  private generateProjectOverviewContent(
    project: JiraProject,
    summary: ProjectSummary,
    issues: JiraIssue[],
  ): string {
    const priorityRows = Object.entries(summary.byPriority)
      .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
      .join("");

    const statusRows = Object.entries(summary.byStatus)
      .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
      .join("");

    const typeRows = Object.entries(summary.byType)
      .map(([k, v]) => `<tr><td>${k}</td><td>${v}</td></tr>`)
      .join("");

    const highPriorityIssues = issues
      .filter(
        (i) => i.priority.name === "Highest" || i.priority.name === "High",
      )
      .filter((i) => i.status.category !== "done")
      .slice(0, 5);

    return `
<h1>${project.name} - Project Overview</h1>
<p>Auto-generated documentation for the ${project.name} (${project.key}) project.</p>

<h2>Summary</h2>
<ul>
  <li><strong>Total Issues:</strong> ${summary.totalIssues}</li>
  <li><strong>Open:</strong> ${summary.openIssues}</li>
  <li><strong>Closed:</strong> ${summary.closedIssues}</li>
  <li><strong>Completion Rate:</strong> ${((summary.closedIssues / summary.totalIssues) * 100).toFixed(1)}%</li>
</ul>

<h2>By Priority</h2>
<table>
  <tr><th>Priority</th><th>Count</th></tr>
  ${priorityRows}
</table>

<h2>By Status</h2>
<table>
  <tr><th>Status</th><th>Count</th></tr>
  ${statusRows}
</table>

<h2>By Type</h2>
<table>
  <tr><th>Type</th><th>Count</th></tr>
  ${typeRows}
</table>

<h2>High Priority Open Issues</h2>
<table>
  <tr><th>Key</th><th>Summary</th><th>Assignee</th><th>Status</th></tr>
  ${highPriorityIssues.map((i) => `<tr><td>${i.key}</td><td>${i.summary}</td><td>${i.assignee?.displayName ?? "Unassigned"}</td><td>${i.status.name}</td></tr>`).join("")}
</table>

<hr/>
<p><em>Generated at ${new Date().toISOString()}</em></p>
    `.trim();
  }

  private generateRoadmapContent(
    project: JiraProject,
    issues: JiraIssue[],
  ): string {
    const epics = issues.filter((i) => i.issueType.name === "Epic");

    const todoItems = issues.filter((i) => i.status.category === "todo");
    const inProgressItems = issues.filter(
      (i) => i.status.category === "in_progress",
    );
    const doneItems = issues.filter((i) => i.status.category === "done");

    return `
<h1>${project.name} - Roadmap</h1>

<h2>Epics</h2>
${epics.length > 0 ? `<ul>${epics.map((e) => `<li><strong>${e.key}</strong>: ${e.summary} (${e.status.name})</li>`).join("")}</ul>` : "<p>No epics defined.</p>"}

<h2>Backlog (To Do)</h2>
${
  todoItems.length > 0
    ? `<ul>${todoItems
        .slice(0, 10)
        .map((i) => `<li>${i.key}: ${i.summary}</li>`)
        .join("")}</ul>`
    : "<p>Backlog is empty.</p>"
}
${todoItems.length > 10 ? `<p>...and ${todoItems.length - 10} more items</p>` : ""}

<h2>In Progress</h2>
${inProgressItems.length > 0 ? `<ul>${inProgressItems.map((i) => `<li>${i.key}: ${i.summary} (${i.assignee?.displayName ?? "Unassigned"})</li>`).join("")}</ul>` : "<p>No items in progress.</p>"}

<h2>Recently Completed</h2>
${
  doneItems.length > 0
    ? `<ul>${doneItems
        .slice(0, 10)
        .map((i) => `<li>${i.key}: ${i.summary}</li>`)
        .join("")}</ul>`
    : "<p>No completed items.</p>"
}

<hr/>
<p><em>Generated at ${new Date().toISOString()}</em></p>
    `.trim();
  }

  private generateSprintContent(
    project: JiraProject,
    sprintName: string,
    issues: JiraIssue[],
  ): string {
    const totalPoints = issues.reduce(
      (sum, i) => sum + (i.storyPoints ?? 0),
      0,
    );
    const completedPoints = issues
      .filter((i) => i.status.category === "done")
      .reduce((sum, i) => sum + (i.storyPoints ?? 0), 0);

    const byStatus = {
      todo: issues.filter((i) => i.status.category === "todo"),
      inProgress: issues.filter((i) => i.status.category === "in_progress"),
      done: issues.filter((i) => i.status.category === "done"),
    };

    return `
<h1>${project.name} - ${sprintName}</h1>

<h2>Sprint Progress</h2>
<ul>
  <li><strong>Total Issues:</strong> ${issues.length}</li>
  <li><strong>Story Points:</strong> ${completedPoints} / ${totalPoints} (${totalPoints > 0 ? ((completedPoints / totalPoints) * 100).toFixed(1) : 0}%)</li>
  <li><strong>To Do:</strong> ${byStatus.todo.length}</li>
  <li><strong>In Progress:</strong> ${byStatus.inProgress.length}</li>
  <li><strong>Done:</strong> ${byStatus.done.length}</li>
</ul>

<h2>To Do</h2>
<table>
  <tr><th>Key</th><th>Summary</th><th>Points</th><th>Assignee</th></tr>
  ${byStatus.todo.map((i) => `<tr><td>${i.key}</td><td>${i.summary}</td><td>${i.storyPoints ?? "-"}</td><td>${i.assignee?.displayName ?? "Unassigned"}</td></tr>`).join("")}
</table>

<h2>In Progress</h2>
<table>
  <tr><th>Key</th><th>Summary</th><th>Points</th><th>Assignee</th></tr>
  ${byStatus.inProgress.map((i) => `<tr><td>${i.key}</td><td>${i.summary}</td><td>${i.storyPoints ?? "-"}</td><td>${i.assignee?.displayName ?? "Unassigned"}</td></tr>`).join("")}
</table>

<h2>Completed</h2>
<table>
  <tr><th>Key</th><th>Summary</th><th>Points</th><th>Assignee</th></tr>
  ${byStatus.done.map((i) => `<tr><td>${i.key}</td><td>${i.summary}</td><td>${i.storyPoints ?? "-"}</td><td>${i.assignee?.displayName ?? "Unassigned"}</td></tr>`).join("")}
</table>

<hr/>
<p><em>Generated at ${new Date().toISOString()}</em></p>
    `.trim();
  }
}

export function createAtlassianSyncService(
  jiraConnector: JiraConnector,
  confluenceConnector: ConfluenceConnector,
  client?: CopilotClient,
): AtlassianSyncService {
  return new AtlassianSyncService({
    jiraConnector,
    confluenceConnector,
    client,
  });
}
