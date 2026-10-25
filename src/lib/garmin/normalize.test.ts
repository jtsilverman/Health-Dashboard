import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseDailyCsv } from "@/lib/csv/daily";
import { formatActivityDistanceKm, listGarminActivities, listGarminDays, normalizeGarmin, type GarminDaily, type GarminPayload } from "@/lib/garmin/normalize";

const fixture = JSON.parse(readFileSync(path.join(process.cwd(), "fixtures/garmin.json"), "utf8")) as GarminPayload & {
  days: Record<string, GarminDaily>;
};
const daily = parseDailyCsv(readFileSync(path.join(process.cwd(), "fixtures/daily.csv"), "utf8"));

describe("normalizeGarmin", () => {
  const normalized = normalizeGarmin(fixture);
  const byDate = new Map(normalized.days.map((day) => [day.date, day]));

  it("matches the merged sample for calories, steps, resting HR, and activity summaries", () => {
    for (const row of daily) {
      const day = byDate.get(row.date);
      expect(day, row.date).toBeTruthy();
      expect(day?.garminTotalKcal).toBe(row.garminTotalKcal);
      expect(day?.garminActiveKcal).toBe(row.garminActiveKcal);
      expect(day?.garminSteps).toBe(row.garminSteps);
      expect(day?.garminRhr).toBe(row.garminRhr);
      expect(day?.garminActivities ?? null).toBe(row.garminActivities ?? null);
    }
  });

  it("keeps stress, body battery, and BMR from the daily summary", () => {
    const day = byDate.get("2026-09-26");
    expect(day?.garminStress).toBe(35);
    expect(day?.garminBodyBattery).toBe(44);
    expect(day?.garminBmrKcal).toBe(2424);
    expect(byDate.get("2026-10-25")?.garminStress).toBeNull();
    expect(byDate.get("2026-10-25")?.garminBodyBattery).toBeNull();
  });

  it("accepts a single daily-summary object and a raw activities array", () => {
    const oneDay = fixture.days["2026-10-15"];
    const activities = listGarminActivities(fixture.activities);
    const parsedDays = listGarminDays(oneDay);
    expect(parsedDays).toHaveLength(1);
    expect(parsedDays[0]?.calendarDate).toBe("2026-10-15");
    const normalizedDay = normalizeGarmin({ days: oneDay, activities });
    expect(normalizedDay.days.find((day) => day.date === "2026-10-15")?.garminActivities).toBe(
      "yoga 0.0km 56min; running 7.96km 47min",
    );
    expect(normalizedDay.activities.filter((activity) => activity.date === "2026-10-15")).toHaveLength(2);
  });

  it("formats distances the way the daily log does", () => {
    expect(formatActivityDistanceKm(7960.259765625)).toBe("7.96");
    expect(formatActivityDistanceKm(7400)).toBe("7.4");
    expect(formatActivityDistanceKm(0)).toBe("0.0");
    expect(formatActivityDistanceKm(undefined)).toBe("0.0");
    expect(formatActivityDistanceKm(6440)).toBe("6.44");
  });
});
