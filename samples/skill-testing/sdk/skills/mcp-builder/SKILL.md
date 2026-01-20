---
name: mcp-builder
description: Build MCP (Model Context Protocol) clients to connect AI agents with external tools and data sources. Use when building integrations with MCP servers.
license: MIT
compatibility: Requires TypeScript, Node.js 18+
metadata:
  author: copilot-sdk-samples
  version: "1.0"
---

# MCP Builder Skill

Build MCP (Model Context Protocol) clients that connect AI agents with external tools and data sources.

## When to Use This Skill

Use this skill when:

- Building a client to connect to an MCP server
- Integrating AI agents with external data sources via MCP
- Creating typed wrappers around MCP tool calls
- The user mentions "MCP", "Model Context Protocol", or needs to connect to an MCP endpoint

## MCP Protocol Overview

MCP is an open protocol for connecting AI models to external tools and data. Key concepts:

1. **MCP Server**: Exposes tools, resources, and prompts via JSON-RPC over HTTP (streamable) or stdio
2. **MCP Client**: Connects to servers, discovers tools, and executes tool calls
3. **Tools**: Functions the model can invoke (e.g., `search_docs`, `fetch_page`)
4. **Resources**: Data the model can read (e.g., `docs://azure/overview`)

## Implementation Pattern

Follow this pattern when building MCP clients:

### 1. Define the Interface

```typescript
export interface MCPClientConfig {
  mode: "mock" | "live";
  endpoint?: string;
}

export interface MyMCPClient {
  readonly mode: "mock" | "live";
  readonly isInitialized: boolean;

  initialize(): Promise<ConnectorResult<void>>;
  dispose(): Promise<void>;

  // Add tool-specific methods based on server capabilities
  toolName(args: ToolArgs): Promise<ConnectorResult<ToolResult>>;
}
```

### 2. Implement Mock Client First

Always create a mock implementation that works without network calls:

```typescript
class MockMyMCPClient implements MyMCPClient {
  readonly mode = "mock" as const;
  private _isInitialized = false;

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

  async toolName(args: ToolArgs): Promise<ConnectorResult<ToolResult>> {
    if (!this._isInitialized) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Client not initialized",
      });
    }
    // Return realistic mock data
    return success({
      /* mock result */
    });
  }
}
```

### 3. Use ConnectorResult Pattern

All methods must return `ConnectorResult<T>`:

```typescript
import {
  ConnectorResult,
  success,
  failure,
  ErrorCodes,
} from "../shared/connectors/types.js";

// Success
return success(data);

// Failure
return failure({
  code: ErrorCodes.NOT_FOUND,
  message: "Resource not found",
});
```

### 4. Factory Function

Export a factory function:

```typescript
export function createMyMCPClient(config: MCPClientConfig): MyMCPClient {
  if (config.mode === "mock") {
    return new MockMyMCPClient(config);
  }
  return new LiveMyMCPClient(config);
}
```

## Example: Microsoft Learn MCP Server

The Microsoft Learn MCP Server (`https://learn.microsoft.com/api/mcp`) provides:

### Tools

1. `microsoft_docs_search` - Search Microsoft Learn documentation
2. `microsoft_docs_fetch` - Fetch and convert a page to markdown
3. `microsoft_code_sample_search` - Search code samples

### Client Implementation

```typescript
export interface DocSearchResult {
  title: string;
  url: string;
  snippet: string;
}

export interface MSLearnMCPClient {
  readonly mode: "mock" | "live";
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
```

## Testing Requirements

Every MCP client must include:

1. Unit tests using Vitest
2. Tests for initialization/disposal
3. Tests for each tool method
4. Tests for error handling (NOT_INITIALIZED, etc.)

```typescript
describe("MyMCPClient", () => {
  let client: MyMCPClient;

  beforeEach(async () => {
    client = createMyMCPClient({ mode: "mock" });
    await client.initialize();
  });

  afterEach(async () => {
    await client.dispose();
  });

  it("should initialize successfully", () => {
    expect(client.isInitialized).toBe(true);
  });

  it("should fail when not initialized", async () => {
    const uninit = createMyMCPClient({ mode: "mock" });
    const result = await uninit.toolName({});
    expect(result.success).toBe(false);
    expect(result.error?.code).toBe("NOT_INITIALIZED");
  });
});
```

## File Structure

```
shared/connectors/<name>/
├── client.ts    # Client implementation
└── index.ts     # Public exports

test/connectors/
└── <name>.test.ts
```

## Acceptance Criteria

A valid MCP client implementation must:

1. ✅ Export a factory function `create<Name>Client(config)`
2. ✅ Support both `mock` and `live` modes
3. ✅ Use `ConnectorResult<T>` for all async operations
4. ✅ Have `isInitialized` property
5. ✅ Return `NOT_INITIALIZED` error when called before `initialize()`
6. ✅ Include comprehensive unit tests
7. ✅ Follow existing connector patterns in the codebase
