import { bot } from "@/lib/bot";
import { recorder } from "@/lib/recorder";

type Platform = keyof typeof bot.webhooks;

export async function POST(
  request: Request,
  { params }: { params: Promise<{ platform: string }> }
): Promise<Response> {
  const { platform } = await params;

  // Check if we have a webhook handler for this platform
  const webhookHandler = bot.webhooks[platform as Platform];
  if (!webhookHandler) {
    return new Response(`Unknown platform: ${platform}`, { status: 404 });
  }

  // Record webhook if enabled (no-op if disabled)
  if (recorder.isEnabled) {
    await recorder.recordWebhook(platform, request.clone());
  }

  // Handle the webhook - run synchronously for debugging
  try {
    const response = await webhookHandler(request, {
      waitUntil: (task: Promise<unknown>) => { task.catch((err) => console.error("[webhook] waitUntil error:", err)); },
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
