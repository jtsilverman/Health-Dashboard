import type { SyncRun } from "@/lib/db/schema";

function when(value: Date | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(value);
}

export function SyncBanner({ sync }: { sync: SyncRun | null }) {
  if (!sync) return null;
  const problems = [
    sync.whoopOk ? null : `WHOOP: ${sync.whoopError ?? "failed"}`,
    sync.garminOk ? null : `Garmin: ${sync.garminError ?? "failed"}`,
  ].filter(Boolean);
  if (problems.length === 0) {
    return (
      <p className="text-xs text-muted">
        Last pull {when(sync.finishedAt)} ET · {sync.lookbackDays} days · {sync.daysWritten} rows · {sync.trigger}
      </p>
    );
  }
  return (
    <div className="rounded-2xl border border-[#ff6b57]/40 bg-[#ff6b57]/10 px-4 py-3 text-sm">
      <p className="font-medium text-[#ffd0c8]">Last pull saved the sources that responded. {when(sync.finishedAt)} ET.</p>
      <ul className="mt-1 space-y-1 text-[#ffd0c8]">
        {problems.map((problem) => (
          <li key={problem}>{problem}</li>
        ))}
      </ul>
    </div>
  );
}
