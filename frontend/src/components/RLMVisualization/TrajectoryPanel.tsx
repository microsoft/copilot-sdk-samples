import React, { useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  FileText,
  Code2,
  Settings2,
} from "lucide-react";
import type { RLMIteration } from "../../hooks/useRLMExecution";
import { SYSTEM_PROMPT } from "../../data/rlmMockData";

interface TrajectoryPanelProps {
  iteration: RLMIteration | null;
}

const TrajectoryPanel: React.FC<TrajectoryPanelProps> = ({ iteration }) => {
  const [systemPromptExpanded, setSystemPromptExpanded] = useState(false);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const handleCopyCode = useCallback((code: string, id: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(id);
    setTimeout(() => setCopiedCode(null), 2000);
  }, []);

  const parseResponse = (
    response: string,
  ): Array<{ type: "text" | "code"; content: string; language?: string }> => {
    const parts: Array<{
      type: "text" | "code";
      content: string;
      language?: string;
    }> = [];
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    let lastIndex = 0;
    let match;

    while ((match = codeBlockRegex.exec(response)) !== null) {
      if (match.index > lastIndex) {
        const textContent = response.slice(lastIndex, match.index).trim();
        if (textContent) {
          parts.push({ type: "text", content: textContent });
        }
      }

      parts.push({
        type: "code",
        content: match[2].trim(),
        language: match[1] || "python",
      });

      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < response.length) {
      const textContent = response.slice(lastIndex).trim();
      if (textContent) {
        parts.push({ type: "text", content: textContent });
      }
    }

    return parts.length > 0 ? parts : [{ type: "text", content: response }];
  };

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
        }}
      >
        <FileText
          size={40}
          style={{ opacity: 0.3, marginBottom: "var(--space-3)" }}
        />
        <p style={{ fontSize: "var(--font-size-sm)" }}>
          Select an iteration from the timeline to view details
        </p>
      </div>
    );
  }

  const responseParts = parseResponse(iteration.llmResponse || "");

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
          padding: "var(--space-4)",
          borderBottom: "1px solid var(--border-subtle)",
          background: "var(--bg-surface)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
          }}
        >
          <FileText size={16} style={{ color: "var(--brand-light)" }} />
          <span
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: 600,
              color: "var(--text-primary)",
            }}
          >
            LLM Trajectory
          </span>
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              color: "var(--text-muted)",
              marginLeft: "var(--space-2)",
            }}
          >
            Iteration #{iteration.number}
            {iteration.depth > 0 && ` (Depth ${iteration.depth})`}
          </span>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "var(--space-4)",
          display: "flex",
          flexDirection: "column",
          gap: "var(--space-4)",
        }}
      >
        <div
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            overflow: "hidden",
          }}
        >
          <button
            onClick={() => setSystemPromptExpanded(!systemPromptExpanded)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-3)",
              background: "transparent",
              border: "none",
              cursor: "pointer",
              color: "var(--text-secondary)",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.background = "var(--bg-hover)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.background = "transparent")
            }
          >
            <Settings2 size={14} style={{ color: "var(--text-muted)" }} />
            <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 500 }}>
              System Prompt
            </span>
            <motion.div
              animate={{ rotate: systemPromptExpanded ? 180 : 0 }}
              transition={{ duration: 0.2 }}
              style={{ marginLeft: "auto" }}
            >
              <ChevronDown size={14} style={{ color: "var(--text-muted)" }} />
            </motion.div>
          </button>

          <AnimatePresence>
            {systemPromptExpanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2 }}
                style={{ overflow: "hidden" }}
              >
                <div
                  style={{
                    padding: "var(--space-3)",
                    paddingTop: 0,
                    borderTop: "1px solid var(--border-subtle)",
                  }}
                >
                  <pre
                    style={{
                      margin: 0,
                      padding: "var(--space-3)",
                      background: "var(--bg-page)",
                      borderRadius: "var(--radius-sm)",
                      fontSize: "var(--font-size-xs)",
                      fontFamily: "var(--font-mono)",
                      color: "var(--text-muted)",
                      lineHeight: 1.5,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                      maxHeight: 200,
                      overflow: "auto",
                    }}
                  >
                    {SYSTEM_PROMPT}
                  </pre>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {iteration.input && (
          <div
            style={{
              padding: "var(--space-3)",
              background: "var(--info-muted)",
              border: "1px solid rgba(59, 130, 246, 0.2)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                marginBottom: "var(--space-2)",
              }}
            >
              <ChevronRight size={12} style={{ color: "var(--info)" }} />
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  fontWeight: 600,
                  color: "var(--info)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                Input
              </span>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "var(--font-size-sm)",
                color: "var(--text-secondary)",
                lineHeight: 1.5,
              }}
            >
              {iteration.input}
            </p>
          </div>
        )}

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
          }}
        >
          {responseParts.map((part, index) => {
            if (part.type === "text") {
              return (
                <motion.div
                  key={`text-${index}`}
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  style={{
                    fontSize: "var(--font-size-sm)",
                    color: "var(--text-secondary)",
                    lineHeight: 1.7,
                  }}
                >
                  {part.content.split("\n").map((line, lineIdx) => (
                    <p
                      key={lineIdx}
                      style={{
                        margin: 0,
                        marginBottom:
                          lineIdx < part.content.split("\n").length - 1
                            ? "var(--space-2)"
                            : 0,
                      }}
                    >
                      {line || "\u00A0"}
                    </p>
                  ))}
                </motion.div>
              );
            }

            const codeId = `code-${iteration.id}-${index}`;
            const isCopied = copiedCode === codeId;

            return (
              <motion.div
                key={codeId}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
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
                    <Code2 size={12} style={{ color: "var(--text-muted)" }} />
                    <span
                      style={{
                        fontSize: "var(--font-size-xs)",
                        padding: "2px 6px",
                        background:
                          part.language === "python"
                            ? "rgba(53, 114, 165, 0.2)"
                            : "rgba(247, 223, 30, 0.15)",
                        color:
                          part.language === "python" ? "#5B9BD5" : "#F0DB4F",
                        borderRadius: "var(--radius-sm)",
                        fontWeight: 500,
                      }}
                    >
                      {part.language === "python" ? "Python" : "JavaScript"}
                    </span>
                  </div>

                  <button
                    onClick={() => handleCopyCode(part.content, codeId)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "4px",
                      padding: "4px 8px",
                      background: isCopied
                        ? "var(--success-muted)"
                        : "transparent",
                      border: "1px solid",
                      borderColor: isCopied
                        ? "var(--success)"
                        : "var(--border-subtle)",
                      borderRadius: "var(--radius-sm)",
                      color: isCopied ? "var(--success)" : "var(--text-muted)",
                      fontSize: "var(--font-size-xs)",
                      cursor: "pointer",
                      transition: "all 0.15s ease",
                    }}
                  >
                    {isCopied ? (
                      <>
                        <Check size={10} />
                        Copied
                      </>
                    ) : (
                      <>
                        <Copy size={10} />
                        Copy
                      </>
                    )}
                  </button>
                </div>

                <div
                  style={{
                    display: "flex",
                    overflow: "auto",
                    maxHeight: 280,
                  }}
                >
                  <div
                    style={{
                      padding: "var(--space-3)",
                      paddingRight: "var(--space-2)",
                      background: "rgba(0, 0, 0, 0.2)",
                      borderRight: "1px solid var(--border-subtle)",
                      userSelect: "none",
                      minWidth: 36,
                      textAlign: "right",
                    }}
                  >
                    {part.content.split("\n").map((_, lineIdx) => (
                      <div
                        key={lineIdx}
                        style={{
                          fontFamily: "var(--font-mono)",
                          fontSize: "12px",
                          lineHeight: "1.6",
                          color: "var(--text-disabled)",
                        }}
                      >
                        {lineIdx + 1}
                      </div>
                    ))}
                  </div>

                  <pre
                    style={{
                      flex: 1,
                      margin: 0,
                      padding: "var(--space-3)",
                      overflow: "auto",
                    }}
                  >
                    <code
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: "12px",
                        lineHeight: "1.6",
                        color: "var(--text-secondary)",
                        whiteSpace: "pre",
                      }}
                    >
                      {part.content}
                    </code>
                  </pre>
                </div>
              </motion.div>
            );
          })}
        </div>

        {iteration.isFinal && iteration.finalAnswer && (
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            style={{
              padding: "var(--space-4)",
              background:
                "linear-gradient(135deg, var(--success-muted), rgba(34, 197, 94, 0.05))",
              border: "1px solid rgba(34, 197, 94, 0.3)",
              borderRadius: "var(--radius-md)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                marginBottom: "var(--space-2)",
              }}
            >
              <div
                style={{
                  padding: "2px 8px",
                  background: "var(--success)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: "var(--font-size-xs)",
                  fontWeight: 700,
                  color: "white",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                }}
              >
                FINAL
              </div>
            </div>
            <p
              style={{
                margin: 0,
                fontSize: "var(--font-size-sm)",
                color: "var(--text-primary)",
                lineHeight: 1.6,
                fontWeight: 500,
              }}
            >
              {iteration.finalAnswer}
            </p>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default TrajectoryPanel;
