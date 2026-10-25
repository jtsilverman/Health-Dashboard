export type WhoopTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  token_type?: string;
};

export type StoredWhoopTokens = {
  accessToken: string;
  refreshToken: string;
  accessExpiresAt: Date;
};

/** WHOOP rotates refresh tokens. Keep the newest one and fall back only if the body omits it. */
export function nextWhoopTokens(
  currentRefresh: string,
  body: WhoopTokenResponse,
  now = Date.now(),
): StoredWhoopTokens {
  if (!body.access_token) {
    throw new Error("WHOOP token response did not include an access token");
  }
  const expiresIn = body.expires_in && body.expires_in > 0 ? body.expires_in : 3600;
  const refreshToken = body.refresh_token && body.refresh_token.length > 0 ? body.refresh_token : currentRefresh;
  return {
    accessToken: body.access_token,
    refreshToken,
    accessExpiresAt: new Date(now + expiresIn * 1000),
  };
}

export function accessTokenExpired(expiresAt: Date | null | undefined, now = Date.now(), skewMs = 60_000): boolean {
  if (!expiresAt) return true;
  return expiresAt.getTime() - skewMs <= now;
}
