import { useState, useCallback } from "react";

interface REPLResult {
  success: boolean;
  stdout: string;
  stderr: string;
  returnValue?: unknown;
  durationMs: number;
  error?: { type: string; message: string; stack?: string; line?: number };
}

interface RLMIteration {
  id: string;
  number: number;
  input: string;
  llmResponse: string;
  extractedCode?: string;
  replResult?: REPLResult;
  nestedQueries: RLMIteration[];
  isFinal: boolean;
  finalAnswer?: string;
  startedAt: string;
  completedAt?: string;
  parentId?: string;
  depth: number;
}

interface RLMExecution {
  id: string;
  query: string;
  context: string;
  iterations: RLMIteration[];
  status: "pending" | "running" | "completed" | "failed" | "timeout";
  finalAnswer?: string;
  error?: string;
  maxIterations: number;
  currentDepth: number;
  maxDepth: number;
  startedAt: string;
  completedAt?: string;
  environmentType: "github-actions" | "aca-sessions" | "local";
  language: "python" | "nodejs";
  totalLLMCalls: number;
  totalCodeExecutions: number;
}

type RLMEvent =
  | { type: "execution_start"; execution: RLMExecution }
  | { type: "execution_complete"; execution: RLMExecution }
  | {
      type: "iteration_start";
      iteration: RLMIteration;
      execution: RLMExecution;
    }
  | {
      type: "iteration_complete";
      iteration: RLMIteration;
      execution: RLMExecution;
    }
  | { type: "code_extracted"; code: string; iteration: RLMIteration }
  | { type: "repl_executing"; code: string; iteration: RLMIteration }
  | { type: "repl_result"; result: REPLResult; iteration: RLMIteration }
  | {
      type: "final_detected";
      response: { type: string; answer?: string };
      iteration: RLMIteration;
    }
  | { type: "error"; error: Error; execution: RLMExecution };

interface UseRLMExecutionReturn {
  execution: RLMExecution | null;
  selectedIteration: RLMIteration | null;
  isRunning: boolean;
  startExecution: (query: string, context: string) => void;
  handleEvent: (event: RLMEvent) => void;
  reset: () => void;
  selectIteration: (iteration: RLMIteration | null) => void;
}

const createInitialExecution = (
  query: string,
  context: string,
): RLMExecution => ({
  id: `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  query,
  context,
  iterations: [],
  status: "pending",
  maxIterations: 10,
  currentDepth: 0,
  maxDepth: 3,
  startedAt: new Date().toISOString(),
  environmentType: "local",
  language: "python",
  totalLLMCalls: 0,
  totalCodeExecutions: 0,
});

const findAndUpdateIteration = (
  iterations: RLMIteration[],
  targetId: string,
  updater: (iteration: RLMIteration) => RLMIteration,
): RLMIteration[] => {
  return iterations.map((iter) => {
    if (iter.id === targetId) {
      return updater(iter);
    }
    if (iter.nestedQueries.length > 0) {
      return {
        ...iter,
        nestedQueries: findAndUpdateIteration(
          iter.nestedQueries,
          targetId,
          updater,
        ),
      };
    }
    return iter;
  });
};

export function useRLMExecution(): UseRLMExecutionReturn {
  const [execution, setExecution] = useState<RLMExecution | null>(null);
  const [selectedIteration, setSelectedIteration] =
    useState<RLMIteration | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  const startExecution = useCallback((query: string, context: string) => {
    const newExecution = createInitialExecution(query, context);
    setExecution(newExecution);
    setSelectedIteration(null);
    setIsRunning(true);
  }, []);

  const handleEvent = useCallback((event: RLMEvent) => {
    switch (event.type) {
      case "execution_start":
        setExecution({
          ...event.execution,
          status: "running",
          startedAt: new Date().toISOString(),
        });
        setIsRunning(true);
        break;

      case "execution_complete":
        setExecution({
          ...event.execution,
          status: "completed",
          completedAt: new Date().toISOString(),
        });
        setIsRunning(false);
        break;

      case "iteration_start":
        setExecution((prev) => {
          if (!prev) return prev;

          const newIteration: RLMIteration = {
            ...event.iteration,
            startedAt: new Date().toISOString(),
          };

          if (event.iteration.parentId) {
            return {
              ...prev,
              iterations: findAndUpdateIteration(
                prev.iterations,
                event.iteration.parentId,
                (parent) => ({
                  ...parent,
                  nestedQueries: [...parent.nestedQueries, newIteration],
                }),
              ),
              currentDepth: Math.max(prev.currentDepth, event.iteration.depth),
              totalLLMCalls: prev.totalLLMCalls + 1,
            };
          }

          return {
            ...prev,
            iterations: [...prev.iterations, newIteration],
            totalLLMCalls: prev.totalLLMCalls + 1,
          };
        });
        break;

      case "iteration_complete":
        setExecution((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            iterations: findAndUpdateIteration(
              prev.iterations,
              event.iteration.id,
              (iter) => ({
                ...iter,
                ...event.iteration,
                completedAt: new Date().toISOString(),
              }),
            ),
          };
        });
        break;

      case "code_extracted":
        setExecution((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            iterations: findAndUpdateIteration(
              prev.iterations,
              event.iteration.id,
              (iter) => ({
                ...iter,
                extractedCode: event.code,
              }),
            ),
          };
        });
        break;

      case "repl_executing":
        setExecution((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            totalCodeExecutions: prev.totalCodeExecutions + 1,
          };
        });
        break;

      case "repl_result":
        setExecution((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            iterations: findAndUpdateIteration(
              prev.iterations,
              event.iteration.id,
              (iter) => ({
                ...iter,
                replResult: event.result,
              }),
            ),
          };
        });
        break;

      case "final_detected":
        setExecution((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            iterations: findAndUpdateIteration(
              prev.iterations,
              event.iteration.id,
              (iter) => ({
                ...iter,
                isFinal: true,
                finalAnswer: event.response.answer,
              }),
            ),
            finalAnswer: event.response.answer,
          };
        });
        break;

      case "error":
        setExecution((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            status: "failed",
            error: event.error.message,
            completedAt: new Date().toISOString(),
          };
        });
        setIsRunning(false);
        break;
    }
  }, []);

  const reset = useCallback(() => {
    setExecution(null);
    setSelectedIteration(null);
    setIsRunning(false);
  }, []);

  const selectIteration = useCallback((iteration: RLMIteration | null) => {
    setSelectedIteration(iteration);
  }, []);

  return {
    execution,
    selectedIteration,
    isRunning,
    startExecution,
    handleEvent,
    reset,
    selectIteration,
  };
}

export type { RLMExecution, RLMIteration, REPLResult, RLMEvent };
