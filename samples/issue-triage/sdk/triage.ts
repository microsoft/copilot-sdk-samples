import { CopilotClient } from "@github/copilot-sdk";
import {
  GitHubConnector,
  GitHubIssue,
  GitHubLabel,
} from "../../../shared/connectors/github/index.js";
import {
  ConnectorResult,
  success,
  failure,
} from "../../../shared/connectors/types.js";

export type IssueCategory =
  | "bug"
  | "feature"
  | "documentation"
  | "question"
  | "enhancement"
  | "maintenance"
  | "security"
  | "performance";

export type IssuePriority = "critical" | "high" | "medium" | "low";

export interface TriageResult {
  issueNumber: number;
  category: IssueCategory;
  priority: IssuePriority;
  suggestedLabels: string[];
  confidence: number;
  reasoning: string;
}

export interface TriageServiceConfig {
  connector: GitHubConnector;
  client?: CopilotClient;
  autoApplyLabels?: boolean;
  labelMappings?: Partial<Record<IssueCategory, string>>;
  priorityPrefix?: string;
}

const DEFAULT_LABEL_MAPPINGS: Record<IssueCategory, string> = {
  bug: "bug",
  feature: "feature",
  documentation: "documentation",
  question: "question",
  enhancement: "enhancement",
  maintenance: "maintenance",
  security: "security",
  performance: "performance",
};

export class TriageService {
  private connector: GitHubConnector;
  private client?: CopilotClient;
  private autoApplyLabels: boolean;
  private labelMappings: Record<IssueCategory, string>;
  private priorityPrefix: string;

  constructor(config: TriageServiceConfig) {
    this.connector = config.connector;
    this.client = config.client;
    this.autoApplyLabels = config.autoApplyLabels ?? false;
    this.labelMappings = {
      ...DEFAULT_LABEL_MAPPINGS,
      ...config.labelMappings,
    };
    this.priorityPrefix = config.priorityPrefix ?? "priority:";
  }

  async classifyIssue(
    issueNumber: number,
  ): Promise<ConnectorResult<TriageResult>> {
    const issueResult = await this.connector.getIssue(issueNumber);
    if (!issueResult.success) {
      return failure(issueResult.error!);
    }

    return this.analyzeIssue(issueResult.data!);
  }

  async analyzeIssue(
    issue: GitHubIssue,
  ): Promise<ConnectorResult<TriageResult>> {
    const classification = this.classifyByRules(issue);

    const result: TriageResult = {
      issueNumber: issue.number,
      category: classification.category,
      priority: classification.priority,
      suggestedLabels: this.generateSuggestedLabels(classification),
      confidence: classification.confidence,
      reasoning: classification.reasoning,
    };

    if (this.autoApplyLabels && result.suggestedLabels.length > 0) {
      const applyResult = await this.applyLabels(
        issue.number,
        result.suggestedLabels,
      );
      if (!applyResult.success) {
        console.warn(`Failed to apply labels: ${applyResult.error?.message}`);
      }
    }

    return success(result);
  }

  async triageIssues(options?: {
    state?: "open" | "closed" | "all";
    limit?: number;
  }): Promise<ConnectorResult<TriageResult[]>> {
    const listResult = await this.connector.listIssues({
      state: options?.state ?? "open",
      limit: options?.limit,
    });

    if (!listResult.success) {
      return failure(listResult.error!);
    }

    const results: TriageResult[] = [];
    for (const issue of listResult.data!) {
      if (this.hasTriageLabels(issue)) {
        continue;
      }

      const triageResult = await this.analyzeIssue(issue);
      if (triageResult.success && triageResult.data) {
        results.push(triageResult.data);
      }
    }

    return success(results);
  }

  async applyLabels(
    issueNumber: number,
    labels: string[],
  ): Promise<ConnectorResult<GitHubLabel[]>> {
    return this.connector.addLabels(issueNumber, labels);
  }

  private classifyByRules(issue: GitHubIssue): {
    category: IssueCategory;
    priority: IssuePriority;
    confidence: number;
    reasoning: string;
  } {
    const title = issue.title.toLowerCase();
    const body = (issue.body ?? "").toLowerCase();
    const content = `${title} ${body}`;

    let category: IssueCategory = "question";
    let confidence = 0.5;
    let reasoning = "Default classification based on content analysis.";

    if (
      this.matchesPatterns(content, [
        "bug",
        "error",
        "crash",
        "fail",
        "broken",
        "issue",
        "problem",
      ])
    ) {
      category = "bug";
      confidence = 0.8;
      reasoning = "Detected bug-related keywords in issue content.";
    } else if (
      this.matchesPatterns(content, [
        "feature",
        "request",
        "add",
        "implement",
        "support",
        "would be nice",
        "would like",
      ])
    ) {
      category = "feature";
      confidence = 0.75;
      reasoning = "Detected feature request keywords in issue content.";
    } else if (
      this.matchesPatterns(content, [
        "improve",
        "enhance",
        "better",
        "optimize",
        "refactor",
      ])
    ) {
      category = "enhancement";
      confidence = 0.7;
      reasoning = "Detected enhancement-related keywords in issue content.";
    } else if (
      this.matchesPatterns(content, [
        "doc",
        "readme",
        "tutorial",
        "guide",
        "example",
        "typo",
      ])
    ) {
      category = "documentation";
      confidence = 0.8;
      reasoning = "Detected documentation-related keywords in issue content.";
    } else if (
      this.matchesPatterns(content, [
        "security",
        "vulnerability",
        "cve",
        "exploit",
        "xss",
        "injection",
      ])
    ) {
      category = "security";
      confidence = 0.9;
      reasoning = "Detected security-related keywords in issue content.";
    } else if (
      this.matchesPatterns(content, [
        "slow",
        "performance",
        "memory",
        "cpu",
        "latency",
        "speed",
      ])
    ) {
      category = "performance";
      confidence = 0.75;
      reasoning = "Detected performance-related keywords in issue content.";
    } else if (
      this.matchesPatterns(content, [
        "how",
        "what",
        "why",
        "help",
        "?",
        "question",
      ])
    ) {
      category = "question";
      confidence = 0.7;
      reasoning = "Detected question-related patterns in issue content.";
    }

    let priority: IssuePriority = "medium";
    if (
      this.matchesPatterns(content, [
        "critical",
        "urgent",
        "asap",
        "blocker",
        "production",
      ])
    ) {
      priority = "critical";
      reasoning += " High urgency detected.";
    } else if (
      this.matchesPatterns(content, ["important", "soon", "high priority"])
    ) {
      priority = "high";
    } else if (
      this.matchesPatterns(content, [
        "minor",
        "low",
        "when possible",
        "nice to have",
      ])
    ) {
      priority = "low";
    }

    if (category === "security" && priority === "low") {
      priority = "high";
      reasoning += " Security issues elevated to high priority.";
    }

    return { category, priority, confidence, reasoning };
  }

  private matchesPatterns(content: string, patterns: string[]): boolean {
    return patterns.some((pattern) => content.includes(pattern));
  }

  private generateSuggestedLabels(classification: {
    category: IssueCategory;
    priority: IssuePriority;
  }): string[] {
    const labels: string[] = [];

    const categoryLabel = this.labelMappings[classification.category];
    if (categoryLabel) {
      labels.push(categoryLabel);
    }

    labels.push(`${this.priorityPrefix}${classification.priority}`);

    return labels;
  }

  private hasTriageLabels(issue: GitHubIssue): boolean {
    const existingLabels = issue.labels.map((l) => l.name.toLowerCase());

    const hasCategory = Object.values(this.labelMappings).some((label) =>
      existingLabels.includes(label.toLowerCase()),
    );

    const hasPriority = existingLabels.some((label) =>
      label.startsWith(this.priorityPrefix),
    );

    return hasCategory || hasPriority;
  }
}

export function createTriageService(
  connector: GitHubConnector,
  options?: Partial<Omit<TriageServiceConfig, "connector">>,
): TriageService {
  return new TriageService({
    connector,
    ...options,
  });
}
