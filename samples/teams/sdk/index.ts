import {
  createTeamsConnector,
  TeamsConnectorConfig,
} from "../../../shared/connectors/teams/client.js";
import { createTeamsCollaborationService } from "./collaboration.js";

async function main() {
  console.log("=".repeat(60));
  console.log("Microsoft Teams Collaboration Demo");
  console.log("=".repeat(60));

  const config: TeamsConnectorConfig = {
    mode: "mock",
  };

  const connector = createTeamsConnector(config);
  await connector.initialize();

  const service = createTeamsCollaborationService({
    connector,
    defaultTeamId: "team-engineering",
    defaultChannelId: "channel-general",
  });

  console.log("\n📊 Workspace Overview");
  console.log("-".repeat(40));
  const overview = await service.getWorkspaceOverview();
  if (overview.success) {
    const data = overview.data!;
    console.log(`  Teams: ${data.teamCount}`);
    console.log(`  Channels: ${data.totalChannels}`);
    console.log(`  Users: ${data.totalUsers}`);
    console.log(`  Upcoming Meetings: ${data.upcomingMeetings}`);
    console.log(`  Active Chats: ${data.activeChats}`);
  }

  console.log("\n👥 Teams");
  console.log("-".repeat(40));
  const teams = await service.getTeams({ includeArchived: false });
  if (teams.success) {
    for (const team of teams.data!) {
      const archived = team.isArchived ? " [ARCHIVED]" : "";
      console.log(`  ${team.name}${archived}`);
      console.log(
        `    Channels: ${team.channelCount}, Members: ${team.memberCount}`,
      );
      console.log(`    Visibility: ${team.visibility}`);
    }
  }

  console.log("\n📺 Channels (Engineering Team)");
  console.log("-".repeat(40));
  const channels = await service.getChannels("team-engineering");
  if (channels.success) {
    for (const channel of channels.data!) {
      const favorite = channel.isFavorite ? " ⭐" : "";
      const type = channel.membershipType === "private" ? " 🔒" : "";
      console.log(`  #${channel.name}${type}${favorite}`);
      if (channel.description) {
        console.log(`    ${channel.description}`);
      }
    }
  }

  console.log("\n💬 Recent Messages (General Channel)");
  console.log("-".repeat(40));
  const messages = await service.getMessages(
    "team-engineering",
    "channel-general",
    { limit: 5 },
  );
  if (messages.success) {
    for (const msg of messages.data!) {
      const icon = msg.authorType === "application" ? "🤖" : "👤";
      const importance =
        msg.importance === "urgent"
          ? " 🚨"
          : msg.importance === "high"
            ? " ❗"
            : "";
      console.log(`  ${icon} ${msg.author}${importance}`);
      console.log(
        `    ${msg.content.substring(0, 80)}${msg.content.length > 80 ? "..." : ""}`,
      );
      console.log(
        `    Reactions: ${msg.reactionCount}, Replies: ${msg.replyCount}`,
      );
    }
  }

  console.log("\n👤 Users");
  console.log("-".repeat(40));
  const users = await service.getUsers(undefined, 5);
  if (users.success) {
    for (const user of users.data!) {
      const presenceIcon: Record<string, string> = {
        available: "🟢",
        busy: "🔴",
        doNotDisturb: "⛔",
        away: "🟡",
        offline: "⚪",
        unknown: "❓",
      };
      console.log(`  ${presenceIcon[user.presence]} ${user.displayName}`);
      console.log(`    ${user.email} | ${user.jobTitle ?? "No title"}`);
    }
  }

  console.log("\n📅 Upcoming Meetings");
  console.log("-".repeat(40));
  const meetings = await service.getMeetings({ limit: 5 });
  if (meetings.success) {
    for (const meeting of meetings.data!) {
      const recurring = meeting.isRecurring ? " 🔄" : "";
      console.log(`  ${meeting.subject}${recurring}`);
      console.log(`    Organizer: ${meeting.organizer}`);
      console.log(
        `    Time: ${new Date(meeting.startDateTime).toLocaleString()}`,
      );
      console.log(`    Attendees: ${meeting.attendeeCount}`);
    }
  }

  console.log("\n📊 Team Analysis (Engineering)");
  console.log("-".repeat(40));
  const analysis = await service.analyzeTeam("team-engineering");
  if (analysis.success) {
    const data = analysis.data!;
    console.log(`  Team: ${data.team.name}`);
    console.log(`  Channels: ${data.channels.length}`);
    console.log(`  Active Members: ${data.activeMemberCount}`);
    console.log(`  Recent Messages: ${data.recentMessages.length}`);
    console.log(`  Upcoming Meetings: ${data.upcomingMeetings.length}`);
  }

  console.log("\n📤 Sending Messages");
  console.log("-".repeat(40));

  const simpleMsg = await service.sendMessage("Hello from the Teams SDK demo!");
  if (simpleMsg.success) {
    console.log(
      `  ✅ Sent message: "${simpleMsg.data!.content.substring(0, 40)}..."`,
    );
  }

  console.log("\n🚨 Alert Notification");
  console.log("-".repeat(40));
  const alertResult = await service.sendAlertNotification({
    teamId: "team-engineering",
    channelId: "channel-alerts",
    title: "High CPU Usage Alert",
    severity: "warning",
    message: "Server prod-api-01 is experiencing high CPU usage (92%)",
    fields: [
      { title: "Server", value: "prod-api-01" },
      { title: "CPU", value: "92%" },
      { title: "Memory", value: "78%" },
    ],
    actionUrl: "https://monitoring.example.com/servers/prod-api-01",
    actionTitle: "View Dashboard",
  });
  if (alertResult.success) {
    console.log(
      `  ✅ Alert sent with ${alertResult.data!.hasAttachments ? "Adaptive Card" : "text"}`,
    );
  }

  console.log("\n🚀 Deployment Notification");
  console.log("-".repeat(40));
  const deployResult = await service.sendDeploymentNotification({
    teamId: "team-engineering",
    channelId: "channel-dev",
    environment: "production",
    version: "2.5.1",
    status: "succeeded",
    service: "api-gateway",
    author: "Alice Johnson",
    commitHash: "abc123def456",
    duration: 45,
  });
  if (deployResult.success) {
    console.log(`  ✅ Deployment notification sent`);
  }

  console.log("\n🔥 Incident Notification");
  console.log("-".repeat(40));
  const incidentResult = await service.sendIncidentNotification({
    teamId: "team-engineering",
    channelId: "channel-alerts",
    incidentId: "INC-2024-001",
    title: "Payment Service Degradation",
    status: "acknowledged",
    severity: "high",
    service: "payment-service",
    assignee: "Carol Williams",
    summary:
      "Users reporting slow payment processing. Investigation in progress.",
  });
  if (incidentResult.success) {
    console.log(`  ✅ Incident notification sent`);
  }

  console.log("\n📅 Create Meeting");
  console.log("-".repeat(40));
  const meetingResult = await service.createMeeting(
    "Sprint Review",
    "2024-12-10T14:00:00Z",
    "2024-12-10T15:00:00Z",
    ["alice@contoso.com", "bob@contoso.com"],
  );
  if (meetingResult.success) {
    const meeting = meetingResult.data!;
    console.log(`  ✅ Meeting created: ${meeting.subject}`);
    console.log(`    Join URL: ${meeting.joinUrl}`);
    console.log(`    Attendees: ${meeting.attendeeCount}`);
  }

  await connector.dispose();

  console.log("\n" + "=".repeat(60));
  console.log("Demo complete!");
  console.log("=".repeat(60));
}

main().catch(console.error);
