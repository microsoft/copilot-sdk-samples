import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createConfluenceConnector,
  ConfluenceConnector,
} from "../../shared/connectors/confluence/index.js";
import { ErrorCodes } from "../../shared/connectors/types.js";
import { expectSuccess, expectFailure } from "../helpers/index.js";

describe("shared/connectors/confluence", () => {
  describe("MockConfluenceConnector", () => {
    let connector: ConfluenceConnector;

    beforeEach(async () => {
      connector = createConfluenceConnector({ mode: "mock" });
    });

    afterEach(async () => {
      await connector.dispose();
    });

    describe("initialization", () => {
      it("should create a mock connector", () => {
        expect(connector.name).toBe("confluence");
        expect(connector.mode).toBe("mock");
        expect(connector.isInitialized).toBe(false);
      });

      it("should initialize successfully", async () => {
        const result = await connector.initialize();

        expectSuccess(result);
        expect(connector.isInitialized).toBe(true);
      });

      it("should dispose correctly", async () => {
        await connector.initialize();
        await connector.dispose();

        expect(connector.isInitialized).toBe(false);
      });
    });

    describe("healthCheck", () => {
      it("should return healthy status", async () => {
        await connector.initialize();
        const result = await connector.healthCheck();

        expectSuccess(result);
        expect(result.data?.healthy).toBe(true);
        expect(result.data?.version).toBe("mock-v1");
      });
    });

    describe("listSpaces", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded mock spaces", async () => {
        const result = await connector.listSpaces();

        expectSuccess(result);
        expect(result.data?.length).toBeGreaterThan(0);
        expect(result.data?.some((s) => s.key === "ENG")).toBe(true);
      });

      it("should filter by type", async () => {
        const result = await connector.listSpaces({ type: "global" });

        expectSuccess(result);
        expect(result.data?.every((s) => s.type === "global")).toBe(true);
      });

      it("should filter by status", async () => {
        const result = await connector.listSpaces({ status: "current" });

        expectSuccess(result);
        expect(result.data?.every((s) => s.status === "current")).toBe(true);
      });

      it("should limit results", async () => {
        const result = await connector.listSpaces({ limit: 1 });

        expectSuccess(result);
        expect(result.data?.length).toBe(1);
      });

      it("should fail if not initialized", async () => {
        await connector.dispose();
        const result = await connector.listSpaces();

        expectFailure(result, ErrorCodes.NOT_INITIALIZED);
      });
    });

    describe("getSpace", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return an existing space", async () => {
        const result = await connector.getSpace("ENG");

        expectSuccess(result);
        expect(result.data?.key).toBe("ENG");
        expect(result.data?.name).toBe("Engineering");
      });

      it("should fail for non-existent space", async () => {
        const result = await connector.getSpace("NONEXISTENT");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("listPages", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded mock pages", async () => {
        const result = await connector.listPages();

        expectSuccess(result);
        expect(result.data?.results.length).toBeGreaterThan(0);
        expect(result.data?.total).toBeGreaterThan(0);
      });

      it("should filter by space key", async () => {
        const result = await connector.listPages({ spaceKey: "ENG" });

        expectSuccess(result);
        expect(result.data?.results.every((p) => p.spaceKey === "ENG")).toBe(
          true,
        );
      });

      it("should filter by status", async () => {
        const result = await connector.listPages({ status: "current" });

        expectSuccess(result);
        expect(result.data?.results.every((p) => p.status === "current")).toBe(
          true,
        );
      });

      it("should filter by title", async () => {
        const result = await connector.listPages({ title: "Architecture" });

        expectSuccess(result);
        expect(
          result.data?.results.every((p) => p.title.includes("Architecture")),
        ).toBe(true);
      });

      it("should paginate results", async () => {
        const result = await connector.listPages({ limit: 2, start: 0 });

        expectSuccess(result);
        expect(result.data?.results.length).toBeLessThanOrEqual(2);
        expect(result.data?.limit).toBe(2);
        expect(result.data?.start).toBe(0);
      });

      it("should fail if not initialized", async () => {
        await connector.dispose();
        const result = await connector.listPages();

        expectFailure(result, ErrorCodes.NOT_INITIALIZED);
      });
    });

    describe("getPage", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return an existing page", async () => {
        const result = await connector.getPage("page-001");

        expectSuccess(result);
        expect(result.data?.id).toBe("page-001");
        expect(result.data?.title).toBe("Engineering Home");
      });

      it("should fail for non-existent page", async () => {
        const result = await connector.getPage("nonexistent-page");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should include page details", async () => {
        const result = await connector.getPage("page-001");

        expectSuccess(result);
        expect(result.data).toHaveProperty("body");
        expect(result.data).toHaveProperty("version");
        expect(result.data).toHaveProperty("spaceKey");
        expect(result.data).toHaveProperty("labels");
      });
    });

    describe("getPageByTitle", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return page by title", async () => {
        const result = await connector.getPageByTitle(
          "ENG",
          "Engineering Home",
        );

        expectSuccess(result);
        expect(result.data?.title).toBe("Engineering Home");
        expect(result.data?.spaceKey).toBe("ENG");
      });

      it("should be case-insensitive", async () => {
        const result = await connector.getPageByTitle(
          "ENG",
          "engineering home",
        );

        expectSuccess(result);
        expect(result.data?.title).toBe("Engineering Home");
      });

      it("should fail for non-existent title", async () => {
        const result = await connector.getPageByTitle(
          "ENG",
          "Nonexistent Page",
        );

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("createPage", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should create a new page", async () => {
        const result = await connector.createPage({
          spaceKey: "ENG",
          title: "New Test Page",
          body: "<h1>Test</h1><p>Test content</p>",
        });

        expectSuccess(result);
        expect(result.data?.title).toBe("New Test Page");
        expect(result.data?.spaceKey).toBe("ENG");
        expect(result.data?.status).toBe("current");
        expect(result.data?.version.number).toBe(1);
      });

      it("should create draft page", async () => {
        const result = await connector.createPage({
          spaceKey: "ENG",
          title: "Draft Page",
          body: "Draft content",
          status: "draft",
        });

        expectSuccess(result);
        expect(result.data?.status).toBe("draft");
      });

      it("should create page with parent", async () => {
        const result = await connector.createPage({
          spaceKey: "ENG",
          title: "Child Page",
          body: "Child content",
          parentId: "page-001",
        });

        expectSuccess(result);
        expect(result.data?.ancestors.some((a) => a.id === "page-001")).toBe(
          true,
        );
      });

      it("should fail for non-existent space", async () => {
        const result = await connector.createPage({
          spaceKey: "NONEXISTENT",
          title: "Test",
          body: "Test",
        });

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should fail for duplicate title", async () => {
        const result = await connector.createPage({
          spaceKey: "ENG",
          title: "Engineering Home",
          body: "Test",
        });

        expectFailure(result, ErrorCodes.ALREADY_EXISTS);
      });
    });

    describe("updatePage", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should update page title", async () => {
        const page = await connector.getPage("page-001");
        expectSuccess(page);
        const versionBefore = page.data!.version.number;

        const result = await connector.updatePage("page-001", {
          title: "Updated Title",
          version: versionBefore,
        });

        expectSuccess(result);
        expect(result.data?.title).toBe("Updated Title");
        expect(result.data?.version.number).toBe(versionBefore + 1);
      });

      it("should update page body", async () => {
        const page = await connector.getPage("page-001");
        expectSuccess(page);

        const result = await connector.updatePage("page-001", {
          body: "<h1>New Content</h1>",
          version: page.data!.version.number,
        });

        expectSuccess(result);
        expect(result.data?.body.storage).toBe("<h1>New Content</h1>");
      });

      it("should fail for version conflict", async () => {
        const result = await connector.updatePage("page-001", {
          title: "Updated",
          version: 999,
        });

        expectFailure(result, ErrorCodes.CONFLICT);
      });

      it("should fail for non-existent page", async () => {
        const result = await connector.updatePage("nonexistent", {
          title: "X",
          version: 1,
        });

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("deletePage", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should delete a page", async () => {
        const createResult = await connector.createPage({
          spaceKey: "ENG",
          title: "To Delete",
          body: "Delete me",
        });
        expectSuccess(createResult);

        const deleteResult = await connector.deletePage(createResult.data!.id);
        expectSuccess(deleteResult);

        const getResult = await connector.getPage(createResult.data!.id);
        expectFailure(getResult, ErrorCodes.NOT_FOUND);
      });

      it("should fail for non-existent page", async () => {
        const result = await connector.deletePage("nonexistent");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("searchPages", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should search by title", async () => {
        const result = await connector.searchPages("Architecture");

        expectSuccess(result);
        expect(result.data?.results.length).toBeGreaterThan(0);
        expect(
          result.data?.results.some((p) => p.title.includes("Architecture")),
        ).toBe(true);
      });

      it("should search by content", async () => {
        const result = await connector.searchPages("microservices");

        expectSuccess(result);
        expect(result.data?.results.length).toBeGreaterThan(0);
      });

      it("should search by label", async () => {
        const result = await connector.searchPages("documentation");

        expectSuccess(result);
        expect(result.data?.results.length).toBeGreaterThan(0);
      });

      it("should filter by space key", async () => {
        const result = await connector.searchPages("documentation", {
          spaceKey: "ENG",
        });

        expectSuccess(result);
        expect(result.data?.results.every((p) => p.spaceKey === "ENG")).toBe(
          true,
        );
      });

      it("should paginate results", async () => {
        const result = await connector.searchPages("documentation", {
          limit: 1,
        });

        expectSuccess(result);
        expect(result.data?.results.length).toBeLessThanOrEqual(1);
        expect(result.data?.limit).toBe(1);
      });
    });

    describe("getPageComments", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return page comments", async () => {
        const result = await connector.getPageComments("page-002");

        expectSuccess(result);
        expect(result.data?.length).toBeGreaterThan(0);
      });

      it("should return empty for page without comments", async () => {
        const result = await connector.getPageComments("page-003");

        expectSuccess(result);
        expect(result.data?.length).toBe(0);
      });

      it("should fail for non-existent page", async () => {
        const result = await connector.getPageComments("nonexistent");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("addPageComment", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should add a comment to a page", async () => {
        const result = await connector.addPageComment(
          "page-001",
          "Test comment",
        );

        expectSuccess(result);
        expect(result.data?.body.storage).toBe("Test comment");
        expect(result.data?.author).toBeTruthy();
      });

      it("should add a reply to a comment", async () => {
        const comments = await connector.getPageComments("page-002");
        expectSuccess(comments);
        const parentId = comments.data![0].id;

        const result = await connector.addPageComment(
          "page-002",
          "Reply comment",
          parentId,
        );

        expectSuccess(result);
        expect(result.data?.parentCommentId).toBe(parentId);
      });

      it("should fail for non-existent page", async () => {
        const result = await connector.addPageComment("nonexistent", "Test");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should fail for non-existent parent comment", async () => {
        const result = await connector.addPageComment(
          "page-001",
          "Test",
          "nonexistent-comment",
        );

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("getPageLabels", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return page labels", async () => {
        const result = await connector.getPageLabels("page-001");

        expectSuccess(result);
        expect(result.data?.length).toBeGreaterThan(0);
        expect(result.data?.some((l) => l.name === "documentation")).toBe(true);
      });

      it("should fail for non-existent page", async () => {
        const result = await connector.getPageLabels("nonexistent");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("addPageLabel", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should add a label to a page", async () => {
        const result = await connector.addPageLabel("page-001", "new-label");

        expectSuccess(result);
        expect(result.data?.name).toBe("new-label");
      });

      it("should return existing label if already present", async () => {
        const result = await connector.addPageLabel(
          "page-001",
          "documentation",
        );

        expectSuccess(result);
        expect(result.data?.name).toBe("documentation");
      });

      it("should fail for non-existent page", async () => {
        const result = await connector.addPageLabel("nonexistent", "label");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("removePageLabel", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should remove a label from a page", async () => {
        const result = await connector.removePageLabel(
          "page-001",
          "documentation",
        );

        expectSuccess(result);

        const labels = await connector.getPageLabels("page-001");
        expectSuccess(labels);
        expect(labels.data?.some((l) => l.name === "documentation")).toBe(
          false,
        );
      });

      it("should fail for non-existent page", async () => {
        const result = await connector.removePageLabel("nonexistent", "label");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should fail for non-existent label", async () => {
        const result = await connector.removePageLabel(
          "page-001",
          "nonexistent-label",
        );

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("listPageAttachments", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return page attachments", async () => {
        const result = await connector.listPageAttachments("page-002");

        expectSuccess(result);
        expect(result.data?.length).toBeGreaterThan(0);
      });

      it("should return empty for page without attachments", async () => {
        const result = await connector.listPageAttachments("page-001");

        expectSuccess(result);
        expect(result.data?.length).toBe(0);
      });

      it("should fail for non-existent page", async () => {
        const result = await connector.listPageAttachments("nonexistent");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });
  });

  describe("LiveConfluenceConnector", () => {
    it("should require credentials for initialization", async () => {
      const connector = createConfluenceConnector({ mode: "live" });
      const result = await connector.initialize();

      expectFailure(result, ErrorCodes.AUTH_REQUIRED);
    });

    it("should initialize with credentials", async () => {
      const connector = createConfluenceConnector({
        mode: "live",
        siteUrl: "https://test.atlassian.net",
        apiToken: "test-token",
        userEmail: "test@example.com",
      });
      const result = await connector.initialize();

      expectSuccess(result);
      expect(connector.isInitialized).toBe(true);
    });

    it("should return NOT_IMPLEMENTED for operations", async () => {
      const connector = createConfluenceConnector({
        mode: "live",
        siteUrl: "https://test.atlassian.net",
        apiToken: "test-token",
        userEmail: "test@example.com",
      });
      await connector.initialize();

      const result = await connector.listPages();
      expectFailure(result, ErrorCodes.NOT_IMPLEMENTED);
    });
  });
});
