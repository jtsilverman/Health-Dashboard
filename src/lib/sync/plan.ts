import { DEFAULT_LOOKBACK_DAYS, FIRST_RUN_DAYS, MAX_LOOKBACK_DAYS } from "@/lib/targets";

export function resolveLookback(options: {
  requested?: number;
  storedDays: number;
  defaultLookback?: number;
}): number {
  const fallback = options.defaultLookback ?? DEFAULT_LOOKBACK_DAYS;
  if (options.requested != null && Number.isFinite(options.requested) && options.requested > 0) {
    return Math.min(Math.floor(options.requested), MAX_LOOKBACK_DAYS);
  }
  if (options.storedDays <= 0) return FIRST_RUN_DAYS;
  return Math.min(Math.max(1, Math.floor(fallback)), MAX_LOOKBACK_DAYS);
}

export function defaultLookbackFromEnv(env: NodeJS.ProcessEnv = process.env): number {
  const raw = Number(env.SYNC_LOOKBACK_DAYS ?? DEFAULT_LOOKBACK_DAYS);
  if (!Number.isFinite(raw) || raw <= 0) return DEFAULT_LOOKBACK_DAYS;
  return Math.min(Math.floor(raw), MAX_LOOKBACK_DAYS);
}
