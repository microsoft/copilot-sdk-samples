/**
 * Types for Skill Testing Visualization
 *
 * These types represent the visualization state for skill test executions,
 * following the patterns established in the RLMVisualization component.
 */

/**
 * Represents a single acceptance criterion result
 */
export interface CriterionResult {
  /** Unique identifier for this criterion */
  id: string;
  /** Type of validation performed */
  type: "code_compiles" | "output_contains" | "test_passes" | "custom";
  /** Human-readable description */
  description: string;
  /** Whether the criterion passed */
  passed: boolean;
  /** Explanation message */
  message: string;
  /** Expected value (if applicable) */
  expected?: string;
}

/**
 * Result of running a single skill test case
 */
export interface SkillTestCaseResult {
  /** Test case identifier */
  id: string;
  /** Description of what this test validates */
  description: string;
  /** The prompt/task sent to the agent */
  prompt: string;
  /** Whether the test case passed overall */
  passed: boolean;
  /** Results for each criterion */
  criteriaResults: CriterionResult[];
  /** Generated code output from the AI */
  generatedCode?: string;
  /** Duration in milliseconds */
  durationMs: number;
}

/**
 * Skill metadata from SKILL.md frontmatter
 */
export interface SkillInfo {
  /** Skill identifier */
  name: string;
  /** Description of what the skill does */
  description: string;
  /** Path to the SKILL.md file */
  path: string;
}

/**
 * Summary statistics for a test execution
 */
export interface TestExecutionSummary {
  /** Total number of test cases */
  totalTests: number;
  /** Number of passed test cases */
  passed: number;
  /** Number of failed test cases */
  failed: number;
  /** Total criteria across all tests */
  totalCriteria: number;
  /** Number of criteria that passed */
  criteriaPassed: number;
}

/**
 * Complete skill test execution state
 */
export interface SkillTestExecution {
  /** Unique execution identifier */
  id: string;
  /** The skill being tested */
  skill: SkillInfo;
  /** Test case results */
  testCases: SkillTestCaseResult[];
  /** Execution status */
  status: "pending" | "running" | "completed" | "failed";
  /** Summary statistics */
  summary: TestExecutionSummary;
  /** When execution started */
  startedAt: string;
  /** When execution completed */
  completedAt?: string;
  /** Total duration in milliseconds */
  durationMs: number;
}
