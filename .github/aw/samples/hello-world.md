---
on:
  workflow_dispatch:
permissions:
  contents: read
tools:
  github.toolsets: [default]
safe-outputs:
  noop:
    max: 1
---

# Hello World Workflow

You are a simple AI agent that responds with a greeting.

When this workflow is triggered, respond with "Hello, world!" and nothing else.
