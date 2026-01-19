import { describe, it, expect } from "vitest";
import {
  success,
  failure,
  ErrorCodes,
  type ConnectorResult,
  type ConnectorError,
} from "../../shared/connectors/types.js";

describe("shared/connectors/types", () => {
  describe("success helper", () => {
    it("should create a successful result with data", () => {
      const result = success({ foo: "bar" });

      expect(result.success).toBe(true);
      expect(result.data).toEqual({ foo: "bar" });
      expect(result.error).toBeUndefined();
    });

    it("should include metadata when provided", () => {
      const result = success("data", { durationMs: 100, requestId: "req-123" });

      expect(result.success).toBe(true);
      expect(result.data).toBe("data");
      expect(result.metadata?.durationMs).toBe(100);
      expect(result.metadata?.requestId).toBe("req-123");
    });

    it("should handle undefined data", () => {
      const result = success(undefined);

      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
    });

    it("should handle null data", () => {
      const result = success(null);

      expect(result.success).toBe(true);
      expect(result.data).toBeNull();
    });

    it("should handle array data", () => {
      const result = success([1, 2, 3]);

      expect(result.success).toBe(true);
      expect(result.data).toEqual([1, 2, 3]);
    });
  });

  describe("failure helper", () => {
    it("should create a failure result with error", () => {
      const error: ConnectorError = {
        code: ErrorCodes.NOT_FOUND,
        message: "Resource not found",
      };
      const result = failure(error);

      expect(result.success).toBe(false);
      expect(result.error).toEqual(error);
      expect(result.data).toBeUndefined();
    });

    it("should include metadata when provided", () => {
      const error: ConnectorError = {
        code: ErrorCodes.TIMEOUT,
        message: "Request timed out",
      };
      const result = failure(error, { durationMs: 5000 });

      expect(result.success).toBe(false);
      expect(result.error).toEqual(error);
      expect(result.metadata?.durationMs).toBe(5000);
    });

    it("should preserve error cause when provided", () => {
      const originalError = new Error("Original error");
      const error: ConnectorError = {
        code: ErrorCodes.INTERNAL_ERROR,
        message: "Wrapped error",
        cause: originalError,
      };
      const result = failure(error);

      expect(result.error?.cause).toBe(originalError);
    });

    it("should include retryable flag", () => {
      const error: ConnectorError = {
        code: ErrorCodes.RATE_LIMITED,
        message: "Rate limit exceeded",
        retryable: true,
      };
      const result = failure(error);

      expect(result.error?.retryable).toBe(true);
    });
  });

  describe("ErrorCodes", () => {
    it("should have authentication error codes", () => {
      expect(ErrorCodes.AUTH_REQUIRED).toBe("AUTH_REQUIRED");
      expect(ErrorCodes.AUTH_EXPIRED).toBe("AUTH_EXPIRED");
      expect(ErrorCodes.AUTH_INVALID).toBe("AUTH_INVALID");
    });

    it("should have network error codes", () => {
      expect(ErrorCodes.NETWORK_ERROR).toBe("NETWORK_ERROR");
      expect(ErrorCodes.TIMEOUT).toBe("TIMEOUT");
      expect(ErrorCodes.RATE_LIMITED).toBe("RATE_LIMITED");
    });

    it("should have resource error codes", () => {
      expect(ErrorCodes.NOT_FOUND).toBe("NOT_FOUND");
      expect(ErrorCodes.ALREADY_EXISTS).toBe("ALREADY_EXISTS");
      expect(ErrorCodes.CONFLICT).toBe("CONFLICT");
    });

    it("should have validation error codes", () => {
      expect(ErrorCodes.VALIDATION_ERROR).toBe("VALIDATION_ERROR");
      expect(ErrorCodes.INVALID_INPUT).toBe("INVALID_INPUT");
    });

    it("should have internal error codes", () => {
      expect(ErrorCodes.INTERNAL_ERROR).toBe("INTERNAL_ERROR");
      expect(ErrorCodes.NOT_INITIALIZED).toBe("NOT_INITIALIZED");
      expect(ErrorCodes.NOT_IMPLEMENTED).toBe("NOT_IMPLEMENTED");
    });
  });

  describe("type safety", () => {
    it("should narrow success type correctly", () => {
      const result: ConnectorResult<string> = success("test");

      if (result.success) {
        const data: string | undefined = result.data;
        expect(data).toBe("test");
      }
    });

    it("should narrow failure type correctly", () => {
      const result: ConnectorResult<string> = failure({
        code: ErrorCodes.NOT_FOUND,
        message: "Not found",
      });

      if (!result.success) {
        const error: ConnectorError | undefined = result.error;
        expect(error?.code).toBe(ErrorCodes.NOT_FOUND);
      }
    });
  });
});
