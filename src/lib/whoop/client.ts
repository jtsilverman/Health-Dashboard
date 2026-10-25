import { addDays } from "@/lib/dates";
import { getToken, saveToken } from "@/lib/db/queries";
import { fetchRetry, HttpError } from "@/lib/http";
import { accessTokenExpired, nextWhoopTokens, type WhoopTokenResponse } from "@/lib/whoop/tokens";
import type { WhoopPayload } from "@/lib/whoop/normalize";

const TOKEN_URL = "https://api.prod.whoop.com/oauth/oauth2/token";
const API_ROOT = "https://api.prod.whoop.com/developer/v2";

const RESOURCES = ["/cycle", "/recovery", "/activity/sleep", "/activity/workout"] as const;

async function refreshAccessToken(refreshToken: string) {
  const clientId = process.env.WHOOP_CLIENT_ID;
  const clientSecret = process.env.WHOOP_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error("WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET are not configured.");
  }
  const body = new URLSearchParams({
    grant_type: "refresh_token",
    refresh_token: refreshToken,
    client_id: clientId,
    client_secret: clientSecret,
    scope: "offline",
  });
  const response = await fetchRetry(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!response.ok) {
    throw new Error(
      `WHOOP token refresh failed (${response.status}). WHOOP rotates refresh tokens. If this keeps failing, put a fresh WHOOP_REFRESH_TOKEN in the environment and delete the whoop row from oauth_tokens.`,
    );
  }
  const json = (await response.json()) as WhoopTokenResponse;
  const next = nextWhoopTokens(refreshToken, json);
  await saveToken("whoop", next);
  return next.accessToken;
}

async function accessToken(): Promise<string> {
  const stored = await getToken("whoop");
  const refreshToken = stored?.refreshToken || process.env.WHOOP_REFRESH_TOKEN;
  if (!refreshToken) {
    throw new Error("WHOOP_REFRESH_TOKEN is not configured and no rotated token is stored yet.");
  }
  if (!process.env.WHOOP_CLIENT_ID || !process.env.WHOOP_CLIENT_SECRET) {
    throw new Error("WHOOP_CLIENT_ID and WHOOP_CLIENT_SECRET are not configured.");
  }
  if (stored?.accessToken && !accessTokenExpired(stored.accessExpiresAt)) return stored.accessToken;
  return refreshAccessToken(refreshToken);
}

async function paginate(path: string, token: string, start: string, end: string): Promise<unknown[]> {
  const records: unknown[] = [];
  let nextToken: string | undefined;
  for (let page = 0; page < 40; page += 1) {
    const url = new URL(`${API_ROOT}${path}`);
    url.searchParams.set("limit", "25");
    url.searchParams.set("start", start);
    url.searchParams.set("end", end);
    if (nextToken) url.searchParams.set("nextToken", nextToken);
    const response = await fetchRetry(url, { headers: { Authorization: `Bearer ${token}` } });
    if (response.status === 401) throw new HttpError(401, `WHOOP ${path} unauthorized`);
    if (!response.ok) throw new Error(`WHOOP ${path} failed (${response.status})`);
    const json = (await response.json()) as { records?: unknown[]; next_token?: string; nextToken?: string };
    const pageRecords = Array.isArray(json) ? json : (json.records ?? []);
    records.push(...pageRecords);
    nextToken = json.next_token || json.nextToken;
    if (!nextToken) break;
  }
  return records;
}

async function pullAll(token: string, start: string, end: string): Promise<WhoopPayload> {
  const [cycles, recovery, sleep, workouts] = await Promise.all(
    RESOURCES.map((path) => paginate(path, token, start, end)),
  );
  return {
    cycles: cycles as WhoopPayload["cycles"],
    recovery: recovery as WhoopPayload["recovery"],
    sleep: sleep as WhoopPayload["sleep"],
    workouts: workouts as WhoopPayload["workouts"],
  };
}

export async function fetchWhoop(startDate: string, endDate: string): Promise<WhoopPayload> {
  const start = `${addDays(startDate, -3)}T00:00:00.000Z`;
  const end = `${addDays(endDate, 2)}T23:59:59.999Z`;
  const token = await accessToken();
  try {
    return await pullAll(token, start, end);
  } catch (error) {
    if (!(error instanceof HttpError) || error.status !== 401) throw error;
    const stored = await getToken("whoop");
    const refreshToken = stored?.refreshToken || process.env.WHOOP_REFRESH_TOKEN;
    if (!refreshToken) throw error;
    const refreshed = await refreshAccessToken(refreshToken);
    return pullAll(refreshed, start, end);
  }
}
