import { Suspense } from "react";
import { SessionList } from "@/components/session-list";
import { loadDashboard } from "@/lib/load";

export const metadata = { title: "Sessions" };

async function Sessions() {
  const { sessions } = await loadDashboard({ days: 1, activities: 120 });
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-5xl tracking-wide">Sessions</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          Garmin activities and WHOOP workouts from the latest pull. Sleep stays on the today card. Garmin does not expose sleep on this API.
        </p>
      </div>
      <SessionList sessions={sessions} heading="Recent work" />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-card" />}>
      <Sessions />
    </Suspense>
  );
}
