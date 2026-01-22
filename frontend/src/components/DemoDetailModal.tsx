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
  ChevronDown,
  ChevronUp,
  Settings2,
  Database,
  Wifi,
  Loader2,
} from "lucide-react";
import mermaid from "mermaid";
import type { Demo } from "../types";
import Badge from "./Badge";
import { RLMViewer } from "./RLMVisualization";
import { SkillTestingViewer } from "./SkillTestingVisualization";
import { PCBViewer } from "./PCBVisualization";
import { mockRLMExecution } from "../data/rlmMockData";
import { skillTestingMockData } from "../data/skillTestingMockData";
import { edaPcbMockData } from "../data/edaPcbMockData";

interface DemoDetailModalProps {
  demo: Demo;
  onClose: () => void;
  isOpen: boolean;
}

type ExecutionMode = "mock" | "live";
type DemoType = "sdk" | "ghaw";

interface TokenField {
  key: string;
  label: string;
  placeholder: string;
  helpUrl?: string;
  helpText?: string;
}

interface SampleParam {
  key: string;
  label: string;
  placeholder: string;
  defaultValue: string;
  type?: "text" | "textarea" | "select";
  options?: { value: string; label: string }[];
}

const SAMPLE_PARAMS: Record<string, SampleParam[]> = {
  "hello-world": [
    {
      key: "prompt",
      label: "Prompt",
      placeholder: "Enter your message to Copilot...",
      defaultValue: "Hello, world!",
      type: "textarea",
    },
  ],
  "issue-triage": [
    {
      key: "repo",
      label: "Repository",
      placeholder: "owner/repo",
      defaultValue: "microsoft/vscode",
    },
    {
      key: "state",
      label: "Issue State",
      placeholder: "Filter by state",
      defaultValue: "open",
      type: "select",
      options: [
        { value: "open", label: "Open" },
        { value: "closed", label: "Closed" },
        { value: "all", label: "All" },
      ],
    },
    {
      key: "limit",
      label: "Max Issues",
      placeholder: "Number of issues to fetch",
      defaultValue: "5",
    },
  ],
  "security-alerts": [
    {
      key: "repo",
      label: "Repository",
      placeholder: "owner/repo",
      defaultValue: "microsoft/vscode",
    },
    {
      key: "severity",
      label: "Minimum Severity",
      placeholder: "Filter by severity",
      defaultValue: "high",
      type: "select",
      options: [
        { value: "critical", label: "Critical" },
        { value: "high", label: "High" },
        { value: "medium", label: "Medium" },
        { value: "low", label: "Low" },
      ],
    },
    {
      key: "limit",
      label: "Max Alerts",
      placeholder: "Number of alerts to fetch",
      defaultValue: "10",
    },
  ],
  "mcp-orchestration": [
    {
      key: "query",
      label: "Query",
      placeholder: "What would you like to know about the infrastructure?",
      defaultValue: "Show me the current deployment status",
      type: "textarea",
    },
  ],
  pagerduty: [
    {
      key: "urgency",
      label: "Urgency Filter",
      placeholder: "Filter by urgency",
      defaultValue: "high",
      type: "select",
      options: [
        { value: "high", label: "High" },
        { value: "low", label: "Low" },
        { value: "all", label: "All" },
      ],
    },
    {
      key: "limit",
      label: "Max Incidents",
      placeholder: "Number of incidents to fetch",
      defaultValue: "10",
    },
  ],
  datadog: [
    {
      key: "query",
      label: "Metrics Query",
      placeholder: "Datadog metrics query",
      defaultValue: "avg:system.cpu.user{*}",
    },
    {
      key: "timeframe",
      label: "Timeframe",
      placeholder: "Time range",
      defaultValue: "1h",
      type: "select",
      options: [
        { value: "15m", label: "Last 15 minutes" },
        { value: "1h", label: "Last hour" },
        { value: "4h", label: "Last 4 hours" },
        { value: "1d", label: "Last day" },
      ],
    },
  ],
  teams: [
    {
      key: "team_name",
      label: "Team Name",
      placeholder: "Name of the team",
      defaultValue: "Engineering",
    },
    {
      key: "channel",
      label: "Channel",
      placeholder: "Channel to interact with",
      defaultValue: "general",
    },
  ],
  "skill-testing": [
    {
      key: "skill_name",
      label: "Skill Name",
      placeholder: "Name of the skill to test",
      defaultValue: "mcp-builder",
      type: "select",
      options: [{ value: "mcp-builder", label: "MCP Builder" }],
    },
    {
      key: "test_mode",
      label: "Test Mode",
      placeholder: "How to run tests",
      defaultValue: "mock",
      type: "select",
      options: [
        { value: "mock", label: "Mock (Fast)" },
        { value: "live", label: "Live (Real API)" },
      ],
    },
  ],
  "eda-pcb": [
    {
      key: "board_id",
      label: "Board ID",
      placeholder: "Select a PCB board",
      defaultValue: "BOARD001",
      type: "select",
      options: [
        { value: "BOARD001", label: "STM32 Dev Board" },
        { value: "BOARD002", label: "USB-C Power Delivery" },
      ],
    },
    {
      key: "analysis_type",
      label: "Analysis Type",
      placeholder: "Type of analysis to run",
      defaultValue: "health",
      type: "select",
      options: [
        { value: "health", label: "Design Health Report" },
        { value: "drc", label: "Design Rule Check" },
        { value: "routing", label: "Routing Analysis" },
        { value: "signal", label: "Signal Integrity" },
      ],
    },
  ],
};

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
  pagerduty: [
    GITHUB_TOKEN_FIELD,
    {
      key: "PAGERDUTY_API_KEY",
      label: "PagerDuty API Key",
      placeholder: "your-api-key",
      helpUrl:
        "https://support.pagerduty.com/main/docs/api-access-keys#generate-a-user-token-rest-api-key",
      helpText: "Generate PagerDuty API key",
    },
  ],
  datadog: [
    GITHUB_TOKEN_FIELD,
    {
      key: "DATADOG_API_KEY",
      label: "Datadog API Key",
      placeholder: "your-api-key",
      helpUrl: "https://app.datadoghq.com/organization-settings/api-keys",
      helpText: "Create Datadog API key",
    },
    {
      key: "DATADOG_APP_KEY",
      label: "Datadog App Key",
      placeholder: "your-app-key",
      helpUrl:
        "https://app.datadoghq.com/organization-settings/application-keys",
      helpText: "Create Datadog App key",
    },
  ],
  slack: [GITHUB_TOKEN_FIELD],
  teams: [
    GITHUB_TOKEN_FIELD,
    {
      key: "TEAMS_TENANT_ID",
      label: "Azure Tenant ID",
      placeholder: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx",
      helpUrl:
        "https://portal.azure.com/#view/Microsoft_AAD_IAM/ActiveDirectoryMenuBlade/~/RegisteredApps",
      helpText: "Register Azure AD app",
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
  "skill-testing": [GITHUB_TOKEN_FIELD],
  "eda-pcb": [GITHUB_TOKEN_FIELD],
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

    case "skill-testing":
      return [
        "--- Running: Skill Testing ---",
        "Description: Test AI skills against acceptance criteria",
        "",
        "=== Loading Skill ===",
        "",
        "Skill: mcp-builder",
        "Path: skills/mcp-builder/SKILL.md",
        "Description: Guide for creating MCP clients",
        "",
        "=== Parsing Test Cases ===",
        "",
        "Found 1 test case:",
        "  - mcp-builder-mslearn-1: Create an MCP client for Microsoft Learn",
        "",
        "=== Executing Tests ===",
        "",
        "Test: mcp-builder-mslearn-1",
        "  Prompt: Create an MCP client for MS Learn documentation API...",
        "  Status: Generating code via Copilot SDK...",
        "",
        "=== Evaluating Criteria ===",
        "",
        "  [✓] Code compiles: TypeScript structure detected",
        "  [✓] Uses ConnectorResult: Pattern found",
        "  [✓] Implements mock mode: Pattern found",
        "  [✓] Has factory function: createMSLearnMCPClient found",
        "  [✓] Includes test code: Test structure detected",
        "",
        "=== Results Summary ===",
        "",
        "Total Tests: 1",
        "  Passed: 1",
        "  Failed: 0",
        "",
        "Total Criteria: 5",
        "  Passed: 5",
        "  Failed: 0",
        "",
        "Duration: 147ms",
        "",
        "--- Completed: Skill Testing ---",
      ];

    case "eda-pcb":
      return [
        "--- Running: EDA PCB Design ---",
        "Description: AI-powered PCB design assistant",
        "",
        "=== Board Summary ===",
        "",
        "Board: STM32 Dev Board (BOARD001)",
        "Dimensions: 100mm x 80mm",
        "Layers: 4 (Top, Inner1, Inner2, Bottom)",
        "Components: 47",
        "Nets: 156",
        "Routing Completion: 87.3%",
        "",
        "=== Component Placement Analysis ===",
        "",
        "Total Components: 47",
        "  Top Layer: 42",
        "  Bottom Layer: 5",
        "",
        "By Package Type:",
        "  LQFP: 1 (U1 - STM32F429)",
        "  QFN: 2 (regulators)",
        "  SMD0402: 28 (passives)",
        "  SMD0603: 12 (passives)",
        "  USB-C: 1 (J1)",
        "",
        "Critical Components: U1, J1, Y1",
        "Placement Density: 34.2%",
        "",
        "=== Design Rule Check ===",
        "",
        "DRC Status: ⚠️ Warnings",
        "  Errors: 0",
        "  Warnings: 2",
        "  Info: 5",
        "",
        "Warnings:",
        "  1. Trace clearance 0.15mm near U1 pin 42 (min: 0.2mm)",
        "  2. Via-to-pad spacing 0.18mm at NET_USB_DP (min: 0.2mm)",
        "",
        "=== Signal Integrity Analysis ===",
        "",
        "Analyzed: 12 critical nets",
        "  Passed: 10",
        "  Failed: 2",
        "",
        "Issues:",
        "  NET_USB_DP: Impedance mismatch (target: 90Ω, actual: 82Ω)",
        "  NET_USB_DN: Trace length mismatch with DP (Δ2.3mm)",
        "",
        "=== Routing Analysis ===",
        "",
        "Completion: 87.3%",
        "Total Trace Length: 2,847mm",
        "Via Count: 89",
        "Unrouted Nets: 20",
        "",
        "Critical Nets Status:",
        "  ✓ VCC_3V3: Routed",
        "  ✓ GND: Routed",
        "  ⚠ USB_DP: Routed (SI issues)",
        "  ⚠ USB_DN: Routed (SI issues)",
        "",
        "=== Recommendations ===",
        "",
        "1. Review 2 DRC warnings for potential issues",
        "2. 2 nets have signal integrity issues - review trace widths",
        "3. 13% of nets still unrouted - consider auto-router",
        "",
        "--- Completed: EDA PCB Design ---",
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

const API_BASE_URL = import.meta.env.DEV ? "http://localhost:3001" : "";

const getDefaultCommand = (demoId: string, demoType: DemoType): string => {
  if (demoType === "ghaw") {
    return `gh aw run .github/aw/samples/${demoId}.md`;
  }
  return `pnpm ${demoId}`;
};

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
  const [demoType, setDemoType] = useState<DemoType>("sdk");
  const [command, setCommand] = useState<string>("");
  const [tokens, setTokens] = useState<Record<string, string>>({});
  const [showTokens, setShowTokens] = useState<Record<string, boolean>>({});
  const [serverAvailable, setServerAvailable] = useState<boolean | null>(null);
  const [credentialsCollapsed, setCredentialsCollapsed] = useState(false);
  const [rlmCredentialsAutoCollapsed, setRlmCredentialsAutoCollapsed] =
    useState(false);
  const [sampleParams, setSampleParams] = useState<Record<string, string>>({});
  const [paramsCollapsed, setParamsCollapsed] = useState(false);
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [rlmQuery, setRlmQuery] = useState("What is 2^(2^(2^(2)))?");
  const [rlmExecution, setRlmExecution] = useState(mockRLMExecution);
  const [rlmOwner, setRlmOwner] = useState("microsoft");
  const [rlmRepo, setRlmRepo] = useState("copilot-sdk-samples");
  const [rlmStatus, setRlmStatus] = useState<string | null>(null);
  const [rlmWorkflowUrl, setRlmWorkflowUrl] = useState<string | null>(null);
  const [rlmConclusion, setRlmConclusion] = useState<
    "success" | "failure" | null
  >(null);
  const [rlmPhase, setRlmPhase] = useState<
    "queued" | "in_progress" | "completed" | null
  >(null);
  const mermaidRef = useRef<HTMLDivElement>(null);
  const outputRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const tokenFields = TOKEN_FIELDS[demo.id] || [];
  const paramFields = SAMPLE_PARAMS[demo.id] || [];
  const hasBothTypes = demo.features.sdk && demo.features.ghaw;
  const hasAllRequiredTokens = tokenFields.every(
    (f) => tokens[f.key]?.length > 0,
  );
  const hasParamFields = paramFields.length > 0;

  useEffect(() => {
    if (isOpen && paramFields.length > 0) {
      const defaults: Record<string, string> = {};
      paramFields.forEach((field) => {
        defaults[field.key] = field.defaultValue;
      });
      setSampleParams(defaults);
    }
  }, [isOpen, demo.id]);

  useEffect(() => {
    if (isOpen) {
      setCommand(getDefaultCommand(demo.id, demoType));
    }
  }, [isOpen, demo.id, demoType]);

  useEffect(() => {
    if (hasAllRequiredTokens && !credentialsCollapsed) {
      const timer = setTimeout(() => {
        setCredentialsCollapsed(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [hasAllRequiredTokens]);

  // Auto-collapse RLM credentials only when ALL required fields are filled (once)
  useEffect(() => {
    if (
      demo.id === "rlm-orchestration" &&
      tokens["GITHUB_TOKEN"] &&
      rlmOwner.trim() &&
      rlmRepo.trim() &&
      !rlmCredentialsAutoCollapsed
    ) {
      const timer = setTimeout(() => {
        setCredentialsCollapsed(true);
        setRlmCredentialsAutoCollapsed(true);
      }, 400);
      return () => clearTimeout(timer);
    }
  }, [
    demo.id,
    tokens["GITHUB_TOKEN"],
    rlmOwner,
    rlmRepo,
    rlmCredentialsAutoCollapsed,
  ]);

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

      case "skill-testing":
        return `
          graph LR
            A[SKILL.md] -->|Parse| B[Test Harness]
            B -->|Execute| C[Copilot SDK]
            C -->|Generate| D[Code Output]
            D -->|Evaluate| E[Criteria Check]
            E -->|Report| F[Results]
        `;

      case "eda-pcb":
        return `
          graph TD
            A[PCB Board] -->|Load| B[Design Service]
            B -->|Analyze| C[Component Placement]
            B -->|Check| D[DRC Engine]
            B -->|Route| E[Auto Router]
            B -->|Verify| F[Signal Integrity]
            C -->|Suggestions| B
            D -->|Violations| B
            E -->|Traces| B
            F -->|SI Results| B
            B -->|Export| G[Gerber/BOM]
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
      setDemoType("sdk");
      setCommand("");
      setCredentialsCollapsed(false);
      setRlmCredentialsAutoCollapsed(false);
      setSampleParams({});
      setParamsCollapsed(false);
      setOpenDropdown(null);
      setRlmQuery("What is 2^(2^(2^(2)))?");
      setRlmExecution(mockRLMExecution);
      setRlmWorkflowUrl(null);
      setRlmConclusion(null);
      setRlmPhase(null);
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
    navigator.clipboard.writeText(command);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [command]);

  const handleTokenChange = useCallback((key: string, value: string) => {
    setTokens((prev) => ({ ...prev, [key]: value }));
  }, []);

  const toggleTokenVisibility = useCallback((key: string) => {
    setShowTokens((prev) => ({ ...prev, [key]: !prev[key] }));
  }, []);

  const handleParamChange = useCallback((key: string, value: string) => {
    setSampleParams((prev) => ({ ...prev, [key]: value }));
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
        body: JSON.stringify({
          tokens,
          mode: "live",
          command,
          demoType,
          params: sampleParams,
        }),
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
  }, [demo.id, tokens, command, demoType, sampleParams, runMockDemo]);

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

  const handleRunRLM = useCallback(async () => {
    if (!tokens["GITHUB_TOKEN"] || !rlmOwner || !rlmRepo) {
      setRlmStatus("Missing required fields: token, owner, or repo");
      return;
    }

    setIsRunning(true);
    setRlmStatus("Connecting to GitHub Actions...");
    setRlmWorkflowUrl(null);
    setRlmConclusion(null);
    setRlmPhase(null);

    const liveExecution: typeof mockRLMExecution = {
      id: `exec_live_${Date.now()}`,
      query: rlmQuery,
      context: "Live execution via GitHub Actions workflow",
      iterations: [],
      status: "running",
      maxIterations: 10,
      currentDepth: 0,
      maxDepth: 3,
      startedAt: new Date().toISOString(),
      completedAt: undefined,
      environmentType: "github-actions",
      language: "python",
      totalLLMCalls: 0,
      totalCodeExecutions: 0,
      finalAnswer: undefined,
    };
    setRlmExecution(liveExecution);

    abortControllerRef.current = new AbortController();
    let workflowUrl: string | undefined;
    let runId: number | undefined;

    try {
      const response = await fetch(`${API_BASE_URL}/api/rlm/execute`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: tokens["GITHUB_TOKEN"],
          owner: rlmOwner,
          repo: rlmRepo,
          query: rlmQuery,
        }),
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
      let currentEventType = "message";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (line.startsWith("event: ")) {
            currentEventType = line.slice(7).trim();
            continue;
          }

          if (line.startsWith("data: ")) {
            try {
              const parsed = JSON.parse(line.slice(6));

              if (currentEventType === "error") {
                const errorMessage =
                  parsed.message || parsed.data || "Unknown error occurred";
                setRlmStatus(`Error: ${errorMessage}`);
                setRlmExecution((prev) => ({
                  ...prev,
                  status: "failed",
                  completedAt: new Date().toISOString(),
                }));
                currentEventType = "message";
                continue;
              }

              if (parsed.htmlUrl) {
                workflowUrl = parsed.htmlUrl;
                setRlmWorkflowUrl(parsed.htmlUrl);
              }
              if (parsed.runId) {
                runId = parsed.runId;
              }
              if (parsed.conclusion) {
                setRlmConclusion(parsed.conclusion as "success" | "failure");
              }

              if (parsed.phase) {
                const phaseStr = parsed.phase as string;
                if (
                  phaseStr === "queued" ||
                  phaseStr === "in_progress" ||
                  phaseStr === "completed"
                ) {
                  setRlmPhase(phaseStr);
                }
                const phaseMessages: Record<string, string> = {
                  dispatching: "Dispatching workflow...",
                  queued: `Workflow queued${runId ? ` (Run #${runId})` : ""}`,
                  in_progress: "Workflow running...",
                  completed: "Workflow completed, fetching results...",
                };
                setRlmStatus(
                  phaseMessages[parsed.phase] ||
                    `${parsed.phase}: ${parsed.message || ""}`,
                );

                setRlmExecution((prev) => ({
                  ...prev,
                  status:
                    parsed.phase === "completed" ? "completed" : "running",
                }));
              }

              if (parsed.output) {
                let finalAnswer = parsed.output;
                try {
                  const outputData =
                    typeof parsed.output === "string"
                      ? JSON.parse(parsed.output)
                      : parsed.output;
                  if (outputData.finalAnswer) {
                    finalAnswer = outputData.finalAnswer;
                  }
                  if (
                    outputData.iterations &&
                    Array.isArray(outputData.iterations)
                  ) {
                    setRlmExecution((prev) => ({
                      ...prev,
                      iterations: outputData.iterations,
                      totalLLMCalls:
                        outputData.totalLLMCalls ||
                        outputData.iterations.length,
                      totalCodeExecutions: outputData.totalCodeExecutions || 0,
                    }));
                  }
                } catch {
                  /* intentional: graceful JSON parse fallback */
                }

                setRlmExecution((prev) => ({
                  ...prev,
                  finalAnswer: String(finalAnswer),
                }));
              }

              currentEventType = "message";
            } catch {
              /* intentional: skip malformed SSE data */
            }
          }
        }
      }

      setRlmExecution((prev) => {
        if (prev.status === "failed") return prev;
        return {
          ...prev,
          status: "completed",
          completedAt: new Date().toISOString(),
        };
      });
      setRlmStatus((prev) => {
        if (prev?.startsWith("Error:")) return prev;
        return workflowUrl ? "View run:" : "Completed";
      });
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setRlmStatus("Stopped by user");
      } else {
        setRlmStatus(
          `Error: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
        setRlmExecution((prev) => ({
          ...prev,
          status: "failed",
        }));
      }
    }

    setIsRunning(false);
  }, [tokens, rlmOwner, rlmRepo, rlmQuery]);

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
            className={`modal-panel ${demo.id === "rlm-orchestration" || demo.id === "skill-testing" || demo.id === "eda-pcb" ? "modal-panel-wide" : ""}`}
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
              {demo.id === "rlm-orchestration" ? (
                <div className="modal-section">
                  <h3 className="modal-section-title">
                    <Terminal size={18} />
                    <a
                      href="https://alexzhang13.github.io/blog/2025/rlm/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "var(--text-link)",
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      RLM
                      <ExternalLink size={12} />
                    </a>
                    Visualization
                  </h3>

                  <div className="modal-run-section">
                    <div className="modal-mode-toggle">
                      <button
                        className={`modal-mode-button ${mode === "mock" ? "active" : ""}`}
                        onClick={() => setMode("mock")}
                      >
                        <Database size={14} />
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
                        <Wifi size={14} />
                        Live API
                        {serverAvailable === false && (
                          <span className="mode-badge-offline">Offline</span>
                        )}
                        {serverAvailable && (
                          <span className="mode-badge-online">Ready</span>
                        )}
                      </button>
                    </div>

                    {mode === "mock" && (
                      <motion.div
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-3)",
                          padding: "var(--space-3)",
                          background: "var(--info-muted)",
                          border: "1px solid rgba(59, 130, 246, 0.2)",
                          borderRadius: "var(--radius-md)",
                          marginTop: "var(--space-3)",
                        }}
                      >
                        <Database
                          size={16}
                          style={{ color: "var(--info)", flexShrink: 0 }}
                        />
                        <div>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "var(--font-size-sm)",
                              color: "var(--text-primary)",
                              fontWeight: 500,
                            }}
                          >
                            Viewing Mock Data: 2^(2^(2^(2))) = 65536
                          </p>
                          <p
                            style={{
                              margin: 0,
                              fontSize: "var(--font-size-xs)",
                              color: "var(--text-secondary)",
                              marginTop: 2,
                            }}
                          >
                            Tetration computation with nested llm_query() calls
                            and verification.
                          </p>
                        </div>
                      </motion.div>
                    )}

                    {mode === "live" && (
                      <>
                        <motion.div
                          className={`modal-tokens ${credentialsCollapsed ? "collapsed" : ""}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          transition={{ duration: 0.2 }}
                          style={{ marginTop: "var(--space-3)" }}
                        >
                          <button
                            className="modal-tokens-header"
                            onClick={() =>
                              setCredentialsCollapsed(!credentialsCollapsed)
                            }
                            type="button"
                          >
                            <div className="modal-tokens-header-left">
                              <Key size={14} />
                              <span>API Credentials</span>
                              {tokens["GITHUB_TOKEN"] && (
                                <span className="modal-tokens-configured">
                                  <CheckCircle2 size={12} />
                                  Configured
                                </span>
                              )}
                            </div>
                            <span className="modal-tokens-chevron">
                              {credentialsCollapsed ? (
                                <ChevronDown size={16} />
                              ) : (
                                <ChevronUp size={16} />
                              )}
                            </span>
                          </button>

                          <AnimatePresence>
                            {!credentialsCollapsed && (
                              <motion.div
                                className="modal-tokens-content"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.15 }}
                              >
                                <div className="modal-tokens-github-help">
                                  <div className="modal-tokens-github-help-text">
                                    <Github size={14} />
                                    <span>
                                      GitHub PAT required for Copilot SDK
                                    </span>
                                  </div>
                                  <a
                                    href="https://github.com/settings/tokens/new?scopes=copilot&description=Copilot%20SDK%20RLM%20Demo"
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
                                  <div className="modal-token-field">
                                    <div className="modal-token-label-row">
                                      <label className="modal-token-label">
                                        GitHub Personal Access Token
                                      </label>
                                    </div>
                                    <div className="modal-token-input-wrapper">
                                      <input
                                        type={
                                          showTokens["GITHUB_TOKEN"]
                                            ? "text"
                                            : "password"
                                        }
                                        className="modal-token-input"
                                        placeholder="ghp_..."
                                        value={tokens["GITHUB_TOKEN"] || ""}
                                        onChange={(e) =>
                                          handleTokenChange(
                                            "GITHUB_TOKEN",
                                            e.target.value,
                                          )
                                        }
                                        autoComplete="off"
                                      />
                                      <button
                                        className="modal-token-toggle"
                                        onClick={() =>
                                          toggleTokenVisibility("GITHUB_TOKEN")
                                        }
                                        type="button"
                                      >
                                        {showTokens["GITHUB_TOKEN"] ? (
                                          <EyeOff size={14} />
                                        ) : (
                                          <Eye size={14} />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                  <div
                                    style={{
                                      display: "grid",
                                      gridTemplateColumns: "1fr 1fr",
                                      gap: "var(--space-3)",
                                      marginTop: "var(--space-3)",
                                    }}
                                  >
                                    <div className="modal-token-field">
                                      <div className="modal-token-label-row">
                                        <label className="modal-token-label">
                                          Repository Owner
                                        </label>
                                      </div>
                                      <input
                                        type="text"
                                        className="modal-token-input"
                                        placeholder="e.g., github"
                                        value={rlmOwner}
                                        onChange={(e) =>
                                          setRlmOwner(e.target.value)
                                        }
                                        autoComplete="off"
                                      />
                                    </div>
                                    <div className="modal-token-field">
                                      <div className="modal-token-label-row">
                                        <label className="modal-token-label">
                                          Repository Name
                                        </label>
                                      </div>
                                      <input
                                        type="text"
                                        className="modal-token-input"
                                        placeholder="e.g., copilot-sdk-samples"
                                        value={rlmRepo}
                                        onChange={(e) =>
                                          setRlmRepo(e.target.value)
                                        }
                                        autoComplete="off"
                                      />
                                    </div>
                                  </div>
                                </div>
                                <p className="modal-tokens-note">
                                  Tokens are stored in memory only and never
                                  persisted.
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: "var(--space-3)",
                            padding: "var(--space-4)",
                            background: "var(--bg-surface)",
                            border: "1px solid var(--border-subtle)",
                            borderRadius: "var(--radius-md)",
                            marginTop: "var(--space-3)",
                          }}
                        >
                          <div>
                            <label
                              style={{
                                display: "block",
                                fontSize: "var(--font-size-xs)",
                                color: "var(--text-muted)",
                                textTransform: "uppercase",
                                letterSpacing: "0.5px",
                                marginBottom: "var(--space-2)",
                              }}
                            >
                              Query
                            </label>
                            <textarea
                              value={rlmQuery}
                              onChange={(e) => setRlmQuery(e.target.value)}
                              placeholder="Enter your question for the RLM..."
                              style={{
                                width: "100%",
                                padding: "var(--space-3)",
                                background: "var(--bg-card)",
                                border: "1px solid var(--border-default)",
                                borderRadius: "var(--radius-md)",
                                color: "var(--text-primary)",
                                fontSize: "var(--font-size-sm)",
                                fontFamily: "inherit",
                                resize: "vertical",
                                minHeight: 60,
                              }}
                              rows={2}
                            />
                          </div>

                          <div
                            style={{
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "space-between",
                            }}
                          >
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "var(--space-2)",
                              }}
                            >
                              <Wifi
                                size={14}
                                style={{
                                  color: tokens["GITHUB_TOKEN"]
                                    ? "var(--success)"
                                    : "var(--warning)",
                                }}
                              />
                              <span
                                style={{
                                  fontSize: "var(--font-size-xs)",
                                  color: tokens["GITHUB_TOKEN"]
                                    ? "var(--success)"
                                    : "var(--text-muted)",
                                }}
                              >
                                {tokens["GITHUB_TOKEN"]
                                  ? "Ready to execute via GitHub Actions"
                                  : "Enter PAT above to enable live execution"}
                              </span>
                            </div>

                            {isRunning ? (
                              <button
                                onClick={handleStopDemo}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "var(--space-2)",
                                  padding: "var(--space-2) var(--space-4)",
                                  background: "var(--error)",
                                  border: "none",
                                  borderRadius: "var(--radius-md)",
                                  color: "white",
                                  fontSize: "var(--font-size-sm)",
                                  fontWeight: 500,
                                  cursor: "pointer",
                                }}
                              >
                                <X size={14} />
                                Stop
                              </button>
                            ) : (
                              <button
                                onClick={handleRunRLM}
                                disabled={
                                  !tokens["GITHUB_TOKEN"] ||
                                  !rlmOwner.trim() ||
                                  !rlmRepo.trim() ||
                                  !rlmQuery.trim()
                                }
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "var(--space-2)",
                                  padding: "var(--space-2) var(--space-4)",
                                  background:
                                    tokens["GITHUB_TOKEN"] &&
                                    rlmOwner.trim() &&
                                    rlmRepo.trim() &&
                                    rlmQuery.trim()
                                      ? "var(--brand-primary)"
                                      : "var(--bg-hover)",
                                  border: "none",
                                  borderRadius: "var(--radius-md)",
                                  color:
                                    tokens["GITHUB_TOKEN"] &&
                                    rlmOwner.trim() &&
                                    rlmRepo.trim() &&
                                    rlmQuery.trim()
                                      ? "white"
                                      : "var(--text-disabled)",
                                  fontSize: "var(--font-size-sm)",
                                  fontWeight: 500,
                                  cursor:
                                    tokens["GITHUB_TOKEN"] &&
                                    rlmOwner.trim() &&
                                    rlmRepo.trim() &&
                                    rlmQuery.trim()
                                      ? "pointer"
                                      : "not-allowed",
                                }}
                              >
                                <Play size={14} />
                                Run via GitHub Actions
                              </button>
                            )}
                          </div>

                          {rlmStatus && (
                            <motion.div
                              initial={{ opacity: 0, y: -8 }}
                              animate={{ opacity: 1, y: 0 }}
                              style={{
                                display: "flex",
                                flexDirection: "column",
                                gap: "var(--space-2)",
                                padding: "var(--space-3)",
                                background: isRunning
                                  ? "var(--info-muted)"
                                  : rlmConclusion === "failure" ||
                                      rlmStatus.toLowerCase().includes("error")
                                    ? "var(--error-muted)"
                                    : "var(--success-muted)",
                                border: `1px solid ${
                                  isRunning
                                    ? "rgba(59, 130, 246, 0.2)"
                                    : rlmConclusion === "failure" ||
                                        rlmStatus
                                          .toLowerCase()
                                          .includes("error")
                                      ? "rgba(239, 68, 68, 0.2)"
                                      : "rgba(34, 197, 94, 0.2)"
                                }`,
                                borderRadius: "var(--radius-md)",
                                marginTop: "var(--space-2)",
                              }}
                            >
                              {(isRunning || rlmPhase) && (
                                <div
                                  style={{
                                    display: "flex",
                                    alignItems: "center",
                                    gap: "var(--space-3)",
                                    paddingBottom: "var(--space-2)",
                                    borderBottom: `1px solid ${
                                      isRunning
                                        ? "rgba(59, 130, 246, 0.15)"
                                        : rlmConclusion === "failure"
                                          ? "rgba(239, 68, 68, 0.15)"
                                          : "rgba(34, 197, 94, 0.15)"
                                    }`,
                                  }}
                                >
                                  {(
                                    [
                                      "queued",
                                      "in_progress",
                                      "completed",
                                    ] as const
                                  ).map((phase, index) => {
                                    const isActive = rlmPhase === phase;
                                    const isPast =
                                      rlmPhase &&
                                      ((phase === "queued" &&
                                        (rlmPhase === "in_progress" ||
                                          rlmPhase === "completed")) ||
                                        (phase === "in_progress" &&
                                          rlmPhase === "completed"));
                                    const phaseLabels = {
                                      queued: "Queued",
                                      in_progress: "Running",
                                      completed: "Done",
                                    };
                                    return (
                                      <React.Fragment key={phase}>
                                        {index > 0 && (
                                          <div
                                            style={{
                                              flex: 1,
                                              height: 2,
                                              background:
                                                isPast || isActive
                                                  ? isRunning
                                                    ? "var(--info)"
                                                    : rlmConclusion ===
                                                        "failure"
                                                      ? "var(--error)"
                                                      : "var(--success)"
                                                  : "var(--border-subtle)",
                                              borderRadius: 1,
                                              opacity:
                                                isPast || isActive ? 0.6 : 0.3,
                                            }}
                                          />
                                        )}
                                        <div
                                          style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: "var(--space-1)",
                                          }}
                                        >
                                          <div
                                            style={{
                                              width: 8,
                                              height: 8,
                                              borderRadius: "50%",
                                              background: isActive
                                                ? isRunning
                                                  ? "var(--info)"
                                                  : rlmConclusion === "failure"
                                                    ? "var(--error)"
                                                    : "var(--success)"
                                                : isPast
                                                  ? isRunning
                                                    ? "var(--info)"
                                                    : rlmConclusion ===
                                                        "failure"
                                                      ? "var(--error)"
                                                      : "var(--success)"
                                                  : "var(--border-subtle)",
                                              opacity: isActive
                                                ? 1
                                                : isPast
                                                  ? 0.6
                                                  : 0.4,
                                              boxShadow: isActive
                                                ? `0 0 6px ${
                                                    isRunning
                                                      ? "var(--info)"
                                                      : rlmConclusion ===
                                                          "failure"
                                                        ? "var(--error)"
                                                        : "var(--success)"
                                                  }`
                                                : "none",
                                            }}
                                          />
                                          <span
                                            style={{
                                              fontSize: "var(--font-size-xs)",
                                              color: isActive
                                                ? isRunning
                                                  ? "var(--info)"
                                                  : rlmConclusion === "failure"
                                                    ? "var(--error)"
                                                    : "var(--success)"
                                                : isPast
                                                  ? "var(--text-secondary)"
                                                  : "var(--text-muted)",
                                              fontWeight: isActive ? 500 : 400,
                                            }}
                                          >
                                            {phaseLabels[phase]}
                                          </span>
                                        </div>
                                      </React.Fragment>
                                    );
                                  })}
                                </div>
                              )}

                              <div
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: "var(--space-2)",
                                }}
                              >
                                {isRunning && (
                                  <motion.div
                                    animate={{ rotate: 360 }}
                                    transition={{
                                      repeat: Infinity,
                                      duration: 1,
                                      ease: "linear",
                                    }}
                                  >
                                    <Loader2 size={14} />
                                  </motion.div>
                                )}
                                <span
                                  style={{
                                    fontSize: "var(--font-size-xs)",
                                    color: isRunning
                                      ? "var(--info)"
                                      : rlmConclusion === "failure" ||
                                          rlmStatus
                                            .toLowerCase()
                                            .includes("error")
                                        ? "var(--error)"
                                        : "var(--success)",
                                    fontWeight: 500,
                                  }}
                                >
                                  {rlmConclusion === "failure" &&
                                  !rlmStatus.toLowerCase().includes("error")
                                    ? "Failed!"
                                    : rlmConclusion === "success" &&
                                        rlmStatus === "View run:"
                                      ? "Completed!"
                                      : ""}
                                  {rlmConclusion === "failure" &&
                                    !rlmStatus
                                      .toLowerCase()
                                      .includes("error") &&
                                    " "}
                                  {rlmConclusion === "success" &&
                                    rlmStatus === "View run:" &&
                                    " "}
                                  {rlmWorkflowUrl &&
                                  rlmStatus === "View run:" ? (
                                    <>
                                      View run:{" "}
                                      <a
                                        href={rlmWorkflowUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        style={{
                                          color: "inherit",
                                          textDecoration: "underline",
                                          textUnderlineOffset: 2,
                                          display: "inline-flex",
                                          alignItems: "center",
                                          gap: 4,
                                        }}
                                        onClick={(e) => e.stopPropagation()}
                                      >
                                        {rlmWorkflowUrl.replace(
                                          /^https:\/\/github\.com\//,
                                          "",
                                        )}
                                        <ExternalLink size={12} />
                                      </a>
                                    </>
                                  ) : (
                                    rlmStatus
                                  )}
                                </span>
                              </div>
                            </motion.div>
                          )}
                        </motion.div>
                      </>
                    )}
                  </div>

                  <div style={{ marginTop: "var(--space-4)" }}>
                    <RLMViewer execution={rlmExecution} />
                  </div>
                </div>
              ) : demo.id === "skill-testing" ? (
                <div className="modal-section">
                  <h3 className="modal-section-title">
                    <Terminal size={18} />
                    <a
                      href="https://devblogs.microsoft.com/all-things-azure/context-driven-development-agent-skills-for-microsoft-foundry-and-azure/"
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{
                        color: "var(--text-link)",
                        textDecoration: "none",
                        display: "flex",
                        alignItems: "center",
                        gap: "4px",
                      }}
                    >
                      Agent Skills
                      <ExternalLink size={12} />
                    </a>
                    Testing
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
                      {mode === "live" && (
                        <motion.div
                          className={`modal-tokens ${credentialsCollapsed ? "collapsed" : ""}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <button
                            className="modal-tokens-header"
                            onClick={() =>
                              setCredentialsCollapsed(!credentialsCollapsed)
                            }
                            type="button"
                          >
                            <div className="modal-tokens-header-left">
                              <Key size={14} />
                              <span>API Credentials</span>
                              {tokens["GITHUB_TOKEN"] && (
                                <span className="modal-tokens-configured">
                                  <CheckCircle2 size={12} />
                                  Configured
                                </span>
                              )}
                            </div>
                            <span className="modal-tokens-chevron">
                              {credentialsCollapsed ? (
                                <ChevronDown size={16} />
                              ) : (
                                <ChevronUp size={16} />
                              )}
                            </span>
                          </button>

                          <AnimatePresence>
                            {!credentialsCollapsed && (
                              <motion.div
                                className="modal-tokens-content"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.15 }}
                              >
                                <div className="modal-tokens-github-help">
                                  <div className="modal-tokens-github-help-text">
                                    <Github size={14} />
                                    <span>
                                      GitHub PAT required for Copilot SDK
                                    </span>
                                  </div>
                                  <a
                                    href="https://github.com/settings/tokens/new?scopes=copilot&description=Copilot%20SDK%20Skill%20Testing"
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
                                  <div className="modal-token-field">
                                    <div className="modal-token-label-row">
                                      <label className="modal-token-label">
                                        GitHub Personal Access Token
                                      </label>
                                    </div>
                                    <div className="modal-token-input-wrapper">
                                      <input
                                        type={
                                          showTokens["GITHUB_TOKEN"]
                                            ? "text"
                                            : "password"
                                        }
                                        className="modal-token-input"
                                        placeholder="ghp_..."
                                        value={tokens["GITHUB_TOKEN"] || ""}
                                        onChange={(e) =>
                                          handleTokenChange(
                                            "GITHUB_TOKEN",
                                            e.target.value,
                                          )
                                        }
                                        autoComplete="off"
                                      />
                                      <button
                                        className="modal-token-toggle"
                                        onClick={() =>
                                          toggleTokenVisibility("GITHUB_TOKEN")
                                        }
                                        type="button"
                                      >
                                        {showTokens["GITHUB_TOKEN"] ? (
                                          <EyeOff size={14} />
                                        ) : (
                                          <Eye size={14} />
                                        )}
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <p className="modal-tokens-note">
                                  Tokens are stored locally and never sent to
                                  our servers.
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {paramFields.length > 0 && (
                      <div className="modal-params">
                        <div className="modal-params-header">
                          <Settings2 size={14} />
                          <span>Sample Parameters</span>
                        </div>
                        <div className="modal-params-grid">
                          {paramFields.map((param: SampleParam) => (
                            <div key={param.key} className="modal-param-field">
                              <label className="modal-param-label">
                                {param.label}
                              </label>
                              {param.type === "select" && param.options ? (
                                <select
                                  className="modal-param-select"
                                  value={
                                    sampleParams[param.key] ||
                                    param.defaultValue
                                  }
                                  onChange={(e) =>
                                    setSampleParams((prev) => ({
                                      ...prev,
                                      [param.key]: e.target.value,
                                    }))
                                  }
                                >
                                  {param.options.map(
                                    (opt: { value: string; label: string }) => (
                                      <option key={opt.value} value={opt.value}>
                                        {opt.label}
                                      </option>
                                    ),
                                  )}
                                </select>
                              ) : (
                                <input
                                  type="text"
                                  className="modal-param-input"
                                  placeholder={param.placeholder}
                                  value={
                                    sampleParams[param.key] ||
                                    param.defaultValue
                                  }
                                  onChange={(e) =>
                                    setSampleParams((prev) => ({
                                      ...prev,
                                      [param.key]: e.target.value,
                                    }))
                                  }
                                />
                              )}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ marginTop: "var(--space-4)" }}>
                    <SkillTestingViewer execution={skillTestingMockData} />
                  </div>
                </div>
              ) : demo.id === "eda-pcb" ? (
                <div className="modal-section">
                  <h3 className="modal-section-title">
                    <Cpu size={18} />
                    PCB Design Analysis
                  </h3>
                  <div style={{ marginTop: "var(--space-4)" }}>
                    <PCBViewer analysis={edaPcbMockData} />
                  </div>
                </div>
              ) : (
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
                          className={`modal-tokens ${credentialsCollapsed ? "collapsed" : ""}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <button
                            className="modal-tokens-header"
                            onClick={() =>
                              hasAllRequiredTokens &&
                              setCredentialsCollapsed(!credentialsCollapsed)
                            }
                            type="button"
                          >
                            <div className="modal-tokens-header-left">
                              <Key size={14} />
                              <span>API Credentials</span>
                              {hasAllRequiredTokens && (
                                <span className="modal-tokens-configured">
                                  <CheckCircle2 size={12} />
                                  Configured
                                </span>
                              )}
                            </div>
                            {hasAllRequiredTokens && (
                              <span className="modal-tokens-chevron">
                                {credentialsCollapsed ? (
                                  <ChevronDown size={16} />
                                ) : (
                                  <ChevronUp size={16} />
                                )}
                              </span>
                            )}
                          </button>

                          <AnimatePresence>
                            {!credentialsCollapsed && (
                              <motion.div
                                className="modal-tokens-content"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.15 }}
                              >
                                <div className="modal-tokens-github-help">
                                  <div className="modal-tokens-github-help-text">
                                    <Github size={14} />
                                    <span>
                                      GitHub PAT required for Copilot SDK
                                    </span>
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
                                    <div
                                      key={field.key}
                                      className="modal-token-field"
                                    >
                                      <div className="modal-token-label-row">
                                        <label className="modal-token-label">
                                          {field.label}
                                        </label>
                                        {field.helpUrl && (
                                          <a
                                            href={field.helpUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="modal-token-help-link"
                                          >
                                            <span>
                                              {field.helpText || "Get token"}
                                            </span>
                                            <ExternalLink size={10} />
                                          </a>
                                        )}
                                      </div>
                                      <div className="modal-token-input-wrapper">
                                        <input
                                          type={
                                            showTokens[field.key]
                                              ? "text"
                                              : "password"
                                          }
                                          className="modal-token-input"
                                          placeholder={field.placeholder}
                                          value={tokens[field.key] || ""}
                                          onChange={(e) =>
                                            handleTokenChange(
                                              field.key,
                                              e.target.value,
                                            )
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
                                  Tokens are stored in memory only and never
                                  persisted.
                                </p>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {hasBothTypes && (
                      <div className="modal-type-toggle">
                        <button
                          className={`modal-type-button ${demoType === "sdk" ? "active" : ""}`}
                          onClick={() => setDemoType("sdk")}
                        >
                          <Code2 size={14} />
                          SDK
                        </button>
                        <button
                          className={`modal-type-button ${demoType === "ghaw" ? "active" : ""}`}
                          onClick={() => setDemoType("ghaw")}
                        >
                          <Terminal size={14} />
                          gh-aw
                        </button>
                      </div>
                    )}

                    <AnimatePresence>
                      {mode === "live" && hasParamFields && (
                        <motion.div
                          className={`modal-params ${paramsCollapsed ? "collapsed" : ""}`}
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: "auto" }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <button
                            className="modal-params-header"
                            onClick={() => setParamsCollapsed(!paramsCollapsed)}
                            type="button"
                          >
                            <div className="modal-params-header-left">
                              <Settings2 size={14} />
                              <span>Sample Parameters</span>
                            </div>
                            <span className="modal-params-chevron">
                              {paramsCollapsed ? (
                                <ChevronDown size={16} />
                              ) : (
                                <ChevronUp size={16} />
                              )}
                            </span>
                          </button>

                          <AnimatePresence>
                            {!paramsCollapsed && (
                              <motion.div
                                className="modal-params-content"
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                transition={{ duration: 0.15 }}
                              >
                                <div className="modal-params-fields">
                                  {paramFields.map((field) => (
                                    <div
                                      key={field.key}
                                      className="modal-param-field"
                                    >
                                      <label className="modal-param-label">
                                        {field.label}
                                      </label>
                                      {field.type === "select" &&
                                      field.options ? (
                                        <div className="modal-param-dropdown">
                                          <button
                                            type="button"
                                            className="modal-param-dropdown-trigger"
                                            onClick={() =>
                                              setOpenDropdown(
                                                openDropdown === field.key
                                                  ? null
                                                  : field.key,
                                              )
                                            }
                                          >
                                            <span>
                                              {field.options.find(
                                                (opt) =>
                                                  opt.value ===
                                                  (sampleParams[field.key] ||
                                                    field.defaultValue),
                                              )?.label || field.placeholder}
                                            </span>
                                            <ChevronDown
                                              size={14}
                                              className={`modal-param-dropdown-icon ${openDropdown === field.key ? "open" : ""}`}
                                            />
                                          </button>
                                          <AnimatePresence>
                                            {openDropdown === field.key && (
                                              <motion.div
                                                className="modal-param-dropdown-menu"
                                                initial={{ opacity: 0, y: -8 }}
                                                animate={{ opacity: 1, y: 0 }}
                                                exit={{ opacity: 0, y: -8 }}
                                                transition={{ duration: 0.15 }}
                                              >
                                                {field.options.map((opt) => (
                                                  <button
                                                    key={opt.value}
                                                    type="button"
                                                    className={`modal-param-dropdown-item ${(sampleParams[field.key] || field.defaultValue) === opt.value ? "selected" : ""}`}
                                                    onClick={() => {
                                                      handleParamChange(
                                                        field.key,
                                                        opt.value,
                                                      );
                                                      setOpenDropdown(null);
                                                    }}
                                                  >
                                                    {opt.label}
                                                    {(sampleParams[field.key] ||
                                                      field.defaultValue) ===
                                                      opt.value && (
                                                      <CheckCircle2 size={14} />
                                                    )}
                                                  </button>
                                                ))}
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      ) : field.type === "textarea" ? (
                                        <textarea
                                          className="modal-param-textarea"
                                          placeholder={field.placeholder}
                                          value={sampleParams[field.key] || ""}
                                          onChange={(e) =>
                                            handleParamChange(
                                              field.key,
                                              e.target.value,
                                            )
                                          }
                                          rows={3}
                                        />
                                      ) : (
                                        <input
                                          type="text"
                                          className="modal-param-input"
                                          placeholder={field.placeholder}
                                          value={sampleParams[field.key] || ""}
                                          onChange={(e) =>
                                            handleParamChange(
                                              field.key,
                                              e.target.value,
                                            )
                                          }
                                        />
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    <div className="modal-command-section">
                      <div className="modal-command-label">
                        <Terminal size={14} />
                        <span>Command</span>
                      </div>
                      <div className="modal-command">
                        <code className="modal-command-text">{command}</code>
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
              )}

              {demo.id !== "rlm-orchestration" &&
                demo.id !== "skill-testing" && (
                  <div className="modal-section">
                    <h3 className="modal-section-title">
                      <Zap size={18} />
                      Architecture
                    </h3>
                    <div className="modal-mermaid" ref={mermaidRef} />
                  </div>
                )}

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
