import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";

// In-memory subscription store for demo purposes
const subscriptions = new Set<string>();

export const runtime = "nodejs";

let ephemeralKeys: { publicKey: string; privateKey: string } | null = null;

function getVapid() {
  let publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  let privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:example@example.com";
  if (!publicKey || !privateKey) {
    // Generate ephemeral keys for local/dev usage
    if (!ephemeralKeys) {
      ephemeralKeys = webpush.generateVAPIDKeys();
    }
    publicKey = ephemeralKeys.publicKey;
    privateKey = ephemeralKeys.privateKey;
  }
  return { publicKey, privateKey, subject };
}

export async function GET() {
  try {
    const { publicKey } = getVapid();
    return NextResponse.json({ publicKey });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    if (action === "subscribe") {
      const subscription = body.subscription;
      if (!subscription) return NextResponse.json({ error: "Missing subscription" }, { status: 400 });
      subscriptions.add(JSON.stringify(subscription));
      return NextResponse.json({ ok: true });
    }
    if (action === "sendTest") {
      const payload = body.payload || { title: "Hello", body: "Push from server" };
      const { publicKey, privateKey, subject } = getVapid();
      webpush.setVapidDetails(subject, publicKey, privateKey);
      const sendAll = Array.from(subscriptions).map(async (subStr) => {
        try {
          const sub = JSON.parse(subStr);
          await webpush.sendNotification(sub, JSON.stringify(payload));
        } catch (err: any) {
          // Remove bad subscriptions
          if (err?.statusCode === 410 || err?.statusCode === 404) {
            subscriptions.delete(subStr);
          }
        }
      });
      await Promise.allSettled(sendAll);
      return NextResponse.json({ sent: subscriptions.size });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}


