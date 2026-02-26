# Chat SDK Demo Guide

A step-by-step guide to running the Chat SDK demo bot on **Slack** and **Microsoft Teams** with AI-powered responses, interactive cards, and task management.

## Table of Contents

- [Prerequisites](#prerequisites)
- [1. Clone and Install](#1-clone-and-install)
- [2. Create a Slack App](#2-create-a-slack-app)
- [3. Configure Environment Variables](#3-configure-environment-variables)
- [4. Set Up ngrok Tunnel](#4-set-up-ngrok-tunnel)
- [5. Run the Dev Server](#5-run-the-dev-server)
- [6. Connect Slack to Your Server](#6-connect-slack-to-your-server)
- [7. Test the Bot](#7-test-the-bot)
- [8. (Optional) Add Microsoft Teams](#8-optional-add-microsoft-teams)
- [Features](#features)
- [Troubleshooting](#troubleshooting)
- [Architecture Overview](#architecture-overview)

---

## Prerequisites

- **Node.js** 18+ installed
- **pnpm** installed (`npm install -g pnpm`)
- **ngrok** installed ([download](https://ngrok.com/download)) — for tunneling webhooks to localhost
- A **Slack workspace** where you have permission to install apps
- (Optional) A **Groq API key** for AI features — free at [console.groq.com](https://console.groq.com)

## 1. Clone and Install

```bash
git clone https://github.com/vercel/chat.git
cd chat

# Install all dependencies (monorepo)
pnpm install

# Build all packages
pnpm build
```

## 2. Create a Slack App

### 2.1 Create the App

1. Go to [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → **From scratch**
3. Name it (e.g., `Chat SDK Demo`) and select your workspace
4. Click **Create App**

### 2.2 Configure Bot Token Scopes

Go to **OAuth & Permissions** → **Scopes** → **Bot Token Scopes**, and add:

| Scope | Purpose |
|-------|---------|
| `app_mentions:read` | Detect when users @mention the bot |
| `chat:write` | Send messages |
| `channels:history` | Read channel messages |
| `groups:history` | Read private channel messages |
| `im:history` | Read DM messages |
| `im:write` | Send DMs |
| `reactions:read` | Detect emoji reactions |
| `reactions:write` | Add emoji reactions |
| `users:read` | Get user info |
| `commands` | Slash commands (for `/create-task`) |

### 2.3 Install to Workspace

1. Go to **OAuth & Permissions**
2. Click **Install to Workspace** → **Allow**
3. Copy the **Bot User OAuth Token** (starts with `xoxb-`)

### 2.4 Get Signing Secret

1. Go to **Basic Information** → **App Credentials**
2. Copy the **Signing Secret**

## 3. Configure Environment Variables

```bash
cd examples/nextjs-chat
cp .env.local.example .env.local
```

Edit `.env.local`:

```env
# Bot Configuration
BOT_USERNAME=chat-sdk-demo

# Slack (Single-Workspace Mode)
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here

# Teams (comment out if not using)
# TEAMS_APP_ID=YOUR-TEAMS-APP-ID-HERE
# TEAMS_APP_PASSWORD=YOUR-TEAMS-APP-PASSWORD-HERE

# Redis — leave empty for in-memory state (fine for demo)
REDIS_URL=

# AI (Groq - free tier) — optional, for AI mode
GROQ_API_KEY=your-groq-api-key-here
```

> **Important**: Make sure `TEAMS_APP_ID` and `TEAMS_APP_PASSWORD` are commented out if you're not using Teams. Leaving placeholder values like `YOUR-TEAMS-APP-ID-HERE` will cause errors.

## 4. Set Up ngrok Tunnel

Slack needs a public URL to send webhooks. ngrok creates a tunnel from a public URL to your local server.

```bash
ngrok http 3000
```

Copy the **Forwarding URL** (e.g., `https://abcd-1234.ngrok-free.app`).

> **Tip**: Keep ngrok running in a separate terminal throughout development.

## 5. Run the Dev Server

```bash
cd examples/nextjs-chat
pnpm dev
```

You should see:

```
▲ Next.js 16.x (Turbopack)
- Local: http://localhost:3000
✓ Ready in ~1s
```

Verify the webhook endpoint:

```bash
curl http://localhost:3000/api/webhooks/slack
# → "slack webhook endpoint is active"
```

## 6. Connect Slack to Your Server

### 6.1 Enable Event Subscriptions

1. In your Slack App settings, go to **Event Subscriptions**
2. Toggle **Enable Events** → On
3. Set **Request URL** to: `https://YOUR-NGROK-URL/api/webhooks/slack`
4. Wait for the **Verified** checkmark

### 6.2 Subscribe to Bot Events

Under **Subscribe to bot events**, add:

| Event | Purpose |
|-------|---------|
| `app_mention` | When someone @mentions the bot |
| `message.channels` | Messages in public channels |
| `message.groups` | Messages in private channels |
| `message.im` | Direct messages |
| `reaction_added` | Emoji reactions added |
| `reaction_removed` | Emoji reactions removed |

Click **Save Changes**.

### 6.3 Enable Interactivity

1. Go to **Interactivity & Shortcuts**
2. Toggle **Interactivity** → On
3. Set **Request URL** to: `https://YOUR-NGROK-URL/api/webhooks/slack`
4. Click **Save Changes**

### 6.4 (Optional) Add Slash Command

1. Go to **Slash Commands** → **Create New Command**
2. Command: `/create-task`
3. Request URL: `https://YOUR-NGROK-URL/api/webhooks/slack`
4. Description: `Create a new task`
5. Click **Save**

### 6.5 Reinstall the App

After changing scopes or events, you must reinstall:

1. Go to **OAuth & Permissions**
2. Click **Reinstall to Workspace** → **Allow**
3. Update `SLACK_BOT_TOKEN` in `.env.local` if the token changed
4. Restart the dev server

## 7. Test the Bot

### Basic Welcome Card

1. Invite the bot to a channel: `/invite @Chat SDK Demo`
2. Mention the bot: `@Chat SDK Demo hello`
3. The bot replies with an interactive welcome card

### AI Mode

1. Mention with "AI": `@Chat SDK Demo AI what is TypeScript?`
2. Bot enables AI mode and responds using Llama 3.3 (via Groq)
3. All subsequent @mentions in that thread get AI responses
4. Say `@Chat SDK Demo disable AI` to turn it off

### Task Management

1. Click **Create Task** button on the welcome card (or type `/create-task`)
2. Fill in the modal: Title, Description, Assignee, Priority
3. Task card appears with status buttons
4. Click **In Progress** / **Done** / **Blocked** — the card updates in-place
5. Click **Comment** to add comments to the task

## 8. (Optional) Add Microsoft Teams

The same bot code works on Teams with zero handler changes — only adapter configuration needed.

```
┌─────────────────────────────────────────────────────────┐
│                   TEAMS SETUP FLOW                      │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │ 1. Developer │───▶│ 2. Create    │───▶│ 3. Create │  │
│  │    Portal    │    │    Bot       │    │    App    │  │
│  └──────────────┘    └──────┬───────┘    └─────┬─────┘  │
│                             │                  │        │
│                      Get Bot ID &        Add Bot to     │
│                      Client Secret       App Features   │
│                             │                  │        │
│                      ┌──────▼──────────────────▼─────┐  │
│                      │  4. Install/Sideload in Teams │  │
│                      └───────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 8.1 Create a Bot in Developer Portal

1. Go to [dev.teams.cloud.microsoft.com](https://dev.teams.cloud.microsoft.com)
2. Click **Tools** (left sidebar) → **Bot management**
3. Click **+ New bot** → name it (e.g., `chatsdkdemo`)
4. After creation, you'll see the **Bot ID** (a UUID like `f33eabb5-...`)

### 8.2 Get Client Secret

1. Click on your bot → **Client Secrets**
2. Click **Add a client secret for your bot**
3. Copy the generated password immediately (it won't be shown again)

### 8.3 Configure Endpoint Address

1. In your bot settings → **Configure**
2. Set **Endpoint address** to: `https://YOUR-NGROK-URL/api/webhooks/teams`

### 8.4 Add Environment Variables

Add to `.env.local`:

```env
# Microsoft Teams (MultiTenant)
TEAMS_APP_ID=your-bot-id-here
TEAMS_APP_PASSWORD=your-client-secret-here
```

### 8.5 Enable Teams Adapter in Code

Update `src/lib/adapters.ts` to import and create the Teams adapter:

```typescript
import { createTeamsAdapter, type TeamsAdapter } from "@chat-adapter/teams";

export interface Adapters {
  slack?: SlackAdapter;
  teams?: TeamsAdapter;  // Add this
}

// Inside buildAdapters():
if (process.env.TEAMS_APP_ID && process.env.TEAMS_APP_PASSWORD) {
  adapters.teams = createTeamsAdapter({
    appId: process.env.TEAMS_APP_ID,
    appPassword: process.env.TEAMS_APP_PASSWORD,
    appType: "MultiTenant",
    userName: "Chat SDK Bot",
  });
}
```

### 8.6 Create a Teams App

1. Go back to **Developer Portal** → **Apps** → **+ New app**
2. Fill in required fields:

```
┌─────────────────────────────────────────────────────┐
│  Basic Information (all required)                   │
├─────────────────────────────────────────────────────┤
│  Short name:        Chat SDK Demo                   │
│  Short description: A demo bot built with Chat SDK  │
│  Long description:  Multi-platform chatbot demo...  │
│  Version:           1.0.0                           │
│  Developer name:    Your Name                       │
│  Website:           https://example.com             │
│  Privacy policy:    https://example.com/privacy     │
│  Terms of use:      https://example.com/terms       │
├─────────────────────────────────────────────────────┤
│  Branding (required)                                │
├─────────────────────────────────────────────────────┤
│  Color icon:    192x192 PNG                         │
│  Outline icon:  32x32 PNG                           │
└─────────────────────────────────────────────────────┘
```

3. Go to **App features** → click **Bot**
4. Select your bot (`chatsdkdemo`)
5. Check scopes: **Personal**, **Team**, **Group Chat**
6. Click **Save**

### 8.7 Install the App in Teams

```
┌─────────────────────────────────────────────────────────┐
│  3 WAYS TO INSTALL                                      │
│                                                         │
│  Option A: Preview (Developer)                          │
│  ─────────────────────────────                          │
│  Developer Portal → Your App → Publish                  │
│  → "Preview in Teams"                                   │
│                                                         │
│  Option B: Sideload (No Admin Required)                 │
│  ──────────────────────────────────────                  │
│  Developer Portal → Your App → Publish                  │
│  → "Download app package" (.zip)                        │
│  Teams → Apps → "Upload an app"                         │
│  → "Upload a custom app" → select .zip                  │
│                                                         │
│  Option C: Admin Install (Organization-wide)            │
│  ───────────────────────────────────────────             │
│  Teams Admin Center → Teams apps → Manage apps          │
│  → Upload → select .zip → Allow                         │
└─────────────────────────────────────────────────────────┘
```

> **Note**: If you see "Permissions needed. Ask your IT admin", your tenant restricts custom app installs. Use Option B (sideload) or ask your admin to allow custom apps in Teams Admin Center → **Permission policies**.

### 8.8 Test in Teams

1. Open a chat with the bot or @mention it in a channel
2. All the same features work: Welcome Card, AI Mode, Task Management, etc.

> **Teams-specific notes**:
> - Teams bots **cannot add emoji reactions** via API — the bot replies with a text message instead
> - Adaptive Cards are used instead of Slack Block Kit (conversion is automatic)
> - Message history fetching requires Microsoft Graph API permissions

---

## Features

| Feature | Description | How to Trigger |
|---------|-------------|----------------|
| **Welcome Card** | Interactive card with buttons, dropdowns | `@bot hello` |
| **AI Mode** | AI-powered responses using Groq/Llama | `@bot AI <question>` |
| **Task Management** | Create tasks, update status, add comments | Click "Create Task" or `/create-task` |
| **Ephemeral Messages** | Messages only visible to you | Click "Ephemeral response" |
| **Modals** | Rich form inputs with validation | Click "Send Feedback" or "Report Bug" |
| **Message Editing** | Bot edits its own messages (streaming effect) | Mention bot in subscribed thread |
| **Emoji Reactions** | Bot reacts back when you react | React with :thumbsup: :heart: :fire: :rocket: |
| **DM Support** | Bot sends you a private DM | Say "dm me" in a thread |
| **Fetch Messages** | Display message history from thread | Click "Fetch Messages" |
| **Channel Post** | Post summary to the channel | Click "Channel Post" |

---

## Troubleshooting

### "URL didn't respond with the value of the challenge parameter"

Slack sends a `url_verification` challenge when you set the Request URL. If this fails:

- Verify ngrok is running and the URL is correct
- Check that the dev server is running on port 3000
- Make sure the path is `/api/webhooks/slack` (not `/api/webhook/slack`)

### 500 Internal Server Error

**Cause: Empty Redis URL**

If `REDIS_URL=` is empty but the code tries to connect:

```typescript
// Fix: Use memory state as fallback
const state = process.env.REDIS_URL
  ? createRedisState({ url: process.env.REDIS_URL })
  : createMemoryState();
```

**Cause: Placeholder Teams credentials**

If `.env.local` has `TEAMS_APP_ID=YOUR-TEAMS-APP-ID-HERE`, this is truthy and creates an adapter with invalid credentials. Comment out unused adapters:

```env
# TEAMS_APP_ID=YOUR-TEAMS-APP-ID-HERE
# TEAMS_APP_PASSWORD=YOUR-TEAMS-APP-PASSWORD-HERE
```

### Turbopack Symlink Error (Windows)

```
TurbopackInternalError: create symlink to discord.js
A required privilege is not held by the client (os error 1314)
```

This happens on Windows because Turbopack + pnpm uses symlinks that require admin privileges. The demo's `adapters.ts` is simplified to only import the Slack adapter, avoiding this issue.

If you need other adapters on Windows, either:
- Run your terminal as Administrator
- Enable Developer Mode in Windows Settings → Privacy & Security → For Developers

### Bot Doesn't Respond (Multi-Workspace Mode)

If logs show `"Slack adapter initialized in multi-workspace mode"`:

The Slack adapter defaults to multi-workspace mode when `botToken` is not explicitly passed in the config. Make sure `adapters.ts` passes it:

```typescript
createSlackAdapter({
  botToken: process.env.SLACK_BOT_TOKEN,       // Must be explicit!
  signingSecret: process.env.SLACK_SIGNING_SECRET, // Must be explicit!
  userName: "Chat SDK Bot",
})
```

### AI Mode Shows Card But No AI Response

**Cause: Vercel AI Gateway**

Using string format like `"google/gemini-2.0-flash"` routes through Vercel's AI Gateway, which requires Vercel authentication. Use the provider SDK directly:

```typescript
// Wrong — routes through AI Gateway
model: "google/gemini-2.0-flash"

// Correct — direct API call
import { createGroq } from "@ai-sdk/groq";
const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
model: groq("llama-3.3-70b-versatile")
```

### Teams: "Manifest parsing has failed"

The Teams app manifest is missing required fields. Check in Developer Portal:

```
┌─────────────────────────────────────────┐
│  MANIFEST CHECKLIST                     │
│                                         │
│  [x] Short name filled                  │
│  [x] Short description filled           │
│  [x] Long description filled            │
│  [x] Version: 1.0.0                     │
│  [x] Developer name + website           │
│  [x] Privacy policy URL                 │
│  [x] Terms of use URL                   │
│  [x] Color icon 192x192 uploaded        │
│  [x] Outline icon 32x32 uploaded        │
│  [x] Bot added to App features          │
│  [x] Bot scopes selected (Personal,     │
│      Team, or Group Chat)               │
└─────────────────────────────────────────┘
```

### Teams: "Permissions needed. Ask your IT admin"

Your tenant restricts custom app installs. Solutions:
1. **Sideload**: Download app package (.zip) from Developer Portal → Upload in Teams
2. **Admin**: Teams Admin Center → Permission policies → Allow custom apps
3. **Developer tenant**: Get a free Microsoft 365 developer tenant at [developer.microsoft.com/microsoft-365/dev-program](https://developer.microsoft.com/en-us/microsoft-365/dev-program)

### Slack Button Error: `invalid_blocks`

Slack has a **2000 character limit** on button `value` fields. Don't serialize large objects into button values. Use an in-memory store and pass only short IDs:

```typescript
// Wrong — full object in button value
<Button id="update" value={JSON.stringify(largeObject)}>

// Correct — only pass ID, look up data from store
<Button id="update" value={taskId}>
```

---

## Architecture Overview

```
┌──────────┐     ┌─────────┐     ┌──────────────────────────┐
│  Slack   │────▶│         │     │     Next.js Server       │
│ Webhook  │     │         │     │                          │
└──────────┘     │  ngrok  │────▶│  /api/webhooks/[platform]│
┌──────────┐     │  Tunnel │     │                          │
│  Teams   │────▶│         │     │  Slack:  /webhooks/slack │
│ Bot Svc  │     │         │     │  Teams:  /webhooks/teams │
└──────────┘     └─────────┘     └────────────┬─────────────┘
                                              │
                                 ┌────────────▼─────────────┐
                                 │      Chat SDK (bot)      │
                                 │                          │
                                 │  ┌────────┐  ┌────────┐  │
                                 │  │ Slack  │  │ Teams  │  │
                                 │  │Adapter │  │Adapter │  │
                                 │  └────────┘  └────────┘  │
                                 │  ┌────────────────────┐  │
                                 │  │   Memory State     │  │
                                 │  └────────────────────┘  │
                                 │  ┌────────────────────┐  │
                                 │  │   Groq/Llama AI    │  │
                                 │  └────────────────────┘  │
                                 └──────────────────────────┘
```

**Same bot code, multiple platforms** — handlers like `onNewMention`, `onAction`,
`onModalSubmit` run identically across Slack and Teams. The adapter layer handles
format conversion (Slack Block Kit vs Teams Adaptive Cards).

### Key Files

| File | Purpose |
|------|---------|
| `src/lib/bot.tsx` | Bot logic — event handlers, cards, AI agent, task management |
| `src/lib/adapters.ts` | Platform adapter configuration (Slack + Teams) |
| `src/app/api/webhooks/[platform]/route.ts` | Next.js API route handling webhooks |
| `.env.local` | Environment variables (credentials, API keys) |

### Message Flow

```
User sends message
        │
        ▼
┌─────────────────┐     ┌──────────────────┐
│ Platform sends   │────▶│ Adapter verifies │
│ webhook (Slack   │     │ & parses message │
│ or Teams)        │     └────────┬─────────┘
└─────────────────┘              │
                                 ▼
                    ┌─────────────────────────┐
                    │  Chat SDK routes to:    │
                    │                         │
                    │  onNewMention ──────▶ Welcome Card / AI Mode
                    │  onSubscribedMessage ▶ AI response / DM / Edit
                    │  onAction ──────────▶ Button clicks
                    │  onModalSubmit ─────▶ Form submissions
                    │  onReaction ────────▶ Emoji reactions
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │ Adapter converts JSX:   │
                    │  Slack → Block Kit       │
                    │  Teams → Adaptive Cards  │
                    └─────────────────────────┘
```

### AI Provider Options

The demo uses [Vercel AI SDK](https://sdk.vercel.ai/) which supports multiple providers:

| Provider | Package | Free Tier | Model Example |
|----------|---------|-----------|---------------|
| **Groq** | `@ai-sdk/groq` | Yes (generous) | `llama-3.3-70b-versatile` |
| Google | `@ai-sdk/google` | Limited | `gemini-2.0-flash` |
| Anthropic | `@ai-sdk/anthropic` | No | `claude-4-sonnet` |
| OpenAI | `@ai-sdk/openai` | No | `gpt-4o` |

To switch providers, update `bot.tsx`:

```typescript
import { createGroq } from "@ai-sdk/groq";
const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

const agent = new ToolLoopAgent({
  model: groq("llama-3.3-70b-versatile"),
  instructions: "You are a helpful assistant...",
});
```
