import React from "react";
import { Github, Code2, Workflow } from "lucide-react";
import type { SampleType } from "../types";

interface HeaderProps {
  activeView: SampleType | "all";
  onViewChange: (view: SampleType | "all") => void;
  sdkCount: number;
  ghawCount: number;
}

const LogoIcon: React.FC = () => (
  <svg viewBox="0 0 32 32" width="32" height="32" className="header-logo-svg">
    <defs>
      <linearGradient id="logoGradient" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#79c0ff" />
        <stop offset="50%" stopColor="#a371f7" />
        <stop offset="100%" stopColor="#d2a8ff" />
      </linearGradient>
    </defs>
    <rect width="32" height="32" rx="6" fill="#21262d" />
    <path
      d="M9 10L5 16L9 22"
      stroke="url(#logoGradient)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <path
      d="M23 10L27 16L23 22"
      stroke="url(#logoGradient)"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
    <circle cx="16" cy="12" r="1.5" fill="#a371f7" />
    <circle cx="16" cy="16" r="2" fill="#d2a8ff" />
    <circle cx="16" cy="20" r="1.5" fill="#a371f7" />
  </svg>
);

const Header: React.FC<HeaderProps> = ({
  activeView,
  onViewChange,
  sdkCount,
  ghawCount,
}) => {
  return (
    <header className="header">
      <div className="header-brand">
        <div className="header-logo">
          <LogoIcon />
        </div>
        <div className="header-titles">
          <h1 className="header-title">GitHub Copilot SDK</h1>
          <span className="header-subtitle">Samples & Workflows</span>
        </div>
      </div>

      <nav className="header-nav">
        <button
          className={`header-nav-tab header-nav-tab-sdk ${activeView === "all" || activeView === "sdk" ? "active" : ""}`}
          onClick={() => onViewChange("all")}
        >
          <Code2 size={16} />
          <span className="header-nav-tab-label">Copilot SDK</span>
          <span className="header-nav-tab-count">{sdkCount}</span>
        </button>
        <button
          className={`header-nav-tab header-nav-tab-ghaw ${activeView === "ghaw" ? "active" : ""}`}
          onClick={() => onViewChange("ghaw")}
        >
          <Workflow size={16} />
          <span className="header-nav-tab-label">gh-aw</span>
          <span className="header-nav-tab-count">{ghawCount}</span>
        </button>
      </nav>

      <a
        href="https://github.com/microsoft-foundry/copilot-sdk-samples"
        target="_blank"
        rel="noopener noreferrer"
        className="header-github-link"
      >
        <Github size={18} />
        <span>View on GitHub</span>
      </a>
    </header>
  );
};

export default Header;
