export type MetricPatch = {
  date: string;
  [key: string]: string | number | null | undefined;
};

/** Combine per-source patches. Undefined keys are left untouched, so a failed source can be omitted entirely. */
export function mergeDailyPatches(groups: MetricPatch[][]): MetricPatch[] {
  const byDate = new Map<string, MetricPatch>();
  for (const group of groups) {
    for (const patch of group) {
      const current = byDate.get(patch.date) ?? { date: patch.date };
      for (const [key, value] of Object.entries(patch)) {
        if (key === "date" || value === undefined) continue;
        current[key] = value;
      }
      byDate.set(patch.date, current);
    }
  }
  return [...byDate.values()].sort((left, right) => left.date.localeCompare(right.date));
}

export function patchesForSources(input: {
  whoopOk: boolean;
  garminOk: boolean;
  whoop: MetricPatch[];
  garmin: MetricPatch[];
}): MetricPatch[] {
  return mergeDailyPatches([
    input.whoopOk ? input.whoop : [],
    input.garminOk ? input.garmin : [],
  ]);
}
