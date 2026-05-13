import { NextRequest, NextResponse } from "next/server";

import {
  DEMO_ACCESS_COOKIE,
  hasDemoAccess,
  isDemoAccessConfigured,
  isProductionEnvironment,
  isProtectedDemoApiPath,
  isProtectedDemoPath,
  isProtectedPagePath,
  shouldBypassDemoAccessInDevelopment,
} from "@/lib/demo-access";

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedDemoPath(pathname)) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(DEMO_ACCESS_COOKIE)?.value;
  if (hasDemoAccess(cookieValue) || shouldBypassDemoAccessInDevelopment()) {
    return NextResponse.next();
  }

  const isConfigured = isDemoAccessConfigured();
  const isProduction = isProductionEnvironment();

  if (isProtectedDemoApiPath(pathname)) {
    return NextResponse.json(
      { error: isConfigured || !isProduction ? "demo_access_required" : "demo_access_not_configured" },
      { status: isConfigured || !isProduction ? 401 : 503 },
    );
  }

  if (isProtectedPagePath(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/demo-access";
    url.search = "";
    url.searchParams.set("next", `${pathname}${search}`);

    if (!isConfigured && isProduction) {
      url.searchParams.set("error", "not_configured");
    }

    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
