import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, XCircle } from "lucide-react";
import type { CriterionResult } from "./types";

interface CriteriaPanelProps {
  criteriaResults: CriterionResult[];
}

const CriteriaPanel: React.FC<CriteriaPanelProps> = ({ criteriaResults }) => {
  if (criteriaResults.length === 0) {
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
          background: "var(--bg-card)",
          borderRadius: "var(--radius-lg)",
          border: "1px solid var(--border-default)",
          height: "100%",
        }}
      >
        <CheckCircle2
          size={40}
          style={{ opacity: 0.3, marginBottom: "var(--space-3)" }}
        />
        <p style={{ fontSize: "var(--font-size-sm)" }}>
          No acceptance criteria to display
        </p>
      </div>
    );
  }

  const getTypeLabel = (type: CriterionResult["type"]): string => {
    switch (type) {
      case "code_compiles":
        return "Code Compiles";
      case "output_contains":
        return "Output Contains";
      case "test_passes":
        return "Test Passes";
      case "custom":
        return "Custom Check";
      default:
        return type;
    }
  };

  const getTypeColor = (type: CriterionResult["type"]): string => {
    switch (type) {
      case "code_compiles":
        return "#3b82f6";
      case "output_contains":
        return "#8b5cf6";
      case "test_passes":
        return "#22c55e";
      case "custom":
        return "#f59e0b";
      default:
        return "var(--text-muted)";
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        background: "var(--bg-card)",
        borderRadius: "var(--radius-lg)",
        border: "1px solid var(--border-default)",
        height: "100%",
      }}
    >
      <div
        style={{
          padding: "var(--space-3) var(--space-4)",
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
          <CheckCircle2 size={14} style={{ color: "var(--success)" }} />
          <span
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}
          >
            Acceptance Criteria
          </span>
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              padding: "2px 8px",
              background: "var(--bg-elevated)",
              borderRadius: "var(--radius-sm)",
              color: "var(--text-muted)",
            }}
          >
            {criteriaResults.filter((c) => c.passed).length}/
            {criteriaResults.length}
          </span>
        </div>
      </div>

      <div
        style={{
          flex: 1,
          overflow: "auto",
          padding: "var(--space-3)",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          {criteriaResults.map((criterion, index) => (
            <motion.div
              key={criterion.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "var(--space-3)",
                padding: "var(--space-3)",
                background: criterion.passed
                  ? "rgba(34, 197, 94, 0.06)"
                  : "rgba(239, 68, 68, 0.06)",
                border: `1px solid ${criterion.passed ? "rgba(34, 197, 94, 0.2)" : "rgba(239, 68, 68, 0.2)"}`,
                borderRadius: "var(--radius-md)",
              }}
            >
              <div
                style={{
                  width: 20,
                  height: 20,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                  marginTop: 1,
                }}
              >
                {criterion.passed ? (
                  <CheckCircle2 size={18} style={{ color: "var(--success)" }} />
                ) : (
                  <XCircle size={18} style={{ color: "var(--error)" }} />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "var(--space-2)",
                    marginBottom: "var(--space-1)",
                  }}
                >
                  <span
                    style={{
                      fontSize: "var(--font-size-xs)",
                      padding: "2px 6px",
                      background: `${getTypeColor(criterion.type)}20`,
                      color: getTypeColor(criterion.type),
                      borderRadius: "var(--radius-sm)",
                      fontWeight: 500,
                      textTransform: "uppercase",
                      letterSpacing: "0.3px",
                    }}
                  >
                    {getTypeLabel(criterion.type)}
                  </span>
                </div>

                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--font-size-sm)",
                    color: "var(--text-primary)",
                    fontWeight: 500,
                    marginBottom: "var(--space-1)",
                  }}
                >
                  {criterion.description}
                </p>

                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--font-size-xs)",
                    color: "var(--text-muted)",
                    lineHeight: 1.4,
                  }}
                >
                  {criterion.message}
                </p>

                {criterion.expected && (
                  <div
                    style={{
                      marginTop: "var(--space-2)",
                      padding: "var(--space-2)",
                      background: "var(--bg-page)",
                      borderRadius: "var(--radius-sm)",
                      border: "1px solid var(--border-subtle)",
                    }}
                  >
                    <span
                      style={{
                        fontSize: "var(--font-size-xs)",
                        color: "var(--text-muted)",
                        fontFamily: "var(--font-mono)",
                      }}
                    >
                      Expected: {criterion.expected}
                    </span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CriteriaPanel;
