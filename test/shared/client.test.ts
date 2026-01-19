/**
 * Unit tests for shared/client.ts
 *
 * Tests the core client utilities used across samples:
 * - createClient() - factory function for CopilotClient
 * - runSample() - sample execution wrapper
 * - DEFAULT_MODEL constant
 */
import { describe, it, expect, vi, beforeEach, afterEach, Mock } from "vitest";

// Create hoisted mock functions
const { mockStart, mockStop, MockCopilotClient } = vi.hoisted(() => {
  const mockStart = vi.fn();
  const mockStop = vi.fn();

  class MockCopilotClient {
    options: unknown;
    start: Mock;
    stop: Mock;

    constructor(options: unknown) {
      this.options = options;
      this.start = mockStart;
      this.stop = mockStop;
    }
  }

  return { mockStart, mockStop, MockCopilotClient };
});

// Mock the @github/copilot-sdk module with a class
vi.mock("@github/copilot-sdk", () => ({
  CopilotClient: MockCopilotClient,
}));

// Import after mocking
import {
  createClient,
  runSample,
  DEFAULT_MODEL,
  SampleConfig,
} from "../../shared/client.js";

describe("shared/client", () => {
  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();
    mockStart.mockResolvedValue(undefined);
    mockStop.mockResolvedValue(undefined);
    // Reset environment variables
    delete process.env.LOG_LEVEL;
  });

  describe("DEFAULT_MODEL", () => {
    it("should be defined", () => {
      expect(DEFAULT_MODEL).toBeDefined();
    });

    it("should be a non-empty string", () => {
      expect(typeof DEFAULT_MODEL).toBe("string");
      expect(DEFAULT_MODEL.length).toBeGreaterThan(0);
    });

    it("should have the expected value", () => {
      expect(DEFAULT_MODEL).toBe("gpt-5");
    });
  });

  describe("createClient", () => {
    it("should create a CopilotClient instance", () => {
      const client = createClient();
      expect(client).toBeDefined();
      expect(client).toBeInstanceOf(MockCopilotClient);
    });

    it("should use default logLevel 'info' when LOG_LEVEL env is not set", () => {
      const client = createClient();
      expect(
        (client as unknown as { options: { logLevel: string } }).options
          .logLevel,
      ).toBe("info");
    });

    it("should use LOG_LEVEL environment variable when set", () => {
      process.env.LOG_LEVEL = "debug";
      const client = createClient();
      expect(
        (client as unknown as { options: { logLevel: string } }).options
          .logLevel,
      ).toBe("debug");
    });

    it("should merge provided options with defaults", () => {
      const client = createClient({ logLevel: "debug" });
      expect(
        (client as unknown as { options: { logLevel: string } }).options
          .logLevel,
      ).toBe("debug");
    });

    it("should allow overriding logLevel through options", () => {
      const client = createClient({ logLevel: "error" });
      expect(
        (client as unknown as { options: { logLevel: string } }).options
          .logLevel,
      ).toBe("error");
    });
  });

  describe("runSample", () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;
    const mockConfig: SampleConfig = {
      name: "Test Sample",
      description: "A test sample description",
    };

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it("should log sample name and description at start", async () => {
      await runSample(mockConfig, async () => "result");

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Running: Test Sample"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("A test sample description"),
      );
    });

    it("should log completion message when done", async () => {
      await runSample(mockConfig, async () => "result");

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Completed: Test Sample"),
      );
    });

    it("should start the client before executing the sample function", async () => {
      let clientStarted = false;

      await runSample(mockConfig, async (client) => {
        // The client's start method should have been called
        expect(client.start).toHaveBeenCalled();
        clientStarted = true;
        return "result";
      });

      expect(clientStarted).toBe(true);
    });

    it("should pass the client to the sample function", async () => {
      await runSample(mockConfig, async (client) => {
        expect(client).toBeDefined();
        expect(typeof client.start).toBe("function");
        expect(typeof client.stop).toBe("function");
        return "result";
      });
    });

    it("should return the result from the sample function", async () => {
      const expectedResult = { data: "test data" };
      const result = await runSample(mockConfig, async () => expectedResult);
      expect(result).toEqual(expectedResult);
    });

    it("should stop the client after successful execution", async () => {
      await runSample(mockConfig, async () => "result");
      expect(mockStop).toHaveBeenCalled();
    });

    it("should stop the client even when the sample function throws", async () => {
      try {
        await runSample(mockConfig, async () => {
          throw new Error("Test error");
        });
      } catch {
        // Expected to throw
      }

      expect(mockStop).toHaveBeenCalled();
    });

    it("should propagate errors from the sample function", async () => {
      await expect(
        runSample(mockConfig, async () => {
          throw new Error("Sample execution failed");
        }),
      ).rejects.toThrow("Sample execution failed");
    });

    it("should handle async sample functions correctly", async () => {
      const result = await runSample(mockConfig, async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return "async result";
      });

      expect(result).toBe("async result");
    });
  });

  describe("SampleConfig", () => {
    it("should accept a config with just name and description", () => {
      const config: SampleConfig = {
        name: "Test",
        description: "Test description",
      };
      expect(config.name).toBe("Test");
      expect(config.description).toBe("Test description");
      expect(config.model).toBeUndefined();
    });

    it("should accept a config with optional model", () => {
      const config: SampleConfig = {
        name: "Test",
        description: "Test description",
        model: "gpt-4",
      };
      expect(config.model).toBe("gpt-4");
    });
  });
});
