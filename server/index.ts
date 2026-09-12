import express, { Request, Response, NextFunction, Application } from "express";
import { rateLimit } from "express-rate-limit";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";
import { createGitHubActionsConnector } from "../shared/connectors/github-actions/client.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, "..");

const app: Application = express();
const PORT = Number(process.env.PORT ?? 3001);

app.use(express.json());

export const demoRunRateLimiter = rateLimit({
  windowMs: 60_000,
  limit: 10,
  standardHeaders: "draft-8",
  legacyHeaders: false,
  message: { error: "Too many demo runs; try again later" },
});

export interface DemoConfig {
  id: string;
  name: string;
  description: string;
  entrypoint: string;
  workflow?: string;
  envVars?: Record<string, string>;
}

export const DEMO_CONFIGS: Record<string, DemoConfig> = {
  "hello-world": {
    id: "hello-world",
    name: "Hello World",
    description: "Basic SDK setup and interaction",
    entrypoint: "samples/hello-world/sdk/index.ts",
    workflow: ".github/aw/samples/hello-world.md",
    envVars: { GITHUB_TOKEN: "required" },
  },
  "issue-triage": {
    id: "issue-triage",
    name: "Issue Triage",
    description: "Auto-label and triage GitHub issues using AI",
    entrypoint: "samples/issue-triage/sdk/index.ts",
    envVars: { GITHUB_TOKEN: "required" },
  },
  "security-alerts": {
    id: "security-alerts",
    name: "Security Alerts",
    description: "Prioritize and remediate security vulnerabilities",
    entrypoint: "samples/security-alerts/sdk/index.ts",
    envVars: { GITHUB_TOKEN: "required" },
  },
  "mcp-orchestration": {
    id: "mcp-orchestration",
    name: "MCP Orchestration",
    description: "Query dev infrastructure via Model Context Protocol",
    entrypoint: "samples/mcp-orchestration/sdk/index.ts",
    envVars: { GITHUB_TOKEN: "required" },
  },
  pagerduty: {
    id: "pagerduty",
    name: "PagerDuty",
    description: "Incident management and on-call scheduling",
    entrypoint: "samples/pagerduty/sdk/index.ts",
    envVars: { GITHUB_TOKEN: "required", PAGERDUTY_API_KEY: "optional" },
  },
  datadog: {
    id: "datadog",
    name: "Datadog",
    description: "Monitoring and observability integration",
    entrypoint: "samples/datadog/sdk/index.ts",
    envVars: {
      GITHUB_TOKEN: "required",
      DATADOG_API_KEY: "optional",
      DATADOG_APP_KEY: "optional",
    },
  },
  teams: {
    id: "teams",
    name: "Microsoft Teams",
    description: "Microsoft Teams collaboration integration",
    entrypoint: "samples/teams/sdk/index.ts",
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
    entrypoint: "samples/skill-testing/sdk/index.ts",
    envVars: { GITHUB_TOKEN: "required" },
  },
  "eda-pcb": {
    id: "eda-pcb",
    name: "EDA PCB Design",
    description:
      "AI-powered PCB design assistant with DRC, auto-routing, and signal integrity",
    entrypoint: "samples/eda-pcb/sdk/index.ts",
    envVars: { GITHUB_TOKEN: "required" },
  },
};

type DemoType = "sdk" | "ghaw";
type RunMode = "mock" | "live";

export interface RunDemoBody {
  tokens: Record<string, string>;
  mode: RunMode;
  demoType: DemoType;
  params: Record<string, string>;
}

export interface DemoProcessSpec {
  executable: string;
  args: string[];
}

type ParseResult =
  | { success: true; data: RunDemoBody }
  | { success: false; error: string };

type StringRecordResult =
  | { success: true; data: Record<string, string> }
  | { success: false; error: string };

const RUN_DEMO_FIELDS = new Set(["tokens", "mode", "demoType", "params"]);
const PARAM_NAME_PATTERN = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
const LOOPBACK_HOSTNAMES = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]);

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const parseStringRecord = (
  value: unknown,
  fieldName: string,
): StringRecordResult => {
  if (value === undefined) {
    return { success: true, data: {} };
  }

  if (!isRecord(value)) {
    return { success: false, error: `${fieldName} must be an object` };
  }

  const result: Record<string, string> = {};
  for (const [key, entry] of Object.entries(value)) {
    if (typeof entry !== "string") {
      return {
        success: false,
        error: `${fieldName}.${key} must be a string`,
      };
    }
    result[key] = entry;
  }

  return { success: true, data: result };
};

export const parseRunDemoBody = (
  value: unknown,
  demo: DemoConfig,
): ParseResult => {
  if (!isRecord(value)) {
    return { success: false, error: "Request body must be a JSON object" };
  }

  for (const field of Object.keys(value)) {
    if (!RUN_DEMO_FIELDS.has(field)) {
      return { success: false, error: `Unsupported field: ${field}` };
    }
  }

  const modeValue = value.mode;
  if (modeValue !== undefined && modeValue !== "mock" && modeValue !== "live") {
    return { success: false, error: "mode must be mock or live" };
  }
  const mode = modeValue ?? "mock";

  const demoTypeValue = value.demoType;
  if (
    demoTypeValue !== undefined &&
    demoTypeValue !== "sdk" &&
    demoTypeValue !== "ghaw"
  ) {
    return { success: false, error: "demoType must be sdk or ghaw" };
  }
  const demoType = demoTypeValue ?? "sdk";
  if (demoType === "ghaw" && !demo.workflow) {
    return {
      success: false,
      error: `Demo ${demo.id} does not provide a GitHub Agentic Workflow`,
    };
  }

  const tokensResult = parseStringRecord(value.tokens, "tokens");
  if (!tokensResult.success) {
    return tokensResult;
  }

  const allowedTokenNames = new Set(Object.keys(demo.envVars ?? {}));
  for (const tokenName of Object.keys(tokensResult.data)) {
    if (!allowedTokenNames.has(tokenName)) {
      return {
        success: false,
        error: `Unsupported token field: ${tokenName}`,
      };
    }
  }

  const paramsResult = parseStringRecord(value.params, "params");
  if (!paramsResult.success) {
    return paramsResult;
  }

  for (const paramName of Object.keys(paramsResult.data)) {
    if (!PARAM_NAME_PATTERN.test(paramName)) {
      return {
        success: false,
        error: `Invalid parameter name: ${paramName}`,
      };
    }
  }

  return {
    success: true,
    data: {
      tokens: tokensResult.data,
      mode,
      demoType,
      params: paramsResult.data,
    },
  };
};

export const getDemoProcessSpec = (
  demo: DemoConfig,
  demoType: DemoType,
): DemoProcessSpec => {
  if (demoType === "ghaw") {
    if (!demo.workflow) {
      throw new Error(
        `Demo ${demo.id} does not provide a GitHub Agentic Workflow`,
      );
    }
    return {
      executable: "gh",
      args: ["aw", "run", demo.workflow],
    };
  }

  return {
    executable: process.execPath,
    args: ["--import", "tsx", demo.entrypoint],
  };
};

export const createDemoEnvironment = (
  demo: DemoConfig,
  body: RunDemoBody,
  baseEnvironment: NodeJS.ProcessEnv = process.env,
): NodeJS.ProcessEnv => {
  const env: NodeJS.ProcessEnv = {
    ...baseEnvironment,
    CONNECTOR_MODE: body.mode,
  };

  if (body.mode === "live") {
    for (const tokenName of Object.keys(demo.envVars ?? {})) {
      const value = body.tokens[tokenName];
      if (value) {
        env[tokenName] = value;
      }
    }
  }

  for (const [key, value] of Object.entries(body.params)) {
    if (value) {
      env[`SAMPLE_${key.toUpperCase()}`] = value;
    }
  }

  return env;
};

export const getServerHost = (
  environment: NodeJS.ProcessEnv = process.env,
): string => environment.HOST?.trim() || "127.0.0.1";

export const isAllowedMutationOrigin = (
  origin: string | undefined,
  configuredOrigins = process.env.ALLOWED_ORIGINS,
): boolean => {
  if (!origin) {
    return true;
  }

  try {
    const parsedOrigin = new URL(origin);
    if (!["http:", "https:"].includes(parsedOrigin.protocol)) {
      return false;
    }

    if (LOOPBACK_HOSTNAMES.has(parsedOrigin.hostname)) {
      return true;
    }

    const allowedOrigins = (configuredOrigins ?? "")
      .split(",")
      .map((value) => value.trim())
      .filter(Boolean)
      .map((value) => new URL(value).origin);

    return allowedOrigins.includes(parsedOrigin.origin);
  } catch {
    return false;
  }
};

const requireSecureJsonRequest = (
  req: Request,
  res: Response,
  next: NextFunction,
): void => {
  if (!isAllowedMutationOrigin(req.get("Origin"))) {
    res.status(403).json({ error: "Request origin is not allowed" });
    return;
  }

  if (req.get("Sec-Fetch-Site") === "cross-site") {
    res.status(403).json({ error: "Cross-site requests are not allowed" });
    return;
  }

  if (!req.is("application/json")) {
    res.status(415).json({ error: "Content-Type must be application/json" });
    return;
  }

  next();
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

app.post(
  "/api/demos/:id/run",
  demoRunRateLimiter,
  requireSecureJsonRequest,
  (req: Request<{ id: string }, unknown, unknown>, res: Response) => {
    const demo = DEMO_CONFIGS[req.params.id];
    if (!demo) {
      res.status(404).json({ error: "Demo not found" });
      return;
    }

    const bodyResult = parseRunDemoBody(req.body, demo);
    if (!bodyResult.success) {
      res.status(400).json({ error: bodyResult.error });
      return;
    }

    const body = bodyResult.data;
    const processSpec = getDemoProcessSpec(demo, body.demoType);

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache");
    res.setHeader("Connection", "keep-alive");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const env = createDemoEnvironment(demo, body);

    console.log(
      `[DEBUG] Spawning: ${processSpec.executable}`,
      processSpec.args,
    );
    console.log(`[DEBUG] CWD: ${ROOT_DIR}`);

    const child = spawn(processSpec.executable, processSpec.args, {
      cwd: ROOT_DIR,
      env,
      shell: false,
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
  requireSecureJsonRequest,
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

if (process.env.NODE_ENV !== "test") {
  const host = getServerHost();
  app.listen(PORT, host, () => {
    console.log(`Demo API server running on http://${host}:${PORT}`);
    console.log(`Available endpoints:`);
    console.log(`  GET  /api/demos          - List all demos`);
    console.log(`  GET  /api/demos/:id      - Get demo details`);
    console.log(`  POST /api/demos/:id/run  - Run a demo (SSE stream)`);
    console.log(`  GET  /health             - Health check`);
  });
}

export default app;
