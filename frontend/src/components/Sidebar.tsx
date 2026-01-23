import React, { useState } from "react";
import {
  Book,
  Terminal,
  ExternalLink,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Download,
  PlayCircle,
  GitBranch,
  AlertCircle,
} from "lucide-react";

interface SidebarProps {
  className?: string;
}

interface CollapsibleSectionProps {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  title,
  icon: Icon,
  children,
  defaultOpen = true,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="sidebar-collapsible">
      <button
        className="sidebar-collapsible-header"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <Icon className="sidebar-collapsible-icon" />
        <span className="sidebar-collapsible-title">{title}</span>
        {isOpen ? (
          <ChevronDown className="sidebar-collapsible-chevron" />
        ) : (
          <ChevronRight className="sidebar-collapsible-chevron" />
        )}
      </button>
      <div
        className={`sidebar-collapsible-content ${isOpen ? "open" : "closed"}`}
      >
        {children}
      </div>
    </div>
  );
};

const Sidebar: React.FC<SidebarProps> = ({ className = "" }) => {
  return (
    <aside className={`sidebar ${className}`}>
      <div className="sidebar-about">
        <div className="sidebar-about-item">
          <div className="sidebar-about-header">
            <div className="sidebar-about-icon sidebar-about-icon-sdk">
              <Terminal size={16} />
            </div>
            <h3 className="sidebar-about-title">Copilot SDK</h3>
          </div>
          <p className="sidebar-about-desc">
            Programmatic TypeScript/Node.js SDK for building AI-powered
            applications with direct code control.
          </p>
          <a
            href="https://github.com/github/copilot-sdk"
            target="_blank"
            rel="noopener noreferrer"
            className="sidebar-about-link"
          >
            <ExternalLink size={12} />
            SDK Documentation
          </a>
        </div>
      </div>

      <CollapsibleSection
        title="Getting Started"
        icon={CheckCircle2}
        defaultOpen={true}
      >
        <ul className="sidebar-prereqs">
          <li className="sidebar-prereq">
            <CheckCircle2 size={14} className="sidebar-prereq-icon" />
            <span>Node.js 18+</span>
          </li>
          <li className="sidebar-prereq">
            <CheckCircle2 size={14} className="sidebar-prereq-icon" />
            <span>pnpm 9+</span>
          </li>
          <li className="sidebar-prereq">
            <CheckCircle2 size={14} className="sidebar-prereq-icon" />
            <span>Git</span>
          </li>
        </ul>

        <div className="sidebar-prereq-section">
          <div className="sidebar-prereq-header">
            <AlertCircle size={14} className="sidebar-prereq-header-icon" />
            <span>Required for Live API</span>
          </div>
          <div className="sidebar-prereq-card">
            <p className="sidebar-prereq-card-text">
              Install GitHub Copilot CLI to run samples with real data.
            </p>
            <a
              href="https://github.com/github/copilot-cli?tab=readme-ov-file#installation"
              target="_blank"
              rel="noopener noreferrer"
              className="sidebar-prereq-card-link"
            >
              <Terminal size={14} />
              <span>Install Copilot CLI</span>
              <ExternalLink size={12} />
            </a>
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection
        title="Quick Commands"
        icon={Terminal}
        defaultOpen={true}
      >
        <div className="sidebar-commands">
          <div className="sidebar-command">
            <code>pnpm install</code>
            <Download size={12} className="sidebar-command-icon" />
          </div>
          <div className="sidebar-command">
            <code>pnpm test</code>
            <PlayCircle size={12} className="sidebar-command-icon" />
          </div>
          <div className="sidebar-command">
            <code>pnpm hello-world</code>
            <PlayCircle size={12} className="sidebar-command-icon" />
          </div>
        </div>
      </CollapsibleSection>

      <CollapsibleSection title="Resources" icon={Book} defaultOpen={true}>
        <ul className="sidebar-resources">
          <li>
            <a
              href="https://github.com/microsoft/copilot-sdk-samples"
              target="_blank"
              rel="noopener noreferrer"
              className="sidebar-resource-link"
            >
              <GitBranch size={14} />
              <span>This Repository</span>
            </a>
          </li>
          <li>
            <a
              href="https://github.com/github/copilot-sdk"
              target="_blank"
              rel="noopener noreferrer"
              className="sidebar-resource-link"
            >
              <Book size={14} />
              <span>Copilot SDK</span>
            </a>
          </li>
        </ul>
      </CollapsibleSection>
    </aside>
  );
};

export default Sidebar;
