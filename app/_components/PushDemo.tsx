"use client";

import { useEffect, useState } from "react";

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
    await fetch("/api/push", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sendTest", payload: { title: "PushNot", body: "It works!", data: { url: "/" } } }),
    });
  };

  return (
    <div className="flex flex-col gap-3 p-4 border rounded max-w-md">
      <div className="text-sm">Support: {String(supported)}</div>
      <div className="text-sm">Permission: {permission}</div>
      <button className="px-3 py-2 rounded bg-black text-white disabled:opacity-40" disabled={!supported || permission !== "granted"} onClick={subscribe}>
        Subscribe
      </button>
      <button className="px-3 py-2 rounded border" onClick={sendTest} disabled={!endpoint}>
        Send test notification
      </button>
      {endpoint && <div className="break-all text-xs opacity-70">{endpoint}</div>}
      {permission !== "granted" && supported && (
        <button className="px-3 py-2 rounded border" onClick={() => Notification.requestPermission().then(setPermission)}>
          Ask permission
        </button>
      )}
    </div>
  );
}


