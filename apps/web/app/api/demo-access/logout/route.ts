import { NextResponse } from "next/server";

import { DEMO_ACCESS_COOKIE, isProductionEnvironment } from "@/lib/demo-access";

export async function POST() {
  const response = NextResponse.json({ ok: true });
  response.cookies.set(DEMO_ACCESS_COOKIE, "", {
    httpOnly: true,
    maxAge: 0,
    path: "/",
    sameSite: "lax",
    secure: isProductionEnvironment(),
  });

  return response;
}
