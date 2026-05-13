import { NextResponse } from "next/server";

import {
  DEMO_ACCESS_COOKIE,
  DEMO_ACCESS_GRANTED_VALUE,
  DEMO_ACCESS_MAX_AGE_SECONDS,
  isProductionEnvironment,
  readDemoAccessPassword,
  safeDemoAccessNextPath,
} from "@/lib/demo-access";

type DemoAccessRequestBody = {
  next?: unknown;
  password?: unknown;
};

export async function POST(request: Request) {
  const body = await readBody(request);
  const configuredPassword = readDemoAccessPassword();
  const next = safeDemoAccessNextPath(typeof body.next === "string" ? body.next : null);
  const isProduction = isProductionEnvironment();

  if (!configuredPassword) {
    if (isProduction) {
      return NextResponse.json(
        { error: "not_configured", message: "Demo access is not configured", ok: false },
        { status: 503 },
      );
    }

    return createGrantedResponse(next, isProduction);
  }

  if (typeof body.password !== "string" || body.password !== configuredPassword) {
    return NextResponse.json({ error: "incorrect_password", ok: false }, { status: 401 });
  }

  return createGrantedResponse(next, isProduction);
}

async function readBody(request: Request): Promise<DemoAccessRequestBody> {
  try {
    const value: unknown = await request.json();

    if (!value || typeof value !== "object" || Array.isArray(value)) {
      return {};
    }

    return value as DemoAccessRequestBody;
  } catch {
    return {};
  }
}

function createGrantedResponse(next: string, isProduction: boolean) {
  const response = NextResponse.json({ next, ok: true });
  response.cookies.set(DEMO_ACCESS_COOKIE, DEMO_ACCESS_GRANTED_VALUE, {
    httpOnly: true,
    maxAge: DEMO_ACCESS_MAX_AGE_SECONDS,
    path: "/",
    sameSite: "lax",
    secure: isProduction,
  });

  return response;
}
