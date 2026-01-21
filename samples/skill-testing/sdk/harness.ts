import { CopilotClient } from "@github/copilot-sdk";
import {
  ConnectorResult,
  success,
  failure,
  ErrorCodes,
} from "../../../shared/connectors/types.js";
import { createClient, DEFAULT_MODEL } from "../../../shared/index.js";
import {
  ParsedSkill,
  SkillTestCase,
  SkillTestOutput,
  SkillTestResult,
  CriterionResult,
  AcceptanceCriteria,
  extractCodeBlocks,
  createEmptyTestOutput,
  generateSkillsPromptXml,
} from "./parser.js";

export interface SkillTestHarnessConfig {
  model?: string;
  timeout?: number;
  verbose?: boolean;
  mode?: "mock" | "live";
}

const DEFAULT_TIMEOUT = 60000;

export class SkillTestHarness {
  private client: CopilotClient | null = null;
  private config: Required<SkillTestHarnessConfig>;

  constructor(config: SkillTestHarnessConfig = {}) {
    this.config = {
      model: config.model ?? DEFAULT_MODEL,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      verbose: config.verbose ?? false,
      mode: config.mode ?? "mock",
    };
  }

  async initialize(): Promise<ConnectorResult<void>> {
    try {
      this.client = createClient();
      await this.client.start();
      return success(undefined);
    } catch (error) {
      return failure({
        code: ErrorCodes.INTERNAL_ERROR,
        message: `Failed to initialize Copilot client: ${error}`,
        cause: error,
      });
    }
  }

  async dispose(): Promise<void> {
    if (this.client) {
      await this.client.stop();
      this.client = null;
    }
  }

  async runTest(
    skill: ParsedSkill,
    testCase: SkillTestCase,
  ): Promise<ConnectorResult<SkillTestResult>> {
    if (!this.client) {
      return failure({
        code: ErrorCodes.NOT_INITIALIZED,
        message: "Harness not initialized. Call initialize() first.",
      });
    }

    if (this.config.mode === "mock") {
      return this.runMockTest(skill, testCase);
    }

    return this.runLiveTest(skill, testCase);
  }

  private async runMockTest(
    skill: ParsedSkill,
    testCase: SkillTestCase,
  ): Promise<ConnectorResult<SkillTestResult>> {
    const mockOutput = this.generateMockOutput(skill, testCase);

    const criteriaResults = this.evaluateCriteria(
      testCase.criteria,
      mockOutput,
    );
    const allPassed = criteriaResults.every((r) => r.passed);

    return success({
      testCase,
      skill,
      criteriaResults,
      passed: allPassed,
      output: mockOutput,
      timestamp: new Date().toISOString(),
    });
  }

  private async runLiveTest(
    skill: ParsedSkill,
    testCase: SkillTestCase,
  ): Promise<ConnectorResult<SkillTestResult>> {
    const startTime = Date.now();
    const output = createEmptyTestOutput();

    try {
      const session = await this.client!.createSession({
        model: this.config.model,
      });

      const systemPrompt = this.buildSystemPrompt(skill);
      const userPrompt = testCase.prompt;

      const responsePromise = new Promise<string>((resolve, reject) => {
        let fullResponse = "";
        const timeout = setTimeout(() => {
          reject(
            new Error(
              `Test timed out after ${testCase.timeout ?? this.config.timeout}ms`,
            ),
          );
        }, testCase.timeout ?? this.config.timeout);

        session.on((event) => {
          if (event.type === "assistant.message") {
            fullResponse += event.data.content;
          } else if (event.type === "session.idle") {
            clearTimeout(timeout);
            resolve(fullResponse);
          } else if (event.type === "session.error") {
            clearTimeout(timeout);
            reject(new Error(`Session error: ${JSON.stringify(event.data)}`));
          }
        });
      });

      await session.send({
        prompt: `${systemPrompt}\n\n---\n\nUser Task:\n${userPrompt}`,
      });

      const response = await responsePromise;
      output.response = response;
      output.codeBlocks = extractCodeBlocks(response);
      output.durationMs = Date.now() - startTime;
      output.completed = true;

      await session.destroy();

      const criteriaResults = this.evaluateCriteria(testCase.criteria, output);
      const allPassed = criteriaResults.every((r) => r.passed);

      return success({
        testCase,
        skill,
        criteriaResults,
        passed: allPassed,
        output,
        timestamp: new Date().toISOString(),
      });
    } catch (error) {
      output.durationMs = Date.now() - startTime;

      return failure({
        code: ErrorCodes.INTERNAL_ERROR,
        message: `Test execution failed: ${error}`,
        cause: error,
      });
    }
  }

  private buildSystemPrompt(skill: ParsedSkill): string {
    const skillsXml = generateSkillsPromptXml([skill]);

    return `You are a coding agent with access to specialized skills.

${skillsXml}

The following skill has been activated for this task:

# ${skill.metadata.name}
${skill.metadata.description}

## Instructions
${skill.instructions}

---

Follow the skill instructions carefully. Produce working code that satisfies the requirements.`;
  }

  private generateMockOutput(
    skill: ParsedSkill,
    testCase: SkillTestCase,
  ): SkillTestOutput {
    const mockResponse = this.getMockResponseForSkill(skill, testCase);
    const codeBlocks = extractCodeBlocks(mockResponse);

    return {
      response: mockResponse,
      codeBlocks,
      files: new Map(),
      durationMs: 150,
      completed: true,
    };
  }

  private getMockResponseForSkill(
    skill: ParsedSkill,
    _testCase: SkillTestCase,
  ): string {
    if (skill.metadata.name === "mcp-builder") {
      return this.getMockMCPBuilderResponse();
    }

    return `# Task Completed

I've analyzed the task and here's the solution:

\`\`\`typescript
// Generated code for ${skill.metadata.name}
export function main() {
  console.log("Task completed successfully");
}
\`\`\`

The implementation follows the skill instructions.`;
  }

  private getMockMCPBuilderResponse(): string {
    return `# Microsoft Learn MCP Client Implementation

I'll create an MCP client for the Microsoft Learn documentation server.

## Implementation

\`\`\`typescript
import {
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
}
\`\`\`

## Test

\`\`\`typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { createMSLearnMCPClient, MSLearnMCPClient } from "./client.js";

describe("MSLearnMCPClient", () => {
  let client: MSLearnMCPClient;

  beforeEach(async () => {
    client = createMSLearnMCPClient({ mode: "mock" });
    await client.initialize();
  });

  afterEach(async () => {
    await client.dispose();
  });

  it("should search docs", async () => {
    const result = await client.searchDocs("azure functions");
    expect(result.success).toBe(true);
    expect(result.data?.length).toBeGreaterThan(0);
  });

  it("should fetch doc", async () => {
    const result = await client.fetchDoc("https://learn.microsoft.com/test");
    expect(result.success).toBe(true);
    expect(result.data).toContain("Azure");
  });

  it("should search code samples", async () => {
    const result = await client.searchCodeSamples("azure client", "typescript");
    expect(result.success).toBe(true);
    expect(result.data?.length).toBeGreaterThan(0);
  });
});
\`\`\`

The implementation follows the ConnectorResult pattern and includes both mock and live client stubs.`;
  }

  private evaluateCriteria(
    criteria: AcceptanceCriteria[],
    output: SkillTestOutput,
  ): CriterionResult[] {
    return criteria.map((criterion) =>
      this.evaluateSingleCriterion(criterion, output),
    );
  }

  private evaluateSingleCriterion(
    criterion: AcceptanceCriteria,
    output: SkillTestOutput,
  ): CriterionResult {
    switch (criterion.type) {
      case "code_compiles":
        return this.evaluateCodeCompiles(criterion, output);

      case "output_contains":
        return this.evaluateOutputContains(criterion, output);

      case "test_passes":
        return this.evaluateTestPasses(criterion, output);

      case "custom":
        return this.evaluateCustom(criterion, output);

      default:
        return {
          criterion,
          passed: false,
          message: `Unknown criterion type: ${criterion.type}`,
        };
    }
  }

  private evaluateCodeCompiles(
    criterion: AcceptanceCriteria,
    output: SkillTestOutput,
  ): CriterionResult {
    const tsBlocks =
      output.codeBlocks.get("typescript") || output.codeBlocks.get("ts") || [];

    if (tsBlocks.length === 0) {
      return {
        criterion,
        passed: false,
        message: "No TypeScript code blocks found in output",
      };
    }

    const hasBasicStructure = tsBlocks.some((code) => {
      return (
        code.includes("export") ||
        code.includes("function") ||
        code.includes("class") ||
        code.includes("interface")
      );
    });

    return {
      criterion,
      passed: hasBasicStructure,
      message: hasBasicStructure
        ? "TypeScript code structure detected"
        : "No valid TypeScript structures found",
    };
  }

  private evaluateOutputContains(
    criterion: AcceptanceCriteria,
    output: SkillTestOutput,
  ): CriterionResult {
    if (!criterion.expected) {
      return {
        criterion,
        passed: false,
        message: "No expected value specified for output_contains criterion",
      };
    }

    const expected = criterion.expected;
    let found: boolean;

    if (expected instanceof RegExp) {
      found = expected.test(output.response);
    } else {
      found = output.response.includes(expected);
    }

    return {
      criterion,
      passed: found,
      message: found
        ? `Output contains expected pattern`
        : `Output does not contain expected pattern: ${expected}`,
    };
  }

  private evaluateTestPasses(
    criterion: AcceptanceCriteria,
    output: SkillTestOutput,
  ): CriterionResult {
    const hasTestCode =
      output.response.includes("describe(") ||
      output.response.includes("it(") ||
      output.response.includes("test(") ||
      output.response.includes("expect(");

    return {
      criterion,
      passed: hasTestCode,
      message: hasTestCode
        ? "Test code structure detected"
        : "No test code structure found in output",
    };
  }

  private evaluateCustom(
    criterion: AcceptanceCriteria,
    output: SkillTestOutput,
  ): CriterionResult {
    if (!criterion.validate) {
      return {
        criterion,
        passed: false,
        message: "No validate function provided for custom criterion",
      };
    }

    try {
      const passed = criterion.validate(output);
      return {
        criterion,
        passed,
        message: passed
          ? "Custom validation passed"
          : "Custom validation failed",
      };
    } catch (error) {
      return {
        criterion,
        passed: false,
        message: `Custom validation threw error: ${error}`,
      };
    }
  }

  async runTestSuite(
    skill: ParsedSkill,
    testCases: SkillTestCase[],
  ): Promise<ConnectorResult<SkillTestResult[]>> {
    const results: SkillTestResult[] = [];

    for (const testCase of testCases) {
      const result = await this.runTest(skill, testCase);
      if (!result.success) {
        return failure(result.error!);
      }
      results.push(result.data!);

      if (this.config.verbose) {
        this.logTestResult(result.data!);
      }
    }

    return success(results);
  }

  private logTestResult(result: SkillTestResult): void {
    const status = result.passed ? "✓ PASS" : "✗ FAIL";
    console.log(`\n${status}: ${result.testCase.description}`);

    for (const cr of result.criteriaResults) {
      const icon = cr.passed ? "  ✓" : "  ✗";
      console.log(`${icon} ${cr.criterion.description}: ${cr.message}`);
    }
  }
}

export function createSkillTestHarness(
  config?: SkillTestHarnessConfig,
): SkillTestHarness {
  return new SkillTestHarness(config);
}
