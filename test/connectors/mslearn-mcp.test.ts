import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createMSLearnMCPClient,
  MSLearnMCPClient,
} from "../../shared/connectors/mslearn-mcp/index.js";
import { ErrorCodes } from "../../shared/connectors/types.js";
import { expectSuccess, expectFailure } from "../helpers/index.js";

describe("shared/connectors/mslearn-mcp", () => {
  describe("MockMSLearnMCPClient", () => {
    let client: MSLearnMCPClient;

    beforeEach(async () => {
      client = createMSLearnMCPClient({ mode: "mock" });
    });

    afterEach(async () => {
      await client.dispose();
    });

    describe("initialization", () => {
      it("should create a mock client", () => {
        expect(client.name).toBe("mslearn-mcp");
        expect(client.mode).toBe("mock");
        expect(client.isInitialized).toBe(false);
      });

      it("should initialize successfully", async () => {
        const result = await client.initialize();

        expectSuccess(result);
        expect(client.isInitialized).toBe(true);
      });

      it("should dispose correctly", async () => {
        await client.initialize();
        await client.dispose();

        expect(client.isInitialized).toBe(false);
      });
    });

    describe("searchDocs", () => {
      beforeEach(async () => {
        await client.initialize();
      });

      it("should return results for azure query", async () => {
        const result = await client.searchDocs("azure functions");

        expectSuccess(result);
        expect(result.data?.length).toBeGreaterThan(0);
        expect(result.data?.[0].title).toContain("Azure");
      });

      it("should return results for mcp query", async () => {
        const result = await client.searchDocs("mcp");

        expectSuccess(result);
        expect(result.data?.length).toBeGreaterThan(0);
        expect(result.data?.[0].title).toContain("MCP");
      });

      it("should return generic results for unknown query", async () => {
        const result = await client.searchDocs("unknown topic xyz");

        expectSuccess(result);
        expect(result.data?.length).toBe(1);
      });

      it("should fail if not initialized", async () => {
        await client.dispose();
        const result = await client.searchDocs("test");

        expectFailure(result, ErrorCodes.NOT_INITIALIZED);
      });
    });

    describe("fetchDoc", () => {
      beforeEach(async () => {
        await client.initialize();
      });

      it("should fetch azure functions overview", async () => {
        const result = await client.fetchDoc(
          "https://learn.microsoft.com/en-us/azure/azure-functions/functions-overview",
        );

        expectSuccess(result);
        expect(result.data).toContain("Azure Functions");
        expect(result.data).toContain("serverless");
      });

      it("should fetch mcp documentation", async () => {
        const result = await client.fetchDoc(
          "https://learn.microsoft.com/en-us/training/support/mcp",
        );

        expectSuccess(result);
        expect(result.data).toContain("MCP");
      });

      it("should reject non-microsoft URLs", async () => {
        const result = await client.fetchDoc("https://example.com/page");

        expectFailure(result, ErrorCodes.VALIDATION_ERROR);
      });

      it("should fail if not initialized", async () => {
        await client.dispose();
        const result = await client.fetchDoc(
          "https://learn.microsoft.com/test",
        );

        expectFailure(result, ErrorCodes.NOT_INITIALIZED);
      });
    });

    describe("searchCodeSamples", () => {
      beforeEach(async () => {
        await client.initialize();
      });

      it("should return samples for azure query", async () => {
        const result = await client.searchCodeSamples(
          "azure functions",
          "typescript",
        );

        expectSuccess(result);
        expect(result.data?.length).toBeGreaterThan(0);
        expect(result.data?.[0].language).toBe("typescript");
        expect(result.data?.[0].code).toContain("azure");
      });

      it("should default to typescript language", async () => {
        const result = await client.searchCodeSamples("some query");

        expectSuccess(result);
        expect(result.data?.[0].language).toBe("typescript");
      });

      it("should fail if not initialized", async () => {
        await client.dispose();
        const result = await client.searchCodeSamples("test");

        expectFailure(result, ErrorCodes.NOT_INITIALIZED);
      });
    });
  });

  describe("LiveMSLearnMCPClient", () => {
    it("should initialize successfully", async () => {
      const client = createMSLearnMCPClient({ mode: "live" });
      const result = await client.initialize();

      expectSuccess(result);
      expect(client.isInitialized).toBe(true);
    });

    it("should return NOT_IMPLEMENTED for searchDocs", async () => {
      const client = createMSLearnMCPClient({ mode: "live" });
      await client.initialize();

      const result = await client.searchDocs("test");
      expectFailure(result, ErrorCodes.NOT_IMPLEMENTED);
    });

    it("should return NOT_IMPLEMENTED for fetchDoc", async () => {
      const client = createMSLearnMCPClient({ mode: "live" });
      await client.initialize();

      const result = await client.fetchDoc("https://learn.microsoft.com/test");
      expectFailure(result, ErrorCodes.NOT_IMPLEMENTED);
    });

    it("should return NOT_IMPLEMENTED for searchCodeSamples", async () => {
      const client = createMSLearnMCPClient({ mode: "live" });
      await client.initialize();

      const result = await client.searchCodeSamples("test");
      expectFailure(result, ErrorCodes.NOT_IMPLEMENTED);
    });
  });
});
