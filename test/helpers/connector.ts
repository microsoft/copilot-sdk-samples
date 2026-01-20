import { vi } from "vitest";
import {
  ConnectorResult,
  ConnectorError,
  success,
  failure,
  ErrorCodes,
} from "../../shared/connectors/types.js";

export function createMockResult<T>(data: T): ConnectorResult<T> {
  return success(data);
}

export function createMockError(
  code: string = ErrorCodes.INTERNAL_ERROR,
  message: string = "Mock error",
): ConnectorResult<never> {
  return failure({ code, message });
}

export function expectSuccess<T>(
  result: ConnectorResult<T>,
): asserts result is ConnectorResult<T> & { success: true; data: T } {
  if (!result.success) {
    throw new Error(`Expected success but got error: ${result.error?.message}`);
  }
}

export function expectFailure<T>(
  result: ConnectorResult<T>,
  expectedCode?: string,
): asserts result is ConnectorResult<T> & {
  success: false;
  error: ConnectorError;
} {
  if (result.success) {
    throw new Error(`Expected failure but got success`);
  }
  if (expectedCode && result.error?.code !== expectedCode) {
    throw new Error(
      `Expected error code ${expectedCode} but got ${result.error?.code}`,
    );
  }
}

export function createTimedMock<T>(
  value: T,
  delayMs: number = 10,
): () => Promise<T> {
  return vi
    .fn()
    .mockImplementation(
      () => new Promise((resolve) => setTimeout(() => resolve(value), delayMs)),
    );
}

export async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number = 5000,
): Promise<T> {
  const timeout = new Promise<never>((_, reject) =>
    setTimeout(
      () => reject(new Error(`Timeout after ${timeoutMs}ms`)),
      timeoutMs,
    ),
  );
  return Promise.race([promise, timeout]);
}

export interface SpyConnector {
  initialize: ReturnType<typeof vi.fn<() => Promise<ConnectorResult<void>>>>;
  dispose: ReturnType<typeof vi.fn<() => Promise<void>>>;
  healthCheck: ReturnType<
    typeof vi.fn<
      () => Promise<ConnectorResult<{ healthy: boolean; version: string }>>
    >
  >;
}

export function createSpyConnector(): SpyConnector {
  return {
    initialize: vi.fn().mockResolvedValue(success(undefined)),
    dispose: vi.fn().mockResolvedValue(undefined),
    healthCheck: vi
      .fn()
      .mockResolvedValue(success({ healthy: true, version: "test" })),
  };
}
