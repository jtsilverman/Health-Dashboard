import { RefreshButton } from "@/components/refresh-button";
import { Card } from "@/components/ui/card";
import { formatLongDate } from "@/lib/dates";
import { fmt, recoveryBand, recoveryLabel } from "@/lib/format";
import type { DailyMetric } from "@/lib/db/schema";
import { TARGETS } from "@/lib/targets";
import { cn } from "@/lib/utils";

function ringColor(score: number | null) {
  const band = recoveryBand(score);
  if (band === "ready") return "var(--ok)";
  if (band === "moderate") return "var(--warn)";
  if (band === "rest") return "var(--danger)";
  return "var(--border)";
}

function RecoveryRing({ score }: { score: number | null }) {
  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const percent = score == null ? 0 : Math.max(0, Math.min(100, score));
  const offset = circumference - (percent / 100) * circumference;
  return (
    <div className="relative h-36 w-36 shrink-0" aria-label={score == null ? "No recovery score" : `Recovery ${Math.round(score)} percent`}>
      <svg viewBox="0 0 140 140" className="h-full w-full -rotate-90">
        <circle cx="70" cy="70" r={radius} fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
        <circle
          cx="70"
          cy="70"
          r={radius}
          fill="none"
          stroke={ringColor(score)}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="font-display text-5xl leading-none tabular-nums">{score == null ? "—" : Math.round(score)}</span>
        <span className="mt-1 text-[10px] uppercase tracking-[0.18em] text-muted">Recovery</span>
      </div>
    </div>
  );
}

function Tile({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="rounded-2xl border border-border/80 bg-black/25 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-muted">{label}</p>
      <p className="mt-1 font-display text-[1.85rem] leading-none tabular-nums">{value}</p>
      {detail ? <p className="mt-1 truncate text-xs text-muted">{detail}</p> : <p className="mt-1 text-xs text-transparent">.</p>}
    </div>
  );
}

function FuelBar({
  label,
  value,
  target,
  unit,
  digits = 0,
}: {
  label: string;
  value: number | null;
  target: number;
  unit: string;
  digits?: number;
}) {
  const width = value == null ? 0 : Math.max(0, Math.min(100, (value / target) * 100));
  const over = value != null && value > target;
  return (
    <div>
      <div className="mb-1.5 flex items-baseline justify-between gap-3 text-sm">
        <span>{label}</span>
        <span className="tabular-nums text-muted">
          {value == null ? "Not logged" : `${fmt(value, digits)} / ${fmt(target)} ${unit}`}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
        <div className={cn("h-full rounded-full", over ? "bg-warn" : "bg-accent")} style={{ width: `${width}%` }} />
      </div>
    </div>
  );
}

export function TodayCard({ day, isToday }: { day: DailyMetric | null; isToday: boolean }) {
  if (!day) {
    return (
      <Card className="px-5 py-8">
        <p className="font-display text-4xl tracking-wide">No days on file</p>
        <p className="mt-3 max-w-xl text-sm leading-6 text-muted">
          The first refresh backfills 30 days from WHOOP and Garmin. Until those keys are set, load the sample log with{" "}
          <code className="text-foreground">npm run seed</code>.
        </p>
        <div className="mt-5">
          <RefreshButton days={30} label="Backfill 30 days" />
        </div>
      </Card>
    );
  }

  const sleepDetail = [
    day.whoopSleepPerformance != null ? `${fmt(day.whoopSleepPerformance, 0)}% performance` : null,
    day.whoopSleepHours != null ? `${fmt(day.whoopSleepHours, 2)} h asleep` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const burnDetail = [
    day.garminActiveKcal != null ? `${fmt(day.garminActiveKcal)} active` : null,
    day.whoopKcal != null ? `WHOOP ${fmt(day.whoopKcal)}` : null,
  ]
    .filter(Boolean)
    .join(" · ");

  const intakeGap =
    day.mfpKcal != null && day.garminTotalKcal != null ? Math.round(day.garminTotalKcal - day.mfpKcal) : null;

  return (
    <Card className="overflow-hidden">
      <div className="flex flex-col gap-6 px-4 py-5 sm:px-6 sm:py-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-[11px] uppercase tracking-[0.18em] text-accent">{isToday ? "Today" : "Latest day on file"}</p>
            <h1 className="mt-1 font-display text-4xl tracking-wide sm:text-5xl">{formatLongDate(day.date)}</h1>
          </div>
          <p className={cn("text-sm", recoveryBand(day.whoopRecovery) === "rest" ? "text-danger" : "text-muted")}>
            {recoveryLabel(day.whoopRecovery)}
          </p>
        </div>

        <div className="flex flex-col gap-5 sm:flex-row sm:items-center">
          <RecoveryRing score={day.whoopRecovery} />
          <div className="grid flex-1 grid-cols-2 gap-2 sm:grid-cols-4">
            <Tile label="HRV" value={day.whoopHrvMs == null ? "—" : fmt(day.whoopHrvMs, 1)} detail="ms rMSSD" />
            <Tile
              label="Sleep"
              value={day.whoopSleepHours == null ? "—" : `${fmt(day.whoopSleepHours, 1)}h`}
              detail={sleepDetail || "WHOOP"}
            />
            <Tile label="Strain" value={day.whoopStrain == null ? "—" : fmt(day.whoopStrain, 1)} detail="WHOOP day strain" />
            <Tile label="Steps" value={fmt(day.garminSteps)} detail="Garmin" />
            <Tile label="Burn" value={day.garminTotalKcal == null ? "—" : fmt(day.garminTotalKcal)} detail={burnDetail || "Garmin kcal"} />
            <Tile
              label="Resting HR"
              value={day.whoopRhr == null ? "—" : fmt(day.whoopRhr, 0)}
              detail={day.garminRhr != null ? `Garmin ${fmt(day.garminRhr, 0)}` : "WHOOP"}
            />
            <Tile label="Stress" value={day.garminStress == null ? "—" : fmt(day.garminStress, 0)} detail="Garmin average" />
            <Tile
              label="Body battery"
              value={day.garminBodyBattery == null ? "—" : fmt(day.garminBodyBattery, 0)}
              detail="Most recent"
            />
          </div>
        </div>

        <div className="grid gap-4 border-t border-border pt-5">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-2xl tracking-wide">Fuel</h2>
            <p className="text-xs text-muted">
              {intakeGap == null
                ? "Targets 2,850 kcal · 200 g protein · 321 g carbs · 85 g fat"
                : intakeGap >= 0
                  ? `${fmt(intakeGap)} kcal under Garmin burn`
                  : `${fmt(Math.abs(intakeGap))} kcal over Garmin burn`}
            </p>
          </div>
          <FuelBar label="Calories" value={day.mfpKcal} target={TARGETS.kcal} unit="kcal" />
          <FuelBar label="Protein" value={day.mfpProteinG} target={TARGETS.proteinG} unit="g" />
          <FuelBar label="Carbs" value={day.mfpCarbsG} target={TARGETS.carbsG} unit="g" />
          <FuelBar label="Fat" value={day.mfpFatG} target={TARGETS.fatG} unit="g" />
          {day.mfpKcal == null ? (
            <p className="text-sm text-muted">
              No MyFitnessPal day yet. Export the Nutrition Summary and drop it on Fuel.
            </p>
          ) : null}
        </div>
      </div>
    </Card>
  );
}
