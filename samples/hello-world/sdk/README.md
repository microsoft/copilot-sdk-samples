# Hello World (SDK)

Basic TypeScript SDK sample demonstrating core Copilot SDK functionality.

## What This Demonstrates

- Creating a `CopilotClient` instance
- Starting a session with a specified model
- Handling events (`assistant.message`, `session.idle`)
- Sending prompts and receiving responses
- Proper resource cleanup

## Running

```bash
# From project root
pnpm install
pnpm hello-world

# Or directly with tsx
pnpm tsx samples/hello-world/sdk/index.ts
```

## Code Walkthrough

1. **Client Creation**: Uses shared utilities to create a pre-configured client
2. **Session Creation**: Creates a session with the `gpt-5` model
3. **Event Handling**: Listens for `assistant.message` events to capture responses
4. **Completion Detection**: Uses `session.idle` event to know when response is complete
5. **Cleanup**: Destroys session and stops client
