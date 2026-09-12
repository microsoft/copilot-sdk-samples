import type { Server } from "node:http";
import type { AddressInfo } from "node:net";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import app, {
  createDemoEnvironment,
  DEMO_CONFIGS,
  getDemoProcessSpec,
  getServerHost,
  isAllowedMutationOrigin,
  parseRunDemoBody,
} from "../../server/index.js";

describe("demo server security controls", () => {
  const helloWorld = DEMO_CONFIGS["hello-world"];

  describe("run request validation", () => {
    it("rejects request-supplied commands", () => {
      const result = parseRunDemoBody(
        {
          command: "touch /tmp/owned",
          mode: "live",
        },
        helloWorld,
      );

      expect(result).toEqual({
        success: false,
        error: "Unsupported field: command",
      });
    });

    it("rejects environment variables that are not allowlisted", () => {
      const result = parseRunDemoBody(
        {
          tokens: {
            GITHUB_TOKEN: "github-token",
            NODE_OPTIONS: "--require /tmp/payload.js",
          },
          mode: "live",
        },
        helloWorld,
      );

      expect(result).toEqual({
        success: false,
        error: "Unsupported token field: NODE_OPTIONS",
      });
    });

    it("rejects workflows that are not configured for the demo", () => {
      const result = parseRunDemoBody(
        { demoType: "ghaw" },
        DEMO_CONFIGS["issue-triage"],
      );

      expect(result).toEqual({
        success: false,
        error: "Demo issue-triage does not provide a GitHub Agentic Workflow",
      });
    });
  });

  describe("process construction", () => {
    it("uses a fixed Node executable and argument list for SDK demos", () => {
      const processSpec = getDemoProcessSpec(helloWorld, "sdk");

      expect(processSpec).toEqual({
        executable: process.execPath,
        args: ["--import", "tsx", "samples/hello-world/sdk/index.ts"],
      });
    });

    it("uses a fixed gh executable and argument list for workflows", () => {
      const processSpec = getDemoProcessSpec(helloWorld, "ghaw");

      expect(processSpec).toEqual({
        executable: "gh",
        args: ["aw", "run", ".github/aw/samples/hello-world.md"],
      });
    });

    it("copies only validated token fields into the child environment", () => {
      const bodyResult = parseRunDemoBody(
        {
          tokens: { GITHUB_TOKEN: "github-token" },
          mode: "live",
          params: { prompt: "Hello" },
        },
        helloWorld,
      );

      expect(bodyResult.success).toBe(true);
      if (!bodyResult.success) {
        throw new Error(bodyResult.error);
      }

      const environment = createDemoEnvironment(helloWorld, bodyResult.data, {
        PATH: "/usr/bin",
      });

      expect(environment).toEqual({
        PATH: "/usr/bin",
        CONNECTOR_MODE: "live",
        GITHUB_TOKEN: "github-token",
        SAMPLE_PROMPT: "Hello",
      });
    });
  });

  describe("HTTP boundary", () => {
    let server: Server;
    let baseUrl: string;

    beforeAll(async () => {
      server = app.listen(0, "127.0.0.1");
      await new Promise<void>((resolve) => {
        server.once("listening", resolve);
      });
      const address = server.address() as AddressInfo;
      baseUrl = `http://127.0.0.1:${address.port}`;
    });

    afterAll(async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }
          resolve();
        });
      });
    });

    it("does not grant cross-origin access", async () => {
      const response = await fetch(`${baseUrl}/api/demos`, {
        headers: { Origin: "https://attacker.example" },
      });

      expect(response.status).toBe(200);
      expect(response.headers.has("access-control-allow-origin")).toBe(false);
    });

    it("rejects cross-site mutation requests", async () => {
      const response = await fetch(`${baseUrl}/api/demos/hello-world/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Sec-Fetch-Site": "cross-site",
        },
        body: JSON.stringify({ mode: "mock" }),
      });

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        error: "Cross-site requests are not allowed",
      });
    });

    it("rejects mutation requests from untrusted origins", async () => {
      const response = await fetch(`${baseUrl}/api/demos/hello-world/run`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: "https://attacker.example",
        },
        body: JSON.stringify({ mode: "mock" }),
      });

      expect(response.status).toBe(403);
      await expect(response.json()).resolves.toEqual({
        error: "Request origin is not allowed",
      });
    });

    it("requires JSON for mutation requests", async () => {
      const response = await fetch(`${baseUrl}/api/demos/hello-world/run`, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: "mode=mock",
      });

      expect(response.status).toBe(415);
      await expect(response.json()).resolves.toEqual({
        error: "Content-Type must be application/json",
      });
    });

    it("rejects the former command injection payload before spawning", async () => {
      const response = await fetch(`${baseUrl}/api/demos/hello-world/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: "touch /tmp/owned",
          mode: "live",
        }),
      });

      expect(response.status).toBe(400);
      await expect(response.json()).resolves.toEqual({
        error: "Unsupported field: command",
      });
    });
  });

  it("binds to loopback unless a host is explicitly configured", () => {
    expect(getServerHost({})).toBe("127.0.0.1");
    expect(getServerHost({ HOST: "0.0.0.0" })).toBe("0.0.0.0");
  });

  it("allows only loopback or explicitly configured browser origins", () => {
    expect(isAllowedMutationOrigin(undefined)).toBe(true);
    expect(isAllowedMutationOrigin("http://localhost:5173")).toBe(true);
    expect(isAllowedMutationOrigin("http://127.0.0.1:5173")).toBe(true);
    expect(isAllowedMutationOrigin("https://attacker.example")).toBe(false);
    expect(
      isAllowedMutationOrigin(
        "https://samples.example.com",
        "https://samples.example.com",
      ),
    ).toBe(true);
  });
});
