# Skill Testing (SDK)

Test harness for evaluating and validating Copilot [agent skills](https://devblogs.microsoft.com/all-things-azure/context-driven-development-agent-skills-for-microsoft-foundry-and-azure/).

## What This Demonstrates

- Skill file parsing and validation
- Automated test case execution
- Multiple test criteria (compile, output, test passes)
- Verbose mode for debugging
- Skill organization and discovery

## SDK Usage

```typescript
import { parseSkillContent } from "./parser.js";
import { createSkillTestHarness } from "./harness.js";

const skill = parseSkillContent(skillMarkdown);
const harness = createSkillTestHarness({ mode: "mock", verbose: true });
await harness.initialize();
const results = await harness.runTestSuite(skill.testCases);
await harness.dispose();
```

## Running

```bash
pnpm skill-testing
```

## Key Files

| File                | Purpose                                |
| ------------------- | -------------------------------------- |
| `index.ts`          | Sample entry point with test execution |
| `parser.js`         | Skill markdown parser                  |
| `harness.js`        | Test execution engine                  |
| `skills/*/SKILL.md` | Skill definitions with test cases      |
