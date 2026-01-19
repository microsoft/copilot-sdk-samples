import { CopilotClient } from "@github/copilot-sdk";
import {
  GitHubConnector,
  GitHubSecurityAlert,
} from "../../../shared/connectors/github/index.js";
import {
  ConnectorResult,
  success,
  failure,
} from "../../../shared/connectors/types.js";

export type AlertSeverity = "critical" | "high" | "medium" | "low";
export type AlertState = "open" | "dismissed" | "fixed";

export interface PrioritizedAlert {
  alert: GitHubSecurityAlert;
  priorityScore: number;
  priorityRank: number;
  recommendation: string;
  estimatedEffort: "low" | "medium" | "high";
  remediationSteps: string[];
}

export interface SecurityAnalysis {
  totalAlerts: number;
  criticalCount: number;
  highCount: number;
  mediumCount: number;
  lowCount: number;
  prioritizedAlerts: PrioritizedAlert[];
  summary: string;
}

export interface SecurityServiceConfig {
  connector: GitHubConnector;
  client?: CopilotClient;
  severityWeights?: Partial<Record<AlertSeverity, number>>;
  includeFixedAlerts?: boolean;
}

const DEFAULT_SEVERITY_WEIGHTS: Record<AlertSeverity, number> = {
  critical: 100,
  high: 75,
  medium: 50,
  low: 25,
};

export class SecurityAlertService {
  private connector: GitHubConnector;
  private client?: CopilotClient;
  private severityWeights: Record<AlertSeverity, number>;
  private includeFixedAlerts: boolean;

  constructor(config: SecurityServiceConfig) {
    this.connector = config.connector;
    this.client = config.client;
    this.severityWeights = {
      ...DEFAULT_SEVERITY_WEIGHTS,
      ...config.severityWeights,
    };
    this.includeFixedAlerts = config.includeFixedAlerts ?? false;
  }

  async analyzeAlerts(): Promise<ConnectorResult<SecurityAnalysis>> {
    const alertsResult = await this.connector.listSecurityAlerts({
      state: this.includeFixedAlerts ? undefined : "open",
    });

    if (!alertsResult.success) {
      return failure(alertsResult.error!);
    }

    const alerts = alertsResult.data!;
    const prioritizedAlerts = this.prioritizeAlerts(alerts);

    const analysis: SecurityAnalysis = {
      totalAlerts: alerts.length,
      criticalCount: alerts.filter((a) => a.severity === "critical").length,
      highCount: alerts.filter((a) => a.severity === "high").length,
      mediumCount: alerts.filter((a) => a.severity === "medium").length,
      lowCount: alerts.filter((a) => a.severity === "low").length,
      prioritizedAlerts,
      summary: this.generateSummary(alerts, prioritizedAlerts),
    };

    return success(analysis);
  }

  async getAlertsBySeverity(
    severity: AlertSeverity,
  ): Promise<ConnectorResult<PrioritizedAlert[]>> {
    const alertsResult = await this.connector.listSecurityAlerts({
      severity,
      state: this.includeFixedAlerts ? undefined : "open",
    });

    if (!alertsResult.success) {
      return failure(alertsResult.error!);
    }

    return success(this.prioritizeAlerts(alertsResult.data!));
  }

  async getCriticalAlerts(): Promise<ConnectorResult<PrioritizedAlert[]>> {
    return this.getAlertsBySeverity("critical");
  }

  async getActionableAlerts(
    limit?: number,
  ): Promise<ConnectorResult<PrioritizedAlert[]>> {
    const analysisResult = await this.analyzeAlerts();

    if (!analysisResult.success) {
      return failure(analysisResult.error!);
    }

    let actionable = analysisResult.data!.prioritizedAlerts.filter(
      (p) => p.alert.patchedVersions !== null,
    );

    if (limit) {
      actionable = actionable.slice(0, limit);
    }

    return success(actionable);
  }

  private prioritizeAlerts(alerts: GitHubSecurityAlert[]): PrioritizedAlert[] {
    const scored = alerts.map((alert) => ({
      alert,
      priorityScore: this.calculatePriorityScore(alert),
      priorityRank: 0,
      recommendation: this.generateRecommendation(alert),
      estimatedEffort: this.estimateEffort(alert),
      remediationSteps: this.generateRemediationSteps(alert),
    }));

    scored.sort((a, b) => b.priorityScore - a.priorityScore);

    scored.forEach((item, index) => {
      item.priorityRank = index + 1;
    });

    return scored;
  }

  private calculatePriorityScore(alert: GitHubSecurityAlert): number {
    let score = this.severityWeights[alert.severity];

    if (alert.patchedVersions) {
      score += 10;
    }

    if (alert.state === "open") {
      score += 5;
    }

    const ageInDays = this.getAlertAgeInDays(alert);
    if (ageInDays > 30) {
      score += 15;
    } else if (ageInDays > 7) {
      score += 5;
    }

    return score;
  }

  private getAlertAgeInDays(alert: GitHubSecurityAlert): number {
    const created = new Date(alert.createdAt);
    const now = new Date();
    return Math.floor(
      (now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24),
    );
  }

  private generateRecommendation(alert: GitHubSecurityAlert): string {
    if (alert.severity === "critical") {
      return `URGENT: Update ${alert.package.name} immediately. This is a critical vulnerability.`;
    }

    if (alert.patchedVersions) {
      return `Update ${alert.package.name} to version ${alert.patchedVersions} to resolve this vulnerability.`;
    }

    return `Monitor ${alert.package.name} for available patches. Consider alternative packages if no fix is available.`;
  }

  private estimateEffort(
    alert: GitHubSecurityAlert,
  ): "low" | "medium" | "high" {
    if (alert.patchedVersions) {
      const currentRange = alert.vulnerableVersionRange;
      if (currentRange.includes("<") && !currentRange.includes("||")) {
        return "low";
      }
      return "medium";
    }
    return "high";
  }

  private generateRemediationSteps(alert: GitHubSecurityAlert): string[] {
    const steps: string[] = [];
    const pkg = alert.package.name;
    const ecosystem = alert.package.ecosystem;

    if (alert.patchedVersions) {
      if (ecosystem === "npm") {
        steps.push(`Run: npm update ${pkg}`);
        steps.push(`Or: npm install ${pkg}@${alert.patchedVersions}`);
      } else if (ecosystem === "pip") {
        steps.push(`Run: pip install --upgrade ${pkg}`);
      } else {
        steps.push(`Update ${pkg} to version ${alert.patchedVersions}`);
      }
      steps.push("Run tests to verify compatibility");
      steps.push("Deploy to staging environment first");
    } else {
      steps.push(`Check ${pkg} repository for security advisories`);
      steps.push("Consider alternative packages if available");
      steps.push("Implement workarounds if documented");
    }

    return steps;
  }

  private generateSummary(
    alerts: GitHubSecurityAlert[],
    prioritized: PrioritizedAlert[],
  ): string {
    if (alerts.length === 0) {
      return "No security alerts found. Your dependencies appear to be secure.";
    }

    const critical = alerts.filter((a) => a.severity === "critical").length;
    const actionable = prioritized.filter(
      (p) => p.alert.patchedVersions !== null,
    ).length;

    let summary = `Found ${alerts.length} security alert(s). `;

    if (critical > 0) {
      summary += `${critical} critical vulnerability(ies) require immediate attention. `;
    }

    if (actionable > 0) {
      summary += `${actionable} alert(s) have available patches.`;
    }

    return summary;
  }
}

export function createSecurityAlertService(
  connector: GitHubConnector,
  options?: Partial<Omit<SecurityServiceConfig, "connector">>,
): SecurityAlertService {
  return new SecurityAlertService({
    connector,
    ...options,
  });
}
