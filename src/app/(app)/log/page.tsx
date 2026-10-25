import { Suspense } from "react";
import { LogTable } from "@/components/log-table";
import { loadDashboard } from "@/lib/load";

export const metadata = { title: "Log" };

async function Log() {
  const { days } = await loadDashboard({ days: 90, activities: 1 });
  return (
    <div className="space-y-4">
      <div>
        <h1 className="font-display text-5xl tracking-wide">Daily log</h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">
          One row per date. WHOOP, Garmin, and MyFitnessPal sit side by side. Scroll sideways on a phone. The date column stays put.
        </p>
      </div>
      <LogTable days={days} />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-card" />}>
      <Log />
    </Suspense>
  );
}
