"use client";

import { useSearchParams } from "next/navigation";

export function readScreenshotModeFromSearch(search: string | URLSearchParams | null | undefined) {
  if (!search) {
    return false;
  }

  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  return params.get("screenshot") === "1";
}

export function useScreenshotMode() {
  const searchParams = useSearchParams();
  return readScreenshotModeFromSearch(searchParams);
}
