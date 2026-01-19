import { describe, it, expect, beforeEach, afterEach } from "vitest";
import {
  createTeamsConnector,
  TeamsConnector,
} from "../../../shared/connectors/teams/client.js";
import {
  createTeamsCollaborationService,
  TeamsCollaborationService,
} from "../../../samples/teams/sdk/collaboration.js";
import { expectSuccess, expectFailure } from "../../helpers/index.js";
import { ErrorCodes } from "../../../shared/connectors/types.js";

describe("samples/teams/collaboration", () => {
  let connector: TeamsConnector;
  let service: TeamsCollaborationService;

  // Known IDs from mock data
  const TEAM_ID = "team-engineering";
  const CHANNEL_ID = "channel-general";
  const USER_ID = "user-1";
  const MESSAGE_ID = "msg-1";
  const MEETING_ID = "meeting-1";
  const CHAT_ID = "chat-1";

  beforeEach(async () => {
    connector = createTeamsConnector({ mode: "mock" });
    await connector.initialize();
    service = createTeamsCollaborationService({
      connector,
      defaultTeamId: TEAM_ID,
      defaultChannelId: CHANNEL_ID,
    });
  });

  afterEach(async () => {
    await connector.dispose();
  });

  describe("sendMessage", () => {
    it("should send a simple message to default team/channel", async () => {
      const result = await service.sendMessage("Hello, Teams!");

      expectSuccess(result);
      expect(result.data?.content).toBe("Hello, Teams!");
      expect(result.data?.authorType).toBe("user");
    });

    it("should send a message to specified team/channel", async () => {
      const result = await service.sendMessage(
        "Specific channel message",
        TEAM_ID,
        CHANNEL_ID,
      );

      expectSuccess(result);
      expect(result.data?.content).toBe("Specific channel message");
    });

    it("should return message summary with metadata", async () => {
      const result = await service.sendMessage("Test message");

      expectSuccess(result);
      expect(result.data).toHaveProperty("id");
      expect(result.data).toHaveProperty("author");
      expect(result.data).toHaveProperty("createdAt");
      expect(result.data).toHaveProperty("importance");
      expect(result.data).toHaveProperty("reactionCount");
      expect(result.data).toHaveProperty("replyCount");
    });

    it("should fail when team/channel not specified and no defaults", async () => {
      const serviceNoDefaults = createTeamsCollaborationService({ connector });
      const result = await serviceNoDefaults.sendMessage("Hello");

      expectFailure(result, ErrorCodes.INVALID_INPUT);
    });

    it("should fail for non-existent team", async () => {
      const result = await service.sendMessage(
        "Hello",
        "nonexistent-team",
        CHANNEL_ID,
      );

      expectFailure(result, ErrorCodes.NOT_FOUND);
    });
  });

  describe("sendAdaptiveCard", () => {
    it("should send an adaptive card", async () => {
      const card = {
        type: "AdaptiveCard" as const,
        version: "1.4",
        body: [
          {
            type: "TextBlock" as const,
            text: "Hello from Adaptive Card",
            size: "large" as const,
          },
        ],
      };

      const result = await service.sendAdaptiveCard(card);

      expectSuccess(result);
      expect(result.data?.hasAttachments).toBe(true);
    });

    it("should send an adaptive card with actions", async () => {
      const card = {
        type: "AdaptiveCard" as const,
        version: "1.4",
        body: [{ type: "TextBlock" as const, text: "Click below" }],
        actions: [
          {
            type: "Action.OpenUrl" as const,
            title: "Learn More",
            url: "https://example.com",
          },
        ],
      };

      const result = await service.sendAdaptiveCard(
        card,
        TEAM_ID,
        CHANNEL_ID,
        "Card with actions",
      );

      expectSuccess(result);
    });
  });

  describe("sendAlertNotification", () => {
    it("should send an info alert", async () => {
      const result = await service.sendAlertNotification({
        teamId: TEAM_ID,
        channelId: CHANNEL_ID,
        title: "Info Alert",
        severity: "info",
        message: "This is informational",
      });

      expectSuccess(result);
      expect(result.data?.hasAttachments).toBe(true);
    });

    it("should send a warning alert", async () => {
      const result = await service.sendAlertNotification({
        teamId: TEAM_ID,
        channelId: CHANNEL_ID,
        title: "Warning Alert",
        severity: "warning",
        message: "This is a warning",
      });

      expectSuccess(result);
    });

    it("should send an error alert", async () => {
      const result = await service.sendAlertNotification({
        teamId: TEAM_ID,
        channelId: CHANNEL_ID,
        title: "Error Alert",
        severity: "error",
        message: "This is an error",
      });

      expectSuccess(result);
    });

    it("should send a critical alert", async () => {
      const result = await service.sendAlertNotification({
        teamId: TEAM_ID,
        channelId: CHANNEL_ID,
        title: "Critical Alert",
        severity: "critical",
        message: "This is critical",
      });

      expectSuccess(result);
    });

    it("should include fields in the alert", async () => {
      const result = await service.sendAlertNotification({
        teamId: TEAM_ID,
        channelId: CHANNEL_ID,
        title: "Alert with Fields",
        severity: "warning",
        message: "Alert message",
        fields: [
          { title: "Server", value: "prod-api-01" },
          { title: "CPU", value: "95%" },
        ],
      });

      expectSuccess(result);
    });

    it("should include action URL in the alert", async () => {
      const result = await service.sendAlertNotification({
        teamId: TEAM_ID,
        channelId: CHANNEL_ID,
        title: "Alert with Action",
        severity: "error",
        message: "Click to view",
        actionUrl: "https://dashboard.example.com",
        actionTitle: "View Dashboard",
      });

      expectSuccess(result);
    });
  });

  describe("sendDeploymentNotification", () => {
    it("should send started deployment notification", async () => {
      const result = await service.sendDeploymentNotification({
        teamId: TEAM_ID,
        channelId: CHANNEL_ID,
        environment: "production",
        version: "2.0.0",
        status: "started",
        service: "api-gateway",
      });

      expectSuccess(result);
      expect(result.data?.hasAttachments).toBe(true);
    });

    it("should send succeeded deployment notification", async () => {
      const result = await service.sendDeploymentNotification({
        teamId: TEAM_ID,
        channelId: CHANNEL_ID,
        environment: "production",
        version: "2.0.0",
        status: "succeeded",
        service: "api-gateway",
        duration: 120,
      });

      expectSuccess(result);
    });

    it("should send failed deployment notification", async () => {
      const result = await service.sendDeploymentNotification({
        teamId: TEAM_ID,
        channelId: CHANNEL_ID,
        environment: "staging",
        version: "2.0.1",
        status: "failed",
        service: "worker",
      });

      expectSuccess(result);
    });

    it("should send rolled back deployment notification", async () => {
      const result = await service.sendDeploymentNotification({
        teamId: TEAM_ID,
        channelId: CHANNEL_ID,
        environment: "production",
        version: "1.9.0",
        status: "rolled_back",
        service: "api-gateway",
      });

      expectSuccess(result);
    });

    it("should include author and commit hash", async () => {
      const result = await service.sendDeploymentNotification({
        teamId: TEAM_ID,
        channelId: CHANNEL_ID,
        environment: "production",
        version: "2.0.0",
        status: "succeeded",
        service: "api-gateway",
        author: "john.doe",
        commitHash: "abc123def456",
      });

      expectSuccess(result);
    });
  });

  describe("sendIncidentNotification", () => {
    it("should send triggered incident notification", async () => {
      const result = await service.sendIncidentNotification({
        teamId: TEAM_ID,
        channelId: CHANNEL_ID,
        incidentId: "INC-001",
        title: "Database Down",
        status: "triggered",
        severity: "critical",
        service: "database",
      });

      expectSuccess(result);
      expect(result.data?.hasAttachments).toBe(true);
    });

    it("should send acknowledged incident notification", async () => {
      const result = await service.sendIncidentNotification({
        teamId: TEAM_ID,
        channelId: CHANNEL_ID,
        incidentId: "INC-001",
        title: "Database Down",
        status: "acknowledged",
        severity: "critical",
        service: "database",
        assignee: "carol.sre",
      });

      expectSuccess(result);
    });

    it("should send resolved incident notification", async () => {
      const result = await service.sendIncidentNotification({
        teamId: TEAM_ID,
        channelId: CHANNEL_ID,
        incidentId: "INC-001",
        title: "Database Down",
        status: "resolved",
        severity: "critical",
        service: "database",
        summary: "Restarted database cluster",
      });

      expectSuccess(result);
    });

    it("should handle all severity levels", async () => {
      for (const severity of ["low", "medium", "high", "critical"] as const) {
        const result = await service.sendIncidentNotification({
          teamId: TEAM_ID,
          channelId: CHANNEL_ID,
          incidentId: `INC-${severity}`,
          title: `${severity} Incident`,
          status: "triggered",
          severity,
          service: "test-service",
        });

        expectSuccess(result);
      }
    });
  });

  describe("replyToMessage", () => {
    it("should reply to a message", async () => {
      const result = await service.replyToMessage(
        TEAM_ID,
        CHANNEL_ID,
        MESSAGE_ID,
        "This is a reply",
      );

      expectSuccess(result);
      expect(result.data?.content).toBe("This is a reply");
    });
  });

  describe("getTeams", () => {
    it("should return team summaries", async () => {
      const result = await service.getTeams();

      expectSuccess(result);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it("should exclude archived teams by default", async () => {
      const result = await service.getTeams();

      expectSuccess(result);
      expect(result.data?.every((t) => !t.isArchived)).toBe(true);
    });

    it("should include team properties", async () => {
      const result = await service.getTeams();

      expectSuccess(result);
      const team = result.data?.[0];
      expect(team).toHaveProperty("id");
      expect(team).toHaveProperty("name");
      expect(team).toHaveProperty("channelCount");
      expect(team).toHaveProperty("memberCount");
      expect(team).toHaveProperty("visibility");
    });

    it("should respect limit option", async () => {
      const result = await service.getTeams({ limit: 1 });

      expectSuccess(result);
      expect(result.data?.length).toBeLessThanOrEqual(1);
    });
  });

  describe("getTeam", () => {
    it("should return a team by ID", async () => {
      const result = await service.getTeam(TEAM_ID);

      expectSuccess(result);
      expect(result.data?.id).toBe(TEAM_ID);
    });

    it("should fail for non-existent team", async () => {
      const result = await service.getTeam("nonexistent");

      expectFailure(result, ErrorCodes.NOT_FOUND);
    });
  });

  describe("getChannels", () => {
    it("should return channel summaries for a team", async () => {
      const result = await service.getChannels(TEAM_ID);

      expectSuccess(result);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it("should include channel properties", async () => {
      const result = await service.getChannels(TEAM_ID);

      expectSuccess(result);
      const channel = result.data?.[0];
      expect(channel).toHaveProperty("id");
      expect(channel).toHaveProperty("name");
      expect(channel).toHaveProperty("membershipType");
      expect(channel).toHaveProperty("isFavorite");
    });
  });

  describe("createChannel", () => {
    it("should create a new channel", async () => {
      const result = await service.createChannel(
        TEAM_ID,
        "new-channel",
        "A new channel",
      );

      expectSuccess(result);
      expect(result.data?.name).toBe("new-channel");
    });

    it("should create a private channel", async () => {
      const result = await service.createChannel(
        TEAM_ID,
        "private-channel",
        "A private channel",
        true,
      );

      expectSuccess(result);
      expect(result.data?.membershipType).toBe("private");
    });
  });

  describe("getMessages", () => {
    it("should return message summaries", async () => {
      const result = await service.getMessages(TEAM_ID, CHANNEL_ID);

      expectSuccess(result);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it("should include message properties", async () => {
      const result = await service.getMessages(TEAM_ID, CHANNEL_ID);

      expectSuccess(result);
      const message = result.data?.[0];
      expect(message).toHaveProperty("id");
      expect(message).toHaveProperty("content");
      expect(message).toHaveProperty("author");
      expect(message).toHaveProperty("createdAt");
    });

    it("should respect limit option", async () => {
      const result = await service.getMessages(TEAM_ID, CHANNEL_ID, {
        limit: 1,
      });

      expectSuccess(result);
      expect(result.data?.length).toBeLessThanOrEqual(1);
    });
  });

  describe("getUser", () => {
    it("should return a user by ID", async () => {
      const result = await service.getUser(USER_ID);

      expectSuccess(result);
      expect(result.data?.id).toBe(USER_ID);
    });

    it("should include user properties", async () => {
      const result = await service.getUser(USER_ID);

      expectSuccess(result);
      expect(result.data).toHaveProperty("displayName");
      expect(result.data).toHaveProperty("email");
      expect(result.data).toHaveProperty("presence");
    });

    it("should fail for non-existent user", async () => {
      const result = await service.getUser("nonexistent");

      expectFailure(result, ErrorCodes.NOT_FOUND);
    });
  });

  describe("findUserByEmail", () => {
    it("should find a user by email", async () => {
      const result = await service.findUserByEmail("alice@contoso.com");

      expectSuccess(result);
      expect(result.data?.email).toBe("alice@contoso.com");
    });

    it("should fail for non-existent email", async () => {
      const result = await service.findUserByEmail("nonexistent@example.com");

      expectFailure(result, ErrorCodes.NOT_FOUND);
    });
  });

  describe("getUsers", () => {
    it("should return users", async () => {
      const result = await service.getUsers();

      expectSuccess(result);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it("should respect limit option", async () => {
      const result = await service.getUsers(undefined, 1);

      expectSuccess(result);
      expect(result.data?.length).toBeLessThanOrEqual(1);
    });
  });

  describe("getUserPresence", () => {
    it("should return user presence", async () => {
      const result = await service.getUserPresence(USER_ID);

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
  });

  describe("getMeetings", () => {
    it("should return meeting summaries", async () => {
      const result = await service.getMeetings();

      expectSuccess(result);
      expect(result.data?.length).toBeGreaterThan(0);
    });

    it("should include meeting properties", async () => {
      const result = await service.getMeetings();

      expectSuccess(result);
      const meeting = result.data?.[0];
      expect(meeting).toHaveProperty("id");
      expect(meeting).toHaveProperty("subject");
      expect(meeting).toHaveProperty("startDateTime");
      expect(meeting).toHaveProperty("endDateTime");
      expect(meeting).toHaveProperty("organizer");
      expect(meeting).toHaveProperty("joinUrl");
    });
  });

  describe("getMeeting", () => {
    it("should return a meeting by ID", async () => {
      const result = await service.getMeeting(MEETING_ID);

      expectSuccess(result);
      expect(result.data?.id).toBe(MEETING_ID);
    });

    it("should fail for non-existent meeting", async () => {
      const result = await service.getMeeting("nonexistent");

      expectFailure(result, ErrorCodes.NOT_FOUND);
    });
  });

  describe("createMeeting", () => {
    it("should create a new meeting", async () => {
      const startTime = new Date(
        Date.now() + 24 * 60 * 60 * 1000,
      ).toISOString();
      const endTime = new Date(
        Date.now() + 24 * 60 * 60 * 1000 + 60 * 60 * 1000,
      ).toISOString();

      const result = await service.createMeeting(
        "Project Review",
        startTime,
        endTime,
        ["alice@contoso.com", "bob@contoso.com"],
      );

      expectSuccess(result);
      expect(result.data?.subject).toBe("Project Review");
      expect(result.data?.attendeeCount).toBe(2);
    });
  });

  describe("getChats", () => {
    it("should return chat count", async () => {
      const result = await service.getChats();

      expectSuccess(result);
      expect(result.data).toBeGreaterThanOrEqual(0);
    });
  });

  describe("sendChatMessage", () => {
    it("should send a chat message", async () => {
      const result = await service.sendChatMessage(CHAT_ID, "Hello in chat!");

      expectSuccess(result);
      expect(result.data?.content).toBe("Hello in chat!");
    });
  });

  describe("addReaction", () => {
    it("should add a reaction to a message", async () => {
      const result = await service.addReaction(
        TEAM_ID,
        CHANNEL_ID,
        MESSAGE_ID,
        "like",
      );

      expectSuccess(result);
    });

    it("should support different reaction types", async () => {
      for (const reactionType of [
        "like",
        "heart",
        "laugh",
        "surprised",
      ] as const) {
        const result = await service.addReaction(
          TEAM_ID,
          CHANNEL_ID,
          MESSAGE_ID,
          reactionType,
        );

        expectSuccess(result);
      }
    });
  });

  describe("analyzeTeam", () => {
    it("should return team analysis", async () => {
      const result = await service.analyzeTeam(TEAM_ID);

      expectSuccess(result);
      expect(result.data?.team.id).toBe(TEAM_ID);
    });

    it("should include channels in analysis", async () => {
      const result = await service.analyzeTeam(TEAM_ID);

      expectSuccess(result);
      expect(result.data?.channels.length).toBeGreaterThan(0);
    });

    it("should include recent messages in analysis", async () => {
      const result = await service.analyzeTeam(TEAM_ID);

      expectSuccess(result);
      expect(Array.isArray(result.data?.recentMessages)).toBe(true);
    });

    it("should include active member count", async () => {
      const result = await service.analyzeTeam(TEAM_ID);

      expectSuccess(result);
      expect(result.data?.activeMemberCount).toBeGreaterThanOrEqual(0);
    });

    it("should include upcoming meetings", async () => {
      const result = await service.analyzeTeam(TEAM_ID);

      expectSuccess(result);
      expect(Array.isArray(result.data?.upcomingMeetings)).toBe(true);
    });

    it("should fail for non-existent team", async () => {
      const result = await service.analyzeTeam("nonexistent");

      expectFailure(result, ErrorCodes.NOT_FOUND);
    });
  });

  describe("getWorkspaceOverview", () => {
    it("should return workspace overview", async () => {
      const result = await service.getWorkspaceOverview();

      expectSuccess(result);
    });

    it("should include team count", async () => {
      const result = await service.getWorkspaceOverview();

      expectSuccess(result);
      expect(result.data?.teamCount).toBeGreaterThan(0);
    });

    it("should include total channels", async () => {
      const result = await service.getWorkspaceOverview();

      expectSuccess(result);
      expect(result.data?.totalChannels).toBeGreaterThan(0);
    });

    it("should include total users", async () => {
      const result = await service.getWorkspaceOverview();

      expectSuccess(result);
      expect(result.data?.totalUsers).toBeGreaterThan(0);
    });

    it("should include upcoming meetings count", async () => {
      const result = await service.getWorkspaceOverview();

      expectSuccess(result);
      expect(result.data?.upcomingMeetings).toBeGreaterThanOrEqual(0);
    });

    it("should include active chats count", async () => {
      const result = await service.getWorkspaceOverview();

      expectSuccess(result);
      expect(result.data?.activeChats).toBeGreaterThanOrEqual(0);
    });
  });
});
