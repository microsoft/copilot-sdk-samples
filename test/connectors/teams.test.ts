import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTeamsConnector,
  TeamsConnector,
} from "../../shared/connectors/teams/client.js";
import { ErrorCodes } from "../../shared/connectors/types.js";
import { expectSuccess, expectFailure } from "../helpers/index.js";

describe("shared/connectors/teams", () => {
  describe("MockTeamsConnector", () => {
    let connector: TeamsConnector;

    beforeEach(async () => {
      connector = createTeamsConnector({ mode: "mock" });
    });

    afterEach(async () => {
      await connector.dispose();
    });

    describe("initialization", () => {
      it("should create a mock connector", () => {
        expect(connector.name).toBe("teams");
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

    describe("listTeams", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded mock teams", async () => {
        const result = await connector.listTeams();

        expectSuccess(result);
        expect(result.data!.length).toBeGreaterThan(0);
      });

      it("should filter by archived status", async () => {
        const result = await connector.listTeams({ archived: false });

        expectSuccess(result);
        expect(result.data!.every((t) => !t.isArchived)).toBe(true);
      });

      it("should include archived when specified", async () => {
        const result = await connector.listTeams({ archived: true });

        expectSuccess(result);
        expect(result.data!.every((t) => t.isArchived)).toBe(true);
      });

      it("should filter by name", async () => {
        const result = await connector.listTeams({ filter: "engineering" });

        expectSuccess(result);
        expect(result.data!.length).toBeGreaterThan(0);
        expect(result.data![0].displayName.toLowerCase()).toContain(
          "engineering",
        );
      });

      it("should limit results", async () => {
        const result = await connector.listTeams({ limit: 1 });

        expectSuccess(result);
        expect(result.data!.length).toBe(1);
      });
    });

    describe("getTeam", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return an existing team by ID", async () => {
        const result = await connector.getTeam("team-engineering");

        expectSuccess(result);
        expect(result.data?.id).toBe("team-engineering");
        expect(result.data?.displayName).toBe("Engineering");
      });

      it("should fail for non-existent team", async () => {
        const result = await connector.getTeam("NONEXISTENT");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should include team details", async () => {
        const result = await connector.getTeam("team-engineering");

        expectSuccess(result);
        expect(result.data).toHaveProperty("channels");
        expect(result.data).toHaveProperty("members");
        expect(result.data).toHaveProperty("visibility");
      });
    });

    describe("getTeamMembers", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return team members", async () => {
        const result = await connector.getTeamMembers("team-engineering");

        expectSuccess(result);
        expect(result.data!.length).toBeGreaterThan(0);
      });

      it("should fail for non-existent team", async () => {
        const result = await connector.getTeamMembers("NONEXISTENT");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should include member details", async () => {
        const result = await connector.getTeamMembers("team-engineering");

        expectSuccess(result);
        expect(result.data![0]).toHaveProperty("user");
        expect(result.data![0]).toHaveProperty("role");
        expect(result.data![0]).toHaveProperty("joinedDateTime");
      });
    });

    describe("listChannels", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return channels for a team", async () => {
        const result = await connector.listChannels({
          teamId: "team-engineering",
        });

        expectSuccess(result);
        expect(result.data!.length).toBeGreaterThan(0);
      });

      it("should filter by membership type", async () => {
        const result = await connector.listChannels({
          teamId: "team-engineering",
          membershipType: "private",
        });

        expectSuccess(result);
        expect(result.data!.every((c) => c.membershipType === "private")).toBe(
          true,
        );
      });

      it("should fail for non-existent team", async () => {
        const result = await connector.listChannels({ teamId: "NONEXISTENT" });

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("getChannel", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return an existing channel", async () => {
        const result = await connector.getChannel(
          "team-engineering",
          "channel-general",
        );

        expectSuccess(result);
        expect(result.data?.id).toBe("channel-general");
        expect(result.data?.displayName).toBe("General");
      });

      it("should fail for non-existent channel", async () => {
        const result = await connector.getChannel(
          "team-engineering",
          "NONEXISTENT",
        );

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should fail for non-existent team", async () => {
        const result = await connector.getChannel(
          "NONEXISTENT",
          "channel-general",
        );

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("createChannel", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should create a new standard channel", async () => {
        const result = await connector.createChannel(
          "team-engineering",
          "new-channel",
          "A new channel",
          "standard",
        );

        expectSuccess(result);
        expect(result.data?.displayName).toBe("new-channel");
        expect(result.data?.membershipType).toBe("standard");
      });

      it("should create a new private channel", async () => {
        const result = await connector.createChannel(
          "team-engineering",
          "private-channel",
          "A private channel",
          "private",
        );

        expectSuccess(result);
        expect(result.data?.membershipType).toBe("private");
      });

      it("should fail for non-existent team", async () => {
        const result = await connector.createChannel(
          "NONEXISTENT",
          "new-channel",
        );

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("listMessages", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return messages for a channel", async () => {
        const result = await connector.listMessages({
          teamId: "team-engineering",
          channelId: "channel-general",
        });

        expectSuccess(result);
        expect(result.data!.length).toBeGreaterThan(0);
      });

      it("should limit results", async () => {
        const result = await connector.listMessages({
          teamId: "team-engineering",
          channelId: "channel-general",
          limit: 2,
        });

        expectSuccess(result);
        expect(result.data!.length).toBeLessThanOrEqual(2);
      });

      it("should fail for non-existent team", async () => {
        const result = await connector.listMessages({
          teamId: "NONEXISTENT",
          channelId: "channel-general",
        });

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should fail for non-existent channel", async () => {
        const result = await connector.listMessages({
          teamId: "team-engineering",
          channelId: "NONEXISTENT",
        });

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("sendMessage", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should send a message", async () => {
        const result = await connector.sendMessage({
          teamId: "team-engineering",
          channelId: "channel-general",
          content: "Test message",
        });

        expectSuccess(result);
        expect(result.data?.body.content).toBe("Test message");
      });

      it("should send a message with importance", async () => {
        const result = await connector.sendMessage({
          teamId: "team-engineering",
          channelId: "channel-general",
          content: "Urgent message",
          importance: "urgent",
        });

        expectSuccess(result);
        expect(result.data?.importance).toBe("urgent");
      });

      it("should send a message with mentions", async () => {
        const result = await connector.sendMessage({
          teamId: "team-engineering",
          channelId: "channel-general",
          content: "Hello @Alice",
          mentions: [{ userId: "user-1", text: "@Alice" }],
        });

        expectSuccess(result);
        expect(result.data?.mentions.length).toBe(1);
      });

      it("should fail for non-existent team", async () => {
        const result = await connector.sendMessage({
          teamId: "NONEXISTENT",
          channelId: "channel-general",
          content: "Test",
        });

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("sendAdaptiveCard", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should send an adaptive card", async () => {
        const result = await connector.sendAdaptiveCard({
          teamId: "team-engineering",
          channelId: "channel-general",
          card: {
            type: "AdaptiveCard",
            version: "1.4",
            body: [{ type: "TextBlock", text: "Hello!" }],
          },
          summary: "Test card",
        });

        expectSuccess(result);
        expect(result.data?.attachments.length).toBe(1);
        expect(result.data?.attachments[0].contentType).toBe(
          "application/vnd.microsoft.card.adaptive",
        );
      });

      it("should fail for non-existent team", async () => {
        const result = await connector.sendAdaptiveCard({
          teamId: "NONEXISTENT",
          channelId: "channel-general",
          card: { type: "AdaptiveCard", version: "1.4", body: [] },
        });

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("replyToMessage", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should reply to a message", async () => {
        const result = await connector.replyToMessage({
          teamId: "team-engineering",
          channelId: "channel-general",
          messageId: "msg-1",
          content: "This is a reply",
        });

        expectSuccess(result);
        expect(result.data?.replyToId).toBe("msg-1");
      });

      it("should fail for non-existent message", async () => {
        const result = await connector.replyToMessage({
          teamId: "team-engineering",
          channelId: "channel-general",
          messageId: "NONEXISTENT",
          content: "Test reply",
        });

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("addReaction", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should add a reaction to a message", async () => {
        const result = await connector.addReaction(
          "team-engineering",
          "channel-general",
          "msg-1",
          "like",
        );

        expectSuccess(result);
      });

      it("should fail for non-existent message", async () => {
        const result = await connector.addReaction(
          "team-engineering",
          "channel-general",
          "NONEXISTENT",
          "like",
        );

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("getUser", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return an existing user by ID", async () => {
        const result = await connector.getUser("user-1");

        expectSuccess(result);
        expect(result.data?.id).toBe("user-1");
        expect(result.data?.displayName).toBe("Alice Johnson");
      });

      it("should fail for non-existent user", async () => {
        const result = await connector.getUser("NONEXISTENT");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("getUserByEmail", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return a user by email", async () => {
        const result = await connector.getUserByEmail("alice@contoso.com");

        expectSuccess(result);
        expect(result.data?.email).toBe("alice@contoso.com");
      });

      it("should be case insensitive", async () => {
        const result = await connector.getUserByEmail("ALICE@CONTOSO.COM");

        expectSuccess(result);
        expect(result.data?.email).toBe("alice@contoso.com");
      });

      it("should fail for non-existent email", async () => {
        const result = await connector.getUserByEmail(
          "nonexistent@example.com",
        );

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("getUserPresence", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return user presence", async () => {
        const result = await connector.getUserPresence("user-1");

        expectSuccess(result);
        expect([
          "available",
          "busy",
          "doNotDisturb",
          "away",
          "offline",
          "unknown",
        ]).toContain(result.data);
      });

      it("should fail for non-existent user", async () => {
        const result = await connector.getUserPresence("NONEXISTENT");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("listUsers", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded mock users", async () => {
        const result = await connector.listUsers();

        expectSuccess(result);
        expect(result.data!.length).toBeGreaterThan(0);
      });

      it("should filter by name", async () => {
        const result = await connector.listUsers("alice");

        expectSuccess(result);
        expect(result.data!.length).toBeGreaterThan(0);
        expect(result.data![0].displayName.toLowerCase()).toContain("alice");
      });

      it("should filter by department", async () => {
        const result = await connector.listUsers("engineering");

        expectSuccess(result);
        expect(
          result.data!.every(
            (u) =>
              u.displayName.toLowerCase().includes("engineering") ||
              u.department?.toLowerCase().includes("engineering"),
          ),
        ).toBe(true);
      });

      it("should limit results", async () => {
        const result = await connector.listUsers(undefined, 2);

        expectSuccess(result);
        expect(result.data!.length).toBeLessThanOrEqual(2);
      });
    });

    describe("listMeetings", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded mock meetings", async () => {
        const result = await connector.listMeetings();

        expectSuccess(result);
        expect(result.data!.length).toBeGreaterThan(0);
      });

      it("should limit results", async () => {
        const result = await connector.listMeetings({ limit: 1 });

        expectSuccess(result);
        expect(result.data!.length).toBe(1);
      });

      it("should include meeting details", async () => {
        const result = await connector.listMeetings();

        expectSuccess(result);
        const meeting = result.data![0];
        expect(meeting).toHaveProperty("subject");
        expect(meeting).toHaveProperty("startDateTime");
        expect(meeting).toHaveProperty("organizer");
        expect(meeting).toHaveProperty("attendees");
      });
    });

    describe("getMeeting", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return an existing meeting", async () => {
        const result = await connector.getMeeting("meeting-1");

        expectSuccess(result);
        expect(result.data?.id).toBe("meeting-1");
      });

      it("should fail for non-existent meeting", async () => {
        const result = await connector.getMeeting("NONEXISTENT");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("createMeeting", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should create a new meeting", async () => {
        const result = await connector.createMeeting({
          subject: "Test Meeting",
          startDateTime: "2024-12-10T10:00:00Z",
          endDateTime: "2024-12-10T11:00:00Z",
          attendees: ["alice@contoso.com"],
        });

        expectSuccess(result);
        expect(result.data?.subject).toBe("Test Meeting");
        expect(result.data?.attendees.length).toBeGreaterThan(0);
      });

      it("should include join URL", async () => {
        const result = await connector.createMeeting({
          subject: "Test Meeting",
          startDateTime: "2024-12-10T10:00:00Z",
          endDateTime: "2024-12-10T11:00:00Z",
          attendees: [],
        });

        expectSuccess(result);
        expect(result.data?.joinUrl).toBeTruthy();
      });
    });

    describe("listChats", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return seeded mock chats", async () => {
        const result = await connector.listChats();

        expectSuccess(result);
        expect(result.data!.length).toBeGreaterThan(0);
      });

      it("should filter by chat type", async () => {
        const result = await connector.listChats({ chatType: "oneOnOne" });

        expectSuccess(result);
        expect(result.data!.every((c) => c.chatType === "oneOnOne")).toBe(true);
      });

      it("should limit results", async () => {
        const result = await connector.listChats({ limit: 1 });

        expectSuccess(result);
        expect(result.data!.length).toBe(1);
      });
    });

    describe("getChat", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return an existing chat", async () => {
        const result = await connector.getChat("chat-1");

        expectSuccess(result);
        expect(result.data?.id).toBe("chat-1");
      });

      it("should fail for non-existent chat", async () => {
        const result = await connector.getChat("NONEXISTENT");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("sendChatMessage", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should send a chat message", async () => {
        const result = await connector.sendChatMessage({
          chatId: "chat-1",
          content: "Test chat message",
        });

        expectSuccess(result);
        expect(result.data?.body.content).toBe("Test chat message");
      });

      it("should fail for non-existent chat", async () => {
        const result = await connector.sendChatMessage({
          chatId: "NONEXISTENT",
          content: "Test",
        });

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("listTabs", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return tabs for a channel", async () => {
        const result = await connector.listTabs(
          "team-engineering",
          "channel-general",
        );

        expectSuccess(result);
        expect(result.data!.length).toBeGreaterThan(0);
      });

      it("should fail for non-existent team", async () => {
        const result = await connector.listTabs(
          "NONEXISTENT",
          "channel-general",
        );

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });

      it("should fail for non-existent channel", async () => {
        const result = await connector.listTabs(
          "team-engineering",
          "NONEXISTENT",
        );

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("addTab", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should add a tab to a channel", async () => {
        const result = await connector.addTab(
          "team-engineering",
          "channel-general",
          "New Tab",
          "app-1",
          {
            entityId: "test",
            contentUrl: "https://example.com",
            websiteUrl: null,
            removeUrl: null,
          },
        );

        expectSuccess(result);
        expect(result.data?.displayName).toBe("New Tab");
      });

      it("should fail for non-existent team", async () => {
        const result = await connector.addTab(
          "NONEXISTENT",
          "channel-general",
          "Tab",
          "app-1",
          {
            entityId: null,
            contentUrl: null,
            websiteUrl: null,
            removeUrl: null,
          },
        );

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });

    describe("listInstalledApps", () => {
      beforeEach(async () => {
        await connector.initialize();
      });

      it("should return installed apps for a team", async () => {
        const result = await connector.listInstalledApps("team-engineering");

        expectSuccess(result);
        expect(result.data!.length).toBeGreaterThan(0);
      });

      it("should fail for non-existent team", async () => {
        const result = await connector.listInstalledApps("NONEXISTENT");

        expectFailure(result, ErrorCodes.NOT_FOUND);
      });
    });
  });

  describe("LiveTeamsConnector", () => {
    let connector: TeamsConnector;

    beforeEach(() => {
      connector = createTeamsConnector({ mode: "live" });
    });

    afterEach(async () => {
      await connector.dispose();
    });

    it("should create a live connector", () => {
      expect(connector.name).toBe("teams");
      expect(connector.mode).toBe("live");
    });

    it("should return NOT_IMPLEMENTED for healthCheck", async () => {
      await connector.initialize();
      const result = await connector.healthCheck();

      expectFailure(result, ErrorCodes.NOT_IMPLEMENTED);
    });

    it("should return NOT_IMPLEMENTED for listTeams", async () => {
      await connector.initialize();
      const result = await connector.listTeams();

      expectFailure(result, ErrorCodes.NOT_IMPLEMENTED);
    });
  });
});
