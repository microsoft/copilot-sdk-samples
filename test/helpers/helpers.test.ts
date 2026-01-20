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
    it("should create a mock function that resolves after delay", async () => {
      const mockFn = createTimedMock("test-value", 10);

      const start = Date.now();
      const result = await mockFn();
      const elapsed = Date.now() - start;

      expect(result).toBe("test-value");
      expect(elapsed).toBeGreaterThanOrEqual(9); // Allow 1ms variance
    });

    it("should use default delay of 10ms", async () => {
      const mockFn = createTimedMock({ data: "test" });

      const start = Date.now();
      await mockFn();
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(9);
    });

    it("should be callable as a vitest mock function", () => {
      const timedMock = createTimedMock("value", 5);

      expect(vi.isMockFunction(timedMock)).toBe(true);
    });
  });

  describe("withTimeout", () => {
    it("should resolve if promise completes before timeout", async () => {
      const promise = Promise.resolve("success");

      const result = await withTimeout(promise, 100);

      expect(result).toBe("success");
    });

    it("should reject if promise exceeds timeout", async () => {
      const slowPromise = new Promise((resolve) =>
        setTimeout(() => resolve("slow"), 100),
      );

      await expect(withTimeout(slowPromise, 10)).rejects.toThrow(
        "Timeout after 10ms",
      );
    });

    it("should use default timeout of 5000ms", async () => {
      const promise = Promise.resolve("fast");
      const result = await withTimeout(promise);

      expect(result).toBe("fast");
    });

    it("should preserve the result type", async () => {
      const typedPromise = Promise.resolve({ value: 42 });

      const result = await withTimeout(typedPromise, 1000);

      expect(result.value).toBe(42);
    });
  });

  describe("createSpyConnector", () => {
    it("should create a connector with all required methods", () => {
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
