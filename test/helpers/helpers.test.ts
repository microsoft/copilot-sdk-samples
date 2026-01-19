import { describe, it, expect } from "vitest";
import {
  createMockResult,
  createMockError,
  expectSuccess,
  expectFailure,
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
});
