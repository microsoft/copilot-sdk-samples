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

  try {
    await client.start();
    return await fn(client);
  } finally {
    await client.stop();
    console.log(`\n--- Completed: ${config.name} ---\n`);
  }
}

/**
 * Default model to use across samples
 */
export const DEFAULT_MODEL = "gpt-5";
