import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ChevronDown,
  ChevronRight,
  MessageSquare,
  Code2,
  Terminal,
  CheckCircle2,
  Circle,
  Loader2,
  Flag,
  Clock,
  AlertCircle,
  GitBranch,
} from "lucide-react";
import CodeBlock from "./CodeBlock";

// RLM Types
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

interface IterationNodeProps {
  iteration: RLMIteration;
  isExpanded?: boolean;
  onToggle?: () => void;
  language: "python" | "nodejs";
  onIterationClick?: (iteration: RLMIteration) => void;
  isSelected?: boolean;
}

type SectionKey = "response" | "code" | "repl";

const IterationNode: React.FC<IterationNodeProps> = ({
  iteration,
  isExpanded: controlledExpanded,
  onToggle,
  language,
  onIterationClick,
  isSelected = false,
}) => {
  const [internalExpanded, setInternalExpanded] = useState(true);
  const [expandedSections, setExpandedSections] = useState<
    Record<SectionKey, boolean>
  >({
    response: false,
    code: true,
    repl: true,
  });

  const isExpanded = controlledExpanded ?? internalExpanded;

  const handleToggle = () => {
    if (onToggle) {
      onToggle();
    } else {
      setInternalExpanded(!internalExpanded);
    }
  };

  const toggleSection = (section: SectionKey) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }));
  };

  // Status indicator
  const getStatus = () => {
    if (iteration.isFinal) return "final";
    if (iteration.completedAt) return "completed";
    if (iteration.startedAt && !iteration.completedAt) return "running";
    return "pending";
  };

  const status = getStatus();

  const getStatusIcon = () => {
    switch (status) {
      case "final":
        return <Flag size={12} />;
      case "completed":
        return <CheckCircle2 size={12} />;
      case "running":
        return <Loader2 size={12} className="spin" />;
      default:
        return <Circle size={12} />;
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case "final":
        return "var(--brand-primary)";
      case "completed":
        return "var(--success)";
      case "running":
        return "var(--warning)";
      default:
        return "var(--text-disabled)";
    }
  };

  // Calculate duration
  const getDuration = () => {
    if (!iteration.startedAt || !iteration.completedAt) return null;
    const start = new Date(iteration.startedAt).getTime();
    const end = new Date(iteration.completedAt).getTime();
    const durationMs = end - start;
    if (durationMs < 1000) return `${durationMs}ms`;
    return `${(durationMs / 1000).toFixed(2)}s`;
  };

  const duration = getDuration();

  const hasNestedQueries = iteration.nestedQueries.length > 0;

  return (
    <motion.div
      className="rlm-iteration-node"
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.25, ease: [0.25, 0.46, 0.45, 0.94] }}
      style={{
        position: "relative",
        marginLeft: iteration.depth > 0 ? "24px" : 0,
      }}
    >
      {/* Connecting line for nested nodes */}
      {iteration.depth > 0 && (
        <div
          style={{
            position: "absolute",
            left: "-16px",
            top: 0,
            bottom: hasNestedQueries ? "50%" : 0,
            width: "1px",
            background:
              "linear-gradient(to bottom, var(--border-strong), var(--border-subtle))",
          }}
        />
      )}
      {iteration.depth > 0 && (
        <div
          style={{
            position: "absolute",
            left: "-16px",
            top: "20px",
            width: "16px",
            height: "1px",
            background: "var(--border-strong)",
          }}
        />
      )}

      {/* Node Card */}
      <motion.div
        style={{
          background: isSelected
            ? "linear-gradient(135deg, var(--bg-card), var(--brand-muted))"
            : "var(--bg-card)",
          border: "1px solid",
          borderColor: isSelected
            ? "var(--brand-primary)"
            : "var(--border-default)",
          borderRadius: "var(--radius-lg)",
          overflow: "hidden",
          marginBottom: "var(--space-3)",
          boxShadow: isSelected ? "var(--shadow-glow)" : "var(--shadow-sm)",
          transition: "all 0.2s ease",
        }}
        whileHover={{
          borderColor: isSelected
            ? "var(--brand-hover)"
            : "var(--border-strong)",
          boxShadow: isSelected ? "var(--shadow-glow)" : "var(--shadow-md)",
        }}
        onClick={() => onIterationClick?.(iteration)}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-3)",
            padding: "var(--space-3) var(--space-4)",
            background: "var(--bg-surface)",
            borderBottom: "1px solid var(--border-subtle)",
            cursor: "pointer",
          }}
          onClick={(e) => {
            e.stopPropagation();
            handleToggle();
          }}
        >
          {/* Expand/Collapse */}
          <motion.div
            animate={{ rotate: isExpanded ? 90 : 0 }}
            transition={{ duration: 0.15 }}
            style={{ color: "var(--text-muted)" }}
          >
            <ChevronRight size={16} />
          </motion.div>

          {/* Iteration Badge */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1)",
              padding: "2px 8px",
              background:
                iteration.depth === 0
                  ? "var(--brand-muted)"
                  : "var(--bg-elevated)",
              borderRadius: "var(--radius-sm)",
              border: "1px solid",
              borderColor:
                iteration.depth === 0
                  ? "rgba(109, 90, 205, 0.2)"
                  : "var(--border-subtle)",
            }}
          >
            {iteration.depth > 0 && (
              <GitBranch
                size={10}
                style={{ color: "var(--text-muted)", marginRight: "2px" }}
              />
            )}
            <span
              style={{
                fontSize: "var(--font-size-xs)",
                fontWeight: 600,
                color:
                  iteration.depth === 0
                    ? "var(--brand-light)"
                    : "var(--text-secondary)",
              }}
            >
              #{iteration.number}
            </span>
            {iteration.depth > 0 && (
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--text-disabled)",
                }}
              >
                D{iteration.depth}
              </span>
            )}
          </div>

          {/* Status */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-1)",
              color: getStatusColor(),
            }}
          >
            {getStatusIcon()}
            <span
              style={{
                fontSize: "var(--font-size-xs)",
                fontWeight: 500,
                textTransform: "capitalize",
              }}
            >
              {status}
            </span>
          </div>

          {/* Duration */}
          {duration && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-1)",
                color: "var(--text-muted)",
                marginLeft: "auto",
              }}
            >
              <Clock size={12} />
              <span style={{ fontSize: "var(--font-size-xs)" }}>
                {duration}
              </span>
            </div>
          )}

          {/* Final Answer indicator */}
          {iteration.isFinal && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-1)",
                padding: "2px 8px",
                background: "var(--brand-muted)",
                border: "1px solid var(--brand-primary)",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <Flag size={10} style={{ color: "var(--brand-light)" }} />
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  fontWeight: 600,
                  color: "var(--brand-light)",
                }}
              >
                Final
              </span>
            </div>
          )}
        </div>

        {/* Expandable Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              style={{ overflow: "hidden" }}
            >
              <div style={{ padding: "var(--space-4)" }}>
                {/* Input Query */}
                {iteration.input && (
                  <div style={{ marginBottom: "var(--space-4)" }}>
                    <div
                      style={{
                        fontSize: "var(--font-size-xs)",
                        fontWeight: 600,
                        color: "var(--text-muted)",
                        textTransform: "uppercase",
                        letterSpacing: "0.5px",
                        marginBottom: "var(--space-2)",
                      }}
                    >
                      Input Query
                    </div>
                    <div
                      style={{
                        fontSize: "var(--font-size-sm)",
                        color: "var(--text-secondary)",
                        background: "var(--bg-surface)",
                        padding: "var(--space-3)",
                        borderRadius: "var(--radius-sm)",
                        border: "1px solid var(--border-subtle)",
                        lineHeight: 1.5,
                      }}
                    >
                      {iteration.input}
                    </div>
                  </div>
                )}

                {/* LLM Response Section */}
                <CollapsibleSection
                  title="LLM Response"
                  icon={<MessageSquare size={14} />}
                  isExpanded={expandedSections.response}
                  onToggle={() => toggleSection("response")}
                >
                  <div
                    style={{
                      fontSize: "var(--font-size-sm)",
                      color: "var(--text-secondary)",
                      lineHeight: 1.6,
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-word",
                    }}
                  >
                    {iteration.llmResponse || (
                      <span style={{ color: "var(--text-disabled)" }}>
                        Waiting for response...
                      </span>
                    )}
                  </div>
                </CollapsibleSection>

                {/* Extracted Code Section */}
                {iteration.extractedCode && (
                  <CollapsibleSection
                    title="Extracted Code"
                    icon={<Code2 size={14} />}
                    isExpanded={expandedSections.code}
                    onToggle={() => toggleSection("code")}
                  >
                    <CodeBlock
                      code={iteration.extractedCode}
                      language={language}
                    />
                  </CollapsibleSection>
                )}

                {/* REPL Result Section */}
                {iteration.replResult && (
                  <CollapsibleSection
                    title="REPL Output"
                    icon={<Terminal size={14} />}
                    isExpanded={expandedSections.repl}
                    onToggle={() => toggleSection("repl")}
                    status={iteration.replResult.success ? "success" : "error"}
                  >
                    <REPLOutput result={iteration.replResult} />
                  </CollapsibleSection>
                )}

                {/* Final Answer */}
                {iteration.isFinal && iteration.finalAnswer && (
                  <div
                    style={{
                      marginTop: "var(--space-4)",
                      padding: "var(--space-4)",
                      background:
                        "linear-gradient(135deg, var(--brand-muted), rgba(109, 90, 205, 0.04))",
                      border: "1px solid rgba(109, 90, 205, 0.2)",
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
                      <Flag size={14} style={{ color: "var(--brand-light)" }} />
                      <span
                        style={{
                          fontSize: "var(--font-size-sm)",
                          fontWeight: 600,
                          color: "var(--brand-light)",
                        }}
                      >
                        Final Answer
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "var(--font-size-base)",
                        color: "var(--text-primary)",
                        lineHeight: 1.6,
                      }}
                    >
                      {iteration.finalAnswer}
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Nested Iterations */}
      <AnimatePresence>
        {isExpanded && hasNestedQueries && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, delay: 0.1 }}
          >
            {iteration.nestedQueries.map((nested) => (
              <IterationNode
                key={nested.id}
                iteration={nested}
                language={language}
                onIterationClick={onIterationClick}
              />
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

// Collapsible Section Component
interface CollapsibleSectionProps {
  title: string;
  icon: React.ReactNode;
  isExpanded: boolean;
  onToggle: () => void;
  status?: "success" | "error";
  children: React.ReactNode;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon,
  isExpanded,
  onToggle,
  status,
  children,
}) => (
  <div
    style={{
      marginBottom: "var(--space-3)",
      background: "var(--bg-surface)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-md)",
      overflow: "hidden",
    }}
  >
    <button
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
      style={{
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "var(--space-2) var(--space-3)",
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: "var(--text-secondary)",
        transition: "background 0.15s ease",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = "var(--bg-hover)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = "transparent";
      }}
    >
      <span style={{ color: "var(--text-muted)" }}>{icon}</span>
      <span
        style={{
          fontSize: "var(--font-size-sm)",
          fontWeight: 500,
          flex: 1,
          textAlign: "left",
        }}
      >
        {title}
      </span>
      {status && (
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-1)",
            fontSize: "var(--font-size-xs)",
            color: status === "success" ? "var(--success)" : "var(--error)",
          }}
        >
          {status === "success" ? (
            <CheckCircle2 size={12} />
          ) : (
            <AlertCircle size={12} />
          )}
          {status === "success" ? "Success" : "Error"}
        </span>
      )}
      <motion.div
        animate={{ rotate: isExpanded ? 180 : 0 }}
        transition={{ duration: 0.15 }}
        style={{ color: "var(--text-muted)" }}
      >
        <ChevronDown size={14} />
      </motion.div>
    </button>
    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.15 }}
          style={{ overflow: "hidden" }}
        >
          <div
            style={{
              padding: "var(--space-3)",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            {children}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

// REPL Output Component
interface REPLOutputProps {
  result: REPLResult;
}

const REPLOutput: React.FC<REPLOutputProps> = ({ result }) => (
  <div
    style={{
      fontFamily: "var(--font-mono)",
      fontSize: "13px",
      lineHeight: 1.6,
    }}
  >
    {result.stdout && (
      <div style={{ marginBottom: "var(--space-2)" }}>
        <div
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--text-muted)",
            marginBottom: "var(--space-1)",
          }}
        >
          stdout:
        </div>
        <pre
          style={{
            margin: 0,
            padding: "var(--space-2)",
            background: "var(--bg-page)",
            borderRadius: "var(--radius-sm)",
            color: "var(--text-secondary)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {result.stdout}
        </pre>
      </div>
    )}
    {result.stderr && (
      <div style={{ marginBottom: "var(--space-2)" }}>
        <div
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--error)",
            marginBottom: "var(--space-1)",
          }}
        >
          stderr:
        </div>
        <pre
          style={{
            margin: 0,
            padding: "var(--space-2)",
            background: "var(--error-muted)",
            borderRadius: "var(--radius-sm)",
            color: "var(--error)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {result.stderr}
        </pre>
      </div>
    )}
    {result.returnValue !== undefined && (
      <div style={{ marginBottom: "var(--space-2)" }}>
        <div
          style={{
            fontSize: "var(--font-size-xs)",
            color: "var(--success)",
            marginBottom: "var(--space-1)",
          }}
        >
          Return Value:
        </div>
        <pre
          style={{
            margin: 0,
            padding: "var(--space-2)",
            background: "var(--success-muted)",
            borderRadius: "var(--radius-sm)",
            color: "var(--success)",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        >
          {typeof result.returnValue === "object"
            ? JSON.stringify(result.returnValue, null, 2)
            : String(result.returnValue)}
        </pre>
      </div>
    )}
    {result.error && (
      <div
        style={{
          padding: "var(--space-3)",
          background: "var(--error-muted)",
          border: "1px solid var(--error)",
          borderRadius: "var(--radius-sm)",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-2)",
            marginBottom: "var(--space-2)",
            color: "var(--error)",
          }}
        >
          <AlertCircle size={14} />
          <span style={{ fontWeight: 600 }}>{result.error.type}</span>
          {result.error.line && (
            <span style={{ fontSize: "var(--font-size-xs)" }}>
              Line {result.error.line}
            </span>
          )}
        </div>
        <div style={{ color: "var(--error)", marginBottom: "var(--space-2)" }}>
          {result.error.message}
        </div>
        {result.error.stack && (
          <pre
            style={{
              margin: 0,
              fontSize: "var(--font-size-xs)",
              color: "rgba(239, 68, 68, 0.8)",
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
            }}
          >
            {result.error.stack}
          </pre>
        )}
      </div>
    )}
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        marginTop: "var(--space-2)",
        fontSize: "var(--font-size-xs)",
        color: "var(--text-muted)",
      }}
    >
      <Clock size={10} />
      <span>Executed in {result.durationMs}ms</span>
    </div>
  </div>
);

export default IterationNode;
