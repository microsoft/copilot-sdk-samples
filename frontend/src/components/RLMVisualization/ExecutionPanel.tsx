import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Terminal,
  Brain,
  CheckCircle2,
  XCircle,
  Clock,
  ChevronRight,
  Play,
} from "lucide-react";
import type { RLMIteration, REPLResult } from "../../hooks/useRLMExecution";

interface ExecutionPanelProps {
  iteration: RLMIteration | null;
  language: "python" | "nodejs";
}

type TabType = "code" | "sublm";

const ExecutionPanel: React.FC<ExecutionPanelProps> = ({
  iteration,
  language,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>("code");

  const tabs: Array<{ id: TabType; label: string; icon: React.ReactNode }> = [
    { id: "code", label: "Code Execution", icon: <Terminal size={14} /> },
    { id: "sublm", label: "Sub-LM Calls", icon: <Brain size={14} /> },
  ];

  const hasCode = iteration?.extractedCode || iteration?.replResult;
  const hasSubLM = iteration && iteration.nestedQueries.length > 0;

  if (!iteration) {
    return (
      <div
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-8)",
          color: "var(--text-muted)",
          textAlign: "center",
          background: "var(--bg-card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-default)",
        }}
      >
        <Terminal
          size={40}
          style={{ opacity: 0.3, marginBottom: "var(--space-3)" }}
        />
        <p style={{ fontSize: "var(--font-size-sm)" }}>
          Select an iteration to view execution details
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        flex: 1,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--bg-card)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-default)",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: "var(--space-1)",
          padding: "var(--space-2)",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
        }}
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const hasContent =
            (tab.id === "code" && hasCode) || (tab.id === "sublm" && hasSubLM);

          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-3)",
                background: isActive ? "var(--bg-elevated)" : "transparent",
                border: "none",
                borderRadius: "var(--radius-sm)",
                color: isActive ? "var(--text-primary)" : "var(--text-muted)",
                fontSize: "var(--font-size-sm)",
                fontWeight: isActive ? 500 : 400,
                cursor: "pointer",
                transition: "all 0.15s ease",
                opacity: hasContent ? 1 : 0.5,
              }}
            >
              {tab.icon}
              {tab.label}
              {hasContent && (
                <span
                  style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    background:
                      tab.id === "code"
                        ? "var(--success)"
                        : "var(--brand-light)",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "var(--space-4)",
        }}
      >
        <AnimatePresence mode="wait">
          {activeTab === "code" ? (
            <motion.div
              key="code"
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 8 }}
              transition={{ duration: 0.15 }}
            >
              <CodeExecutionTab
                extractedCode={iteration.extractedCode}
                replResult={iteration.replResult}
                language={language}
              />
            </motion.div>
          ) : (
            <motion.div
              key="sublm"
              initial={{ opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -8 }}
              transition={{ duration: 0.15 }}
            >
              <SubLMTab nestedQueries={iteration.nestedQueries} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

interface CodeExecutionTabProps {
  extractedCode?: string;
  replResult?: REPLResult;
  language: "python" | "nodejs";
}

const CodeExecutionTab: React.FC<CodeExecutionTabProps> = ({
  extractedCode,
  replResult,
  language,
}) => {
  if (!extractedCode && !replResult) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-8)",
          color: "var(--text-muted)",
          textAlign: "center",
        }}
      >
        <Terminal
          size={32}
          style={{ opacity: 0.3, marginBottom: "var(--space-2)" }}
        />
        <p style={{ fontSize: "var(--font-size-sm)" }}>
          No code execution in this iteration
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-4)",
      }}
    >
      {extractedCode && (
        <div
          style={{
            background: "var(--bg-page)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "var(--space-2) var(--space-3)",
              background: "var(--bg-surface)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
              }}
            >
              <Play size={12} style={{ color: "var(--text-muted)" }} />
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                }}
              >
                Executed Code
              </span>
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  padding: "2px 6px",
                  background:
                    language === "python"
                      ? "rgba(53, 114, 165, 0.2)"
                      : "rgba(247, 223, 30, 0.15)",
                  color: language === "python" ? "#5B9BD5" : "#F0DB4F",
                  borderRadius: "var(--radius-sm)",
                  fontWeight: 500,
                }}
              >
                {language === "python" ? "Python" : "JavaScript"}
              </span>
            </div>
          </div>

          <pre
            style={{
              margin: 0,
              padding: "var(--space-3)",
              fontSize: "12px",
              fontFamily: "var(--font-mono)",
              lineHeight: 1.6,
              color: "var(--text-secondary)",
              overflow: "auto",
              maxHeight: 200,
            }}
          >
            <code>{extractedCode}</code>
          </pre>
        </div>
      )}

      {replResult && (
        <div
          style={{
            background: "var(--bg-page)",
            border: "1px solid var(--border-default)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "var(--space-2) var(--space-3)",
              background: "var(--bg-surface)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
              }}
            >
              {replResult.success ? (
                <CheckCircle2 size={12} style={{ color: "var(--success)" }} />
              ) : (
                <XCircle size={12} style={{ color: "var(--error)" }} />
              )}
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--text-secondary)",
                  fontWeight: 500,
                }}
              >
                Result
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
              }}
            >
              <Clock size={10} style={{ color: "var(--text-muted)" }} />
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--text-muted)",
                }}
              >
                {replResult.durationMs}ms
              </span>
            </div>
          </div>

          <div style={{ padding: "var(--space-3)" }}>
            {replResult.stdout && (
              <div
                style={{
                  marginBottom: replResult.stderr ? "var(--space-3)" : 0,
                }}
              >
                <div
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--success)",
                    fontWeight: 600,
                    marginBottom: "var(--space-1)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  stdout
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: "var(--space-2)",
                    background: "rgba(34, 197, 94, 0.08)",
                    border: "1px solid rgba(34, 197, 94, 0.2)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "12px",
                    fontFamily: "var(--font-mono)",
                    lineHeight: 1.5,
                    color: "var(--success)",
                    overflow: "auto",
                    maxHeight: 160,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {replResult.stdout}
                </pre>
              </div>
            )}

            {replResult.stderr && (
              <div>
                <div
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--error)",
                    fontWeight: 600,
                    marginBottom: "var(--space-1)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  stderr
                </div>
                <pre
                  style={{
                    margin: 0,
                    padding: "var(--space-2)",
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "12px",
                    fontFamily: "var(--font-mono)",
                    lineHeight: 1.5,
                    color: "var(--error)",
                    overflow: "auto",
                    maxHeight: 160,
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}
                >
                  {replResult.stderr}
                </pre>
              </div>
            )}

            {replResult.returnValue !== undefined && (
              <div style={{ marginTop: "var(--space-3)" }}>
                <div
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--info)",
                    fontWeight: 600,
                    marginBottom: "var(--space-1)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Return Value
                </div>
                <div
                  style={{
                    padding: "var(--space-2)",
                    background: "rgba(59, 130, 246, 0.08)",
                    border: "1px solid rgba(59, 130, 246, 0.2)",
                    borderRadius: "var(--radius-sm)",
                    fontSize: "var(--font-size-sm)",
                    fontFamily: "var(--font-mono)",
                    color: "var(--info)",
                    fontWeight: 600,
                  }}
                >
                  {JSON.stringify(replResult.returnValue)}
                </div>
              </div>
            )}

            {replResult.error && (
              <div style={{ marginTop: "var(--space-3)" }}>
                <div
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--error)",
                    fontWeight: 600,
                    marginBottom: "var(--space-1)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                  }}
                >
                  Error
                </div>
                <div
                  style={{
                    padding: "var(--space-2)",
                    background: "rgba(239, 68, 68, 0.08)",
                    border: "1px solid rgba(239, 68, 68, 0.2)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <div
                    style={{
                      fontSize: "var(--font-size-sm)",
                      fontWeight: 600,
                      color: "var(--error)",
                      marginBottom: "var(--space-1)",
                    }}
                  >
                    {replResult.error.type}: {replResult.error.message}
                  </div>
                  {replResult.error.stack && (
                    <pre
                      style={{
                        margin: 0,
                        fontSize: "11px",
                        fontFamily: "var(--font-mono)",
                        color: "var(--text-muted)",
                        whiteSpace: "pre-wrap",
                        wordBreak: "break-word",
                      }}
                    >
                      {replResult.error.stack}
                    </pre>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

interface SubLMTabProps {
  nestedQueries: RLMIteration[];
}

const SubLMTab: React.FC<SubLMTabProps> = ({ nestedQueries }) => {
  if (nestedQueries.length === 0) {
    return (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "var(--space-8)",
          color: "var(--text-muted)",
          textAlign: "center",
        }}
      >
        <Brain
          size={32}
          style={{ opacity: 0.3, marginBottom: "var(--space-2)" }}
        />
        <p style={{ fontSize: "var(--font-size-sm)" }}>
          No nested LLM queries in this iteration
        </p>
      </div>
    );
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-3)",
      }}
    >
      {nestedQueries.map((query, index) => (
        <motion.div
          key={query.id}
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2, delay: index * 0.05 }}
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "var(--space-3)",
              background: "var(--brand-muted)",
              borderBottom: "1px solid var(--border-subtle)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
              }}
            >
              <Brain size={14} style={{ color: "var(--brand-light)" }} />
              <span
                style={{
                  fontSize: "var(--font-size-sm)",
                  fontWeight: 600,
                  color: "var(--brand-light)",
                }}
              >
                llm_query()
              </span>
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  padding: "2px 6px",
                  background: "var(--bg-surface)",
                  borderRadius: "var(--radius-sm)",
                  color: "var(--text-muted)",
                }}
              >
                Depth {query.depth}
              </span>
            </div>

            {query.completedAt && (
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "4px",
                  fontSize: "var(--font-size-xs)",
                  color: "var(--text-muted)",
                }}
              >
                <CheckCircle2 size={10} style={{ color: "var(--success)" }} />
                Completed
              </div>
            )}
          </div>

          <div style={{ padding: "var(--space-3)" }}>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "var(--space-2)",
                marginBottom: "var(--space-2)",
              }}
            >
              <ChevronRight
                size={12}
                style={{
                  color: "var(--text-muted)",
                  marginTop: 2,
                  flexShrink: 0,
                }}
              />
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--font-size-sm)",
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                }}
              >
                {query.input}
              </p>
            </div>

            {query.llmResponse && (
              <div
                style={{
                  padding: "var(--space-2)",
                  background: "var(--bg-page)",
                  borderRadius: "var(--radius-sm)",
                  border: "1px solid var(--border-subtle)",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--font-size-xs)",
                    color: "var(--text-muted)",
                    lineHeight: 1.5,
                    display: "-webkit-box",
                    WebkitLineClamp: 3,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                  }}
                >
                  {query.llmResponse.replace(/```[\s\S]*?```/g, "[code block]")}
                </p>
              </div>
            )}

            {query.replResult && (
              <div
                style={{
                  marginTop: "var(--space-2)",
                  padding: "var(--space-2)",
                  background: query.replResult.success
                    ? "rgba(34, 197, 94, 0.08)"
                    : "rgba(239, 68, 68, 0.08)",
                  borderRadius: "var(--radius-sm)",
                  border: `1px solid ${query.replResult.success ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-1)",
                    marginBottom: "var(--space-1)",
                  }}
                >
                  {query.replResult.success ? (
                    <CheckCircle2
                      size={10}
                      style={{ color: "var(--success)" }}
                    />
                  ) : (
                    <XCircle size={10} style={{ color: "var(--error)" }} />
                  )}
                  <span
                    style={{
                      fontSize: "var(--font-size-xs)",
                      fontWeight: 600,
                      color: query.replResult.success
                        ? "var(--success)"
                        : "var(--error)",
                    }}
                  >
                    {query.replResult.success ? "Success" : "Failed"}
                  </span>
                  <span
                    style={{
                      fontSize: "var(--font-size-xs)",
                      color: "var(--text-muted)",
                      marginLeft: "auto",
                    }}
                  >
                    {query.replResult.durationMs}ms
                  </span>
                </div>
                {query.replResult.stdout && (
                  <pre
                    style={{
                      margin: 0,
                      fontSize: "11px",
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-secondary)",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      maxHeight: 60,
                      overflow: "hidden",
                    }}
                  >
                    {query.replResult.stdout}
                  </pre>
                )}
              </div>
            )}
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default ExecutionPanel;
