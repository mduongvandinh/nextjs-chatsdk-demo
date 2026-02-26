# Chat SDK Demo - Hướng dẫn chi tiết

Hướng dẫn từng bước tạo bot **Slack** và **Microsoft Teams** với Chat SDK, tích hợp AI (Groq/Llama miễn phí), interactive cards, và quản lý task.

## Mục lục

- [Yêu cầu](#yêu-cầu)
- [Bước 1: Clone và cài đặt](#bước-1-clone-và-cài-đặt)
- [Bước 2: Tạo Slack App](#bước-2-tạo-slack-app)
- [Bước 3: Cấu hình biến môi trường](#bước-3-cấu-hình-biến-môi-trường)
- [Bước 4: Chạy ngrok tunnel](#bước-4-chạy-ngrok-tunnel)
- [Bước 5: Chạy server](#bước-5-chạy-server)
- [Bước 6: Kết nối Slack với server](#bước-6-kết-nối-slack-với-server)
- [Bước 7: Test bot](#bước-7-test-bot)
- [Bước 8: (Tùy chọn) Thêm Microsoft Teams](#bước-8-tùy-chọn-thêm-microsoft-teams)
- [Tính năng](#tính-năng)
- [Xử lý lỗi thường gặp](#xử-lý-lỗi-thường-gặp)
- [Kiến trúc tổng quan](#kiến-trúc-tổng-quan)
- [Source code đầy đủ](#source-code-đầy-đủ)

---

## Yêu cầu

- **Node.js** 18+
- **pnpm** (`npm install -g pnpm`)
- **ngrok** ([tải tại đây](https://ngrok.com/download)) — để tunnel webhook về localhost
- Một **Slack workspace** mà bạn có quyền cài app
- (Tùy chọn) **Groq API key** cho tính năng AI — miễn phí tại [console.groq.com](https://console.groq.com)

## Bước 1: Clone và cài đặt

```bash
git clone https://github.com/vercel/chat.git
cd chat

# Cài tất cả dependencies (monorepo)
pnpm install

# Build tất cả packages
pnpm build
```

## Bước 2: Tạo Slack App

### 2.1 Tạo App mới

1. Truy cập [api.slack.com/apps](https://api.slack.com/apps)
2. Click **Create New App** → **From scratch**
3. Đặt tên (ví dụ: `Chat SDK Demo`), chọn workspace
4. Click **Create App**

### 2.2 Thêm Bot Token Scopes

Vào **OAuth & Permissions** → **Scopes** → **Bot Token Scopes**, thêm các scope sau:

| Scope | Mục đích |
|-------|----------|
| `app_mentions:read` | Nhận biết khi user @mention bot |
| `chat:write` | Gửi tin nhắn |
| `channels:history` | Đọc tin nhắn trong channel |
| `groups:history` | Đọc tin nhắn trong private channel |
| `im:history` | Đọc tin nhắn DM |
| `im:write` | Gửi DM |
| `reactions:read` | Đọc emoji reaction |
| `reactions:write` | Thêm emoji reaction |
| `users:read` | Lấy thông tin user |
| `commands` | Slash commands (`/create-task`) |

### 2.3 Cài đặt vào Workspace

1. Vào **OAuth & Permissions**
2. Click **Install to Workspace** → **Allow**
3. Copy **Bot User OAuth Token** (bắt đầu bằng `xoxb-`)

### 2.4 Lấy Signing Secret

1. Vào **Basic Information** → **App Credentials**
2. Copy **Signing Secret**

## Bước 3: Cấu hình biến môi trường

```bash
cd examples/nextjs-chat
```

Tạo file `.env.local`:

```env
# Tên bot
BOT_USERNAME=chat-sdk-demo

# ==========================================
# Slack (Single-Workspace Mode)
# ==========================================
SLACK_BOT_TOKEN=xoxb-your-bot-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here

# ==========================================
# Microsoft Teams — comment out nếu không dùng
# ==========================================
# TEAMS_APP_ID=YOUR-TEAMS-APP-ID-HERE
# TEAMS_APP_PASSWORD=YOUR-TEAMS-APP-PASSWORD-HERE

# ==========================================
# Redis — để trống sẽ dùng in-memory (đủ cho demo)
# ==========================================
REDIS_URL=

# ==========================================
# AI (Groq - miễn phí)
# ==========================================
GROQ_API_KEY=your-groq-api-key-here
```

> **Quan trọng**: `TEAMS_APP_ID` và `TEAMS_APP_PASSWORD` phải được comment out (`#`) nếu không dùng Teams. Để placeholder `YOUR-TEAMS-APP-ID-HERE` sẽ gây lỗi 500.

## Bước 4: Chạy ngrok tunnel

Slack cần một URL công khai để gửi webhook. ngrok tạo tunnel từ URL công khai về localhost.

```bash
ngrok http 3000
```

Copy **Forwarding URL** (ví dụ: `https://abcd-1234.ngrok-free.app`).

> Giữ ngrok chạy trong terminal riêng suốt quá trình phát triển.

## Bước 5: Chạy server

```bash
cd examples/nextjs-chat
pnpm dev
```

Kết quả mong đợi:

```
▲ Next.js 16.x (Turbopack)
- Local: http://localhost:3000
✓ Ready in ~1s
```

Kiểm tra webhook endpoint:

```bash
curl http://localhost:3000/api/webhooks/slack
# → "slack webhook endpoint is active"
```

## Bước 6: Kết nối Slack với server

### 6.1 Bật Event Subscriptions

1. Trong Slack App settings, vào **Event Subscriptions**
2. Bật **Enable Events** → On
3. Nhập **Request URL**: `https://YOUR-NGROK-URL/api/webhooks/slack`
4. Đợi hiện dấu tick **Verified**

### 6.2 Subscribe Bot Events

Trong **Subscribe to bot events**, thêm:

| Event | Mục đích |
|-------|----------|
| `app_mention` | Khi user @mention bot |
| `message.channels` | Tin nhắn trong public channel |
| `message.groups` | Tin nhắn trong private channel |
| `message.im` | Tin nhắn DM |
| `reaction_added` | Thêm emoji reaction |
| `reaction_removed` | Xóa emoji reaction |

Click **Save Changes**.

### 6.3 Bật Interactivity

1. Vào **Interactivity & Shortcuts**
2. Bật **Interactivity** → On
3. Nhập **Request URL**: `https://YOUR-NGROK-URL/api/webhooks/slack`
4. Click **Save Changes**

### 6.4 (Tùy chọn) Thêm Slash Command

1. Vào **Slash Commands** → **Create New Command**
2. Command: `/create-task`
3. Request URL: `https://YOUR-NGROK-URL/api/webhooks/slack`
4. Description: `Tạo task mới`
5. Click **Save**

### 6.5 Cài lại App

Sau khi thay đổi scopes hoặc events, phải cài lại:

1. Vào **OAuth & Permissions**
2. Click **Reinstall to Workspace** → **Allow**
3. Cập nhật `SLACK_BOT_TOKEN` trong `.env.local` nếu token thay đổi
4. Restart dev server

## Bước 7: Test bot

### Welcome Card

1. Invite bot vào channel: `/invite @Chat SDK Demo`
2. Mention bot: `@Chat SDK Demo hello`
3. Bot trả lời bằng interactive welcome card với các buttons

### Chế độ AI

1. Mention kèm "AI": `@Chat SDK Demo AI TypeScript là gì?`
2. Bot bật AI mode và trả lời dùng Llama 3.3 70B (qua Groq, miễn phí)
3. Tất cả @mention tiếp theo trong thread đều được AI trả lời
4. Nói `@Chat SDK Demo disable AI` để tắt

### Quản lý Task

1. Click nút **Create Task** trên welcome card (hoặc gõ `/create-task`)
2. Điền form: Title, Description, Assignee, Priority
3. Task card xuất hiện với các nút trạng thái
4. Click **In Progress** / **Done** / **Blocked** — card cập nhật tại chỗ (in-place edit)
5. Click **Comment** để thêm bình luận

## Bước 8: (Tùy chọn) Thêm Microsoft Teams

Cùng một bot code chạy trên Teams mà không cần thay đổi handler — chỉ cần thêm adapter.

```
┌─────────────────────────────────────────────────────────┐
│                   QUY TRÌNH SETUP TEAMS                 │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌───────────┐  │
│  │ 1. Developer │───▶│ 2. Tạo      │───▶│ 3. Tạo   │  │
│  │    Portal    │    │    Bot       │    │    App    │  │
│  └──────────────┘    └──────┬───────┘    └─────┬─────┘  │
│                             │                  │        │
│                      Lấy Bot ID &        Thêm Bot vào   │
│                      Client Secret       App Features   │
│                             │                  │        │
│                      ┌──────▼──────────────────▼─────┐  │
│                      │  4. Cài đặt / Sideload Teams  │  │
│                      └───────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### 8.1 Tạo Bot trên Developer Portal

1. Truy cập [dev.teams.cloud.microsoft.com](https://dev.teams.cloud.microsoft.com)
2. Click **Tools** (thanh bên trái) → **Bot management**
3. Click **+ New bot** → đặt tên (ví dụ: `chatsdkdemo`)
4. Sau khi tạo, bạn sẽ thấy **Bot ID** (UUID dạng `f33eabb5-...`)

### 8.2 Lấy Client Secret

1. Click vào bot → **Client Secrets**
2. Click **Add a client secret for your bot**
3. Copy password ngay lập tức (sẽ không hiển thị lại)

### 8.3 Cấu hình Endpoint Address

1. Trong bot settings → **Configure**
2. Set **Endpoint address**: `https://YOUR-NGROK-URL/api/webhooks/teams`

### 8.4 Thêm biến môi trường

Thêm vào `.env.local`:

```env
# Microsoft Teams (MultiTenant)
TEAMS_APP_ID=your-bot-id-here
TEAMS_APP_PASSWORD=your-client-secret-here
```

### 8.5 Bật Teams Adapter trong code

Cập nhật `src/lib/adapters.ts`:

```typescript
import { createTeamsAdapter, type TeamsAdapter } from "@chat-adapter/teams";

export interface Adapters {
  slack?: SlackAdapter;
  teams?: TeamsAdapter;  // Thêm dòng này
}

// Trong buildAdapters():
if (process.env.TEAMS_APP_ID && process.env.TEAMS_APP_PASSWORD) {
  adapters.teams = createTeamsAdapter({
    appId: process.env.TEAMS_APP_ID,
    appPassword: process.env.TEAMS_APP_PASSWORD,
    appType: "MultiTenant",
    userName: "Chat SDK Bot",
  });
}
```

### 8.6 Tạo Teams App

1. Quay lại **Developer Portal** → **Apps** → **+ New app**
2. Điền đầy đủ thông tin bắt buộc:

```
┌─────────────────────────────────────────────────────┐
│  Basic Information (tất cả bắt buộc)                │
├─────────────────────────────────────────────────────┤
│  Short name:        Chat SDK Demo                   │
│  Short description: Bot demo với Chat SDK           │
│  Long description:  Multi-platform chatbot demo...  │
│  Version:           1.0.0                           │
│  Developer name:    Tên của bạn                     │
│  Website:           https://example.com             │
│  Privacy policy:    https://example.com/privacy     │
│  Terms of use:      https://example.com/terms       │
├─────────────────────────────────────────────────────┤
│  Branding (bắt buộc)                               │
├─────────────────────────────────────────────────────┤
│  Color icon:    192x192 PNG                         │
│  Outline icon:  32x32 PNG                           │
└─────────────────────────────────────────────────────┘
```

3. Vào **App features** → click **Bot**
4. Chọn bot đã tạo (`chatsdkdemo`)
5. Tick scopes: **Personal**, **Team**, **Group Chat**
6. Click **Save**

### 8.7 Cài đặt App vào Teams

```
┌─────────────────────────────────────────────────────────┐
│  3 CÁCH CÀI ĐẶT                                        │
│                                                         │
│  Cách A: Preview (Dành cho Developer)                   │
│  ────────────────────────────────────                    │
│  Developer Portal → App của bạn → Publish               │
│  → "Preview in Teams"                                   │
│                                                         │
│  Cách B: Sideload (Không cần Admin)                     │
│  ──────────────────────────────────                      │
│  Developer Portal → App của bạn → Publish               │
│  → "Download app package" (.zip)                        │
│  Teams → Apps → "Upload an app"                         │
│  → "Upload a custom app" → chọn file .zip               │
│                                                         │
│  Cách C: Admin Install (Toàn tổ chức)                   │
│  ────────────────────────────────────                    │
│  Teams Admin Center → Teams apps → Manage apps          │
│  → Upload → chọn .zip → Allow                           │
└─────────────────────────────────────────────────────────┘
```

> **Lưu ý**: Nếu thấy "Permissions needed. Ask your IT admin", tenant Teams hạn chế cài custom app. Dùng Cách B (sideload) hoặc nhờ admin cho phép trong Teams Admin Center → **Permission policies**.

### 8.8 Test trên Teams

1. Mở chat với bot hoặc @mention trong channel
2. Tất cả tính năng đều hoạt động: Welcome Card, AI Mode, Task Management, v.v.

> **Lưu ý riêng cho Teams**:
> - Bot Teams **không thể thêm emoji reaction** qua API — bot sẽ trả lời bằng tin nhắn text thay thế
> - Adaptive Cards được dùng thay Slack Block Kit (chuyển đổi tự động)
> - Lấy lịch sử tin nhắn cần Microsoft Graph API permissions

---

## Tính năng

| Tính năng | Mô tả | Cách kích hoạt |
|-----------|-------|----------------|
| **Welcome Card** | Card tương tác với buttons, dropdowns | `@bot hello` |
| **Chế độ AI** | Trả lời bằng AI (Groq/Llama, miễn phí) | `@bot AI <câu hỏi>` |
| **Quản lý Task** | Tạo task, cập nhật status, thêm comment | Click "Create Task" hoặc `/create-task` |
| **Tin nhắn tạm** | Chỉ bạn thấy, biến mất khi reload | Click "Ephemeral response" |
| **Modal Forms** | Form nhập liệu với validation | Click "Send Feedback" hoặc "Report Bug" |
| **Sửa tin nhắn** | Bot tự sửa tin nhắn (hiệu ứng streaming) | Mention bot trong thread đã subscribe |
| **Emoji Reaction** | Bot react lại khi bạn react | React bằng :thumbsup: :heart: :fire: :rocket: |
| **Gửi DM** | Bot gửi tin nhắn riêng cho bạn | Nói "dm me" trong thread |
| **Lịch sử tin nhắn** | Hiển thị message history | Click "Fetch Messages" |
| **Channel Post** | Đăng tóm tắt lên channel | Click "Channel Post" |
| **Choose Plan** | Radio select với mô tả từng option | Click "Choose Plan" |
| **Report Bug** | Modal với privateMetadata context | Click "Report Bug" |

---

## Xử lý lỗi thường gặp

### "URL didn't respond with the value of the challenge parameter"

Slack gửi challenge khi bạn thiết lập Request URL. Nếu thất bại:

- Kiểm tra ngrok đang chạy và URL đúng
- Kiểm tra dev server đang chạy trên port 3000
- Đảm bảo path là `/api/webhooks/slack` (không phải `/api/webhook/slack`)

### Lỗi 500 Internal Server Error

**Nguyên nhân: Redis URL trống**

Nếu `REDIS_URL=` trống nhưng code cố kết nối Redis:

```typescript
// Fix: Dùng memory state làm fallback
const state = process.env.REDIS_URL
  ? createRedisState({ url: process.env.REDIS_URL })
  : createMemoryState();
```

**Nguyên nhân: Placeholder Teams credentials**

Nếu `.env.local` có `TEAMS_APP_ID=YOUR-TEAMS-APP-ID-HERE`, giá trị này là truthy và tạo adapter với credentials không hợp lệ. Comment out nếu không dùng:

```env
# TEAMS_APP_ID=YOUR-TEAMS-APP-ID-HERE
# TEAMS_APP_PASSWORD=YOUR-TEAMS-APP-PASSWORD-HERE
```

### Lỗi Turbopack Symlink (Windows)

```
TurbopackInternalError: create symlink to discord.js
A required privilege is not held by the client (os error 1314)
```

Lỗi này xảy ra trên Windows vì Turbopack + pnpm dùng symlinks cần quyền admin. File `adapters.ts` trong demo đã được đơn giản hóa, chỉ import Slack adapter.

Nếu cần adapter khác trên Windows:
- Chạy terminal với quyền Administrator
- Hoặc bật Developer Mode: Windows Settings → Privacy & Security → For Developers

### Bot không phản hồi (Multi-Workspace Mode)

Nếu log hiện `"Slack adapter initialized in multi-workspace mode"`:

Slack adapter mặc định dùng multi-workspace mode khi `botToken` không được truyền rõ ràng. Đảm bảo `adapters.ts` truyền đủ:

```typescript
createSlackAdapter({
  botToken: process.env.SLACK_BOT_TOKEN,           // Phải truyền rõ ràng!
  signingSecret: process.env.SLACK_SIGNING_SECRET,  // Phải truyền rõ ràng!
  userName: "Chat SDK Bot",
})
```

### AI mode hiện card nhưng không có AI response

**Nguyên nhân: Vercel AI Gateway**

Dùng string format `"google/gemini-2.0-flash"` sẽ route qua Vercel AI Gateway (cần auth Vercel). Dùng provider SDK trực tiếp:

```typescript
// Sai — route qua AI Gateway
model: "google/gemini-2.0-flash"

// Đúng — gọi API trực tiếp
import { createGroq } from "@ai-sdk/groq";
const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
model: groq("llama-3.3-70b-versatile")
```

### Teams: "Manifest parsing has failed"

Manifest app thiếu thông tin bắt buộc. Kiểm tra trong Developer Portal:

```
┌─────────────────────────────────────────┐
│  CHECKLIST MANIFEST                     │
│                                         │
│  [x] Short name đã điền                 │
│  [x] Short description đã điền          │
│  [x] Long description đã điền           │
│  [x] Version: 1.0.0                     │
│  [x] Developer name + website           │
│  [x] Privacy policy URL                 │
│  [x] Terms of use URL                   │
│  [x] Color icon 192x192 đã upload       │
│  [x] Outline icon 32x32 đã upload       │
│  [x] Bot đã thêm vào App features       │
│  [x] Bot scopes đã chọn (Personal,      │
│      Team, hoặc Group Chat)             │
└─────────────────────────────────────────┘
```

### Teams: "Permissions needed. Ask your IT admin"

Tenant hạn chế cài custom app. Giải pháp:
1. **Sideload**: Tải app package (.zip) từ Developer Portal → Upload trong Teams
2. **Admin**: Teams Admin Center → Permission policies → Cho phép custom apps
3. **Dev tenant**: Đăng ký miễn phí Microsoft 365 developer tenant tại [developer.microsoft.com/microsoft-365/dev-program](https://developer.microsoft.com/en-us/microsoft-365/dev-program)

### Lỗi Slack `invalid_blocks`

Slack giới hạn field `value` của button tối đa **2000 ký tự**. Không serialize object lớn vào button value. Dùng in-memory store và chỉ truyền ID ngắn:

```typescript
// Sai — full object trong button value
<Button id="update" value={JSON.stringify(largeObject)}>

// Đúng — chỉ truyền ID, lookup data từ store
<Button id="update" value={taskId}>
```

---

## Kiến trúc tổng quan

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

**Cùng bot code, nhiều platform** — các handler như `onNewMention`, `onAction`,
`onModalSubmit` chạy giống hệt trên Slack và Teams. Adapter layer lo phần
chuyển đổi format (Slack Block Kit vs Teams Adaptive Cards).

### Luồng xử lý tin nhắn

```
User gửi tin nhắn
        │
        ▼
┌─────────────────┐     ┌──────────────────┐
│ Platform gửi    │────▶│ Adapter xác thực │
│ webhook (Slack  │     │ & parse tin nhắn │
│ hoặc Teams)     │     └────────┬─────────┘
└─────────────────┘              │
                                 ▼
                    ┌─────────────────────────┐
                    │  Chat SDK route đến:    │
                    │                         │
                    │  onNewMention ──────▶ Welcome Card / AI Mode
                    │  onSubscribedMessage ▶ AI trả lời / DM / Edit
                    │  onAction ──────────▶ Click button
                    │  onModalSubmit ─────▶ Submit form
                    │  onReaction ────────▶ Emoji reaction
                    └────────────┬────────────┘
                                 │
                                 ▼
                    ┌─────────────────────────┐
                    │ Adapter chuyển đổi JSX: │
                    │  Slack → Block Kit       │
                    │  Teams → Adaptive Cards  │
                    └─────────────────────────┘
```

### Các provider AI có thể dùng

Demo dùng [Vercel AI SDK](https://sdk.vercel.ai/) hỗ trợ nhiều provider:

| Provider | Package | Miễn phí | Model ví dụ |
|----------|---------|----------|-------------|
| **Groq** | `@ai-sdk/groq` | Có (rộng rãi) | `llama-3.3-70b-versatile` |
| Google | `@ai-sdk/google` | Giới hạn | `gemini-2.0-flash` |
| Anthropic | `@ai-sdk/anthropic` | Không | `claude-4-sonnet` |
| OpenAI | `@ai-sdk/openai` | Không | `gpt-4o` |

Để đổi provider, sửa `bot.tsx`:

```typescript
import { createGroq } from "@ai-sdk/groq";
const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });

const agent = new ToolLoopAgent({
  model: groq("llama-3.3-70b-versatile"),
  instructions: "You are a helpful assistant...",
});
```

---

## Source code đầy đủ

### Cấu trúc thư mục

```
examples/nextjs-chat/
├── .env.local                          # Biến môi trường
├── package.json                        # Dependencies
├── src/
│   ├── app/
│   │   └── api/
│   │       └── webhooks/
│   │           └── [platform]/
│   │               └── route.ts        # API route nhận webhook
│   └── lib/
│       ├── adapters.ts                 # Cấu hình Slack adapter
│       └── bot.tsx                     # Logic bot chính
```

### File 1: `.env.local`

```env
# Tên bot
BOT_USERNAME=chat-sdk-demo

# ==========================================
# Slack (Single-Workspace Mode)
# ==========================================
# 1. Vào https://api.slack.com/apps
# 2. Chọn app (hoặc tạo mới)
# 3. Bot Token: OAuth & Permissions > Bot User OAuth Token
# 4. Signing Secret: Basic Information > App Credentials > Signing Secret
SLACK_BOT_TOKEN=xoxb-your-token-here
SLACK_SIGNING_SECRET=your-signing-secret-here

# ==========================================
# Microsoft Teams (comment out nếu không dùng)
# ==========================================
# TEAMS_APP_ID=YOUR-TEAMS-APP-ID-HERE
# TEAMS_APP_PASSWORD=YOUR-TEAMS-APP-PASSWORD-HERE

# ==========================================
# Redis — để trống sẽ dùng in-memory state
# ==========================================
REDIS_URL=

# ==========================================
# AI (Groq - miễn phí)
# ==========================================
GROQ_API_KEY=your-groq-api-key-here
```

### File 2: `src/app/api/webhooks/[platform]/route.ts`

```typescript
import { bot } from "@/lib/bot";
import { recorder } from "@/lib/recorder";

type Platform = keyof typeof bot.webhooks;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
): Promise<Response> {
  const { platform } = await params;

  // Kiểm tra có webhook handler cho platform này không
  const webhookHandler = bot.webhooks[platform as Platform];
  if (!webhookHandler) {
    return new Response(`Unknown platform: ${platform}`, { status: 404 });
  }

  // Ghi lại webhook nếu recording được bật
  if (recorder.isEnabled) {
    await recorder.recordWebhook(platform, request.clone());
  }

  // Xử lý webhook
  try {
    const response = await webhookHandler(request, {
      waitUntil: (task: Promise<unknown>) => {
        task.catch((err) => console.error("[webhook] waitUntil error:", err));
      },
    });
    return response;
  } catch (err) {
    console.error("[webhook] Handler error:", err);
    return new Response("ok", { status: 200 });
  }
}

// Health check endpoint
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ platform: string }> }
): Promise<Response> {
  const { platform } = await params;
  const hasAdapter = bot.webhooks[platform as Platform] !== undefined;

  if (hasAdapter) {
    return new Response(`${platform} webhook endpoint is active`, {
      status: 200,
    });
  }

  return new Response(`${platform} adapter not configured`, { status: 404 });
}
```

### File 3: `src/lib/adapters.ts`

```typescript
import { createSlackAdapter, type SlackAdapter } from "@chat-adapter/slack";
import { ConsoleLogger } from "chat";
import { recorder, withRecording } from "./recorder";

const logger = new ConsoleLogger("info");

export interface Adapters {
  slack?: SlackAdapter;
}

// Các method cần record cho mỗi adapter
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

/**
 * Tạo adapters dựa trên biến môi trường.
 *
 * LƯU Ý: Đã đơn giản hóa cho demo — chỉ Slack adapter.
 * Các adapter Discord/Teams/GChat/GitHub/Linear đã được loại bỏ
 * để tránh lỗi Turbopack symlink trên Windows.
 */
export function buildAdapters(): Adapters {
  recorder.startFetchRecording();

  const adapters: Adapters = {};

  if (process.env.SLACK_SIGNING_SECRET) {
    adapters.slack = withRecording(
      createSlackAdapter({
        botToken: process.env.SLACK_BOT_TOKEN,       // Phải truyền rõ ràng
        signingSecret: process.env.SLACK_SIGNING_SECRET, // Phải truyền rõ ràng
        userName: "Chat SDK Bot",
        logger: logger.child("slack"),
      }),
      "slack",
      SLACK_METHODS
    );
  }

  return adapters;
}
```

### File 4: `src/lib/bot.tsx` — Logic bot chính

```tsx
/** @jsxImportSource chat */
// @ts-nocheck
import { createRedisState } from "@chat-adapter/state-redis";
import { createMemoryState } from "@chat-adapter/state-memory";
import { ToolLoopAgent } from "ai";
import { createGroq } from "@ai-sdk/groq";
import {
  Actions,
  Button,
  Card,
  CardLink,
  Chat,
  Divider,
  emoji,
  Field,
  Fields,
  LinkButton,
  Modal,
  RadioSelect,
  Section,
  Select,
  SelectOption,
  CardText as Text,
  TextInput,
} from "chat";
import { buildAdapters } from "./adapters";

// ============================================
// Regex patterns
// ============================================
const AI_MENTION_REGEX = /\bAI\b/i;
const DISABLE_AI_REGEX = /disable\s*AI/i;
const ENABLE_AI_REGEX = /enable\s*AI/i;
const DM_ME_REGEX = /^dm\s*me$/i;

// ============================================
// State & Adapters
// ============================================
// Dùng Redis nếu có, không thì dùng in-memory (OK cho demo)
const state = process.env.REDIS_URL
  ? createRedisState({
      url: process.env.REDIS_URL,
      keyPrefix: "chat-sdk-webhooks",
    })
  : createMemoryState();

const adapters = buildAdapters();

// Thread state type — lưu trạng thái AI mode cho mỗi thread
interface ThreadState {
  aiMode?: boolean;
}

// Tạo bot instance
export const bot = new Chat<typeof adapters, ThreadState>({
  userName: process.env.BOT_USERNAME || "mybot",
  adapters,
  state,
  logger: "debug",
});

// ============================================
// AI Agent (Groq/Llama - miễn phí)
// ============================================
const groq = createGroq({ apiKey: process.env.GROQ_API_KEY });
const agent = new ToolLoopAgent({
  model: groq("llama-3.3-70b-versatile"),
  instructions:
    "You are a helpful assistant in a chat thread. Answer the user's queries in a concise manner.",
});

// ============================================
// Welcome Card — @mention lần đầu
// ============================================
bot.onNewMention(async (thread, message) => {
  await thread.subscribe();

  // Nếu mention có chứa "AI" → bật AI mode
  if (AI_MENTION_REGEX.test(message.text)) {
    await thread.setState({ aiMode: true });
    await thread.post(
      <Card title={`${emoji.sparkles} AI Mode Enabled`}>
        <Text>
          I'm now in AI mode! I'll use Llama to respond to your messages in
          this thread.
        </Text>
        <Text>Say "disable AI" to turn off AI mode.</Text>
        <Divider />
        <Fields>
          <Field label="Platform" value={thread.adapter.name} />
          <Field label="Mode" value="AI Assistant" />
        </Fields>
      </Card>
    );

    // Trả lời tin nhắn đầu tiên bằng AI
    await thread.startTyping("Thinking...");
    const result = await agent.stream({ prompt: message.text });
    await thread.post(result.textStream);
    return;
  }

  // Welcome card mặc định
  await thread.startTyping();
  await thread.post(
    <Card
      subtitle={`Connected via ${thread.adapter.name}`}
      title={`${emoji.wave} Welcome!`}
    >
      <Text>I'm now listening to this thread. Try these actions:</Text>
      <Text>
        {`${emoji.sparkles} **Mention me with "AI"** to enable AI assistant mode`}
      </Text>
      <CardLink url="https://chat-sdk.dev/docs/cards">
        View documentation
      </CardLink>
      <Divider />
      <Fields>
        <Field label="DM Support" value={thread.isDM ? "Yes" : "No"} />
        <Field label="Platform" value={thread.adapter.name} />
      </Fields>
      <Divider />
      <Actions>
        <Select id="quick_action" label="Quick Action" placeholder="Choose...">
          <SelectOption label="Say Hello" value="greet" />
          <SelectOption label="Show Info" value="info" />
          <SelectOption label="Get Help" value="help" />
        </Select>
        <Button id="hello" style="primary">
          Say Hello
        </Button>
        <Button id="ephemeral">Ephemeral response</Button>
        <Button id="info">Show Info</Button>
        <Button id="choose_plan">Choose Plan</Button>
        <Button id="feedback">Send Feedback</Button>
        <Button id="messages">Fetch Messages</Button>
        <Button id="channel-post">Channel Post</Button>
        <Button id="create_task" style="primary">
          Create Task
        </Button>
        <Button id="report" value="bug">
          Report Bug
        </Button>
        <LinkButton url="https://vercel.com">Open Link</LinkButton>
        <Button id="goodbye" style="danger">
          Goodbye
        </Button>
      </Actions>
    </Card>
  );
});

// ============================================
// Ephemeral Messages — chỉ user thấy
// ============================================
bot.onAction("ephemeral", async (event) => {
  await event.thread.postEphemeral(
    event.user,
    <Card title={`${emoji.eyes} Ephemeral Message`}>
      <Text>
        Only you can see this message. It will disappear when you reload.
      </Text>
      <Text>Try opening a modal from this ephemeral:</Text>
      <Actions>
        <Button id="ephemeral_modal" style="primary">
          Open Modal
        </Button>
      </Actions>
    </Card>,
    { fallbackToDM: true }
  );
});

bot.onAction("ephemeral_modal", async (event) => {
  await event.openModal(
    <Modal
      callbackId="ephemeral_modal_form"
      closeLabel="Cancel"
      submitLabel="Submit"
      title="Ephemeral Modal"
    >
      <TextInput
        id="response"
        label="Your Response"
        placeholder="Type something..."
      />
    </Modal>
  );
});

bot.onModalSubmit("ephemeral_modal_form", async (event) => {
  await event.relatedMessage?.edit(
    <Card title={`${emoji.check} Submitted!`}>
      <Text>Your response: **{event.values.response}**</Text>
      <Text>The original ephemeral message was updated.</Text>
    </Card>
  );
});

// ============================================
// Quick Actions — dropdown select
// ============================================
bot.onAction("quick_action", async (event) => {
  const action = event.value;
  if (action === "greet") {
    await event.thread.post(`${emoji.wave} Hello, ${event.user.fullName}!`);
  } else if (action === "info") {
    await event.thread.post(
      `${emoji.memo} You're on **${event.adapter.name}** in thread \`${event.threadId}\``
    );
  } else if (action === "help") {
    await event.thread.post(
      `${emoji.question} Try mentioning me with "AI" to enable AI assistant mode!`
    );
  }
});

// ============================================
// Choose Plan — Radio Select
// ============================================
bot.onAction("choose_plan", (event) => {
  event.thread.post(
    <Card title="Choose Plan">
      <Actions>
        <RadioSelect id="plan_selected" label="Choose Plan">
          <SelectOption
            description="Headers, body text, labels, and placeholders"
            label="*All text elements*"
            value="all_text"
          />
          <SelectOption
            description="Keep body text in the current system font"
            label="*Headers and titles only*"
            value="headers_titles"
          />
          <SelectOption
            description="Only the composer textarea and its placeholder"
            label="*Input fields and placeholders*"
            value="input_fields"
          />
          <SelectOption
            description="All text, but leave button labels unchanged"
            label="*Everything except buttons*"
            value="except_buttons"
          />
        </RadioSelect>
      </Actions>
    </Card>
  );
});

bot.onAction("plan_selected", (event) => {
  event.thread.post(
    <Card title={`${emoji.check} Plan Chosen!`}>
      <Text>You chose plan *{event.value}*</Text>
    </Card>
  );
});

// ============================================
// Button Actions — Hello, Info, Goodbye
// ============================================
bot.onAction("hello", async (event) => {
  await event.thread.post(`${emoji.wave} Hello, ${event.user.fullName}!`);
});

bot.onAction("info", async (event) => {
  const threadState = await event.thread.state;
  await event.thread.post(
    <Card title="Bot Information">
      <Fields>
        <Field label="User" value={event.user.fullName} />
        <Field label="User ID" value={event.user.userId} />
        <Field label="Platform" value={event.adapter.name} />
        <Field label="Thread ID" value={event.threadId} />
        <Field
          label="AI Mode"
          value={threadState?.aiMode ? "Enabled" : "Disabled"}
        />
      </Fields>
    </Card>
  );
});

bot.onAction("goodbye", async (event) => {
  await event.thread.post(
    `${emoji.wave} Goodbye, ${event.user.fullName}! See you later.`
  );
});

// ============================================
// Feedback Modal — form với validation
// ============================================
const FeedbackModal = (
  <Modal
    callbackId="feedback_form"
    closeLabel="Cancel"
    notifyOnClose
    submitLabel="Send"
    title="Send Feedback"
  >
    <TextInput
      id="message"
      label="Your Feedback"
      multiline
      placeholder="Tell us what you think..."
    />
    <Select id="category" label="Category" placeholder="Select a category">
      <SelectOption label="Bug Report" value="bug" />
      <SelectOption label="Feature Request" value="feature" />
      <SelectOption label="General Feedback" value="general" />
      <SelectOption label="Other" value="other" />
    </Select>
    <TextInput
      id="email"
      label="Email (optional)"
      optional
      placeholder="your@email.com"
    />
  </Modal>
);

bot.onAction("feedback", async (event) => {
  await event.openModal(FeedbackModal);
});

bot.onSlashCommand("/test-feedback", async (event) => {
  const result = await event.openModal(FeedbackModal);
  if (!result) {
    await event.channel.post(
      `${emoji.warning} Couldn't open the feedback modal. Please try again.`
    );
  }
});

bot.onModalSubmit("feedback_form", async (event) => {
  const { message, category, email } = event.values;

  if (!message || message.length < 5) {
    return {
      action: "errors" as const,
      errors: { message: "Feedback must be at least 5 characters" },
    };
  }

  console.log("Received feedback:", {
    message,
    category,
    email,
    user: event.user.userName,
  });
  await event.relatedMessage?.edit(`${emoji.check} **Feedback received!**`);
  const target = event.relatedChannel || event.relatedThread;
  await target?.postEphemeral(
    event.user,
    <Card title={`${emoji.check} Feedback received!`}>
      <Text>Thank you for your feedback!</Text>
      <Fields>
        <Field label="User" value={event.user.fullName} />
        <Field label="Category" value={category} />
        <Field label="Message" value={message} />
        <Field label="Email" value={email} />
      </Fields>
    </Card>,
    { fallbackToDM: false }
  );
});

bot.onModalClose("feedback_form", (event) => {
  console.log(`${event.user.userName} cancelled the feedback form`);
});

// ============================================
// Bug Report Modal — với privateMetadata
// ============================================
bot.onAction("report", async (event) => {
  await event.openModal(
    <Modal
      callbackId="report_form"
      privateMetadata={JSON.stringify({
        reportType: event.value,
        threadId: event.threadId,
        reporter: event.user.userId,
      })}
      submitLabel="Submit"
      title="Report Bug"
    >
      <TextInput
        id="title"
        label="Bug Title"
        placeholder="Brief description of the issue"
      />
      <TextInput
        id="steps"
        label="Steps to Reproduce"
        multiline
        placeholder="1. Go to...\n2. Click on..."
      />
      <Select id="severity" label="Severity">
        <SelectOption label="Low" value="low" />
        <SelectOption label="Medium" value="medium" />
        <SelectOption label="High" value="high" />
        <SelectOption label="Critical" value="critical" />
      </Select>
    </Modal>
  );
});

bot.onModalSubmit("report_form", async (event) => {
  const metadata = event.privateMetadata
    ? JSON.parse(event.privateMetadata)
    : {};
  const { title, steps, severity } = event.values;

  if (!title || title.length < 3) {
    return {
      action: "errors" as const,
      errors: { title: "Title must be at least 3 characters" },
    };
  }

  await event.relatedThread?.post(
    <Card title={`${emoji.memo} Bug Report Filed`}>
      <Fields>
        <Field label="Title" value={title} />
        <Field label="Severity" value={severity} />
        <Field label="Reporter" value={event.user.fullName} />
        <Field label="Report Type" value={metadata.reportType || "unknown"} />
        <Field label="Thread" value={metadata.threadId || "unknown"} />
      </Fields>
      <Divider />
      <Text>{`**Steps to Reproduce:**\n${steps}`}</Text>
    </Card>
  );
});

// ============================================
// Fetch Messages — demo fetchMessages API
// ============================================
bot.onAction("messages", async (event) => {
  const { thread } = event;

  const getDisplayText = (text: string, hasAttachments?: boolean) => {
    if (text?.trim()) {
      const truncated = text.slice(0, 30);
      return text.length > 30 ? `${truncated}...` : truncated;
    }
    return hasAttachments ? "[Attachment]" : "[Card]";
  };

  try {
    const recentResult = await thread.adapter.fetchMessages(thread.id, {
      limit: 5,
      direction: "backward",
    });

    const oldestResult = await thread.adapter.fetchMessages(thread.id, {
      limit: 5,
      direction: "forward",
    });

    const allMessages: string[] = [];
    let count = 0;
    for await (const msg of thread.allMessages) {
      const displayText = getDisplayText(
        msg.text,
        msg.attachments && msg.attachments.length > 0
      );
      allMessages.push(
        `Msg ${count + 1}: ${msg.author.userName} - ${displayText}`
      );
      count++;
    }

    const formatMessages = (msgs: typeof recentResult.messages) =>
      msgs.length > 0
        ? msgs
            .map((m, i) => {
              const displayText = getDisplayText(
                m.text,
                m.attachments && m.attachments.length > 0
              );
              return `Msg ${i + 1}: ${m.author.userName} - ${displayText}`;
            })
            .join("\n\n")
        : "(no messages)";

    await thread.post(
      <Card title={`${emoji.memo} Message Fetch Results`}>
        <Section>
          <Text>**fetchMessages (backward, limit: 5)**</Text>
          <Text>{formatMessages(recentResult.messages)}</Text>
        </Section>
        <Divider />
        <Section>
          <Text>**fetchMessages (forward, limit: 5)**</Text>
          <Text>{formatMessages(oldestResult.messages)}</Text>
        </Section>
        <Divider />
        <Section>
          <Text>**allMessages iterator**</Text>
          <Text>
            {allMessages.length > 0
              ? allMessages.join("\n\n")
              : "(no messages)"}
          </Text>
        </Section>
      </Card>
    );
  } catch (err) {
    await thread.post(
      `${emoji.warning} Error fetching messages: ${
        err instanceof Error ? err.message : "Unknown error"
      }`
    );
  }
});

// ============================================
// Channel Post — đăng tóm tắt lên channel
// ============================================
bot.onAction("channel-post", async (event) => {
  const { thread } = event;
  const channel = thread.channel;

  try {
    const info = await channel.fetchMetadata();
    const channelName = info.name || channel.id;

    const recent: string[] = [];
    for await (const msg of channel.messages) {
      const preview = msg.text?.trim()
        ? msg.text.slice(0, 50)
        : "[Card/Attachment]";
      recent.push(`- ${msg.author.userName}: ${preview}`);
      if (recent.length >= 3) {
        break;
      }
    }

    const summary =
      recent.length > 0 ? recent.join("\n\n") : "(no top-level messages found)";

    await channel.post(
      <Card title={`${emoji.memo} Channel Summary`}>
        <Section>
          <Text>{`Channel: ${channelName}`}</Text>
          <Text>**Last 3 top-level messages:**</Text>
          <Text>{summary}</Text>
        </Section>
      </Card>
    );
  } catch (err) {
    await thread.post(
      `${emoji.warning} Error reading channel: ${
        err instanceof Error ? err.message : "Unknown error"
      }`
    );
  }
});

// ============================================
// Help — pattern matching
// ============================================
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

bot.onNewMessage(/help/i, async (thread, message) => {
  const platforms = Object.keys(adapters).join(", ") || "none configured";
  await thread.post(
    <Card title={`${emoji.question} Help`}>
      <Text>{`Hi ${message.author.userName}! Here's how I can help:`}</Text>
      <Divider />
      <Section>
        <Text>{`${emoji.star} **Mention me** to start a conversation`}</Text>
        <Text>{`${emoji.sparkles} **Mention me with "AI"** to enable AI assistant mode`}</Text>
        <Text>{`${emoji.eyes} I'll respond to messages in threads where I'm mentioned`}</Text>
        <Text>{`${emoji.fire} React to my messages and I'll react back!`}</Text>
        <Text>{`${emoji.rocket} Active platforms: ${platforms}`}</Text>
      </Section>
    </Card>
  );
});

// ============================================
// Subscribed Thread Messages — AI mode, DM, editing
// ============================================
bot.onSubscribedMessage(async (thread, message) => {
  if (!message.isMention) {
    return;
  }

  const threadState = await thread.state;

  // Tắt AI mode
  if (DISABLE_AI_REGEX.test(message.text)) {
    await thread.setState({ aiMode: false });
    await thread.post(`${emoji.check} AI mode disabled for this thread.`);
    return;
  }

  // Bật AI mode
  if (ENABLE_AI_REGEX.test(message.text)) {
    await thread.setState({ aiMode: true });
    await thread.post(`${emoji.sparkles} AI mode enabled for this thread!`);
    return;
  }

  // AI mode — trả lời bằng AI với message history
  if (threadState?.aiMode) {
    let messages: typeof thread.recentMessages;
    try {
      const result = await thread.adapter.fetchMessages(thread.id, {
        limit: 20,
      });
      messages = result.messages;
    } catch {
      messages = thread.recentMessages;
    }
    const history = [...messages]
      .reverse()
      .filter((msg) => msg.text.trim())
      .map((msg) => ({
        role: msg.author.isMe ? ("assistant" as const) : ("user" as const),
        content: msg.text,
      }));
    await thread.startTyping("Thinking...");
    const result = await agent.stream({ prompt: history });
    await thread.post(result.textStream);
    return;
  }

  // Gửi DM
  if (DM_ME_REGEX.test(message.text.trim())) {
    try {
      const dmThread = await bot.openDM(message.author);
      await dmThread.post(
        <Card title={`${emoji.speech_bubble} Private Message`}>
          <Text>{`Hi ${message.author.fullName}! You requested a DM from the thread.`}</Text>
          <Divider />
          <Text>This is a private conversation between us.</Text>
        </Card>
      );
      await thread.post(`${emoji.check} I've sent you a DM!`);
    } catch (err) {
      await thread.post(
        `${emoji.warning} Sorry, I couldn't send you a DM. Error: ${
          err instanceof Error ? err.message : "Unknown error"
        }`
      );
    }
    return;
  }

  // Xử lý attachments
  if (message.attachments && message.attachments.length > 0) {
    const attachmentInfo = message.attachments
      .map(
        (a) =>
          `- ${a.name || "unnamed"} (${a.type}, ${a.mimeType || "unknown"})`
      )
      .join("\n");

    await thread.post(
      <Card title={`${emoji.eyes} Attachments Received`}>
        <Text>{`You sent ${message.attachments.length} file(s):`}</Text>
        <Text>{attachmentInfo}</Text>
      </Card>
    );
    return;
  }

  // Default — demo message editing (streaming effect)
  await thread.startTyping();
  await delay(1000);
  const response = await thread.post(`${emoji.thinking} Processing...`);
  await delay(2000);
  await response.edit(`${emoji.eyes} Just a little bit...`);
  await delay(1000);
  await response.edit(`${emoji.check} Thanks for your message!`);
});

// ============================================
// Ticket / Task Management
// ============================================

const PRIORITY_EMOJI: Record<string, string> = {
  low: emoji.white_circle,
  medium: emoji.large_blue_circle,
  high: emoji.warning,
  critical: emoji.fire,
};

const STATUS_EMOJI: Record<string, string> = {
  open: emoji.white_circle,
  in_progress: emoji.large_blue_circle,
  done: emoji.check,
  blocked: emoji.no_entry,
};

const STATUS_LABEL: Record<string, string> = {
  open: "Open",
  in_progress: "In Progress",
  done: "Done",
  blocked: "Blocked",
};

// Modal tạo task
const TaskModal = (
  <Modal
    callbackId="task_form"
    closeLabel="Cancel"
    submitLabel="Create Task"
    title="Create Task"
  >
    <TextInput
      id="title"
      label="Task Title"
      placeholder="e.g. Fix login page redirect bug"
    />
    <TextInput
      id="description"
      label="Description"
      multiline
      placeholder="Describe the task in detail..."
    />
    <Select id="assignee" label="Assign To" placeholder="Select team member">
      <SelectOption label="Alice" value="alice" />
      <SelectOption label="Bob" value="bob" />
      <SelectOption label="Charlie" value="charlie" />
      <SelectOption label="Unassigned" value="unassigned" />
    </Select>
    <Select id="priority" label="Priority">
      <SelectOption label="Low" value="low" />
      <SelectOption label="Medium" value="medium" />
      <SelectOption label="High" value="high" />
      <SelectOption label="Critical" value="critical" />
    </Select>
  </Modal>
);

// In-memory task store
interface TaskData {
  title: string;
  description: string;
  assignee: string;
  priority: string;
  status: string;
  creator: string;
  taskId: string;
}
const taskStore = new Map<string, TaskData>();

// Render task card — dùng lại khi tạo mới và cập nhật status
const renderTaskCard = (task: TaskData) => {
  const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
  return (
    <Card title={`${STATUS_EMOJI[task.status]} Task: ${task.title}`}>
      <Text>{task.description}</Text>
      <Divider />
      <Fields>
        <Field label="Status" value={`${STATUS_EMOJI[task.status]} ${STATUS_LABEL[task.status]}`} />
        <Field label="Priority" value={`${PRIORITY_EMOJI[task.priority]} ${cap(task.priority)}`} />
        <Field label="Assignee" value={task.assignee === "unassigned" ? "Unassigned" : cap(task.assignee)} />
        <Field label="Created by" value={task.creator} />
        <Field label="Task ID" value={`#${task.taskId}`} />
      </Fields>
      <Divider />
      <Actions>
        <Button id="task_in_progress" value={task.taskId} style="primary">
          In Progress
        </Button>
        <Button id="task_done" value={task.taskId}>
          Done
        </Button>
        <Button id="task_blocked" value={task.taskId} style="danger">
          Blocked
        </Button>
        <Button id="task_comment" value={task.taskId}>
          Comment
        </Button>
      </Actions>
    </Card>
  );
};

// Mở modal tạo task từ button
bot.onAction("create_task", async (event) => {
  await event.openModal(TaskModal);
});

// Mở modal tạo task từ slash command
bot.onSlashCommand("/create-task", async (event) => {
  const result = await event.openModal(TaskModal);
  if (!result) {
    await event.channel.post(
      `${emoji.warning} Couldn't open the task creation modal. Please try again.`
    );
  }
});

// Xử lý submit form tạo task
bot.onModalSubmit("task_form", async (event) => {
  const { title, description, assignee, priority } = event.values;

  if (!title || title.length < 3) {
    return {
      action: "errors" as const,
      errors: { title: "Task title must be at least 3 characters" },
    };
  }

  const taskId = Date.now().toString(36).slice(-4).toUpperCase();
  const task: TaskData = {
    title,
    description: description || "No description provided",
    assignee: assignee || "unassigned",
    priority: priority || "medium",
    status: "open",
    creator: event.user.fullName,
    taskId,
  };
  taskStore.set(taskId, task);

  const target = event.relatedThread || event.relatedChannel;
  await target?.post(renderTaskCard(task));
});

// Xử lý thay đổi status task
const handleTaskStatusChange = async (
  event: Parameters<Parameters<typeof bot.onAction>[1]>[0],
  newStatus: string
) => {
  const taskId = event.value;
  const task = taskStore.get(taskId);
  if (!task) {
    await event.thread.post(`${emoji.warning} Task #${taskId} not found.`);
    return;
  }
  task.status = newStatus;
  taskStore.set(taskId, task);

  // Cập nhật card tại chỗ (in-place edit)
  await event.relatedMessage?.edit(renderTaskCard(task));
  await event.thread.post(
    `${STATUS_EMOJI[newStatus]} **${event.user.fullName}** changed status of **#${taskId}** to **${STATUS_LABEL[newStatus]}**`
  );
};

bot.onAction("task_in_progress", (event) => handleTaskStatusChange(event, "in_progress"));
bot.onAction("task_done", (event) => handleTaskStatusChange(event, "done"));
bot.onAction("task_blocked", (event) => handleTaskStatusChange(event, "blocked"));

// Mở modal thêm comment
bot.onAction("task_comment", async (event) => {
  await event.openModal(
    <Modal
      callbackId="task_comment_form"
      closeLabel="Cancel"
      privateMetadata={event.value}
      submitLabel="Add Comment"
      title={`Comment on #${event.value}`}
    >
      <TextInput
        id="comment"
        label="Your Comment"
        multiline
        placeholder="Add a comment to this task..."
      />
    </Modal>
  );
});

// Xử lý submit comment
bot.onModalSubmit("task_comment_form", async (event) => {
  const taskId = event.privateMetadata;
  const { comment } = event.values;

  if (!comment || comment.length < 1) {
    return {
      action: "errors" as const,
      errors: { comment: "Comment cannot be empty" },
    };
  }

  await event.relatedThread?.post(
    <Card title={`${emoji.speech_bubble} Comment on #${taskId}`}>
      <Text>{`**${event.user.fullName}:**`}</Text>
      <Text>{comment}</Text>
    </Card>
  );
});

// ============================================
// Emoji Reactions — bot react lại
// ============================================
bot.onReaction(["thumbs_up", "heart", "fire", "rocket"], async (event) => {
  if (!event.added) {
    return;
  }

  if (event.adapter.name === "gchat" || event.adapter.name === "teams") {
    await event.adapter.postMessage(
      event.threadId,
      `Thanks for the ${event.rawEmoji}!`
    );
    return;
  }

  await event.adapter.addReaction(
    event.threadId,
    event.messageId,
    emoji.raised_hands
  );
});
```

### File 5: `package.json`

```json
{
  "name": "example-nextjs-chat",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev --inspect",
    "build": "next build",
    "start": "next start",
    "typecheck": "tsc --noEmit"
  },
  "dependencies": {
    "@ai-sdk/groq": "^3.0.24",
    "@chat-adapter/slack": "workspace:*",
    "@chat-adapter/state-memory": "workspace:*",
    "@chat-adapter/state-redis": "workspace:*",
    "ai": "^6.0.5",
    "chat": "workspace:*",
    "next": "^16.1.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "redis": "^4.7.1"
  },
  "devDependencies": {
    "@types/node": "^22.10.2",
    "@types/react": "^19.0.1",
    "@types/react-dom": "^19.0.1",
    "typescript": "^5.7.2"
  }
}
```

---

## Ghi chú cuối

- **In-memory state**: Task data và thread state sẽ mất khi restart server. Dùng Redis (`REDIS_URL`) cho production.
- **ngrok URL thay đổi**: Mỗi lần khởi động lại ngrok, URL sẽ thay đổi. Cần cập nhật lại trong Slack App settings (Event Subscriptions + Interactivity).
- **Groq rate limit**: Free tier có giới hạn requests/phút. Nếu gặp lỗi rate limit, đợi 1 phút rồi thử lại.
- **Windows**: Nếu gặp lỗi symlink, chạy terminal với quyền Admin hoặc bật Developer Mode.
