import { CopilotClient } from "@github/copilot-sdk";
import {
  TeamsConnector,
  TeamsTeam,
  TeamsChannel,
  TeamsMessage,
  TeamsUser,
  TeamsMeeting,
  AdaptiveCard,
  AdaptiveCardElement,
  AdaptiveCardAction,
  UserPresence,
} from "../../../shared/connectors/teams/client.js";
import {
  ConnectorResult,
  success,
  failure,
  ErrorCodes,
} from "../../../shared/connectors/types.js";

export interface TeamSummary {
  id: string;
  name: string;
  description: string | null;
  channelCount: number;
  memberCount: number;
  isArchived: boolean;
  visibility: string;
}

export interface ChannelSummary {
  id: string;
  name: string;
  description: string | null;
  membershipType: string;
  isFavorite: boolean;
}

export interface MessageSummary {
  id: string;
  content: string;
  author: string;
  authorType: "user" | "application";
  importance: string;
  createdAt: string;
  reactionCount: number;
  replyCount: number;
  hasAttachments: boolean;
}

export interface UserSummary {
  id: string;
  displayName: string;
  email: string;
  jobTitle: string | null;
  department: string | null;
  presence: UserPresence;
}

export interface MeetingSummary {
  id: string;
  subject: string;
  startDateTime: string;
  endDateTime: string;
  organizer: string;
  attendeeCount: number;
  isRecurring: boolean;
  joinUrl: string;
}

export interface AlertNotification {
  teamId: string;
  channelId: string;
  title: string;
  severity: "info" | "warning" | "error" | "critical";
  message: string;
  fields?: Array<{ title: string; value: string }>;
  actionUrl?: string;
  actionTitle?: string;
}

export interface DeploymentNotification {
  teamId: string;
  channelId: string;
  environment: string;
  version: string;
  status: "started" | "succeeded" | "failed" | "rolled_back";
  service: string;
  author?: string;
  commitHash?: string;
  duration?: number;
}

export interface IncidentNotification {
  teamId: string;
  channelId: string;
  incidentId: string;
  title: string;
  status: "triggered" | "acknowledged" | "resolved";
  severity: "low" | "medium" | "high" | "critical";
  service: string;
  assignee?: string;
  summary?: string;
}

export interface TeamAnalysis {
  team: TeamSummary;
  channels: ChannelSummary[];
  recentMessages: MessageSummary[];
  activeMemberCount: number;
  upcomingMeetings: MeetingSummary[];
}

export interface WorkspaceOverview {
  teamCount: number;
  totalChannels: number;
  totalUsers: number;
  upcomingMeetings: number;
  activeChats: number;
}

export interface TeamsCollaborationServiceConfig {
  connector: TeamsConnector;
  client?: CopilotClient;
  defaultTeamId?: string;
  defaultChannelId?: string;
}

export class TeamsCollaborationService {
  private connector: TeamsConnector;
  private client?: CopilotClient;
  private defaultTeamId?: string;
  private defaultChannelId?: string;

  constructor(config: TeamsCollaborationServiceConfig) {
    this.connector = config.connector;
    this.client = config.client;
    this.defaultTeamId = config.defaultTeamId;
    this.defaultChannelId = config.defaultChannelId;
  }

  async sendMessage(
    content: string,
    teamId?: string,
    channelId?: string,
  ): Promise<ConnectorResult<MessageSummary>> {
    const targetTeamId = teamId ?? this.defaultTeamId;
    const targetChannelId = channelId ?? this.defaultChannelId;

    if (!targetTeamId || !targetChannelId) {
      return failure({
        code: ErrorCodes.INVALID_INPUT,
        message: "Team ID and Channel ID are required",
      });
    }

    const result = await this.connector.sendMessage({
      teamId: targetTeamId,
      channelId: targetChannelId,
      content,
    });

    if (!result.success) {
      return failure(result.error!);
    }

    return success(this.toMessageSummary(result.data!));
  }

  async sendAdaptiveCard(
    card: AdaptiveCard,
    teamId?: string,
    channelId?: string,
    summary?: string,
  ): Promise<ConnectorResult<MessageSummary>> {
    const targetTeamId = teamId ?? this.defaultTeamId;
    const targetChannelId = channelId ?? this.defaultChannelId;

    if (!targetTeamId || !targetChannelId) {
      return failure({
        code: ErrorCodes.INVALID_INPUT,
        message: "Team ID and Channel ID are required",
      });
    }

    const result = await this.connector.sendAdaptiveCard({
      teamId: targetTeamId,
      channelId: targetChannelId,
      card,
      summary,
    });

    if (!result.success) {
      return failure(result.error!);
    }

    return success(this.toMessageSummary(result.data!));
  }

  async sendAlertNotification(
    alert: AlertNotification,
  ): Promise<ConnectorResult<MessageSummary>> {
    const severityColors: Record<AlertNotification["severity"], string> = {
      info: "accent",
      warning: "warning",
      error: "attention",
      critical: "attention",
    };

    const severityIcons: Record<AlertNotification["severity"], string> = {
      info: "ℹ️",
      warning: "⚠️",
      error: "❌",
      critical: "🚨",
    };

    const elements: AdaptiveCardElement[] = [
      {
        type: "TextBlock",
        text: `${severityIcons[alert.severity]} ${alert.title}`,
        size: "large",
        weight: "bolder",
        color: severityColors[alert.severity] as AdaptiveCardElement extends {
          color?: infer C;
        }
          ? C
          : never,
      } as AdaptiveCardElement,
      {
        type: "TextBlock",
        text: alert.message,
        wrap: true,
      },
    ];

    if (alert.fields && alert.fields.length > 0) {
      elements.push({
        type: "FactSet",
        facts: alert.fields.map((f) => ({ title: f.title, value: f.value })),
      });
    }

    const actions: AdaptiveCardAction[] = [];
    if (alert.actionUrl) {
      actions.push({
        type: "Action.OpenUrl",
        title: alert.actionTitle ?? "View Details",
        url: alert.actionUrl,
      });
    }

    const card: AdaptiveCard = {
      type: "AdaptiveCard",
      version: "1.4",
      body: elements,
      actions: actions.length > 0 ? actions : undefined,
    };

    return this.sendAdaptiveCard(
      card,
      alert.teamId,
      alert.channelId,
      `${alert.severity.toUpperCase()}: ${alert.title}`,
    );
  }

  async sendDeploymentNotification(
    notification: DeploymentNotification,
  ): Promise<ConnectorResult<MessageSummary>> {
    const statusEmojis: Record<DeploymentNotification["status"], string> = {
      started: "🚀",
      succeeded: "✅",
      failed: "❌",
      rolled_back: "⏪",
    };

    const statusColors: Record<DeploymentNotification["status"], string> = {
      started: "accent",
      succeeded: "good",
      failed: "attention",
      rolled_back: "warning",
    };

    const facts: Array<{ title: string; value: string }> = [
      { title: "Service", value: notification.service },
      { title: "Environment", value: notification.environment },
      { title: "Version", value: notification.version },
      {
        title: "Status",
        value: notification.status.replace("_", " ").toUpperCase(),
      },
    ];

    if (notification.author) {
      facts.push({ title: "Author", value: notification.author });
    }
    if (notification.commitHash) {
      facts.push({
        title: "Commit",
        value: notification.commitHash.substring(0, 7),
      });
    }
    if (notification.duration !== undefined) {
      facts.push({ title: "Duration", value: `${notification.duration}s` });
    }

    const card: AdaptiveCard = {
      type: "AdaptiveCard",
      version: "1.4",
      body: [
        {
          type: "TextBlock",
          text: `${statusEmojis[notification.status]} Deployment ${notification.status.replace("_", " ")}`,
          size: "large",
          weight: "bolder",
          color: statusColors[
            notification.status
          ] as AdaptiveCardElement extends { color?: infer C } ? C : never,
        } as AdaptiveCardElement,
        {
          type: "FactSet",
          facts,
        },
      ],
    };

    return this.sendAdaptiveCard(
      card,
      notification.teamId,
      notification.channelId,
      `Deployment ${notification.status}: ${notification.service} v${notification.version}`,
    );
  }

  async sendIncidentNotification(
    notification: IncidentNotification,
  ): Promise<ConnectorResult<MessageSummary>> {
    const statusEmojis: Record<IncidentNotification["status"], string> = {
      triggered: "🔴",
      acknowledged: "🟡",
      resolved: "🟢",
    };

    const severityLabels: Record<IncidentNotification["severity"], string> = {
      low: "Low",
      medium: "Medium",
      high: "High",
      critical: "Critical",
    };

    const facts: Array<{ title: string; value: string }> = [
      { title: "Incident ID", value: notification.incidentId },
      { title: "Service", value: notification.service },
      { title: "Severity", value: severityLabels[notification.severity] },
      {
        title: "Status",
        value:
          notification.status.charAt(0).toUpperCase() +
          notification.status.slice(1),
      },
    ];

    if (notification.assignee) {
      facts.push({ title: "Assignee", value: notification.assignee });
    }

    const elements: AdaptiveCardElement[] = [
      {
        type: "TextBlock",
        text: `${statusEmojis[notification.status]} ${notification.title}`,
        size: "large",
        weight: "bolder",
      },
      {
        type: "FactSet",
        facts,
      },
    ];

    if (notification.summary) {
      elements.push({
        type: "TextBlock",
        text: notification.summary,
        wrap: true,
      });
    }

    const card: AdaptiveCard = {
      type: "AdaptiveCard",
      version: "1.4",
      body: elements,
    };

    return this.sendAdaptiveCard(
      card,
      notification.teamId,
      notification.channelId,
      `Incident ${notification.status}: ${notification.title}`,
    );
  }

  async replyToMessage(
    teamId: string,
    channelId: string,
    messageId: string,
    content: string,
  ): Promise<ConnectorResult<MessageSummary>> {
    const result = await this.connector.replyToMessage({
      teamId,
      channelId,
      messageId,
      content,
    });

    if (!result.success) {
      return failure(result.error!);
    }

    return success(this.toMessageSummary(result.data!));
  }

  async getTeams(options?: {
    filter?: string;
    includeArchived?: boolean;
    limit?: number;
  }): Promise<ConnectorResult<TeamSummary[]>> {
    const result = await this.connector.listTeams({
      filter: options?.filter,
      archived: options?.includeArchived ? undefined : false,
      limit: options?.limit,
    });

    if (!result.success) {
      return failure(result.error!);
    }

    return success(result.data!.map((t) => this.toTeamSummary(t)));
  }

  async getTeam(teamId: string): Promise<ConnectorResult<TeamSummary>> {
    const result = await this.connector.getTeam(teamId);

    if (!result.success) {
      return failure(result.error!);
    }

    return success(this.toTeamSummary(result.data!));
  }

  async getChannels(
    teamId: string,
    membershipType?: "standard" | "private" | "shared",
  ): Promise<ConnectorResult<ChannelSummary[]>> {
    const result = await this.connector.listChannels({
      teamId,
      membershipType,
    });

    if (!result.success) {
      return failure(result.error!);
    }

    return success(result.data!.map((c) => this.toChannelSummary(c)));
  }

  async createChannel(
    teamId: string,
    name: string,
    description?: string,
    isPrivate?: boolean,
  ): Promise<ConnectorResult<ChannelSummary>> {
    const result = await this.connector.createChannel(
      teamId,
      name,
      description,
      isPrivate ? "private" : "standard",
    );

    if (!result.success) {
      return failure(result.error!);
    }

    return success(this.toChannelSummary(result.data!));
  }

  async getMessages(
    teamId: string,
    channelId: string,
    options?: { limit?: number; since?: string },
  ): Promise<ConnectorResult<MessageSummary[]>> {
    const result = await this.connector.listMessages({
      teamId,
      channelId,
      limit: options?.limit,
      since: options?.since,
    });

    if (!result.success) {
      return failure(result.error!);
    }

    return success(result.data!.map((m) => this.toMessageSummary(m)));
  }

  async getUser(userId: string): Promise<ConnectorResult<UserSummary>> {
    const result = await this.connector.getUser(userId);

    if (!result.success) {
      return failure(result.error!);
    }

    return success(this.toUserSummary(result.data!));
  }

  async findUserByEmail(email: string): Promise<ConnectorResult<UserSummary>> {
    const result = await this.connector.getUserByEmail(email);

    if (!result.success) {
      return failure(result.error!);
    }

    return success(this.toUserSummary(result.data!));
  }

  async getUsers(
    filter?: string,
    limit?: number,
  ): Promise<ConnectorResult<UserSummary[]>> {
    const result = await this.connector.listUsers(filter, limit);

    if (!result.success) {
      return failure(result.error!);
    }

    return success(result.data!.map((u) => this.toUserSummary(u)));
  }

  async getUserPresence(
    userId: string,
  ): Promise<ConnectorResult<UserPresence>> {
    return this.connector.getUserPresence(userId);
  }

  async getMeetings(options?: {
    userId?: string;
    startDateTime?: string;
    endDateTime?: string;
    limit?: number;
  }): Promise<ConnectorResult<MeetingSummary[]>> {
    const result = await this.connector.listMeetings(options);

    if (!result.success) {
      return failure(result.error!);
    }

    return success(result.data!.map((m) => this.toMeetingSummary(m)));
  }

  async getMeeting(
    meetingId: string,
  ): Promise<ConnectorResult<MeetingSummary>> {
    const result = await this.connector.getMeeting(meetingId);

    if (!result.success) {
      return failure(result.error!);
    }

    return success(this.toMeetingSummary(result.data!));
  }

  async createMeeting(
    subject: string,
    startDateTime: string,
    endDateTime: string,
    attendeeEmails: string[],
  ): Promise<ConnectorResult<MeetingSummary>> {
    const result = await this.connector.createMeeting({
      subject,
      startDateTime,
      endDateTime,
      attendees: attendeeEmails,
    });

    if (!result.success) {
      return failure(result.error!);
    }

    return success(this.toMeetingSummary(result.data!));
  }

  async getChats(options?: {
    userId?: string;
    chatType?: "oneOnOne" | "group" | "meeting";
    limit?: number;
  }): Promise<ConnectorResult<number>> {
    const result = await this.connector.listChats(options);

    if (!result.success) {
      return failure(result.error!);
    }

    return success(result.data!.length);
  }

  async sendChatMessage(
    chatId: string,
    content: string,
  ): Promise<ConnectorResult<MessageSummary>> {
    const result = await this.connector.sendChatMessage({
      chatId,
      content,
    });

    if (!result.success) {
      return failure(result.error!);
    }

    return success(this.toMessageSummary(result.data!));
  }

  async addReaction(
    teamId: string,
    channelId: string,
    messageId: string,
    reactionType: "like" | "angry" | "sad" | "laugh" | "heart" | "surprised",
  ): Promise<ConnectorResult<void>> {
    return this.connector.addReaction(
      teamId,
      channelId,
      messageId,
      reactionType,
    );
  }

  async analyzeTeam(teamId: string): Promise<ConnectorResult<TeamAnalysis>> {
    const teamResult = await this.connector.getTeam(teamId);
    if (!teamResult.success) {
      return failure(teamResult.error!);
    }

    const team = teamResult.data!;
    const channelsResult = await this.connector.listChannels({ teamId });
    const channels = channelsResult.success ? channelsResult.data! : [];

    let recentMessages: TeamsMessage[] = [];
    if (channels.length > 0) {
      const generalChannel =
        channels.find((c) => c.displayName === "General") ?? channels[0];
      const messagesResult = await this.connector.listMessages({
        teamId,
        channelId: generalChannel.id,
        limit: 10,
      });
      if (messagesResult.success) {
        recentMessages = messagesResult.data!;
      }
    }

    const meetingsResult = await this.connector.listMeetings({ limit: 5 });
    const upcomingMeetings = meetingsResult.success ? meetingsResult.data! : [];

    return success({
      team: this.toTeamSummary(team),
      channels: channels.map((c) => this.toChannelSummary(c)),
      recentMessages: recentMessages.map((m) => this.toMessageSummary(m)),
      activeMemberCount: team.members.filter((m) => m.role !== "guest").length,
      upcomingMeetings: upcomingMeetings.map((m) => this.toMeetingSummary(m)),
    });
  }

  async getWorkspaceOverview(): Promise<ConnectorResult<WorkspaceOverview>> {
    const teamsResult = await this.connector.listTeams({ archived: false });
    if (!teamsResult.success) {
      return failure(teamsResult.error!);
    }

    const teams = teamsResult.data!;
    let totalChannels = 0;
    for (const team of teams) {
      totalChannels += team.channels.length;
    }

    const usersResult = await this.connector.listUsers();
    const userCount = usersResult.success ? usersResult.data!.length : 0;

    const meetingsResult = await this.connector.listMeetings({ limit: 50 });
    const upcomingMeetings = meetingsResult.success
      ? meetingsResult.data!.length
      : 0;

    const chatsResult = await this.connector.listChats();
    const activeChats = chatsResult.success ? chatsResult.data!.length : 0;

    return success({
      teamCount: teams.length,
      totalChannels,
      totalUsers: userCount,
      upcomingMeetings,
      activeChats,
    });
  }

  private toTeamSummary(team: TeamsTeam): TeamSummary {
    return {
      id: team.id,
      name: team.displayName,
      description: team.description,
      channelCount: team.channels.length,
      memberCount: team.members.length,
      isArchived: team.isArchived,
      visibility: team.visibility,
    };
  }

  private toChannelSummary(channel: TeamsChannel): ChannelSummary {
    return {
      id: channel.id,
      name: channel.displayName,
      description: channel.description,
      membershipType: channel.membershipType,
      isFavorite: channel.isFavoriteByDefault,
    };
  }

  private toMessageSummary(message: TeamsMessage): MessageSummary {
    return {
      id: message.id,
      content: message.body.content,
      author:
        message.from.user?.displayName ??
        message.from.application?.displayName ??
        "Unknown",
      authorType: message.from.user ? "user" : "application",
      importance: message.importance,
      createdAt: message.createdDateTime,
      reactionCount: message.reactions.length,
      replyCount: message.replies.length,
      hasAttachments: message.attachments.length > 0,
    };
  }

  private toUserSummary(user: TeamsUser): UserSummary {
    return {
      id: user.id,
      displayName: user.displayName,
      email: user.email,
      jobTitle: user.jobTitle,
      department: user.department,
      presence: user.presence,
    };
  }

  private toMeetingSummary(meeting: TeamsMeeting): MeetingSummary {
    return {
      id: meeting.id,
      subject: meeting.subject,
      startDateTime: meeting.startDateTime,
      endDateTime: meeting.endDateTime,
      organizer: meeting.organizer.displayName,
      attendeeCount: meeting.attendees.length,
      isRecurring: meeting.isRecurring,
      joinUrl: meeting.joinUrl,
    };
  }
}

export function createTeamsCollaborationService(
  config: TeamsCollaborationServiceConfig,
): TeamsCollaborationService {
  return new TeamsCollaborationService(config);
}
