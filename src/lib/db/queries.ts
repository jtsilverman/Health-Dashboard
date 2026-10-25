import { randomUUID } from "node:crypto";
import { and, desc, eq, gte, lte, sql } from "drizzle-orm";
import type { NormalizedActivity } from "@/lib/activities";
import { activities, dailyMetrics, oauthTokens, syncRuns, type ActivityRow, type DailyMetric, type OauthToken, type SyncRun } from "@/lib/db/schema";
import { getDb } from "@/lib/db/index";
import type { MfpDay } from "@/lib/mfp/parse";
import type { MetricPatch } from "@/lib/sync/merge";

function compactPatch(patch: MetricPatch): Record<string, string | number | null | Date> {
  const row: Record<string, string | number | null | Date> = { updatedAt: new Date() };
  for (const [key, value] of Object.entries(patch)) {
    if (value !== undefined) row[key] = value;
  }
  return row;
}

export async function countDays(): Promise<number> {
  const db = await getDb();
  const [row] = await db.select({ count: sql<number>`count(*)::int` }).from(dailyMetrics);
  return Number(row?.count ?? 0);
}

export async function upsertDaily(patches: MetricPatch[]): Promise<number> {
  if (patches.length === 0) return 0;
  const db = await getDb();
  for (const patch of patches) {
    if (!patch.date) continue;
    const row = compactPatch(patch);
    const rest = { ...row };
    delete rest.date;
    await db
      .insert(dailyMetrics)
      .values(row as typeof dailyMetrics.$inferInsert)
      .onConflictDoUpdate({
        target: dailyMetrics.date,
        set: rest as Partial<typeof dailyMetrics.$inferInsert>,
      });
  }
  return patches.length;
}

export async function upsertMfp(days: MfpDay[]): Promise<number> {
  return upsertDaily(
    days.map((day) => ({
      date: day.date,
      mfpKcal: day.kcal,
      mfpProteinG: day.proteinG,
      mfpCarbsG: day.carbsG,
      mfpFatG: day.fatG,
    })),
  );
}

export async function replaceActivities(
  source: "whoop" | "garmin",
  rows: NormalizedActivity[],
  start: string,
  end: string,
): Promise<void> {
  const db = await getDb();
  await db
    .delete(activities)
    .where(and(eq(activities.source, source), gte(activities.date, start), lte(activities.date, end)));
  const values = rows
    .filter((row) => row.date >= start && row.date <= end)
    .map((row) => ({
      id: row.id,
      date: row.date,
      source: row.source,
      sport: row.sport,
      name: row.name,
      startTime: row.startTime,
      durationSec: row.durationSec,
      distanceM: row.distanceM,
      calories: row.calories,
      avgHr: row.avgHr,
      strain: row.strain,
    }));
  if (values.length === 0) return;
  for (const value of values) {
    await db.insert(activities).values(value).onConflictDoUpdate({
      target: activities.id,
      set: {
        date: value.date,
        source: value.source,
        sport: value.sport,
        name: value.name,
        startTime: value.startTime,
        durationSec: value.durationSec,
        distanceM: value.distanceM,
        calories: value.calories,
        avgHr: value.avgHr,
        strain: value.strain,
      },
    });
  }
}

export async function getRecentDays(limit = 30): Promise<DailyMetric[]> {
  const db = await getDb();
  const rows = await db.select().from(dailyMetrics).orderBy(desc(dailyMetrics.date)).limit(limit);
  return rows.reverse();
}

export async function getActivities(limit = 40): Promise<ActivityRow[]> {
  const db = await getDb();
  return db.select().from(activities).orderBy(desc(activities.date), desc(activities.startTime)).limit(limit);
}

export async function getLatestSync(): Promise<SyncRun | null> {
  const db = await getDb();
  const [row] = await db.select().from(syncRuns).orderBy(desc(syncRuns.startedAt)).limit(1);
  return row ?? null;
}

export async function getToken(provider: string): Promise<OauthToken | null> {
  const db = await getDb();
  const [row] = await db.select().from(oauthTokens).where(eq(oauthTokens.provider, provider)).limit(1);
  return row ?? null;
}

export async function saveToken(
  provider: string,
  token: { refreshToken?: string | null; accessToken?: string | null; accessExpiresAt?: Date | null },
): Promise<void> {
  const db = await getDb();
  const row = {
    provider,
    refreshToken: token.refreshToken ?? null,
    accessToken: token.accessToken ?? null,
    accessExpiresAt: token.accessExpiresAt ?? null,
    updatedAt: new Date(),
  };
  await db.insert(oauthTokens).values(row).onConflictDoUpdate({
    target: oauthTokens.provider,
    set: {
      refreshToken: row.refreshToken,
      accessToken: row.accessToken,
      accessExpiresAt: row.accessExpiresAt,
      updatedAt: row.updatedAt,
    },
  });
}

export async function insertSyncRun(run: {
  lookbackDays: number;
  trigger: string;
  startedAt: Date;
  finishedAt: Date;
  whoopOk: boolean;
  garminOk: boolean;
  whoopError: string | null;
  garminError: string | null;
  daysWritten: number;
}): Promise<void> {
  const db = await getDb();
  await db.insert(syncRuns).values({ id: randomUUID(), ...run });
}
