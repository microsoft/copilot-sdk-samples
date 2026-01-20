import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Brain,
  Clock,
  Activity,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Timer,
  Layers,
  Terminal,
  Cpu,
  Cloud,
  Server,
} from "lucide-react";
import IterationNode from "./IterationNode";

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

interface RLMTreeProps {
  execution: RLMExecution;
  onIterationClick?: (iteration: RLMIteration) => void;
}

const RLMTree: React.FC<RLMTreeProps> = ({ execution, onIterationClick }) => {
  const [selectedIterationId, setSelectedIterationId] = useState<string | null>(
    null,
  );

  const handleIterationClick = (iteration: RLMIteration) => {
    setSelectedIterationId(iteration.id);
    onIterationClick?.(iteration);
  };

  const getStatusConfig = () => {
    switch (execution.status) {
      case "pending":
        return {
          color: "var(--text-muted)",
          bg: "var(--bg-surface)",
          icon: <Clock size={14} />,
          label: "Pending",
        };
      case "running":
        return {
          color: "var(--warning)",
          bg: "var(--warning-muted)",
          icon: <Loader2 size={14} className="spin" />,
          label: "Running",
        };
      case "completed":
        return {
          color: "var(--success)",
          bg: "var(--success-muted)",
          icon: <CheckCircle2 size={14} />,
          label: "Completed",
        };
      case "failed":
        return {
          color: "var(--error)",
          bg: "var(--error-muted)",
          icon: <AlertCircle size={14} />,
          label: "Failed",
        };
      case "timeout":
        return {
          color: "var(--warning)",
          bg: "var(--warning-muted)",
          icon: <Timer size={14} />,
          label: "Timeout",
        };
      default:
        return {
          color: "var(--text-muted)",
          bg: "var(--bg-surface)",
          icon: <Activity size={14} />,
          label: "Unknown",
        };
    }
  };

  const getEnvironmentConfig = () => {
    switch (execution.environmentType) {
      case "github-actions":
        return {
          icon: <Cloud size={12} />,
          label: "GitHub Actions",
          color: "var(--text-link)",
        };
      case "aca-sessions":
        return {
          icon: <Server size={12} />,
          label: "ACA Sessions",
          color: "var(--info)",
        };
      case "local":
        return {
          icon: <Terminal size={12} />,
          label: "Local",
          color: "var(--text-secondary)",
        };
    }
  };

  const statusConfig = getStatusConfig();
  const envConfig = getEnvironmentConfig();

  // Calculate total duration
  const getDuration = () => {
    if (!execution.startedAt) return null;
    const start = new Date(execution.startedAt).getTime();
    const end = execution.completedAt
      ? new Date(execution.completedAt).getTime()
      : Date.now();
    const durationMs = end - start;
    if (durationMs < 1000) return `${durationMs}ms`;
    if (durationMs < 60000) return `${(durationMs / 1000).toFixed(1)}s`;
    return `${Math.floor(durationMs / 60000)}m ${Math.floor((durationMs % 60000) / 1000)}s`;
  };

  return (
    <motion.div
      className="rlm-tree"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      style={{
        background: "var(--bg-card)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-xl)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
      <div
        style={{
          padding: "var(--space-5)",
          borderBottom: "1px solid var(--border-subtle)",
          background:
            "linear-gradient(to bottom, var(--bg-elevated), var(--bg-card))",
        }}
      >
        {/* Top Row: Title and Status */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            marginBottom: "var(--space-4)",
          }}
        >
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
              <h2
                style={{
                  fontSize: "var(--font-size-lg)",
                  fontWeight: 600,
                  color: "var(--text-primary)",
                  margin: 0,
                  marginBottom: "var(--space-1)",
                }}
              >
                RLM Execution
              </h2>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                  fontSize: "var(--font-size-xs)",
                  color: "var(--text-muted)",
                }}
              >
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    letterSpacing: "-0.5px",
                  }}
                >
                  {execution.id.slice(0, 8)}...
                </span>
              </div>
            </div>
          </div>

          {/* Status Badge */}
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
              padding: "var(--space-2) var(--space-3)",
              background: statusConfig.bg,
              border: `1px solid ${statusConfig.color}`,
              borderRadius: "var(--radius-md)",
              color: statusConfig.color,
            }}
          >
            {statusConfig.icon}
            <span style={{ fontSize: "var(--font-size-sm)", fontWeight: 600 }}>
              {statusConfig.label}
            </span>
          </motion.div>
        </div>

        {/* Query Display */}
        <div
          style={{
            padding: "var(--space-4)",
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            marginBottom: "var(--space-4)",
          }}
        >
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
            Query
          </div>
          <div
            style={{
              fontSize: "var(--font-size-base)",
              color: "var(--text-primary)",
              lineHeight: 1.5,
            }}
          >
            {execution.query}
          </div>
          {execution.context && (
            <>
              <div
                style={{
                  fontSize: "var(--font-size-xs)",
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginTop: "var(--space-3)",
                  marginBottom: "var(--space-2)",
                }}
              >
                Context
              </div>
              <div
                style={{
                  fontSize: "var(--font-size-sm)",
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                }}
              >
                {execution.context}
              </div>
            </>
          )}
        </div>

        {/* Stats Row */}
        <div
          style={{
            display: "flex",
            flexWrap: "wrap",
            gap: "var(--space-3)",
          }}
        >
          {/* Environment */}
          <StatBadge
            icon={envConfig.icon}
            label="Environment"
            value={envConfig.label}
            valueColor={envConfig.color}
          />

          {/* Language */}
          <StatBadge
            icon={<Cpu size={12} />}
            label="Language"
            value={execution.language === "python" ? "Python" : "Node.js"}
            valueColor={execution.language === "python" ? "#5B9BD5" : "#F0DB4F"}
          />

          {/* Duration */}
          {getDuration() && (
            <StatBadge
              icon={<Clock size={12} />}
              label="Duration"
              value={getDuration()!}
            />
          )}

          {/* Iterations */}
          <StatBadge
            icon={<Layers size={12} />}
            label="Iterations"
            value={`${execution.iterations.length} / ${execution.maxIterations}`}
          />

          {/* Depth */}
          <StatBadge
            icon={<Activity size={12} />}
            label="Depth"
            value={`${execution.currentDepth} / ${execution.maxDepth}`}
          />

          {/* LLM Calls */}
          <StatBadge
            icon={<Brain size={12} />}
            label="LLM Calls"
            value={execution.totalLLMCalls.toString()}
          />

          {/* Code Executions */}
          <StatBadge
            icon={<Terminal size={12} />}
            label="Code Runs"
            value={execution.totalCodeExecutions.toString()}
          />
        </div>
      </div>

      {/* Iterations Tree */}
      <div style={{ padding: "var(--space-5)" }}>
        {execution.iterations.length === 0 ? (
          <EmptyState status={execution.status} />
        ) : (
          <div>
            <div
              style={{
                fontSize: "var(--font-size-xs)",
                fontWeight: 600,
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "var(--space-4)",
              }}
            >
              Execution Tree
            </div>
            <AnimatePresence mode="popLayout">
              {execution.iterations.map((iteration, index) => (
                <motion.div
                  key={iteration.id}
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{
                    duration: 0.3,
                    delay: index * 0.08,
                    ease: [0.25, 0.46, 0.45, 0.94],
                  }}
                >
                  <IterationNode
                    iteration={iteration}
                    language={execution.language}
                    onIterationClick={handleIterationClick}
                    isSelected={selectedIterationId === iteration.id}
                  />
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        )}

        {/* Final Answer */}
        {execution.finalAnswer && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: 0.2 }}
            style={{
              marginTop: "var(--space-5)",
              padding: "var(--space-5)",
              background:
                "linear-gradient(135deg, var(--brand-muted), rgba(109, 90, 205, 0.04))",
              border: "1px solid rgba(109, 90, 205, 0.25)",
              borderRadius: "var(--radius-lg)",
              boxShadow: "var(--shadow-glow)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                marginBottom: "var(--space-3)",
              }}
            >
              <CheckCircle2 size={18} style={{ color: "var(--brand-light)" }} />
              <span
                style={{
                  fontSize: "var(--font-size-base)",
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
              {execution.finalAnswer}
            </div>
          </motion.div>
        )}

        {/* Error Display */}
        {execution.error && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
              marginTop: "var(--space-5)",
              padding: "var(--space-4)",
              background: "var(--error-muted)",
              border: "1px solid var(--error)",
              borderRadius: "var(--radius-md)",
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
              <AlertCircle size={16} />
              <span
                style={{ fontSize: "var(--font-size-sm)", fontWeight: 600 }}
              >
                Execution Error
              </span>
            </div>
            <div
              style={{
                fontSize: "var(--font-size-sm)",
                color: "var(--error)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {execution.error}
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// Stat Badge Component
interface StatBadgeProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}

const StatBadge: React.FC<StatBadgeProps> = ({
  icon,
  label,
  value,
  valueColor,
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      gap: "var(--space-2)",
      padding: "var(--space-2) var(--space-3)",
      background: "var(--bg-surface)",
      border: "1px solid var(--border-subtle)",
      borderRadius: "var(--radius-sm)",
    }}
  >
    <span style={{ color: "var(--text-muted)" }}>{icon}</span>
    <span
      style={{
        fontSize: "var(--font-size-xs)",
        color: "var(--text-muted)",
      }}
    >
      {label}:
    </span>
    <span
      style={{
        fontSize: "var(--font-size-sm)",
        fontWeight: 600,
        color: valueColor || "var(--text-secondary)",
      }}
    >
      {value}
    </span>
  </div>
);

// Empty State Component
interface EmptyStateProps {
  status: RLMExecution["status"];
}

const EmptyState: React.FC<EmptyStateProps> = ({ status }) => (
  <div
    style={{
      display: "flex",
      flexDirection: "column",
      alignItems: "center",
      justifyContent: "center",
      padding: "var(--space-10)",
      textAlign: "center",
      color: "var(--text-muted)",
    }}
  >
    {status === "pending" && (
      <>
        <Clock
          size={40}
          style={{ opacity: 0.4, marginBottom: "var(--space-4)" }}
        />
        <div
          style={{
            fontSize: "var(--font-size-base)",
            fontWeight: 500,
            color: "var(--text-secondary)",
            marginBottom: "var(--space-2)",
          }}
        >
          Waiting to Start
        </div>
        <div style={{ fontSize: "var(--font-size-sm)" }}>
          The execution has not yet begun.
        </div>
      </>
    )}
    {status === "running" && (
      <>
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "linear" }}
        >
          <Loader2
            size={40}
            style={{ opacity: 0.6, marginBottom: "var(--space-4)" }}
          />
        </motion.div>
        <div
          style={{
            fontSize: "var(--font-size-base)",
            fontWeight: 500,
            color: "var(--text-secondary)",
            marginBottom: "var(--space-2)",
          }}
        >
          Initializing...
        </div>
        <div style={{ fontSize: "var(--font-size-sm)" }}>
          Iterations will appear as they are processed.
        </div>
      </>
    )}
    {(status === "completed" ||
      status === "failed" ||
      status === "timeout") && (
      <>
        <Brain
          size={40}
          style={{ opacity: 0.3, marginBottom: "var(--space-4)" }}
        />
        <div
          style={{
            fontSize: "var(--font-size-base)",
            fontWeight: 500,
            color: "var(--text-secondary)",
            marginBottom: "var(--space-2)",
          }}
        >
          No Iterations
        </div>
        <div style={{ fontSize: "var(--font-size-sm)" }}>
          The execution completed without any recorded iterations.
        </div>
      </>
    )}
  </div>
);

export default RLMTree;
