import { createHash, createHmac, timingSafeEqual } from "node:crypto";

export const SESSION_COOKIE = "cadence_session";

export function dashboardPassword(): string | undefined {
  const value = process.env.DASHBOARD_PASSWORD?.trim();
  return value ? value : undefined;
}

export function sessionToken(password: string): string {
  return createHmac("sha256", password).update("cadence-session-v1").digest("hex");
}

export function safeEqual(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

export function isValidSession(token: string | undefined, password = dashboardPassword()): boolean {
  if (!token || !password) return false;
  return safeEqual(token, sessionToken(password));
}

export function bearerMatches(header: string | null, secret: string | undefined): boolean {
  if (!header || !secret) return false;
  return safeEqual(header, `Bearer ${secret}`);
}
