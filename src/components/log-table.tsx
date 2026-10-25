import { formatShortDate } from "@/lib/dates";
import type { DailyMetric } from "@/lib/db/schema";
import { fmt } from "@/lib/format";

function cell(value: number | null, digits = 0) {
  return fmt(value, digits);
}

export function LogTable({ days }: { days: DailyMetric[] }) {
  const rows = [...days].reverse();
  if (rows.length === 0) {
    return <p className="text-sm text-muted">The daily log is empty.</p>;
  }
  return (
    <div className="overflow-x-auto rounded-3xl border border-border">
      <table className="min-w-[980px] w-full border-collapse text-left text-sm">
        <thead className="bg-black/30 text-[10px] uppercase tracking-[0.14em] text-muted">
          <tr>
            {[
              "Date",
              "Rec",
              "HRV",
              "RHR",
              "Sleep",
              "Perf",
              "Strain",
              "WHOOP kcal",
              "Garmin kcal",
              "Active",
              "Steps",
              "Stress",
              "Battery",
              "Food",
              "Protein",
              "Carbs",
              "Fat",
              "Activities",
            ].map((heading) => (
              <th key={heading} className="sticky top-0 whitespace-nowrap px-3 py-3 font-medium">
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((day) => (
            <tr key={day.date} className="border-t border-border/80 odd:bg-white/[0.02]">
              <td className="sticky left-0 whitespace-nowrap bg-[#171910] px-3 py-2 font-medium">{formatShortDate(day.date)}</td>
              <td className="px-3 py-2 tabular-nums">{cell(day.whoopRecovery)}</td>
              <td className="px-3 py-2 tabular-nums">{cell(day.whoopHrvMs, 1)}</td>
              <td className="px-3 py-2 tabular-nums">{cell(day.whoopRhr)}</td>
              <td className="px-3 py-2 tabular-nums">{cell(day.whoopSleepHours, 2)}</td>
              <td className="px-3 py-2 tabular-nums">{cell(day.whoopSleepPerformance)}</td>
              <td className="px-3 py-2 tabular-nums">{cell(day.whoopStrain, 1)}</td>
              <td className="px-3 py-2 tabular-nums">{cell(day.whoopKcal)}</td>
              <td className="px-3 py-2 tabular-nums">{cell(day.garminTotalKcal)}</td>
              <td className="px-3 py-2 tabular-nums">{cell(day.garminActiveKcal)}</td>
              <td className="px-3 py-2 tabular-nums">{cell(day.garminSteps)}</td>
              <td className="px-3 py-2 tabular-nums">{cell(day.garminStress)}</td>
              <td className="px-3 py-2 tabular-nums">{cell(day.garminBodyBattery)}</td>
              <td className="px-3 py-2 tabular-nums">{cell(day.mfpKcal)}</td>
              <td className="px-3 py-2 tabular-nums">{cell(day.mfpProteinG)}</td>
              <td className="px-3 py-2 tabular-nums">{cell(day.mfpCarbsG)}</td>
              <td className="px-3 py-2 tabular-nums">{cell(day.mfpFatG)}</td>
              <td className="max-w-72 truncate px-3 py-2 text-xs text-muted">{day.garminActivities || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
