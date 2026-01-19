# TypeScript Conventions

## General Rules

- Strict mode enabled (`strict: true` in tsconfig)
- Prefer `interface` over `type` for object shapes
- Use `const` assertions for literal types
- No `any` - use `unknown` and type guards instead

## Async Patterns

- All I/O operations are async
- Use `async/await` over `.then()` chains
- Handle errors with try/catch or Result types

## Imports

- Use named exports, not default exports
- Group imports: external deps, then internal, then types

## Error Handling

Use the `ConnectorResult` pattern for operations that can fail:

```typescript
// Good - explicit success/failure
const result = await connector.fetch();
if (result.success) {
  // TypeScript knows result.data exists
} else {
  // TypeScript knows result.error exists
}

// Avoid - throwing for expected failures
try {
  const data = await connector.fetch();
} catch (e) {
  // Loses type information
}
```

## Testing

- Use Vitest (configured in project)
- Prefer `describe`/`it` blocks
- Use `expectSuccess()` and `expectFailure()` helpers for connector tests
