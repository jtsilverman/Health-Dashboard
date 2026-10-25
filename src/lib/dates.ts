export const NEW_YORK = "America/New_York";

/** Calendar date in America/New_York as YYYY-MM-DD. */
export function nyDateISO(input: Date | string = new Date()): string {
  const date = typeof input === "string" ? new Date(input) : input;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: NEW_YORK,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** Add calendar days to a YYYY-MM-DD string. Independent of the host timezone. */
export function addDays(isoDate: string, days: number): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

export function enumerateDates(start: string, end: string): string[] {
  const dates: string[] = [];
  let cursor = start;
  while (cursor <= end) {
    dates.push(cursor);
    cursor = addDays(cursor, 1);
  }
  return dates;
}

export function formatLongDate(isoDate: string): string {
  return formatUtcDate(isoDate, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatShortDate(isoDate: string): string {
  return formatUtcDate(isoDate, { month: "short", day: "numeric" });
}

export function formatWeekday(isoDate: string): string {
  return formatUtcDate(isoDate, { weekday: "short" });
}

function formatUtcDate(isoDate: string, options: Intl.DateTimeFormatOptions): string {
  const [year, month, day] = isoDate.split("-").map(Number);
  return new Intl.DateTimeFormat("en-US", { ...options, timeZone: "UTC" }).format(
    new Date(Date.UTC(year, month - 1, day)),
  );
}
