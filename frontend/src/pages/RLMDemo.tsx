import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
  ChevronRight,
  Terminal,
  ArrowLeft,
  Lightbulb,
  Database,
  Wifi,
  Key,
  ExternalLink,
} from "lucide-react";
import { RLMViewer } from "../components/RLMVisualization";
import { useRLMExecution, type RLMExecution } from "../hooks/useRLMExecution";
import { mockRLMExecution } from "../data/rlmMockData";

type ViewMode = "mock" | "live";

const EXAMPLE_QUERIES = [
  {
    query: "Calculate the first 10 prime numbers and find their sum",
    context: "Mathematical computation with recursive verification",
    icon: <Sparkles size={14} />,
  },
  {
    query: "Analyze the sentiment of customer reviews and categorize them",
    context: "NLP task with multi-step reasoning",
    icon: <Lightbulb size={14} />,
  },
  {
    query: "Generate a report on API response times from the last 24 hours",
    context: "Data processing with code execution",
    icon: <Zap size={14} />,
  },
];

const createMockExecution = (query: string, context: string): RLMExecution => ({
  id: `exec_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
  query,
  context,
  iterations: [
    {
      id: "iter_001",
      number: 1,
      input: query,
      llmResponse: `Let me break down this problem. First, I'll need to write code to ${query.toLowerCase().includes("prime") ? "generate prime numbers" : "process the data"}.`,
      extractedCode: `def is_prime(n):
    if n < 2:
        return False
    for i in range(2, int(n**0.5) + 1):
        if n % i == 0:
            return False
    return True

primes = []
num = 2
while len(primes) < 10:
    if is_prime(num):
        primes.append(num)
    num += 1

print(f"First 10 primes: {primes}")
print(f"Sum: {sum(primes)}")`,
      replResult: {
        success: true,
        stdout:
          "First 10 primes: [2, 3, 5, 7, 11, 13, 17, 19, 23, 29]\nSum: 129",
        stderr: "",
        durationMs: 45,
        returnValue: 129,
      },
      nestedQueries: [
        {
          id: "iter_001_nested_001",
          number: 1,
          input: "Verify the sum calculation is correct",
          llmResponse:
            "I'll verify by manually adding: 2+3+5+7+11+13+17+19+23+29",
          extractedCode: `result = 2 + 3 + 5 + 7 + 11 + 13 + 17 + 19 + 23 + 29
print(f"Verification sum: {result}")
assert result == 129, "Sum mismatch!"
print("Verified correct")`,
          replResult: {
            success: true,
            stdout: "Verification sum: 129\nVerified correct",
            stderr: "",
            durationMs: 12,
          },
          nestedQueries: [],
          isFinal: false,
          startedAt: new Date(Date.now() - 3000).toISOString(),
          completedAt: new Date(Date.now() - 2800).toISOString(),
          parentId: "iter_001",
          depth: 1,
        },
      ],
      isFinal: false,
      startedAt: new Date(Date.now() - 5000).toISOString(),
      completedAt: new Date(Date.now() - 2500).toISOString(),
      depth: 0,
    },
    {
      id: "iter_002",
      number: 2,
      input: "Format the final answer with explanation",
      llmResponse:
        "Now I have the complete answer. The first 10 prime numbers are 2, 3, 5, 7, 11, 13, 17, 19, 23, and 29, and their sum is 129.",
      nestedQueries: [],
      isFinal: true,
      finalAnswer:
        "The first 10 prime numbers are: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29. Their sum is **129**. This was verified through recursive computation and cross-checking.",
      startedAt: new Date(Date.now() - 2000).toISOString(),
      completedAt: new Date(Date.now() - 500).toISOString(),
      depth: 0,
    },
  ],
  status: "completed",
  finalAnswer:
    "The first 10 prime numbers are: 2, 3, 5, 7, 11, 13, 17, 19, 23, 29. Their sum is **129**. This was verified through recursive computation and cross-checking.",
  maxIterations: 10,
  currentDepth: 1,
  maxDepth: 3,
  startedAt: new Date(Date.now() - 5000).toISOString(),
  completedAt: new Date(Date.now() - 500).toISOString(),
  environmentType: "local",
  language: "python",
  totalLLMCalls: 3,
  totalCodeExecutions: 2,
});

const simulateExecution = async (
  query: string,
  context: string,
  onEvent: (event: any) => void,
): Promise<void> => {
  const mockExec = createMockExecution(query, context);

  onEvent({
    type: "execution_start",
    execution: { ...mockExec, iterations: [], status: "running" },
  });

  await delay(800);

  const iter1 = mockExec.iterations[0];
  onEvent({
    type: "iteration_start",
    iteration: { ...iter1, replResult: undefined, nestedQueries: [] },
    execution: mockExec,
  });

  await delay(600);

  onEvent({
    type: "code_extracted",
    code: iter1.extractedCode!,
    iteration: iter1,
  });

  await delay(400);

  onEvent({
    type: "repl_executing",
    code: iter1.extractedCode!,
    iteration: iter1,
  });

  await delay(800);

  onEvent({
    type: "repl_result",
    result: iter1.replResult!,
    iteration: iter1,
  });

  await delay(300);

  const nestedIter = iter1.nestedQueries[0];
  onEvent({
    type: "iteration_start",
    iteration: { ...nestedIter, replResult: undefined },
    execution: mockExec,
  });

  await delay(500);

  onEvent({
    type: "code_extracted",
    code: nestedIter.extractedCode!,
    iteration: nestedIter,
  });

  await delay(300);

  onEvent({
    type: "repl_executing",
    code: nestedIter.extractedCode!,
    iteration: nestedIter,
  });

  await delay(400);

  onEvent({
    type: "repl_result",
    result: nestedIter.replResult!,
    iteration: nestedIter,
  });

  await delay(200);

  onEvent({
    type: "iteration_complete",
    iteration: nestedIter,
    execution: mockExec,
  });

  await delay(300);

  onEvent({
    type: "iteration_complete",
    iteration: iter1,
    execution: mockExec,
  });

  await delay(500);

  const iter2 = mockExec.iterations[1];
  onEvent({
    type: "iteration_start",
    iteration: iter2,
    execution: mockExec,
  });

  await delay(600);

  onEvent({
    type: "final_detected",
    response: { type: "final", answer: iter2.finalAnswer },
    iteration: iter2,
  });

  await delay(300);

  onEvent({
    type: "iteration_complete",
    iteration: iter2,
    execution: mockExec,
  });

  await delay(200);

  onEvent({
    type: "execution_complete",
    execution: mockExec,
  });
};

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const RLMDemo: React.FC = () => {
  const [mode, setMode] = useState<ViewMode>("mock");
  const [query, setQuery] = useState(EXAMPLE_QUERIES[0].query);
  const [context, setContext] = useState(EXAMPLE_QUERIES[0].context);
  const [githubToken, setGithubToken] = useState("");
  const [showToken, setShowToken] = useState(false);
  const { execution, isRunning, handleEvent, reset } = useRLMExecution();

  const handleRun = useCallback(async () => {
    if (!query.trim() || isRunning) return;
    reset();
    await simulateExecution(query, context, handleEvent);
  }, [query, context, isRunning, handleEvent, reset]);

  const handleExampleClick = useCallback(
    (example: (typeof EXAMPLE_QUERIES)[0]) => {
      setQuery(example.query);
      setContext(example.context);
    },
    [],
  );

  const handleReset = useCallback(() => {
    reset();
    setQuery(EXAMPLE_QUERIES[0].query);
    setContext(EXAMPLE_QUERIES[0].context);
  }, [reset]);

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "var(--bg-page)",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* Header */}
      <header
        style={{
          padding: "var(--space-5) var(--space-6)",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-sidebar)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-4)",
            }}
          >
            <a
              href="/"
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                color: "var(--text-muted)",
                fontSize: "var(--font-size-sm)",
                textDecoration: "none",
                transition: "color 0.15s ease",
              }}
              onMouseEnter={(e) =>
                (e.currentTarget.style.color = "var(--text-primary)")
              }
              onMouseLeave={(e) =>
                (e.currentTarget.style.color = "var(--text-muted)")
              }
            >
              <ArrowLeft size={16} />
              Back
            </a>
            <div
              style={{
                width: 1,
                height: 24,
                background: "var(--border-subtle)",
              }}
            />
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background:
                    "linear-gradient(135deg, var(--brand-primary), var(--color-teams))",
                  borderRadius: "var(--radius-md)",
                  boxShadow: "var(--shadow-glow)",
                }}
              >
                <Brain size={20} style={{ color: "white" }} />
              </div>
              <div>
                <h1
                  style={{
                    fontSize: "var(--font-size-lg)",
                    fontWeight: 600,
                    color: "var(--text-primary)",
                    margin: 0,
                  }}
                >
                  RLM Orchestration
                </h1>
                <p
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--text-muted)",
                    margin: 0,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                  }}
                >
                  <a
                    href="https://alexzhang13.github.io/blog/2025/rlm/"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      color: "var(--text-link)",
                      textDecoration: "none",
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                    }}
                  >
                    Recursive Language Model
                    <ExternalLink size={10} />
                  </a>
                  Demo
                </p>
              </div>
            </div>
          </div>

          {/* Mode Toggle */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-1)",
              background: "var(--bg-surface)",
              borderRadius: "var(--radius-md)",
              border: "1px solid var(--border-subtle)",
            }}
          >
            <button
              onClick={() => setMode("mock")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background:
                  mode === "mock" ? "var(--bg-elevated)" : "transparent",
                color:
                  mode === "mock" ? "var(--text-primary)" : "var(--text-muted)",
                fontSize: "var(--font-size-sm)",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Database size={14} />
              Mock Data
            </button>
            <button
              onClick={() => setMode("live")}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-3)",
                borderRadius: "var(--radius-sm)",
                border: "none",
                background:
                  mode === "live" ? "var(--bg-elevated)" : "transparent",
                color:
                  mode === "live" ? "var(--text-primary)" : "var(--text-muted)",
                fontSize: "var(--font-size-sm)",
                fontWeight: 500,
                cursor: "pointer",
                transition: "all 0.15s ease",
              }}
            >
              <Wifi size={14} />
              Live API
            </button>
          </div>
        </div>
      </header>

      <main
        style={{
          flex: 1,
          padding: "var(--space-6)",
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: "0 auto",
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-6)",
          }}
        >
          {/* Mock Mode - Show pre-loaded execution */}
          {mode === "mock" && (
            <AnimatePresence mode="wait">
              <motion.div
                key="mock-mode"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
              >
                {/* Mock mode info banner */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-3)",
                    padding: "var(--space-4)",
                    background: "var(--info-muted)",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                    borderRadius: "var(--radius-lg)",
                    marginBottom: "var(--space-5)",
                  }}
                >
                  <Database
                    size={18}
                    style={{ color: "var(--info)", flexShrink: 0 }}
                  />
                  <div>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "var(--font-size-sm)",
                        color: "var(--text-primary)",
                        fontWeight: 500,
                      }}
                    >
                      Viewing Mock Data: 2^(2^(2^(2))) = 65536
                    </p>
                    <p
                      style={{
                        margin: 0,
                        fontSize: "var(--font-size-xs)",
                        color: "var(--text-secondary)",
                        marginTop: 2,
                      }}
                    >
                      This demonstrates tetration computation with nested
                      llm_query() calls, code execution, and verification steps.
                    </p>
                  </div>
                </motion.div>

                {/* Display the mock execution */}
                <RLMViewer execution={mockRLMExecution} />
              </motion.div>
            </AnimatePresence>
          )}

          {/* Live Mode - Query input and execution */}
          {mode === "live" && (
            <AnimatePresence mode="wait">
              <motion.div
                key="live-mode"
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.3 }}
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "var(--space-6)",
                }}
              >
                {/* Credentials Section */}
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4 }}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-xl)",
                    padding: "var(--space-5)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                      marginBottom: "var(--space-4)",
                    }}
                  >
                    <Key size={18} style={{ color: "var(--warning)" }} />
                    <h2
                      style={{
                        fontSize: "var(--font-size-base)",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        margin: 0,
                      }}
                    >
                      Credentials
                    </h2>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-3)",
                    }}
                  >
                    {/* GitHub Token help */}
                    <div
                      style={{
                        background: "var(--bg-surface)",
                        border: "1px solid var(--border-subtle)",
                        borderRadius: "var(--radius-md)",
                        padding: "var(--space-3)",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontSize: "var(--font-size-sm)",
                          color: "var(--text-secondary)",
                          marginBottom: "var(--space-2)",
                        }}
                      >
                        A GitHub Personal Access Token is required to
                        authenticate with the Copilot API.
                      </p>
                      <a
                        href="https://github.com/settings/tokens/new?description=RLM%20Demo&scopes=copilot"
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          display: "inline-flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                          padding: "var(--space-2) var(--space-3)",
                          background: "var(--bg-page)",
                          border: "1px solid var(--border-default)",
                          borderRadius: "var(--radius-sm)",
                          color: "var(--text-link)",
                          fontSize: "var(--font-size-sm)",
                          fontWeight: 500,
                          textDecoration: "none",
                          transition: "all 0.15s ease",
                        }}
                      >
                        <ExternalLink size={14} />
                        Create a GitHub PAT
                      </a>
                      <p
                        style={{
                          margin: 0,
                          fontSize: "var(--font-size-xs)",
                          color: "var(--text-muted)",
                          marginTop: "var(--space-2)",
                        }}
                      >
                        Required scope:{" "}
                        <code
                          style={{
                            background: "var(--bg-page)",
                            padding: "1px 4px",
                            borderRadius: 3,
                          }}
                        >
                          copilot
                        </code>
                      </p>
                    </div>

                    {/* Token input */}
                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "var(--font-size-xs)",
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          marginBottom: "var(--space-2)",
                        }}
                      >
                        GitHub Token
                      </label>
                      <div style={{ display: "flex", gap: "var(--space-2)" }}>
                        <input
                          type={showToken ? "text" : "password"}
                          value={githubToken}
                          onChange={(e) => setGithubToken(e.target.value)}
                          placeholder="ghp_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx"
                          disabled={isRunning}
                          style={{
                            flex: 1,
                            padding: "var(--space-3)",
                            background: "var(--bg-surface)",
                            border: "1px solid var(--border-default)",
                            borderRadius: "var(--radius-md)",
                            color: "var(--text-primary)",
                            fontSize: "var(--font-size-sm)",
                            fontFamily: "var(--font-mono)",
                            outline: "none",
                            transition: "border-color 0.15s ease",
                          }}
                        />
                        <button
                          onClick={() => setShowToken(!showToken)}
                          style={{
                            padding: "var(--space-3)",
                            background: "var(--bg-surface)",
                            border: "1px solid var(--border-default)",
                            borderRadius: "var(--radius-md)",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            transition: "all 0.15s ease",
                          }}
                        >
                          {showToken ? "Hide" : "Show"}
                        </button>
                      </div>
                    </div>
                  </div>
                </motion.section>

                {/* Query Section */}
                <motion.section
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.4, delay: 0.1 }}
                  style={{
                    background: "var(--bg-card)",
                    border: "1px solid var(--border-default)",
                    borderRadius: "var(--radius-xl)",
                    padding: "var(--space-6)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "var(--space-2)",
                      marginBottom: "var(--space-4)",
                    }}
                  >
                    <Terminal
                      size={18}
                      style={{ color: "var(--brand-light)" }}
                    />
                    <h2
                      style={{
                        fontSize: "var(--font-size-base)",
                        fontWeight: 600,
                        color: "var(--text-primary)",
                        margin: 0,
                      }}
                    >
                      Query
                    </h2>
                  </div>

                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      gap: "var(--space-4)",
                    }}
                  >
                    <div>
                      <textarea
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        placeholder="Enter your query for the RLM to process..."
                        disabled={isRunning}
                        style={{
                          width: "100%",
                          minHeight: 100,
                          padding: "var(--space-4)",
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border-default)",
                          borderRadius: "var(--radius-md)",
                          color: "var(--text-primary)",
                          fontSize: "var(--font-size-base)",
                          fontFamily: "var(--font-sans)",
                          lineHeight: 1.6,
                          resize: "vertical",
                          outline: "none",
                          transition: "border-color 0.15s ease",
                        }}
                        onFocus={(e) =>
                          (e.target.style.borderColor = "var(--brand-primary)")
                        }
                        onBlur={(e) =>
                          (e.target.style.borderColor = "var(--border-default)")
                        }
                      />
                    </div>

                    <div>
                      <label
                        style={{
                          display: "block",
                          fontSize: "var(--font-size-xs)",
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          marginBottom: "var(--space-2)",
                        }}
                      >
                        Context (optional)
                      </label>
                      <input
                        type="text"
                        value={context}
                        onChange={(e) => setContext(e.target.value)}
                        placeholder="Additional context for the execution..."
                        disabled={isRunning}
                        style={{
                          width: "100%",
                          padding: "var(--space-3)",
                          background: "var(--bg-surface)",
                          border: "1px solid var(--border-default)",
                          borderRadius: "var(--radius-md)",
                          color: "var(--text-primary)",
                          fontSize: "var(--font-size-sm)",
                          outline: "none",
                          transition: "border-color 0.15s ease",
                        }}
                        onFocus={(e) =>
                          (e.target.style.borderColor = "var(--brand-primary)")
                        }
                        onBlur={(e) =>
                          (e.target.style.borderColor = "var(--border-default)")
                        }
                      />
                    </div>

                    <div>
                      <div
                        style={{
                          fontSize: "var(--font-size-xs)",
                          color: "var(--text-muted)",
                          textTransform: "uppercase",
                          letterSpacing: "0.5px",
                          marginBottom: "var(--space-2)",
                        }}
                      >
                        Try an example
                      </div>
                      <div
                        style={{
                          display: "flex",
                          flexWrap: "wrap",
                          gap: "var(--space-2)",
                        }}
                      >
                        {EXAMPLE_QUERIES.map((example, index) => (
                          <motion.button
                            key={index}
                            onClick={() => handleExampleClick(example)}
                            disabled={isRunning}
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: "var(--space-2)",
                              padding: "var(--space-2) var(--space-3)",
                              background:
                                query === example.query
                                  ? "var(--brand-muted)"
                                  : "var(--bg-surface)",
                              border: `1px solid ${query === example.query ? "var(--brand-primary)" : "var(--border-subtle)"}`,
                              borderRadius: "var(--radius-sm)",
                              color:
                                query === example.query
                                  ? "var(--brand-light)"
                                  : "var(--text-secondary)",
                              fontSize: "var(--font-size-sm)",
                              cursor: isRunning ? "not-allowed" : "pointer",
                              opacity: isRunning ? 0.6 : 1,
                              transition: "all 0.15s ease",
                            }}
                          >
                            {example.icon}
                            <span
                              style={{
                                maxWidth: 200,
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                            >
                              {example.query.slice(0, 40)}
                              {example.query.length > 40 ? "..." : ""}
                            </span>
                          </motion.button>
                        ))}
                      </div>
                    </div>

                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "var(--space-3)",
                        paddingTop: "var(--space-2)",
                      }}
                    >
                      <motion.button
                        onClick={handleRun}
                        disabled={isRunning || !query.trim()}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                          padding: "var(--space-3) var(--space-5)",
                          background: isRunning
                            ? "var(--bg-surface)"
                            : "var(--brand-primary)",
                          border: `1px solid ${isRunning ? "var(--border-default)" : "var(--brand-primary)"}`,
                          borderRadius: "var(--radius-md)",
                          color: isRunning ? "var(--text-muted)" : "white",
                          fontSize: "var(--font-size-base)",
                          fontWeight: 600,
                          cursor:
                            isRunning || !query.trim()
                              ? "not-allowed"
                              : "pointer",
                          opacity: !query.trim() ? 0.5 : 1,
                          transition: "all 0.15s ease",
                          boxShadow: isRunning ? "none" : "var(--shadow-glow)",
                        }}
                      >
                        {isRunning ? (
                          <>
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{
                                duration: 1,
                                repeat: Infinity,
                                ease: "linear",
                              }}
                            >
                              <Brain size={18} />
                            </motion.div>
                            Running...
                          </>
                        ) : (
                          <>
                            <Play size={18} />
                            Run Execution
                          </>
                        )}
                      </motion.button>

                      {execution && (
                        <motion.button
                          onClick={handleReset}
                          disabled={isRunning}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "var(--space-2)",
                            padding: "var(--space-3) var(--space-4)",
                            background: "var(--bg-surface)",
                            border: "1px solid var(--border-default)",
                            borderRadius: "var(--radius-md)",
                            color: "var(--text-secondary)",
                            fontSize: "var(--font-size-sm)",
                            cursor: isRunning ? "not-allowed" : "pointer",
                            opacity: isRunning ? 0.5 : 1,
                            transition: "all 0.15s ease",
                          }}
                        >
                          <RotateCcw size={16} />
                          Reset
                        </motion.button>
                      )}
                    </div>
                  </div>
                </motion.section>

                {/* Execution Results */}
                <AnimatePresence mode="wait">
                  {execution ? (
                    <motion.section
                      key="execution"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -16 }}
                      transition={{ duration: 0.4, delay: 0.1 }}
                    >
                      <RLMViewer execution={execution} />
                    </motion.section>
                  ) : (
                    <motion.section
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "var(--space-12)",
                        background: "var(--bg-card)",
                        border: "1px dashed var(--border-default)",
                        borderRadius: "var(--radius-xl)",
                        textAlign: "center",
                      }}
                    >
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "var(--bg-surface)",
                          borderRadius: "var(--radius-lg)",
                          marginBottom: "var(--space-4)",
                        }}
                      >
                        <Brain
                          size={32}
                          style={{ color: "var(--text-muted)", opacity: 0.5 }}
                        />
                      </div>
                      <h3
                        style={{
                          fontSize: "var(--font-size-lg)",
                          fontWeight: 600,
                          color: "var(--text-secondary)",
                          marginBottom: "var(--space-2)",
                        }}
                      >
                        No Execution Yet
                      </h3>
                      <p
                        style={{
                          fontSize: "var(--font-size-sm)",
                          color: "var(--text-muted)",
                          maxWidth: 400,
                          lineHeight: 1.6,
                        }}
                      >
                        Enter a query above and click "Run Execution" to see the
                        RLM orchestration in action. Watch as the model
                        recursively decomposes problems and executes code.
                      </p>
                      <div
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: "var(--space-2)",
                          marginTop: "var(--space-4)",
                          color: "var(--brand-light)",
                          fontSize: "var(--font-size-sm)",
                        }}
                      >
                        <ChevronRight size={16} />
                        <span>Click "Run Execution" to start</span>
                      </div>
                    </motion.section>
                  )}
                </AnimatePresence>
              </motion.div>
            </AnimatePresence>
          )}

          {/* Info Cards */}
          <motion.section
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.2 }}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "var(--space-4)",
            }}
          >
            <InfoCard
              icon={<Brain size={20} />}
              title="Recursive Reasoning"
              description="The RLM can spawn nested queries to verify results, explore alternatives, and build comprehensive answers through multi-level reasoning."
              color="var(--brand-primary)"
            />
            <InfoCard
              icon={<Terminal size={20} />}
              title="Code Execution"
              description="Each iteration can generate and execute code in a sandboxed REPL environment, with results feeding back into the reasoning loop."
              color="var(--success)"
            />
            <InfoCard
              icon={<Zap size={20} />}
              title="Environment Agnostic"
              description="Execute in GitHub Actions, Azure Container Apps Sessions, or locally - the RLM adapts to your infrastructure seamlessly."
              color="var(--warning)"
            />
          </motion.section>
        </div>
      </main>
    </div>
  );
};

interface InfoCardProps {
  icon: React.ReactNode;
  title: string;
  description: string;
  color: string;
}

const InfoCard: React.FC<InfoCardProps> = ({
  icon,
  title,
  description,
  color,
}) => (
  <div
    style={{
      padding: "var(--space-5)",
      background: "var(--bg-card)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-lg)",
      transition: "all 0.2s ease",
    }}
  >
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-3)",
        marginBottom: "var(--space-3)",
      }}
    >
      <div
        style={{
          width: 36,
          height: 36,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: `${color}15`,
          borderRadius: "var(--radius-md)",
          color: color,
        }}
      >
        {icon}
      </div>
      <h3
        style={{
          fontSize: "var(--font-size-base)",
          fontWeight: 600,
          color: "var(--text-primary)",
          margin: 0,
        }}
      >
        {title}
      </h3>
    </div>
    <p
      style={{
        fontSize: "var(--font-size-sm)",
        color: "var(--text-muted)",
        lineHeight: 1.6,
        margin: 0,
      }}
    >
      {description}
    </p>
  </div>
);

export default RLMDemo;
