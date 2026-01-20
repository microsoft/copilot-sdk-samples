import * as fs from "fs/promises";
import * as path from "path";
import { fileURLToPath } from "url";
import {
  parseSkillContent,
  type ParsedSkill,
  type SkillTestCase,
} from "./parser.js";
import { createSkillTestHarness } from "./harness.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function loadSkill(skillName: string): Promise<ParsedSkill> {
  const skillPath = path.join(__dirname, "skills", skillName, "SKILL.md");
  const content = await fs.readFile(skillPath, "utf-8");

  const result = parseSkillContent(content, skillPath);
  if (!result.success) {
    throw new Error(`Failed to parse skill: ${result.error?.message}`);
  }

  return result.data!;
}

function getMCPBuilderTestCases(): SkillTestCase[] {
  return [
    {
      id: "mcp-builder-mslearn-1",
      description:
        "Build an MCP client for Microsoft Learn documentation server",
      prompt: `Build an MCP client connector for the Microsoft Learn documentation server.

Server endpoint: https://learn.microsoft.com/api/mcp

The server provides these tools:
- microsoft_docs_search: Search documentation
- microsoft_docs_fetch: Fetch a page as markdown
- microsoft_code_sample_search: Search code samples

Requirements:
1. Follow the ConnectorResult pattern from shared/connectors/types.ts
2. Support both mock and live modes
3. Create a factory function createMSLearnMCPClient(config)
4. Include methods for each of the 3 tools
5. Include unit tests`,
      criteria: [
        {
          id: "code-compiles",
          description: "Generated code has valid TypeScript structure",
          type: "code_compiles",
        },
        {
          id: "has-connector-result",
          description: "Uses ConnectorResult pattern",
          type: "output_contains",
          expected: "ConnectorResult",
        },
        {
          id: "has-mock-mode",
          description: "Supports mock mode",
          type: "output_contains",
          expected: "mock",
        },
        {
          id: "has-factory",
          description: "Has factory function",
          type: "output_contains",
          expected: "createMSLearnMCPClient",
        },
        {
          id: "has-tests",
          description: "Includes unit tests",
          type: "test_passes",
        },
      ],
      timeout: 120000,
    },
  ];
}

async function main() {
  const skillName = process.env.SKILL_NAME || "mcp-builder";
  const mode = (process.env.TEST_MODE || "mock") as "mock" | "live";
  const verbose = process.env.VERBOSE === "true";

  console.log(`\n=== Skill Testing Demo ===`);
  console.log(`Skill: ${skillName}`);
  console.log(`Mode: ${mode}`);
  console.log(`Verbose: ${verbose}\n`);

  console.log(`Loading skill: ${skillName}...`);
  const skill = await loadSkill(skillName);
  console.log(`  Name: ${skill.metadata.name}`);
  console.log(`  Description: ${skill.metadata.description}`);
  console.log(`  Instructions: ${skill.instructions.length} characters\n`);

  const testCases = getMCPBuilderTestCases();
  console.log(`Test cases: ${testCases.length}`);
  for (const tc of testCases) {
    console.log(`  - ${tc.id}: ${tc.description}`);
    console.log(`    Criteria: ${tc.criteria.length}`);
  }
  console.log();

  const harness = createSkillTestHarness({ mode, verbose });

  const initResult = await harness.initialize();
  if (!initResult.success) {
    console.error("Failed to initialize harness:", initResult.error?.message);
    process.exit(1);
  }

  try {
    console.log("Running tests...\n");

    const suiteResult = await harness.runTestSuite(skill, testCases);
    if (!suiteResult.success) {
      console.error("Test suite failed:", suiteResult.error?.message);
      process.exit(1);
    }

    const results = suiteResult.data!;
    const passed = results.filter((r) => r.passed).length;
    const failed = results.length - passed;

    console.log("\n=== Test Summary ===");
    console.log(`Total: ${results.length}`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);

    for (const result of results) {
      console.log(`\n--- ${result.testCase.id} ---`);
      console.log(`Status: ${result.passed ? "✓ PASSED" : "✗ FAILED"}`);
      console.log(`Duration: ${result.output.durationMs}ms`);
      console.log("Criteria:");
      for (const cr of result.criteriaResults) {
        const icon = cr.passed ? "✓" : "✗";
        console.log(`  ${icon} ${cr.criterion.description}`);
        if (!cr.passed) {
          console.log(`    → ${cr.message}`);
        }
      }
    }

    if (results.length > 0 && results[0].output.response) {
      console.log("\n=== Generated Response Preview ===");
      const preview = results[0].output.response.substring(0, 800);
      console.log(preview);
      if (results[0].output.response.length > 800) {
        console.log(
          `... (${results[0].output.response.length - 800} more chars)`,
        );
      }
    }

    process.exit(failed > 0 ? 1 : 0);
  } finally {
    await harness.dispose();
  }
}

main().catch((error) => {
  console.error("Error:", error);
  process.exit(1);
});
