import { enumerateDates } from "@/lib/dates";
import { getToken, saveToken } from "@/lib/db/queries";
import { decodeJwtExp, jwtNeedsRefresh, parseGarminTokenBody } from "@/lib/garmin/jwt";
import { listGarminActivities, type GarminDaily, type GarminPayload } from "@/lib/garmin/normalize";
import { fetchRetry, mapPool } from "@/lib/http";

const HOST = "https://personal.connectapi.garmin.com";

async function garminJwt(apiKey: string): Promise<string> {
  const stored = await getToken("garmin");
  const nowSec = Math.floor(Date.now() / 1000);
  if (stored?.accessToken && !jwtNeedsRefresh(stored.accessToken, nowSec)) return stored.accessToken;

  const response = await fetchRetry(`${HOST}/personalapitoken-service/personal-api/personal-api-key/token`, {
    method: "POST",
    headers: { Authorization: `ApiKey ${apiKey}` },
  });
  if (!response.ok) throw new Error(`Garmin token request failed (${response.status})`);
  const jwt = parseGarminTokenBody(await response.text());
  const exp = decodeJwtExp(jwt);
  await saveToken("garmin", {
    accessToken: jwt,
    refreshToken: null,
    accessExpiresAt: exp ? new Date(exp * 1000) : new Date(Date.now() + 10 * 60 * 1000),
  });
  return jwt;
}

export async function fetchGarmin(startDate: string, endDate: string): Promise<GarminPayload> {
  const apiKey = process.env.GARMIN_PERSONAL_API_KEY?.trim();
  if (!apiKey) throw new Error("GARMIN_PERSONAL_API_KEY is not configured.");
  const jwt = await garminJwt(apiKey);
  const days: Record<string, GarminDaily> = {};
  await mapPool(enumerateDates(startDate, endDate), 4, async (date) => {
    const response = await fetchRetry(
      `${HOST}/usersummary-service/usersummary/daily?calendarDate=${date}`,
      { headers: { Authorization: `Bearer ${jwt}` } },
    );
    if (response.status === 404) return;
    if (!response.ok) throw new Error(`Garmin daily summary failed for ${date} (${response.status})`);
    const json = (await response.json()) as GarminDaily;
    days[date] = { ...json, calendarDate: json.calendarDate || date };
  });

  const activities = [];
  const limit = 100;
  for (let start = 0, page = 0; page < 10; page += 1) {
    const url = `${HOST}/activitylist-service/activities/search/activities?startDate=${startDate}&endDate=${endDate}&start=${start}&limit=${limit}`;
    const response = await fetchRetry(url, { headers: { Authorization: `Bearer ${jwt}` } });
    if (!response.ok) throw new Error(`Garmin activities failed (${response.status})`);
    const batch = listGarminActivities(await response.json());
    activities.push(...batch);
    if (batch.length < limit) break;
    start += limit;
  }

  return { days, activities };
}
