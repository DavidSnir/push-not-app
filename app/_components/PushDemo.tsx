"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";

async function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = atob(base64);
  const outputArray = new Uint8Array(rawData.length);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export default function PushDemo() {
  const [supported, setSupported] = useState(false);
  const [permission, setPermission] = useState<NotificationPermission>("default");
  const [endpoint, setEndpoint] = useState<string | null>(null);

  useEffect(() => {
    const isSupported = typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;
    setSupported(isSupported);
    if (!isSupported) return;

    Notification.requestPermission().then(setPermission);

    // register SW
    navigator.serviceWorker.register("/sw.js");
  }, []);

  const subscribe = async () => {
    if (!supported) return;
    const reg = await navigator.serviceWorker.ready;
    const res = await fetch("/api/push");
    const { publicKey, error } = await res.json();
    if (error) throw new Error(error);

    // If an existing subscription has a different appServerKey, unsubscribe first
    const existing = await reg.pushManager.getSubscription();
    if (existing) {
      // Try to resubscribe with the same key; if it fails due to key mismatch, unsubscribe
      try {
        await existing.unsubscribe();
      } catch {
        // ignore
      }
    }

    const sub = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: await urlBase64ToUint8Array(publicKey),
    });
    setEndpoint(sub.endpoint);
    await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "subscribe", subscription: sub }),
    });
  };

  const sendTest = async () => {
    const res = await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sendTest", payload: { title: "PushNot", body: "It works!", data: { url: "/" } } }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      alert(`Error: ${data?.error || res.statusText}`);
    }
  };

  return (
    <Card className="max-w-xl w-full">
      <CardHeader>
        <CardTitle>Web Push</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        <div className="text-sm">Support: {String(supported)}</div>
        <div className="text-sm">Permission: {permission}</div>
        <div className="flex gap-2">
          <Button disabled={!supported || permission !== "granted"} onClick={subscribe}>
            Subscribe
          </Button>
          <Button variant="outline" onClick={sendTest} disabled={!endpoint}>
            Send test notification
          </Button>
          {permission !== "granted" && supported && (
            <Button variant="ghost" onClick={() => Notification.requestPermission().then(setPermission)}>
              Ask permission
            </Button>
          )}
        </div>
        {endpoint && <div className="break-all text-xs opacity-70">{endpoint}</div>}
      </CardContent>
    </Card>
  );
}


