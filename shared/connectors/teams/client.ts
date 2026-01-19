import {
  BaseConnector,
  BaseConnectorConfig,
  ConnectorResult,
  HealthCheckResponse,
  success,
  failure,
  ErrorCodes,
} from "../types.js";

// ============================================================================
// Microsoft Teams Types
// ============================================================================

export type TeamVisibility = "public" | "private";
export type ChannelMembershipType = "standard" | "private" | "shared";
export type MessageImportance = "normal" | "high" | "urgent";
export type MeetingType = "scheduled" | "recurring" | "broadcast" | "meetNow";
export type UserPresence =
  | "available"
  | "busy"
  | "doNotDisturb"
  | "away"
  | "offline"
  | "unknown";
export type MemberRole = "owner" | "member" | "guest";

export interface TeamsUser {
  id: string;
  displayName: string;
  email: string;
  userPrincipalName: string;
  jobTitle: string | null;
  department: string | null;
  officeLocation: string | null;
  presence: UserPresence;
  avatarUrl: string | null;
}

export interface TeamsTeam {
  id: string;
  displayName: string;
  description: string | null;
  visibility: TeamVisibility;
  isArchived: boolean;
  createdDateTime: string;
  webUrl: string;
  channels: TeamsChannel[];
  members: TeamsTeamMember[];
}

export interface TeamsTeamMember {
  id: string;
  user: TeamsUser;
  role: MemberRole;
  joinedDateTime: string;
}

export interface TeamsChannel {
  id: string;
  displayName: string;
  description: string | null;
  membershipType: ChannelMembershipType;
  webUrl: string;
  email: string | null;
  createdDateTime: string;
  isFavoriteByDefault: boolean;
}

export interface TeamsMessage {
  id: string;
  createdDateTime: string;
  lastModifiedDateTime: string | null;
  deletedDateTime: string | null;
  subject: string | null;
  body: {
    contentType: "text" | "html";
    content: string;
  };
  from: {
    user: TeamsUser | null;
    application: { id: string; displayName: string } | null;
  };
  importance: MessageImportance;
  webUrl: string;
  attachments: TeamsAttachment[];
  mentions: TeamsMention[];
  reactions: TeamsReaction[];
  replies: TeamsMessage[];
  replyToId: string | null;
}

export interface TeamsAttachment {
  id: string;
  contentType: string;
  contentUrl: string | null;
  content: string | null;
  name: string | null;
  thumbnailUrl: string | null;
}

export interface TeamsMention {
  id: number;
  mentionText: string;
  mentioned: {
    user: TeamsUser | null;
    conversation: { id: string; displayName: string } | null;
  };
}

export interface TeamsReaction {
  reactionType: "like" | "angry" | "sad" | "laugh" | "heart" | "surprised";
  user: TeamsUser;
  createdDateTime: string;
}

export interface TeamsMeeting {
  id: string;
  subject: string;
  startDateTime: string;
  endDateTime: string;
  joinUrl: string;
  meetingType: MeetingType;
  organizer: TeamsUser;
  attendees: TeamsMeetingAttendee[];
  isRecurring: boolean;
  isBroadcast: boolean;
  recordingUrl: string | null;
  transcriptUrl: string | null;
}

export interface TeamsMeetingAttendee {
  user: TeamsUser;
  type: "required" | "optional" | "resource";
  status: "none" | "accepted" | "declined" | "tentative";
}

export interface TeamsChat {
  id: string;
  topic: string | null;
  chatType: "oneOnOne" | "group" | "meeting";
  createdDateTime: string;
  lastUpdatedDateTime: string;
  webUrl: string;
  members: TeamsUser[];
  lastMessage: TeamsMessage | null;
}

export interface TeamsTab {
  id: string;
  displayName: string;
  webUrl: string;
  configuration: {
    entityId: string | null;
    contentUrl: string | null;
    websiteUrl: string | null;
    removeUrl: string | null;
  };
  teamsApp: {
    id: string;
    displayName: string;
  };
}

export interface TeamsApp {
  id: string;
  externalId: string | null;
  displayName: string;
  distributionMethod: "store" | "organization" | "sideloaded";
}

// Adaptive Card types (simplified)
export interface AdaptiveCard {
  type: "AdaptiveCard";
  version: string;
  body: AdaptiveCardElement[];
  actions?: AdaptiveCardAction[];
}

export type AdaptiveCardElement =
  | AdaptiveCardTextBlock
  | AdaptiveCardImage
  | AdaptiveCardContainer
  | AdaptiveCardColumnSet
  | AdaptiveCardFactSet
  | AdaptiveCardInput;

export interface AdaptiveCardTextBlock {
  type: "TextBlock";
  text: string;
  size?: "small" | "default" | "medium" | "large" | "extraLarge";
  weight?: "lighter" | "default" | "bolder";
  color?:
    | "default"
    | "dark"
    | "light"
    | "accent"
    | "good"
    | "warning"
    | "attention";
  wrap?: boolean;
}

export interface AdaptiveCardImage {
  type: "Image";
  url: string;
  size?: "auto" | "stretch" | "small" | "medium" | "large";
  altText?: string;
}

export interface AdaptiveCardContainer {
  type: "Container";
  items: AdaptiveCardElement[];
  style?: "default" | "emphasis" | "good" | "attention" | "warning" | "accent";
}

export interface AdaptiveCardColumnSet {
  type: "ColumnSet";
  columns: {
    type: "Column";
    width: string | number;
    items: AdaptiveCardElement[];
  }[];
}

export interface AdaptiveCardFactSet {
  type: "FactSet";
  facts: { title: string; value: string }[];
}

export interface AdaptiveCardInput {
  type:
    | "Input.Text"
    | "Input.Number"
    | "Input.Date"
    | "Input.Toggle"
    | "Input.ChoiceSet";
  id: string;
  label?: string;
  placeholder?: string;
  value?: string;
  isRequired?: boolean;
}

export type AdaptiveCardAction =
  | { type: "Action.OpenUrl"; title: string; url: string }
  | { type: "Action.Submit"; title: string; data?: Record<string, unknown> }
  | { type: "Action.ShowCard"; title: string; card: AdaptiveCard };

// ============================================================================
// Filter and Options Types
// ============================================================================

export interface ListTeamsOptions {
  filter?: string;
  limit?: number;
  archived?: boolean;
}

export interface ListChannelsOptions {
  teamId: string;
  membershipType?: ChannelMembershipType;
}

export interface ListMessagesOptions {
  teamId: string;
  channelId: string;
  limit?: number;
  since?: string;
}

export interface SendMessageOptions {
  teamId: string;
  channelId: string;
  content: string;
  contentType?: "text" | "html";
  importance?: MessageImportance;
  mentions?: { userId: string; text: string }[];
  attachments?: { contentType: string; content: string; name?: string }[];
}

export interface SendAdaptiveCardOptions {
  teamId: string;
  channelId: string;
  card: AdaptiveCard;
  summary?: string;
}

export interface ReplyToMessageOptions {
  teamId: string;
  channelId: string;
  messageId: string;
  content: string;
  contentType?: "text" | "html";
}

export interface ListMeetingsOptions {
  userId?: string;
  startDateTime?: string;
  endDateTime?: string;
  limit?: number;
}

export interface CreateMeetingOptions {
  subject: string;
  startDateTime: string;
  endDateTime: string;
  attendees: string[];
  isOnlineMeeting?: boolean;
  content?: string;
}

export interface ListChatsOptions {
  userId?: string;
  chatType?: "oneOnOne" | "group" | "meeting";
  limit?: number;
}

export interface SendChatMessageOptions {
  chatId: string;
  content: string;
  contentType?: "text" | "html";
}

// ============================================================================
// Connector Configuration
// ============================================================================

export interface TeamsConnectorConfig extends BaseConnectorConfig {
  /** Microsoft Graph API access token */
  accessToken?: string;
  /** Azure AD tenant ID */
  tenantId?: string;
  /** Azure AD client ID */
  clientId?: string;
  /** Azure AD client secret */
  clientSecret?: string;
  /** Default team ID for operations */
  defaultTeamId?: string;
}

// ============================================================================
// Connector Interface
// ============================================================================

export interface TeamsConnector extends BaseConnector {
  // Team operations
  listTeams(options?: ListTeamsOptions): Promise<ConnectorResult<TeamsTeam[]>>;
  getTeam(teamId: string): Promise<ConnectorResult<TeamsTeam>>;
  getTeamMembers(teamId: string): Promise<ConnectorResult<TeamsTeamMember[]>>;

  // Channel operations
  listChannels(
    options: ListChannelsOptions,
  ): Promise<ConnectorResult<TeamsChannel[]>>;
  getChannel(
    teamId: string,
    channelId: string,
  ): Promise<ConnectorResult<TeamsChannel>>;
  createChannel(
    teamId: string,
    displayName: string,
    description?: string,
    membershipType?: ChannelMembershipType,
  ): Promise<ConnectorResult<TeamsChannel>>;

  // Message operations
  listMessages(
    options: ListMessagesOptions,
  ): Promise<ConnectorResult<TeamsMessage[]>>;
  getMessage(
    teamId: string,
    channelId: string,
    messageId: string,
  ): Promise<ConnectorResult<TeamsMessage>>;
  sendMessage(
    options: SendMessageOptions,
  ): Promise<ConnectorResult<TeamsMessage>>;
  sendAdaptiveCard(
    options: SendAdaptiveCardOptions,
  ): Promise<ConnectorResult<TeamsMessage>>;
  replyToMessage(
    options: ReplyToMessageOptions,
  ): Promise<ConnectorResult<TeamsMessage>>;
  addReaction(
    teamId: string,
    channelId: string,
    messageId: string,
    reactionType: TeamsReaction["reactionType"],
  ): Promise<ConnectorResult<void>>;

  // User operations
  getUser(userId: string): Promise<ConnectorResult<TeamsUser>>;
  getUserByEmail(email: string): Promise<ConnectorResult<TeamsUser>>;
  getUserPresence(userId: string): Promise<ConnectorResult<UserPresence>>;
  listUsers(
    filter?: string,
    limit?: number,
  ): Promise<ConnectorResult<TeamsUser[]>>;

  // Meeting operations
  listMeetings(
    options?: ListMeetingsOptions,
  ): Promise<ConnectorResult<TeamsMeeting[]>>;
  getMeeting(meetingId: string): Promise<ConnectorResult<TeamsMeeting>>;
  createMeeting(
    options: CreateMeetingOptions,
  ): Promise<ConnectorResult<TeamsMeeting>>;

  // Chat operations
  listChats(options?: ListChatsOptions): Promise<ConnectorResult<TeamsChat[]>>;
  getChat(chatId: string): Promise<ConnectorResult<TeamsChat>>;
  sendChatMessage(
    options: SendChatMessageOptions,
  ): Promise<ConnectorResult<TeamsMessage>>;

  // Tab operations
  listTabs(
    teamId: string,
    channelId: string,
  ): Promise<ConnectorResult<TeamsTab[]>>;
  addTab(
    teamId: string,
    channelId: string,
    displayName: string,
    teamsAppId: string,
    configuration: TeamsTab["configuration"],
  ): Promise<ConnectorResult<TeamsTab>>;

  // App operations
  listInstalledApps(teamId: string): Promise<ConnectorResult<TeamsApp[]>>;
}

// ============================================================================
// Factory Function
// ============================================================================

export function createTeamsConnector(
  config: TeamsConnectorConfig,
): TeamsConnector {
  if (config.mode === "mock") {
    return new MockTeamsConnector(config);
  }
  return new LiveTeamsConnector(config);
}

// ============================================================================
// Mock Implementation
// ============================================================================

class MockTeamsConnector implements TeamsConnector {
  readonly name = "teams";
  readonly mode = "mock" as const;
  private _isInitialized = false;

  private config: TeamsConnectorConfig;

  // Mock data stores
  private users: Map<string, TeamsUser> = new Map();
  private teams: Map<string, TeamsTeam> = new Map();
  private channels: Map<string, TeamsChannel> = new Map();
  private messages: Map<string, TeamsMessage> = new Map();
  private meetings: Map<string, TeamsMeeting> = new Map();
  private chats: Map<string, TeamsChat> = new Map();
  private tabs: Map<string, TeamsTab> = new Map();
  private apps: Map<string, TeamsApp> = new Map();

  constructor(config: TeamsConnectorConfig) {
    this.config = config;
    this.seedMockData();
  }

  private seedMockData(): void {
    // Seed users
    const users: TeamsUser[] = [
      {
        id: "user-1",
        displayName: "Alice Johnson",
        email: "alice@contoso.com",
        userPrincipalName: "alice@contoso.onmicrosoft.com",
        jobTitle: "Software Engineer",
        department: "Engineering",
        officeLocation: "Building 1",
        presence: "available",
        avatarUrl: "https://example.com/avatars/alice.png",
      },
      {
        id: "user-2",
        displayName: "Bob Smith",
        email: "bob@contoso.com",
        userPrincipalName: "bob@contoso.onmicrosoft.com",
        jobTitle: "Product Manager",
        department: "Product",
        officeLocation: "Building 2",
        presence: "busy",
        avatarUrl: "https://example.com/avatars/bob.png",
      },
      {
        id: "user-3",
        displayName: "Carol Williams",
        email: "carol@contoso.com",
        userPrincipalName: "carol@contoso.onmicrosoft.com",
        jobTitle: "DevOps Engineer",
        department: "Engineering",
        officeLocation: "Building 1",
        presence: "away",
        avatarUrl: "https://example.com/avatars/carol.png",
      },
      {
        id: "user-4",
        displayName: "David Brown",
        email: "david@contoso.com",
        userPrincipalName: "david@contoso.onmicrosoft.com",
        jobTitle: "Security Analyst",
        department: "Security",
        officeLocation: "Building 3",
        presence: "doNotDisturb",
        avatarUrl: null,
      },
      {
        id: "user-5",
        displayName: "Eve Davis",
        email: "eve@contoso.com",
        userPrincipalName: "eve@contoso.onmicrosoft.com",
        jobTitle: "Engineering Manager",
        department: "Engineering",
        officeLocation: "Building 1",
        presence: "available",
        avatarUrl: "https://example.com/avatars/eve.png",
      },
    ];

    users.forEach((user) => this.users.set(user.id, user));

    // Seed teams
    const engineeringTeam: TeamsTeam = {
      id: "team-engineering",
      displayName: "Engineering",
      description: "Engineering team workspace",
      visibility: "private",
      isArchived: false,
      createdDateTime: "2024-01-15T10:00:00Z",
      webUrl: "https://teams.microsoft.com/l/team/engineering",
      channels: [],
      members: [
        {
          id: "member-1",
          user: users[0],
          role: "member",
          joinedDateTime: "2024-01-15T10:00:00Z",
        },
        {
          id: "member-2",
          user: users[2],
          role: "member",
          joinedDateTime: "2024-01-16T09:00:00Z",
        },
        {
          id: "member-3",
          user: users[4],
          role: "owner",
          joinedDateTime: "2024-01-15T10:00:00Z",
        },
      ],
    };

    const productTeam: TeamsTeam = {
      id: "team-product",
      displayName: "Product",
      description: "Product team collaboration",
      visibility: "public",
      isArchived: false,
      createdDateTime: "2024-02-01T14:00:00Z",
      webUrl: "https://teams.microsoft.com/l/team/product",
      channels: [],
      members: [
        {
          id: "member-4",
          user: users[1],
          role: "owner",
          joinedDateTime: "2024-02-01T14:00:00Z",
        },
        {
          id: "member-5",
          user: users[0],
          role: "member",
          joinedDateTime: "2024-02-02T10:00:00Z",
        },
      ],
    };

    const archivedTeam: TeamsTeam = {
      id: "team-archived",
      displayName: "Old Project",
      description: "Archived project team",
      visibility: "private",
      isArchived: true,
      createdDateTime: "2023-06-01T08:00:00Z",
      webUrl: "https://teams.microsoft.com/l/team/old-project",
      channels: [],
      members: [],
    };

    // Seed channels
    const generalChannel: TeamsChannel = {
      id: "channel-general",
      displayName: "General",
      description: "General discussions",
      membershipType: "standard",
      webUrl: "https://teams.microsoft.com/l/channel/general",
      email: "engineering-general@contoso.com",
      createdDateTime: "2024-01-15T10:00:00Z",
      isFavoriteByDefault: true,
    };

    const devChannel: TeamsChannel = {
      id: "channel-dev",
      displayName: "Development",
      description: "Development discussions and updates",
      membershipType: "standard",
      webUrl: "https://teams.microsoft.com/l/channel/dev",
      email: "engineering-dev@contoso.com",
      createdDateTime: "2024-01-16T11:00:00Z",
      isFavoriteByDefault: true,
    };

    const alertsChannel: TeamsChannel = {
      id: "channel-alerts",
      displayName: "Alerts",
      description: "System alerts and notifications",
      membershipType: "standard",
      webUrl: "https://teams.microsoft.com/l/channel/alerts",
      email: "engineering-alerts@contoso.com",
      createdDateTime: "2024-01-17T09:00:00Z",
      isFavoriteByDefault: false,
    };

    const privateChannel: TeamsChannel = {
      id: "channel-private",
      displayName: "Leadership",
      description: "Private leadership discussions",
      membershipType: "private",
      webUrl: "https://teams.microsoft.com/l/channel/leadership",
      email: null,
      createdDateTime: "2024-01-20T14:00:00Z",
      isFavoriteByDefault: false,
    };

    engineeringTeam.channels = [
      generalChannel,
      devChannel,
      alertsChannel,
      privateChannel,
    ];

    const productGeneralChannel: TeamsChannel = {
      id: "channel-product-general",
      displayName: "General",
      description: "Product team general discussions",
      membershipType: "standard",
      webUrl: "https://teams.microsoft.com/l/channel/product-general",
      email: "product-general@contoso.com",
      createdDateTime: "2024-02-01T14:00:00Z",
      isFavoriteByDefault: true,
    };

    productTeam.channels = [productGeneralChannel];

    this.teams.set(engineeringTeam.id, engineeringTeam);
    this.teams.set(productTeam.id, productTeam);
    this.teams.set(archivedTeam.id, archivedTeam);

    [
      generalChannel,
      devChannel,
      alertsChannel,
      privateChannel,
      productGeneralChannel,
    ].forEach((ch) => this.channels.set(ch.id, ch));

    // Seed messages
    const messages: TeamsMessage[] = [
      {
        id: "msg-1",
        createdDateTime: "2024-12-01T10:30:00Z",
        lastModifiedDateTime: null,
        deletedDateTime: null,
        subject: "Sprint Planning",
        body: {
          contentType: "text",
          content: "Let's discuss the sprint goals for this week.",
        },
        from: {
          user: users[4],
          application: null,
        },
        importance: "normal",
        webUrl: "https://teams.microsoft.com/l/message/msg-1",
        attachments: [],
        mentions: [],
        reactions: [
          {
            reactionType: "like",
            user: users[0],
            createdDateTime: "2024-12-01T10:35:00Z",
          },
        ],
        replies: [],
        replyToId: null,
      },
      {
        id: "msg-2",
        createdDateTime: "2024-12-01T11:00:00Z",
        lastModifiedDateTime: null,
        deletedDateTime: null,
        subject: null,
        body: {
          contentType: "text",
          content: "I've completed the API refactoring. Ready for review.",
        },
        from: {
          user: users[0],
          application: null,
        },
        importance: "normal",
        webUrl: "https://teams.microsoft.com/l/message/msg-2",
        attachments: [],
        mentions: [],
        reactions: [],
        replies: [],
        replyToId: null,
      },
      {
        id: "msg-3",
        createdDateTime: "2024-12-01T14:00:00Z",
        lastModifiedDateTime: null,
        deletedDateTime: null,
        subject: "URGENT: Production Issue",
        body: {
          contentType: "html",
          content:
            "<p><strong>Alert:</strong> High CPU usage detected on prod-server-1</p>",
        },
        from: {
          user: null,
          application: { id: "app-monitoring", displayName: "Monitoring Bot" },
        },
        importance: "urgent",
        webUrl: "https://teams.microsoft.com/l/message/msg-3",
        attachments: [],
        mentions: [
          {
            id: 0,
            mentionText: "@Carol Williams",
            mentioned: { user: users[2], conversation: null },
          },
        ],
        reactions: [],
        replies: [
          {
            id: "msg-3-reply-1",
            createdDateTime: "2024-12-01T14:05:00Z",
            lastModifiedDateTime: null,
            deletedDateTime: null,
            subject: null,
            body: {
              contentType: "text",
              content: "I'm looking into it now.",
            },
            from: {
              user: users[2],
              application: null,
            },
            importance: "normal",
            webUrl: "https://teams.microsoft.com/l/message/msg-3-reply-1",
            attachments: [],
            mentions: [],
            reactions: [],
            replies: [],
            replyToId: "msg-3",
          },
        ],
        replyToId: null,
      },
      {
        id: "msg-4",
        createdDateTime: "2024-12-02T09:00:00Z",
        lastModifiedDateTime: null,
        deletedDateTime: null,
        subject: "Deployment Complete",
        body: {
          contentType: "text",
          content: "v2.5.0 has been successfully deployed to production.",
        },
        from: {
          user: null,
          application: { id: "app-cicd", displayName: "CI/CD Bot" },
        },
        importance: "high",
        webUrl: "https://teams.microsoft.com/l/message/msg-4",
        attachments: [],
        mentions: [],
        reactions: [
          {
            reactionType: "heart",
            user: users[0],
            createdDateTime: "2024-12-02T09:05:00Z",
          },
          {
            reactionType: "like",
            user: users[2],
            createdDateTime: "2024-12-02T09:06:00Z",
          },
        ],
        replies: [],
        replyToId: null,
      },
    ];

    messages.forEach((msg) => this.messages.set(msg.id, msg));

    // Seed meetings
    const meetings: TeamsMeeting[] = [
      {
        id: "meeting-1",
        subject: "Sprint Planning",
        startDateTime: "2024-12-05T10:00:00Z",
        endDateTime: "2024-12-05T11:00:00Z",
        joinUrl: "https://teams.microsoft.com/l/meetup-join/meeting-1",
        meetingType: "scheduled",
        organizer: users[4],
        attendees: [
          { user: users[0], type: "required", status: "accepted" },
          { user: users[2], type: "required", status: "accepted" },
          { user: users[1], type: "optional", status: "tentative" },
        ],
        isRecurring: false,
        isBroadcast: false,
        recordingUrl: null,
        transcriptUrl: null,
      },
      {
        id: "meeting-2",
        subject: "Daily Standup",
        startDateTime: "2024-12-03T09:00:00Z",
        endDateTime: "2024-12-03T09:15:00Z",
        joinUrl: "https://teams.microsoft.com/l/meetup-join/meeting-2",
        meetingType: "recurring",
        organizer: users[4],
        attendees: [
          { user: users[0], type: "required", status: "accepted" },
          { user: users[2], type: "required", status: "accepted" },
        ],
        isRecurring: true,
        isBroadcast: false,
        recordingUrl: null,
        transcriptUrl: null,
      },
      {
        id: "meeting-3",
        subject: "Security Review",
        startDateTime: "2024-12-06T14:00:00Z",
        endDateTime: "2024-12-06T15:00:00Z",
        joinUrl: "https://teams.microsoft.com/l/meetup-join/meeting-3",
        meetingType: "scheduled",
        organizer: users[3],
        attendees: [
          { user: users[0], type: "required", status: "none" },
          { user: users[2], type: "required", status: "none" },
          { user: users[4], type: "required", status: "accepted" },
        ],
        isRecurring: false,
        isBroadcast: false,
        recordingUrl: null,
        transcriptUrl: null,
      },
    ];

    meetings.forEach((meeting) => this.meetings.set(meeting.id, meeting));

    // Seed chats
    const chats: TeamsChat[] = [
      {
        id: "chat-1",
        topic: null,
        chatType: "oneOnOne",
        createdDateTime: "2024-11-15T10:00:00Z",
        lastUpdatedDateTime: "2024-12-01T16:30:00Z",
        webUrl: "https://teams.microsoft.com/l/chat/chat-1",
        members: [users[0], users[1]],
        lastMessage: {
          id: "chat-msg-1",
          createdDateTime: "2024-12-01T16:30:00Z",
          lastModifiedDateTime: null,
          deletedDateTime: null,
          subject: null,
          body: {
            contentType: "text",
            content: "Sounds good, let's sync tomorrow.",
          },
          from: { user: users[1], application: null },
          importance: "normal",
          webUrl: "https://teams.microsoft.com/l/message/chat-msg-1",
          attachments: [],
          mentions: [],
          reactions: [],
          replies: [],
          replyToId: null,
        },
      },
      {
        id: "chat-2",
        topic: "Project Alpha",
        chatType: "group",
        createdDateTime: "2024-10-01T08:00:00Z",
        lastUpdatedDateTime: "2024-12-02T11:00:00Z",
        webUrl: "https://teams.microsoft.com/l/chat/chat-2",
        members: [users[0], users[2], users[4]],
        lastMessage: {
          id: "chat-msg-2",
          createdDateTime: "2024-12-02T11:00:00Z",
          lastModifiedDateTime: null,
          deletedDateTime: null,
          subject: null,
          body: { contentType: "text", content: "The deployment is complete!" },
          from: { user: users[2], application: null },
          importance: "normal",
          webUrl: "https://teams.microsoft.com/l/message/chat-msg-2",
          attachments: [],
          mentions: [],
          reactions: [],
          replies: [],
          replyToId: null,
        },
      },
    ];

    chats.forEach((chat) => this.chats.set(chat.id, chat));

    // Seed tabs
    const tabs: TeamsTab[] = [
      {
        id: "tab-1",
        displayName: "Wiki",
        webUrl: "https://teams.microsoft.com/l/entity/wiki",
        configuration: {
          entityId: "wiki-engineering",
          contentUrl: "https://contoso.sharepoint.com/sites/engineering/wiki",
          websiteUrl: null,
          removeUrl: null,
        },
        teamsApp: {
          id: "com.microsoft.teamspace.tab.wiki",
          displayName: "Wiki",
        },
      },
      {
        id: "tab-2",
        displayName: "Planner",
        webUrl: "https://teams.microsoft.com/l/entity/planner",
        configuration: {
          entityId: "planner-engineering",
          contentUrl: "https://tasks.office.com/contoso/engineering",
          websiteUrl: "https://tasks.office.com/contoso/engineering",
          removeUrl: null,
        },
        teamsApp: {
          id: "com.microsoft.teamspace.tab.planner",
          displayName: "Tasks by Planner",
        },
      },
      {
        id: "tab-3",
        displayName: "GitHub",
        webUrl: "https://teams.microsoft.com/l/entity/github",
        configuration: {
          entityId: "github-repo",
          contentUrl: "https://github.com/contoso/main-repo",
          websiteUrl: "https://github.com/contoso/main-repo",
          removeUrl: null,
        },
        teamsApp: { id: "com.github.teams", displayName: "GitHub" },
      },
    ];

    tabs.forEach((tab) => this.tabs.set(tab.id, tab));

    // Seed apps
    const apps: TeamsApp[] = [
      {
        id: "app-1",
        externalId: "com.github.teams",
        displayName: "GitHub",
        distributionMethod: "store",
      },
      {
        id: "app-2",
        externalId: "com.atlassian.jira",
        displayName: "Jira Cloud",
        distributionMethod: "store",
      },
      {
        id: "app-3",
        externalId: "com.contoso.custombot",
        displayName: "Contoso Bot",
        distributionMethod: "organization",
      },
    ];

    apps.forEach((app) => this.apps.set(app.id, app));
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async initialize(): Promise<ConnectorResult<void>> {
    this._isInitialized = true;
    return success(undefined);
  }

  async dispose(): Promise<void> {
    this._isInitialized = false;
  }

  async healthCheck(): Promise<ConnectorResult<HealthCheckResponse>> {
    return success({
      healthy: true,
      version: "mock-v1",
      details: {
        mode: "mock",
        teamCount: this.teams.size,
        userCount: this.users.size,
        channelCount: this.channels.size,
      },
    });
  }

  // Team operations
  async listTeams(
    options?: ListTeamsOptions,
  ): Promise<ConnectorResult<TeamsTeam[]>> {
    let teams = Array.from(this.teams.values());

    if (options?.archived !== undefined) {
      teams = teams.filter((t) => t.isArchived === options.archived);
    }

    if (options?.filter) {
      const filter = options.filter.toLowerCase();
      teams = teams.filter(
        (t) =>
          t.displayName.toLowerCase().includes(filter) ||
          t.description?.toLowerCase().includes(filter),
      );
    }

    if (options?.limit) {
      teams = teams.slice(0, options.limit);
    }

    return success(teams);
  }

  async getTeam(teamId: string): Promise<ConnectorResult<TeamsTeam>> {
    const team = this.teams.get(teamId);
    if (!team) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Team not found: ${teamId}`,
      });
    }
    return success(team);
  }

  async getTeamMembers(
    teamId: string,
  ): Promise<ConnectorResult<TeamsTeamMember[]>> {
    const team = this.teams.get(teamId);
    if (!team) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Team not found: ${teamId}`,
      });
    }
    return success(team.members);
  }

  // Channel operations
  async listChannels(
    options: ListChannelsOptions,
  ): Promise<ConnectorResult<TeamsChannel[]>> {
    const team = this.teams.get(options.teamId);
    if (!team) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Team not found: ${options.teamId}`,
      });
    }

    let channels = team.channels;

    if (options.membershipType) {
      channels = channels.filter(
        (ch) => ch.membershipType === options.membershipType,
      );
    }

    return success(channels);
  }

  async getChannel(
    teamId: string,
    channelId: string,
  ): Promise<ConnectorResult<TeamsChannel>> {
    const team = this.teams.get(teamId);
    if (!team) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Team not found: ${teamId}`,
      });
    }

    const channel = team.channels.find((ch) => ch.id === channelId);
    if (!channel) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Channel not found: ${channelId}`,
      });
    }

    return success(channel);
  }

  async createChannel(
    teamId: string,
    displayName: string,
    description?: string,
    membershipType: ChannelMembershipType = "standard",
  ): Promise<ConnectorResult<TeamsChannel>> {
    const team = this.teams.get(teamId);
    if (!team) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Team not found: ${teamId}`,
      });
    }

    const channel: TeamsChannel = {
      id: `channel-${Date.now()}`,
      displayName,
      description: description ?? null,
      membershipType,
      webUrl: `https://teams.microsoft.com/l/channel/${displayName.toLowerCase().replace(/\s+/g, "-")}`,
      email:
        membershipType === "standard"
          ? `${teamId}-${displayName.toLowerCase()}@contoso.com`
          : null,
      createdDateTime: new Date().toISOString(),
      isFavoriteByDefault: false,
    };

    team.channels.push(channel);
    this.channels.set(channel.id, channel);

    return success(channel);
  }

  // Message operations
  async listMessages(
    options: ListMessagesOptions,
  ): Promise<ConnectorResult<TeamsMessage[]>> {
    const team = this.teams.get(options.teamId);
    if (!team) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Team not found: ${options.teamId}`,
      });
    }

    const channel = team.channels.find((ch) => ch.id === options.channelId);
    if (!channel) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Channel not found: ${options.channelId}`,
      });
    }

    let messages = Array.from(this.messages.values()).filter(
      (m) => m.replyToId === null,
    );

    if (options.since) {
      const sinceDate = new Date(options.since);
      messages = messages.filter(
        (m) => new Date(m.createdDateTime) >= sinceDate,
      );
    }

    messages.sort(
      (a, b) =>
        new Date(b.createdDateTime).getTime() -
        new Date(a.createdDateTime).getTime(),
    );

    if (options.limit) {
      messages = messages.slice(0, options.limit);
    }

    return success(messages);
  }

  async getMessage(
    teamId: string,
    channelId: string,
    messageId: string,
  ): Promise<ConnectorResult<TeamsMessage>> {
    const team = this.teams.get(teamId);
    if (!team) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Team not found: ${teamId}`,
      });
    }

    const channel = team.channels.find((ch) => ch.id === channelId);
    if (!channel) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Channel not found: ${channelId}`,
      });
    }

    const message = this.messages.get(messageId);
    if (!message) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Message not found: ${messageId}`,
      });
    }

    return success(message);
  }

  async sendMessage(
    options: SendMessageOptions,
  ): Promise<ConnectorResult<TeamsMessage>> {
    const team = this.teams.get(options.teamId);
    if (!team) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Team not found: ${options.teamId}`,
      });
    }

    const channel = team.channels.find((ch) => ch.id === options.channelId);
    if (!channel) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Channel not found: ${options.channelId}`,
      });
    }

    // Get the "current user" (first user in mock data)
    const currentUser = this.users.get("user-1")!;

    const mentions: TeamsMention[] = (options.mentions ?? []).map((m, idx) => {
      const user = this.users.get(m.userId);
      return {
        id: idx,
        mentionText: m.text,
        mentioned: { user: user ?? null, conversation: null },
      };
    });

    const attachments: TeamsAttachment[] = (options.attachments ?? []).map(
      (a, idx) => ({
        id: `attachment-${idx}`,
        contentType: a.contentType,
        contentUrl: null,
        content: a.content,
        name: a.name ?? null,
        thumbnailUrl: null,
      }),
    );

    const message: TeamsMessage = {
      id: `msg-${Date.now()}`,
      createdDateTime: new Date().toISOString(),
      lastModifiedDateTime: null,
      deletedDateTime: null,
      subject: null,
      body: {
        contentType: options.contentType ?? "text",
        content: options.content,
      },
      from: {
        user: currentUser,
        application: null,
      },
      importance: options.importance ?? "normal",
      webUrl: `https://teams.microsoft.com/l/message/msg-${Date.now()}`,
      attachments,
      mentions,
      reactions: [],
      replies: [],
      replyToId: null,
    };

    this.messages.set(message.id, message);
    return success(message);
  }

  async sendAdaptiveCard(
    options: SendAdaptiveCardOptions,
  ): Promise<ConnectorResult<TeamsMessage>> {
    const team = this.teams.get(options.teamId);
    if (!team) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Team not found: ${options.teamId}`,
      });
    }

    const channel = team.channels.find((ch) => ch.id === options.channelId);
    if (!channel) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Channel not found: ${options.channelId}`,
      });
    }

    const currentUser = this.users.get("user-1")!;

    const message: TeamsMessage = {
      id: `msg-card-${Date.now()}`,
      createdDateTime: new Date().toISOString(),
      lastModifiedDateTime: null,
      deletedDateTime: null,
      subject: options.summary ?? "Adaptive Card",
      body: {
        contentType: "html",
        content: `<attachment id="card-attachment"></attachment>`,
      },
      from: {
        user: currentUser,
        application: null,
      },
      importance: "normal",
      webUrl: `https://teams.microsoft.com/l/message/msg-card-${Date.now()}`,
      attachments: [
        {
          id: "card-attachment",
          contentType: "application/vnd.microsoft.card.adaptive",
          contentUrl: null,
          content: JSON.stringify(options.card),
          name: null,
          thumbnailUrl: null,
        },
      ],
      mentions: [],
      reactions: [],
      replies: [],
      replyToId: null,
    };

    this.messages.set(message.id, message);
    return success(message);
  }

  async replyToMessage(
    options: ReplyToMessageOptions,
  ): Promise<ConnectorResult<TeamsMessage>> {
    const parentMessage = this.messages.get(options.messageId);
    if (!parentMessage) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Message not found: ${options.messageId}`,
      });
    }

    const currentUser = this.users.get("user-1")!;

    const reply: TeamsMessage = {
      id: `msg-reply-${Date.now()}`,
      createdDateTime: new Date().toISOString(),
      lastModifiedDateTime: null,
      deletedDateTime: null,
      subject: null,
      body: {
        contentType: options.contentType ?? "text",
        content: options.content,
      },
      from: {
        user: currentUser,
        application: null,
      },
      importance: "normal",
      webUrl: `https://teams.microsoft.com/l/message/msg-reply-${Date.now()}`,
      attachments: [],
      mentions: [],
      reactions: [],
      replies: [],
      replyToId: options.messageId,
    };

    parentMessage.replies.push(reply);
    this.messages.set(reply.id, reply);
    return success(reply);
  }

  async addReaction(
    teamId: string,
    channelId: string,
    messageId: string,
    reactionType: TeamsReaction["reactionType"],
  ): Promise<ConnectorResult<void>> {
    const message = this.messages.get(messageId);
    if (!message) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Message not found: ${messageId}`,
      });
    }

    const currentUser = this.users.get("user-1")!;

    message.reactions.push({
      reactionType,
      user: currentUser,
      createdDateTime: new Date().toISOString(),
    });

    return success(undefined);
  }

  // User operations
  async getUser(userId: string): Promise<ConnectorResult<TeamsUser>> {
    const user = this.users.get(userId);
    if (!user) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `User not found: ${userId}`,
      });
    }
    return success(user);
  }

  async getUserByEmail(email: string): Promise<ConnectorResult<TeamsUser>> {
    const user = Array.from(this.users.values()).find(
      (u) => u.email.toLowerCase() === email.toLowerCase(),
    );
    if (!user) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `User not found with email: ${email}`,
      });
    }
    return success(user);
  }

  async getUserPresence(
    userId: string,
  ): Promise<ConnectorResult<UserPresence>> {
    const user = this.users.get(userId);
    if (!user) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `User not found: ${userId}`,
      });
    }
    return success(user.presence);
  }

  async listUsers(
    filter?: string,
    limit?: number,
  ): Promise<ConnectorResult<TeamsUser[]>> {
    let users = Array.from(this.users.values());

    if (filter) {
      const filterLower = filter.toLowerCase();
      users = users.filter(
        (u) =>
          u.displayName.toLowerCase().includes(filterLower) ||
          u.email.toLowerCase().includes(filterLower) ||
          u.department?.toLowerCase().includes(filterLower),
      );
    }

    if (limit) {
      users = users.slice(0, limit);
    }

    return success(users);
  }

  // Meeting operations
  async listMeetings(
    options?: ListMeetingsOptions,
  ): Promise<ConnectorResult<TeamsMeeting[]>> {
    let meetings = Array.from(this.meetings.values());

    if (options?.userId) {
      meetings = meetings.filter(
        (m) =>
          m.organizer.id === options.userId ||
          m.attendees.some((a) => a.user.id === options.userId),
      );
    }

    if (options?.startDateTime) {
      const startDate = new Date(options.startDateTime);
      meetings = meetings.filter((m) => new Date(m.startDateTime) >= startDate);
    }

    if (options?.endDateTime) {
      const endDate = new Date(options.endDateTime);
      meetings = meetings.filter((m) => new Date(m.endDateTime) <= endDate);
    }

    meetings.sort(
      (a, b) =>
        new Date(a.startDateTime).getTime() -
        new Date(b.startDateTime).getTime(),
    );

    if (options?.limit) {
      meetings = meetings.slice(0, options.limit);
    }

    return success(meetings);
  }

  async getMeeting(meetingId: string): Promise<ConnectorResult<TeamsMeeting>> {
    const meeting = this.meetings.get(meetingId);
    if (!meeting) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Meeting not found: ${meetingId}`,
      });
    }
    return success(meeting);
  }

  async createMeeting(
    options: CreateMeetingOptions,
  ): Promise<ConnectorResult<TeamsMeeting>> {
    const organizer = this.users.get("user-1")!;

    const attendees: TeamsMeetingAttendee[] = options.attendees
      .map((email) => {
        const user = Array.from(this.users.values()).find(
          (u) => u.email.toLowerCase() === email.toLowerCase(),
        );
        if (!user) return null;
        return {
          user,
          type: "required" as TeamsMeetingAttendee["type"],
          status: "none" as TeamsMeetingAttendee["status"],
        };
      })
      .filter((a): a is TeamsMeetingAttendee => a !== null);

    const meeting: TeamsMeeting = {
      id: `meeting-${Date.now()}`,
      subject: options.subject,
      startDateTime: options.startDateTime,
      endDateTime: options.endDateTime,
      joinUrl: `https://teams.microsoft.com/l/meetup-join/meeting-${Date.now()}`,
      meetingType: "scheduled",
      organizer,
      attendees,
      isRecurring: false,
      isBroadcast: false,
      recordingUrl: null,
      transcriptUrl: null,
    };

    this.meetings.set(meeting.id, meeting);
    return success(meeting);
  }

  // Chat operations
  async listChats(
    options?: ListChatsOptions,
  ): Promise<ConnectorResult<TeamsChat[]>> {
    let chats = Array.from(this.chats.values());

    if (options?.userId) {
      chats = chats.filter((c) =>
        c.members.some((m) => m.id === options.userId),
      );
    }

    if (options?.chatType) {
      chats = chats.filter((c) => c.chatType === options.chatType);
    }

    chats.sort(
      (a, b) =>
        new Date(b.lastUpdatedDateTime).getTime() -
        new Date(a.lastUpdatedDateTime).getTime(),
    );

    if (options?.limit) {
      chats = chats.slice(0, options.limit);
    }

    return success(chats);
  }

  async getChat(chatId: string): Promise<ConnectorResult<TeamsChat>> {
    const chat = this.chats.get(chatId);
    if (!chat) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Chat not found: ${chatId}`,
      });
    }
    return success(chat);
  }

  async sendChatMessage(
    options: SendChatMessageOptions,
  ): Promise<ConnectorResult<TeamsMessage>> {
    const chat = this.chats.get(options.chatId);
    if (!chat) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Chat not found: ${options.chatId}`,
      });
    }

    const currentUser = this.users.get("user-1")!;

    const message: TeamsMessage = {
      id: `chat-msg-${Date.now()}`,
      createdDateTime: new Date().toISOString(),
      lastModifiedDateTime: null,
      deletedDateTime: null,
      subject: null,
      body: {
        contentType: options.contentType ?? "text",
        content: options.content,
      },
      from: {
        user: currentUser,
        application: null,
      },
      importance: "normal",
      webUrl: `https://teams.microsoft.com/l/message/chat-msg-${Date.now()}`,
      attachments: [],
      mentions: [],
      reactions: [],
      replies: [],
      replyToId: null,
    };

    chat.lastMessage = message;
    chat.lastUpdatedDateTime = message.createdDateTime;

    return success(message);
  }

  // Tab operations
  async listTabs(
    teamId: string,
    channelId: string,
  ): Promise<ConnectorResult<TeamsTab[]>> {
    const team = this.teams.get(teamId);
    if (!team) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Team not found: ${teamId}`,
      });
    }

    const channel = team.channels.find((ch) => ch.id === channelId);
    if (!channel) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Channel not found: ${channelId}`,
      });
    }

    return success(Array.from(this.tabs.values()));
  }

  async addTab(
    teamId: string,
    channelId: string,
    displayName: string,
    teamsAppId: string,
    configuration: TeamsTab["configuration"],
  ): Promise<ConnectorResult<TeamsTab>> {
    const team = this.teams.get(teamId);
    if (!team) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Team not found: ${teamId}`,
      });
    }

    const channel = team.channels.find((ch) => ch.id === channelId);
    if (!channel) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Channel not found: ${channelId}`,
      });
    }

    const app = this.apps.get(teamsAppId);

    const tab: TeamsTab = {
      id: `tab-${Date.now()}`,
      displayName,
      webUrl: `https://teams.microsoft.com/l/entity/${displayName.toLowerCase()}`,
      configuration,
      teamsApp: app
        ? { id: app.id, displayName: app.displayName }
        : { id: teamsAppId, displayName: "Unknown App" },
    };

    this.tabs.set(tab.id, tab);
    return success(tab);
  }

  // App operations
  async listInstalledApps(
    teamId: string,
  ): Promise<ConnectorResult<TeamsApp[]>> {
    const team = this.teams.get(teamId);
    if (!team) {
      return failure({
        code: ErrorCodes.NOT_FOUND,
        message: `Team not found: ${teamId}`,
      });
    }

    return success(Array.from(this.apps.values()));
  }
}

// ============================================================================
// Live Implementation (Stub)
// ============================================================================

class LiveTeamsConnector implements TeamsConnector {
  readonly name = "teams";
  readonly mode = "live" as const;
  private _isInitialized = false;
  private config: TeamsConnectorConfig;

  constructor(config: TeamsConnectorConfig) {
    this.config = config;
  }

  get isInitialized(): boolean {
    return this._isInitialized;
  }

  async initialize(): Promise<ConnectorResult<void>> {
    this._isInitialized = true;
    return success(undefined);
  }

  async dispose(): Promise<void> {
    this._isInitialized = false;
  }

  async healthCheck(): Promise<ConnectorResult<HealthCheckResponse>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  // All methods return NOT_IMPLEMENTED for now
  async listTeams(
    _options?: ListTeamsOptions,
  ): Promise<ConnectorResult<TeamsTeam[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async getTeam(_teamId: string): Promise<ConnectorResult<TeamsTeam>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async getTeamMembers(
    _teamId: string,
  ): Promise<ConnectorResult<TeamsTeamMember[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async listChannels(
    _options: ListChannelsOptions,
  ): Promise<ConnectorResult<TeamsChannel[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async getChannel(
    _teamId: string,
    _channelId: string,
  ): Promise<ConnectorResult<TeamsChannel>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async createChannel(
    _teamId: string,
    _displayName: string,
    _description?: string,
    _membershipType?: ChannelMembershipType,
  ): Promise<ConnectorResult<TeamsChannel>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async listMessages(
    _options: ListMessagesOptions,
  ): Promise<ConnectorResult<TeamsMessage[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async getMessage(
    _teamId: string,
    _channelId: string,
    _messageId: string,
  ): Promise<ConnectorResult<TeamsMessage>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async sendMessage(
    _options: SendMessageOptions,
  ): Promise<ConnectorResult<TeamsMessage>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async sendAdaptiveCard(
    _options: SendAdaptiveCardOptions,
  ): Promise<ConnectorResult<TeamsMessage>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async replyToMessage(
    _options: ReplyToMessageOptions,
  ): Promise<ConnectorResult<TeamsMessage>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async addReaction(
    _teamId: string,
    _channelId: string,
    _messageId: string,
    _reactionType: TeamsReaction["reactionType"],
  ): Promise<ConnectorResult<void>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async getUser(_userId: string): Promise<ConnectorResult<TeamsUser>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async getUserByEmail(_email: string): Promise<ConnectorResult<TeamsUser>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async getUserPresence(
    _userId: string,
  ): Promise<ConnectorResult<UserPresence>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async listUsers(
    _filter?: string,
    _limit?: number,
  ): Promise<ConnectorResult<TeamsUser[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async listMeetings(
    _options?: ListMeetingsOptions,
  ): Promise<ConnectorResult<TeamsMeeting[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async getMeeting(_meetingId: string): Promise<ConnectorResult<TeamsMeeting>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async createMeeting(
    _options: CreateMeetingOptions,
  ): Promise<ConnectorResult<TeamsMeeting>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async listChats(
    _options?: ListChatsOptions,
  ): Promise<ConnectorResult<TeamsChat[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async getChat(_chatId: string): Promise<ConnectorResult<TeamsChat>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async sendChatMessage(
    _options: SendChatMessageOptions,
  ): Promise<ConnectorResult<TeamsMessage>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async listTabs(
    _teamId: string,
    _channelId: string,
  ): Promise<ConnectorResult<TeamsTab[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async addTab(
    _teamId: string,
    _channelId: string,
    _displayName: string,
    _teamsAppId: string,
    _configuration: TeamsTab["configuration"],
  ): Promise<ConnectorResult<TeamsTab>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }

  async listInstalledApps(
    _teamId: string,
  ): Promise<ConnectorResult<TeamsApp[]>> {
    return failure({
      code: ErrorCodes.NOT_IMPLEMENTED,
      message: "Live Teams connector not implemented",
    });
  }
}
