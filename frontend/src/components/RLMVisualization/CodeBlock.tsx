import React, { useState, useCallback } from "react";
import { motion } from "framer-motion";
import { Copy, Check, FileCode } from "lucide-react";

interface CodeBlockProps {
  code: string;
  language: "python" | "nodejs";
  title?: string;
}

const CodeBlock: React.FC<CodeBlockProps> = ({ code, language, title }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  const lines = code.split("\n");

  const languageLabel = language === "python" ? "Python" : "JavaScript";

  return (
    <motion.div
      className="rlm-code-block"
      initial={{ opacity: 0, y: 4 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
      style={{
        background: "var(--bg-page)",
        border: "1px solid var(--border-default)",
        borderRadius: "var(--radius-md)",
        overflow: "hidden",
      }}
    >
      {/* Header */}
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
          <FileCode size={14} style={{ color: "var(--text-muted)" }} />
          {title && (
            <span
              style={{
                fontSize: "var(--font-size-sm)",
                fontWeight: 500,
                color: "var(--text-secondary)",
              }}
            >
              {title}
            </span>
          )}
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
            {languageLabel}
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

      {/* Code Content */}
      <div
        style={{
          display: "flex",
          overflow: "auto",
          maxHeight: "320px",
        }}
      >
        {/* Line Numbers */}
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

        {/* Code */}
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

export default CodeBlock;
