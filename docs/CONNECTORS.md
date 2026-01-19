# Connector Development

## ConnectorResult Pattern

All connectors return a discriminated union:

```typescript
type ConnectorResult<T> =
  | { success: true; data: T }
  | { success: false; error: ConnectorError };
```

Use helper functions:

```typescript
import { success, failure } from "../shared/connectors/types";

// Return success
return success(data);

// Return failure
return failure({ code: ErrorCodes.NOT_FOUND, message: "Resource not found" });
```

## Creating a New Connector

1. Create `shared/connectors/<name>/`
2. Implement the connector interface
3. Create mock implementation with seeded data
4. Create live stub (for future API integration)
5. Export factory function: `createXxxConnector({ mode: 'mock' | 'live' })`

## Mock vs Live Mode

| Mode             | Usage                   | Data Source      |
| ---------------- | ----------------------- | ---------------- |
| `mock` (default) | Development, CI, demos  | Seeded test data |
| `live`           | Production, integration | Real API calls   |

## Testing Connectors

```typescript
import { expectSuccess, expectFailure } from "../../test/helpers";

const result = await connector.someMethod();
expectSuccess(result); // Asserts success and narrows type
```
