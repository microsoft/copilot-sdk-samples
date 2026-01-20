import React, { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import {
  Flag,
  AlertCircle,
  Loader2,
  Code2,
  Brain,
  Clock,
  Hash,
} from "lucide-react";
import type { RLMIteration } from "../../hooks/useRLMExecution";

interface IterationTimelineProps {
  iterations: RLMIteration[];
  selectedIterationId: string | null;
  onSelectIteration: (iteration: RLMIteration) => void;
}

const IterationTimeline: React.FC<IterationTimelineProps> = ({
  iterations,
  selectedIterationId,
  onSelectIteration,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectedRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (selectedRef.current && scrollRef.current) {
      selectedRef.current.scrollIntoView({
        behavior: "smooth",
        block: "nearest",
        inline: "center",
      });
    }
  }, [selectedIterationId]);

  const flattenIterations = (
    iters: RLMIteration[],
    depth = 0,
  ): Array<RLMIteration & { _depth: number }> => {
    const result: Array<RLMIteration & { _depth: number }> = [];
    for (const iter of iters) {
      result.push({ ...iter, _depth: depth });
      if (iter.nestedQueries.length > 0) {
        result.push(...flattenIterations(iter.nestedQueries, depth + 1));
      }
    }
    return result;
  };

  const allIterations = flattenIterations(iterations);

  const getStatusConfig = (iteration: RLMIteration) => {
    if (iteration.isFinal) {
      return {
        color: "var(--success)",
        bgColor: "var(--success-muted)",
        icon: <Flag size={10} />,
        label: "FINAL",
      };
    }
    if (iteration.replResult && !iteration.replResult.success) {
      return {
        color: "var(--error)",
        bgColor: "var(--error-muted)",
        icon: <AlertCircle size={10} />,
        label: "ERR",
      };
    }
    if (!iteration.completedAt) {
      return {
        color: "var(--warning)",
        bgColor: "var(--warning-muted)",
        icon: <Loader2 size={10} className="spin" />,
        label: "RUN",
      };
    }
    return null;
  };

  const getCodeCount = (iteration: RLMIteration): number => {
    return iteration.extractedCode ? 1 : 0;
  };

  const getSubLMCount = (iteration: RLMIteration): number => {
    return iteration.nestedQueries.length;
  };

  const getDuration = (iteration: RLMIteration): string | null => {
    if (!iteration.startedAt || !iteration.completedAt) return null;
    const start = new Date(iteration.startedAt).getTime();
    const end = new Date(iteration.completedAt).getTime();
    const ms = end - start;
    if (ms < 1000) return `${ms}ms`;
    return `${(ms / 1000).toFixed(1)}s`;
  };

  const getPreviewText = (iteration: RLMIteration): string => {
    const text = iteration.llmResponse || iteration.input || "";
    const cleaned = text.replace(/```[\s\S]*?```/g, "[code]").trim();
    return cleaned.length > 60 ? cleaned.substring(0, 60) + "..." : cleaned;
  };

  if (allIterations.length === 0) {
    return (
      <div
        style={{
          padding: "var(--space-6)",
          textAlign: "center",
          color: "var(--text-muted)",
          fontSize: "var(--font-size-sm)",
        }}
      >
        No iterations yet
      </div>
    );
  }

  return (
    <div
      ref={scrollRef}
      style={{
        display: "flex",
        gap: "var(--space-3)",
        overflowX: "auto",
        padding: "var(--space-2) var(--space-1)",
        scrollBehavior: "smooth",
      }}
    >
      {allIterations.map((iteration, index) => {
        const isSelected = selectedIterationId === iteration.id;
        const statusConfig = getStatusConfig(iteration);
        const codeCount = getCodeCount(iteration);
        const subLMCount = getSubLMCount(iteration);
        const duration = getDuration(iteration);
        const preview = getPreviewText(iteration);

        return (
          <motion.div
            key={iteration.id}
            ref={isSelected ? selectedRef : undefined}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.2, delay: index * 0.03 }}
            onClick={() => onSelectIteration(iteration)}
            style={{
              minWidth: 280,
              maxWidth: 320,
              flexShrink: 0,
              padding: "var(--space-3)",
              background: isSelected
                ? "linear-gradient(135deg, var(--bg-elevated), rgba(109, 90, 205, 0.06))"
                : "var(--bg-surface)",
              border: "1px solid",
              borderColor: isSelected
                ? "var(--brand-primary)"
                : "var(--border-subtle)",
              borderRadius: "var(--radius-md)",
              cursor: "pointer",
              transition: "all 0.15s ease",
              boxShadow: isSelected
                ? "0 0 20px rgba(109, 90, 205, 0.12)"
                : "none",
            }}
            whileHover={{
              borderColor: isSelected
                ? "var(--brand-hover)"
                : "var(--border-default)",
              background: isSelected
                ? "linear-gradient(135deg, var(--bg-elevated), rgba(109, 90, 205, 0.08))"
                : "var(--bg-elevated)",
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                marginBottom: "var(--space-2)",
              }}
            >
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
                    gap: "var(--space-1)",
                    padding: "2px 6px",
                    background:
                      iteration._depth > 0
                        ? "var(--bg-hover)"
                        : "var(--brand-muted)",
                    borderRadius: "var(--radius-sm)",
                  }}
                >
                  <Hash
                    size={10}
                    style={{
                      color:
                        iteration._depth > 0
                          ? "var(--text-muted)"
                          : "var(--brand-light)",
                    }}
                  />
                  <span
                    style={{
                      fontSize: "var(--font-size-xs)",
                      fontWeight: 600,
                      color:
                        iteration._depth > 0
                          ? "var(--text-secondary)"
                          : "var(--brand-light)",
                    }}
                  >
                    {iteration.number}
                  </span>
                  {iteration._depth > 0 && (
                    <span
                      style={{
                        fontSize: "10px",
                        color: "var(--text-disabled)",
                      }}
                    >
                      D{iteration._depth}
                    </span>
                  )}
                </div>

                {statusConfig && (
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "2px",
                      padding: "2px 5px",
                      background: statusConfig.bgColor,
                      borderRadius: "var(--radius-sm)",
                      color: statusConfig.color,
                    }}
                  >
                    {statusConfig.icon}
                    <span style={{ fontSize: "9px", fontWeight: 600 }}>
                      {statusConfig.label}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "var(--space-2)",
                marginBottom: "var(--space-2)",
              }}
            >
              {codeCount > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    fontSize: "10px",
                    color: "var(--text-muted)",
                  }}
                >
                  <Code2 size={10} />
                  <span>{codeCount}</span>
                </div>
              )}
              {subLMCount > 0 && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    fontSize: "10px",
                    color: "var(--text-muted)",
                  }}
                >
                  <Brain size={10} />
                  <span>{subLMCount}</span>
                </div>
              )}
              {duration && (
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "3px",
                    fontSize: "10px",
                    color: "var(--text-muted)",
                  }}
                >
                  <Clock size={10} />
                  <span>{duration}</span>
                </div>
              )}
            </div>

            <div
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--text-secondary)",
                lineHeight: 1.4,
                overflow: "hidden",
                textOverflow: "ellipsis",
                display: "-webkit-box",
                WebkitLineClamp: 2,
                WebkitBoxOrient: "vertical",
              }}
            >
              {preview}
            </div>
          </motion.div>
        );
      })}
    </div>
  );
};

export default IterationTimeline;
