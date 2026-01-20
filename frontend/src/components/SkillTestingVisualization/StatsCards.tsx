import React from "react";
import { motion } from "framer-motion";
import { FileCheck2, CheckCircle2, XCircle, Clock } from "lucide-react";

interface StatsCardsProps {
  totalTests: number;
  passed: number;
  failed: number;
  totalCriteria: number;
  criteriaPassed: number;
  durationMs: number;
}

const StatsCards: React.FC<StatsCardsProps> = ({
  totalTests,
  passed,
  failed: _failed,
  totalCriteria,
  criteriaPassed,
  durationMs,
}) => {
  const formatDuration = (ms: number): string => {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
    return `${Math.floor(ms / 60000)}m ${Math.floor((ms % 60000) / 1000)}s`;
  };

  const stats = [
    {
      icon: FileCheck2,
      label: "Test Cases",
      value: totalTests.toString(),
      color: "#22d3ee",
      bgColor: "rgba(34, 211, 238, 0.12)",
    },
    {
      icon: CheckCircle2,
      label: "Criteria Passed",
      value: `${criteriaPassed}/${totalCriteria}`,
      color: "#22c55e",
      bgColor: "rgba(34, 197, 94, 0.12)",
    },
    {
      icon: passed === totalTests ? CheckCircle2 : XCircle,
      label: "Pass Rate",
      value:
        totalTests > 0 ? `${Math.round((passed / totalTests) * 100)}%` : "0%",
      color: passed === totalTests ? "#22c55e" : "#ef4444",
      bgColor:
        passed === totalTests
          ? "rgba(34, 197, 94, 0.12)"
          : "rgba(239, 68, 68, 0.12)",
    },
    {
      icon: Clock,
      label: "Duration",
      value: formatDuration(durationMs),
      color: "#facc15",
      bgColor: "rgba(250, 204, 21, 0.12)",
    },
  ];

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "var(--space-4)",
      }}
    >
      {stats.map((stat, index) => (
        <motion.div
          key={stat.label}
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: index * 0.05 }}
          style={{
            background: "var(--bg-surface)",
            border: "1px solid var(--border-subtle)",
            borderRadius: "var(--radius-md)",
            padding: "var(--space-4)",
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
              background: stat.bgColor,
              borderRadius: "50%",
              flexShrink: 0,
            }}
          >
            <stat.icon size={20} style={{ color: stat.color }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <div
              style={{
                fontSize: "var(--font-size-xs)",
                color: "var(--text-muted)",
                textTransform: "uppercase",
                letterSpacing: "0.5px",
                marginBottom: "var(--space-1)",
              }}
            >
              {stat.label}
            </div>
            <div
              style={{
                fontSize: "var(--font-size-xl)",
                fontWeight: 700,
                color: "var(--text-primary)",
                lineHeight: 1,
              }}
            >
              {stat.value}
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};

export default StatsCards;
