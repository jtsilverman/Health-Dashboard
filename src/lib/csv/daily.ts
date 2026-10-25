import { splitCsvLine } from "@/lib/csv/split";
import type { MetricPatch } from "@/lib/sync/merge";

const COLUMNS: Record<string, string> = {
  date: "date",
  whoop_recovery: "whoopRecovery",
  whoop_hrv_ms: "whoopHrvMs",
  whoop_rhr: "whoopRhr",
  whoop_sleep_h: "whoopSleepHours",
  whoop_sleep_perf: "whoopSleepPerformance",
  whoop_strain: "whoopStrain",
  whoop_kcal: "whoopKcal",
  garmin_total_kcal: "garminTotalKcal",
  garmin_active_kcal: "garminActiveKcal",
  garmin_bmr_kcal: "garminBmrKcal",
  garmin_steps: "garminSteps",
  garmin_rhr: "garminRhr",
  garmin_stress: "garminStress",
  garmin_body_battery: "garminBodyBattery",
  garmin_activities: "garminActivities",
  mfp_kcal: "mfpKcal",
  mfp_protein_g: "mfpProteinG",
  mfp_carbs_g: "mfpCarbsG",
  mfp_fat_g: "mfpFatG",
};

const TEXT_FIELDS = new Set(["garminActivities"]);

export function parseDailyCsv(text: string): MetricPatch[] {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.trim().length > 0);
  if (lines.length < 2) return [];
  const header = splitCsvLine(lines[0]).map((cell) => cell.trim());
  const rows: MetricPatch[] = [];
  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const patch: MetricPatch = { date: "" };
    header.forEach((column, index) => {
      const key = COLUMNS[column];
      if (!key) return;
      const raw = (cells[index] ?? "").trim();
      if (key === "date") {
        patch.date = raw;
        return;
      }
      if (TEXT_FIELDS.has(key)) {
        patch[key] = raw || null;
        return;
      }
      patch[key] = raw === "" ? null : Number(raw);
    });
    if (patch.date) rows.push(patch);
  }
  return rows;
}
