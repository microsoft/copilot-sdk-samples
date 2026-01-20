import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

const { mockStart, mockStop, mockCreateSession, MockCopilotClient } =
  vi.hoisted(() => {
    const mockStart = vi.fn();
    const mockStop = vi.fn();
    const mockCreateSession = vi.fn();

    class MockCopilotClient {
      options: unknown;
      start = mockStart;
      stop = mockStop;
      createSession = mockCreateSession;

      constructor(options: unknown) {
        this.options = options;
      }
    }

    return { mockStart, mockStop, mockCreateSession, MockCopilotClient };
  });

vi.mock("@github/copilot-sdk", () => ({
  CopilotClient: MockCopilotClient,
}));

import {
  createClient,
  runSample,
  DEFAULT_MODEL,
} from "../../../shared/client.js";

describe("hello-world sample", () => {
  const mockSession = {
    on: vi.fn(),
    send: vi.fn(),
    destroy: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockStart.mockResolvedValue(undefined);
    mockStop.mockResolvedValue(undefined);
    mockCreateSession.mockResolvedValue(mockSession);
  });

  describe("sample dependencies", () => {
    describe("DEFAULT_MODEL", () => {
      it("should be defined and non-empty", () => {
        expect(DEFAULT_MODEL).toBeDefined();
        expect(typeof DEFAULT_MODEL).toBe("string");
        expect(DEFAULT_MODEL.length).toBeGreaterThan(0);
      });
    });

    describe("createClient", () => {
      it("should create a client instance", () => {
        const client = createClient();
        expect(client).toBeDefined();
        expect(typeof client.start).toBe("function");
        expect(typeof client.stop).toBe("function");
      });
    });
  });

  describe("sample execution pattern", () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it("should execute the sample workflow correctly", async () => {
      const result = await runSample(
        {
          name: "Test Sample",
          description: "Test description",
        },
        async (client) => {
          expect(client).toBeDefined();
          expect(typeof client.start).toBe("function");
          expect(typeof client.stop).toBe("function");

          return "success";
        },
      );

      expect(result).toBe("success");
      expect(mockStart).toHaveBeenCalledTimes(1);
      expect(mockStop).toHaveBeenCalledTimes(1);
    });

    it("should start and stop client lifecycle correctly", async () => {
      const callOrder: string[] = [];

      mockStart.mockImplementation(async () => {
        callOrder.push("start");
      });
      mockStop.mockImplementation(async () => {
        callOrder.push("stop");
      });

      await runSample(
        { name: "Lifecycle Test", description: "Test" },
        async () => {
          callOrder.push("callback");
          return null;
        },
      );

      expect(callOrder).toEqual(["start", "callback", "stop"]);
    });

    it("should stop client even on error", async () => {
      await expect(
        runSample({ name: "Error Test", description: "Test" }, async () => {
          throw new Error("Test error");
        }),
      ).rejects.toThrow("Test error");

      expect(mockStop).toHaveBeenCalledTimes(1);
    });

    it("should print sample name and description", async () => {
      await runSample(
        {
          name: "A test sample",
          description: "Some description here",
        },
        async () => "done",
      );

      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("A test sample"),
      );
      expect(consoleLogSpy).toHaveBeenCalledWith(
        expect.stringContaining("Some description here"),
      );
    });
  });

  describe("session pattern", () => {
    let consoleLogSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleLogSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleLogSpy.mockRestore();
    });

    it("should support creating a session with model config", async () => {
      await runSample(
        {
          name: "Session Test",
          description: "Test session creation",
        },
        async (client) => {
          const session = await client.createSession({
            model: DEFAULT_MODEL,
          });

          expect(session).toBeDefined();
          expect(mockCreateSession).toHaveBeenCalledWith({
            model: DEFAULT_MODEL,
          });

          return session;
        },
      );
    });
  });
});
