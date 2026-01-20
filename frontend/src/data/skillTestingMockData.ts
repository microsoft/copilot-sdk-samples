import type { SkillTestExecution } from "../components/SkillTestingVisualization/types";

export const skillTestingMockData: SkillTestExecution = {
  id: "exec-mcp-builder-001",
  skill: {
    name: "mcp-builder",
    description:
      "Guide for creating high-quality MCP (Model Context Protocol) clients that enable LLMs to interact with external services through well-designed connectors.",
    path: "skills/mcp-builder/SKILL.md",
  },
  testCases: [
    {
      id: "mcp-builder-mslearn-1",
      description: "Create an MCP client for Microsoft Learn documentation API",
      prompt:
        "Create an MCP client for the Microsoft Learn documentation server. The client should support searching docs, fetching individual doc pages, and searching code samples. Follow the ConnectorResult pattern used in this repository.",
      passed: true,
      durationMs: 147,
      criteriaResults: [
        {
          id: "crit-001",
          type: "code_compiles",
          description: "Generated TypeScript code has valid structure",
          passed: true,
          message: "TypeScript code structure detected",
        },
        {
          id: "crit-002",
          type: "output_contains",
          description: "Uses ConnectorResult pattern",
          passed: true,
          message: "Output contains expected pattern",
          expected: "ConnectorResult",
        },
        {
          id: "crit-003",
          type: "output_contains",
          description: "Implements mock mode",
          passed: true,
          message: "Output contains expected pattern",
          expected: 'mode: "mock"',
        },
        {
          id: "crit-004",
          type: "output_contains",
          description: "Has factory function",
          passed: true,
          message: "Output contains expected pattern",
          expected: "createMSLearnMCPClient",
        },
        {
          id: "crit-005",
          type: "test_passes",
          description: "Includes test code structure",
          passed: true,
          message: "Test code structure detected",
        },
      ],
      generatedCode: `import {
  ConnectorResult,
  success,
  failure,
  ErrorCodes,
} from "../../../shared/connectors/types.js";

export interface MSLearnMCPConfig {
  mode: "mock" | "live";
  endpoint?: string;
}

export interface DocSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface CodeSampleResult {
  language: string;
  code: string;
  source: string;
}

export interface MSLearnMCPClient {
  readonly mode: "mock" | "live";
  readonly isInitialized: boolean;

  initialize(): Promise<ConnectorResult<void>>;
  dispose(): Promise<void>;

  searchDocs(query: string): Promise<ConnectorResult<DocSearchResult[]>>;
  fetchDoc(url: string): Promise<ConnectorResult<string>>;
  searchCodeSamples(query: string, language?: string): Promise<ConnectorResult<CodeSampleResult[]>>;
}

export function createMSLearnMCPClient(config: MSLearnMCPConfig): MSLearnMCPClient {
  if (config.mode === "mock") {
    return new MockMSLearnMCPClient(config);
  }
  return new LiveMSLearnMCPClient(config);
}

class MockMSLearnMCPClient implements MSLearnMCPClient {
  readonly mode = "mock" as const;
  private _isInitialized = false;

  constructor(private config: MSLearnMCPConfig) {}

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async initialize(): Promise<ConnectorResult<void>> {
    this._isInitialized = true;
    return success(undefined);
  }

  async dispose(): Promise<void> {
    this._isInitialized = false;
  }

  async searchDocs(query: string): Promise<ConnectorResult<DocSearchResult[]>> {
    if (!this._isInitialized) {
      return failure({ code: ErrorCodes.NOT_INITIALIZED, message: "Client not initialized" });
    }

    return success([
      {
        title: "Azure Functions Overview",
        url: "https://learn.microsoft.com/en-us/azure/azure-functions/functions-overview",
        snippet: "Azure Functions is a serverless compute service...",
      },
      {
        title: "Getting Started with Azure",
        url: "https://learn.microsoft.com/en-us/azure/get-started",
        snippet: "Learn how to get started with Microsoft Azure...",
      },
    ]);
  }

  async fetchDoc(url: string): Promise<ConnectorResult<string>> {
    if (!this._isInitialized) {
      return failure({ code: ErrorCodes.NOT_INITIALIZED, message: "Client not initialized" });
    }

    return success("# Azure Functions Overview\\n\\nAzure Functions is a serverless compute service...");
  }

  async searchCodeSamples(query: string, language?: string): Promise<ConnectorResult<CodeSampleResult[]>> {
    if (!this._isInitialized) {
      return failure({ code: ErrorCodes.NOT_INITIALIZED, message: "Client not initialized" });
    }

    return success([
      {
        language: language || "typescript",
        code: "const azure = require('azure');\\nconst client = azure.createClient();",
        source: "https://learn.microsoft.com/samples/azure/sample-1",
      },
    ]);
  }
}

class LiveMSLearnMCPClient implements MSLearnMCPClient {
  readonly mode = "live" as const;
  private _isInitialized = false;
  private endpoint: string;

  constructor(config: MSLearnMCPConfig) {
    this.endpoint = config.endpoint || "https://learn.microsoft.com/api/mcp";
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async initialize(): Promise<ConnectorResult<void>> {
    this._isInitialized = true;
    return success(undefined);
  }

  async dispose(): Promise<void> {
    this._isInitialized = false;
  }

  async searchDocs(query: string): Promise<ConnectorResult<DocSearchResult[]>> {
    return failure({ code: ErrorCodes.NOT_IMPLEMENTED, message: "Live mode not implemented" });
  }

  async fetchDoc(url: string): Promise<ConnectorResult<string>> {
    return failure({ code: ErrorCodes.NOT_IMPLEMENTED, message: "Live mode not implemented" });
  }

  async searchCodeSamples(query: string, language?: string): Promise<ConnectorResult<CodeSampleResult[]>> {
    return failure({ code: ErrorCodes.NOT_IMPLEMENTED, message: "Live mode not implemented" });
  }
}`,
    },
  ],
  status: "completed",
  summary: {
    totalTests: 1,
    passed: 1,
    failed: 0,
    totalCriteria: 5,
    criteriaPassed: 5,
  },
  startedAt: "2026-01-20T10:30:00.000Z",
  completedAt: "2026-01-20T10:30:00.147Z",
  durationMs: 147,
};

export default skillTestingMockData;
