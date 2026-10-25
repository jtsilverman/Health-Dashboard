import { readFileSync } from "node:fs";
import path from "node:path";
import { parseDailyCsv } from "../src/lib/csv/daily";
import { closeDb } from "../src/lib/db/index";
import { replaceActivities, upsertDaily } from "../src/lib/db/queries";
import { garminDaysToPatches, normalizeGarmin, type GarminPayload } from "../src/lib/garmin/normalize";
import { mergeDailyPatches } from "../src/lib/sync/merge";
import { normalizeWhoop, type WhoopPayload } from "../src/lib/whoop/normalize";

const csvPath = path.resolve(process.argv[2] ?? "fixtures/daily.csv");
const fixtureDir = path.dirname(csvPath);

function readJson<T>(filename: string): T | null {
  try {
    return JSON.parse(readFileSync(path.join(fixtureDir, filename), "utf8")) as T;
  } catch {
    return null;
  }
}

async function main() {
  const csv = readFileSync(csvPath, "utf8");
  const dailyRows = parseDailyCsv(csv);
  if (dailyRows.length === 0) {
    throw new Error(`No rows found in ${csvPath}`);
  }

  const groups = [dailyRows];
  const garmin = readJson<GarminPayload>("garmin.json");
  const whoop = readJson<WhoopPayload>("whoop.json");
  let garminActivities: ReturnType<typeof normalizeGarmin>["activities"] = [];
  let whoopActivities: ReturnType<typeof normalizeWhoop>["activities"] = [];

  if (garmin) {
    const normalized = normalizeGarmin(garmin);
    garminActivities = normalized.activities;
    groups.push(garminDaysToPatches(normalized.days));
  }
  if (whoop) {
    whoopActivities = normalizeWhoop(whoop).activities;
  }

  const patches = mergeDailyPatches(groups);
  const written = await upsertDaily(patches);
  const dates = patches.map((patch) => patch.date).sort();
  const start = dates[0];
  const end = dates[dates.length - 1];
  if (start && end) {
    if (garmin) await replaceActivities("garmin", garminActivities, start, end);
    if (whoop) await replaceActivities("whoop", whoopActivities, start, end);
  }

  console.log(
    `Seeded ${written} days from ${path.relative(process.cwd(), csvPath)}` +
      `${garmin ? `, ${garminActivities.length} Garmin activities` : ""}` +
      `${whoop ? `, ${whoopActivities.length} WHOOP workouts` : ""}.`,
  );
  await closeDb();
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
