import { NextRequest, NextResponse } from "next/server";
import webpush from "web-push";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

export const runtime = "nodejs";

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function isGoneOrNotFound(error: unknown): boolean {
  if (typeof error === "object" && error !== null && "statusCode" in error) {
    const code = (error as { statusCode?: number }).statusCode;
    return code === 410 || code === 404;
  }
  return false;
}

function getVapid() {
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;
  const subject = process.env.VAPID_SUBJECT || "mailto:example@example.com";
  if (!publicKey || !privateKey) {
    throw new Error(
      "VAPID keys are missing. Set NEXT_PUBLIC_VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY in your environment."
    );
  }
  return { publicKey, privateKey, subject };
}

export async function GET() {
  try {
    const { publicKey } = getVapid();
    return NextResponse.json({ publicKey });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body;
    if (action === "subscribe") {
      const subscription = body.subscription;
      if (!subscription) return NextResponse.json({ error: "Missing subscription" }, { status: 400 });
      const url = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (!url) {
        return NextResponse.json({ error: "Convex URL not configured. Run `npx convex dev --once` locally or set NEXT_PUBLIC_CONVEX_URL in production." }, { status: 500 });
      }
      try {
        const convex = new ConvexHttpClient(url);
        const { endpoint, keys } = subscription;
        await convex.mutation(api.subscriptions.upsert, {
          endpoint,
          keys: { p256dh: keys.p256dh, auth: keys.auth },
        });
        return NextResponse.json({ ok: true });
      } catch (e) {
        return NextResponse.json({ error: `Convex upsert failed: ${getErrorMessage(e)}` }, { status: 500 });
      }
    }
    if (action === "sendTest") {
      const payload = body.payload || { title: "Hello", body: "Push from server" };
      const { publicKey, privateKey, subject } = getVapid();
      webpush.setVapidDetails(subject, publicKey, privateKey);
      const url = process.env.NEXT_PUBLIC_CONVEX_URL;
      if (!url) {
        return NextResponse.json({ error: "Convex URL not configured. Run `npx convex dev --once` locally or set NEXT_PUBLIC_CONVEX_URL in production." }, { status: 500 });
      }
      let all: Array<{ endpoint: string; keys: { p256dh: string; auth: string } }>; 
      try {
        const convex = new ConvexHttpClient(url);
        all = await convex.query(api.subscriptions.list, {});
      } catch (e) {
        return NextResponse.json({ error: `Convex list failed: ${getErrorMessage(e)}` }, { status: 500 });
      }
      const sendAll = all.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.keys.p256dh, auth: s.keys.auth } },
            JSON.stringify(payload)
          );
        } catch (err) {
          if (isGoneOrNotFound(err)) {
            try {
              const convex = new ConvexHttpClient(url);
              await convex.mutation(api.subscriptions.remove, { endpoint: s.endpoint });
            } catch {}
          }
        }
      });
      await Promise.allSettled(sendAll);
      return NextResponse.json({ sent: all.length });
    }
    return NextResponse.json({ error: "Unknown action" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: getErrorMessage(error) }, { status: 500 });
  }
}


