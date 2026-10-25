import { Suspense } from "react";
import { Card } from "@/components/ui/card";
import { UploadForm } from "@/components/upload-form";
import { formatShortDate } from "@/lib/dates";
import { fmt } from "@/lib/format";
import { loadDashboard } from "@/lib/load";

export const metadata = { title: "Fuel" };

async function Fuel() {
  const { days } = await loadDashboard({ days: 30, activities: 1 });
  const logged = [...days].reverse().filter((day) => day.mfpKcal != null);
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-5xl tracking-wide">Fuel</h1>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted">
          MyFitnessPal has no API. Export the Nutrition Summary (Date, Meal, Calories, Fat, Carbohydrates, Protein) and upload it here.
          Rows are summed per date and written onto that day. An automation can POST the same CSV to <code>/api/nutrition</code> with{" "}
          <code>Authorization: Bearer</code> the dashboard password.
        </p>
      </div>
      <Card className="px-5 py-5">
        <UploadForm />
      </Card>
      <div>
        <h2 className="font-display text-3xl tracking-wide">Logged days</h2>
        {logged.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No nutrition rows yet. The sample log leaves these columns empty on purpose.</p>
        ) : (
          <ul className="mt-3 space-y-2">
            {logged.map((day) => (
              <li key={day.date} className="flex items-center justify-between rounded-2xl border border-border px-3 py-3 text-sm">
                <span>{formatShortDate(day.date)}</span>
                <span className="tabular-nums text-muted">
                  {fmt(day.mfpKcal)} kcal · {fmt(day.mfpProteinG)} p · {fmt(day.mfpCarbsG)} c · {fmt(day.mfpFatG)} f
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

export default function Page() {
  return (
    <Suspense fallback={<div className="h-64 animate-pulse rounded-3xl bg-card" />}>
      <Fuel />
    </Suspense>
  );
}
