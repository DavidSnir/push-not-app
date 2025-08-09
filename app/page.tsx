import PushDemo from "./_components/PushDemo";

export default function Home() {
  return (
    <main className="min-h-screen p-6 flex flex-col items-center justify-start gap-6">
      <h1 className="text-2xl font-semibold">Push Notifications Demo</h1>
      <PushDemo />
    </main>
  );
}
