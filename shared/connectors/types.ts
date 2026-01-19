/**
 * Base types for all connectors in the Copilot SDK samples.
 *
 * Connectors follow a consistent interface pattern:
 * - All methods are async
 * - Each connector has a corresponding mock implementation
 * - Connectors can operate in "live" or "mock" mode
 */

/**
 * Connector operation mode
 */
export type ConnectorMode = "live" | "mock";

/**
 * Base configuration shared by all connectors
 */
export interface BaseConnectorConfig {
  /** Operation mode - "live" uses real APIs, "mock" uses test fixtures */
  mode: ConnectorMode;
  /** Enable debug logging */
  debug?: boolean;
}

/**
 * Result wrapper for connector operations
 * Provides consistent error handling and metadata
 */
export interface ConnectorResult<T> {
  /** Whether the operation succeeded */
  success: boolean;
  /** The result data (only present on success) */
  data?: T;
  /** Error information (only present on failure) */
  error?: ConnectorError;
  /** Operation metadata */
  metadata?: ConnectorMetadata;
}

/**
 * Standardized error information
 */
export interface ConnectorError {
  /** Error code for programmatic handling */
  code: string;
  /** Human-readable error message */
  message: string;
  /** Original error (if wrapping an underlying error) */
  cause?: unknown;
  /** Whether this error is retryable */
  retryable?: boolean;
}

/**
 * Operation metadata
 */
export interface ConnectorMetadata {
  /** Time taken for the operation in milliseconds */
  durationMs?: number;
  /** Request ID for tracing */
  requestId?: string;
  /** Rate limit information */
  rateLimit?: RateLimitInfo;
}

/**
 * Rate limit information from API responses
 */
export interface RateLimitInfo {
  /** Remaining requests in the current window */
  remaining: number;
  /** Total requests allowed per window */
  limit: number;
  /** When the rate limit resets (Unix timestamp) */
  resetAt: number;
}

/**
 * Base interface for all connectors
 * Each connector implementation must satisfy this contract
 */
export interface BaseConnector {
  /** Connector identifier */
  readonly name: string;
  /** Current operation mode */
  readonly mode: ConnectorMode;
  /** Whether the connector is initialized */
  readonly isInitialized: boolean;

  /**
   * Initialize the connector (authenticate, setup, etc.)
   */
  initialize(): Promise<ConnectorResult<void>>;

  /**
   * Clean up resources
   */
  dispose(): Promise<void>;

  /**
   * Health check - verify the connector can communicate with its backend
   */
  healthCheck(): Promise<ConnectorResult<HealthCheckResponse>>;
}

/**
 * Health check response
 */
export interface HealthCheckResponse {
  /** Whether the service is healthy */
  healthy: boolean;
  /** Service version (if available) */
  version?: string;
  /** Additional status information */
  details?: Record<string, unknown>;
}

/**
 * Factory function type for creating connectors
 */
export type ConnectorFactory<
  TConfig extends BaseConnectorConfig,
  TConnector extends BaseConnector,
> = (config: TConfig) => TConnector;

/**
 * Helper to create a successful result
 */
export function success<T>(
  data: T,
  metadata?: ConnectorMetadata,
): ConnectorResult<T> {
  return { success: true, data, metadata };
}

/**
 * Helper to create a failure result
 */
export function failure<T>(
  error: ConnectorError,
  metadata?: ConnectorMetadata,
): ConnectorResult<T> {
  return { success: false, error, metadata };
}

/**
 * Common error codes used across connectors
 */
export const ErrorCodes = {
  // Authentication errors
  AUTH_REQUIRED: "AUTH_REQUIRED",
  AUTH_EXPIRED: "AUTH_EXPIRED",
  AUTH_INVALID: "AUTH_INVALID",

  // Network errors
  NETWORK_ERROR: "NETWORK_ERROR",
  TIMEOUT: "TIMEOUT",
  RATE_LIMITED: "RATE_LIMITED",

  // Resource errors
  NOT_FOUND: "NOT_FOUND",
  ALREADY_EXISTS: "ALREADY_EXISTS",
  CONFLICT: "CONFLICT",

  // Validation errors
  VALIDATION_ERROR: "VALIDATION_ERROR",
  INVALID_INPUT: "INVALID_INPUT",

  // Internal errors
  INTERNAL_ERROR: "INTERNAL_ERROR",
  NOT_INITIALIZED: "NOT_INITIALIZED",
  NOT_IMPLEMENTED: "NOT_IMPLEMENTED",
} as const;

export type ErrorCode = (typeof ErrorCodes)[keyof typeof ErrorCodes];
