import { describe, it, expect, vi } from "vitest";
import {
  createMockResult,
  createMockError,
  expectSuccess,
  expectFailure,
  createTimedMock,
  withTimeout,
  createSpyConnector,
} from "../helpers/index.js";
import { ErrorCodes, success, failure } from "../../shared/connectors/types.js";

describe("test/helpers", () => {
  describe("createMockResult", () => {
    it("should create a successful result", () => {
      const result = createMockResult({ foo: "bar" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ foo: "bar" });
    });
  });

  describe("createMockError", () => {
    it("should create a failure result with defaults", () => {
      const result = createMockError();

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCodes.INTERNAL_ERROR);
      expect(result.error?.message).toBe("Mock error");
    });

    it("should create a failure result with custom code and message", () => {
      const result = createMockError(ErrorCodes.NOT_FOUND, "Custom message");

      expect(result.success).toBe(false);
      expect(result.error?.code).toBe(ErrorCodes.NOT_FOUND);
      expect(result.error?.message).toBe("Custom message");
    });
  });

  describe("expectSuccess", () => {
    it("should not throw for successful results", () => {
      const result = success("data");

      expect(() => expectSuccess(result)).not.toThrow();
    });

    it("should throw for failure results", () => {
      const result = failure({ code: "ERR", message: "Error" });

      expect(() => expectSuccess(result)).toThrow(
        "Expected success but got error: Error",
      );
    });
  });

  describe("expectFailure", () => {
    it("should not throw for failure results", () => {
      const result = failure({
        code: ErrorCodes.NOT_FOUND,
        message: "Not found",
      });

      expect(() => expectFailure(result)).not.toThrow();
    });

    it("should throw for successful results", () => {
      const result = success("data");

      expect(() => expectFailure(result)).toThrow(
        "Expected failure but got success",
      );
    });

    it("should check error code when provided", () => {
      const result = failure({
        code: ErrorCodes.NOT_FOUND,
        message: "Not found",
      });

      expect(() => expectFailure(result, ErrorCodes.NOT_FOUND)).not.toThrow();
      expect(() => expectFailure(result, ErrorCodes.TIMEOUT)).toThrow(
        "Expected error code TIMEOUT but got NOT_FOUND",
      );
    });
  });

  describe("createTimedMock", () => {
    it("should return a function that resolves after delay", async () => {
      const mockValue = { data: "test" };
      const timedMock = createTimedMock(mockValue, 10);

      const start = Date.now();
      const result = await timedMock();
      const elapsed = Date.now() - start;

      expect(result).toEqual(mockValue);
      expect(elapsed).toBeGreaterThanOrEqual(9);
    });

    it("should use default delay of 10ms", async () => {
      const mockValue = "default delay";
      const timedMock = createTimedMock(mockValue);

      const start = Date.now();
      const result = await timedMock();
      const elapsed = Date.now() - start;

      expect(result).toBe(mockValue);
      expect(elapsed).toBeGreaterThanOrEqual(9);
    });

    it("should be callable as a vitest mock function", () => {
      const timedMock = createTimedMock("value", 5);

      expect(vi.isMockFunction(timedMock)).toBe(true);
    });
  });

  describe("withTimeout", () => {
    it("should resolve when promise completes before timeout", async () => {
      const fastPromise = Promise.resolve("fast result");

      const result = await withTimeout(fastPromise, 1000);

      expect(result).toBe("fast result");
    });

    it("should reject when promise takes longer than timeout", async () => {
      const slowPromise = new Promise<string>((resolve) =>
        setTimeout(() => resolve("slow result"), 200),
      );

      await expect(withTimeout(slowPromise, 50)).rejects.toThrow(
        "Timeout after 50ms",
      );
    });

    it("should use default timeout of 5000ms", async () => {
      const quickPromise = Promise.resolve("quick");

      const result = await withTimeout(quickPromise);

      expect(result).toBe("quick");
    });

    it("should preserve the result type", async () => {
      const typedPromise = Promise.resolve({ value: 42 });

      const result = await withTimeout(typedPromise, 1000);

      expect(result.value).toBe(42);
    });
  });

  describe("createSpyConnector", () => {
    it("should create spy methods for connector interface", () => {
      const spy = createSpyConnector();

      expect(spy).toHaveProperty("initialize");
      expect(spy).toHaveProperty("dispose");
      expect(spy).toHaveProperty("healthCheck");
    });

    it("should have initialize return success by default", async () => {
      const spy = createSpyConnector();

      const result = await spy.initialize();

      expect(result.success).toBe(true);
    });

    it("should have dispose resolve successfully", async () => {
      const spy = createSpyConnector();

      await expect(spy.dispose()).resolves.toBeUndefined();
    });

    it("should have healthCheck return healthy status", async () => {
      const spy = createSpyConnector();

      const result = await spy.healthCheck();

      expect(result.success).toBe(true);
      expect(result.data?.healthy).toBe(true);
      expect(result.data?.version).toBe("test");
    });

    it("should allow tracking calls", async () => {
      const spy = createSpyConnector();

      await spy.initialize();
      await spy.healthCheck();
      await spy.dispose();

      expect(spy.initialize).toHaveBeenCalledTimes(1);
      expect(spy.healthCheck).toHaveBeenCalledTimes(1);
      expect(spy.dispose).toHaveBeenCalledTimes(1);
    });

    it("should allow overriding default implementations", async () => {
      const spy = createSpyConnector();
      spy.healthCheck.mockResolvedValueOnce(
        success({ healthy: false, version: "error" }),
      );

      const result = await spy.healthCheck();

      expect(result.success).toBe(true);
      expect(result.data?.healthy).toBe(false);
    });
  });
});
