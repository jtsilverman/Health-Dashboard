/** Refresh a Garmin personal-API JWT this many seconds before `exp`. */
export const GARMIN_JWT_SKEW_SECONDS = 5 * 60;

export function decodeJwtExp(token: string): number | null {
  const parts = token.split(".");
  if (parts.length < 2 || !parts[1]) return null;
  try {
    const json = JSON.parse(Buffer.from(parts[1], "base64url").toString("utf8")) as { exp?: unknown };
    return typeof json.exp === "number" ? json.exp : null;
  } catch {
    return null;
  }
}

export function jwtNeedsRefresh(
  token: string | null | undefined,
  nowSec: number,
  skewSec = GARMIN_JWT_SKEW_SECONDS,
): boolean {
  if (!token) return true;
  const exp = decodeJwtExp(token);
  if (exp == null) return true;
  return nowSec >= exp - skewSec;
}

/** The token endpoint returns the raw JWT, sometimes wrapped in quotes. */
export function parseGarminTokenBody(body: string): string {
  const trimmed = body.trim();
  if (!trimmed) throw new Error("Garmin token response was empty");
  const unquoted = trimmed.replace(/^"|"$/g, "");
  if (unquoted.split(".").length < 3) {
    throw new Error("Garmin token response was not a JWT");
  }
  return unquoted;
}
