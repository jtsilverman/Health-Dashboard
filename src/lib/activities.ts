export type ActivitySource = "whoop" | "garmin";

export type NormalizedActivity = {
  id: string;
  date: string;
  source: ActivitySource;
  sport: string;
  name: string | null;
  startTime: string | null;
  durationSec: number | null;
  distanceM: number | null;
  calories: number | null;
  avgHr: number | null;
  strain: number | null;
};
