import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Copy, Check, FileCode2 } from "lucide-react";

interface CodePanelProps {
  code?: string;
  language?: string;
}

const CodePanel: React.FC<CodePanelProps> = ({
  code,
  language = "typescript",
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  if (!code) {
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
        <FileCode2
          size={40}
          style={{ opacity: 0.3, marginBottom: "var(--space-3)" }}
        />
        <p style={{ fontSize: "var(--font-size-sm)" }}>
          No generated code to display
        </p>
      </div>
    );
  }

  const lines = code.split("\n");

  const getLanguageConfig = (lang: string) => {
    switch (lang.toLowerCase()) {
      case "typescript":
      case "ts":
        return {
          label: "TypeScript",
          color: "#3178c6",
          bgColor: "rgba(49, 120, 198, 0.15)",
        };
      case "javascript":
      case "js":
        return {
          label: "JavaScript",
          color: "#f0db4f",
          bgColor: "rgba(240, 219, 79, 0.15)",
        };
      case "python":
      case "py":
        return {
          label: "Python",
          color: "#5b9bd5",
          bgColor: "rgba(91, 155, 213, 0.2)",
        };
      default:
        return {
          label: lang,
          color: "var(--text-muted)",
          bgColor: "var(--bg-surface)",
        };
    }
  };

  const langConfig = getLanguageConfig(language);

  return (
    <motion.div
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
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
          <FileCode2 size={14} style={{ color: "var(--text-muted)" }} />
          <span
            style={{
              fontSize: "var(--font-size-sm)",
              fontWeight: 500,
              color: "var(--text-secondary)",
            }}
          >
            Generated Code
          </span>
          <span
            style={{
              fontSize: "var(--font-size-xs)",
              padding: "2px 6px",
              background: langConfig.bgColor,
              color: langConfig.color,
              borderRadius: "var(--radius-sm)",
              fontWeight: 500,
            }}
          >
            {langConfig.label}
          </span>
        </div>

        <button
          onClick={handleCopy}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "var(--space-1)",
            padding: "4px 8px",
            background: copied ? "var(--success-muted)" : "transparent",
            border: "1px solid",
            borderColor: copied ? "var(--success)" : "var(--border-subtle)",
            borderRadius: "var(--radius-sm)",
            color: copied ? "var(--success)" : "var(--text-muted)",
            fontSize: "var(--font-size-xs)",
            cursor: "pointer",
            transition: "all 0.15s ease",
          }}
          onMouseEnter={(e) => {
            if (!copied) {
              e.currentTarget.style.borderColor = "var(--border-default)";
              e.currentTarget.style.color = "var(--text-secondary)";
            }
          }}
          onMouseLeave={(e) => {
            if (!copied) {
              e.currentTarget.style.borderColor = "var(--border-subtle)";
              e.currentTarget.style.color = "var(--text-muted)";
            }
          }}
        >
          {copied ? (
            <>
              <Check size={12} />
              Copied
            </>
          ) : (
            <>
              <Copy size={12} />
              Copy
            </>
          )}
        </button>
      </div>

      <div
        style={{
          display: "flex",
          flex: 1,
          overflow: "auto",
          background: "var(--bg-page)",
        }}
      >
        <div
          style={{
            padding: "var(--space-3)",
            paddingRight: "var(--space-2)",
            background: "rgba(0, 0, 0, 0.2)",
            borderRight: "1px solid var(--border-subtle)",
            userSelect: "none",
            minWidth: "40px",
            textAlign: "right",
          }}
        >
          {lines.map((_, index) => (
            <div
              key={index}
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: "13px",
                lineHeight: "1.6",
                color: "var(--text-disabled)",
              }}
            >
              {index + 1}
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
              fontSize: "13px",
              lineHeight: "1.6",
              color: "var(--text-secondary)",
              whiteSpace: "pre",
            }}
          >
            {code}
          </code>
        </pre>
      </div>
    </motion.div>
  );
};

export default CodePanel;
