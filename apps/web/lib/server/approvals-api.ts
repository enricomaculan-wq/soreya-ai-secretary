import type { ApprovalState, Json, SuggestedActionType } from "@soreya/shared";
import { NextResponse } from "next/server";

export function jsonError(error: unknown, status = 500) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : String(error) },
    { status },
  );
}

export function readString(value: unknown, name: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${name} is required.`);
  }

  return value.trim();
}

export function readOptionalString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null;
}

export function readJsonPayload(value: unknown, name: string): Json {
  if (value === undefined) {
    throw new Error(`${name} is required.`);
  }

  return value as Json;
}

export function parseStatuses(value: string | null): ApprovalState[] | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean) as ApprovalState[];
}

export function parseActionTypes(value: string | null): SuggestedActionType[] | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean) as SuggestedActionType[];
}
