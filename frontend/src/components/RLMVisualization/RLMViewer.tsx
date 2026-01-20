import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
  Brain,
  Terminal,
  Cpu,
  CheckCircle2,
  AlertCircle,
  Loader2,
  MessageSquare,
  Sparkles,
} from "lucide-react";
import type { RLMExecution, RLMIteration } from "../../hooks/useRLMExecution";
import StatsCards from "./StatsCards";
import IterationTimeline from "./IterationTimeline";
import TrajectoryPanel from "./TrajectoryPanel";
import ExecutionPanel from "./ExecutionPanel";

interface RLMViewerProps {
  execution: RLMExecution;
}

const RLMViewer: React.FC<RLMViewerProps> = ({ execution }) => {
  const [selectedIteration, setSelectedIteration] =
    useState<RLMIteration | null>(
      execution.iterations.length > 0 ? execution.iterations[0] : null,
    );

  const stats = useMemo(() => {
    const flattenIterations = (iters: RLMIteration[]): RLMIteration[] => {
      const result: RLMIteration[] = [];
      for (const iter of iters) {
        result.push(iter);
        if (iter.nestedQueries.length > 0) {
          result.push(...flattenIterations(iter.nestedQueries));
        }
      }
      return result;
    };

    const allIterations = flattenIterations(execution.iterations);
    const codeExecutions = allIterations.filter(
      (i) => i.extractedCode || i.replResult,
    ).length;
    const subLMCalls = allIterations.filter((i) => i.depth > 0).length;

    let totalDurationMs = 0;
    if (execution.startedAt && execution.completedAt) {
      totalDurationMs =
        new Date(execution.completedAt).getTime() -
        new Date(execution.startedAt).getTime();
    }

    return {
      totalIterations: allIterations.length,
      codeExecutions,
      subLMCalls,
      totalDurationMs,
    };
  }, [execution]);

  const statusConfig = useMemo(() => {
    switch (execution.status) {
      case "completed":
        return {
          icon: <CheckCircle2 size={14} />,
          label: "Completed",
          color: "var(--success)",
          bgColor: "var(--success-muted)",
        };
      case "failed":
        return {
          icon: <AlertCircle size={14} />,
          label: "Failed",
          color: "var(--error)",
          bgColor: "var(--error-muted)",
        };
      case "running":
        return {
          icon: <Loader2 size={14} className="spin" />,
          label: "Running",
          color: "var(--warning)",
          bgColor: "var(--warning-muted)",
        };
      case "timeout":
        return {
          icon: <AlertCircle size={14} />,
          label: "Timeout",
          color: "var(--warning)",
          bgColor: "var(--warning-muted)",
        };
      default:
        return {
          icon: <Loader2 size={14} />,
          label: "Pending",
          color: "var(--text-muted)",
          bgColor: "var(--bg-surface)",
        };
    }
  }, [execution.status]);

  const environmentLabel = useMemo(() => {
    switch (execution.environmentType) {
      case "github-actions":
        return "GitHub Actions";
      case "aca-sessions":
        return "Azure Container Apps";
      default:
        return "Local";
    }
  }, [execution.environmentType]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "var(--space-5)",
      }}
    >
      <div
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
                }}
              >
                RLM Execution
              </h2>
              <p
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--text-muted)",
                  margin: 0,
                }}
              >
                {execution.id}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "var(--space-2)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-3)",
                background: statusConfig.bgColor,
                borderRadius: "var(--radius-sm)",
                color: statusConfig.color,
                fontSize: "var(--font-size-xs)",
                fontWeight: 600,
              }}
            >
              {statusConfig.icon}
              {statusConfig.label}
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-3)",
                background: "var(--bg-surface)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <Terminal size={12} style={{ color: "var(--text-muted)" }} />
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--text-secondary)",
                  fontFamily: "var(--font-mono)",
                }}
              >
                {execution.language === "python" ? "Python" : "Node.js"}
              </span>
            </div>

            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-2)",
                padding: "var(--space-2) var(--space-3)",
                background: "var(--bg-surface)",
                borderRadius: "var(--radius-sm)",
                border: "1px solid var(--border-subtle)",
              }}
            >
              <Cpu size={12} style={{ color: "var(--text-muted)" }} />
              <span
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--text-secondary)",
                }}
              >
                {environmentLabel}
              </span>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-3)",
            padding: "var(--space-4)",
            background: "var(--bg-surface)",
            borderRadius: "var(--radius-md)",
            border: "1px solid var(--border-subtle)",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "var(--space-3)",
            }}
          >
            <MessageSquare
              size={16}
              style={{
                color: "var(--info)",
                marginTop: 2,
                flexShrink: 0,
              }}
            />
            <div>
              <div
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "var(--space-1)",
                }}
              >
                Question
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--font-size-base)",
                  color: "var(--text-primary)",
                  fontWeight: 500,
                }}
              >
                {execution.query}
              </p>
            </div>
          </div>

          {execution.finalAnswer && (
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "var(--space-3)",
                paddingTop: "var(--space-3)",
                borderTop: "1px solid var(--border-subtle)",
              }}
            >
              <Sparkles
                size={16}
                style={{
                  color: "var(--success)",
                  marginTop: 2,
                  flexShrink: 0,
                }}
              />
              <div>
                <div
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    marginBottom: "var(--space-1)",
                  }}
                >
                  Answer
                </div>
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--font-size-base)",
                    color: "var(--success)",
                    fontWeight: 600,
                  }}
                >
                  {execution.finalAnswer}
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      <StatsCards
        totalIterations={stats.totalIterations}
        codeExecutions={stats.codeExecutions}
        subLMCalls={stats.subLMCalls}
        totalDurationMs={stats.totalDurationMs}
      />

      <div
        style={{
          background: "var(--bg-card)",
          border: "1px solid var(--border-default)",
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-4)",
        }}
      >
        <div
          style={{
            fontSize: "var(--font-size-sm)",
            fontWeight: 600,
            color: "var(--text-secondary)",
            marginBottom: "var(--space-3)",
          }}
        >
          Iteration Timeline
        </div>
        <IterationTimeline
          iterations={execution.iterations}
          selectedIterationId={selectedIteration?.id || null}
          onSelectIteration={setSelectedIteration}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--space-4)",
          minHeight: 450,
        }}
      >
        <TrajectoryPanel iteration={selectedIteration} />
        <ExecutionPanel
          iteration={selectedIteration}
          language={execution.language}
        />
      </div>
    </motion.div>
  );
};

export default RLMViewer;
