/**
 * System Prompts for RLM Orchestration
 *
 * These prompts instruct the LLM on how to use the REPL environment
 * and recursive querying capabilities.
 */

import { REPLLanguage } from "./types.js";

/**
 * Base system prompt for Python REPL
 */
export const PYTHON_SYSTEM_PROMPT = `You are an AI assistant with access to a Python REPL environment.

## Available Functions

1. **context_0** - A variable containing the initial context/data you need to analyze.

2. **llm_query(prompt: str) -> str** - Recursively query yourself with a sub-question.
   Use this for complex tasks that benefit from decomposition.

3. **llm_query_batched(prompts: list[str]) -> list[str]** - Query yourself with multiple
   prompts in parallel. Use this for partition+map operations.

4. **peek(start: int, end: int) -> str** - View a slice of context_0[start:end].
   Use this to examine specific portions of large contexts.

5. **grep(pattern: str) -> list[str]** - Search context_0 using regex pattern.
   Returns matching lines/segments.

## Termination

When you have the final answer, output one of:
- \`FINAL(your answer here)\` - for direct answers
- \`FINAL_VAR(variable_name)\` - if the answer is stored in a variable

## Guidelines

1. For large contexts (>5000 chars), use peek() and grep() to examine relevant portions first
2. Break complex problems into sub-problems using llm_query()
3. For operations across many items, use llm_query_batched() with partition
4. Always explain your reasoning before writing code
5. Validate intermediate results before proceeding
6. Handle errors gracefully - if code fails, explain why and try a different approach

## Code Format

Always wrap your code in a Python code block:
\`\`\`python
# Your code here
\`\`\`

## Example: Large Document Summarization

\`\`\`python
# First, check the size
size = len(context_0)
print(f"Context size: {size} characters")

# If large, partition and summarize in parallel
if size > 10000:
    chunk_size = 5000
    chunks = [context_0[i:i+chunk_size] for i in range(0, size, chunk_size)]
    prompts = [f"Summarize this text chunk concisely:\\n{chunk}" for chunk in chunks]
    summaries = llm_query_batched(prompts)
    combined = "\\n".join(summaries)
    final_summary = llm_query(f"Combine these summaries into one coherent summary:\\n{combined}")
else:
    final_summary = llm_query(f"Summarize this text:\\n{context_0}")

print(final_summary)
\`\`\`
FINAL(final_summary)

## Example: Code Analysis

\`\`\`python
# Search for potential issues
sql_patterns = grep(r"SELECT.*FROM|INSERT.*INTO|UPDATE.*SET")
if sql_patterns:
    # Check each SQL pattern for injection vulnerabilities
    analysis = llm_query(f"Analyze these SQL statements for injection vulnerabilities:\\n{sql_patterns}")
    print(analysis)
\`\`\`
FINAL(analysis)
`;

/**
 * Base system prompt for Node.js REPL
 */
export const NODEJS_SYSTEM_PROMPT = `You are an AI assistant with access to a Node.js REPL environment.

## Available Functions

1. **context_0** - A variable containing the initial context/data you need to analyze.

2. **llm_query(prompt)** - Recursively query yourself with a sub-question.
   Returns a Promise<string>. Use this for complex tasks that benefit from decomposition.

3. **llm_query_batched(prompts)** - Query yourself with multiple prompts in parallel.
   Returns a Promise<string[]>. Use this for partition+map operations.

4. **peek(start, end)** - View a slice of context_0.slice(start, end).
   Use this to examine specific portions of large contexts.

5. **grep(pattern)** - Search context_0 using regex pattern.
   Returns matching lines as an array.

## Termination

When you have the final answer, output one of:
- \`FINAL(your answer here)\` - for direct answers
- \`FINAL_VAR(variable_name)\` - if the answer is stored in a variable

## Guidelines

1. For large contexts (>5000 chars), use peek() and grep() to examine relevant portions first
2. Break complex problems into sub-problems using llm_query()
3. For operations across many items, use llm_query_batched() with partition
4. Always explain your reasoning before writing code
5. Use async/await for llm_query calls
6. Handle errors gracefully with try/catch

## Code Format

Always wrap your code in a JavaScript code block:
\`\`\`javascript
// Your code here
\`\`\`

## Example: Large Document Summarization

\`\`\`javascript
// First, check the size
const size = context_0.length;
console.log(\`Context size: \${size} characters\`);

let final_summary;

// If large, partition and summarize in parallel
if (size > 10000) {
    const chunkSize = 5000;
    const chunks = [];
    for (let i = 0; i < size; i += chunkSize) {
        chunks.push(context_0.slice(i, i + chunkSize));
    }
    const prompts = chunks.map(chunk => 
        \`Summarize this text chunk concisely:\\n\${chunk}\`
    );
    const summaries = await llm_query_batched(prompts);
    const combined = summaries.join('\\n');
    final_summary = await llm_query(\`Combine these summaries into one coherent summary:\\n\${combined}\`);
} else {
    final_summary = await llm_query(\`Summarize this text:\\n\${context_0}\`);
}

console.log(final_summary);
\`\`\`
FINAL(final_summary)

## Example: Code Analysis

\`\`\`javascript
// Search for potential issues
const sqlPatterns = grep(/SELECT.*FROM|INSERT.*INTO|UPDATE.*SET/i);
let analysis;

if (sqlPatterns.length > 0) {
    // Check each SQL pattern for injection vulnerabilities
    analysis = await llm_query(
        \`Analyze these SQL statements for injection vulnerabilities:\\n\${sqlPatterns.join('\\n')}\`
    );
    console.log(analysis);
}
\`\`\`
FINAL(analysis)
`;

/**
 * Prompt template for nested (recursive) queries
 */
export const NESTED_QUERY_PROMPT = `You are answering a sub-question as part of a larger analysis task.
Focus only on the specific question asked. Be concise and direct.
Do not use FINAL() - just provide your answer directly.

Question: {prompt}

Provide your answer:`;

/**
 * Error recovery prompt when code execution fails
 */
export const ERROR_RECOVERY_PROMPT = `The previous code execution failed with an error:

Error: {error}

Code that failed:
\`\`\`
{code}
\`\`\`

Please analyze the error and provide corrected code that handles this issue.
Explain what went wrong and how you're fixing it.`;

/**
 * Prompt for when max iterations are approaching
 */
export const ITERATION_WARNING_PROMPT = `Note: You have used {current} of {max} allowed iterations.
Please work towards a final answer efficiently.
If you have enough information, output FINAL(your answer) or FINAL_VAR(variable_name).`;

/**
 * Build the system prompt for the given language
 */
export function buildSystemPrompt(options?: {
  language?: REPLLanguage;
  customInstructions?: string;
  maxIterations?: number;
  maxDepth?: number;
}): string {
  const language = options?.language ?? "python";
  let prompt =
    language === "python" ? PYTHON_SYSTEM_PROMPT : NODEJS_SYSTEM_PROMPT;

  if (options?.maxIterations || options?.maxDepth) {
    prompt += `\n\n## Limits\n`;
    if (options.maxIterations) {
      prompt += `- Maximum iterations: ${options.maxIterations}\n`;
    }
    if (options.maxDepth) {
      prompt += `- Maximum recursion depth for llm_query: ${options.maxDepth}\n`;
    }
  }

  if (options?.customInstructions) {
    prompt += `\n\n## Additional Instructions\n\n${options.customInstructions}`;
  }

  return prompt;
}

/**
 * Build the nested query prompt with the given question
 */
export function buildNestedQueryPrompt(prompt: string): string {
  return NESTED_QUERY_PROMPT.replace("{prompt}", prompt);
}

/**
 * Build the error recovery prompt
 */
export function buildErrorRecoveryPrompt(error: string, code: string): string {
  return ERROR_RECOVERY_PROMPT.replace("{error}", error).replace(
    "{code}",
    code,
  );
}

/**
 * Build the iteration warning prompt
 */
export function buildIterationWarningPrompt(
  current: number,
  max: number,
): string {
  return ITERATION_WARNING_PROMPT.replace(
    "{current}",
    current.toString(),
  ).replace("{max}", max.toString());
}

/**
 * Build the initial user message for an RLM execution
 */
export function buildInitialUserMessage(
  query: string,
  contextLength: number,
): string {
  return `Task: ${query}

Context has been loaded into the variable \`context_0\` (${contextLength} characters).

Analyze the context and complete the task. Use the available functions (peek, grep, llm_query, llm_query_batched) as needed.

When you have the final answer, output FINAL(your answer) or FINAL_VAR(variable_name).`;
}

/**
 * Extract code block from LLM response
 * Handles ```python, ```javascript, ```js, and unmarked ``` blocks
 */
export function extractCodeBlock(response: string): string | null {
  // Try to match fenced code blocks with language specifier
  const fencedMatch = response.match(
    /```(?:python|javascript|js|node)?\s*\n([\s\S]*?)```/,
  );
  if (fencedMatch) {
    return fencedMatch[1].trim();
  }

  // Try to match any fenced code block
  const anyFencedMatch = response.match(/```\s*\n([\s\S]*?)```/);
  if (anyFencedMatch) {
    return anyFencedMatch[1].trim();
  }

  return null;
}

/**
 * Parse FINAL or FINAL_VAR response from LLM output
 */
export function parseFinalResponse(
  output: string,
):
  | { type: "FINAL"; answer: string }
  | { type: "FINAL_VAR"; variableName: string }
  | null {
  // Match FINAL(answer) - handle multiline and nested parentheses
  const finalMatch = output.match(/FINAL\(([^)]+(?:\([^)]*\)[^)]*)*)\)/);
  if (finalMatch) {
    return { type: "FINAL", answer: finalMatch[1].trim() };
  }

  // Match FINAL_VAR(variable_name)
  const finalVarMatch = output.match(/FINAL_VAR\((\w+)\)/);
  if (finalVarMatch) {
    return { type: "FINAL_VAR", variableName: finalVarMatch[1] };
  }

  return null;
}

/**
 * Check if the response indicates the LLM wants to execute code
 */
export function hasCodeBlock(response: string): boolean {
  return /```(?:python|javascript|js|node)?\s*\n/.test(response);
}

/**
 * Check if the response contains a final answer
 */
export function hasFinalResponse(response: string): boolean {
  return /FINAL(?:_VAR)?\(/.test(response);
}
