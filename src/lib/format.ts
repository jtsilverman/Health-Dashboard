export function roundTo(value: number, digits: number): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function fmt(value: number | null | undefined, digits = 0): string {
  if (value == null || Number.isNaN(value)) return "—";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}

export function formatDuration(seconds: number | null | undefined): string {
  if (seconds == null || Number.isNaN(seconds)) return "—";
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return rest ? `${hours}h ${rest}m` : `${hours}h`;
}

export function formatSport(sport: string): string {
  const cleaned = sport.replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
  const needsCase = sport.includes("_") || sport.includes("-") || cleaned === cleaned.toLowerCase();
  if (!needsCase) return cleaned;
  return cleaned.replace(/\b\w/g, (char) => char.toUpperCase());
}

export function formatClock(isoOrLocal: string | null | undefined): string {
  if (!isoOrLocal) return "";
  if (isoOrLocal.includes("T") && isoOrLocal.endsWith("Z")) {
    return new Intl.DateTimeFormat("en-US", {
      timeZone: "America/New_York",
      hour: "numeric",
      minute: "2-digit",
    }).format(new Date(isoOrLocal));
  }
  const match = /(\d{2}):(\d{2})/.exec(isoOrLocal);
  if (!match) return "";
  const hours = Number(match[1]);
  const minutes = match[2];
  const suffix = hours >= 12 ? "PM" : "AM";
  const hour12 = hours % 12 || 12;
  return `${hour12}:${minutes} ${suffix}`;
}

export function recoveryBand(score: number | null | undefined): "ready" | "moderate" | "rest" | "none" {
  if (score == null || Number.isNaN(score)) return "none";
  if (score >= 67) return "ready";
  if (score >= 34) return "moderate";
  return "rest";
}

export function recoveryLabel(score: number | null | undefined): string {
  const band = recoveryBand(score);
  if (band === "ready") return "Ready";
  if (band === "moderate") return "Moderate";
  return band === "rest" ? "Rest" : "No score";
}
