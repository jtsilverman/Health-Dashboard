"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { dashboardPassword, safeEqual, SESSION_COOKIE, sessionToken } from "@/lib/auth";

export async function loginAction(formData: FormData) {
  const password = dashboardPassword();
  const submitted = String(formData.get("password") ?? "");
  const next = String(formData.get("next") ?? "/");
  const destination = next.startsWith("/") && !next.startsWith("//") ? next : "/";
  if (!password) redirect("/login?error=config");
  if (!safeEqual(submitted, password)) redirect(`/login?error=1&next=${encodeURIComponent(destination)}`);
  const jar = await cookies();
  jar.set(SESSION_COOKIE, sessionToken(password), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });
  redirect(destination);
}

export async function logoutAction() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
  redirect("/login");
}
