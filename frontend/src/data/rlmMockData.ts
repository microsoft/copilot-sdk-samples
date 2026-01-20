/**
 * Rich mock data for RLM Visualization
 *
 * This mock execution demonstrates the computation of 2^(2^(2^(2))) = 2^(2^4) = 2^16 = 65536
 * showing peeking, code execution, recursive llm_query(), and FINAL detection
 */

import type {
  RLMExecution,
  RLMIteration,
  REPLResult,
} from "../hooks/useRLMExecution";

// Helper to create timestamps with proper offsets
const baseTime = new Date("2026-01-20T10:00:00.000Z");
const timestamp = (offsetMs: number) =>
  new Date(baseTime.getTime() + offsetMs).toISOString();

// System prompt for reference
export const SYSTEM_PROMPT = `You are a Recursive Language Model (RLM) capable of solving complex problems through iterative reasoning and code execution.

You have access to a Python REPL environment. When you need to compute something, write Python code in \`\`\`python code blocks.

Available capabilities:
- Execute Python code for computations
- Call llm_query(prompt) to recursively consult yourself for sub-problems
- Return FINAL[answer] when you have the definitive answer

Important guidelines:
1. Break down complex problems into smaller steps
2. Use code execution for precise computations
3. Verify your results when possible
4. Only return FINAL when you're confident in the answer`;

// Mock REPL results
const replResult1: REPLResult = {
  success: true,
  stdout:
    '# Analyzing the expression 2^(2^(2^(2)))\n# This is a tower of exponents, evaluated right to left\n# Step 1: innermost = 2^2 = 4\n# Step 2: next = 2^4 = 16\n# Step 3: outermost = 2^16 = ?\nprint("Understanding the tetration tower...")\nprint(f"2^2 = {2**2}")\nprint(f"2^4 = {2**4}")',
  stderr: "",
  durationMs: 47,
  returnValue: undefined,
};

const replResult2: REPLResult = {
  success: true,
  stdout:
    "Computing step by step:\n2^2 = 4\n2^(2^2) = 2^4 = 16\nResult of inner tower: 16",
  stderr: "",
  durationMs: 23,
  returnValue: 16,
};

const replResult3Nested: REPLResult = {
  success: true,
  stdout:
    "Verification:\nManual calculation: 2 * 2 * 2 * 2 = 16\nUsing pow(): 16\nMatch confirmed: True",
  stderr: "",
  durationMs: 18,
  returnValue: true,
};

const replResult4: REPLResult = {
  success: true,
  stdout:
    "Computing 2^16:\nresult = 65536\n\nVerification:\n16 doublings of 1:\n1 -> 2 -> 4 -> 8 -> 16 -> 32 -> 64 -> 128 -> 256 -> 512 -> 1024 -> 2048 -> 4096 -> 8192 -> 16384 -> 32768 -> 65536\n\nFinal answer: 65536",
  stderr: "",
  durationMs: 156,
  returnValue: 65536,
};

// Nested iteration for verification (in iteration 3)
const nestedIteration: RLMIteration = {
  id: "iter_mock_003_nested_001",
  number: 1,
  input: "Verify that 2^4 equals 16 using multiple methods",
  llmResponse: `I'll verify the calculation 2^4 = 16 using multiple approaches to ensure correctness.

\`\`\`python
# Verification of 2^4 = 16
print("Verification:")

# Method 1: Manual multiplication
manual = 2 * 2 * 2 * 2
print(f"Manual calculation: 2 * 2 * 2 * 2 = {manual}")

# Method 2: Using pow()
using_pow = pow(2, 4)
print(f"Using pow(): {using_pow}")

# Confirm match
print(f"Match confirmed: {manual == using_pow == 16}")
\`\`\`

The verification confirms that 2^4 = 16 is correct using multiple calculation methods.`,
  extractedCode: `# Verification of 2^4 = 16
print("Verification:")

# Method 1: Manual multiplication
manual = 2 * 2 * 2 * 2
print(f"Manual calculation: 2 * 2 * 2 * 2 = {manual}")

# Method 2: Using pow()
using_pow = pow(2, 4)
print(f"Using pow(): {using_pow}")

# Confirm match
print(f"Match confirmed: {manual == using_pow == 16}")`,
  replResult: replResult3Nested,
  nestedQueries: [],
  isFinal: false,
  startedAt: timestamp(4500),
  completedAt: timestamp(5200),
  parentId: "iter_mock_003",
  depth: 1,
};

// Main iterations
const iteration1: RLMIteration = {
  id: "iter_mock_001",
  number: 1,
  input: "What is 2^(2^(2^(2)))?",
  llmResponse: `Let me analyze this problem. The expression 2^(2^(2^(2))) is a tetration (power tower) that needs to be evaluated from the top down (right to left in the exponent notation).

First, I'll understand the structure by examining what we're computing:

\`\`\`python
# Analyzing the expression 2^(2^(2^(2)))
# This is a tower of exponents, evaluated right to left
# Step 1: innermost = 2^2 = 4
# Step 2: next = 2^4 = 16
# Step 3: outermost = 2^16 = ?
print("Understanding the tetration tower...")
print(f"2^2 = {2**2}")
print(f"2^4 = {2**4}")
\`\`\`

I can see the structure now. This is evaluated as 2^(2^(2^2)) = 2^(2^4) = 2^16. Let me proceed step by step to compute the exact value.`,
  extractedCode: `# Analyzing the expression 2^(2^(2^(2)))
# This is a tower of exponents, evaluated right to left
# Step 1: innermost = 2^2 = 4
# Step 2: next = 2^4 = 16
# Step 3: outermost = 2^16 = ?
print("Understanding the tetration tower...")
print(f"2^2 = {2**2}")
print(f"2^4 = {2**4}")`,
  replResult: replResult1,
  nestedQueries: [],
  isFinal: false,
  startedAt: timestamp(0),
  completedAt: timestamp(1200),
  depth: 0,
};

const iteration2: RLMIteration = {
  id: "iter_mock_002",
  number: 2,
  input: "Compute the inner part of the tower: 2^(2^2)",
  llmResponse: `Now I'll compute the inner portion of the tower. Starting from the innermost exponent:

\`\`\`python
# Computing the inner tower
# Step 1: 2^2 = 4
inner_exp = 2 ** 2
print(f"Computing step by step:")
print(f"2^2 = {inner_exp}")

# Step 2: 2^(2^2) = 2^4
middle_result = 2 ** inner_exp
print(f"2^(2^2) = 2^{inner_exp} = {middle_result}")
print(f"Result of inner tower: {middle_result}")
middle_result
\`\`\`

The inner tower evaluates to 16. So we now need to compute 2^16 for the final answer.`,
  extractedCode: `# Computing the inner tower
# Step 1: 2^2 = 4
inner_exp = 2 ** 2
print(f"Computing step by step:")
print(f"2^2 = {inner_exp}")

# Step 2: 2^(2^2) = 2^4
middle_result = 2 ** inner_exp
print(f"2^(2^2) = 2^{inner_exp} = {middle_result}")
print(f"Result of inner tower: {middle_result}")
middle_result`,
  replResult: replResult2,
  nestedQueries: [],
  isFinal: false,
  startedAt: timestamp(1500),
  completedAt: timestamp(3000),
  depth: 0,
};

const iteration3: RLMIteration = {
  id: "iter_mock_003",
  number: 3,
  input: "Verify the intermediate result using a nested llm_query()",
  llmResponse: `Before computing the final result, I want to verify my intermediate calculation. I'll use llm_query() to independently verify that 2^4 = 16.

\`\`\`python
# Calling nested verification
verification = llm_query("Verify that 2^4 equals 16 using multiple methods")
print(f"Nested verification result: {verification}")
\`\`\`

The nested query confirmed that 2^4 = 16 is correct. Now I can proceed with confidence to compute 2^16.`,
  extractedCode: `# Calling nested verification
verification = llm_query("Verify that 2^4 equals 16 using multiple methods")
print(f"Nested verification result: {verification}")`,
  replResult: undefined,
  nestedQueries: [nestedIteration],
  isFinal: false,
  startedAt: timestamp(3500),
  completedAt: timestamp(6000),
  depth: 0,
};

const iteration4: RLMIteration = {
  id: "iter_mock_004",
  number: 4,
  input: "Compute the final result: 2^16",
  llmResponse: `Now I'll compute the final result. We've established that 2^(2^(2^2)) = 2^(2^4) = 2^16.

\`\`\`python
# Final computation: 2^16
exponent = 16
result = 2 ** exponent

print(f"Computing 2^{exponent}:")
print(f"result = {result}")

# Verification by showing powers of 2
print(f"\\nVerification:")
print("16 doublings of 1:")
current = 1
steps = []
for i in range(17):
    steps.append(str(current))
    current *= 2
print(" -> ".join(steps[:17]))

print(f"\\nFinal answer: {result}")
result
\`\`\`

The computation is complete. 2^16 = 65,536.`,
  extractedCode: `# Final computation: 2^16
exponent = 16
result = 2 ** exponent

print(f"Computing 2^{exponent}:")
print(f"result = {result}")

# Verification by showing powers of 2
print(f"\\nVerification:")
print("16 doublings of 1:")
current = 1
steps = []
for i in range(17):
    steps.append(str(current))
    current *= 2
print(" -> ".join(steps[:17]))

print(f"\\nFinal answer: {result}")
result`,
  replResult: replResult4,
  nestedQueries: [],
  isFinal: false,
  startedAt: timestamp(6500),
  completedAt: timestamp(8500),
  depth: 0,
};

const iteration5: RLMIteration = {
  id: "iter_mock_005",
  number: 5,
  input: "Provide the final answer",
  llmResponse: `I have computed 2^(2^(2^(2))) step by step:

1. **Innermost**: 2^2 = 4
2. **Middle**: 2^4 = 16
3. **Outermost**: 2^16 = 65,536

The answer has been verified through:
- Direct computation in Python
- Step-by-step doubling verification
- Nested llm_query() confirmation of intermediate result

FINAL[65536]

The value of 2^(2^(2^(2))) is **65,536**.`,
  extractedCode: undefined,
  replResult: undefined,
  nestedQueries: [],
  isFinal: true,
  finalAnswer: "65536",
  startedAt: timestamp(9000),
  completedAt: timestamp(9800),
  depth: 0,
};

// Complete mock execution
export const mockRLMExecution: RLMExecution = {
  id: "exec_mock_tetration_2024",
  query: "What is 2^(2^(2^(2)))?",
  context:
    "Mathematical computation demonstrating tetration (power tower) evaluation",
  iterations: [iteration1, iteration2, iteration3, iteration4, iteration5],
  status: "completed",
  finalAnswer: "65536",
  maxIterations: 10,
  currentDepth: 1,
  maxDepth: 3,
  startedAt: timestamp(0),
  completedAt: timestamp(9800),
  environmentType: "github-actions",
  language: "python",
  totalLLMCalls: 6, // 5 main iterations + 1 nested
  totalCodeExecutions: 4, // 4 code blocks executed
};

// Token estimates for each iteration (for display purposes)
export const iterationTokenEstimates: Record<
  string,
  { inputTokens: number; outputTokens: number }
> = {
  iter_mock_001: { inputTokens: 145, outputTokens: 287 },
  iter_mock_002: { inputTokens: 198, outputTokens: 312 },
  iter_mock_003: { inputTokens: 256, outputTokens: 198 },
  iter_mock_003_nested_001: { inputTokens: 89, outputTokens: 176 },
  iter_mock_004: { inputTokens: 234, outputTokens: 356 },
  iter_mock_005: { inputTokens: 312, outputTokens: 245 },
};

// Get total tokens
export const getTotalTokens = () => {
  return Object.values(iterationTokenEstimates).reduce(
    (acc, { inputTokens, outputTokens }) => ({
      input: acc.input + inputTokens,
      output: acc.output + outputTokens,
    }),
    { input: 0, output: 0 },
  );
};

export default mockRLMExecution;
