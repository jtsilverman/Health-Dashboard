import type { NormalizedActivity } from "@/lib/activities";
import { addDays, nyDateISO } from "@/lib/dates";
import { countDays, insertSyncRun, replaceActivities, upsertDaily } from "@/lib/db/queries";
import { fetchGarmin } from "@/lib/garmin/client";
import { garminDaysToPatches, normalizeGarmin } from "@/lib/garmin/normalize";
import { patchesForSources, type MetricPatch } from "@/lib/sync/merge";
import { defaultLookbackFromEnv, resolveLookback } from "@/lib/sync/plan";
import { fetchWhoop } from "@/lib/whoop/client";
import { normalizeWhoop, whoopDaysToPatches } from "@/lib/whoop/normalize";

export type SyncResult = {
  lookbackDays: number;
  start: string;
  end: string;
  daysWritten: number;
  whoop: { ok: boolean; error: string | null; days: number };
  garmin: { ok: boolean; error: string | null; days: number };
};

function errorMessage(error: unknown): string {
  if (error instanceof Error && error.message) return error.message.slice(0, 400);
  return "Unknown sync error";
}

function inWindow(patches: MetricPatch[], start: string, end: string): MetricPatch[] {
  return patches.filter((patch) => patch.date >= start && patch.date <= end);
}

export async function runSync(options: { trigger: "cron" | "manual"; days?: number }): Promise<SyncResult> {
  const storedDays = await countDays();
  const lookbackDays = resolveLookback({
    requested: options.days,
    storedDays,
    defaultLookback: defaultLookbackFromEnv(),
  });
  const end = nyDateISO();
  const start = addDays(end, -(lookbackDays - 1));
  const startedAt = new Date();

  let whoopError: string | null = null;
  let garminError: string | null = null;
  let whoopPatches: MetricPatch[] = [];
  let garminPatches: MetricPatch[] = [];
  let whoopActivities: NormalizedActivity[] = [];
  let garminActivities: NormalizedActivity[] = [];

  try {
    const raw = await fetchWhoop(start, end);
    const normalized = normalizeWhoop(raw);
    whoopPatches = inWindow(whoopDaysToPatches(normalized.days), start, end);
    whoopActivities = normalized.activities;
  } catch (error) {
    whoopError = errorMessage(error);
  }

  try {
    const raw = await fetchGarmin(start, end);
    const normalized = normalizeGarmin(raw);
    garminPatches = inWindow(garminDaysToPatches(normalized.days), start, end);
    garminActivities = normalized.activities;
  } catch (error) {
    garminError = errorMessage(error);
  }

  const daysWritten = await upsertDaily(
    patchesForSources({
      whoopOk: whoopError == null,
      garminOk: garminError == null,
      whoop: whoopPatches,
      garmin: garminPatches,
    }),
  );

  if (whoopError == null) await replaceActivities("whoop", whoopActivities, start, end);
  if (garminError == null) await replaceActivities("garmin", garminActivities, start, end);

  await insertSyncRun({
    lookbackDays,
    trigger: options.trigger,
    startedAt,
    finishedAt: new Date(),
    whoopOk: whoopError == null,
    garminOk: garminError == null,
    whoopError,
    garminError,
    daysWritten,
  });

  return {
    lookbackDays,
    start,
    end,
    daysWritten,
    whoop: { ok: whoopError == null, error: whoopError, days: whoopError ? 0 : whoopPatches.length },
    garmin: { ok: garminError == null, error: garminError, days: garminError ? 0 : garminPatches.length },
  };
}
