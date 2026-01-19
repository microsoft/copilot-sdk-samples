import express, { Request, Response, NextFunction } from "express";
import cors from "cors";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

interface DemoConfig {
  id: string;
  name: string;
  description: string;
  command: string;
  envVars?: Record<string, string>;
}

const DEMO_CONFIGS: Record<string, DemoConfig> = {
  "hello-world": {
    id: "hello-world",
    name: "Hello World",
    description: "Basic SDK setup and interaction",
    command: "tsx samples/hello-world/sdk/index.ts",
  },
  "issue-triage": {
    id: "issue-triage",
    name: "Issue Triage",
    description: "Auto-label and triage GitHub issues using AI",
    command: "tsx samples/issue-triage/sdk/index.ts",
    envVars: { GITHUB_TOKEN: "optional" },
  },
  "security-alerts": {
    id: "security-alerts",
    name: "Security Alerts",
    description: "Prioritize and remediate security vulnerabilities",
    command: "tsx samples/security-alerts/sdk/index.ts",
    envVars: { GITHUB_TOKEN: "optional" },
  },
  "mcp-orchestration": {
    id: "mcp-orchestration",
    name: "MCP Orchestration",
    description: "Query dev infrastructure via Model Context Protocol",
    command: "tsx samples/mcp-orchestration/sdk/index.ts",
  },
  "jira-confluence": {
    id: "jira-confluence",
    name: "Jira + Confluence",
    description: "Atlassian integration for issue sync and documentation",
    command: "tsx samples/jira-confluence/sdk/index.ts",
    envVars: {
      JIRA_HOST: "optional",
      JIRA_EMAIL: "optional",
      JIRA_API_TOKEN: "optional",
    },
  },
  pagerduty: {
    id: "pagerduty",
    name: "PagerDuty",
    description: "Incident management and on-call scheduling",
    command: "tsx samples/pagerduty/sdk/index.ts",
    envVars: { PAGERDUTY_API_KEY: "optional" },
  },
};

app.get("/api/demos", (_req: Request, res: Response) => {
  const demos = Object.values(DEMO_CONFIGS).map(
    ({ id, name, description, envVars }) => ({
      id,
      name,
      description,
      requiresToken: !!envVars,
      tokenFields: envVars ? Object.keys(envVars) : [],
    }),
  );
  res.json({ demos });
});

app.get("/api/demos/:id", (req: Request<{ id: string }>, res: Response) => {
  const demo = DEMO_CONFIGS[req.params.id];
  if (!demo) {
    res.status(404).json({ error: "Demo not found" });
    return;
  }
  res.json({
    id: demo.id,
    name: demo.name,
    description: demo.description,
    requiresToken: !!demo.envVars,
    tokenFields: demo.envVars ? Object.keys(demo.envVars) : [],
  });
});

interface RunDemoBody {
  tokens?: Record<string, string>;
  mode?: "mock" | "live";
}

app.post(
  "/api/demos/:id/run",
  (req: Request<{ id: string }, unknown, RunDemoBody>, res: Response) => {
    const demo = DEMO_CONFIGS[req.params.id];
    if (!demo) {
      res.status(404).json({ error: "Demo not found" });
      return;
    }

    const { tokens = {}, mode = "mock" } = req.body;

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      CONNECTOR_MODE: mode,
    };

    if (mode === "live" && tokens) {
      Object.entries(tokens).forEach(([key, value]) => {
        if (value) env[key] = value;
      });
    }

    const [cmd, ...args] = demo.command.split(" ");
    const child = spawn(cmd, args, {
      cwd: ROOT_DIR,
      env,
      shell: true,
    });

    const sendEvent = (type: string, data: string) => {
      res.write(`event: ${type}\ndata: ${JSON.stringify({ data })}\n\n`);
    };

    child.stdout.on("data", (data: Buffer) => {
      sendEvent("output", data.toString());
    });

    child.stderr.on("data", (data: Buffer) => {
      sendEvent("error", data.toString());
    });

    child.on("close", (code: number | null) => {
      sendEvent("complete", `Process exited with code ${code}`);
      res.end();
    });

    child.on("error", (err: Error) => {
      sendEvent("error", `Failed to start: ${err.message}`);
      res.end();
    });

    req.on("close", () => {
      child.kill();
    });
  },
);

app.get("/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Server error:", err);
  res.status(500).json({ error: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`Demo API server running on http://localhost:${PORT}`);
  console.log(`Available endpoints:`);
  console.log(`  GET  /api/demos          - List all demos`);
  console.log(`  GET  /api/demos/:id      - Get demo details`);
  console.log(`  POST /api/demos/:id/run  - Run a demo (SSE stream)`);
  console.log(`  GET  /health             - Health check`);
});

export default app;
