import { createSlackAdapter, type SlackAdapter } from "@chat-adapter/slack";
import { createTeamsAdapter, type TeamsAdapter } from "@chat-adapter/teams";
import { ConsoleLogger } from "chat";
import { recorder, withRecording } from "./recorder";

// Create a shared logger for adapters that need explicit logger overrides
const logger = new ConsoleLogger("info");

export interface Adapters {
  slack?: SlackAdapter;
  teams?: TeamsAdapter;
}

// Methods to record for each adapter (outgoing API calls)
const SLACK_METHODS = [
  "postMessage",
  "editMessage",
  "deleteMessage",
  "addReaction",
  "removeReaction",
  "startTyping",
  "stream",
  "openDM",
  "fetchMessages",
];

const TEAMS_METHODS = [
  "postMessage",
  "editMessage",
  "deleteMessage",
  "startTyping",
  "stream",
  "openDM",
  "fetchMessages",
];

/**
 * Build type-safe adapters based on available environment variables.
 * Adapters are only created if their required env vars are present.
 */
export function buildAdapters(): Adapters {
  // Start fetch recording to capture all Graph/Slack/GChat API calls
  recorder.startFetchRecording();

  const adapters: Adapters = {};

  // Slack adapter (optional)
  if (process.env.SLACK_SIGNING_SECRET) {
    adapters.slack = withRecording(
      createSlackAdapter({
        botToken: process.env.SLACK_BOT_TOKEN,
        signingSecret: process.env.SLACK_SIGNING_SECRET,
        userName: "Chat SDK Bot",
        logger: logger.child("slack"),
      }),
      "slack",
      SLACK_METHODS
    );
  }

  // Teams adapter (optional)
  if (process.env.TEAMS_APP_ID && process.env.TEAMS_APP_PASSWORD) {
    adapters.teams = withRecording(
      createTeamsAdapter({
        appId: process.env.TEAMS_APP_ID,
        appPassword: process.env.TEAMS_APP_PASSWORD,
        appType: "MultiTenant",
        userName: "Chat SDK Bot",
        logger: logger.child("teams"),
      }),
      "teams",
      TEAMS_METHODS
    );
  }

  return adapters;
}
