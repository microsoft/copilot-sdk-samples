/**
 * Skill Parser - Parse SKILL.md files according to Agent Skills specification
 *
 * Agent Skills are a lightweight, open format for extending AI agent capabilities.
 * This parser handles the SKILL.md frontmatter and instructions extraction.
 *
 * @see https://agentskills.io/specification
 */

import {
  ConnectorResult,
  success,
  failure,
  ErrorCodes,
} from "../../../shared/connectors/types.js";

/**
 * Parsed skill metadata from YAML frontmatter
 */
export interface SkillMetadata {
  /** Skill identifier (1-64 chars, lowercase, hyphens) */
  name: string;
  /** Description of what the skill does and when to use it */
  description: string;
  /** License information (optional) */
  license?: string;
  /** Environment requirements (optional) */
  compatibility?: string;
  /** Arbitrary key-value metadata (optional) */
  metadata?: Record<string, string>;
  /** Pre-approved tools (experimental, optional) */
  allowedTools?: string[];
}

/**
 * A parsed skill with metadata and instructions
 */
export interface ParsedSkill {
  /** Parsed frontmatter metadata */
  metadata: SkillMetadata;
  /** Raw markdown instructions (body after frontmatter) */
  instructions: string;
  /** Path to the SKILL.md file */
  path: string;
}

/**
 * Acceptance criteria for skill testing
 */
export interface AcceptanceCriteria {
  /** Unique identifier for this criterion */
  id: string;
  /** Human-readable description */
  description: string;
  /** Type of validation to perform */
  type: "code_compiles" | "test_passes" | "output_contains" | "custom";
  /** Expected value or pattern (depends on type) */
  expected?: string | RegExp;
  /** Custom validation function (for type="custom") */
  validate?: (output: SkillTestOutput) => boolean;
}

/**
 * Skill test case definition
 */
export interface SkillTestCase {
  /** Test case identifier */
  id: string;
  /** Description of what this test validates */
  description: string;
  /** The prompt/task to send to the agent */
  prompt: string;
  /** Acceptance criteria that must pass */
  criteria: AcceptanceCriteria[];
  /** Expected timeout in ms (default: 60000) */
  timeout?: number;
}

/**
 * Output from a skill test execution
 */
export interface SkillTestOutput {
  /** Raw text response from the agent */
  response: string;
  /** Extracted code blocks (language -> code) */
  codeBlocks: Map<string, string[]>;
  /** Files that were created/modified (path -> content) */
  files: Map<string, string>;
  /** Duration in milliseconds */
  durationMs: number;
  /** Whether the agent indicated completion */
  completed: boolean;
}

/**
 * Result of running a single acceptance criterion
 */
export interface CriterionResult {
  /** The criterion that was evaluated */
  criterion: AcceptanceCriteria;
  /** Whether it passed */
  passed: boolean;
  /** Explanation of result */
  message: string;
}

/**
 * Result of running a complete skill test
 */
export interface SkillTestResult {
  /** The test case that was run */
  testCase: SkillTestCase;
  /** The skill that was tested */
  skill: ParsedSkill;
  /** All criterion results */
  criteriaResults: CriterionResult[];
  /** Overall pass/fail */
  passed: boolean;
  /** Test output data */
  output: SkillTestOutput;
  /** Timestamp when test ran */
  timestamp: string;
}

// Regex to match YAML frontmatter
const FRONTMATTER_REGEX = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;

// Regex to validate skill name
const NAME_REGEX = /^[a-z][a-z0-9]*(-[a-z0-9]+)*$/;

/**
 * Parse a SKILL.md file content into structured data
 */
export function parseSkillContent(
  content: string,
  path: string,
): ConnectorResult<ParsedSkill> {
  // Extract frontmatter and body
  const match = content.match(FRONTMATTER_REGEX);
  if (!match) {
    return failure({
      code: ErrorCodes.VALIDATION_ERROR,
      message: "SKILL.md must contain YAML frontmatter delimited by ---",
    });
  }

  const [, frontmatterRaw, instructions] = match;

  // Parse YAML frontmatter (simple parser, no external deps)
  const metadataResult = parseYamlFrontmatter(frontmatterRaw);
  if (!metadataResult.success) {
    return failure(metadataResult.error!);
  }

  const metadata = metadataResult.data!;

  // Validate required fields
  if (!metadata.name) {
    return failure({
      code: ErrorCodes.VALIDATION_ERROR,
      message: "SKILL.md frontmatter must include 'name' field",
    });
  }

  if (!metadata.description) {
    return failure({
      code: ErrorCodes.VALIDATION_ERROR,
      message: "SKILL.md frontmatter must include 'description' field",
    });
  }

  // Validate name format
  if (!NAME_REGEX.test(metadata.name)) {
    return failure({
      code: ErrorCodes.VALIDATION_ERROR,
      message: `Invalid skill name '${metadata.name}'. Must be 1-64 lowercase chars, hyphens allowed (not at start/end), no consecutive hyphens.`,
    });
  }

  if (metadata.name.length > 64) {
    return failure({
      code: ErrorCodes.VALIDATION_ERROR,
      message: `Skill name exceeds 64 characters: ${metadata.name.length}`,
    });
  }

  // Validate description length
  if (metadata.description.length > 1024) {
    return failure({
      code: ErrorCodes.VALIDATION_ERROR,
      message: `Skill description exceeds 1024 characters: ${metadata.description.length}`,
    });
  }

  return success({
    metadata,
    instructions: instructions.trim(),
    path,
  });
}

/**
 * Simple YAML frontmatter parser (handles basic key-value pairs)
 * For production, consider using a proper YAML library
 */
function parseYamlFrontmatter(yaml: string): ConnectorResult<SkillMetadata> {
  const lines = yaml.split("\n");
  const result: Record<string, unknown> = {};
  let currentKey: string | null = null;
  let currentIndent = 0;
  let nestedObject: Record<string, string> | null = null;

  for (const line of lines) {
    // Skip empty lines
    if (line.trim() === "") continue;

    // Key-value line
    const kvMatch = line.match(/^(\s*)([a-zA-Z_-]+):\s*(.*)$/);
    if (kvMatch) {
      const [, leadingSpace, key, value] = kvMatch;
      const lineIndent = leadingSpace.length;

      // If we were building a nested object and indent decreased, save it
      if (nestedObject && lineIndent <= currentIndent) {
        result[currentKey!] = nestedObject;
        nestedObject = null;
      }

      if (value === "") {
        // Start of nested object or array
        currentKey = key;
        currentIndent = lineIndent;
        nestedObject = {};
      } else if (nestedObject && lineIndent > currentIndent) {
        // Nested key-value
        nestedObject[key] = value.replace(/^["']|["']$/g, "");
      } else {
        // Simple key-value
        const cleanValue = value.replace(/^["']|["']$/g, "");
        result[key] = cleanValue;
        currentKey = key;
        currentIndent = lineIndent;
      }
    }
  }

  // Save any remaining nested object
  if (nestedObject && currentKey) {
    result[currentKey] = nestedObject;
  }

  if (typeof result["allowed-tools"] === "string") {
    result.allowedTools = (result["allowed-tools"] as string).split(/\s+/);
    delete result["allowed-tools"];
  }

  return success({
    name: result.name as string,
    description: result.description as string,
    license: result.license as string | undefined,
    compatibility: result.compatibility as string | undefined,
    metadata: result.metadata as Record<string, string> | undefined,
    allowedTools: result.allowedTools as string[] | undefined,
  });
}

/**
 * Extract code blocks from markdown content
 */
export function extractCodeBlocks(markdown: string): Map<string, string[]> {
  const codeBlocks = new Map<string, string[]>();
  const codeBlockRegex = /```(\w*)\n([\s\S]*?)```/g;

  let match;
  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    const [, language, code] = match;
    const lang = language || "plaintext";
    const existing = codeBlocks.get(lang) || [];
    existing.push(code.trim());
    codeBlocks.set(lang, existing);
  }

  return codeBlocks;
}

/**
 * Generate available_skills XML for system prompts
 */
export function generateSkillsPromptXml(skills: ParsedSkill[]): string {
  const skillEntries = skills
    .map(
      (s) => `  <skill>
    <name>${escapeXml(s.metadata.name)}</name>
    <description>${escapeXml(s.metadata.description)}</description>
    <location>${escapeXml(s.path)}</location>
  </skill>`,
    )
    .join("\n");

  return `<available_skills>\n${skillEntries}\n</available_skills>`;
}

function escapeXml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Create a default empty test output
 */
export function createEmptyTestOutput(): SkillTestOutput {
  return {
    response: "",
    codeBlocks: new Map(),
    files: new Map(),
    durationMs: 0,
    completed: false,
  };
}
