import { connection } from "next/server";
import { nyDateISO } from "@/lib/dates";
import { getActivities, getLatestSync, getRecentDays } from "@/lib/db/queries";
import type { ActivityRow, DailyMetric, SyncRun } from "@/lib/db/schema";

export async function loadDashboard(options?: { days?: number; activities?: number }): Promise<{
  days: DailyMetric[];
  sessions: ActivityRow[];
  sync: SyncRun | null;
  today: DailyMetric | null;
  todayIso: string;
}> {
  await connection();
  const [days, sessions, sync] = await Promise.all([
    getRecentDays(options?.days ?? 30),
    getActivities(options?.activities ?? 8),
    getLatestSync(),
  ]);
  const todayIso = nyDateISO();
  const today = [...days].reverse().find((day) => day.date === todayIso) ?? days.at(-1) ?? null;
  return { days, sessions, sync, today, todayIso };
}
