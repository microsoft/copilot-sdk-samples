import React, { useState, useMemo, useEffect, useRef } from "react";
import { motion } from "framer-motion";
import mermaid from "mermaid";
import {
  Target,
  CheckCircle2,
  XCircle,
  Loader2,
  FileText,
  FolderOpen,
  Zap,
} from "lucide-react";
import type { SkillTestExecution, SkillTestCaseResult } from "./types";
import StatsCards from "./StatsCards";
import CriteriaPanel from "./CriteriaPanel";
import CodePanel from "./CodePanel";

interface SkillTestingViewerProps {
  execution: SkillTestExecution;
}

const SkillTestingViewer: React.FC<SkillTestingViewerProps> = ({
  execution,
}) => {
  const [selectedTestCase, setSelectedTestCase] =
    useState<SkillTestCaseResult | null>(
      execution.testCases.length > 0 ? execution.testCases[0] : null,
    );
  const mermaidRef = useRef<HTMLDivElement>(null);

  const statusConfig = useMemo(() => {
    switch (execution.status) {
      case "completed":
        const allPassed =
          execution.summary.passed === execution.summary.totalTests;
        return {
          icon: allPassed ? <CheckCircle2 size={14} /> : <XCircle size={14} />,
          label: allPassed ? "All Passed" : "Some Failed",
          color: allPassed ? "var(--success)" : "var(--error)",
          bgColor: allPassed ? "var(--success-muted)" : "var(--error-muted)",
        };
      case "failed":
        return {
          icon: <XCircle size={14} />,
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
      default:
        return {
          icon: <Loader2 size={14} />,
          label: "Pending",
          color: "var(--text-muted)",
          bgColor: "var(--bg-surface)",
        };
    }
  }, [execution.status, execution.summary]);

  // Initialize mermaid and render diagram
  useEffect(() => {
    mermaid.initialize({
      startOnLoad: false,
      theme: "dark",
      securityLevel: "loose",
      themeVariables: {
        darkMode: true,
        background: "#141414",
        primaryColor: "#8251ee",
        primaryTextColor: "#ffffff",
        primaryBorderColor: "#8251ee",
        lineColor: "#a1a1a1",
        secondaryColor: "#1c1c1c",
        tertiaryColor: "#242424",
      },
    });

    const renderDiagram = async () => {
      if (!mermaidRef.current) return;
      mermaidRef.current.innerHTML = "";
      const diagram = `
        graph LR
          A[SKILL.md] -->|Parse| B[Test Harness]
          B -->|Execute| C[Copilot SDK]
          C -->|Generate| D[Code Output]
          D -->|Evaluate| E[Criteria Check]
          E -->|Report| F[Results]
      `;
      try {
        const { svg } = await mermaid.render(
          `skill-testing-diagram-${Date.now()}`,
          diagram,
        );
        mermaidRef.current.innerHTML = svg;
      } catch (error) {
        console.error("Mermaid render error:", error);
      }
    };

    renderDiagram();
  }, []);

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
          borderRadius: "var(--radius-lg)",
          padding: "var(--space-4)",
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
          <Zap size={16} style={{ color: "var(--color-ghaw-purple)" }} />
          <span
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: 600,
              color: "var(--text-secondary)",
            }}
          >
            Architecture
          </span>
        </div>
        <div
          ref={mermaidRef}
          style={{
            display: "flex",
            justifyContent: "center",
            padding: "var(--space-2)",
          }}
        />
      </div>

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
                  "linear-gradient(135deg, var(--color-ghaw-purple), var(--color-teams))",
                borderRadius: "var(--radius-md)",
                boxShadow: "var(--shadow-glow)",
              }}
            >
              <Target size={20} style={{ color: "white" }} />
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
                Skill Test Execution
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
            <FileText
              size={16}
              style={{
                color: "var(--color-ghaw-purple)",
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
                Skill
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--font-size-base)",
                  color: "var(--text-primary)",
                  fontWeight: 600,
                }}
              >
                {execution.skill.name}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "flex-start",
              gap: "var(--space-3)",
              paddingTop: "var(--space-3)",
              borderTop: "1px solid var(--border-subtle)",
            }}
          >
            <FolderOpen
              size={16}
              style={{
                color: "var(--text-muted)",
                marginTop: 2,
                flexShrink: 0,
              }}
            />
            <div style={{ flex: 1 }}>
              <div
                style={{
                  fontSize: "var(--font-size-xs)",
                  color: "var(--text-muted)",
                  textTransform: "uppercase",
                  letterSpacing: "0.5px",
                  marginBottom: "var(--space-1)",
                }}
              >
                Description
              </div>
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--font-size-sm)",
                  color: "var(--text-secondary)",
                  lineHeight: 1.5,
                }}
              >
                {execution.skill.description}
              </p>
            </div>
          </div>
        </div>
      </div>

      <StatsCards
        totalTests={execution.summary.totalTests}
        passed={execution.summary.passed}
        failed={execution.summary.failed}
        totalCriteria={execution.summary.totalCriteria}
        criteriaPassed={execution.summary.criteriaPassed}
        durationMs={execution.durationMs}
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
          Test Cases
        </div>
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "var(--space-2)",
          }}
        >
          {execution.testCases.map((testCase, index) => (
            <motion.button
              key={testCase.id}
              initial={{ opacity: 0, x: -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: index * 0.05 }}
              onClick={() => setSelectedTestCase(testCase)}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "var(--space-3)",
                padding: "var(--space-3) var(--space-4)",
                background:
                  selectedTestCase?.id === testCase.id
                    ? "var(--bg-elevated)"
                    : "var(--bg-surface)",
                border: `1px solid ${
                  selectedTestCase?.id === testCase.id
                    ? "var(--border-strong)"
                    : "var(--border-subtle)"
                }`,
                borderRadius: "var(--radius-md)",
                cursor: "pointer",
                textAlign: "left",
                width: "100%",
                transition: "all 0.15s ease",
              }}
            >
              <div
                style={{
                  width: 24,
                  height: 24,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {testCase.passed ? (
                  <CheckCircle2 size={18} style={{ color: "var(--success)" }} />
                ) : (
                  <XCircle size={18} style={{ color: "var(--error)" }} />
                )}
              </div>

              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    fontSize: "var(--font-size-sm)",
                    fontWeight: 500,
                    color: "var(--text-primary)",
                    marginBottom: "var(--space-1)",
                  }}
                >
                  {testCase.id}
                </div>
                <div
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--text-muted)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {testCase.description}
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: "var(--space-2)",
                }}
              >
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    padding: "2px 8px",
                    background: testCase.passed
                      ? "var(--success-muted)"
                      : "var(--error-muted)",
                    color: testCase.passed ? "var(--success)" : "var(--error)",
                    borderRadius: "var(--radius-sm)",
                    fontWeight: 600,
                  }}
                >
                  {testCase.passed ? "PASS" : "FAIL"}
                </span>
                <span
                  style={{
                    fontSize: "var(--font-size-xs)",
                    color: "var(--text-muted)",
                  }}
                >
                  {testCase.durationMs}ms
                </span>
              </div>
            </motion.button>
          ))}
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: "var(--space-4)",
          height: 320,
          overflow: "hidden",
        }}
      >
        <CriteriaPanel
          criteriaResults={selectedTestCase?.criteriaResults || []}
        />
        <CodePanel
          code={selectedTestCase?.generatedCode}
          language="typescript"
        />
      </div>
    </motion.div>
  );
};

export default SkillTestingViewer;
