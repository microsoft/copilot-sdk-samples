import express, { Request, Response, NextFunction, Application } from "express";
import cors from "cors";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { createGitHubActionsConnector } from "../shared/connectors/github-actions/client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

const app: Application = express();
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
    command: "npx tsx samples/hello-world/sdk/index.ts",
    envVars: { GITHUB_TOKEN: "required" },
  },
  "issue-triage": {
    id: "issue-triage",
    name: "Issue Triage",
    description: "Auto-label and triage GitHub issues using AI",
    command: "npx tsx samples/issue-triage/sdk/index.ts",
    envVars: { GITHUB_TOKEN: "required" },
  },
  "security-alerts": {
    id: "security-alerts",
    name: "Security Alerts",
    description: "Prioritize and remediate security vulnerabilities",
    command: "npx tsx samples/security-alerts/sdk/index.ts",
    envVars: { GITHUB_TOKEN: "required" },
  },
  "mcp-orchestration": {
    id: "mcp-orchestration",
    name: "MCP Orchestration",
    description: "Query dev infrastructure via Model Context Protocol",
    command: "npx tsx samples/mcp-orchestration/sdk/index.ts",
    envVars: { GITHUB_TOKEN: "required" },
  },
  "jira-confluence": {
    id: "jira-confluence",
    name: "Jira + Confluence",
    description: "Atlassian integration for issue sync and documentation",
    command: "npx tsx samples/jira-confluence/sdk/index.ts",
    envVars: {
      GITHUB_TOKEN: "required",
      JIRA_HOST: "optional",
      JIRA_EMAIL: "optional",
      JIRA_API_TOKEN: "optional",
    },
  },
  pagerduty: {
    id: "pagerduty",
    name: "PagerDuty",
    description: "Incident management and on-call scheduling",
    command: "npx tsx samples/pagerduty/sdk/index.ts",
    envVars: { GITHUB_TOKEN: "required", PAGERDUTY_API_KEY: "optional" },
  },
  datadog: {
    id: "datadog",
    name: "Datadog",
    description: "Monitoring and observability integration",
    command: "npx tsx samples/datadog/sdk/index.ts",
    envVars: {
      GITHUB_TOKEN: "required",
      DATADOG_API_KEY: "optional",
      DATADOG_APP_KEY: "optional",
    },
  },
  snyk: {
    id: "snyk",
    name: "Snyk",
    description: "Security scanning and vulnerability detection",
    command: "npx tsx samples/snyk/sdk/index.ts",
    envVars: { GITHUB_TOKEN: "required", SNYK_TOKEN: "optional" },
  },
  teams: {
    id: "teams",
    name: "Microsoft Teams",
    description: "Microsoft Teams collaboration integration",
    command: "npx tsx samples/teams/sdk/index.ts",
    envVars: {
      GITHUB_TOKEN: "required",
      TEAMS_TENANT_ID: "optional",
      TEAMS_CLIENT_ID: "optional",
      TEAMS_CLIENT_SECRET: "optional",
    },
  },
  "skill-testing": {
    id: "skill-testing",
    name: "Skill Testing",
    description: "Test AI skills against acceptance criteria",
    command: "npx tsx samples/skill-testing/sdk/index.ts",
    envVars: { GITHUB_TOKEN: "required" },
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
  command?: string;
  demoType?: "sdk" | "ghaw";
  params?: Record<string, string>;
}

app.post(
  "/api/demos/:id/run",
  (req: Request<{ id: string }, unknown, RunDemoBody>, res: Response) => {
    const demo = DEMO_CONFIGS[req.params.id];
    if (!demo) {
      res.status(404).json({ error: "Demo not found" });
      return;
    }

    const {
      tokens = {},
      mode = "mock",
      command,
      demoType = "sdk",
      params = {},
    } = req.body;

    let execCommand: string;
    if (command) {
      execCommand = command;
    } else if (demoType === "ghaw") {
      execCommand = `gh copilot aw run .github/aw/samples/${demo.id}.md`;
    } else {
      execCommand = demo.command;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const env: Record<string, string> = {
      ...(process.env as Record<string, string>),
      CONNECTOR_MODE: mode,
    };

    if (mode === "live" && tokens) {
      Object.entries(tokens).forEach(([key, value]) => {
        if (value) env[key] = value;
      });
    }

    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value) env[`SAMPLE_${key.toUpperCase()}`] = value;
      });
    }

    console.log(`[DEBUG] Spawning: ${execCommand}`);
    console.log(`[DEBUG] CWD: ${ROOT_DIR}`);

    const child = spawn(execCommand, [], {
      cwd: ROOT_DIR,
      env,
      shell: true,
      stdio: ["pipe", "pipe", "pipe"],
    });

    console.log(`[DEBUG] Child spawned, pid: ${child.pid}`);

    let processExited = false;

    const sendEvent = (type: string, data: string) => {
      console.log(`[DEBUG] Sending event: ${type}`);
      res.write(`event: ${type}\ndata: ${JSON.stringify({ data })}\n\n`);
    };

    child.stdout.on("data", (data: Buffer) => {
      console.log(
        `[DEBUG] stdout received: ${data.toString().trim().substring(0, 80)}`,
      );
      sendEvent("output", data.toString());
    });

    child.stderr.on("data", (data: Buffer) => {
      console.log(
        `[DEBUG] stderr received: ${data.toString().trim().substring(0, 80)}`,
      );
      sendEvent("error", data.toString());
    });

    child.on("close", (code: number | null, signal: NodeJS.Signals | null) => {
      console.log(`[DEBUG] Process closed - code: ${code}, signal: ${signal}`);
      processExited = true;
      sendEvent("complete", `Process exited with code ${code}`);
      res.end();
    });

    child.on("error", (err: Error) => {
      console.log(`[DEBUG] Process error: ${err.message}`);
      processExited = true;
      sendEvent("error", `Failed to start: ${err.message}`);
      res.end();
    });

    req.on("close", () => {
      console.log(`[DEBUG] Request closed, processExited: ${processExited}`);
    });

    res.on("close", () => {
      console.log(`[DEBUG] Response closed, processExited: ${processExited}`);
      if (!processExited) {
        console.log(`[DEBUG] Killing child process`);
        child.kill();
      }
    });
  },
);

interface RLMExecuteBody {
  token: string;
  owner: string;
  repo: string;
  query: string;
  workflowId?: string;
  ref?: string;
}

app.post(
  "/api/rlm/execute",
  async (req: Request<unknown, unknown, RLMExecuteBody>, res: Response) => {
    const {
      token,
      owner,
      repo,
      query,
      workflowId = "rlm-repl.yml",
      ref = "main",
    } = req.body;

    if (!token || !owner || !repo || !query) {
      res.status(400).json({
        error: "Missing required fields: token, owner, repo, query",
      });
      return;
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const sendEvent = (type: string, data: unknown) => {
      res.write(`event: ${type}\ndata: ${JSON.stringify(data)}\n\n`);
    };

    try {
      const connector = createGitHubActionsConnector({
        mode: "live",
        token,
        owner,
        repo,
      });

      const initResult = await connector.initialize();
      if (!initResult.success) {
        sendEvent("error", {
          message:
            initResult.error?.message ?? "Failed to initialize connector",
        });
        res.end();
        return;
      }

      sendEvent("status", {
        phase: "dispatching",
        message: "Dispatching workflow...",
      });

      const dispatchResult = await connector.dispatchWorkflow({
        workflowId,
        ref,
        inputs: { query },
      });

      if (!dispatchResult.success) {
        sendEvent("error", {
          message:
            dispatchResult.error?.message ?? "Failed to dispatch workflow",
        });
        res.end();
        return;
      }

      const runId = dispatchResult.data!.runId;
      sendEvent("status", {
        phase: "queued",
        message: `Workflow queued (run ID: ${runId})`,
        runId,
      });

      const pollInterval = 3000;
      const timeout = 300000;
      const startTime = Date.now();

      while (true) {
        if (Date.now() - startTime > timeout) {
          sendEvent("error", { message: "Workflow execution timed out" });
          break;
        }

        const runResult = await connector.getWorkflowRun(runId);
        if (!runResult.success) {
          sendEvent("error", {
            message:
              runResult.error?.message ?? "Failed to get workflow status",
          });
          break;
        }

        const run = runResult.data!;
        sendEvent("status", {
          phase: run.status,
          message: `Workflow ${run.status}`,
          runId,
          conclusion: run.conclusion,
          htmlUrl: run.htmlUrl,
        });

        if (run.status === "completed") {
          const artifactsResult = await connector.listArtifacts(runId);
          if (artifactsResult.success && artifactsResult.data!.length > 0) {
            const outputArtifact = artifactsResult.data!.find(
              (a) => a.name === "rlm-output",
            );
            if (outputArtifact) {
              const downloadResult = await connector.downloadArtifact(
                outputArtifact.id,
              );
              if (downloadResult.success) {
                sendEvent("result", { output: downloadResult.data });
              }
            }
          }

          sendEvent("complete", {
            runId,
            conclusion: run.conclusion,
            htmlUrl: run.htmlUrl,
          });
          break;
        }

        await new Promise((resolve) => setTimeout(resolve, pollInterval));
      }

      await connector.dispose();
    } catch (err) {
      sendEvent("error", {
        message: err instanceof Error ? err.message : "Unknown error occurred",
      });
    }

    res.end();
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
