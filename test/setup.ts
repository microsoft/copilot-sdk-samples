/**
 * Test setup file for vitest
 * Configures global mocks and test utilities
 */
import { vi, beforeEach, afterEach } from "vitest";

// Reset all mocks before each test
beforeEach(() => {
  vi.resetAllMocks();
});

// Cleanup after each test
afterEach(() => {
  vi.restoreAllMocks();
});
