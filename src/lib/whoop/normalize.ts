import { nyDateISO } from "@/lib/dates";
import { roundTo } from "@/lib/format";
import type { MetricPatch } from "@/lib/sync/merge";
import type { NormalizedActivity } from "@/lib/activities";

/** WHOOP reports energy in kilojoules. 1 kcal = 4.184 kJ. */
export const KJ_PER_KCAL = 4.184;

export type WhoopCycle = {
  id: number;
  start: string;
  end: string | null;
  score_state?: string;
  score?: {
    strain?: number | null;
    kilojoule?: number | null;
  } | null;
};

export type WhoopRecovery = {
  cycle_id: number;
  sleep_id?: string | null;
  score_state?: string;
  score?: {
    recovery_score?: number | null;
    resting_heart_rate?: number | null;
    hrv_rmssd_milli?: number | null;
  } | null;
};

export type WhoopSleep = {
  id: string;
  cycle_id: number;
  start: string;
  end: string | null;
  nap?: boolean;
  score_state?: string;
  score?: {
    sleep_performance_percentage?: number | null;
    stage_summary?: {
      total_light_sleep_time_milli?: number | null;
      total_slow_wave_sleep_time_milli?: number | null;
      total_rem_sleep_time_milli?: number | null;
    } | null;
  } | null;
};

export type WhoopWorkout = {
  id: string;
  start: string;
  end?: string | null;
  sport_name?: string | null;
  score_state?: string;
  score?: {
    strain?: number | null;
    kilojoule?: number | null;
    average_heart_rate?: number | null;
    distance_meter?: number | null;
  } | null;
};

export type WhoopPayload = {
  cycles?: WhoopCycle[];
  recovery?: WhoopRecovery[];
  sleep?: WhoopSleep[];
  workouts?: WhoopWorkout[];
};

type WhoopDay = {
  date: string;
  whoopRecovery?: number | null;
  whoopHrvMs?: number | null;
  whoopRhr?: number | null;
  whoopSleepHours?: number | null;
  whoopSleepPerformance?: number | null;
  whoopStrain?: number | null;
  whoopKcal?: number | null;
};

function hasScore(row: { score?: unknown; score_state?: string }): boolean {
  return Boolean(row.score) && row.score_state !== "UNSCORABLE";
}

export function kcalFromKilojoules(kilojoule: number | null | undefined): number | null {
  if (kilojoule == null || Number.isNaN(kilojoule)) return null;
  return Math.round(kilojoule / KJ_PER_KCAL);
}

export function asleepHours(sleep: WhoopSleep): number | null {
  const stage = sleep.score?.stage_summary;
  if (!stage) return null;
  const millis =
    (stage.total_light_sleep_time_milli ?? 0) +
    (stage.total_slow_wave_sleep_time_milli ?? 0) +
    (stage.total_rem_sleep_time_milli ?? 0);
  if (millis <= 0) return null;
  return roundTo(millis / 3_600_000, 2);
}

/**
 * Recovery and strain belong to the morning he wakes up.
 * That is the New York date the cycle's main (non-nap) sleep ended.
 * A cycle with no main sleep, such as a day that only has a nap, uses the cycle end.
 * Sleep itself is attributed to the date it ended, which is the same morning.
 */
export function normalizeWhoop(
  payload: WhoopPayload,
  options?: { now?: Date },
): { days: WhoopDay[]; activities: NormalizedActivity[] } {
  const now = options?.now ?? new Date();
  const sleeps = payload.sleep ?? [];
  const cycles = [...(payload.cycles ?? [])].sort((left, right) => left.start.localeCompare(right.start));
  const recoveries = payload.recovery ?? [];
  const sleepsById = new Map(sleeps.map((sleep) => [sleep.id, sleep]));
  const recoveryByCycle = new Map(recoveries.map((recovery) => [recovery.cycle_id, recovery]));
  const days = new Map<string, WhoopDay>();

  const ensure = (date: string) => {
    const existing = days.get(date);
    if (existing) return existing;
    const created: WhoopDay = { date };
    days.set(date, created);
    return created;
  };

  const wakeDate = (cycle: WhoopCycle): string => {
    const recovery = recoveryByCycle.get(cycle.id);
    const linked = recovery?.sleep_id ? sleepsById.get(recovery.sleep_id) : undefined;
    if (linked && !linked.nap && linked.end) return nyDateISO(linked.end);
    const mains = sleeps
      .filter((sleep) => sleep.cycle_id === cycle.id && !sleep.nap && sleep.end)
      .sort((left, right) => (left.end! < right.end! ? 1 : -1));
    if (mains[0]?.end) return nyDateISO(mains[0].end);
    if (cycle.end) return nyDateISO(cycle.end);
    return nyDateISO(now);
  };

  for (const cycle of cycles) {
    if (!hasScore(cycle)) continue;
    const date = wakeDate(cycle);
    const row = ensure(date);
    row.whoopStrain = cycle.score?.strain == null ? null : roundTo(cycle.score.strain, 1);
    row.whoopKcal = kcalFromKilojoules(cycle.score?.kilojoule);
    const recovery = recoveryByCycle.get(cycle.id);
    if (!recovery || !hasScore(recovery) || !recovery.score) {
      row.whoopRecovery = null;
      row.whoopHrvMs = null;
      row.whoopRhr = null;
    } else {
      row.whoopRecovery = recovery.score.recovery_score ?? null;
      row.whoopHrvMs =
        recovery.score.hrv_rmssd_milli == null ? null : roundTo(recovery.score.hrv_rmssd_milli, 1);
      row.whoopRhr = recovery.score.resting_heart_rate ?? null;
    }
  }

  const sleepByDate = new Map<string, WhoopSleep[]>();
  for (const sleep of sleeps) {
    if (sleep.nap || !sleep.end || !hasScore(sleep)) continue;
    const date = nyDateISO(sleep.end);
    const list = sleepByDate.get(date) ?? [];
    list.push(sleep);
    sleepByDate.set(date, list);
  }

  for (const [date, list] of sleepByDate) {
    const ranked = [...list].sort((left, right) => (asleepHours(right) ?? 0) - (asleepHours(left) ?? 0));
    const hours = ranked.reduce((sum, sleep) => sum + (asleepHours(sleep) ?? 0), 0);
    const row = ensure(date);
    row.whoopSleepHours = hours > 0 ? roundTo(hours, 2) : null;
    row.whoopSleepPerformance = ranked[0]?.score?.sleep_performance_percentage ?? null;
  }

  const activities: NormalizedActivity[] = [];
  for (const workout of payload.workouts ?? []) {
    if (!workout.start) continue;
    const end = workout.end ? new Date(workout.end) : null;
    const start = new Date(workout.start);
    const durationSec = end ? Math.max(0, (end.getTime() - start.getTime()) / 1000) : null;
    activities.push({
      id: `whoop:${workout.id}`,
      date: nyDateISO(workout.start),
      source: "whoop",
      sport: workout.sport_name || "workout",
      name: workout.sport_name ? workout.sport_name.replace(/[_-]+/g, " ") : null,
      startTime: workout.start,
      durationSec,
      distanceM: workout.score?.distance_meter ?? null,
      calories: kcalFromKilojoules(workout.score?.kilojoule),
      avgHr: workout.score?.average_heart_rate ?? null,
      strain: workout.score?.strain == null ? null : roundTo(workout.score.strain, 1),
    });
  }

  return {
    days: [...days.values()].sort((left, right) => left.date.localeCompare(right.date)),
    activities,
  };
}

export function whoopDaysToPatches(days: WhoopDay[]): MetricPatch[] {
  return days.map((day) => ({ ...day }));
}
