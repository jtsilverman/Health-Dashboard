import { NextResponse, type NextRequest } from "next/server";
import { bearerMatches, dashboardPassword, isValidSession, SESSION_COOKIE } from "@/lib/auth";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (
    pathname.startsWith("/login") ||
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/cron")
  ) {
    return NextResponse.next();
  }

  const password = dashboardPassword();
  if (!password) {
    if (pathname.startsWith("/api")) {
      return NextResponse.json({ error: "DASHBOARD_PASSWORD is not set." }, { status: 500 });
    }
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("error", "config");
    return NextResponse.redirect(url);
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;
  if (isValidSession(token, password)) return NextResponse.next();
  if (bearerMatches(request.headers.get("authorization"), password)) return NextResponse.next();

  if (pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|robots.txt|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
