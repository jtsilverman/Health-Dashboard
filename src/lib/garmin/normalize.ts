import type { NormalizedActivity } from "@/lib/activities";
import type { MetricPatch } from "@/lib/sync/merge";

export type GarminDaily = {
  calendarDate?: string | null;
  totalKilocalories?: number | null;
  activeKilocalories?: number | null;
  bmrKilocalories?: number | null;
  totalSteps?: number | null;
  restingHeartRate?: number | null;
  averageStressLevel?: number | null;
  bodyBatteryMostRecentValue?: number | null;
};

export type GarminActivity = {
  activityId?: number | null;
  activityName?: string | null;
  startTimeLocal?: string | null;
  activityType?: { typeKey?: string | null } | string | null;
  distance?: number | null;
  duration?: number | null;
  calories?: number | null;
  averageHR?: number | null;
};

export type GarminPayload = {
  days?: Record<string, GarminDaily> | GarminDaily[] | GarminDaily;
  activities?: unknown;
};

export type GarminDay = {
  date: string;
  garminTotalKcal?: number | null;
  garminActiveKcal?: number | null;
  garminBmrKcal?: number | null;
  garminSteps?: number | null;
  garminRhr?: number | null;
  garminStress?: number | null;
  garminBodyBattery?: number | null;
  garminActivities?: string | null;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function isDailySummary(value: unknown): value is GarminDaily {
  return isRecord(value) && ("totalKilocalories" in value || "calendarDate" in value || "totalSteps" in value);
}

export function listGarminDays(days: GarminPayload["days"]): Array<GarminDaily & { calendarDate: string }> {
  if (!days) return [];
  if (Array.isArray(days)) {
    return days.flatMap((day) => {
      if (!isDailySummary(day) || !day.calendarDate) return [];
      return [{ ...day, calendarDate: day.calendarDate }];
    });
  }
  if (isDailySummary(days)) {
    if (!days.calendarDate) return [];
    return [{ ...days, calendarDate: days.calendarDate }];
  }
  return Object.entries(days).flatMap(([date, day]) => {
    if (!isDailySummary(day)) return [];
    return [{ ...day, calendarDate: day.calendarDate || date }];
  });
}

export function listGarminActivities(input: unknown): GarminActivity[] {
  if (Array.isArray(input)) return input as GarminActivity[];
  if (isRecord(input) && Array.isArray(input.activities)) return input.activities as GarminActivity[];
  return [];
}

export function activityTypeKey(activity: GarminActivity): string {
  if (typeof activity.activityType === "string" && activity.activityType) return activity.activityType;
  if (isRecord(activity.activityType) && typeof activity.activityType.typeKey === "string") {
    return activity.activityType.typeKey || "activity";
  }
  return "activity";
}

/** Up to two decimals, trailing zeros removed, but always at least one decimal (7.4, 0.0, 6.44). */
export function formatActivityDistanceKm(meters: number | null | undefined): string {
  const kilometers = (meters ?? 0) / 1000;
  let text = kilometers.toFixed(2);
  if (text.endsWith("0")) text = text.slice(0, -1);
  if (text.endsWith("0")) text = text.slice(0, -1);
  if (text.endsWith(".")) text += "0";
  return text;
}

export function formatGarminActivitySummary(activities: GarminActivity[]): string {
  return [...activities]
    .filter((activity) => activity.startTimeLocal)
    .sort((left, right) => (left.startTimeLocal! < right.startTimeLocal! ? 1 : -1))
    .map((activity) => {
      const minutes = Math.round((activity.duration ?? 0) / 60);
      return `${activityTypeKey(activity)} ${formatActivityDistanceKm(activity.distance)}km ${minutes}min`;
    })
    .join("; ");
}

function numberOrNull(value: number | null | undefined): number | null {
  if (value == null || Number.isNaN(value)) return null;
  return value;
}

/** Garmin uses -1 when stress or body battery has not been measured yet. */
function measured(value: number | null | undefined): number | null {
  const number = numberOrNull(value);
  if (number == null || number < 0) return null;
  return number;
}

export function normalizeGarmin(payload: GarminPayload): { days: GarminDay[]; activities: NormalizedActivity[] } {
  const activities = listGarminActivities(payload.activities ?? payload);
  const grouped = new Map<string, GarminActivity[]>();
  for (const activity of activities) {
    const date = activity.startTimeLocal?.slice(0, 10);
    if (!date) continue;
    const list = grouped.get(date) ?? [];
    list.push(activity);
    grouped.set(date, list);
  }

  const days = new Map<string, GarminDay>();
  for (const day of listGarminDays(payload.days)) {
    const summary = formatGarminActivitySummary(grouped.get(day.calendarDate) ?? []);
    days.set(day.calendarDate, {
      date: day.calendarDate,
      garminTotalKcal: numberOrNull(day.totalKilocalories),
      garminActiveKcal: numberOrNull(day.activeKilocalories),
      garminBmrKcal: numberOrNull(day.bmrKilocalories),
      garminSteps: day.totalSteps == null ? null : Math.round(day.totalSteps),
      garminRhr: numberOrNull(day.restingHeartRate),
      garminStress: measured(day.averageStressLevel),
      garminBodyBattery: measured(day.bodyBatteryMostRecentValue),
      garminActivities: summary || null,
    });
  }

  for (const [date, list] of grouped) {
    if (days.has(date)) continue;
    const summary = formatGarminActivitySummary(list);
    if (!summary) continue;
    days.set(date, { date, garminActivities: summary });
  }

  const normalizedActivities: NormalizedActivity[] = [];
  for (const activity of activities) {
    const date = activity.startTimeLocal?.slice(0, 10);
    if (!date || activity.activityId == null) continue;
    normalizedActivities.push({
      id: `garmin:${activity.activityId}`,
      date,
      source: "garmin",
      sport: activityTypeKey(activity),
      name: activity.activityName ?? null,
      startTime: activity.startTimeLocal ?? null,
      durationSec: activity.duration ?? null,
      distanceM: activity.distance ?? null,
      calories: activity.calories ?? null,
      avgHr: activity.averageHR ?? null,
      strain: null,
    });
  }

  return {
    days: [...days.values()].sort((left, right) => left.date.localeCompare(right.date)),
    activities: normalizedActivities,
  };
}

export function garminDaysToPatches(days: GarminDay[]): MetricPatch[] {
  return days.map((day) => ({ ...day }));
}
