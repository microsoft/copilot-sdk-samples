import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createACASessionsConnector,
  ACASessionsConnector,
} from "../../shared/connectors/aca-sessions/index.js";
import { ErrorCodes } from "../../shared/connectors/types.js";
import { expectSuccess, expectFailure } from "../helpers/index.js";

describe("shared/connectors/aca-sessions", () => {
  describe("MockACASessionsConnector", () => {
    let connector: ACASessionsConnector;

    beforeEach(async () => {
      connector = createACASessionsConnector({ mode: "mock" });
    });

    afterEach(async () => {
      await connector.dispose();
    });

    describe("initialization", () => {
      it("should create a mock connector", () => {
        expect(connector.name).toBe("aca-sessions");
        expect(connector.mode).toBe("mock");
        expect(connector.isInitialized).toBe(false);
      });

      it("should initialize successfully", async () => {
        const result = await connector.initialize();

        expectSuccess(result);
        expect(connector.isInitialized).toBe(true);
      });

      it("should dispose correctly", async () => {
        await connector.initialize();
        await connector.dispose();

        expect(connector.isInitialized).toBe(false);
      });
    });

    describe("healthCheck", () => {
      it("should return healthy status", async () => {
        await connector.initialize();
        const result = await connector.healthCheck();

        expectSuccess(result);
        expect(result.data?.healthy).toBe(true);
        expect(result.data?.version).toBe("mock-v1");
      });
    });

    describe("session management", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should create a session", async () => {
        const result = await connector.createSession();

        expectSuccess(result);
        expect(result.data?.id).toBeDefined();
        expect(result.data?.state).toBe("running");
        expect(result.data?.createdAt).toBeDefined();
      });

      it("should create a session with custom identifier", async () => {
        const result = await connector.createSession({
          identifier: "my-session",
        });

        expectSuccess(result);
        expect(result.data?.identifier).toBe("my-session");
      });

      it("should get an existing session", async () => {
        const createResult = await connector.createSession();
        expectSuccess(createResult);

        const getResult = await connector.getSession(createResult.data!.id);

        expectSuccess(getResult);
        expect(getResult.data?.id).toBe(createResult.data!.id);
      });

      it("should fail to get non-existent session", async () => {
        const result = await connector.getSession("non-existent");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should delete a session", async () => {
        const createResult = await connector.createSession();
        expectSuccess(createResult);

        const deleteResult = await connector.deleteSession(
          createResult.data!.id,
        );
        expectSuccess(deleteResult);

        const getResult = await connector.getSession(createResult.data!.id);
        expectFailure(getResult, ErrorCodes.NOT_FOUND);
      });

      it("should fail to delete non-existent session", async () => {
        const result = await connector.deleteSession("non-existent");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should fail when not initialized", async () => {
        await connector.dispose();
        const result = await connector.createSession();

        expectFailure(result, ErrorCodes.NOT_INITIALIZED);
      });
    });

    describe("code execution", () => {
      let sessionId: string;

      beforeEach(async () => {
        await connector.initialize();
        const createResult = await connector.createSession();
        expectSuccess(createResult);
        sessionId = createResult.data!.id;
      });

      it("should execute code and return result", async () => {
        const result = await connector.executeCode({
          sessionId,
          code: "2 + 2",
        });

        expectSuccess(result);
        expect(result.data?.executionTimeInMs).toBeGreaterThanOrEqual(0);
      });

      it("should capture stdout from print statements", async () => {
        const result = await connector.executeCode({
          sessionId,
          code: 'print("Hello, World!")',
        });

        expectSuccess(result);
        expect(result.data?.stdout).toContain("Hello, World!");
      });

      it("should capture stderr for errors", async () => {
        const result = await connector.executeCode({
          sessionId,
          code: 'raise Error("test error")',
        });

        expectSuccess(result);
        expect(result.data?.stderr).toContain("error");
      });

      it("should fail for non-existent session", async () => {
        const result = await connector.executeCode({
          sessionId: "non-existent",
          code: "1 + 1",
        });

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should update lastAccessedAt on execution", async () => {
        const beforeResult = await connector.getSession(sessionId);
        expectSuccess(beforeResult);
        const beforeAccess = beforeResult.data!.lastAccessedAt;

        await new Promise((resolve) => setTimeout(resolve, 10));

        await connector.executeCode({ sessionId, code: "1" });

        const afterResult = await connector.getSession(sessionId);
        expectSuccess(afterResult);
        expect(afterResult.data!.lastAccessedAt).not.toBe(beforeAccess);
      });
    });

    describe("variable management", () => {
      let sessionId: string;

      beforeEach(async () => {
        await connector.initialize();
        const createResult = await connector.createSession();
        expectSuccess(createResult);
        sessionId = createResult.data!.id;
      });

      it("should set and get a variable", async () => {
        const setResult = await connector.setVariable({
          sessionId,
          name: "myVar",
          value: "myValue",
        });
        expectSuccess(setResult);

        const getResult = await connector.getVariable({
          sessionId,
          name: "myVar",
        });
        expectSuccess(getResult);
        expect(getResult.data?.name).toBe("myVar");
        expect(getResult.data?.value).toBe("myValue");
      });

      it("should overwrite existing variable", async () => {
        await connector.setVariable({
          sessionId,
          name: "myVar",
          value: "initial",
        });

        await connector.setVariable({
          sessionId,
          name: "myVar",
          value: "updated",
        });

        const getResult = await connector.getVariable({
          sessionId,
          name: "myVar",
        });
        expectSuccess(getResult);
        expect(getResult.data?.value).toBe("updated");
      });

      it("should fail to get non-existent variable", async () => {
        const result = await connector.getVariable({
          sessionId,
          name: "nonExistent",
        });

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should list all variables", async () => {
        await connector.setVariable({ sessionId, name: "var1", value: "a" });
        await connector.setVariable({ sessionId, name: "var2", value: "b" });

        const result = await connector.listVariables(sessionId);

        expectSuccess(result);
        expect(result.data?.length).toBe(2);
        expect(result.data?.map((v) => v.name).sort()).toEqual([
          "var1",
          "var2",
        ]);
      });

      it("should return empty array when no variables", async () => {
        const result = await connector.listVariables(sessionId);

        expectSuccess(result);
        expect(result.data).toEqual([]);
      });

      it("should fail for non-existent session", async () => {
        const result = await connector.setVariable({
          sessionId: "non-existent",
          name: "var",
          value: "val",
        });

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("file operations", () => {
      let sessionId: string;

      beforeEach(async () => {
        await connector.initialize();
        const createResult = await connector.createSession();
        expectSuccess(createResult);
        sessionId = createResult.data!.id;
      });

      it("should upload and download a file", async () => {
        const content = "Hello, file content!";
        const uploadResult = await connector.uploadFile({
          sessionId,
          fileName: "test.txt",
          content,
        });

        expectSuccess(uploadResult);
        expect(uploadResult.data?.name).toBe("test.txt");
        expect(uploadResult.data?.size).toBe(content.length);

        const downloadResult = await connector.downloadFile({
          sessionId,
          fileName: "test.txt",
        });

        expectSuccess(downloadResult);
        expect(downloadResult.data).toBe(content);
      });

      it("should overwrite existing file", async () => {
        await connector.uploadFile({
          sessionId,
          fileName: "test.txt",
          content: "initial",
        });

        await connector.uploadFile({
          sessionId,
          fileName: "test.txt",
          content: "updated",
        });

        const downloadResult = await connector.downloadFile({
          sessionId,
          fileName: "test.txt",
        });

        expectSuccess(downloadResult);
        expect(downloadResult.data).toBe("updated");
      });

      it("should fail to download non-existent file", async () => {
        const result = await connector.downloadFile({
          sessionId,
          fileName: "nonexistent.txt",
        });

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should list all files", async () => {
        await connector.uploadFile({
          sessionId,
          fileName: "a.txt",
          content: "a",
        });
        await connector.uploadFile({
          sessionId,
          fileName: "b.txt",
          content: "bb",
        });

        const result = await connector.listFiles({ sessionId });

        expectSuccess(result);
        expect(result.data?.length).toBe(2);
        expect(result.data?.map((f) => f.name).sort()).toEqual([
          "a.txt",
          "b.txt",
        ]);
      });

      it("should return empty array when no files", async () => {
        const result = await connector.listFiles({ sessionId });

        expectSuccess(result);
        expect(result.data).toEqual([]);
      });

      it("should fail for non-existent session", async () => {
        const result = await connector.uploadFile({
          sessionId: "non-existent",
          fileName: "test.txt",
          content: "test",
        });

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });
  });

  describe("LiveACASessionsConnector", () => {
    it("should require pool management endpoint for initialization", async () => {
      const connector = createACASessionsConnector({ mode: "live" });
      const result = await connector.initialize();

      expectFailure(result, ErrorCodes.AUTH_REQUIRED);
    });

    it("should require credential for initialization", async () => {
      const connector = createACASessionsConnector({
        mode: "live",
        poolManagementEndpoint: "https://example.com",
      });
      const result = await connector.initialize();

      expectFailure(result, ErrorCodes.AUTH_REQUIRED);
    });

    it("should initialize with endpoint and credential", async () => {
      const connector = createACASessionsConnector({
        mode: "live",
        poolManagementEndpoint: "https://example.com",
        credential: "test-credential",
      });
      const result = await connector.initialize();

      expectSuccess(result);
      expect(connector.isInitialized).toBe(true);
    });

    it("should return NOT_IMPLEMENTED for operations", async () => {
      const connector = createACASessionsConnector({
        mode: "live",
        poolManagementEndpoint: "https://example.com",
        credential: "test-credential",
      });
      await connector.initialize();

      const result = await connector.createSession();
      expectFailure(result, ErrorCodes.NOT_IMPLEMENTED);
    });
  });
});
