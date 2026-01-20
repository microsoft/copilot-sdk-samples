import { describe, it, expect } from "vitest";
import {
  parseSkillContent,
  extractCodeBlocks,
  generateSkillsPromptXml,
  type ParsedSkill,
} from "../../../samples/skill-testing/sdk/parser.js";
import { expectSuccess, expectFailure } from "../../helpers/index.js";
import { ErrorCodes } from "../../../shared/connectors/types.js";

describe("samples/skill-testing", () => {
  describe("parser", () => {
    describe("parseSkillContent", () => {
      it("should parse valid SKILL.md content", () => {
        const content = `---
name: test-skill
description: A test skill for unit testing
---

# Instructions

Do something useful.`;

        const result = parseSkillContent(content, "/test/SKILL.md");

        expectSuccess(result);
        expect(result.data?.metadata.name).toBe("test-skill");
        expect(result.data?.metadata.description).toBe(
          "A test skill for unit testing",
        );
        expect(result.data?.instructions).toContain("Do something useful");
        expect(result.data?.path).toBe("/test/SKILL.md");
      });

      it("should parse skill with optional fields", () => {
        const content = `---
name: advanced-skill
description: An advanced skill
license: MIT
compatibility: node>=18
---

Instructions here.`;

        const result = parseSkillContent(content, "/test/SKILL.md");

        expectSuccess(result);
        expect(result.data?.metadata.license).toBe("MIT");
        expect(result.data?.metadata.compatibility).toBe("node>=18");
      });

      it("should reject content without frontmatter", () => {
        const content = `# No Frontmatter

Just instructions.`;

        const result = parseSkillContent(content, "/test/SKILL.md");

        expectFailure(result, ErrorCodes.VALIDATION_ERROR);
        expect(result.error?.message).toContain("frontmatter");
      });

      it("should reject skill without name", () => {
        const content = `---
description: Missing name field
---

Instructions.`;

        const result = parseSkillContent(content, "/test/SKILL.md");

        expectFailure(result, ErrorCodes.VALIDATION_ERROR);
        expect(result.error?.message).toContain("name");
      });

      it("should reject skill without description", () => {
        const content = `---
name: no-description
---

Instructions.`;

        const result = parseSkillContent(content, "/test/SKILL.md");

        expectFailure(result, ErrorCodes.VALIDATION_ERROR);
        expect(result.error?.message).toContain("description");
      });

      it("should reject invalid skill name format", () => {
        const content = `---
name: Invalid_Name
description: Has invalid characters
---

Instructions.`;

        const result = parseSkillContent(content, "/test/SKILL.md");

        expectFailure(result, ErrorCodes.VALIDATION_ERROR);
        expect(result.error?.message).toContain("Invalid skill name");
      });

      it("should reject skill name starting with hyphen", () => {
        const content = `---
name: -invalid-start
description: Starts with hyphen
---

Instructions.`;

        const result = parseSkillContent(content, "/test/SKILL.md");

        expectFailure(result, ErrorCodes.VALIDATION_ERROR);
      });

      it("should reject skill name exceeding 64 characters", () => {
        const longName = "a".repeat(65);
        const content = `---
name: ${longName}
description: Name too long
---

Instructions.`;

        const result = parseSkillContent(content, "/test/SKILL.md");

        expectFailure(result, ErrorCodes.VALIDATION_ERROR);
        expect(result.error?.message).toContain("64 characters");
      });

      it("should reject description exceeding 1024 characters", () => {
        const longDesc = "x".repeat(1025);
        const content = `---
name: valid-name
description: ${longDesc}
---

Instructions.`;

        const result = parseSkillContent(content, "/test/SKILL.md");

        expectFailure(result, ErrorCodes.VALIDATION_ERROR);
        expect(result.error?.message).toContain("1024 characters");
      });
    });

    describe("extractCodeBlocks", () => {
      it("should extract typescript code blocks", () => {
        const markdown = `Here is some code:

\`\`\`typescript
const x = 1;
\`\`\`

And more:

\`\`\`typescript
const y = 2;
\`\`\``;

        const blocks = extractCodeBlocks(markdown);

        expect(blocks.get("typescript")?.length).toBe(2);
        expect(blocks.get("typescript")?.[0]).toBe("const x = 1;");
        expect(blocks.get("typescript")?.[1]).toBe("const y = 2;");
      });

      it("should handle multiple languages", () => {
        const markdown = `
\`\`\`typescript
const ts = true;
\`\`\`

\`\`\`javascript
const js = true;
\`\`\`

\`\`\`python
py = True
\`\`\``;

        const blocks = extractCodeBlocks(markdown);

        expect(blocks.get("typescript")?.length).toBe(1);
        expect(blocks.get("javascript")?.length).toBe(1);
        expect(blocks.get("python")?.length).toBe(1);
      });

      it("should use plaintext for blocks without language", () => {
        const markdown = `
\`\`\`
no language specified
\`\`\``;

        const blocks = extractCodeBlocks(markdown);

        expect(blocks.get("plaintext")?.length).toBe(1);
        expect(blocks.get("plaintext")?.[0]).toBe("no language specified");
      });

      it("should return empty map for no code blocks", () => {
        const markdown = "No code blocks here.";

        const blocks = extractCodeBlocks(markdown);

        expect(blocks.size).toBe(0);
      });
    });

    describe("generateSkillsPromptXml", () => {
      it("should generate valid XML for skills", () => {
        const skills: ParsedSkill[] = [
          {
            metadata: {
              name: "skill-one",
              description: "First skill",
            },
            instructions: "Do first thing",
            path: "/skills/one/SKILL.md",
          },
          {
            metadata: {
              name: "skill-two",
              description: "Second skill",
            },
            instructions: "Do second thing",
            path: "/skills/two/SKILL.md",
          },
        ];

        const xml = generateSkillsPromptXml(skills);

        expect(xml).toContain("<available_skills>");
        expect(xml).toContain("</available_skills>");
        expect(xml).toContain("<name>skill-one</name>");
        expect(xml).toContain("<description>First skill</description>");
        expect(xml).toContain("<name>skill-two</name>");
      });

      it("should escape XML special characters", () => {
        const skills: ParsedSkill[] = [
          {
            metadata: {
              name: "test-skill",
              description: 'Uses <tags> & "quotes"',
            },
            instructions: "Instructions",
            path: "/test/SKILL.md",
          },
        ];

        const xml = generateSkillsPromptXml(skills);

        expect(xml).toContain("&lt;tags&gt;");
        expect(xml).toContain("&amp;");
        expect(xml).toContain("&quot;quotes&quot;");
      });

      it("should return empty skills element for no skills", () => {
        const xml = generateSkillsPromptXml([]);

        expect(xml).toBe("<available_skills>\n\n</available_skills>");
      });
    });
  });
});
