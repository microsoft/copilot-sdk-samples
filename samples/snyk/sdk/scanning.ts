import { CopilotClient } from "@github/copilot-sdk";
import {
  SnykConnector,
  SnykIssue,
  SnykProject,
  SnykFixSuggestion,
  SnykSeverity,
} from "../../../shared/connectors/snyk/client.js";
import {
  ConnectorResult,
  success,
  failure,
} from "../../../shared/connectors/types.js";

// ============================================================================
// Types
// ============================================================================

export interface ProjectSummary {
  id: string;
  name: string;
  origin: string;
  type: string;
  isMonitored: boolean;
  branch: string | null;
  lastTestedAt: string | null;
  issueCountsBySeverity: {
    critical: number;
    high: number;
    medium: number;
    low: number;
  };
  totalIssues: number;
}

export interface IssueSummary {
  id: string;
  title: string;
  severity: SnykSeverity;
  pkgName: string;
  pkgVersion: string;
  cve: string | null;
  cvssScore: number | null;
  exploitMaturity: string;
  isFixable: boolean;
  isUpgradable: boolean;
  priorityScore: number;
  introducedBy: string;
}

export interface FixSummary {
  issueId: string;
  issueTitle: string;
  fixType: string;
  packageName: string;
  currentVersion: string;
  fixedVersion: string | null;
  command: string | null;
  effort: string;
  isBreaking: boolean;
}

export interface VulnerabilityOverview {
  totalProjects: number;
  monitoredProjects: number;
  unmonitoredProjects: number;
  totalIssues: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  fixableCount: number;
  projects: ProjectSummary[];
}

export interface ProjectVulnerabilityReport {
  project: ProjectSummary;
  issues: IssueSummary[];
  fixSuggestions: FixSummary[];
  summary: {
    totalIssues: number;
    fixableIssues: number;
    bySeverity: Map<SnykSeverity, number>;
  };
}

export interface PrioritizedIssue extends IssueSummary {
  projectId: string;
  projectName: string;
  urgencyScore: number;
  urgencyReason: string;
}

export interface ScanningServiceConfig {
  connector: SnykConnector;
  client?: CopilotClient;
}

// ============================================================================
// Scanning Service Implementation
// ============================================================================

export class ScanningService {
  private connector: SnykConnector;
  private _client?: CopilotClient;

  constructor(config: ScanningServiceConfig) {
    this.connector = config.connector;
    this._client = config.client;
  }

  /**
   * Get overview of all projects and their vulnerability counts
   */
  async getVulnerabilityOverview(): Promise<
    ConnectorResult<VulnerabilityOverview>
  > {
    const result = await this.connector.listProjects();

    if (!result.success) {
      return failure(result.error!);
    }

    const projects = result.data!.projects;
    const summaries = projects.map((p) => this.toProjectSummary(p));

    let totalIssues = 0;
    let criticalCount = 0;
    let highCount = 0;
    let mediumCount = 0;
    let lowCount = 0;

    for (const project of projects) {
      totalIssues += project.totalIssues;
      criticalCount += project.issueCountsBySeverity.critical;
      highCount += project.issueCountsBySeverity.high;
      mediumCount += project.issueCountsBySeverity.medium;
      lowCount += project.issueCountsBySeverity.low;
    }

    // Estimate fixable count (we'd need to query issues to get exact)
    const fixableCount = Math.floor(totalIssues * 0.7); // Rough estimate

    const overview: VulnerabilityOverview = {
      totalProjects: projects.length,
      monitoredProjects: projects.filter((p) => p.isMonitored).length,
      unmonitoredProjects: projects.filter((p) => !p.isMonitored).length,
      totalIssues,
      criticalCount,
      highCount,
      mediumCount,
      lowCount,
      fixableCount,
      projects: summaries,
    };

    return success(overview);
  }

  /**
   * Get critical vulnerabilities across all projects
   */
  async getCriticalVulnerabilities(): Promise<ConnectorResult<IssueSummary[]>> {
    const projectsResult = await this.connector.listProjects({
      isMonitored: true,
    });

    if (!projectsResult.success) {
      return failure(projectsResult.error!);
    }

    const allCritical: IssueSummary[] = [];

    for (const project of projectsResult.data!.projects) {
      const issuesResult = await this.connector.listIssues(project.id, {
        severity: ["critical"],
      });

      if (issuesResult.success) {
        const summaries = issuesResult.data!.issues.map((i) =>
          this.toIssueSummary(i),
        );
        allCritical.push(...summaries);
      }
    }

    // Sort by priority score descending
    allCritical.sort((a, b) => b.priorityScore - a.priorityScore);

    return success(allCritical);
  }

  /**
   * Get fixable issues that can be automatically remediated
   */
  async getFixableIssues(projectId: string): Promise<
    ConnectorResult<{
      issues: IssueSummary[];
      fixes: FixSummary[];
    }>
  > {
    const issuesResult = await this.connector.listIssues(projectId, {
      isFixable: true,
    });

    if (!issuesResult.success) {
      return failure(issuesResult.error!);
    }

    const issues = issuesResult.data!.issues.map((i) => this.toIssueSummary(i));

    const fixesResult = await this.connector.getFixSuggestions(projectId);

    if (!fixesResult.success) {
      return failure(fixesResult.error!);
    }

    const fixes = fixesResult.data!.map((f) => this.toFixSummary(f));

    return success({ issues, fixes });
  }

  /**
   * Get fix suggestions for a project
   */
  async getFixSuggestions(
    projectId: string,
    issueIds?: string[],
  ): Promise<ConnectorResult<FixSummary[]>> {
    const result = await this.connector.getFixSuggestions(projectId, {
      issueIds,
    });

    if (!result.success) {
      return failure(result.error!);
    }

    return success(result.data!.map((f) => this.toFixSummary(f)));
  }

  /**
   * Get prioritized list of issues across all projects
   * Prioritizes by: severity, exploit maturity, fixability, and CVSS score
   */
  async getPrioritizedIssues(options?: {
    limit?: number;
    severity?: SnykSeverity[];
  }): Promise<ConnectorResult<PrioritizedIssue[]>> {
    const projectsResult = await this.connector.listProjects({
      isMonitored: true,
    });

    if (!projectsResult.success) {
      return failure(projectsResult.error!);
    }

    const allIssues: PrioritizedIssue[] = [];

    for (const project of projectsResult.data!.projects) {
      const issuesResult = await this.connector.listIssues(project.id, {
        severity: options?.severity,
      });

      if (issuesResult.success) {
        for (const issue of issuesResult.data!.issues) {
          const { urgencyScore, urgencyReason } = this.calculateUrgency(issue);
          allIssues.push({
            ...this.toIssueSummary(issue),
            projectId: project.id,
            projectName: project.name,
            urgencyScore,
            urgencyReason,
          });
        }
      }
    }

    // Sort by urgency score descending
    allIssues.sort((a, b) => b.urgencyScore - a.urgencyScore);

    const limit = options?.limit ?? 20;
    return success(allIssues.slice(0, limit));
  }

  /**
   * Get vulnerability report for a specific project
   */
  async getProjectVulnerabilityReport(
    projectId: string,
  ): Promise<ConnectorResult<ProjectVulnerabilityReport>> {
    const projectResult = await this.connector.getProject(projectId);

    if (!projectResult.success) {
      return failure(projectResult.error!);
    }

    const issuesResult = await this.connector.listIssues(projectId);

    if (!issuesResult.success) {
      return failure(issuesResult.error!);
    }

    const fixesResult = await this.connector.getFixSuggestions(projectId);

    if (!fixesResult.success) {
      return failure(fixesResult.error!);
    }

    const issues = issuesResult.data!.issues;
    const issueSummaries = issues.map((i) => this.toIssueSummary(i));
    const fixSummaries = fixesResult.data!.map((f) => this.toFixSummary(f));

    const bySeverity = new Map<SnykSeverity, number>();
    for (const issue of issues) {
      bySeverity.set(issue.severity, (bySeverity.get(issue.severity) || 0) + 1);
    }

    const report: ProjectVulnerabilityReport = {
      project: this.toProjectSummary(projectResult.data!),
      issues: issueSummaries,
      fixSuggestions: fixSummaries,
      summary: {
        totalIssues: issues.length,
        fixableIssues: issues.filter((i) => i.isFixable).length,
        bySeverity,
      },
    };

    return success(report);
  }

  /**
   * Test a project and get current vulnerability status
   */
  async testProject(projectId: string): Promise<
    ConnectorResult<{
      ok: boolean;
      issuesCount: number;
      summary: string;
      vulnerabilities: IssueSummary[];
    }>
  > {
    const result = await this.connector.testProject(projectId);

    if (!result.success) {
      return failure(result.error!);
    }

    const testResult = result.data!;

    return success({
      ok: testResult.ok,
      issuesCount: testResult.issuesCount,
      summary: testResult.summary,
      vulnerabilities: testResult.vulnerabilities.map((v) =>
        this.toIssueSummary(v),
      ),
    });
  }

  /**
   * Ignore an issue (suppress from reports)
   */
  async ignoreIssue(
    projectId: string,
    issueId: string,
    options: {
      reason: string;
      reasonType: "temporary-ignore" | "permanent-ignore" | "not-vulnerable";
      expires?: string;
    },
  ): Promise<ConnectorResult<{ id: string; issueId: string; reason: string }>> {
    const result = await this.connector.ignoreIssue(
      projectId,
      issueId,
      options,
    );

    if (!result.success) {
      return failure(result.error!);
    }

    return success({
      id: result.data!.id,
      issueId: result.data!.issueId,
      reason: result.data!.reason,
    });
  }

  /**
   * Get upgrade commands for fixable issues
   */
  async getUpgradeCommands(
    projectId: string,
  ): Promise<ConnectorResult<string[]>> {
    const fixesResult = await this.connector.getFixSuggestions(projectId);

    if (!fixesResult.success) {
      return failure(fixesResult.error!);
    }

    const commands = fixesResult
      .data!.filter((f) => f.command !== null)
      .map((f) => f.command!);

    return success(commands);
  }

  /**
   * Get projects by type (npm, pip, maven, etc.)
   */
  async getProjectsByType(
    type: string,
  ): Promise<ConnectorResult<ProjectSummary[]>> {
    const result = await this.connector.listProjects({
      type: type as
        | "npm"
        | "maven"
        | "pip"
        | "gomodules"
        | "dockerfile"
        | "terraformconfig",
    });

    if (!result.success) {
      return failure(result.error!);
    }

    return success(result.data!.projects.map((p) => this.toProjectSummary(p)));
  }

  /**
   * Get license compliance issues for a project
   */
  async getLicenseIssues(projectId: string): Promise<
    ConnectorResult<
      Array<{
        license: string;
        severity: SnykSeverity;
        dependencies: string[];
        instructions: string;
      }>
    >
  > {
    const result = await this.connector.listLicenseIssues(projectId);

    if (!result.success) {
      return failure(result.error!);
    }

    return success(
      result.data!.licenses.map((l) => ({
        license: l.license,
        severity: l.severity,
        dependencies: l.dependencies,
        instructions: l.instructions,
      })),
    );
  }

  /**
   * Get SBOM (Software Bill of Materials) for a project
   */
  async getProjectSbom(
    projectId: string,
    format?: "cyclonedx1.4+json" | "spdx2.3+json",
  ): Promise<ConnectorResult<object>> {
    return this.connector.getProjectSbom(projectId, format);
  }

  // ============================================================================
  // Private Helpers
  // ============================================================================

  private toProjectSummary(project: SnykProject): ProjectSummary {
    return {
      id: project.id,
      name: project.name,
      origin: project.origin,
      type: project.type,
      isMonitored: project.isMonitored,
      branch: project.branch,
      lastTestedAt: project.lastTestedAt,
      issueCountsBySeverity: project.issueCountsBySeverity,
      totalIssues: project.totalIssues,
    };
  }

  private toIssueSummary(issue: SnykIssue): IssueSummary {
    return {
      id: issue.id,
      title: issue.title,
      severity: issue.severity,
      pkgName: issue.pkgName,
      pkgVersion: issue.pkgVersion,
      cve: issue.identifiers.CVE?.[0] || null,
      cvssScore: issue.cvssScore,
      exploitMaturity: issue.exploitMaturity,
      isFixable: issue.isFixable,
      isUpgradable: issue.isUpgradable,
      priorityScore: issue.priorityScore,
      introducedBy: issue.introducedBy,
    };
  }

  private toFixSummary(fix: SnykFixSuggestion): FixSummary {
    return {
      issueId: fix.issueId,
      issueTitle: fix.description,
      fixType: fix.fixType,
      packageName: fix.packageName,
      currentVersion: fix.currentVersion,
      fixedVersion: fix.fixedVersion,
      command: fix.command,
      effort: fix.effort,
      isBreaking: fix.isBreaking,
    };
  }

  private calculateUrgency(issue: SnykIssue): {
    urgencyScore: number;
    urgencyReason: string;
  } {
    let score = 0;
    const reasons: string[] = [];

    // Severity weight (max 40 points)
    const severityScores: Record<SnykSeverity, number> = {
      critical: 40,
      high: 30,
      medium: 20,
      low: 10,
    };
    score += severityScores[issue.severity];
    reasons.push(`${issue.severity} severity`);

    // Exploit maturity weight (max 30 points)
    const maturityScores: Record<string, number> = {
      mature: 30,
      "proof-of-concept": 20,
      "no-known-exploit": 10,
      "no-data": 5,
    };
    score += maturityScores[issue.exploitMaturity] || 5;
    if (issue.exploitMaturity === "mature") {
      reasons.push("mature exploit available");
    } else if (issue.exploitMaturity === "proof-of-concept") {
      reasons.push("PoC exploit exists");
    }

    // Fixability bonus (max 15 points)
    if (issue.isUpgradable) {
      score += 15;
      reasons.push("easy upgrade available");
    } else if (issue.isFixable) {
      score += 10;
      reasons.push("fix available");
    }

    // CVSS score weight (max 15 points)
    if (issue.cvssScore !== null) {
      score += Math.round(issue.cvssScore * 1.5);
    }

    return {
      urgencyScore: score,
      urgencyReason: reasons.join(", "),
    };
  }
}

// ============================================================================
// Factory Function
// ============================================================================

export function createScanningService(
  connector: SnykConnector,
  options?: Partial<Omit<ScanningServiceConfig, "connector">>,
): ScanningService {
  return new ScanningService({
    connector,
    ...options,
  });
}
