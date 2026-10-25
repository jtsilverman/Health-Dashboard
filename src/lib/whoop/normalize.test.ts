import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { parseDailyCsv } from "@/lib/csv/daily";
import { nyDateISO } from "@/lib/dates";
import { normalizeWhoop, type WhoopPayload, type WhoopSleep } from "@/lib/whoop/normalize";

const fixture = JSON.parse(readFileSync(path.join(process.cwd(), "fixtures/whoop.json"), "utf8")) as WhoopPayload;
const daily = parseDailyCsv(readFileSync(path.join(process.cwd(), "fixtures/daily.csv"), "utf8"));

function close(actual: unknown, expected: number | null, tolerance: number) {
  if (expected == null) {
    expect(actual == null).toBe(true);
    return;
  }
  expect(typeof actual).toBe("number");
  expect(Math.abs((actual as number) - expected)).toBeLessThanOrEqual(tolerance);
}

describe("normalizeWhoop", () => {
  const normalized = normalizeWhoop(fixture, { now: new Date("2026-10-25T16:00:00.000Z") });
  const byDate = new Map(normalized.days.map((day) => [day.date, day]));

  it("matches the merged sample for recovery, HRV, sleep, and strain", () => {
    expect(daily.length).toBe(30);
    for (const row of daily) {
      const day = byDate.get(row.date);
      expect(day, row.date).toBeTruthy();
      close(day?.whoopRecovery, row.whoopRecovery as number | null, 0.05);
      close(day?.whoopHrvMs, row.whoopHrvMs as number | null, 0.051);
      close(day?.whoopRhr, row.whoopRhr as number | null, 0.05);
      close(day?.whoopSleepHours, row.whoopSleepHours as number | null, 0.011);
      close(day?.whoopSleepPerformance, row.whoopSleepPerformance as number | null, 0.05);
      close(day?.whoopStrain, row.whoopStrain as number | null, 0.051);
      close(day?.whoopKcal, row.whoopKcal as number | null, 0);
    }
  });

  it("attributes an open cycle to the New York wake-up morning", () => {
    const today = byDate.get("2026-10-25");
    expect(today?.whoopRecovery).toBe(32);
    expect(today?.whoopStrain).toBe(4.1);
    expect(today?.whoopSleepHours).toBe(8.09);
  });

  it("keeps strain on a day whose only sleep was a nap", () => {
    const day = byDate.get("2026-10-17");
    expect(day?.whoopStrain).toBe(5.5);
    expect(day?.whoopKcal).toBe(2345);
    expect(day?.whoopRecovery).toBeNull();
    expect(day?.whoopSleepHours).toBeUndefined();
  });

  it("ignores naps when summing sleep", () => {
    const day = byDate.get("2026-09-27");
    expect(day?.whoopSleepHours).toBe(3.17);
    expect(day?.whoopSleepPerformance).toBe(17);
  });

  it("uses the New York date, not the UTC date, when a sleep ends after midnight UTC", () => {
    const sleep: WhoopSleep = {
      id: "sleep-dst",
      cycle_id: 1,
      start: "2026-07-14T02:00:00.000Z",
      end: "2026-07-15T03:30:00.000Z",
      nap: false,
      score_state: "SCORED",
      score: {
        sleep_performance_percentage: 80,
        stage_summary: {
          total_light_sleep_time_milli: 3_600_000,
          total_slow_wave_sleep_time_milli: 3_600_000,
          total_rem_sleep_time_milli: 3_600_000,
        },
      },
    };
    expect(nyDateISO(sleep.end!)).toBe("2026-07-14");
    const { days } = normalizeWhoop({
      cycles: [
        {
          id: 1,
          start: "2026-07-14T02:00:00.000Z",
          end: "2026-07-15T06:00:00.000Z",
          score_state: "SCORED",
          score: { strain: 10.04, kilojoule: 4184 },
        },
      ],
      recovery: [
        {
          cycle_id: 1,
          sleep_id: "sleep-dst",
          score_state: "SCORED",
          score: { recovery_score: 70, resting_heart_rate: 48, hrv_rmssd_milli: 62.04 },
        },
      ],
      sleep: [sleep],
    });
    expect(days).toHaveLength(1);
    expect(days[0]?.date).toBe("2026-07-14");
    expect(days[0]?.whoopKcal).toBe(1000);
    expect(days[0]?.whoopSleepHours).toBe(3);
  });
});
