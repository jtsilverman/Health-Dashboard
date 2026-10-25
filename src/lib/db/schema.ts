import { boolean, doublePrecision, index, integer, pgTable, text, timestamp } from "drizzle-orm/pg-core";

export const dailyMetrics = pgTable("daily_metrics", {
  date: text("date").primaryKey(),
  whoopRecovery: doublePrecision("whoop_recovery"),
  whoopHrvMs: doublePrecision("whoop_hrv_ms"),
  whoopRhr: doublePrecision("whoop_rhr"),
  whoopSleepHours: doublePrecision("whoop_sleep_hours"),
  whoopSleepPerformance: doublePrecision("whoop_sleep_performance"),
  whoopStrain: doublePrecision("whoop_strain"),
  whoopKcal: doublePrecision("whoop_kcal"),
  garminTotalKcal: doublePrecision("garmin_total_kcal"),
  garminActiveKcal: doublePrecision("garmin_active_kcal"),
  garminBmrKcal: doublePrecision("garmin_bmr_kcal"),
  garminSteps: integer("garmin_steps"),
  garminRhr: doublePrecision("garmin_rhr"),
  garminStress: doublePrecision("garmin_stress"),
  garminBodyBattery: doublePrecision("garmin_body_battery"),
  garminActivities: text("garmin_activities"),
  mfpKcal: doublePrecision("mfp_kcal"),
  mfpProteinG: doublePrecision("mfp_protein_g"),
  mfpCarbsG: doublePrecision("mfp_carbs_g"),
  mfpFatG: doublePrecision("mfp_fat_g"),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const activities = pgTable(
  "activities",
  {
    id: text("id").primaryKey(),
    date: text("date").notNull(),
    source: text("source").notNull(),
    sport: text("sport").notNull(),
    name: text("name"),
    startTime: text("start_time"),
    durationSec: doublePrecision("duration_sec"),
    distanceM: doublePrecision("distance_m"),
    calories: doublePrecision("calories"),
    avgHr: doublePrecision("avg_hr"),
    strain: doublePrecision("strain"),
  },
  (table) => [index("activities_date_idx").on(table.date)],
);

export const oauthTokens = pgTable("oauth_tokens", {
  provider: text("provider").primaryKey(),
  refreshToken: text("refresh_token"),
  accessToken: text("access_token"),
  accessExpiresAt: timestamp("access_expires_at", { withTimezone: true }),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

export const syncRuns = pgTable("sync_runs", {
  id: text("id").primaryKey(),
  startedAt: timestamp("started_at", { withTimezone: true }).notNull(),
  finishedAt: timestamp("finished_at", { withTimezone: true }),
  lookbackDays: integer("lookback_days").notNull(),
  trigger: text("trigger").notNull(),
  whoopOk: boolean("whoop_ok").notNull(),
  garminOk: boolean("garmin_ok").notNull(),
  whoopError: text("whoop_error"),
  garminError: text("garmin_error"),
  daysWritten: integer("days_written").notNull().default(0),
});

export type DailyMetric = typeof dailyMetrics.$inferSelect;
export type ActivityRow = typeof activities.$inferSelect;
export type SyncRun = typeof syncRuns.$inferSelect;
export type OauthToken = typeof oauthTokens.$inferSelect;
