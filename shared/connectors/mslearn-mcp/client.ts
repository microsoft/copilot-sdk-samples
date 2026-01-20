import {
  ConnectorResult,
  ConnectorMode,
  BaseConnectorConfig,
  success,
  failure,
  ErrorCodes,
} from "../types.js";

export interface MSLearnMCPConfig extends BaseConnectorConfig {
  endpoint?: string;
}

export interface DocSearchResult {
  title: string;
  url: string;
  snippet: string;
  score?: number;
}

export interface CodeSampleResult {
  language: string;
  code: string;
  source: string;
  description?: string;
}

export interface MSLearnMCPClient {
  readonly name: string;
  readonly mode: ConnectorMode;
  readonly isInitialized: boolean;

  initialize(): Promise<ConnectorResult<void>>;
  dispose(): Promise<void>;

  searchDocs(query: string): Promise<ConnectorResult<DocSearchResult[]>>;
  fetchDoc(url: string): Promise<ConnectorResult<string>>;
  searchCodeSamples(
    query: string,
    language?: string,
  ): Promise<ConnectorResult<CodeSampleResult[]>>;
}

export function createMSLearnMCPClient(
  config: MSLearnMCPConfig,
): MSLearnMCPClient {
  if (config.mode === "mock") {
    return new MockMSLearnMCPClient(config);
  }
  return new LiveMSLearnMCPClient(config);
}

class MockMSLearnMCPClient implements MSLearnMCPClient {
  readonly name = "mslearn-mcp";
  readonly mode: ConnectorMode = "mock";
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
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "MS Learn MCP client not initialized",
      });
    }

    const mockResults = this.generateMockSearchResults(query);
    return success(mockResults);
  }

  async fetchDoc(url: string): Promise<ConnectorResult<string>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "MS Learn MCP client not initialized",
      });
    }

    if (!url.includes("learn.microsoft.com")) {
      return failure({
        code: ErrorCodes.VALIDATION_ERROR,
        message: "URL must be a Microsoft Learn documentation URL",
      });
    }

    const mockContent = this.generateMockDocContent(url);
    return success(mockContent);
  }

  async searchCodeSamples(
    query: string,
    language?: string,
  ): Promise<ConnectorResult<CodeSampleResult[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "MS Learn MCP client not initialized",
      });
    }

    const mockSamples = this.generateMockCodeSamples(query, language);
    return success(mockSamples);
  }

  private generateMockSearchResults(query: string): DocSearchResult[] {
    const queryLower = query.toLowerCase();

    if (queryLower.includes("azure") || queryLower.includes("function")) {
      return [
        {
          title: "Azure Functions overview",
          url: "https://learn.microsoft.com/en-us/azure/azure-functions/functions-overview",
          snippet:
            "Azure Functions is a serverless compute service that lets you run event-triggered code without having to explicitly provision or manage infrastructure.",
          score: 0.95,
        },
        {
          title: "Quickstart: Create a function in Azure with TypeScript",
          url: "https://learn.microsoft.com/en-us/azure/azure-functions/create-first-function-vs-code-typescript",
          snippet:
            "Use Visual Studio Code to create a TypeScript function that responds to HTTP requests.",
          score: 0.88,
        },
        {
          title: "Azure Functions triggers and bindings concepts",
          url: "https://learn.microsoft.com/en-us/azure/azure-functions/functions-triggers-bindings",
          snippet:
            "Triggers cause a function to run. A trigger defines how a function is invoked.",
          score: 0.82,
        },
      ];
    }

    if (queryLower.includes("mcp") || queryLower.includes("model context")) {
      return [
        {
          title: "Microsoft Learn MCP Server overview",
          url: "https://learn.microsoft.com/en-us/training/support/mcp",
          snippet:
            "The Microsoft Learn MCP Server enables clients like GitHub Copilot and other AI agents to bring trusted and up-to-date information directly from Microsoft's official documentation.",
          score: 0.97,
        },
        {
          title: "Microsoft Learn MCP Server developer reference",
          url: "https://learn.microsoft.com/en-us/training/support/mcp-developer-reference",
          snippet:
            "Developer documentation for implementing the Microsoft Learn Docs Model Context Protocol (MCP) Server.",
          score: 0.91,
        },
      ];
    }

    return [
      {
        title: "Microsoft Learn Documentation",
        url: "https://learn.microsoft.com/en-us/",
        snippet: `Search results for: ${query}. Microsoft Learn offers free online training and documentation.`,
        score: 0.7,
      },
    ];
  }

  private generateMockDocContent(url: string): string {
    if (url.includes("functions-overview")) {
      return `# Azure Functions overview

Azure Functions is a serverless compute service that lets you run event-triggered code without having to explicitly provision or manage infrastructure.

## Key features

- **Event-driven**: Functions are triggered by events such as HTTP requests, timer schedules, or messages from other Azure services.
- **Automatic scaling**: Functions scale automatically based on demand.
- **Pay-per-use**: You only pay for the time your code runs.

## Supported languages

- C#
- JavaScript/TypeScript
- Python
- Java
- PowerShell

## Next steps

1. [Create your first function](https://learn.microsoft.com/en-us/azure/azure-functions/functions-create-first-function-vs-code)
2. [Learn about triggers and bindings](https://learn.microsoft.com/en-us/azure/azure-functions/functions-triggers-bindings)
`;
    }

    if (url.includes("mcp")) {
      return `# Microsoft Learn MCP Server

The Microsoft Learn MCP Server enables AI agents to access trusted Microsoft documentation.

## Endpoint

\`\`\`
https://learn.microsoft.com/api/mcp
\`\`\`

## Available Tools

1. \`microsoft_docs_search\` - Search documentation
2. \`microsoft_docs_fetch\` - Fetch full page content
3. \`microsoft_code_sample_search\` - Search code samples

## Usage

Configure in your MCP client:

\`\`\`json
{
  "microsoft.docs.mcp": {
    "type": "http",
    "url": "https://learn.microsoft.com/api/mcp"
  }
}
\`\`\`
`;
    }

    return `# Documentation

Content for: ${url}

This is mock documentation content for testing purposes.
`;
  }

  private generateMockCodeSamples(
    query: string,
    language?: string,
  ): CodeSampleResult[] {
    const lang = language || "typescript";

    if (
      query.toLowerCase().includes("azure") ||
      query.toLowerCase().includes("function")
    ) {
      return [
        {
          language: lang,
          code: `import { app, HttpRequest, HttpResponseInit, InvocationContext } from "@azure/functions";

export async function httpTrigger(
  request: HttpRequest,
  context: InvocationContext
): Promise<HttpResponseInit> {
  context.log(\`Http function processed request for url "\${request.url}"\`);

  const name = request.query.get("name") || (await request.text()) || "world";

  return { body: \`Hello, \${name}!\` };
}

app.http("httpTrigger", {
  methods: ["GET", "POST"],
  authLevel: "anonymous",
  handler: httpTrigger,
});`,
          source:
            "https://learn.microsoft.com/samples/azure-functions-typescript",
          description: "Azure Functions HTTP trigger with TypeScript",
        },
      ];
    }

    return [
      {
        language: lang,
        code: `// Sample code for: ${query}
console.log("Hello from Microsoft Learn!");`,
        source: "https://learn.microsoft.com/samples/generic",
        description: `Code sample for ${query}`,
      },
    ];
  }
}

class LiveMSLearnMCPClient implements MSLearnMCPClient {
  readonly name = "mslearn-mcp";
  readonly mode: ConnectorMode = "live";
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

  async searchDocs(
    _query: string,
  ): Promise<ConnectorResult<DocSearchResult[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "MS Learn MCP client not initialized",
      });
    }

    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message:
        "Live MS Learn MCP client requires MCP protocol implementation. Use an MCP framework like @modelcontextprotocol/sdk for production use.",
    });
  }

  async fetchDoc(_url: string): Promise<ConnectorResult<string>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "MS Learn MCP client not initialized",
      });
    }

    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live mode not yet implemented",
    });
  }

  async searchCodeSamples(
    _query: string,
    _language?: string,
  ): Promise<ConnectorResult<CodeSampleResult[]>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "MS Learn MCP client not initialized",
      });
    }

    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live mode not yet implemented",
    });
  }
}
