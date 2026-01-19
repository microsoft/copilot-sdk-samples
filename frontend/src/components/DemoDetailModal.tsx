import React, { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  X,
  Terminal,
  Zap,
  CheckCircle2,
  Play,
  Key,
  Eye,
  EyeOff,
  Server,
  Cpu,
  Github,
  ExternalLink,
  Link,
  Code2,
} from "lucide-react";
import mermaid from "mermaid";
import type { Demo } from "../types";
import Badge from "./Badge";

interface DemoDetailModalProps {
  demo: Demo;
  onClose: () => void;
  isOpen: boolean;
}

type ExecutionMode = "mock" | "live";

interface TokenField {
  key: string;
  label: string;
  placeholder: string;
}

// All demos require GITHUB_TOKEN for Copilot SDK API access
const GITHUB_TOKEN_FIELD: TokenField = {
  key: "GITHUB_TOKEN",
  label: "GitHub Personal Access Token",
  placeholder: "ghp_...",
};

const TOKEN_FIELDS: Record<string, TokenField[]> = {
  "hello-world": [GITHUB_TOKEN_FIELD],
  "issue-triage": [GITHUB_TOKEN_FIELD],
  "security-alerts": [GITHUB_TOKEN_FIELD],
  "mcp-orchestration": [GITHUB_TOKEN_FIELD],
  "jira-confluence": [
    GITHUB_TOKEN_FIELD,
    {
      key: "JIRA_HOST",
      label: "Jira Host",
      placeholder: "your-domain.atlassian.net",
    },
    {
      key: "JIRA_EMAIL",
      label: "Email",
      placeholder: "your-email@example.com",
    },
    {
      key: "JIRA_API_TOKEN",
      label: "API Token",
      placeholder: "your-api-token",
    },
  ],
  pagerduty: [
    GITHUB_TOKEN_FIELD,
    {
      key: "PAGERDUTY_API_KEY",
      label: "PagerDuty API Key",
      placeholder: "your-api-key",
    },
  ],
  datadog: [
    GITHUB_TOKEN_FIELD,
    {
      key: "DATADOG_API_KEY",
      label: "Datadog API Key",
      placeholder: "your-api-key",
    },
    {
      key: "DATADOG_APP_KEY",
      label: "Datadog App Key",
      placeholder: "your-app-key",
    },
  ],
  snyk: [
    GITHUB_TOKEN_FIELD,
    {
      key: "SNYK_TOKEN",
      label: "Snyk API Token",
      placeholder: "your-snyk-token",
    },
  ],
  slack: [GITHUB_TOKEN_FIELD],
  teams: [
    GITHUB_TOKEN_FIELD,
    {
      key: "TEAMS_TENANT_ID",
      label: "Azure Tenant ID",
      placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    },
    {
      key: "TEAMS_CLIENT_ID",
      label: "Azure Client ID",
      placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
    },
    {
      key: "TEAMS_CLIENT_SECRET",
      label: "Azure Client Secret",
      placeholder: "your-client-secret",
    },
  ],
};

const getMockOutput = (demoId: string): string[] => {
  switch (demoId) {
    case "hello-world":
      return [
        "--- Running: Hello World ---",
        "Description: Basic SDK setup and interaction",
        "",
        "Initializing Copilot SDK...",
        "Connected to Copilot Agent",
        "",
        'Hello from Copilot SDK! {"version": "0.1.0"}',
        "",
        "--- Completed: Hello World ---",
      ];

    case "issue-triage":
      return [
        "--- Running: Issue Triage ---",
        "Description: Auto-label and triage GitHub issues using AI",
        "",
        "Fetching and triaging open issues...",
        "",
        "Triaged 5 issues:",
        "",
        "Issue #1:",
        "  Category: bug",
        "  Priority: high",
        "  Confidence: 92%",
        "  Labels: bug, priority:high, needs-investigation",
        "  Reasoning: Error stack trace indicates null pointer exception",
        "",
        "Issue #2:",
        "  Category: feature",
        "  Priority: medium",
        "  Confidence: 88%",
        "  Labels: enhancement, priority:medium",
        "  Reasoning: Request for new API endpoint functionality",
        "",
        "Issue #3:",
        "  Category: documentation",
        "  Priority: low",
        "  Confidence: 95%",
        "  Labels: docs, priority:low",
        "  Reasoning: README update request",
        "",
        "--- Completed: Issue Triage ---",
      ];

    case "security-alerts":
      return [
        "--- Running: Security Alerts ---",
        "Description: Prioritize and remediate security vulnerabilities",
        "",
        "=== Security Alert Analysis ===",
        "",
        "Total Alerts: 8",
        "  Critical: 2",
        "  High: 3",
        "  Medium: 2",
        "  Low: 1",
        "",
        "=== Top Priority Alerts ===",
        "",
        "1. lodash (CVE-2021-23337)",
        "   Severity: CRITICAL | Score: 95",
        "   Age: 45 days | Patchable: Yes",
        "   Fix: npm install lodash@4.17.21",
        "   Effort: Low (< 1 hour)",
        "",
        "2. axios (CVE-2023-45857)",
        "   Severity: HIGH | Score: 78",
        "   Age: 12 days | Patchable: Yes",
        "   Fix: npm install axios@1.6.0",
        "   Effort: Low (< 1 hour)",
        "",
        "=== Remediation Summary ===",
        "Actionable: 6 alerts can be fixed automatically",
        "Manual Review: 2 alerts need investigation",
        "",
        "--- Completed: Security Alerts ---",
      ];

    case "mcp-orchestration":
      return [
        "--- Running: MCP Orchestration ---",
        "Description: Query dev infrastructure via Model Context Protocol",
        "",
        "=== MCP Server Discovery ===",
        "",
        "Connected servers: 3",
        "  - ci-server (CI/CD pipelines)",
        "  - k8s-server (Kubernetes clusters)",
        "  - metrics-server (Infrastructure metrics)",
        "",
        "=== CI/CD Status ===",
        "",
        "Pipeline: main-build",
        "  Status: ✓ Passed",
        "  Duration: 4m 32s",
        "  Commit: abc123f",
        "",
        "Pipeline: deploy-staging",
        "  Status: ● Running",
        "  Progress: 67%",
        "",
        "=== Kubernetes Deployments ===",
        "",
        "api-gateway: 3/3 pods ready",
        "user-service: 2/2 pods ready",
        "payment-service: 3/3 pods ready",
        "",
        "=== Service Health ===",
        "",
        "All services healthy (99.9% uptime)",
        "",
        "--- Completed: MCP Orchestration ---",
      ];

    case "jira-confluence":
      return [
        "--- Running: Jira + Confluence ---",
        "Description: Atlassian integration for issue sync and documentation",
        "",
        "=== GitHub → Jira Sync ===",
        "",
        "Syncing 3 issues...",
        "",
        "  GitHub #42 → Jira PROJ-101 (Created)",
        "    Title: API rate limiting not working",
        "    Type: Bug | Priority: High",
        "",
        "  GitHub #43 → Jira PROJ-102 (Updated)",
        "    Title: Add OAuth2 support",
        "    Type: Story | Priority: Medium",
        "",
        "  GitHub #44 → Jira PROJ-103 (Created)",
        "    Title: Update deployment docs",
        "    Type: Task | Priority: Low",
        "",
        "=== Confluence Documentation ===",
        "",
        "Generated: Sprint 24 Release Notes",
        "  Location: Engineering/Releases/Sprint-24",
        "  Sections: Summary, Changes, Migration Guide",
        "  Status: Published",
        "",
        "--- Completed: Jira + Confluence ---",
      ];

    case "pagerduty":
      return [
        "--- Running: PagerDuty Incident Management ---",
        "Description: Manage incidents, view on-call schedules, and monitor service health",
        "",
        "=== Incident Analysis ===",
        "",
        "Total Active: 3",
        "  Triggered: 2",
        "  Acknowledged: 1",
        "",
        "By Urgency:",
        "  High: 2",
        "  Low: 1",
        "",
        "=== Service Health ===",
        "",
        "🔴 API Gateway",
        "  Status: critical",
        "  Active Incidents: 1",
        "  On-Call: Alice Engineer",
        "",
        "⚠️ User Service",
        "  Status: warning",
        "  Active Incidents: 1",
        "  On-Call: Carol SRE",
        "",
        "✅ Payment Service",
        "  Status: active",
        "  On-Call: Alice Engineer",
        "",
        "=== On-Call Summary ===",
        "",
        "Platform On-Call",
        "  Primary: Alice Engineer",
        "  Escalation: Bob DevOps",
        "",
        "--- Completed: PagerDuty ---",
      ];

    case "datadog":
      return [
        "--- Running: Datadog Monitoring ---",
        "Description: Monitoring and observability integration",
        "",
        "=== Datadog Service Status ===",
        "",
        "Fetching monitoring data...",
        "",
        "=== Active Monitors ===",
        "",
        "1. API Latency Monitor",
        "   Status: OK",
        "   Value: 45ms (threshold: 200ms)",
        "   Last Triggered: Never",
        "",
        "2. Error Rate Monitor",
        "   Status: WARNING",
        "   Value: 2.3% (threshold: 5%)",
        "   Last Triggered: 2 hours ago",
        "",
        "3. CPU Usage Monitor",
        "   Status: OK",
        "   Value: 34% (threshold: 80%)",
        "",
        "=== Recent Metrics ===",
        "",
        "system.cpu.user: 34.2%",
        "system.mem.used: 68.5%",
        "trace.http.request.duration: 45ms avg",
        "",
        "=== Log Analysis ===",
        "",
        "Last 24h:",
        "  INFO:  12,453 events",
        "  WARN:  234 events",
        "  ERROR: 12 events",
        "",
        "--- Completed: Datadog ---",
      ];

    case "snyk":
      return [
        "--- Running: Snyk Security ---",
        "Description: Security scanning and vulnerability detection",
        "",
        "=== Snyk Vulnerability Scan ===",
        "",
        "Scanning project dependencies...",
        "",
        "=== Scan Results ===",
        "",
        "Total Vulnerabilities: 7",
        "  Critical: 1",
        "  High: 2",
        "  Medium: 3",
        "  Low: 1",
        "",
        "=== Critical Vulnerabilities ===",
        "",
        "1. lodash - Prototype Pollution",
        "   CVE: SNYK-JS-LODASH-1018905",
        "   Severity: CRITICAL",
        "   Fixable: Yes",
        "   Fix: Upgrade to lodash@4.17.21",
        "",
        "=== High Vulnerabilities ===",
        "",
        "2. axios - Server-Side Request Forgery",
        "   CVE: SNYK-JS-AXIOS-6032459",
        "   Severity: HIGH",
        "   Fix: Upgrade to axios@1.6.0",
        "",
        "3. jsonwebtoken - Signature Bypass",
        "   CVE: SNYK-JS-JSONWEBTOKEN-3180022",
        "   Severity: HIGH",
        "   Fix: Upgrade to jsonwebtoken@9.0.0",
        "",
        "=== License Compliance ===",
        "",
        "Packages scanned: 847",
        "  MIT: 612",
        "  Apache-2.0: 198",
        "  ISC: 32",
        "  Other: 5 (requires review)",
        "",
        "--- Completed: Snyk ---",
      ];

    case "teams":
      return [
        "--- Running: Microsoft Teams ---",
        "Description: Microsoft Teams collaboration integration",
        "",
        "=== Teams Channel Discovery ===",
        "",
        "Connecting to Microsoft Graph API...",
        "Authenticated as: demo@contoso.com",
        "",
        "Available Teams: 4",
        "  - Engineering (23 members)",
        "  - Product (15 members)",
        "  - DevOps (8 members)",
        "  - Security (6 members)",
        "",
        "=== Recent Activity ===",
        "",
        "Channel: #engineering-general",
        "  Last message: 2 minutes ago",
        "  Unread: 5 messages",
        "",
        "Channel: #incidents",
        "  Last message: 15 minutes ago",
        "  Unread: 0 messages",
        "",
        "=== Notification Sent ===",
        "",
        "Posted to #engineering-general:",
        '  "Build #1234 completed successfully"',
        "  Reactions: 3",
        "",
        "--- Completed: Microsoft Teams ---",
      ];

    default:
      return [
        `--- Running: ${demoId} ---`,
        "",
        "Demo output would appear here...",
        "",
        "--- Completed ---",
      ];
  }
};

const API_BASE_URL = "http://localhost:3001";

const DemoDetailModal: React.FC<DemoDetailModalProps> = ({
  demo,
  onClose,
  isOpen,
}) => {
  const [copied, setCopied] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [output, setOutput] = useState<string[]>([]);
  const [showOutput, setShowOutput] = useState(false);
  const [mode, setMode] = useState<ExecutionMode>("mock");
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [serverAvailable, setServerAvailable] = useState<boolean | null>(null);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const tokenFields = TOKEN_FIELDS[demo.id] || [];
  const hasTokenFields = tokenFields.length > 0;

  useEffect(() => {
    const checkServer = async () => {
      try {
        const response = await fetch(`${API_BASE_URL}/health`, {
          method: "GET",
          signal: AbortSignal.timeout(2000),
        });
        setServerAvailable(response.ok);
      } catch {
        setServerAvailable(false);
      }
    };

    if (isOpen) {
      checkServer();
    }
  }, [isOpen]);

  const getMermaidDiagram = useCallback((demoId: string): string => {
    switch (demoId) {
      case "hello-world":
        return `
          graph LR
            A[User] -->|pnpm hello-world| B[SDK Entry Point]
            B --> C[Copilot Client]
            C --> D[Copilot Agent]
            D -->|Response| C
            C --> B
            B --> E[User Output]
        `;

      case "issue-triage":
        return `
          graph TD
            A[GitHub Issues] -->|Fetch| B[Triage Service]
            B -->|Analyze| C[AI Classifier]
            C -->|Category/Severity| B
            B -->|Apply Labels| D[GitHub API]
            D -->|Updated Issues| A
            E[Auto-label Config] --> B
        `;

      case "security-alerts":
        return `
          graph TD
            A[Security Alerts] -->|Fetch| B[Alert Service]
            B -->|Analyze| C[Priority Scorer]
            C -->|Severity + Age| B
            B -->|Generate| D[Remediation Steps]
            D -->|npm/pip commands| E[Apply Fixes]
            F[Effort Estimator] --> B
        `;

      case "mcp-orchestration":
        return `
          graph LR
            A[MCP Client] -->|Discover| B[MCP Servers]
            B --> C[CI/CD Server]
            B --> D[K8s Server]
            B --> E[Metrics Server]
            C -->|Tools| A
            D -->|Resources| A
            E -->|Data| A
            A -->|Query Results| F[User]
        `;

      case "jira-confluence":
        return `
          graph LR
            A[GitHub] -->|Sync| B[Issue Sync Service]
            B -->|Create/Update| C[Jira]
            B -->|Generate Docs| D[Confluence]
            C -->|Issue Links| D
            D -->|Documentation| E[Team Knowledge Base]
        `;

      case "pagerduty":
        return `
          graph TD
            A[PagerDuty Incidents] -->|Fetch| B[Incident Service]
            B -->|Analyze| C[AI Analyzer]
            C -->|Root Cause| B
            B -->|Suggest Actions| D[Remediation Steps]
            D -->|Execute| E[Fix Actions]
            F[On-call Schedule] --> B
        `;

      case "datadog":
        return `
          graph LR
            A[Datadog Metrics] -->|Query| B[Monitoring Service]
            B -->|Alerts| C[Notification Service]
            C -->|Slack/Email| D[Team]
            B -->|Historical Data| E[Analytics Dashboard]
        `;

      case "snyk":
        return `
          graph TD
            A[Code Repository] -->|Scan| B[Snyk Scanner]
            B -->|Vulnerabilities| C[Security Service]
            C -->|Prioritize| D[Critical/High]
            D -->|Remediation| E[PR Creation]
            F[SBOM Report] --> C
        `;

      case "teams":
        return `
          graph LR
            A[Copilot SDK] -->|MS Graph| B[Teams API]
            B -->|Read| C[Channels]
            B -->|Read| D[Messages]
            B -->|Send| E[Notifications]
            C --> F[Team Hub]
            D --> F
            E --> F
        `;

      default:
        return `
          graph LR
            A[User] --> B[Demo Entry]
            B --> C[Processing]
            C --> D[Output]
        `;
    }
  }, []);

  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "loose",
      themeVariables: {
        darkMode: true,
        background: "#141414",
        primaryColor: "#8251ee",
        primaryTextColor: "#ffffff",
        primaryBorderColor: "#8251ee",
        lineColor: "#a1a1a1",
        secondaryColor: "#1c1c1c",
        tertiaryColor: "#242424",
      },
    });
  }, []);

  useEffect(() => {
    if (isOpen && mermaidRef.current) {
      const renderMermaid = async () => {
        mermaidRef.current!.innerHTML = "";
        const graphDefinition = getMermaidDiagram(demo.id);
        try {
          const { svg } = await mermaid.render(
            `mermaid-${demo.id}-${Date.now()}`,
            graphDefinition,
          );
          mermaidRef.current!.innerHTML = svg;
        } catch (error) {
          console.error("Failed to render Mermaid diagram:", error);
        }
      };
      renderMermaid();
    }
  }, [isOpen, demo.id, getMermaidDiagram]);

  useEffect(() => {
    if (!isOpen) {
      setOutput([]);
      setShowOutput(false);
      setIsRunning(false);
      setTokens({});
      setShowTokens({});
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    }
  }, [isOpen]);

  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleCopyCommand = useCallback(() => {
    const command = `pnpm ${demo.id}`;
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [demo.id]);

  const handleTokenChange = useCallback((key: string, value: string) => {
    setTokens((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleTokenVisibility = useCallback((key: string) => {
    setShowTokens((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const runMockDemo = useCallback(async () => {
    const mockLines = getMockOutput(demo.id);
    for (let i = 0; i < mockLines.length; i++) {
      await new Promise((resolve) =>
        setTimeout(resolve, 80 + Math.random() * 60),
      );
      setOutput((prev) => [...prev, mockLines[i]]);
    }
  }, [demo.id]);

  const runLiveDemo = useCallback(async () => {
    abortControllerRef.current = new AbortController();

    try {
      const response = await fetch(`${API_BASE_URL}/api/demos/${demo.id}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tokens, mode: "live" }),
        signal: abortControllerRef.current.signal,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(line.slice(6));
              if (parsed.data) {
                const outputLines = parsed.data.split("\n");
                for (const outputLine of outputLines) {
                  setOutput((prev) => [...prev, outputLine]);
                }
              }
            } catch {
              // Skip malformed JSON
            }
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name !== "AbortError") {
        setOutput((prev) => [
          ...prev,
          "",
          `Error: ${error.message}`,
          "Falling back to mock output...",
        ]);
        await runMockDemo();
      }
    }
  }, [demo.id, tokens, runMockDemo]);

  const handleRunDemo = useCallback(async () => {
    setIsRunning(true);
    setShowOutput(true);
    setOutput([]);

    if (mode === "live" && serverAvailable) {
      await runLiveDemo();
    } else {
      await runMockDemo();
    }

    setIsRunning(false);
  }, [mode, serverAvailable, runLiveDemo, runMockDemo]);

  const handleStopDemo = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsRunning(false);
    setOutput((prev) => [...prev, "", "--- Stopped by user ---"]);
  }, []);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="modal-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="modal-panel"
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            onClick={(e: React.MouseEvent) => e.stopPropagation()}
          >
            <div className="modal-header">
              <div className="modal-header-content">
                <div className="modal-title-row">
                  <h2 className="modal-title">{demo.name}</h2>
                </div>
                <p className="modal-description">{demo.description}</p>
              </div>
              <button className="modal-close" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            <div className="modal-body">
              <div className="modal-section">
                <h3 className="modal-section-title">
                  <Terminal size={18} />
                  Run Demo
                </h3>
                <div className="modal-run-section">
                  <div className="modal-mode-toggle">
                    <button
                      className={`modal-mode-button ${mode === "mock" ? "active" : ""}`}
                      onClick={() => setMode("mock")}
                    >
                      <Cpu size={14} />
                      Mock Data
                    </button>
                    <button
                      className={`modal-mode-button ${mode === "live" ? "active" : ""}`}
                      onClick={() => setMode("live")}
                      disabled={!serverAvailable}
                      title={
                        serverAvailable === false
                          ? "API server not running. Start with: pnpm server"
                          : undefined
                      }
                    >
                      <Server size={14} />
                      Live API
                      {serverAvailable === false && (
                        <span className="mode-badge-offline">Offline</span>
                      )}
                      {serverAvailable && (
                        <span className="mode-badge-online">Ready</span>
                      )}
                    </button>
                  </div>

                  <AnimatePresence>
                    {mode === "live" && hasTokenFields && (
                      <motion.div
                        className="modal-tokens"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="modal-tokens-header">
                          <Key size={14} />
                          <span>API Credentials</span>
                        </div>

                        <div className="modal-tokens-github-help">
                          <div className="modal-tokens-github-help-text">
                            <Github size={14} />
                            <span>GitHub PAT required for Copilot SDK</span>
                          </div>
                          <a
                            href="https://github.com/settings/tokens/new?scopes=copilot&description=Copilot%20SDK%20Samples"
                            target="_blank"
                            rel="noopener noreferrer"
                            className="modal-tokens-github-link"
                          >
                            <span>Create token on GitHub</span>
                            <ExternalLink size={12} />
                          </a>
                          <p className="modal-tokens-github-scopes">
                            Required scope: <code>copilot</code>
                          </p>
                        </div>

                        <div className="modal-tokens-fields">
                          {tokenFields.map((field) => (
                            <div key={field.key} className="modal-token-field">
                              <label className="modal-token-label">
                                {field.label}
                              </label>
                              <div className="modal-token-input-wrapper">
                                <input
                                  type={
                                    showTokens[field.key] ? "text" : "password"
                                  }
                                  className="modal-token-input"
                                  placeholder={field.placeholder}
                                  value={tokens[field.key] || ""}
                                  onChange={(e) =>
                                    handleTokenChange(field.key, e.target.value)
                                  }
                                  autoComplete="off"
                                />
                                <button
                                  className="modal-token-toggle"
                                  onClick={() =>
                                    toggleTokenVisibility(field.key)
                                  }
                                  type="button"
                                >
                                  {showTokens[field.key] ? (
                                    <EyeOff size={14} />
                                  ) : (
                                    <Eye size={14} />
                                  )}
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                        <p className="modal-tokens-note">
                          Tokens are stored in memory only and never persisted.
                        </p>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  <div className="modal-command">
                    <code className="modal-command-text">pnpm {demo.id}</code>
                    <div className="modal-command-actions">
                      <button
                        className={`modal-command-copy ${copied ? "copied" : ""}`}
                        onClick={handleCopyCommand}
                      >
                        {copied ? (
                          <>
                            <CheckCircle2 size={14} />
                            Copied
                          </>
                        ) : (
                          "Copy"
                        )}
                      </button>
                      {isRunning ? (
                        <button
                          className="modal-stop-button"
                          onClick={handleStopDemo}
                        >
                          <X size={14} />
                          Stop
                        </button>
                      ) : (
                        <button
                          className={`modal-run-button ${isRunning ? "running" : ""}`}
                          onClick={handleRunDemo}
                          disabled={isRunning}
                        >
                          <Play size={14} />
                          Run {mode === "live" ? "Live" : "Demo"}
                        </button>
                      )}
                    </div>
                  </div>

                  <AnimatePresence>
                    {showOutput && (
                      <motion.div
                        className="modal-output"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.3 }}
                      >
                        <div className="modal-output-header">
                          <span className="modal-output-title">
                            <Terminal size={14} />
                            Output
                            {mode === "live" && serverAvailable && (
                              <Badge variant="connector">LIVE</Badge>
                            )}
                          </span>
                          {isRunning && (
                            <span className="modal-output-status">
                              <span className="pulse-dot" />
                              Running
                            </span>
                          )}
                        </div>
                        <div className="modal-output-content" ref={outputRef}>
                          {output.map((line, index) => (
                            <motion.div
                              key={index}
                              className="modal-output-line"
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ duration: 0.15 }}
                            >
                              {line || "\u00A0"}
                            </motion.div>
                          ))}
                          {isRunning && (
                            <span className="modal-output-cursor">▋</span>
                          )}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              <div className="modal-section">
                <h3 className="modal-section-title">
                  <Zap size={18} />
                  Architecture
                </h3>
                <div className="modal-mermaid" ref={mermaidRef} />
              </div>

              <div className="modal-section">
                <h3 className="modal-section-title">
                  <CheckCircle2 size={18} />
                  Features
                </h3>
                <div className="modal-features">
                  {demo.features.sdk && (
                    <div className="modal-feature-item">
                      <Badge variant="sdk">SDK</Badge>
                      <span>TypeScript SDK implementation</span>
                    </div>
                  )}
                  {demo.features.ghaw && (
                    <div className="modal-feature-item">
                      <Badge variant="ghaw">gh-aw</Badge>
                      <span>Agentic workflow support</span>
                    </div>
                  )}
                </div>
              </div>

              {demo.connectors.length > 0 && (
                <div className="modal-section">
                  <h3 className="modal-section-title">
                    <Link size={18} />
                    Connectors
                  </h3>
                  <div className="modal-connectors">
                    {demo.connectors.map((connector) => (
                      <div key={connector} className="modal-connector-item">
                        <Badge variant="connector">{connector}</Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <div className="modal-section">
                <h3 className="modal-section-title">
                  <Code2 size={18} />
                  Source Code
                </h3>
                <div className="modal-source-links">
                  {demo.paths.sdk && (
                    <a
                      href={demo.paths.sdk}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="modal-source-card"
                    >
                      <div className="modal-source-card-icon">
                        <Github size={20} />
                      </div>
                      <div className="modal-source-card-content">
                        <span className="modal-source-card-title">
                          SDK Implementation
                        </span>
                        <span className="modal-source-card-path">
                          {demo.paths.sdk.replace(
                            /^https:\/\/github\.com\/[^/]+\/[^/]+\/(tree|blob)\/main\//,
                            "",
                          )}
                        </span>
                      </div>
                      <div className="modal-source-card-arrow">
                        <ExternalLink size={16} />
                      </div>
                    </a>
                  )}
                  {demo.paths.ghaw && (
                    <a
                      href={demo.paths.ghaw}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="modal-source-card"
                    >
                      <div className="modal-source-card-icon">
                        <Github size={20} />
                      </div>
                      <div className="modal-source-card-content">
                        <span className="modal-source-card-title">
                          Agentic Workflow
                        </span>
                        <span className="modal-source-card-path">
                          {demo.paths.ghaw.replace(
                            /^https:\/\/github\.com\/[^/]+\/[^/]+\/(tree|blob)\/main\//,
                            "",
                          )}
                        </span>
                      </div>
                      <div className="modal-source-card-arrow">
                        <ExternalLink size={16} />
                      </div>
                    </a>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default DemoDetailModal;
