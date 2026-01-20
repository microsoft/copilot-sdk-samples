import { CopilotClient } from "@github/copilot-sdk";
import {
  ConnectorResult,
  success,
  failure,
  ErrorCodes,
} from "../../../shared/connectors/types.js";
import { BaseEnvironment } from "./environments/base.js";
import {
  RLMClientConfig,
  RLMExecution,
  RLMIteration,
  RLMEvent,
  RLMEventHandler,
  FinalResponse,
  createExecution,
  createIteration,
} from "./types.js";
import {
  buildSystemPrompt,
  buildInitialUserMessage,
  buildNestedQueryPrompt,
  buildErrorRecoveryPrompt,
  buildIterationWarningPrompt,
  extractCodeBlock,
  parseFinalResponse,
  hasCodeBlock,
  hasFinalResponse,
} from "./prompts.js";

export const DEFAULT_RLM_CONFIG: RLMClientConfig = {
  maxIterations: 10,
  maxDepth: 3,
  iterationTimeoutMs: 30000,
  totalTimeoutMs: 300000,
  debug: false,
  language: "python",
};

export interface ExecuteOptions {
  customInstructions?: string;
  initialVariables?: Record<string, unknown>;
}

export class RLMClient {
  private readonly client: CopilotClient;
  private readonly environment: BaseEnvironment;
  private readonly config: RLMClientConfig;
  private readonly handlers: Set<RLMEventHandler> = new Set();
  private abortController: AbortController | null = null;
  private currentExecution: RLMExecution | null = null;

  constructor(
    client: CopilotClient,
    environment: BaseEnvironment,
    config?: Partial<RLMClientConfig>,
  ) {
    this.client = client;
    this.environment = environment;
    this.config = { ...DEFAULT_RLM_CONFIG, ...config };
  }

  on(handler: RLMEventHandler): void {
    this.handlers.add(handler);
  }

  off(handler: RLMEventHandler): void {
    this.handlers.delete(handler);
  }

  stop(): void {
    if (this.abortController) {
      this.abortController.abort();
    }
  }

  getCurrentExecution(): RLMExecution | null {
    return this.currentExecution;
  }

  async execute(
    query: string,
    context: string,
    options?: ExecuteOptions,
  ): Promise<ConnectorResult<RLMExecution>> {
    this.abortController = new AbortController();
    const signal = this.abortController.signal;

    const execution = createExecution(
      query,
      context,
      this.config,
      this.environment.type,
    );
    this.currentExecution = execution;

    try {
      const initResult = await this.environment.initialize();
      if (!initResult.success) {
        execution.status = "failed";
        execution.error =
          initResult.error?.message ?? "Environment initialization failed";
        execution.completedAt = new Date().toISOString();
        return failure({
          code: ErrorCodes.INTERNAL_ERROR,
          message: execution.error,
          cause: initResult.error,
        });
      }

      const setContextResult = await this.environment.setVariable(
        "context_0",
        context,
      );
      if (!setContextResult.success) {
        execution.status = "failed";
        execution.error = "Failed to set initial context";
        execution.completedAt = new Date().toISOString();
        return failure({
          code: ErrorCodes.INTERNAL_ERROR,
          message: execution.error,
          cause: setContextResult.error,
        });
      }

      if (options?.initialVariables) {
        for (const [name, value] of Object.entries(options.initialVariables)) {
          await this.environment.setVariable(name, value);
        }
      }

      this.environment.registerLLMQueryCallback(
        async (prompt: string, iteration: RLMIteration) => {
          return this.handleNestedQuery(prompt, iteration, execution);
        },
      );

      execution.status = "running";
      this.emit({ type: "execution_start", execution });

      const systemPrompt = buildSystemPrompt({
        language: this.config.language,
        customInstructions: options?.customInstructions,
        maxIterations: this.config.maxIterations,
        maxDepth: this.config.maxDepth,
      });

      const userMessage = buildInitialUserMessage(query, context.length);

      const loopResult = await this.runLoop(
        execution,
        systemPrompt,
        userMessage,
        signal,
      );

      this.currentExecution = null;
      this.abortController = null;

      if (!loopResult.success) {
        execution.status = "failed";
        execution.error = loopResult.error?.message;
        execution.completedAt = new Date().toISOString();
        this.emit({ type: "execution_complete", execution });
        return failure({
          code: loopResult.error?.code ?? ErrorCodes.INTERNAL_ERROR,
          message: loopResult.error?.message ?? "Execution failed",
          cause: loopResult.error,
        });
      }

      execution.status = "completed";
      execution.completedAt = new Date().toISOString();
      this.emit({ type: "execution_complete", execution });

      return success(execution);
    } catch (error) {
      execution.status = "failed";
      execution.error = error instanceof Error ? error.message : String(error);
      execution.completedAt = new Date().toISOString();
      this.currentExecution = null;
      this.abortController = null;

      this.emit({
        type: "error",
        error: error instanceof Error ? error : new Error(String(error)),
        execution,
      });
      this.emit({ type: "execution_complete", execution });

      return failure({
        code: ErrorCodes.INTERNAL_ERROR,
        message: execution.error,
        cause: error,
      });
    } finally {
      await this.environment.dispose();
    }
  }

  private async runLoop(
    execution: RLMExecution,
    systemPrompt: string,
    initialMessage: string,
    signal: AbortSignal,
  ): Promise<ConnectorResult<void>> {
    const messages: Array<{
      role: "system" | "user" | "assistant";
      content: string;
    }> = [
      { role: "system", content: systemPrompt },
      { role: "user", content: initialMessage },
    ];

    let iterationNumber = 0;

    while (iterationNumber < this.config.maxIterations) {
      if (signal.aborted) {
        return failure({
          code: "ABORTED",
          message: "Execution was stopped",
        });
      }

      const elapsed = Date.now() - new Date(execution.startedAt).getTime();
      if (elapsed > this.config.totalTimeoutMs) {
        execution.status = "timeout";
        return failure({
          code: ErrorCodes.TIMEOUT,
          message: `Total execution timeout exceeded (${this.config.totalTimeoutMs}ms)`,
        });
      }

      const iteration = createIteration(
        iterationNumber,
        messages[messages.length - 1].content,
        0,
      );
      execution.iterations.push(iteration);

      this.emit({ type: "iteration_start", iteration, execution });

      const llmResponse = await this.callLLM(messages);
      if (!llmResponse.success) {
        iteration.completedAt = new Date().toISOString();
        this.emit({ type: "iteration_complete", iteration, execution });
        return failure({
          code: llmResponse.error?.code ?? ErrorCodes.INTERNAL_ERROR,
          message: llmResponse.error?.message ?? "LLM call failed",
        });
      }

      iteration.llmResponse = llmResponse.data!;
      execution.totalLLMCalls++;

      const finalResponse = parseFinalResponse(iteration.llmResponse);
      if (finalResponse) {
        this.emit({
          type: "final_detected",
          response: finalResponse,
          iteration,
        });

        const answer = await this.resolveFinalAnswer(finalResponse);
        if (answer.success) {
          iteration.isFinal = true;
          iteration.finalAnswer = answer.data;
          execution.finalAnswer = answer.data;
          iteration.completedAt = new Date().toISOString();
          this.emit({ type: "iteration_complete", iteration, execution });
          return success(undefined);
        }
      }

      if (hasCodeBlock(iteration.llmResponse)) {
        const code = extractCodeBlock(iteration.llmResponse);
        if (code) {
          iteration.extractedCode = code;
          this.emit({ type: "code_extracted", code, iteration });
          this.emit({ type: "repl_executing", code, iteration });

          const execResult = await this.environment.execute(
            code,
            undefined,
            this.config.iterationTimeoutMs,
          );
          execution.totalCodeExecutions++;

          if (execResult.success) {
            iteration.replResult = execResult.data;
            this.emit({
              type: "repl_result",
              result: execResult.data!,
              iteration,
            });

            const outputFinal = parseFinalResponse(execResult.data!.stdout);
            if (outputFinal) {
              this.emit({
                type: "final_detected",
                response: outputFinal,
                iteration,
              });
              const answer = await this.resolveFinalAnswer(outputFinal);
              if (answer.success) {
                iteration.isFinal = true;
                iteration.finalAnswer = answer.data;
                execution.finalAnswer = answer.data;
                iteration.completedAt = new Date().toISOString();
                this.emit({ type: "iteration_complete", iteration, execution });
                return success(undefined);
              }
            }

            const continuationMessage = this.buildContinuationMessage(
              execResult.data!,
            );
            messages.push({
              role: "assistant",
              content: iteration.llmResponse,
            });
            messages.push({ role: "user", content: continuationMessage });
          } else {
            const errorRecoveryPrompt = buildErrorRecoveryPrompt(
              execResult.error?.message ?? "Unknown error",
              code,
            );
            messages.push({
              role: "assistant",
              content: iteration.llmResponse,
            });
            messages.push({ role: "user", content: errorRecoveryPrompt });
          }
        } else {
          messages.push({ role: "assistant", content: iteration.llmResponse });
          messages.push({
            role: "user",
            content: "Please continue with your analysis.",
          });
        }
      } else if (!hasFinalResponse(iteration.llmResponse)) {
        messages.push({ role: "assistant", content: iteration.llmResponse });

        if (iterationNumber >= this.config.maxIterations - 3) {
          messages.push({
            role: "user",
            content: buildIterationWarningPrompt(
              iterationNumber + 1,
              this.config.maxIterations,
            ),
          });
        } else {
          messages.push({
            role: "user",
            content:
              "Please write code to continue your analysis, or provide FINAL(answer) if you have the answer.",
          });
        }
      }

      iteration.completedAt = new Date().toISOString();
      this.emit({ type: "iteration_complete", iteration, execution });
      iterationNumber++;
    }

    execution.status = "timeout";
    return failure({
      code: ErrorCodes.TIMEOUT,
      message: `Maximum iterations (${this.config.maxIterations}) reached without final answer`,
    });
  }

  private async handleNestedQuery(
    prompt: string,
    parentIteration: RLMIteration,
    execution: RLMExecution,
  ): Promise<string> {
    if (parentIteration.depth >= this.config.maxDepth) {
      return `Error: Maximum recursion depth (${this.config.maxDepth}) exceeded`;
    }

    const context: {
      executionId: string;
      parentIterationId: string;
      depth: number;
      variables: Record<string, unknown>;
    } = {
      executionId: execution.id,
      parentIterationId: parentIteration.id,
      depth: parentIteration.depth + 1,
      variables: {},
    };

    this.emit({ type: "llm_query_start", prompt, context });

    const nestedIteration = createIteration(
      parentIteration.nestedQueries.length,
      prompt,
      parentIteration.depth + 1,
      parentIteration.id,
    );
    parentIteration.nestedQueries.push(nestedIteration);

    const nestedPrompt = buildNestedQueryPrompt(prompt);
    const messages: Array<{ role: "system" | "user"; content: string }> = [
      {
        role: "system",
        content:
          "You are a helpful assistant answering a sub-question. Be concise and direct.",
      },
      { role: "user", content: nestedPrompt },
    ];

    const response = await this.callLLM(messages);
    execution.totalLLMCalls++;

    if (!response.success) {
      nestedIteration.llmResponse = `Error: ${response.error?.message}`;
      nestedIteration.completedAt = new Date().toISOString();
      this.emit({
        type: "llm_query_complete",
        response: nestedIteration.llmResponse,
        context,
      });
      return nestedIteration.llmResponse;
    }

    nestedIteration.llmResponse = response.data!;
    nestedIteration.completedAt = new Date().toISOString();

    this.emit({
      type: "llm_query_complete",
      response: response.data!,
      context,
    });

    return response.data!;
  }

  private async callLLM(
    messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  ): Promise<ConnectorResult<string>> {
    try {
      const session = await this.client.createSession({
        model: this.config.model,
      });

      let responseContent = "";

      const done = new Promise<void>((resolve, reject) => {
        session.on((event) => {
          if (event.type === "assistant.message") {
            responseContent += event.data.content;
          } else if (event.type === "session.idle") {
            resolve();
          } else if (event.type === "session.error") {
            reject(new Error(event.data?.message ?? "LLM error"));
          }
        });
      });

      const prompt = messages
        .map((m) => {
          if (m.role === "system") return `[System]: ${m.content}`;
          if (m.role === "user") return `[User]: ${m.content}`;
          return `[Assistant]: ${m.content}`;
        })
        .join("\n\n");

      await session.send({ prompt });
      await done;
      await session.destroy();

      if (this.config.debug) {
        console.log(
          `[RLM Debug] LLM Response (${responseContent.length} chars)`,
        );
      }

      return success(responseContent);
    } catch (error) {
      return failure({
        code: ErrorCodes.INTERNAL_ERROR,
        message: error instanceof Error ? error.message : "LLM call failed",
        cause: error,
      });
    }
  }

  private async resolveFinalAnswer(
    finalResponse: FinalResponse,
  ): Promise<ConnectorResult<string>> {
    if (finalResponse.type === "FINAL" && finalResponse.answer) {
      return success(finalResponse.answer);
    }

    if (finalResponse.type === "FINAL_VAR" && finalResponse.variableName) {
      const varResult = await this.environment.getVariable(
        finalResponse.variableName,
      );
      if (varResult.success) {
        const value = varResult.data;
        return success(
          typeof value === "string" ? value : JSON.stringify(value),
        );
      }
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Variable '${finalResponse.variableName}' not found`,
        cause: varResult.error,
      });
    }

    return failure({
      code: ErrorCodes.VALIDATION_ERROR,
      message: "Invalid final response format",
    });
  }

  private buildContinuationMessage(result: {
    success: boolean;
    stdout: string;
    stderr: string;
    returnValue?: unknown;
  }): string {
    let message = "Code executed.\n\n";

    if (result.stdout) {
      message += `**Output:**\n\`\`\`\n${result.stdout}\n\`\`\`\n\n`;
    }

    if (result.stderr) {
      message += `**Errors:**\n\`\`\`\n${result.stderr}\n\`\`\`\n\n`;
    }

    if (result.returnValue !== undefined) {
      message += `**Return value:** ${JSON.stringify(result.returnValue)}\n\n`;
    }

    message +=
      "Continue your analysis or provide FINAL(answer) if you have the answer.";

    return message;
  }

  private emit(event: RLMEvent): void {
    for (const handler of this.handlers) {
      try {
        handler(event);
      } catch (error) {
        if (this.config.debug) {
          console.error("[RLM Debug] Event handler error:", error);
        }
      }
    }
  }
}

export function createRLMClient(
  client: CopilotClient,
  environment: BaseEnvironment,
  config?: Partial<RLMClientConfig>,
): RLMClient {
  return new RLMClient(client, environment, config);
}
