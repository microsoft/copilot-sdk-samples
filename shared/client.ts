/**
 * Shared utilities for Copilot SDK samples
 */
import { CopilotClient, CopilotClientOptions } from "@github/copilot-sdk";

export interface SampleConfig {
  name: string;
  description: string;
  model?: string;
}

type LogLevel = "info" | "debug" | "error" | "warning" | "none" | "all";

/**
 * Creates a configured Copilot client with common defaults
 */
export function createClient(
  options?: Partial<CopilotClientOptions>,
): CopilotClient {
  const logLevel = (process.env.LOG_LEVEL as LogLevel) || "info";
  return new CopilotClient({
    logLevel,
    ...options,
  });
}

/**
 * Wraps sample execution with proper setup/teardown
 */
export async function runSample<T>(
  config: SampleConfig,
  fn: (client: CopilotClient) => Promise<T>,
): Promise<T> {
  console.log(`\n--- Running: ${config.name} ---`);
  console.log(`Description: ${config.description}\n`);

  const client = createClient();

  let result: T;
  try {
    await client.start();
    result = await fn(client);
  } finally {
    // Gracefully stop client - ignore stream errors that can occur
    // when the jsonrpc connection is closing while pending writes exist
    try {
      await client.stop();
    } catch (stopError) {
      // ERR_STREAM_DESTROYED is expected and harmless when the connection
      // is already closing (e.g., after session.destroy())
      const isStreamDestroyedError =
        stopError instanceof Error &&
        (stopError.message.includes("stream was destroyed") ||
          (stopError as NodeJS.ErrnoException).code === "ERR_STREAM_DESTROYED");

      if (!isStreamDestroyedError) {
        // Log unexpected errors but don't throw from finally block
        console.error("Unexpected error stopping client:", stopError);
      }
    }
    console.log(`\n--- Completed: ${config.name} ---\n`);
  }
  return result;
}

/**
 * Default model to use across samples
 */
export const DEFAULT_MODEL = "gpt-5";
