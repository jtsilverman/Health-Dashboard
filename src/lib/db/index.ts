import { mkdirSync } from "node:fs";
import path from "node:path";
import { neon } from "@neondatabase/serverless";
import { sql } from "drizzle-orm";
import { drizzle as drizzleNeon, type NeonHttpDatabase } from "drizzle-orm/neon-http";
import * as schema from "@/lib/db/schema";

export type AppDb = NeonHttpDatabase<typeof schema>;

const MIGRATIONS = [
  sql`CREATE TABLE IF NOT EXISTS daily_metrics (
    date text PRIMARY KEY,
    whoop_recovery double precision,
    whoop_hrv_ms double precision,
    whoop_rhr double precision,
    whoop_sleep_hours double precision,
    whoop_sleep_performance double precision,
    whoop_strain double precision,
    whoop_kcal double precision,
    garmin_total_kcal double precision,
    garmin_active_kcal double precision,
    garmin_bmr_kcal double precision,
    garmin_steps integer,
    garmin_rhr double precision,
    garmin_stress double precision,
    garmin_body_battery double precision,
    garmin_activities text,
    mfp_kcal double precision,
    mfp_protein_g double precision,
    mfp_carbs_g double precision,
    mfp_fat_g double precision,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  sql`CREATE TABLE IF NOT EXISTS activities (
    id text PRIMARY KEY,
    date text NOT NULL,
    source text NOT NULL,
    sport text NOT NULL,
    name text,
    start_time text,
    duration_sec double precision,
    distance_m double precision,
    calories double precision,
    avg_hr double precision,
    strain double precision
  )`,
  sql`CREATE INDEX IF NOT EXISTS activities_date_idx ON activities (date)`,
  sql`CREATE TABLE IF NOT EXISTS oauth_tokens (
    provider text PRIMARY KEY,
    refresh_token text,
    access_token text,
    access_expires_at timestamptz,
    updated_at timestamptz NOT NULL DEFAULT now()
  )`,
  sql`CREATE TABLE IF NOT EXISTS sync_runs (
    id text PRIMARY KEY,
    started_at timestamptz NOT NULL,
    finished_at timestamptz,
    lookback_days integer NOT NULL,
    trigger text NOT NULL,
    whoop_ok boolean NOT NULL,
    garmin_ok boolean NOT NULL,
    whoop_error text,
    garmin_error text,
    days_written integer NOT NULL DEFAULT 0
  )`,
];

const globalForDb = globalThis as typeof globalThis & { __cadenceDb?: Promise<AppDb> };

export function databaseUrl(): string {
  return process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL || "";
}

export function getDb(): Promise<AppDb> {
  if (!globalForDb.__cadenceDb) globalForDb.__cadenceDb = openDatabase();
  return globalForDb.__cadenceDb;
}

export async function closeDb(): Promise<void> {
  const pending = globalForDb.__cadenceDb;
  globalForDb.__cadenceDb = undefined;
  if (!pending) return;
  const db = (await pending) as AppDb & { $client?: { close?: () => Promise<void> } };
  await db.$client?.close?.();
}

async function openDatabase(): Promise<AppDb> {
  const url = databaseUrl();
  let db: AppDb;
  if (url) {
    db = drizzleNeon(neon(url), { schema });
  } else if (process.env.VERCEL) {
    throw new Error(
      "DATABASE_URL is not set. In the Vercel project, provision Neon or Vercel Postgres and connect it before using Cadence.",
    );
  } else {
    const { PGlite } = await import("@electric-sql/pglite");
    const { drizzle: drizzlePglite } = await import("drizzle-orm/pglite");
    const dataDir = path.join(process.cwd(), ".data", "pglite");
    mkdirSync(dataDir, { recursive: true });
    const client = new PGlite(dataDir);
    db = drizzlePglite(client, { schema }) as unknown as AppDb;
  }
  for (const statement of MIGRATIONS) {
    await db.execute(statement);
  }
  return db;
}
