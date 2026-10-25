import Link from "next/link";
import { formatShortDate } from "@/lib/dates";
import type { ActivityRow } from "@/lib/db/schema";
import { formatClock, formatDuration, formatSport, fmt } from "@/lib/format";

export function SessionList({
  sessions,
  heading = "Sessions",
  showAllLink = false,
}: {
  sessions: ActivityRow[];
  heading?: string;
  showAllLink?: boolean;
}) {
  const groups = new Map<string, ActivityRow[]>();
  for (const session of sessions) {
    const list = groups.get(session.date) ?? [];
    list.push(session);
    groups.set(session.date, list);
  }

  return (
    <section className="space-y-3">
      <div className="flex items-baseline justify-between">
        <h2 className="font-display text-3xl tracking-wide">{heading}</h2>
        {showAllLink ? (
          <Link href="/sessions" className="text-xs uppercase tracking-[0.16em] text-accent">
            All sessions
          </Link>
        ) : null}
      </div>
      {sessions.length === 0 ? (
        <p className="rounded-3xl border border-dashed border-border px-4 py-8 text-sm text-muted">
          No workouts stored yet. A refresh pulls Garmin activities and WHOOP workouts. The sample seed includes both.
        </p>
      ) : (
        <div className="space-y-5">
          {[...groups.entries()].map(([date, rows]) => (
            <div key={date}>
              <p className="mb-2 text-[11px] uppercase tracking-[0.16em] text-muted">{formatShortDate(date)}</p>
              <ul className="space-y-2">
                {rows.map((session) => (
                  <li key={session.id} className="flex items-center justify-between gap-3 rounded-2xl border border-border bg-card px-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{session.name ? formatSport(session.name) : formatSport(session.sport)}</p>
                      <p className="text-xs text-muted">
                        {session.source === "garmin" ? "Garmin" : "WHOOP"}
                        {formatClock(session.startTime) ? ` · ${formatClock(session.startTime)}` : ""}
                        {session.sport && session.name ? ` · ${formatSport(session.sport)}` : ""}
                      </p>
                    </div>
                    <div className="text-right text-sm tabular-nums">
                      <p>{formatDuration(session.durationSec)}</p>
                      <p className="text-xs text-muted">
                        {session.distanceM != null && session.distanceM > 0
                          ? `${(session.distanceM / 1000).toFixed(2)} km`
                          : session.strain != null
                            ? `Strain ${fmt(session.strain, 1)}`
                            : session.calories != null
                              ? `${fmt(session.calories)} kcal`
                              : ""}
                      </p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
