import { describe, expect, it } from "vitest";
import { addDays, nyDateISO } from "@/lib/dates";
import { decodeJwtExp, jwtNeedsRefresh, parseGarminTokenBody } from "@/lib/garmin/jwt";
import { patchesForSources } from "@/lib/sync/merge";
import { resolveLookback } from "@/lib/sync/plan";
import { nextWhoopTokens } from "@/lib/whoop/tokens";

function unsignedJwt(exp: number): string {
  const payload = Buffer.from(JSON.stringify({ exp })).toString("base64url");
  return `eyJhbGciOiJub25lIn0.${payload}.sig`;
}

describe("sync planning", () => {
  it("backfills 30 days on an empty store and then uses the daily lookback", () => {
    expect(resolveLookback({ storedDays: 0 })).toBe(30);
    expect(resolveLookback({ storedDays: 12, defaultLookback: 7 })).toBe(7);
    expect(resolveLookback({ storedDays: 12, requested: 30 })).toBe(30);
    expect(resolveLookback({ storedDays: 0, requested: 500 })).toBe(90);
  });

  it("drops a failed source instead of overwriting its columns", () => {
    const merged = patchesForSources({
      whoopOk: false,
      garminOk: true,
      whoop: [{ date: "2026-10-25", whoopRecovery: 32, whoopStrain: 4.1 }],
      garmin: [{ date: "2026-10-25", garminTotalKcal: 711, garminSteps: 119 }],
    });
    expect(merged).toEqual([{ date: "2026-10-25", garminTotalKcal: 711, garminSteps: 119 }]);
    expect(merged[0]).not.toHaveProperty("whoopRecovery");
  });

  it("keeps both sources when both succeed", () => {
    const merged = patchesForSources({
      whoopOk: true,
      garminOk: true,
      whoop: [{ date: "2026-10-24", whoopRecovery: 3 }],
      garmin: [{ date: "2026-10-24", garminSteps: 5105 }, { date: "2026-10-23", garminSteps: 4474 }],
    });
    expect(merged).toEqual([
      { date: "2026-10-23", garminSteps: 4474 },
      { date: "2026-10-24", whoopRecovery: 3, garminSteps: 5105 },
    ]);
  });
});

describe("token caching", () => {
  it("persists a rotated WHOOP refresh token", () => {
    const next = nextWhoopTokens("old-refresh", {
      access_token: "access",
      refresh_token: "new-refresh",
      expires_in: 3600,
    }, Date.parse("2026-10-25T12:00:00.000Z"));
    expect(next.refreshToken).toBe("new-refresh");
    expect(next.accessToken).toBe("access");
    expect(next.accessExpiresAt.toISOString()).toBe("2026-10-25T13:00:00.000Z");
  });

  it("keeps the current refresh token when WHOOP omits a replacement", () => {
    const next = nextWhoopTokens("still-good", { access_token: "access", expires_in: 10 });
    expect(next.refreshToken).toBe("still-good");
  });

  it("refreshes a Garmin JWT inside the five-minute window and not before", () => {
    const token = unsignedJwt(1_000_000);
    expect(decodeJwtExp(token)).toBe(1_000_000);
    expect(jwtNeedsRefresh(token, 1_000_000 - 301)).toBe(false);
    expect(jwtNeedsRefresh(token, 1_000_000 - 300)).toBe(true);
    expect(jwtNeedsRefresh(null, 0)).toBe(true);
    expect(parseGarminTokenBody(`"${token}"`)).toBe(token);
  });
});

describe("New York dates", () => {
  it("rolls a UTC morning timestamp back to the previous evening in winter", () => {
    expect(nyDateISO("2026-11-02T04:30:00.000Z")).toBe("2026-11-01");
    expect(addDays("2026-10-31", 1)).toBe("2026-11-01");
    expect(addDays("2026-10-25", -29)).toBe("2026-09-26");
  });
});
