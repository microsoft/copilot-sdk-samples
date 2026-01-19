import React from "react";
import { motion } from "framer-motion";
import { Code2, Workflow, Cpu, ArrowRight, Users, Zap } from "lucide-react";
import type { Demo } from "../types";
import Badge from "./Badge";

interface DemoCardProps {
  demo: Demo;
  onClick?: () => void;
  index?: number;
}

const getValueProp = (demo: Demo): string => {
  const valuePropMap: Record<string, string> = {
    "hello-world": "Ship your first integration in 5 min",
    "issue-triage": "70% faster issue classification",
    "security-alerts": "50% faster vulnerability remediation",
    "mcp-orchestration": "10x faster infrastructure queries",
    "jira-confluence": "Zero manual sync between platforms",
    pagerduty: "40% reduction in MTTR",
    datadog: "5x faster log analysis",
    snyk: "90% of vulns auto-prioritized",
    teams: "3x faster team response time",
  };

  return valuePropMap[demo.id] || demo.description.split(".")[0];
};

const DemoCard: React.FC<DemoCardProps> = ({ demo, onClick, index = 0 }) => {
  const getDemoType = (): {
    type: string;
    color: string;
    icon: React.ElementType;
    className: string;
  } => {
    const demoType =
      demo.type ||
      (demo.features.sdk && demo.features.ghaw
        ? "both"
        : demo.features.sdk
          ? "sdk"
          : "ghaw");

    if (demoType === "sdk") {
      return {
        type: "SDK",
        color: "var(--color-sdk-blue)",
        icon: Code2,
        className: "type-sdk",
      };
    } else if (demoType === "ghaw") {
      return {
        type: "gh-aw",
        color: "var(--color-ghaw-purple)",
        icon: Workflow,
        className: "type-ghaw",
      };
    } else {
      return {
        type: "SDK + gh-aw",
        color: "var(--color-both)",
        icon: Cpu,
        className: "type-both",
      };
    }
  };

  const typeInfo = getDemoType();
  const TypeIcon = typeInfo.icon;
  const valueProp = getValueProp(demo);

  return (
    <motion.article
      className="demo-card"
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.35,
        delay: index * 0.06,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
      whileHover={{
        y: -4,
        transition: { duration: 0.2 },
      }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
    >
      <header className="demo-card-header">
        <div className={`demo-card-type ${typeInfo.className}`}>
          <TypeIcon size={14} />
          <span>{typeInfo.type}</span>
        </div>
        {demo.status === "planned" && (
          <Badge variant="status-planned">Planned</Badge>
        )}
      </header>

      <div className="demo-card-body">
        <h3 className="demo-card-title">{demo.name}</h3>

        <p className="demo-card-value-prop">
          <Zap size={12} />
          <span>{valueProp}</span>
        </p>

        <p className="demo-card-description">{demo.description}</p>
      </div>

      <div className="demo-card-bottom">
        {demo.audience && (
          <div className="demo-card-meta">
            <span className="demo-card-meta-item">
              <Users size={12} />
              <span>{demo.audience}</span>
            </span>
          </div>
        )}

        <footer className="demo-card-footer">
          <span className="demo-card-cta">
            View Details
            <ArrowRight size={14} />
          </span>
        </footer>
      </div>
    </motion.article>
  );
};

export default DemoCard;
