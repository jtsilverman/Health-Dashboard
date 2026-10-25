import { Suspense } from "react";
import { RefreshButton } from "@/components/refresh-button";
import { SessionList } from "@/components/session-list";
import { SyncBanner } from "@/components/sync-banner";
import { TodayCard } from "@/components/today-card";
import { TrendCharts, type ChartPoint } from "@/components/trend-charts";
import { formatShortDate } from "@/lib/dates";
import { loadDashboard } from "@/lib/load";

function HomeSkeleton() {
  return <div className="h-80 animate-pulse rounded-3xl bg-card" />;
}

async function Home() {
  const { days, sessions, sync, today, todayIso } = await loadDashboard();
  const points: ChartPoint[] = days.map((day) => ({
    date: day.date,
    label: formatShortDate(day.date),
    recovery: day.whoopRecovery,
    hrv: day.whoopHrvMs,
    sleep: day.whoopSleepHours,
    sleepPerf: day.whoopSleepPerformance,
    strain: day.whoopStrain,
    burn: day.garminTotalKcal,
    intake: day.mfpKcal,
    protein: day.mfpProteinG,
  }));

  return (
    <div className="space-y-8">
      <SyncBanner sync={sync} />
      <TodayCard day={today} isToday={today?.date === todayIso} />
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-muted">
          Recovery and strain land on the morning he wakes up. Sleep lands on the night it ended, New York time. Refresh
          pulls the recent window. The first pull on an empty database backfills 30 days.
        </p>
        <RefreshButton days={30} label="Backfill 30 days" variant="outline" />
      </div>
      <TrendCharts points={points} />
      <SessionList sessions={sessions.slice(0, 6)} showAllLink />
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<HomeSkeleton />}>
      <Home />
    </Suspense>
  );
}
